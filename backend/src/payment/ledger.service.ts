import { Injectable } from '@nestjs/common';
import prisma from 'lib/db';
import { Prisma } from 'generated/prisma/client';
import { forgetWritesAfterThis } from 'src/audit/capture';
import {
  computeLeaseLedger,
  endOfLocalDay,
  generateCharges,
  LeaseFieldsForLedger,
  MonthRow,
  moveOutBalance,
} from './ledger.util';

const ROLLBACK = Symbol('preview');

/** Runs `write` in one transaction. A preview rolls it back but still returns what `write` returned. */
export async function previewable<T>(preview: boolean, write: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let result!: T;
  const forgetPreview = forgetWritesAfterThis();
  try {
    return await prisma.$transaction(
      async (tx) => {
        result = await write(tx);
        if (preview) throw ROLLBACK;
        return result;
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    if (e === ROLLBACK) {
      forgetPreview();
      return result;
    }
    throw e;
  }
}

/**
 * Loads every lease's ledger inputs in three queries instead of three per lease,
 * then runs the pure engine. Nothing is stored: each call reads current rows, so a
 * back-dated payment is reflected the moment it lands. `db` can be a transaction,
 * which is how a preview sees a change before it is saved.
 */
@Injectable()
export class LedgerService {
  async ledgersFor(
    leaseIds: number[],
    includePastTenants = false,
    db: Prisma.TransactionClient = prisma,
  ): Promise<Map<number, MonthRow[]>> {
    const ledgers = new Map<number, MonthRow[]>();
    if (!leaseIds.length) return ledgers;

    const load = (ids: number[]) =>
      Promise.all([
        db.lease.findMany({
          where: { id: { in: ids } },
          include: {
            rates: { orderBy: { month: 'asc' } },
            movedFrom: { select: { unit: { select: { number: true } } } },
            movedTo: { select: { unit: { select: { number: true } } } },
          },
        }),
        db.meterReading.findMany({
          where: { leaseId: { in: ids } },
          // id breaks ties: two readings closing the same period must order the same way twice.
          orderBy: [{ readOn: 'asc' }, { id: 'asc' }],
          select: { leaseId: true, readOn: true, currentReading: true, billingPeriod: true, isMeterReset: true },
        }),
        db.payment.findMany({
          where: { leaseId: { in: ids } },
          orderBy: [{ date: 'asc' }, { id: 'asc' }],
          select: { leaseId: true, date: true, amount: true, paymentMethod: true, reference: true },
        }),
      ]);
    const [leases, readings, payments] = await load(leaseIds);

    // A moved tenant's carried balance comes from the lease they left, so load that one too.
    const loaded = new Set(leaseIds);
    for (;;) {
      const missing = leases
        .map((l) => l.movedFromLeaseId)
        .filter((id): id is number => id !== null && !loaded.has(id));
      if (!missing.length) break;
      missing.forEach((id) => loaded.add(id));
      const [l, r, p] = await load(missing);
      leases.push(...l);
      readings.push(...r);
      payments.push(...p);
    }

    const groupByLease = <T extends { leaseId: number | null }>(rows: T[]) => {
      const byLease = new Map<number, T[]>();
      for (const row of rows) {
        if (row.leaseId === null) continue;
        const at = byLease.get(row.leaseId);
        at ? at.push(row) : byLease.set(row.leaseId, [row]);
      }
      return byLease;
    };
    const readingsBy = groupByLease(readings);
    const paymentsBy = groupByLease(payments);

    const today = endOfLocalDay(new Date());
    // Whole-day horizon: the rows stay valid until midnight rather than drifting by the hour.
    const asOfFor = (lease: (typeof leases)[number]) => (lease.terminationDate ? new Date(lease.terminationDate) : today);
    const byId = new Map(leases.map((l) => [l.id, l]));
    const transfers = new Map<number, number>();

    const input = (lease: (typeof leases)[number]): LeaseFieldsForLedger => {
      const from = lease.movedFromLeaseId === null ? undefined : byId.get(lease.movedFromLeaseId);
      let depositHeld = lease.deposit ?? 0;
      for (let id = lease.movedFromLeaseId; id !== null; id = byId.get(id)?.movedFromLeaseId ?? null) {
        depositHeld += byId.get(id)?.deposit ?? 0;
      }
      return {
        ...lease,
        depositHeld,
        movedOut: !!lease.movedTo,
        transferIn: from?.terminationDate ? transferOut(from) : undefined,
        transferNote: lease.movedTo
          ? `Moved to unit ${lease.movedTo.unit.number}`
          : lease.movedFrom
            ? `Brought from unit ${lease.movedFrom.unit.number}`
            : undefined,
      };
    };
    const transferOut = (lease: (typeof leases)[number]) => {
      let owed = transfers.get(lease.id);
      if (owed === undefined) {
        const charges = generateCharges(input(lease), readingsBy.get(lease.id) ?? [], asOfFor(lease));
        owed = moveOutBalance(charges, paymentsBy.get(lease.id) ?? [], lease.terminationDate!);
        transfers.set(lease.id, owed);
      }
      return owed;
    };

    const wanted = new Set(leaseIds);
    for (const lease of leases) {
      if (!wanted.has(lease.id)) continue;
      const asOf = asOfFor(lease);
      const rowsUntil = includePastTenants && asOf < today ? today : asOf;
      ledgers.set(
        lease.id,
        computeLeaseLedger(input(lease), readingsBy.get(lease.id) ?? [], paymentsBy.get(lease.id) ?? [], asOf, rowsUntil),
      );
    }
    return ledgers;
  }

  /**
   * Changes whenever a row `ledgersFor` reads changes: any lease, rate change, unit, reading or payment.
   * Read in the same transaction as the ledgers, it names exactly the rows they were built from.
   * A new table feeding the ledgers must be added here too.
   */
  async inputsFingerprint(db: Prisma.TransactionClient = prisma): Promise<string> {
    const [{ fingerprint }] = await db.$queryRaw<{ fingerprint: string }[]>`
      select concat_ws('#',
        (select count(*) || ':' || coalesce(sum(hashtextextended(t::text, 0)), 0) from "Lease" t),
        (select count(*) || ':' || coalesce(sum(hashtextextended(t::text, 0)), 0) from "RateChange" t),
        (select count(*) || ':' || coalesce(sum(hashtextextended(t::text, 0)), 0) from "Unit" t),
        (select count(*) || ':' || coalesce(sum(hashtextextended(t::text, 0)), 0) from "MeterReading" t),
        (select count(*) || ':' || coalesce(sum(hashtextextended(t::text, 0)), 0) from "payment" t)
      ) as fingerprint`;
    return fingerprint;
  }

  async ledgerForCode(leaseCode: string): Promise<MonthRow[]> {
    const lease = await prisma.lease.findFirst({ where: { code: leaseCode }, select: { id: true } });
    if (!lease) throw new Error('Lease not found');
    // A past tenant's own statement runs to today, so what they pay after leaving counts.
    return (await this.ledgersFor([lease.id], true)).get(lease.id) ?? [];
  }
}
