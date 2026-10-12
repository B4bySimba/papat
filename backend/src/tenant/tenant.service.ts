import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import { LedgerService, previewable } from 'src/payment/ledger.service';
import { endOfLocalDay, formatMonth, houseBase, rateFields, startOfMonth, termsAt } from 'src/payment/ledger.util';
import prisma from 'lib/db';

@Injectable()
export class TenantService {
  constructor(
    private readonly hashIdService: HashidService,
    private readonly ledger: LedgerService,
  ) {}

  //frontend
  async searchTenants(query: string) {
    const tenants = await prisma.tenant.findMany({
      where: {
        state: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        unit: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return tenants.map((tenant) => ({
      value: this.hashIdService.encode(tenant.id), // � encode the ID
      label: `${tenant.name} - ${tenant.unit?.number ?? 'No Unit'}`,
    }));
  }

  async leaseCode(unitId: number) {
    const unitExists = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });

    if (!unitExists) {
      throw new NotFoundException('Unit does not exist');
    }

    const lease = await prisma.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
      },
      select: {
        code: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Unit is Vacant');
    }

    return {
      leaseCode: lease.code,
    };
  }

  async createTenant(input: any, outerTx?: Prisma.TransactionClient) {
    const unitId = input.unitId;

    if (!unitId) {
      throw new HttpException(
        'unitId is required to assign a tenant to a unit.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!input.effectiveFrom) {
      throw new HttpException(
        'effectiveFrom is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parseRequiredDate = (
      value: string | null | undefined,
    ): string | Date => {
      if (!value) {
        throw new HttpException(`Date is required.`, HttpStatus.BAD_REQUEST);
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new HttpException(
          `Invalid date format: ${value}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return date;
    };

    const parseOptionalDate = (
      value: string | null | undefined,
    ): string | Date | null => {
      if (!value) return null;

      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new HttpException(
          `Invalid date format: ${value}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return date;
    };

    try {
      const create = async (tx: Prisma.TransactionClient) => {
        const unit = await tx.unit.update({
          where: { id: unitId },
          data: { tenantSequence: { increment: 1 } },
          include: { house: { include: { rates: { orderBy: { month: 'asc' } } } } },
        });

        // The update above locks the unit row, so a repeated submit waits here and is then refused.
        if (await tx.lease.count({ where: { unitId, status: 'ACTIVE' } })) {
          throw new HttpException('This unit already has an active tenant.', HttpStatus.CONFLICT);
        }

        const tenantCode = `${unit.code}t${unit.tenantSequence}`;
        const leaseCount = await tx.lease.count({
          where: { houseId: unit.houseId },
        });
        const lastLease = await tx.lease.findFirst({
          where: { houseId: unit.houseId },
          orderBy: { code: 'desc' },
        });

        const house = await tx.house.update({
          where: { id: unit.houseId },
          data: { leaseSequence: { increment: 1 } },
        });

        const leaseCode = `l${house.id}${house.leaseSequence}`;

        // Step 1: Create Tenant
        const createdTenant = await tx.tenant.create({
          data: {
            code: tenantCode,
            name: input.name,
            photo: input.photo,
            nationId: input.nationId,
            contact: input.contact,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
            notes: input.notes,
            unit: { connect: { id: unitId } },
          },
        });

        // Step 2: Mark unit as occupied
        await tx.unit.update({
          where: { id: unitId },
          data: {
            state: true,
            deposit: input.movedFromLeaseId ? undefined : input.deposit,
            rentRate: input.rentRate,
          },
        });

        // Step 3: Create Lease, on the property's charges in force when it starts
        const terms = termsAt(houseBase(unit.house), new Date(input.effectiveFrom));
        const lease = await tx.lease.create({
          data: {
            code: leaseCode,
            tenant: { connect: { id: createdTenant.id } },
            unit: { connect: { id: unitId } },
            house: { connect: { id: unit.houseId } },
            ...(input.movedFromLeaseId && { movedFrom: { connect: { id: input.movedFromLeaseId } } }),

            moveInDate: parseRequiredDate(
              input.moveInDate || input.effectiveFrom,
            ),
            arrearsbf: input.arrearsbf ?? 0,
            startDate: parseRequiredDate(input.effectiveFrom),
            endDate: parseOptionalDate(input.endDate),
            rentDue: input.rentDue ?? null,
            deposit: input.deposit,
            rentRate: input.rentRate,
            additional: unit.additional ?? null,
            additionalCharges: unit.additionalCharges ?? 0,
            onEntryMeterReading: input.currentMeterReading ?? 0,

            waterRate: terms.waterRate,
            serviceCharge: terms.serviceCharge,
            electricityRate: unit.house.electricity_bill ?? 0,
            garbageFee: terms.garbageFee,

            added_field_1: terms.added_field_1,
            added_field_2: terms.added_field_2,
            added_field_3: terms.added_field_3,
            added_field_4: terms.added_field_4,
            added_field_5: terms.added_field_5,
            added_field_6: terms.added_field_6,
            added_field_7: terms.added_field_7,

            added_field_1_price: terms.added_field_1_price,
            added_field_2_price: terms.added_field_2_price,
            added_field_3_price: terms.added_field_3_price,
            added_field_4_price: terms.added_field_4_price,
            added_field_5_price: terms.added_field_5_price,
            added_field_6_price: terms.added_field_6_price,
            added_field_7_price: terms.added_field_7_price,
          },
        });

        // Changes the property has scheduled for later months apply to the new tenant too.
        const later = unit.house.rates.filter((r) => r.month > formatMonth(lease.startDate));
        if (later.length) {
          await tx.rateChange.createMany({
            data: later.map((r) => ({ ...rateFields(r), month: r.month, note: r.note, leaseId: lease.id })),
          });
        }

        // Step 4: Create Initial Meter Reading (only if house has a water bill)
        if (terms.waterRate > 0) {
          if (
            input.currentMeterReading === undefined ||
            input.currentMeterReading === null
          ) {
            throw new HttpException(
              'Current meter reading is required when water billing is enabled.',
              HttpStatus.BAD_REQUEST,
            );
          }

          await tx.meterReading.create({
            data: {
              house: { connect: { id: lease.houseId } },
              lease: { connect: { id: lease.id } },
              tenant: { connect: { id: createdTenant.id } },
              unit: { connect: { id: unitId } },
              currentReading: input.currentMeterReading,
              readOn: parseRequiredDate(input.effectiveFrom),
            },
          });
        }

        return createdTenant;
      };
      await (outerTx ? create(outerTx) : prisma.$transaction(create));

      return {
        message: 'Tenant created successfully.',
      };
    } catch (error) {
      console.error('Failed to create tenant:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Tenant creation failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findTenant(Id: number) {
    const activeLease = await prisma.lease.findFirst({
      where: {
        unitId: Id,
        status: 'ACTIVE',
      },
      select: {
        tenant: {
          select: {
            name: true,
            nationId: true,
            contact: true,
            id: true,
          },
        },
        house: {
          select: {
            added_field_1: true,
            added_field_2: true,
            added_field_3: true,
            added_field_4: true,
            added_field_5: true,
            added_field_6: true,
            added_field_7: true,
          },
        },
        unit: {
          select: {
            rentRate: true,
            deposit: true,
          },
        },
        id: true,
        moveInDate: true,
        startDate: true,
        endDate: true,
        waterRate: true,
        serviceCharge: true,
        additionalCharges: true,
        garbageFee: true,
        added_field_1_price: true,
        added_field_2_price: true,
        added_field_3_price: true,
        added_field_4_price: true,
        added_field_5_price: true,
        added_field_6_price: true,
        added_field_7_price: true,
      },
    });

    if (!activeLease) {
      throw new NotFoundException('No active lease found for this unit.');
    }

    const leaseId = activeLease.id;

    // Fetch all readings
    const readings = await prisma.meterReading.findMany({
      where: { leaseId },
      orderBy: { readOn: 'asc' },
    });

    // Fetch all payments
    const payments = await prisma.payment.findMany({
      where: { leaseId },
    });

    // Sum of all payments
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    // Total additional charges
    const totalAdditionalCharges =
      (activeLease.additionalCharges ?? 0) +
      (activeLease.garbageFee ?? 0) +
      (activeLease.added_field_1_price ?? 0) +
      (activeLease.added_field_2_price ?? 0) +
      (activeLease.added_field_3_price ?? 0) +
      (activeLease.added_field_4_price ?? 0) +
      (activeLease.added_field_5_price ?? 0) +
      (activeLease.added_field_6_price ?? 0) +
      (activeLease.added_field_7_price ?? 0);

    let totalExpected = 0;

    for (let i = 0; i < readings.length - 1; i++) {
      const currentReading = readings[i];
      const nextReading = readings[i + 1];

      const unitsUsed =
        nextReading.currentReading - currentReading.currentReading;
      const safeUnitsUsed = unitsUsed < 0 ? 0 : unitsUsed;
      const waterBill = safeUnitsUsed * (activeLease.waterRate ?? 0);
      const serviceCharge = activeLease.serviceCharge ?? 0;
      const deposit = i === 0 ? (activeLease.unit?.deposit ?? 0) : 0;

      const expected =
        serviceCharge +
        waterBill +
        totalAdditionalCharges +
        (activeLease.unit?.rentRate ?? 0) +
        deposit;

      totalExpected += expected;
    }

    const totalBalance = totalExpected - totalCollected;

    const { id, moveInDate, startDate, endDate, tenant, ...cleanedLease } =
      activeLease;

    return {
      tenant: tenant
        ? {
            ...tenant,
            id: await this.hashIdService.encode(tenant.id),
          }
        : null,
      ...cleanedLease,
      leaseId: await this.hashIdService.encode(id),
      moveInDate: moveInDate
        ? new Date(moveInDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      startDate: startDate
        ? new Date(startDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      endDate: endDate
        ? new Date(endDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null,
      balance: totalBalance,
    };
  }

  async getTenant(unitId: number) {
    const unitExists = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });

    if (!unitExists) {
      throw new NotFoundException('Unit does not exist');
    }

    const found = await prisma.lease.findFirst({
      where: {
        unitId,
        status: 'ACTIVE',
      },
      select: {
        tenant: {
          select: {
            id: true,
            name: true,
            nationId: true,
            contact: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            notes: true,
          },
        },
        waterRate: true,
        serviceCharge: true,
        electricityRate: true,
        garbageFee: true,
        added_field_1: true,
        added_field_1_price: true,
        added_field_2: true,
        added_field_2_price: true,
        added_field_3: true,
        added_field_3_price: true,
        added_field_4: true,
        added_field_4_price: true,
        added_field_5: true,
        added_field_5_price: true,
        added_field_6: true,
        added_field_6_price: true,
        added_field_7: true,
        added_field_7_price: true,
        additionalCharges: true,
        rentRate: true,
        deposit: true,
        additional: true,
        id: true,
        code: true,
        houseId: true,
        arrearsbf: true,
        movedFromLeaseId: true,
        movedFrom: { select: { unit: { select: { number: true } } } },
        rates: { orderBy: { month: 'asc' } },
      },
    });

    if (!found || !found.tenant) {
      throw new NotFoundException('Unit is Vacant');
    }
    const lease = termsAt(found, new Date());
    const nextRent = found.rates.find((r) => r.month > formatMonth(new Date()) && r.rentRate != null);

    return {
      tenant: {
        ...lease.tenant,
        id: this.hashIdService.encode(lease.tenant.id),
      },
      water_bill: lease.waterRate ?? 0,
      serviceCharge: lease.serviceCharge ?? 0,
      electricity_bill: lease.electricityRate ?? 0,
      garbage_collection: lease.garbageFee ?? 0,
      added_field_1: lease.added_field_1,
      added_field_1_price: lease.added_field_1_price ?? 0,
      added_field_2: lease.added_field_2,
      added_field_2_price: lease.added_field_2_price ?? 0,
      added_field_3: lease.added_field_3,
      added_field_3_price: lease.added_field_3_price ?? 0,
      added_field_4: lease.added_field_4,
      added_field_4_price: lease.added_field_4_price ?? 0,
      added_field_5: lease.added_field_5,
      added_field_5_price: lease.added_field_5_price ?? 0,
      added_field_6: lease.added_field_6,
      added_field_6_price: lease.added_field_6_price ?? 0,
      added_field_7: lease.added_field_7,
      added_field_7_price: lease.added_field_7_price ?? 0,
      additional: lease.additional,
      additionalCharges: lease.additionalCharges ?? 0,
      deposit: await this.depositHeld(found),
      rentRate: lease.rentRate,
      leaseId: this.hashIdService.encode(lease.id),
      leaseCode: lease.code,
      houseId: this.hashIdService.encode(lease.houseId),
      arrearsbf: lease.arrearsbf,
      nextRent: nextRent ? { month: nextRent.month, rentRate: nextRent.rentRate } : null,
      movedFromUnit: found.movedFrom?.unit.number ?? null,
    };
  }

  /** The deposit a tenant holds: this lease's, plus what came with them from units they moved from. */
  private async depositHeld(lease: { deposit: number | null; movedFromLeaseId: number | null }) {
    let held = lease.deposit ?? 0;
    for (let id = lease.movedFromLeaseId; id !== null; ) {
      const from = await prisma.lease.findUnique({ where: { id }, select: { deposit: true, movedFromLeaseId: true } });
      held += from?.deposit ?? 0;
      id = from?.movedFromLeaseId ?? null;
    }
    return held;
  }

  async year(code: string): Promise<number> {
    const firstLease = await prisma.lease.findFirst({
      where: { code },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });

    if (!firstLease) {
      throw new NotFoundException(`No lease found with code: ${code}`);
    }

    return firstLease.startDate.getFullYear();
  }

  async arrearsbf(id: number, updateLeaseDto: Prisma.LeaseUpdateInput) {
    return prisma.lease.update({
      where: { id },
      data: { arrearsbf: updateLeaseDto.arrearsbf },
    });
  }

  async past(Id: number) {
    const terminatedLeases = await prisma.lease.findMany({
      where: {
        unitId: Id,
        status: 'TERMINATED',
      },
      select: {
        tenant: {
          select: {
            name: true,
          },
        },
        id: true,
        moveInDate: true,
        terminationDate: true, // This is the move-out date for terminated leases
      },
    });

    return terminatedLeases.map((lease) => ({
      leaseId: this.hashIdService.encode(lease.id),
      tenantName: lease.tenant?.name || 'No tenant',
      moveInDate: lease.moveInDate
        ? new Date(lease.moveInDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'No date',
      moveOutDate: lease.terminationDate
        ? new Date(lease.terminationDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'No date',
    }));
  }

  async getPastTenant(id: number) {
    const found = await prisma.lease.findFirst({
      where: {
        id,
        status: 'TERMINATED',
      },
      select: {
        tenant: {
          select: {
            id: true,
            name: true,
            nationId: true,
            contact: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            notes: true,
          },
        },
        waterRate: true,
        serviceCharge: true,
        electricityRate: true,
        garbageFee: true,
        added_field_1: true,
        added_field_1_price: true,
        added_field_2: true,
        added_field_2_price: true,
        added_field_3: true,
        added_field_3_price: true,
        added_field_4: true,
        added_field_4_price: true,
        added_field_5: true,
        added_field_5_price: true,
        added_field_6: true,
        added_field_6_price: true,
        added_field_7: true,
        added_field_7_price: true,
        additionalCharges: true,
        rentRate: true,
        deposit: true,
        additional: true,
        id: true,
        code: true,
        houseId: true,
        arrearsbf: true,
        terminationDate: true,
        movedFromLeaseId: true,
        rates: { orderBy: { month: 'asc' } },
      },
    });

    if (!found || !found.tenant) {
      throw new NotFoundException('Tenant not Found');
    }
    const lease = termsAt(found, found.terminationDate ?? new Date());

    return {
      tenant: {
        ...lease.tenant,
        id: this.hashIdService.encode(lease.tenant.id),
      },
      water_bill: lease.waterRate ?? 0,
      serviceCharge: lease.serviceCharge ?? 0,
      electricity_bill: lease.electricityRate ?? 0,
      garbage_collection: lease.garbageFee ?? 0,
      added_field_1: lease.added_field_1,
      added_field_1_price: lease.added_field_1_price ?? 0,
      added_field_2: lease.added_field_2,
      added_field_2_price: lease.added_field_2_price ?? 0,
      added_field_3: lease.added_field_3,
      added_field_3_price: lease.added_field_3_price ?? 0,
      added_field_4: lease.added_field_4,
      added_field_4_price: lease.added_field_4_price ?? 0,
      added_field_5: lease.added_field_5,
      added_field_5_price: lease.added_field_5_price ?? 0,
      added_field_6: lease.added_field_6,
      added_field_6_price: lease.added_field_6_price ?? 0,
      added_field_7: lease.added_field_7,
      added_field_7_price: lease.added_field_7_price ?? 0,
      additional: lease.additional,
      additionalCharges: lease.additionalCharges ?? 0,
      deposit: await this.depositHeld(found),
      rentRate: lease.rentRate,
      leaseId: this.hashIdService.encode(lease.id),
      leaseCode: lease.code,
      houseId: this.hashIdService.encode(lease.houseId),
      arrearsbf: lease.arrearsbf,
    };
  }

  //backend
  async create(input: any) {
    console.log(input);
    const unitId = input.unit?.connect?.id;

    if (!unitId) {
      throw new Error('unitId is required to assign a tenant to a unit.');
    }

    const effectiveFrom = input.effectiveFrom;
    if (!effectiveFrom) {
      throw new Error('effectiveFrom is required.');
    }

    try {
      const tenant = await prisma.$transaction(async (tx) => {
        // Step 1: Increment tenantSequence and fetch unit with house
        const unit = await tx.unit.update({
          where: { id: unitId },
          data: { tenantSequence: { increment: 1 } },
          include: { house: true },
        });

        if (await tx.lease.count({ where: { unitId, status: 'ACTIVE' } })) {
          throw new Error('This unit already has an active tenant.');
        }

        const tenantCode = `${unit.code}t${unit.tenantSequence}`; //to be code
        const rateHistoryCode = `${tenantCode}r1`; //rateHistoiryCoode

        const leaseCount = await tx.lease.count({
          where: { houseId: unit.houseId },
        });
        const leaseCode = `L${unit.houseId}${leaseCount + 1}`; //leaseCode
        const rentRate = unit.rentRate;
        // console.log(leaseId);

        // Step 2: Create tenant
        const tenant = await tx.tenant.create({
          data: {
            code: tenantCode,
            name: input.name,
            photo: input.photo,
            nationId: input.nationId,
            contact: input.contact,
            unit: { connect: { id: unitId } },
          },
        });

        // Step 3: Mark unit as OCCUPIED
        await tx.unit.update({
          where: { id: unitId },
          data: { state: true },
        });

        // Step 5: Create lease
        const lease = await tx.lease.create({
          data: {
            code: leaseCode, //code
            tenant: { connect: { id: tenant.id } },
            unit: { connect: { id: unitId } },
            house: { connect: { id: unit.houseId } },

            moveInDate: input.moveInDate,
            startDate: new Date(effectiveFrom),
            endDate: input.endDate ? new Date(input.endDate) : null,
            rentDue: input.rentDue ?? null,
            additionalCharges: unit.additionalCharges ?? 0,
            onEntryMeterReading: input.currentMeterReading ?? null,

            rentRate: rentRate,

            waterRate: unit.house.water_bill ?? 0,
            serviceCharge: unit.house.serviceCharge ?? 0,
            electricityRate: unit.house.electricity_bill ?? 0,
            garbageFee: unit.house.garbage_collection ?? 0,

            added_field_1_price: unit.house.added_field_1_price ?? 0,
            added_field_2_price: unit.house.added_field_2_price ?? 0,
            added_field_3_price: unit.house.added_field_3_price ?? 0,
            added_field_4_price: unit.house.added_field_4_price ?? 0,
            added_field_5_price: unit.house.added_field_5_price ?? 0,
            added_field_6_price: unit.house.added_field_6_price ?? 0,
            added_field_7_price: unit.house.added_field_7_price ?? 0,
          },
        });

        await tx.meterReading.create({
          data: {
            lease: { connect: { id: lease.id } },
            tenant: { connect: { id: tenant.id } },
            unit: { connect: { id: unitId } },
            currentReading: input.currentMeterReading ?? null,
            readOn: input.moveInDate,
          },
        });

        return tenant;
      });

      return tenant;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new Error('Tenant creation failed. Please try again.');
    }
  }

  async findAll() {
    return prisma.tenant.findMany({ include: { lease: true } });
  }

  async findOne(id: number) {
    return prisma.tenant.findUnique({
      where: {
        id,
      },
      include: {
        lease: true,
        meterReading: true,
        unit: true,
      },
    });
  }

  update(id: number, updateTenantDto: Prisma.TenantUpdateInput) {
    return prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async vacateTenant(id: number, terminationDate: string) {
    // Find the tenant and their unit
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { unit: true },
    });

    if (!tenant) {
      throw new Error(`Tenant with ID ${id} not found.`);
    }

    if (tenant.state === 'FORMER') {
      throw new Error(`Tenant ${id} is already vacated.`);
    }

    const name = tenant.name;
    const unitId = tenant.unitId;
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
    });
    const unitNumber = unit?.number;
    const parsedDate = new Date(terminationDate);
    console.log(parsedDate);

    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid termination date');
    }

    // Transaction: mark tenant as OUT and unit as VACANT
    await prisma.$transaction([
      prisma.lease.updateMany({
        where: { tenantId: id },
        data: {
          status: 'TERMINATED',
          terminationDate: parsedDate,
        },
      }),
      prisma.tenant.update({
        where: { id },
        data: { state: 'FORMER' },
      }),
      prisma.unit.update({
        where: { id: unitId },
        data: { state: false },
      }),
    ]);

    return {
      message: `Tenant ${name} vacated and Unit ${unitNumber} set to VACANT.`,
    };
  }

  /** Moves a tenant to a vacant unit in the same property, carrying their balance across. A preview saves nothing. */
  async moveTenant(
    tenantId: number,
    body: {
      toUnitId: number;
      date: string;
      rentRate: number;
      deposit: number;
      finalReading?: number | null;
      openingReading?: number | null;
      preview?: boolean;
    },
  ) {
    const movedOn = new Date(body.date);
    if (isNaN(movedOn.getTime()) || movedOn > endOfLocalDay(new Date())) {
      throw new BadRequestException('Pick a move date up to today.');
    }
    if (typeof body.rentRate !== 'number' || body.rentRate < 0 || typeof body.deposit !== 'number' || !Number.isFinite(body.deposit)) {
      throw new BadRequestException('Check the rent and the deposit.');
    }

    return previewable(!!body.preview, async (tx) => {
      const old = await tx.lease.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        include: { tenant: true, rates: { orderBy: { month: 'asc' } } },
      });
      if (!old) throw new NotFoundException('This tenant has no active lease.');
      const unit = await tx.unit.findUnique({ where: { id: body.toUnitId } });
      if (!unit || unit.houseId !== old.houseId || unit.id === old.unitId) {
        throw new BadRequestException('Pick another unit in the same property.');
      }
      if (movedOn < old.startDate) throw new BadRequestException('The move date is before this tenancy started.');
      if (await tx.lease.count({ where: { unitId: unit.id, terminationDate: { gt: movedOn } } })) {
        throw new BadRequestException(`Unit ${unit.number} was still occupied on that date.`);
      }

      const terms = termsAt(old, movedOn);
      const month = startOfMonth(movedOn);
      const closed = await tx.meterReading.findFirst({ where: { leaseId: old.id, billingPeriod: month } });
      if (terms.waterRate > 0 && !closed && body.finalReading == null) {
        throw new BadRequestException('Enter the final meter reading for the old unit.');
      }

      // Close the old tenancy the way vacating does, with its last water reading.
      await tx.lease.update({ where: { id: old.id }, data: { status: 'TERMINATED', terminationDate: movedOn } });
      await tx.tenant.update({ where: { id: tenantId }, data: { state: 'FORMER' } });
      await tx.unit.update({ where: { id: old.unitId }, data: { state: false } });
      if (!closed && body.finalReading != null) {
        await tx.meterReading.create({
          data: {
            currentReading: Number(body.finalReading),
            readOn: movedOn,
            billingPeriod: month,
            unitId: old.unitId,
            houseId: old.houseId,
            leaseId: old.id,
            tenantId,
          },
        });
      }

      const { tenant } = old;
      await this.createTenant(
        {
          name: tenant.name,
          photo: tenant.photo,
          nationId: tenant.nationId,
          contact: tenant.contact,
          emergencyContactName: tenant.emergencyContactName,
          emergencyContactPhone: tenant.emergencyContactPhone,
          notes: tenant.notes,
          unitId: unit.id,
          effectiveFrom: body.date,
          rentRate: body.rentRate,
          deposit: body.deposit,
          rentDue: terms.rentDue,
          currentMeterReading: body.openingReading,
          movedFromLeaseId: old.id,
        },
        tx,
      );
      const lease = await tx.lease.findFirstOrThrow({ where: { unitId: unit.id, status: 'ACTIVE' } });

      // Anything already entered for after the move belongs to the new unit.
      const moved = await tx.payment.updateMany({
        where: { leaseId: old.id, date: { gt: endOfLocalDay(movedOn) } },
        data: { leaseId: lease.id, tenantId: lease.tenantId, unitId: unit.id },
      });
      await tx.meterReading.updateMany({
        where: { unitId: unit.id, leaseId: null, readOn: { gte: movedOn } },
        data: { leaseId: lease.id, tenantId: lease.tenantId },
      });

      const rows = (await this.ledger.ledgersFor([lease.id], false, tx)).get(lease.id) ?? [];
      return { unit: unit.number, balanceMoved: rows[0]?.transfer ?? 0, paymentsMoved: moved.count };
    });
  }

  async remove(tenantId: number): Promise<{ message: string }> {
    return await prisma.$transaction(async (databaseService) => {
      const tenantWithLease = await databaseService.tenant.findUnique({
        where: { id: tenantId },
        include: {
          lease: {
            where: { status: 'ACTIVE' },
          },
        },
      });

      if (!tenantWithLease) {
        throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
      }

      const unitId = tenantWithLease.unitId;
      const hadActiveLease = tenantWithLease.lease.length > 0;

      await databaseService.tenant.delete({
        where: { id: tenantId },
      });

      if (hadActiveLease) {
        const otherActiveTenants = await databaseService.tenant.findMany({
          where: {
            unitId,
            id: { not: tenantId },
            lease: {
              some: { status: 'ACTIVE' },
            },
          },
        });

        if (otherActiveTenants.length === 0) {
          await databaseService.unit.update({
            where: { id: unitId },
            data: { state: false },
          });
        }
      }

      return { message: `Tenant ${tenantId} deleted successfully` };
    });
  }
}
