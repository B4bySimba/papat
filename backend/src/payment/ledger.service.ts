import { Injectable } from '@nestjs/common';
import prisma from 'lib/db';
import { computeLeaseLedger, endOfLocalDay, MonthRow } from './ledger.util';

/**
 * Loads every lease's ledger inputs in three queries instead of three per lease,
 * then runs the pure engine. Nothing is stored: each call reads current rows, so a
 * back-dated payment is reflected the moment it lands.
 */
@Injectable()
export class LedgerService {
  async ledgersFor(leaseIds: number[], includePastTenants = false): Promise<Map<number, MonthRow[]>> {
    const ledgers = new Map<number, MonthRow[]>();
    if (!leaseIds.length) return ledgers;

    const [leases, readings, payments] = await Promise.all([
      prisma.lease.findMany({ where: { id: { in: leaseIds } } }),
      prisma.meterReading.findMany({
        where: { leaseId: { in: leaseIds } },
        // id breaks ties: two readings closing the same period must order the same way twice.
        orderBy: [{ readOn: 'asc' }, { id: 'asc' }],
        select: { leaseId: true, readOn: true, currentReading: true, billingPeriod: true, isMeterReset: true },
      }),
      prisma.payment.findMany({
        where: { leaseId: { in: leaseIds } },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
        select: { leaseId: true, date: true, amount: true, paymentMethod: true, reference: true },
      }),
    ]);

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
    for (const lease of leases) {
      // Whole-day horizon: the rows stay valid until midnight rather than drifting by the hour.
      const asOf = lease.terminationDate ? new Date(lease.terminationDate) : today;
      const rowsUntil = includePastTenants && asOf < today ? today : asOf;
      ledgers.set(
        lease.id,
        computeLeaseLedger(lease, readingsBy.get(lease.id) ?? [], paymentsBy.get(lease.id) ?? [], asOf, rowsUntil),
      );
    }
    return ledgers;
  }

  async ledgerForCode(leaseCode: string): Promise<MonthRow[]> {
    const lease = await prisma.lease.findFirst({ where: { code: leaseCode }, select: { id: true } });
    if (!lease) throw new Error('Lease not found');
    return (await this.ledgersFor([lease.id])).get(lease.id) ?? [];
  }
}
