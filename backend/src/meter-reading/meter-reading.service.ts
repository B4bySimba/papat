import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import prisma from 'lib/db';
import { formatMonth, parseMonth } from 'src/payment/ledger.util';
import {
  ListQuery,
  containsPattern,
  idEquals,
  limitOffset,
  orderBy,
  whereAll,
} from 'src/common/list-query';

type MeterReadingListRow = {
  id: number;
  houseId: number | null;
  unitId: number;
  unitNumber: string;
  houseName: string | null;
  readOnText: string;
  closingFor: string;
  currentReading: number;
  pricePerUnit: number | null;
};

const METER_READING_SORT: Record<string, Prisma.Sql> = {
  houseName: Prisma.sql`lower("houseName")`,
  unitNumber: Prisma.sql`lower("unitNumber")`,
  closingFor: Prisma.sql`"billingPeriod"`,
  currentReading: Prisma.sql`"currentReading"`,
  pricePerUnit: Prisma.sql`"pricePerUnit"`,
};

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

  /** With `page`: that page as `{ rows, total }`. Without: every matching row (CSV export). Newest reading first. */
  async getAll(q: ListQuery = {}) {
    const conditions: Prisma.Sql[] = [];
    if (q.search) {
      const s = containsPattern(q.search);
      conditions.push(Prisma.sql`("houseName" ILIKE ${s} OR "unitNumber" ILIKE ${s} OR "readOnText" ILIKE ${s}
        OR "closingFor" ILIKE ${s} OR "currentReading"::text ILIKE ${s} OR "pricePerUnit"::text ILIKE ${s})`);
    }
    if (q.houseId)
      conditions.push(
        idEquals(Prisma.sql`"houseId"`, this.hashidservice.decode(q.houseId)),
      );
    if (q.unitId)
      conditions.push(
        idEquals(Prisma.sql`"unitId"`, this.hashidservice.decode(q.unitId)),
      );

    // Dates are stored as UTC and shown in Nairobi time (main.ts refuses any other zone).
    const matching = Prisma.sql`SELECT * FROM (
      SELECT m.id, m."houseId", m."unitId", m."readOn", m."billingPeriod", m."currentReading",
        u.number AS "unitNumber", h.name AS "houseName", h.water_bill AS "pricePerUnit",
        to_char(m."readOn" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi', 'DD/MM/FMYYYY') AS "readOnText",
        CASE
          WHEN m."billingPeriod" IS NOT NULL
            THEN to_char(m."billingPeriod" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi', 'FMMonth FMYYYY')
          WHEN (m."readOn" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date
            = (l."startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date
            THEN 'Opening reading'
          ELSE 'Unassigned'
        END AS "closingFor"
      FROM "MeterReading" m
      JOIN "Unit" u ON u.id = m."unitId"
      LEFT JOIN "House" h ON h.id = m."houseId"
      LEFT JOIN "Lease" l ON l.id = m."leaseId"
    ) r ${whereAll(conditions)}`;
    const count = Prisma.sql`SELECT count(*)::int AS total FROM (${matching}) c`;

    const [readings, counted] = await Promise.all([
      prisma.$queryRaw<MeterReadingListRow[]>`${matching}
        ORDER BY ${orderBy(METER_READING_SORT, q, Prisma.sql`"readOn" DESC, id DESC`)} ${q.page ? limitOffset(q) : Prisma.empty}`,
      q.page ? prisma.$queryRaw<{ total: number }[]>(count) : null,
    ]);

    const rows = readings.map((m) => ({
      unitId: this.hashidservice.encode(m.unitId),
      unitNumber: m.unitNumber,
      houseId: m.houseId !== null ? this.hashidservice.encode(m.houseId) : null,
      houseName: m.houseName,
      readOn: m.readOnText,
      closingFor: m.closingFor,
      currentReading: m.currentReading,
      id: this.hashidservice.encode(m.id),
      pricePerUnit: m.pricePerUnit,
    }));
    return counted ? { rows, total: counted[0].total } : rows;
  }

  async getAllFilters() {
    const [houses, units] = await Promise.all([
      prisma.house.findMany({
        where: { MeterReading: { some: {} } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.unit.findMany({
        where: { meterReading: { some: {} } },
        select: { id: true, number: true },
        orderBy: { number: 'asc' },
      }),
    ]);
    return {
      houseId: houses.map((h) => ({
        value: this.hashidservice.encode(h.id),
        label: h.name,
      })),
      unitId: units.map((u) => ({
        value: this.hashidservice.encode(u.id),
        label: u.number,
      })),
    };
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
