/**
 * Read-only. Prints every money figure the V2 endpoints and the invoice builder
 * serve, as stable JSON, so a change that must not move a number can be checked
 * with diff. TODAY pins the clock.
 *
 * Run from backend/:  TZ=Africa/Nairobi TODAY=2026-10-04 DATABASE_URL=... npx tsx scripts/ledger-golden.ts > before.json
 */
import prisma from '../lib/db';
import { LedgerService } from '../src/payment/ledger.service';
import { PaymentService } from '../src/payment/payment.service';
import { MonthRow, MONTH_NAMES } from '../src/payment/ledger.util';
import { buildInvoiceItems } from '../../frontend/src/lib/invoice-items';

const RealDate = Date;
const pinned = new RealDate(`${process.env.TODAY ?? '2026-10-04'}T12:00:00`).getTime();
class PinnedDate extends RealDate {
  constructor(...args: any[]) {
    if (args.length) super(...(args as [any]));
    else super(pinned);
  }
  static now() {
    return pinned;
  }
}
globalThis.Date = PinnedDate as DateConstructor;

const toSummary = (rows: MonthRow[]) => {
  const summary: Record<number, Record<string, any>> = {};
  for (const { year, month, ...data } of rows) (summary[year] ??= {})[month] = data;
  return { summary };
};

const invoices = (rows: MonthRow[]) => {
  const data = toSummary(rows);
  return rows.map((r) => {
    const m = MONTH_NAMES.indexOf(r.month) + 1;
    return {
      month: `${r.year}-${m}`,
      comprehensive: buildInvoiceItems(data, r.year, m, 'Comprehensive'),
      water: buildInvoiceItems(data, r.year, m, 'utilities', 'water'),
    };
  });
};

async function main() {
  const ledger = new LedgerService();
  const payments = new PaymentService(undefined as any, ledger);

  const leaseIds = (await prisma.lease.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map((l) => l.id);
  const current = await ledger.ledgersFor(leaseIds);
  const past = await ledger.ledgersFor(leaseIds, true);
  const leases: Record<number, any> = {};
  for (const id of leaseIds) {
    leases[id] = {
      rows: current.get(id),
      rowsPast: past.get(id),
      invoices: invoices(current.get(id) ?? []),
    };
  }

  const houses: Record<number, any> = {};
  for (const { id } of await prisma.house.findMany({ select: { id: true }, orderBy: { id: 'asc' } })) {
    const out: Record<string, any> = {};
    for (const includePast of [false, true]) {
      const key = includePast ? 'past' : 'current';
      const summary = await payments.getHouseLevelSummaryV2(id, includePast);
      const monthly: Record<string, any> = {};
      const yearly: Record<string, any> = {};
      for (const year of Object.keys(summary.summary)) {
        yearly[year] = await payments.yearlyReportV2(id, year, undefined, undefined, includePast);
        for (const month of Object.keys(summary.summary[year])) {
          monthly[`${year}-${month}`] = await payments.monthlyReportV2(id, MONTH_NAMES.indexOf(month) + 1, +year, includePast);
        }
      }
      out[key] = { summary, monthly, yearly };
    }
    houses[id] = out;
  }

  const manager = {
    current: await payments.getManagerLevelSummaryV2(false),
    past: await payments.getManagerLevelSummaryV2(true),
  };

  const round = (_: string, v: any) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
  process.stdout.write(JSON.stringify({ leases, houses, manager }, round, 1) + '\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
