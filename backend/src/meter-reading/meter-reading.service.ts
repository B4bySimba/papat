import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';
import { formatMonth, parseMonth } from 'src/payment/ledger.util';

@Injectable()
export class MeterReadingService {
  constructor(
    private readonly hashidservice: HashidService,
  ) {}

  async create(createMeterReadingDto: any) {
    const leaseId = createMeterReadingDto.lease.connect.id;
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
    });
    if (!lease) {
      throw new Error('No lease Found with that Id');
    }

    return prisma.meterReading.create({
      data: {
        ...createMeterReadingDto,
        tenant: { connect: { id: lease.tenantId } },
        unit: { connect: { id: lease.unitId } },
        lease: { connect: { id: leaseId } },
      },
    });
  }

  async findAll() {
    return prisma.meterReading.findMany({});
  }

  async findOne(id: number) {
    return prisma.meterReading.findUnique({
      where: { id },
    });
  }

  async getAll() {
    const meterReading = await prisma.meterReading.findMany({
      select: {
        house: {
          select: {
            name: true,
            water_bill: true,
          },
        },
        unit: {
          select: {
            number: true,
          },
        },
        houseId: true,
        unitId: true,
        readOn: true,
        billingPeriod: true,
        currentReading: true,
        id: true,
        lease: {
          select: { startDate: true },
        },
      },
    });

    return meterReading.map((m) => {
      const formattedDate = m.readOn
        ? new Date(m.readOn).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

      const isOpeningReading =
        !m.billingPeriod &&
        !!m.lease &&
        new Date(m.readOn).toDateString() === new Date(m.lease.startDate).toDateString();

      const closingFor = m.billingPeriod
        ? new Date(m.billingPeriod).toLocaleDateString('en-GB', {
            month: 'long',
            year: 'numeric',
          })
        : isOpeningReading
          ? 'Opening reading'
          : 'Unassigned';

      return {
        unitId: m.unit ? this.hashidservice.encode(m.unitId) : null,
        unitNumber: m.unit ? m.unit.number : null,
        houseId:
          m.houseId !== null ? this.hashidservice.encode(m.houseId) : null,
        houseName: m.house ? m.house.name : null,
        readOn: formattedDate,
        closingFor,
        currentReading: m.currentReading,
        id: m.id ? this.hashidservice.encode(m.id) : null,
        pricePerUnit: m.house ? m.house.water_bill : null,
      };
    });
  }

  async getUnit(unitId: number) {
    return prisma.meterReading.findMany({
      where: { unitId },
    });
  }

  update(id: number, updateMeterReadingDto: Prisma.MeterReadingUpdateInput) {
    if (typeof updateMeterReadingDto.readOn === 'string') {
      updateMeterReadingDto.readOn = new Date(updateMeterReadingDto.readOn);
    }
    
    return prisma.meterReading.update({
      where: { id },
      data: updateMeterReadingDto,
    });
  }

  async remove(id: number) {
    return prisma.meterReading.delete({
      where: { id },
    });
  }

  /**
   * Single source of truth for "which lease, which month, is this a reset."
   * Used by both the suggestion endpoint (so the form can show it before saving)
   * and createMany (so what's actually saved matches what was suggested); the
   * two must never independently re-implement this, or they can drift apart.
   */
  private async resolveBillingContext(
    unitId: number,
    readOn: Date,
    currentReading?: number,
  ): Promise<{
    lease: Awaited<ReturnType<typeof prisma.lease.findFirst>>;
    billingPeriod: Date | null;
    isMeterReset: boolean;
    status: 'suggested' | 'opening-reading' | 'no-lease-found';
  }> {
    const lease = await prisma.lease.findFirst({
      where: {
        unitId,
        startDate: { lte: readOn },
        OR: [{ terminationDate: null }, { terminationDate: { gte: readOn } }],
      },
      orderBy: { startDate: 'desc' },
    });

    if (!lease) {
      return { lease: null, billingPeriod: null, isMeterReset: false, status: 'no-lease-found' };
    }

    const isOpeningReading =
      readOn.toDateString() === lease.startDate.toDateString() &&
      currentReading !== undefined &&
      currentReading === lease.onEntryMeterReading;

    if (isOpeningReading) {
      return { lease, billingPeriod: null, isMeterReset: false, status: 'opening-reading' };
    }

    // Local, not UTC: ledger.util reads billingPeriod with local getters, so deriving it
    // in UTC puts the mid-month cutoff hours off and, west of Greenwich, the wrong month.
    const day = readOn.getDate();
    const billingPeriod =
      day <= 15
        ? new Date(readOn.getFullYear(), readOn.getMonth() - 1, 1)
        : new Date(readOn.getFullYear(), readOn.getMonth(), 1);

    let isMeterReset = false;
    if (currentReading !== undefined) {
      const previousClosing = await prisma.meterReading.findFirst({
        where: { leaseId: lease.id, billingPeriod: { not: null } },
        orderBy: { billingPeriod: 'desc' },
      });
      if (previousClosing && currentReading < previousClosing.currentReading) {
        isMeterReset = true;
      }
    }

    return { lease, billingPeriod, isMeterReset, status: 'suggested' };
  }

  async suggestPeriod(unitIdHash: string, readOnStr: string, currentReading?: string) {
    const unitId = this.hashidservice.decode(unitIdHash);
    const readOn = new Date(readOnStr);
    const reading = currentReading !== undefined ? Number(currentReading) : undefined;

    const { billingPeriod, status } = await this.resolveBillingContext(unitId, readOn, reading);
    return {
      status,
      billingPeriod: billingPeriod ? formatMonth(billingPeriod) : null,
    };
  }

  /**
   * Creates readings, attaching them to the lease/tenant active on that date.
   * The month a reading closes (`billingPeriod`) is required, except for an
   * opening reading. Sequential (not $transaction) because reset detection can
   * depend on readings created earlier in the same batch.
   */
  async createMany(readings: any[]) {
    for (const r of readings) {
      if (r.billingPeriod) continue;
      const { status } = await this.resolveBillingContext(
        this.hashidservice.decode(r.unitId),
        new Date(),
        Number(r.currentReading),
      );
      if (status !== 'opening-reading') {
        throw new BadRequestException('Pick the month ("For Month") for every reading.');
      }
    }

    const created: Awaited<ReturnType<typeof prisma.meterReading.create>>[] = [];

    for (const r of readings) {
      const unitId = this.hashidservice.decode(r.unitId);
      const houseId = this.hashidservice.decode(r.houseId);
      // Not sent by the form: the reading is logged "now," so the backend stamps
      // it, same value used both for the row and for resolving its billing period.
      const readOn = new Date();
      const currentReading = Number(r.currentReading);

      const resolved = await this.resolveBillingContext(unitId, readOn, currentReading);
      const lease = resolved.lease;
      const billingPeriod = r.billingPeriod ? parseMonth(r.billingPeriod) : null;
      const isMeterReset = r.isMeterReset ?? resolved.isMeterReset;

      const row = await prisma.$transaction(async (tx) => {
        // Locks the unit so a repeated submit waits here and then sees the first save.
        await tx.$queryRaw`SELECT 1 FROM "Unit" WHERE id = ${unitId} FOR UPDATE`;
        if (billingPeriod && (await tx.meterReading.findFirst({ where: { unitId, billingPeriod, currentReading } }))) {
          throw new ConflictException(`Reading ${currentReading} for that month is already saved.`);
        }
        return tx.meterReading.create({
          data: {
            currentReading,
            readOn,
            billingPeriod,
            isMeterReset,
            unit: { connect: { id: unitId } },
            house: { connect: { id: houseId } },
            ...(lease
              ? {
                  lease: { connect: { id: lease.id } },
                  tenant: { connect: { id: lease.tenantId } },
                }
              : {}),
          },
        });
      });
      created.push(row);
    }

    return created;
  }
}
