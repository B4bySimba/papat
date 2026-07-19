import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';

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
   * and createMany (so what's actually saved matches what was suggested) — the
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

    const day = readOn.getUTCDate();
    const billingPeriod =
      day <= 15
        ? new Date(Date.UTC(readOn.getUTCFullYear(), readOn.getUTCMonth() - 1, 1))
        : new Date(Date.UTC(readOn.getUTCFullYear(), readOn.getUTCMonth(), 1));

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
      billingPeriod: billingPeriod ? billingPeriod.toISOString().slice(0, 7) : null, // "YYYY-MM"
    };
  }

  /**
   * Creates readings, attaching them to the lease/tenant active on that date.
   * If the caller supplies an explicit `billingPeriod`/`isMeterReset` (from the
   * form, after the user confirmed or overrode the suggestion), that's used as-is.
   * Otherwise falls back to auto-resolving via the same shared logic the
   * suggestion endpoint uses. Sequential (not $transaction) because reset
   * detection can depend on readings created earlier in the same batch.
   */
  async createMany(readings: any[]) {
    const created: Awaited<ReturnType<typeof prisma.meterReading.create>>[] = [];

    for (const r of readings) {
      const unitId = this.hashidservice.decode(r.unitId);
      const houseId = this.hashidservice.decode(r.houseId);
      // Not sent by the form — the reading is logged "now," so the backend stamps
      // it, same value used both for the row and for resolving its billing period.
      const readOn = new Date();
      const currentReading = Number(r.currentReading);

      let lease: Awaited<ReturnType<typeof prisma.lease.findFirst>>;
      let billingPeriod: Date | null;
      let isMeterReset: boolean;

      if (r.billingPeriod !== undefined || r.isMeterReset !== undefined) {
        // Explicit values from the form — still need `lease` to connect tenant/lease relations.
        const resolved = await this.resolveBillingContext(unitId, readOn, currentReading);
        lease = resolved.lease;
        billingPeriod = r.billingPeriod ? new Date(`${r.billingPeriod}-01T00:00:00.000Z`) : null;
        isMeterReset = r.isMeterReset ?? resolved.isMeterReset;
      } else {
        const resolved = await this.resolveBillingContext(unitId, readOn, currentReading);
        lease = resolved.lease;
        billingPeriod = resolved.billingPeriod;
        isMeterReset = resolved.isMeterReset;
      }

      const row = await prisma.meterReading.create({
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
      created.push(row);
    }

    return created;
  }
}
