import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import prisma from 'lib/db';
import { Prisma } from 'generated/prisma/client';
import { first, last } from 'rxjs';
import { HashidService } from 'src/common/hashid/hashid.service';
import { generateCharges, buildLedger, billingDateFor } from './ledger.util';
import {
  addMonths,
  differenceInCalendarMonths,
  endOfMonth,
  format,
  getMonth,
  max,
  min,
  startOfMonth,
} from 'date-fns';

export interface MonthTotals {
  month: string;
  expected: number;
  collected: number;
  balance: number;
}

export interface TenantLedgerEntry {
  date: Date;
  expected: number;
  collected: number;
  balance: number;
}


@Injectable()
export class PaymentService {
  constructor(
    private readonly hashidService: HashidService,
  ) {}

  async getManagerLevelSummary() {
    const houses = await prisma.house.findMany({
      select: { id: true },
    });

    const summaries: {
      years: number[];
      summary: Record<number, Record<string, any>>;
    }[] = [];

    for (const house of houses) {
      try {
        const houseSummary = await this.getHouseLevelSummary(house.id);
        summaries.push(houseSummary);
      } catch (err) {
        console.log(`Skipping house ${house.id}: ${err.message}`);
        continue;
      }
    }

    const cumulativeSummary: Record<number, Record<string, any>> = {};
    const allYears = new Set<number>();

    for (const { years, summary } of summaries) {
      for (const year of years) {
        allYears.add(year);
        if (!cumulativeSummary[year]) {
          cumulativeSummary[year] = {};
        }

        for (const [month, data] of Object.entries(summary[year])) {
          if (!cumulativeSummary[year][month]) {
            cumulativeSummary[year][month] = {
              expected: 0,
              collected: 0,
              balance: 0,
              usage: 0,
              waterCharge: 0,
              serviceCharge: 0,
              payments: [],
            };
          }

          const target = cumulativeSummary[year][month];
          target.expected += data.expected;
          target.collected += data.collected;
          target.balance += data.balance;
          target.usage += data.usage;
          target.waterCharge += data.waterCharge;
          target.serviceCharge += data.serviceCharge;
          target.payments.push(...data.payments);
        }
      }
    }

    // Sort months inside each year
    const orderedSummary: Record<number, Record<string, any>> = {};

    const monthOrder = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    for (const year of Object.keys(cumulativeSummary)
      .map(Number)
      .sort((a, b) => b - a)) {
      const months = cumulativeSummary[year];

      const orderedMonths = Object.keys(months)
        .sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b))
        .reduce(
          (acc, month) => {
            acc[month] = months[month];
            return acc;
          },
          {} as Record<string, any>,
        );

