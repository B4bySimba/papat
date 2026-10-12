import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import prisma from 'lib/db';
import { Prisma } from 'generated/prisma/client';
import { HashidService } from 'src/common/hashid/hashid.service';
import { LedgerService, previewable } from './ledger.service';
import {
  changeFor,
  formatMonth,
  houseBase,
  ledgerImpact,
  parseMonth,
  RATE_FIELDS,
  RateChange,
  RateField,
  rateFields,
  termsAt,
} from './ledger.util';

export interface LeaseChange {
  month: string;
  fields?: Record<string, unknown>;
  remove?: boolean;
  unitDeposit?: number | null;
  note?: string | null;
  preview?: boolean;
}

export interface HouseChange {
  month: string;
  fields?: Record<string, unknown>;
  rents?: Record<string, number>;
  skip?: string[];
  note?: string | null;
  preview?: boolean;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const byMonth = { orderBy: { month: 'asc' } } as const;
/** What a property-wide change sets for everyone; rent is per unit, the additional charge belongs to the unit. */
const SHARED = RATE_FIELDS.filter((f) => !['rentRate', 'rentDue', 'additional', 'additionalCharges'].includes(f));

const shared = (terms: object) => Object.fromEntries(SHARED.map((f) => [f, (terms as any)[f] ?? null]));
const changeView = (r: RateChange & { note: string | null }) => ({
  month: r.month,
  note: r.note,
  fields: Object.fromEntries(RATE_FIELDS.filter((f) => r[f] != null).map((f) => [f, r[f]])),
});

function checkMonth(month: unknown) {
  if (typeof month !== 'string' || !MONTH.test(month)) throw new BadRequestException('Pick a month.');
  return month;
}

function checkAmount(value: unknown, what: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${what} must be a number of 0 or more.`);
  }
  return value;
}

/** Keeps only term fields, each checked: labels are text, amounts are numbers of 0 or more, the due day at most 31. */
function checkFields(fields: Record<string, unknown> = {}, allowed: readonly RateField[] = RATE_FIELDS) {
  const out: Partial<Record<RateField, any>> = {};
  for (const f of allowed) {
    if (!(f in fields)) continue;
    const value = fields[f];
    if (f === 'additional' || (f.startsWith('added_field_') && !f.endsWith('_price'))) {
      if (value !== null && typeof value !== 'string') throw new BadRequestException(`${f} must be text.`);
      out[f] = typeof value === 'string' ? value.trim() || null : null;
    } else {
      out[f] = checkAmount(value, f);
      if (f === 'rentDue' && (!Number.isInteger(value) || out[f] > 31)) {
        throw new BadRequestException('The due day must be 1 to 31.');
      }
    }
  }
  return out;
}

@Injectable()
export class RateChangeService {
  constructor(
    private readonly ledger: LedgerService,
    private readonly hashids: HashidService,
  ) {}

  private async lease(db: Prisma.TransactionClient, id: number) {
    const lease = await db.lease.findUnique({ where: { id }, include: { rates: byMonth } });
    if (!lease) throw new NotFoundException('Lease not found.');
    return lease;
  }

  private async house(db: Prisma.TransactionClient, id: number) {
    const house = await db.house.findUnique({
      where: { id },
      include: {
        rates: byMonth,
        unit: {
          include: {
            lease: { where: { status: 'ACTIVE' }, include: { rates: byMonth, tenant: { select: { name: true } } } },
          },
        },
      },
    });
    if (!house) throw new NotFoundException('Property not found.');
    return house;
  }

  /** For the change form: the months that can change, the terms in force in `month`, and the saved changes. */
  async leaseTerms(leaseId: number, month?: string) {
    const lease = await this.lease(prisma, leaseId);
    const at = month && MONTH.test(month) ? month : formatMonth(new Date());
    return {
      startMonth: formatMonth(lease.startDate),
      endMonth: lease.terminationDate ? formatMonth(lease.terminationDate) : null,
      terms: rateFields(termsAt(lease, parseMonth(at))),
      changes: lease.rates.map(changeView),
    };
  }

  /** Saves, or previews, a change from `month` on. A change in the move-in month corrects the lease itself. */
  async changeLease(leaseId: number, body: LeaseChange) {
    const month = checkMonth(body.month);
    const fields = checkFields(body.fields);
    const unitDeposit = body.unitDeposit == null ? undefined : checkAmount(body.unitDeposit, 'Deposit');
    const note = body.note?.trim() || null;

    return previewable(!!body.preview, async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Lease" WHERE id = ${leaseId} FOR UPDATE`;
      const lease = await this.lease(tx, leaseId);
      const startMonth = formatMonth(lease.startDate);
      if (month < startMonth || (lease.terminationDate && month > formatMonth(lease.terminationDate))) {
        throw new BadRequestException('Pick a month inside the tenancy.');
      }
      const before = (await this.ledger.ledgersFor([leaseId], false, tx)).get(leaseId) ?? [];

      if (month === startMonth) {
        if (body.remove) throw new BadRequestException('The move-in terms can be corrected but not removed.');
        await tx.lease.update({ where: { id: leaseId }, data: fields });
      } else {
        const row = body.remove ? null : changeFor(lease, month, fields);
        if (row) {
          await tx.rateChange.upsert({
            where: { leaseId_month: { leaseId, month } },
            create: { leaseId, month, ...row, note },
            update: { ...row, note },
          });
        } else {
          await tx.rateChange.deleteMany({ where: { leaseId, month } });
        }
      }

      if (lease.status === 'ACTIVE') {
        const latest = termsAt(await this.lease(tx, leaseId), parseMonth('9999-12'));
        await tx.unit.update({ where: { id: lease.unitId }, data: { rentRate: latest.rentRate, deposit: unitDeposit } });
      }
      const after = (await this.ledger.ledgersFor([leaseId], false, tx)).get(leaseId) ?? [];
      return ledgerImpact(before, after);
    });
  }

  /** For the property form: the shared charges in force in `month`, and each unit's rent and charges then. */
  async houseTerms(houseId: number, month?: string) {
    const at = parseMonth(month && MONTH.test(month) ? month : formatMonth(new Date()));
    const house = await this.house(prisma, houseId);
    return {
      terms: shared(termsAt(houseBase(house), at)),
      units: house.unit
        .map((unit) => {
          const lease = unit.lease[0];
          const terms = lease ? termsAt(lease, at) : null;
          return {
            unitId: this.hashids.encode(unit.id),
            number: unit.number,
            tenant: lease?.tenant.name ?? null,
            rentRate: terms ? terms.rentRate : unit.rentRate,
            terms: terms ? shared(terms) : null,
          };
        })
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    };
  }

  /** Saves, or previews, a property-wide change: the property's own schedule, every ticked tenant, and unit rents. */
  async changeHouse(houseId: number, body: HouseChange) {
    const month = checkMonth(body.month);
    const fields = checkFields(body.fields, SHARED);
    const rents = new Map(
      Object.entries(body.rents ?? {}).map(([unit, rent]) => [this.hashids.decode(unit), checkAmount(rent, 'Rent')]),
    );
    const skip = new Set((body.skip ?? []).map((unit) => this.hashids.decode(unit)));
    const note = body.note?.trim() || null;

    return previewable(!!body.preview, async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "House" WHERE id = ${houseId} FOR UPDATE`;
      const house = await this.house(tx, houseId);
      const leases = house.unit.flatMap((unit) => unit.lease).filter((lease) => !skip.has(lease.unitId));
      const before = await this.ledger.ledgersFor(leases.map((l) => l.id), false, tx);

      const saved = house.rates.find((r) => r.month === month);
      const own = changeFor(houseBase(house), month, fields);
      if (own) {
        await tx.rateChange.upsert({
          where: { houseId_month: { houseId, month } },
          create: { houseId, month, ...own, note },
          update: { ...own, note },
        });
      } else {
        await tx.rateChange.deleteMany({ where: { houseId, month } });
      }
      // Tenants only get what this change sets or undoes, so a water change leaves a garbage deal alone.
      const touched = Object.fromEntries(
        Object.entries(fields).filter(([f]) => own?.[f as RateField] != null || saved?.[f as RateField] != null),
      );

      // Tenants who moved in after `month` get it from their move-in month, which corrects the lease itself.
      const rows: Prisma.RateChangeCreateManyInput[] = [];
      const changed: number[] = [];
      for (const lease of leases) {
        const rent = rents.get(lease.unitId);
        const terms = rent === undefined ? touched : { ...touched, rentRate: rent };
        if (month <= formatMonth(lease.startDate)) {
          await tx.lease.update({ where: { id: lease.id }, data: terms });
          continue;
        }
        const row = changeFor(lease, month, terms);
        if (row) rows.push({ leaseId: lease.id, month, ...row, note });
        changed.push(lease.id);
      }
      await tx.rateChange.deleteMany({ where: { leaseId: { in: changed }, month } });
      await tx.rateChange.createMany({ data: rows });

      const unitsByRent = new Map<number, number[]>();
      for (const unit of house.unit) {
        const rent = rents.get(unit.id);
        if (rent === undefined || rent === unit.rentRate || skip.has(unit.id)) continue;
        unitsByRent.set(rent, [...(unitsByRent.get(rent) ?? []), unit.id]);
      }
      for (const [rentRate, ids] of unitsByRent) {
        await tx.unit.updateMany({ where: { id: { in: ids } }, data: { rentRate } });
      }

      const after = await this.ledger.ledgersFor(leases.map((l) => l.id), false, tx);
      const unitNumber = new Map(house.unit.map((unit) => [unit.id, unit.number]));
      return leases
        .map((lease) => ({
          unit: unitNumber.get(lease.unitId)!,
          tenant: lease.tenant.name,
          ...ledgerImpact(before.get(lease.id) ?? [], after.get(lease.id) ?? []),
        }))
        .sort((a, b) => a.unit.localeCompare(b.unit, undefined, { numeric: true }));
    });
  }
}