      orderedSummary[year] = orderedMonths;
    }

    return {
      years: Array.from(allYears).sort((a, b) => b - a),
      summary: orderedSummary,
    };
  }

  async getHouseLevelSummary(houseId: number) {
    // 1. Get all active leases for this house
    const leases = await prisma.lease.findMany({
      where: {
        houseId,
        status: 'ACTIVE',
      },
      select: {
        code: true, // just need the lease code to reuse existing logic
      },
    });

    if (!leases.length) {
      return {
        years: [],
        summary: {},
        houseId,
        houseName: '',
      };
    }

    const summaries: {
      years: number[];
      summary: Record<string, Record<string, any>>;
    }[] = [];

    for (const leaseRecord of leases) {
      const leaseSummary = await this.getTenantLevelSummary(leaseRecord.code);
      summaries.push(leaseSummary);
    }

    const houseSummary = {
      years: [] as number[],
      summary: {} as Record<string, Record<string, any>>,
    };

    for (const { years, summary } of summaries) {
      for (const year of years) {
        if (!houseSummary.years.includes(year)) {
          houseSummary.years.push(year);
        }

        if (!houseSummary.summary[year]) {
          houseSummary.summary[year] = {};
        }

        const months = summary[year];
        for (const [month, data] of Object.entries(months) as [string, any][]) {
          if (!houseSummary.summary[year][month]) {
            houseSummary.summary[year][month] = {
              expected: 0,
              collected: 0,
              balance: 0,
              usage: 0,
              waterCharge: 0,
              serviceCharge: 0,
              payments: [],
            };
          }

          const target = houseSummary.summary[year][month];

          target.expected += data.expected;
          target.collected += data.collected;
          target.balance += data.balance;
          target.usage += data.usage;
          target.waterCharge += data.waterCharge;
          target.serviceCharge += data.serviceCharge;
          target.payments.push(...data.payments);
        }
      }
    }

    houseSummary.years.sort((a, b) => b - a);

    const orderedMonths = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Reorder months in each year summary
    for (const year of houseSummary.years) {
      const unorderedMonths = houseSummary.summary[year];
      const ordered: Record<string, any> = {};

      for (const month of orderedMonths) {
        if (unorderedMonths[month]) {
          ordered[month] = unorderedMonths[month];
        }
      }

      houseSummary.summary[year] = ordered;
    }

    return houseSummary;
  }

  async getTenantLevelSummary(leaseCode: string) {
    const lease = await prisma.lease.findFirst({
      where: { code: leaseCode },
      include: {
        payment: true,
        meterReading: {
          where: { unitId: undefined },
        },
      },
    });

    if (!lease) {
      throw new Error('Lease not found');
    }

    const {
      startDate,
      rentRate,
      waterRate,
      serviceCharge,
      deposit,
      arrearsbf,
      rentDue,
      unitId,
      onEntryMeterReading,
    } = lease;

    const meterReadings = await prisma.meterReading.findMany({
      where: { unitId },
      orderBy: { readOn: 'asc' },
    });

    const payments = await prisma.payment.findMany({
      where: { leaseId: lease.id },
      orderBy: { date: 'asc' },
    });

    const summary = {};
    const years: number[] = [];

    const now = new Date();
    let cursor = new Date(startDate);
    cursor.setDate(1); // ⚠️ Important
    let prevReading = onEntryMeterReading || 0;
    let isFirstMonth = true;
    let carriedBalance = 0;

    let readingIndex = 0;

    const endDate = lease.terminationDate
      ? new Date(lease.terminationDate)
      : now;

    // Move endDate to the *last day* of that month
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // day 0 of next month = last day of termination month

    while (cursor <= endDate) {
      const year = cursor.getFullYear();
      const monthName = cursor.toLocaleString('default', { month: 'long' });

      if (!summary[year]) {
        summary[year] = {};
        years.push(year);
      }

      const currentPeriodEnd = new Date(cursor);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      let usageToBillNextMonth = 0;
      let serviceChargeToBillNextMonth = 0;

      let monthPrevReading = prevReading; // store before change
      let monthCurrentReading: number | null = null; // allow number or null

      if (
        readingIndex < meterReadings.length &&
        new Date(meterReadings[readingIndex].readOn) <= currentPeriodEnd
      ) {
        const reading = meterReadings[readingIndex];
        const value = reading.currentReading;
        const usage = Math.max(0, value - prevReading);
        usageToBillNextMonth = usage;
        serviceChargeToBillNextMonth = usage > 0 ? (serviceCharge ?? 0) : 0;
        monthCurrentReading = value; // store current reading
        prevReading = value;
        readingIndex++;
      }

      const usage = isFirstMonth ? 0 : usageToBillNextMonth;
      const serviceChargeAmount = isFirstMonth
        ? 0
        : serviceChargeToBillNextMonth;
      const waterCharge = usage * waterRate + serviceChargeAmount;

      const paymentsInMonth = payments.filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === year && d.getMonth() === cursor.getMonth();
      });

      const collected = paymentsInMonth.reduce((sum, p) => sum + p.amount, 0);

      let expected = 0;
      const extraChargesBreakdown: Record<string, number> = {};

      if (isFirstMonth) {
        expected = (arrearsbf || 0) + rentRate + (deposit || 0);
      } else {
        expected = rentRate + waterCharge + carriedBalance;

        const addCharge = (
          label: string,
          amount: number | null | undefined,
        ) => {
          if (amount && amount !== 0) {
            expected += amount;
            extraChargesBreakdown[label] = amount;
          }
        };

        addCharge('garbageFee', lease.garbageFee);
        if (
          lease.additional &&
          lease.additionalCharges &&
          lease.additionalCharges !== 0
        ) {
          expected += lease.additionalCharges;
          extraChargesBreakdown[lease.additional] = lease.additionalCharges;
        }

        for (let i = 1; i <= 7; i++) {
          const fieldLabel = lease[`added_field_${i}`];
          const fieldPrice = lease[`added_field_${i}_price`];
          if (fieldLabel && fieldPrice && fieldPrice !== 0) {
            expected += fieldPrice;
            extraChargesBreakdown[fieldLabel] = fieldPrice;
          }
        }
      }
      const balance = expected - collected;

      summary[year][monthName] = {
        expected: Math.round(expected),
        collected: Math.round(collected),
        balance: Math.round(balance),
        usage,
        waterCharge,
        serviceCharge: serviceChargeAmount,
        rentRate,
        waterRate,
        previousReading: monthPrevReading,
        currentReading: monthCurrentReading,
        extraCharges: extraChargesBreakdown,
        payments: paymentsInMonth.map((p) => ({
          date: p.date,
          amount: p.amount,
          method: p.paymentMethod,
          reference: p.reference,
        })),
      };

      carriedBalance = balance;
      isFirstMonth = false;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      years: [...new Set(years)].sort((a, b) => b - a),
      summary,
      // meterReadings,
    };
  }

  async createPayment(createPaymentDto: Prisma.paymentCreateInput) {
    try {
      const leaseCode = (createPaymentDto.lease as any).connect.code;

      const lease = await prisma.lease.findFirst({
        where: { code: leaseCode, status: 'ACTIVE' },
        select: { id: true, tenantId: true, houseId: true, unitId: true },
      });

      if (!lease) {
        throw new HttpException('Lease not found.', HttpStatus.NOT_FOUND);
      }

      return await prisma.payment.create({
        data: {
          ...createPaymentDto,
          lease: { connect: { id: lease.id } }, // use ID after lookup
          manualInput: true,
          tenant: { connect: { id: lease.tenantId } },
          house: { connect: { id: lease.houseId } },
          unit: { connect: { id: lease.unitId } },
        },
      });
    } catch (error) {
      console.error('Payment creation failed:', error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new HttpException(
          'Payment with similar reference already exists.',
          HttpStatus.CONFLICT,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(createPaymentDto: Prisma.paymentCreateInput) {
    const leaseId = (createPaymentDto.lease as any).connect.id;
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { id: true, tenantId: true, houseId: true, unitId: true },
    });
    if (!lease) {
      throw new Error('Lease not found');
    }

    // console.log(lease.houseId, lease.tenantId);
    return prisma.payment.create({
      data: {
        ...createPaymentDto,
        tenant: { connect: { id: lease.tenantId } },
        house: { connect: { id: lease.houseId } },
        unit: { connect: { id: lease.unitId } },
      },
    });
  }

  // async processMpesaPayment(payload: any) {
  //   console.log('Received Payemnt:', payload);
  //   const dateObj = new Date(
  //     `${payload.TransTime.slice(0, 4)}-${payload.TransTime.slice(4, 6)}-${payload.TransTime.slice(6, 8)}T${payload.TransTime.slice(8, 10)}:${payload.TransTime.slice(10, 12)}:${payload.TransTime.slice(12, 14)}`,
  //   );

  //   const lease = await prisma.lease.findUnique({
  //     where: { code: payload.BillRefNumber },
  //     select: { id: true, tenantId: true, houseId: true, unitId: true },
  //   });
  //   if (!lease) {
  //     return prisma.payment.create({
  //       data: {
  //         amount: parseFloat(payload.TransAmount),
  //         date: dateObj,
  //         reference: payload.TransID,
  //         paymentMethod: payload.TransactionType,
  //         processed: false,
  //         rawDetails: payload,
  //         manualInput: false,
  //       },
  //     });
  //   }
  //   return prisma.payment.create({
  //     data: {
  //       lease: { connect: { id: lease.id } },
  //       tenant: { connect: { id: lease.tenantId } },
  //       house: { connect: { id: lease.houseId } },
  //       unit: { connect: { id: lease.unitId } },
  //       amount: parseFloat(payload.TransAmount),
  //       date: dateObj,
  //       reference: payload.TransID,
  //       paymentMethod: payload.TransactionType,
  //       rawDetails: payload,
  //       manualInput: false,
  //     },
  //   });
  // }

  async findAll() {
    return prisma.payment.findMany({});
  }

  async getAll() {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' },
      select: {
        unit: {
          select: {
            id: true,
            number: true,
          },
        },
        house: {
          select: {
            name: true,
          },
        },
        lease: {
          select: {
            tenant: {
              select: {
                name: true,
                contact: true,
              },
            },
          },
        },
        houseId: true,
        date: true,
        amount: true,
        reference: true,
        paymentMethod: true,
        comment: true,
        processed: true,
        manualInput: true,
        id: true,
      },
    });

    return payments.map((p) => {
      const formattedDate = p.date
        ? new Date(p.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      return {
        unitId: p.unit ? this.hashidService.encode(p.unit.id) : null,
        unitNumber: p.unit?.number ?? null,
        tenantName: p.lease?.tenant?.name ?? null,
        tenantContact: p.lease?.tenant?.contact ?? null,
        houseId:
          p.houseId !== null ? this.hashidService.encode(p.houseId) : null,
        houseName: p.house?.name ?? null,
        date: formattedDate,
        amount: p.amount,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        comment: p.comment,
        processed: p.processed,
        manualInput: p.manualInput,
        id: p.id ? this.hashidService.encode(p.id) : null,
      };
    });
  }

  async recent() {
    const payments = await prisma.payment.findMany({
      take: 5, // Limit to the latest 5
      orderBy: { date: 'desc' },
      select: {
        unit: {
          select: {
            id: true,
            number: true,
          },
        },
        tenant: {
          select: {
            name: true,
            contact: true,
          },
        },
        house: {
          select: {
            name: true,
          },
        },
        houseId: true,
        date: true,
        amount: true,
        reference: true,
        paymentMethod: true,
        comment: true,
        processed: true,
        manualInput: true,
        id: true,
      },
    });

    return payments.map((p) => {
      const formattedDate = p.date
        ? new Date(p.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      return {
        unitId: p.unit ? this.hashidService.encode(p.unit.id) : null,
        unitNumber: p.unit ? p.unit.number : null,
        tenantName: p.tenant ? p.tenant.name : null,
        tenantContact: p.tenant ? p.tenant.contact : null,
        houseId:
          p.houseId !== null ? this.hashidService.encode(p.houseId) : null,
        houseName: p.house ? p.house.name : null,
        date: formattedDate,
        amount: p.amount,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        comment: p.comment,
        processed: p.processed,
        manualInput: p.manualInput,
        id: p.id ? this.hashidService.encode(p.id) : null,
      };
    });
  }

  async getAllUnit(unitId: number) {
    const payments = await prisma.payment.findMany({
      orderBy: { date: 'desc' },
      where: {
        unitId,
        lease: {
          status: 'ACTIVE',
        },
      },
      select: {
        date: true,
        amount: true,
        reference: true,
        paymentMethod: true,
        comment: true,
        processed: true,
      },
    });

    return payments.map((p) => {
      const formattedDate = p.date
        ? new Date(p.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      return {
        date: formattedDate,
        amount: p.amount,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        comment: p.comment,
        processed: p.processed,
      };
    });
  }

  async findAll2(houseId: number) {
    const payment = await prisma.payment.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      where: {
        houseId,
        // lease: {
        //   status: 'ACTIVE',
        // },
      },
      select: {
        unit: {
          select: {
            id: true,
            number: true,
          },
        },
        tenant: {
          select: {
            name: true,
            contact: true,
          },
        },
        houseId: true,
        date: true,
        amount: true,
        reference: true,
        paymentMethod: true,
        comment: true,
        processed: true,
      },
    });

    return payment.map((p) => {
      const formattedDate = p.date
        ? new Date(p.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      return {
        unitId: p.unit ? this.hashidService.encode(p.unit.id) : null,
        unitNumber: p.unit ? p.unit.number : null,
        tenantName: p.tenant ? p.tenant.name : null,
        tenantContact: p.tenant ? p.tenant.contact : null,
        houseId:
          p.houseId !== null ? this.hashidService.encode(p.houseId) : null,
        date: p.date,
        amount: p.amount,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        comment: p.comment,
        processed: p.processed,
      };
    });
  }

  async findAll3(leaseCode: string) {
    const payment = await prisma.payment.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      where: {
        lease: {
          code: leaseCode,
        },
      },
      select: {
        unit: {
          select: {
            id: true,
            number: true,
          },
        },
        tenant: {
          select: {
            name: true,
            contact: true,
          },
        },
        houseId: true,
        date: true,
        amount: true,
        reference: true,
        paymentMethod: true,
        comment: true,
        processed: true,
      },
    });

    return payment.map((p) => {
      const formattedDate = p.date
        ? new Date(p.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      return {
        unitId: p.unit ? this.hashidService.encode(p.unit.id) : null,
        unitNumber: p.unit ? p.unit.number : null,
        tenantName: p.tenant ? p.tenant.name : null,
        tenantContact: p.tenant ? p.tenant.contact : null,
        houseId:
          p.houseId !== null ? this.hashidService.encode(p.houseId) : null,
        date: p.date,
        amount: p.amount,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        comment: p.comment,
        processed: p.processed,
      };
    });
  }

  async findOne(id: number) {
    return prisma.payment.findUnique({
      where: { id },
    });
  }

  async update(id: number, updatePaymentDto: Prisma.paymentUpdateInput) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: { manualInput: true },
    });

    if (!payment?.manualInput) return null;

    return prisma.payment.update({
      where: { id },
      data: {
        ...updatePaymentDto,
        date: updatePaymentDto.date
          ? new Date(updatePaymentDto.date as any)
          : undefined,
      },
    });
  }

  async remove(id: number) {
    return prisma.payment.delete({
      where: { id },
    });
  }

  async getHouseSummaries(year: number) {
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

    const leases = await prisma.lease.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        houseId: true,
        house: { select: { id: true, name: true } },
        rentRate: true,
        waterRate: true,
        garbageFee: true,
        additionalCharges: true,
        added_field_1_price: true,
        added_field_2_price: true,
        added_field_3_price: true,
        added_field_4_price: true,
        added_field_5_price: true,
        added_field_6_price: true,
        added_field_7_price: true,
        unit: { select: { deposit: true } },

        // ✅ Add these two lines:
        startDate: true,
        endDate: true,
      },
    });

    const leaseIds = leases.map((lease) => lease.id);

    const readings = await prisma.meterReading.findMany({
      where: {
        leaseId: { in: leaseIds },
        readOn: { gte: startDate, lt: endDate },
      },
      orderBy: { readOn: 'asc' },
    });

    const payments = await prisma.payment.findMany({
      where: {
        leaseId: { in: leaseIds },
        date: { gte: startDate, lt: endDate },
      },
    });

    const readingsByLease: Record<number, typeof readings> = {};
    for (const reading of readings) {
      if (reading.leaseId === null) continue;
      if (!readingsByLease[reading.leaseId])
        readingsByLease[reading.leaseId] = [];
      readingsByLease[reading.leaseId].push(reading);
    }

    const paymentsByLease: Record<number, Record<string, number>> = {};
    for (const payment of payments) {
      if (payment.leaseId === null) continue;

      const month = payment.date.toLocaleString('default', { month: 'long' });

      if (!paymentsByLease[payment.leaseId])
        paymentsByLease[payment.leaseId] = {};
      if (!paymentsByLease[payment.leaseId][month])
        paymentsByLease[payment.leaseId][month] = 0;

      paymentsByLease[payment.leaseId][month] += payment.amount;
    }

    const monthlySummary: Record<
      string, // month name
      {
        house: Record<
          string, // house name
          { expected: number; collected: number; balance: number }
        >;
        expected: number;
        collected: number;
        balance: number;
      }
    > = {};

    const grandTotals = {
      expected: 0,
      collected: 0,
      balance: 0,
    };

    for (const lease of leases) {
      const leaseReadings = readingsByLease[lease.id] || [];
      const leasePayments = paymentsByLease[lease.id] || {};

      const leaseStart = lease.startDate ? new Date(lease.startDate) : null;
      const leaseEnd = lease.endDate ? new Date(lease.endDate) : null;

      const totalAdditionalCharges =
        (lease.additionalCharges ?? 0) +
        (lease.garbageFee ?? 0) +
        (lease.added_field_1_price ?? 0) +
        (lease.added_field_2_price ?? 0) +
        (lease.added_field_3_price ?? 0) +
        (lease.added_field_4_price ?? 0) +
        (lease.added_field_5_price ?? 0) +
        (lease.added_field_6_price ?? 0) +
        (lease.added_field_7_price ?? 0);

      if (leaseReadings.length >= 2) {
        for (let i = 0; i < leaseReadings.length - 1; i++) {
          const currentReading = leaseReadings[i];
          const nextReading = leaseReadings[i + 1];

          const month = currentReading.readOn.toLocaleString('default', {
            month: 'long',
          });

          const unitsUsed =
            nextReading.currentReading - currentReading.currentReading;
          const safeUnitsUsed = unitsUsed < 0 ? 0 : unitsUsed;
          const waterBill = safeUnitsUsed * lease.waterRate;
          const deposit = i === 0 ? (lease.unit.deposit ?? 0) : 0;

          const expected =
            (lease.rentRate ?? 0) +
            waterBill +
            totalAdditionalCharges +
            deposit;
          const collected = leasePayments[month] ?? 0;
          const balance = expected - collected;

          if (!monthlySummary[month]) {
            monthlySummary[month] = {
              house: {},
              expected: 0,
              collected: 0,
              balance: 0,
            };
          }

          if (!monthlySummary[month].house[lease.house.name]) {
            monthlySummary[month].house[lease.house.name] = {
              expected: 0,
              collected: 0,
              balance: 0,
            };
          }

          monthlySummary[month].house[lease.house.name].expected += expected;
          monthlySummary[month].house[lease.house.name].collected += collected;
          monthlySummary[month].house[lease.house.name].balance += balance;

          monthlySummary[month].expected += expected;
          monthlySummary[month].collected += collected;
          monthlySummary[month].balance += balance;

          grandTotals.expected += expected;
          grandTotals.collected += collected;
          grandTotals.balance += balance;
        }
      } else {
        let depositCharged = false;

        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const monthDate = new Date(year, monthIndex, 1);

          // Skip if lease was not active this month
          if (
            (leaseStart && monthDate < leaseStart) ||
            (leaseEnd && monthDate > leaseEnd)
          ) {
            continue;
          }

          const month = monthDate.toLocaleString('default', { month: 'long' });

          // Only apply deposit once, when first applicable month is reached
          const deposit = !depositCharged ? (lease.unit.deposit ?? 0) : 0;
          depositCharged = true;

          const expected =
            (lease.rentRate ?? 0) + totalAdditionalCharges + deposit;
          const collected = leasePayments[month] ?? 0;
          const balance = expected - collected;

          if (!monthlySummary[month]) {
            monthlySummary[month] = {
              house: {},
              expected: 0,
              collected: 0,
              balance: 0,
            };
          }

          if (!monthlySummary[month].house[lease.house.name]) {
            monthlySummary[month].house[lease.house.name] = {
              expected: 0,
              collected: 0,
              balance: 0,
            };
          }

          monthlySummary[month].house[lease.house.name].expected += expected;
          monthlySummary[month].house[lease.house.name].collected += collected;
          monthlySummary[month].house[lease.house.name].balance += balance;

          monthlySummary[month].expected += expected;
          monthlySummary[month].collected += collected;
          monthlySummary[month].balance += balance;

          grandTotals.expected += expected;
          grandTotals.collected += collected;
          grandTotals.balance += balance;
        }
      }

      console.log(`Lease ID ${lease.id} has ${leaseReadings.length} readings`);
    }

    return { monthlySummary, grandTotals };
  }

  async payments(houseId: number, year: number) {
    const leases = await prisma.lease.findMany({
      where: {
        houseId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        rentRate: true,
        waterRate: true,
        garbageFee: true,
        additionalCharges: true,
        added_field_1_price: true,
        added_field_2_price: true,
        added_field_3_price: true,
        added_field_4_price: true,
        added_field_5_price: true,
        added_field_6_price: true,
        added_field_7_price: true,
        unit: {
          select: {
            number: true,
            deposit: true,
          },
        },
      },
    });

    const leaseIds = leases.map((lease) => lease.id);
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

    const payments = await prisma.payment.findMany({
      where: {
        leaseId: { in: leaseIds },
        date: { gte: startDate, lt: endDate },
      },
      select: { leaseId: true, amount: true, date: true },
      orderBy: { date: 'asc' },
    });

    const paymentsByLease: Record<
      number,
      Record<string, { datePaid: string; amount: number }[]>
    > = {};
    for (const payment of payments) {
      if (payment.leaseId === null) continue;
      const month = payment.date.toLocaleString('default', { month: 'long' });
      paymentsByLease[payment.leaseId] ??= {};
      paymentsByLease[payment.leaseId][month] ??= [];
      const formattedDate = `${payment.date.getDate().toString().padStart(2, '0')}/${(payment.date.getMonth() + 1).toString().padStart(2, '0')}/${payment.date.getFullYear()}`;
      paymentsByLease[payment.leaseId][month].push({
        datePaid: formattedDate,
        amount: payment.amount,
      });
    }

    const meterReadings = await prisma.meterReading.findMany({
      where: {
        leaseId: { in: leaseIds },
        readOn: { gte: startDate, lt: endDate },
      },
      select: { leaseId: true, readOn: true, currentReading: true },
      orderBy: { readOn: 'asc' },
    });

    const readingsByLease: Record<
      number,
      { readOn: Date; currentReading: number }[]
    > = {};
    for (const reading of meterReadings) {
      if (reading.leaseId === null) continue;
      readingsByLease[reading.leaseId] ??= [];
      readingsByLease[reading.leaseId].push({
        readOn: reading.readOn,
        currentReading: reading.currentReading,
      });
    }

    const monthlySummary: Record<string, any> = {};
    let grandTotalExpected = 0;
    let grandTotalCollected = 0;
    let grandTotalBalance = 0;

    for (const lease of leases) {
      const readings = readingsByLease[lease.id] || [];
      const totalAdditionalCharges =
        (lease.additionalCharges ?? 0) +
        (lease.garbageFee ?? 0) +
        (lease.added_field_1_price ?? 0) +
        (lease.added_field_2_price ?? 0) +
        (lease.added_field_3_price ?? 0) +
        (lease.added_field_4_price ?? 0) +
        (lease.added_field_5_price ?? 0) +
        (lease.added_field_6_price ?? 0) +
        (lease.added_field_7_price ?? 0);

      for (let i = 0; i < readings.length - 1; i++) {
        const currentReading = readings[i];
        const nextReading = readings[i + 1];

        const month = currentReading.readOn.toLocaleString('default', {
          month: 'long',
        });
        const unitsUsed =
          nextReading.currentReading - currentReading.currentReading;
        const safeUnitsUsed = unitsUsed < 0 ? 0 : unitsUsed;

        const waterBill = safeUnitsUsed * lease.waterRate;
        const deposit = i === 0 ? (lease.unit.deposit ?? 0) : 0;

        const expected =
          waterBill + totalAdditionalCharges + (lease.rentRate ?? 0) + deposit;
        const monthPayments = paymentsByLease[lease.id]?.[month] || [];
        const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = expected - collected;

        monthlySummary[month] ??= {
          unit: {},
          expected: 0,
          collected: 0,
          balance: 0,
        };
        monthlySummary[month].unit[lease.unit.number] = {
          expected,
          collected,
          balance,
          payments: monthPayments,
        };

        monthlySummary[month].expected += expected;
        monthlySummary[month].collected += collected;
        monthlySummary[month].balance =
          monthlySummary[month].expected - monthlySummary[month].collected;

        grandTotalExpected += expected;
        grandTotalCollected += collected;
      }
    }

    grandTotalBalance = grandTotalExpected - grandTotalCollected;

    return {
      monthlySummary,
      totals: {
        expected: grandTotalExpected,
        collected: grandTotalCollected,
        balance: grandTotalBalance,
      },
    };
  }

  async getLeaseSummary(unitId: number, year: number) {
    const lease = await prisma.lease.findFirst({
      where: { unitId: unitId, status: 'ACTIVE' },
      select: {
        id: true,
        unit: { select: { deposit: true } },
        rentRate: true,
        waterRate: true,
        garbageFee: true,
        additionalCharges: true,
        added_field_1_price: true,
        added_field_2_price: true,
        added_field_3_price: true,
        added_field_4_price: true,
        added_field_5_price: true,
        added_field_6_price: true,
        added_field_7_price: true,
      },
    });

    if (!lease) return {};

    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00Z`);

    const readings = await prisma.meterReading.findMany({
      where: { leaseId: lease.id, readOn: { gte: startDate, lt: endDate } },
      orderBy: { readOn: 'asc' },
    });

    const payments = await prisma.payment.findMany({
      where: { leaseId: lease.id, date: { gte: startDate, lt: endDate } },
      orderBy: { date: 'asc' },
    });

    const paymentsByMonth: Record<
      string,
      { datePaid: string; amount: number; reference: string }[]
    > = {};

    for (const payment of payments) {
      const month = payment.date.toLocaleString('default', { month: 'long' });
      const formattedDate = payment.date.getDate().toString().padStart(2, '0');

      if (!paymentsByMonth[month]) paymentsByMonth[month] = [];
      paymentsByMonth[month].push({
        datePaid: formattedDate,
        amount: payment.amount,
        reference: payment.reference,
      });
    }

    const monthlySummary: Record<
      string,
      {
        payments: { datePaid: string; amount: number }[];
        expected: number;
        collected: number;
        balance: number;
      }
    > = {};

    let totalExpected = 0;
    let totalCollected = 0;

    const totalAdditionalCharges =
      (lease.additionalCharges ?? 0) +
      (lease.garbageFee ?? 0) +
      (lease.added_field_1_price ?? 0) +
      (lease.added_field_2_price ?? 0) +
      (lease.added_field_3_price ?? 0) +
      (lease.added_field_4_price ?? 0) +
      (lease.added_field_5_price ?? 0) +
      (lease.added_field_6_price ?? 0) +
      (lease.added_field_7_price ?? 0);

    for (let i = 0; i < readings.length - 1; i++) {
      const currentReading = readings[i];
      const nextReading = readings[i + 1];

      const month = currentReading.readOn.toLocaleString('default', {
        month: 'long',
      });
      const unitsUsed =
        nextReading.currentReading - currentReading.currentReading;
      const safeUnitsUsed = unitsUsed < 0 ? 0 : unitsUsed;
      const waterBill = safeUnitsUsed * lease.waterRate;
      const deposit = i === 0 ? (lease.unit.deposit ?? 0) : 0;

      const expected =
        waterBill + totalAdditionalCharges + (lease.rentRate ?? 0) + deposit;
      const monthPayments = paymentsByMonth[month] || [];
      const collected = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = expected - collected;

      monthlySummary[month] = {
        payments: monthPayments,
        expected,
        collected,
        balance,
      };

      totalExpected += expected;
      totalCollected += collected;
    }

    const totalBalance = totalExpected - totalCollected;

    return {
      monthlySummary,
      totals: {
        expected: totalExpected,
        collected: totalCollected,
        balance: totalBalance,
      },
    };
  }

  async getPaidYears(houseId: number) {
    const earliestLease = await prisma.lease.findFirst({
      where: {
        houseId,
        status: 'ACTIVE',
      },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });

    if (!earliestLease || !earliestLease.startDate) {
      return [];
    }

    const startYear = earliestLease.startDate.getFullYear();
    const currentYear = new Date().getFullYear();

    const years = Array.from(
      { length: currentYear - startYear + 1 },
      (_, i) => startYear + i,
    );

    const uniqueYears = [...new Set(years)];

    return uniqueYears;
  }

  async getPaidUnitYears(unitId: number) {
    const earliestLease = await prisma.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
      },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });

    if (!earliestLease || !earliestLease.startDate) {
      return [];
    }

    const startYear = earliestLease.startDate.getFullYear();
    const currentYear = new Date().getFullYear();

    const years = Array.from(
      { length: currentYear - startYear + 1 },
      (_, i) => startYear + i,
    );

    const uniqueYears = [...new Set(years)];

    return uniqueYears;
  }

  async getYears() {
    const earliestLease = await prisma.lease.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });

    if (!earliestLease || !earliestLease.startDate) {
      return [];
    }

    const startYear = earliestLease.startDate.getFullYear();
    const currentYear = new Date().getFullYear();

    const years = Array.from(
      { length: currentYear - startYear + 1 },
      (_, i) => startYear + i,
    );

    const uniqueYears = [...new Set(years)];

    return uniqueYears;
  }

  async deleteMany(ids: number[]) {
    try {
      return await prisma.payment.deleteMany({
        where: {
          id: { in: ids },
        },
      });
    } catch (error) {
      console.error('DeleteMany Service Error:', error);
      throw new HttpException(
        'An error occurred while deleting payments.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async houseDisplay(houseId: number, year: number): Promise<MonthTotals[]> {
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

    const leases = await prisma.lease.findMany({
      where: {
        houseId,
        startDate: { lte: yearEnd },
        OR: [{ endDate: { gte: yearStart } }, { endDate: null }],
      },
      include: {
        meterReading: {
          where: { readOn: { gte: yearStart, lte: yearEnd } },
          orderBy: { readOn: 'asc' },
        },
        unit: { select: { deposit: true, id: true } },
      },
    });

    const leaseIds = leases.map((l) => l.id);

    const payments = await prisma.payment.findMany({
      where: {
        houseId,
        leaseId: { in: leaseIds },
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { amount: true, date: true },
    });

    const expectedBuckets = Array(12).fill(0);
    const collectedBuckets = Array(12).fill(0);
    const depositAddedToUnit = new Set<number>();

    for (const lease of leases) {
      const segStart = max([lease.startDate, yearStart]);
      const segEnd = min([lease.endDate ?? yearEnd, yearEnd]);
      const unitId = lease.unit.id;
      const mStart = getMonth(segStart);

      if (lease.unit.deposit && !depositAddedToUnit.has(unitId)) {
        expectedBuckets[mStart] += lease.unit.deposit;
        depositAddedToUnit.add(unitId);
      }

      let cursor = startOfMonth(segStart);
      const last = endOfMonth(segEnd);
      while (cursor <= last) {
        const m = getMonth(cursor);
        expectedBuckets[m] += lease.rentRate;
        expectedBuckets[m] += lease.additionalCharges;
        expectedBuckets[m] += lease.garbageFee;
        expectedBuckets[m] += lease.added_field_1_price;
        expectedBuckets[m] += lease.added_field_2_price;
        expectedBuckets[m] += lease.added_field_3_price;
        expectedBuckets[m] += lease.added_field_4_price;
        expectedBuckets[m] += lease.added_field_5_price;
        expectedBuckets[m] += lease.added_field_6_price;
        expectedBuckets[m] += lease.added_field_7_price;
        cursor = addMonths(cursor, 1);
      }

      const readings = [
        { readOn: segStart, currentReading: lease.onEntryMeterReading },
        ...lease.meterReading,
        {
          readOn: segEnd,
          currentReading: this.lastReadingValue(
            lease.meterReading,
            lease.onEntryMeterReading,
          ),
        },
      ];
      for (let i = 0; i < readings.length - 1; i++) {
        const used =
          readings[i + 1].currentReading - readings[i].currentReading;
        const m = getMonth(readings[i + 1].readOn);
        expectedBuckets[m] += used * lease.waterRate;
      }
    }

    for (const p of payments) {
      const m = p.date.getMonth();
      collectedBuckets[m] += p.amount;
    }

    const now = new Date();
    const thisYear = now.getFullYear();
    const lastMonthIndex = year === thisYear ? now.getMonth() : 11;

    const firstActiveMonth = leases
      .map((l) => getMonth(max([l.startDate, yearStart])))
      .reduce((minM, m) => Math.min(minM, m), 11);

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const result: MonthTotals[] = [];
    let previousBalance = 0;

    for (let idx = firstActiveMonth; idx <= lastMonthIndex; idx++) {
      const baseExpected = expectedBuckets[idx];
      const carriedForward = previousBalance;

      const expected = baseExpected + carriedForward;
      const collected = collectedBuckets[idx];
      const balance = expected - collected;

      result.push({
        month: monthNames[idx],
        expected,
        collected,
        balance,
      });

      previousBalance = balance;
    }

    return result;
  }

  async dashboardDisplay(year: number): Promise<MonthTotals[]> {
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

    // 1️⃣ Fetch leases + meter readings + unit (for deposit)
    const leases = await prisma.lease.findMany({
      where: {
        startDate: { lte: yearEnd },
        OR: [{ endDate: { gte: yearStart } }, { endDate: null }],
      },
      include: {
        meterReading: {
          where: { readOn: { gte: yearStart, lte: yearEnd } },
          orderBy: { readOn: 'asc' },
        },
        unit: {
          select: { deposit: true, id: true },
        },
      },
    });
    const leaseIds = leases.map((l) => l.id);

    // 2️⃣ Fetch payments
    const payments = await prisma.payment.findMany({
      where: {
        leaseId: { in: leaseIds },
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { amount: true, date: true },
    });

    // 3️⃣ Prepare buckets
    const expectedBuckets = Array(12).fill(0);
    const collectedBuckets = Array(12).fill(0);

    // Track which units have had their deposit added
    const depositAddedToUnit = new Set<number>();

    // 4️⃣ Compute expected per lease
    for (const lease of leases) {
      const segStart = max([lease.startDate, yearStart]);
      const segEnd = min([lease.endDate ?? yearEnd, yearEnd]);

      // **Once-per-unit deposit in the first month of its first lease**
      const unitId = lease.unit.id;
      const firstLeaseMonth = getMonth(segStart);
      if (lease.unit.deposit && !depositAddedToUnit.has(unitId)) {
        expectedBuckets[firstLeaseMonth] += lease.unit.deposit;
        depositAddedToUnit.add(unitId);
      }

      // Fixed charges per active month
      let cursor = startOfMonth(segStart);
      const last = endOfMonth(segEnd);
      while (cursor <= last) {
        const m = getMonth(cursor);
        expectedBuckets[m] += lease.rentRate;
        expectedBuckets[m] += lease.additionalCharges;
        expectedBuckets[m] += lease.garbageFee;
        // all added_field_n_price
        expectedBuckets[m] += lease.added_field_1_price;
        expectedBuckets[m] += lease.added_field_2_price;
        expectedBuckets[m] += lease.added_field_3_price;
        expectedBuckets[m] += lease.added_field_4_price;
        expectedBuckets[m] += lease.added_field_5_price;
        expectedBuckets[m] += lease.added_field_6_price;
        expectedBuckets[m] += lease.added_field_7_price;
        cursor = addMonths(cursor, 1);
      }

      // Water usage per reading interval
      const readings = [
        { readOn: segStart, currentReading: lease.onEntryMeterReading },
        ...lease.meterReading,
        {
          readOn: segEnd,
          currentReading: this.lastReadingValue(
            lease.meterReading,
            lease.onEntryMeterReading,
          ),
        },
      ];
      for (let i = 0; i < readings.length - 1; i++) {
        const used =
          readings[i + 1].currentReading - readings[i].currentReading;
        const m = getMonth(readings[i + 1].readOn);
        expectedBuckets[m] += used * lease.waterRate;
      }
    }

    // 5️⃣ Bucket payments
    for (const p of payments) {
      const m = p.date.getMonth();
      collectedBuckets[m] += p.amount;
    }

    // 6️⃣ Zero out future months
    const now = new Date();
    if (year > now.getFullYear()) {
      expectedBuckets.fill(0);
      collectedBuckets.fill(0);
    } else if (year === now.getFullYear()) {
      for (let m = now.getMonth() + 1; m < 12; m++) {
        expectedBuckets[m] = 0;
        collectedBuckets[m] = 0;
      }
    }

    // 7️⃣ Build result map, starting from the earliest active month
    const firstActiveMonth = leases
      .map((l) => getMonth(max([l.startDate, yearStart])))
      .reduce((minM, m) => Math.min(minM, m), 11);

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const currentMonthIndex = now.getMonth(); // 0 = Jan, 6 = July
    const thisYear = now.getFullYear();

    const result: MonthTotals[] = [];

    let previousBalance = 0;

    const lastMonthIndex = year === thisYear ? currentMonthIndex : 11;

    for (let idx = firstActiveMonth; idx <= lastMonthIndex; idx++) {
      const baseExpected = expectedBuckets[idx];
      const carriedForward = previousBalance;

      const expected = baseExpected + carriedForward;
      const collected = collectedBuckets[idx];
      const balance = expected - collected;

      result.push({
        month: monthNames[idx],
        expected,
        collected,
        balance,
      });

      previousBalance = balance;
    }

    return result;
  }

  async ledgerForTenant(
    leaseCode: string,
    year: number,
  ): Promise<TenantLedgerEntry[]> {
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

    // 1️⃣ Fetch all relevant leases
    const leases = await prisma.lease.findMany({
      where: {
        code: leaseCode,
        startDate: { lte: yearEnd },
        OR: [{ endDate: { gte: yearStart } }, { endDate: null }],
      },
      orderBy: { startDate: 'asc' },
      include: {
        meterReading: {
          where: { readOn: { gte: yearStart, lte: yearEnd } },
          orderBy: { readOn: 'asc' },
        },
      },
    });
    if (!leases.length) return [];

    // 2️⃣ Fetch all payments in that year
    const payments = await prisma.payment.findMany({
      where: {
        lease: { code: leaseCode },
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    type Event = { date: Date; expected: number; collected: number };
    const events: Event[] = [];

    // 3️⃣ Build “charge” events for each lease-month boundary
    for (const lease of leases) {
      const segStart = max([lease.startDate, yearStart, lease.moveInDate]);
      const segEnd = min([lease.endDate ?? yearEnd, yearEnd]);

      let cursor = startOfMonth(segStart);
      const last = endOfMonth(segEnd);

      while (cursor <= last) {
        // sum up fixed charges + all added_field_n_price
        let monthCharge =
          lease.rentRate +
          lease.additionalCharges +
          lease.garbageFee +
          lease.added_field_1_price +
          lease.added_field_2_price +
          lease.added_field_3_price +
          lease.added_field_4_price +
          lease.added_field_5_price +
          lease.added_field_6_price +
          lease.added_field_7_price;

        // water usage interval ending this month
        const readings = [
          { readOn: segStart, currentReading: lease.onEntryMeterReading },
          ...lease.meterReading,
          {
            readOn: segEnd,
            currentReading: this.lastReadingValue(
              lease.meterReading,
              lease.onEntryMeterReading,
            ),
          },
        ];
        const endOfThisMonth = endOfMonth(cursor);
        const idxR2 = readings.findIndex((r) => r.readOn > endOfThisMonth);
        if (idxR2 > 0) {
          const r1 = readings[idxR2 - 1];
          const r2 = readings[idxR2];
          monthCharge +=
            (r2.currentReading - r1.currentReading) * lease.waterRate;
        }

        events.push({ date: cursor, expected: monthCharge, collected: 0 });
        cursor = addMonths(cursor, 1);
      }
    }

    // 4️⃣ Add payment events
    for (const p of payments) {
      events.push({ date: p.date, expected: 0, collected: p.amount });
    }

    // 5️⃣ Sort all events chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 6️⃣ Walk through events, accumulate, but only emit on payments
    const ledger: TenantLedgerEntry[] = [];
    let cumExpected = 0;
    let cumCollected = 0;

    for (const ev of events) {
      cumExpected += ev.expected;
      cumCollected += ev.collected;

      if (ev.collected > 0) {
        ledger.push({
          date: ev.date,
          expected: cumExpected,
          collected: ev.collected,
          balance: cumExpected - cumCollected,
        });
      }
    }

    return ledger;
  }

  /** Helper to get the last reading value or fallback. */
  private lastReadingValue(
    readings: { readOn: Date; currentReading: number }[],
    fallback: number,
  ): number {
    return readings.length
      ? readings[readings.length - 1].currentReading
      : fallback;
  }

  // REPORTS
  async yearlyReport(
    houseId: number,
    year?: string,
    startMonth?: string,
    endMonth?: string,
    includePastTenantsData: boolean = false,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const monthsOrder = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const normalizeMonth = (val?: string) => {
      if (!val) return undefined;
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) return num - 1;
      const index = monthsOrder.indexOf(val);
      return index >= 0 ? index : undefined;
    };

    const startIndex = normalizeMonth(startMonth);
    const endIndex = normalizeMonth(endMonth);

    // 1. Fetch leases (active or all)
    const leases = await prisma.lease.findMany({
      where: includePastTenantsData
        ? { houseId }
        : { houseId, status: 'ACTIVE' },
      include: { unit: { select: { number: true, id: true } } },
    });

    if (!leases.length) return [];

    type MonthData = {
      expected: number;
      collected: number;
      balance: number;
      rentRate?: number;
    };

    type MonthlyCollected = { month: string; collected: number };

    const unitSummaries: {
      unitNumber: string;
      rentRate: number | null;
      year: number;
      months: MonthlyCollected[];
      totalExpected: number;
      totalCollected: number;
      totalBalance: number;
    }[] = [];

    // 2. Process each lease
    for (const lease of leases) {
      const leaseSummary = await this.getTenantLevelSummary(lease.code);
      const yearKey = String(targetYear);
      const yearData = leaseSummary.summary[yearKey];
      if (!yearData) continue;

      // Sort months chronologically and filter range
      const months = Object.entries(yearData)
        .sort(([a], [b]) => monthsOrder.indexOf(a) - monthsOrder.indexOf(b))
        .filter(([month]) => {
          const idx = monthsOrder.indexOf(month);
          if (idx === -1) return false;
          return (
            (startIndex === undefined || idx >= startIndex) &&
            (endIndex === undefined || idx <= endIndex)
          );
        });

      let totalExpected = 0;
      let totalCollected = 0;
      let totalBalance = 0;

      const monthlyCollected: MonthlyCollected[] = [];

      for (let i = 0; i < months.length; i++) {
        const [month, rawData] = months[i];
        const data = rawData as MonthData;

        // Get previous month's balance (if exists)
        const prevMonthKey = monthsOrder[monthsOrder.indexOf(month) - 1];
        const prev = prevMonthKey
          ? (yearData[prevMonthKey] as MonthData)
          : undefined;

        // Current month's expected minus previous month balance
        const monthlyExpected = prev
          ? data.expected - prev.balance
          : data.expected;

        totalExpected += monthlyExpected;
        totalCollected += data.collected;
        totalBalance += data.balance;

        monthlyCollected.push({ month, collected: data.collected });
      }

      unitSummaries.push({
        unitNumber: lease.unit.number,
        rentRate: months[0]
          ? ((months[0][1] as MonthData).rentRate ?? lease.rentRate ?? null)
          : (lease.rentRate ?? null),
        year: targetYear,
        months: monthlyCollected,
        totalExpected,
        totalCollected,
        totalBalance: totalExpected - totalCollected, // final balance = expected - collected
      });
    }

    // 3. Sort by unit number
    return unitSummaries.sort((a, b) =>
      a.unitNumber.localeCompare(b.unitNumber),
    );
  }

  async monthlyReport(
    houseId: number,
    month: number,
    year: number,
    includePastTenantsData: boolean = false,
  ) {
    // Step 1: Fetch leases based on includePastTenantsData flag
    let leases;

    if (includePastTenantsData === true) {
      leases = await prisma.lease.findMany({
        where: {
          houseId,
        },
        include: {
          unit: { select: { number: true, id: true } },
        },
      });
    } else {
      leases = await prisma.lease.findMany({
        where: {
          houseId,
          status: 'ACTIVE',
        },
        include: {
          unit: { select: { number: true, id: true } },
        },
      });
    }

    if (!leases.length) return [];

    // Step 2: For each lease, get the full summary
    const leaseSummaries = await Promise.all(
      leases.map((l) => this.getTenantLevelSummary(l.code)),
    );

    // Step 3: Combine by unit
    const unitsMap: Record<
      string,
      { unitName: string; expected: number; collected: number; balance: number }
    > = {};

    for (let i = 0; i < leases.length; i++) {
      const lease = leases[i];
      const summary = leaseSummaries[i].summary?.[year];
      if (!summary) continue;

      // Convert numeric month (1–12) to name
      const monthName = new Date(year, month - 1).toLocaleString('default', {
        month: 'long',
      });

      const data = summary[monthName];
      if (!data) continue;

      const key = lease.unit.id;
      if (!unitsMap[key]) {
        unitsMap[key] = {
          unitName: lease.unit.number,
          expected: 0,
          collected: 0,
          balance: 0,
        };
      }

      unitsMap[key].expected += data.expected;
      unitsMap[key].collected += data.collected;
      unitsMap[key].balance += data.balance;
    }

    // Step 4: Return as array
    return Object.values(unitsMap).sort((a, b) =>
      a.unitName.localeCompare(b.unitName),
    );
  }

  // ==========================================================================
  // V2 — event-ledger engine. Additive only; V1 methods above are untouched.
  // See ledger.util.ts for the pure charge/ledger functions this wraps.
  // ==========================================================================

  async getTenantLevelSummaryV2(leaseCode: string) {
    const lease = await prisma.lease.findFirst({ where: { code: leaseCode } });
    if (!lease) {
      throw new Error('Lease not found');
    }

    // Scoped by leaseId, not unitId — billingPeriod now makes attribution explicit,
    // so readings belonging to a different tenancy on the same unit are correctly excluded.
    const readings = await prisma.meterReading.findMany({
      where: { leaseId: lease.id },
      orderBy: { readOn: 'asc' },
      select: { readOn: true, currentReading: true, billingPeriod: true, isMeterReset: true },
    });

    const payments = await prisma.payment.findMany({
      where: { leaseId: lease.id },
      orderBy: { date: 'asc' },
    });

    const now = new Date();
    const asOf = lease.terminationDate ? new Date(lease.terminationDate) : now;

    const charges = generateCharges(lease as any, readings, asOf);
    const ledger = buildLedger(charges, payments);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const summary: Record<number, Record<string, any>> = {};
    const years: number[] = [];

    let m = new Date(lease.startDate.getFullYear(), lease.startDate.getMonth(), 1);
    let prevCumExpected = 0;
    let prevCumCollected = 0;

    while (m <= asOf) {
      const monthEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);
      const pointsInMonth = ledger.filter((p) => p.date <= monthEnd);
      const last = pointsInMonth.length ? pointsInMonth[pointsInMonth.length - 1] : { cumExpected: 0, cumCollected: 0, balance: 0 };

      // "expected" = new charges this month + carried-forward balance
      // (rentRate + waterCharge + extras + carriedBalance), not new-charges-alone.
      // Algebraically: prevBalance + monthNewCharges = last.cumExpected - prevCumCollected.
      const monthExpected = last.cumExpected - prevCumCollected;
      const monthCollected = last.cumCollected - prevCumCollected;

      const inMonth = (d: Date) => d >= m && d <= monthEnd;
      // All water events dated in this month (two readings closing the same
      // month is a data-entry anomaly, but the row must still match the ledger).
      const waterEvents = charges.filter((c) => c.label === 'water' && inMonth(c.date));
      const usage = waterEvents.reduce((s, c) => s + (c.meta?.usage ?? 0), 0);
      const waterChargeTotal = waterEvents.reduce(
        (s, c) => s + (c.meta?.waterCharge ?? 0) + (c.meta?.serviceCharge ?? 0),
        0,
      );
      const serviceChargeTotal = waterEvents.reduce((s, c) => s + (c.meta?.serviceCharge ?? 0), 0);

      const sumLabel = (label: string) =>
        charges.filter((c) => c.label === label && inMonth(c.date)).reduce((s, c) => s + c.amount, 0);
      const rentCharged = sumLabel('rent');
      const depositCharged = sumLabel('deposit');
      const arrearsCharged = sumLabel('arrearsbf');

      const extraCharges: Record<string, number> = {};
      for (const c of charges) {
        if (inMonth(c.date) && !['rent', 'water', 'arrearsbf', 'deposit'].includes(c.label)) {
          extraCharges[c.label] = c.amount;
        }
      }

      // First month: the effective billing date can't precede the tenancy
      // (mirrors generateCharges' max(startDate, due day) rule).
      let billingDate = billingDateFor(m.getFullYear(), m.getMonth(), lease.rentDue);
      const isStartMonth =
        m.getFullYear() === lease.startDate.getFullYear() &&
        m.getMonth() === lease.startDate.getMonth();
      if (isStartMonth && lease.startDate > billingDate) {
        billingDate = new Date(lease.startDate);
      }
      const billingDateStr = `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, '0')}-${String(billingDate.getDate()).padStart(2, '0')}`;

      const year = m.getFullYear();
      if (!summary[year]) {
        summary[year] = {};
        years.push(year);
      }

      const paymentsInMonth = payments.filter((p) => p.date >= m && p.date <= monthEnd);

      summary[year][monthNames[m.getMonth()]] = {
        expected: Math.round(monthExpected),
        collected: Math.round(monthCollected),
        balance: Math.round(last.balance),
        usage,
        waterCharge: waterChargeTotal,
        serviceCharge: serviceChargeTotal,
        rentRate: lease.rentRate,
        rentCharged: Math.round(rentCharged),
        billingDate: billingDateStr,
        deposit: Math.round(depositCharged),
        arrearsbf: Math.round(arrearsCharged),
        waterRate: lease.waterRate,
        previousReading: waterEvents.length ? (waterEvents[0].meta?.previousReading ?? null) : null,
        currentReading: waterEvents.length
          ? (waterEvents[waterEvents.length - 1].meta?.currentReading ?? null)
          : null,
        extraCharges,
        payments: paymentsInMonth.map((p) => ({
          date: p.date,
          amount: p.amount,
          method: p.paymentMethod,
          reference: p.reference,
        })),
      };

      prevCumExpected = last.cumExpected;
      prevCumCollected = last.cumCollected;
      m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    }

    return { years: [...new Set(years)].sort((a, b) => b - a), summary };
  }

  async getHouseLevelSummaryV2(houseId: number) {
    const leases = await prisma.lease.findMany({
      where: { houseId, status: 'ACTIVE' },
      select: { code: true },
    });

    if (!leases.length) {
      return { years: [], summary: {}, houseId, houseName: '' };
    }

    const summaries = await Promise.all(
      leases.map((l) => this.getTenantLevelSummaryV2(l.code)),
    );

    const houseSummary = { years: [] as number[], summary: {} as Record<string, Record<string, any>> };

    for (const { years, summary } of summaries) {
      for (const year of years) {
        if (!houseSummary.years.includes(year)) houseSummary.years.push(year);
        if (!houseSummary.summary[year]) houseSummary.summary[year] = {};

        for (const [month, data] of Object.entries(summary[year]) as [string, any][]) {
          if (!houseSummary.summary[year][month]) {
            houseSummary.summary[year][month] = {
              expected: 0, collected: 0, balance: 0, usage: 0, waterCharge: 0, serviceCharge: 0, payments: [],
            };
          }
          const target = houseSummary.summary[year][month];
          target.expected += data.expected;
          target.collected += data.collected;
          target.balance += data.balance;
          target.usage += data.usage;
          target.waterCharge += data.waterCharge;
          target.serviceCharge += data.serviceCharge;
          target.payments.push(...data.payments);
        }
      }
    }

    houseSummary.years.sort((a, b) => b - a);
    return houseSummary;
  }

  async getManagerLevelSummaryV2() {
    const houses = await prisma.house.findMany({ select: { id: true } });

    const summaries = await Promise.all(
      houses.map(async (house) => {
        try {
          return await this.getHouseLevelSummaryV2(house.id);
        } catch (err) {
          console.log(`[V2] Skipping house ${house.id}: ${err.message}`);
          return null;
        }
      }),
    );

    const cumulativeSummary: Record<number, Record<string, any>> = {};
    const allYears = new Set<number>();

    for (const s of summaries) {
      if (!s) continue;
      for (const year of s.years) {
        allYears.add(year);
        if (!cumulativeSummary[year]) cumulativeSummary[year] = {};
        for (const [month, data] of Object.entries(s.summary[year]) as [string, any][]) {
          if (!cumulativeSummary[year][month]) {
            cumulativeSummary[year][month] = {
              expected: 0, collected: 0, balance: 0, usage: 0, waterCharge: 0, serviceCharge: 0, payments: [],
            };
          }
          const target = cumulativeSummary[year][month];
          target.expected += data.expected;
          target.collected += data.collected;
          target.balance += data.balance;
          target.usage += data.usage;
          target.waterCharge += data.waterCharge;
          target.serviceCharge += data.serviceCharge;
          target.payments.push(...data.payments);
        }
      }
    }

    return { years: Array.from(allYears).sort((a, b) => b - a), summary: cumulativeSummary };
  }

  async monthlyReportV2(
    houseId: number,
    month: number,
    year: number,
    includePastTenantsData: boolean = false,
  ) {
    const leases = await prisma.lease.findMany({
      where: includePastTenantsData ? { houseId } : { houseId, status: 'ACTIVE' },
      include: { unit: { select: { number: true, id: true } } },
    });
    if (!leases.length) return [];

    const leaseSummaries = await Promise.all(
      leases.map((l) => this.getTenantLevelSummaryV2(l.code)),
    );

    const unitsMap: Record<string, { unitName: string; expected: number; collected: number; balance: number }> = {};
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    for (let i = 0; i < leases.length; i++) {
      const lease = leases[i];
      const data = leaseSummaries[i].summary?.[year]?.[monthName];
      if (!data) continue;

      const key = lease.unit.id;
      if (!unitsMap[key]) {
        unitsMap[key] = { unitName: lease.unit.number, expected: 0, collected: 0, balance: 0 };
      }
      unitsMap[key].expected += data.expected;
      unitsMap[key].collected += data.collected;
      unitsMap[key].balance += data.balance;
    }

    return Object.values(unitsMap).sort((a, b) => a.unitName.localeCompare(b.unitName));
  }

  async yearlyReportV2(
    houseId: number,
    year?: string,
    startMonth?: string,
    endMonth?: string,
    includePastTenantsData: boolean = false,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const monthsOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const normalizeMonth = (val?: string) => {
      if (!val) return undefined;
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 1 && num <= 12) return num - 1;
      const index = monthsOrder.indexOf(val);
      return index >= 0 ? index : undefined;
    };
    const startIndex = normalizeMonth(startMonth);
    const endIndex = normalizeMonth(endMonth);

    const leases = await prisma.lease.findMany({
      where: includePastTenantsData ? { houseId } : { houseId, status: 'ACTIVE' },
      include: { unit: { select: { number: true, id: true } } },
    });
    if (!leases.length) return [];

    const unitSummaries: any[] = [];

    for (const lease of leases) {
      const leaseSummary = await this.getTenantLevelSummaryV2(lease.code);
      const yearData = leaseSummary.summary[targetYear];
      if (!yearData) continue;

      const months = Object.entries(yearData)
        .sort(([a], [b]) => monthsOrder.indexOf(a) - monthsOrder.indexOf(b))
        .filter(([month]) => {
          const idx = monthsOrder.indexOf(month);
          if (idx === -1) return false;
          return (startIndex === undefined || idx >= startIndex) && (endIndex === undefined || idx <= endIndex);
        });

      // Row "expected" is a statement (carry-forward + new charges), so summing it
      // directly would double-count every month's carry. Subtracting the previous
      // row's balance leaves new-charges-only for every month after the first; the
      // first row keeps its carry-in. The total then telescopes so that
      // totalExpected - totalCollected = the window's true closing balance.
      // (docs/BILLING_MODEL.md §6)
      let totalExpected = 0;
      let totalCollected = 0;
      let prevBalance: number | null = null;
      const monthlyCollected: { month: string; collected: number }[] = [];

      for (const [month, rawData] of months) {
        const data = rawData as any;
        totalExpected += prevBalance === null ? data.expected : data.expected - prevBalance;
        totalCollected += data.collected;
        prevBalance = data.balance;
        monthlyCollected.push({ month, collected: data.collected });
      }

      unitSummaries.push({
        unitNumber: lease.unit.number,
        rentRate: lease.rentRate ?? null,
        year: targetYear,
        months: monthlyCollected,
        totalExpected,
        totalCollected,
        totalBalance: totalExpected - totalCollected,
      });
    }

    return unitSummaries.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
  }
}
