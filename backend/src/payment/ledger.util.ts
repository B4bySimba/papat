export interface ChargeEvent {
  date: Date;
  label: string;
  amount: number;
  meta?: Record<string, any>;
}

export interface LeaseFieldsForLedger {
  startDate: Date;
  rentDue?: number | null;
  rentRate: number;
  waterRate: number;
  serviceCharge?: number | null;
  garbageFee?: number | null;
  additional?: string | null;
  additionalCharges?: number | null;
  deposit?: number | null;
  arrearsbf?: number | null;
  onEntryMeterReading: number;
  added_field_1?: string | null;
  added_field_1_price?: number | null;
  added_field_2?: string | null;
  added_field_2_price?: number | null;
  added_field_3?: string | null;
  added_field_3_price?: number | null;
  added_field_4?: string | null;
  added_field_4_price?: number | null;
  added_field_5?: string | null;
  added_field_5_price?: number | null;
  added_field_6?: string | null;
  added_field_6_price?: number | null;
  added_field_7?: string | null;
  added_field_7_price?: number | null;
}

export interface ReadingPoint {
  readOn: Date;
  currentReading: number;
  billingPeriod: Date | null;
  isMeterReset: boolean;
}

export interface LedgerPoint {
  date: Date;
  cumExpected: number;
  cumCollected: number;
  balance: number;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * The billing date of a month: day `rentDue`, clamped into the month.
 * rentDue missing/0/invalid falls back to day 1 (the pre-rentDue behavior).
 * See docs/BILLING_MODEL.md §2.
 */
export function billingDateFor(
  year: number,
  month: number,
  rentDue: number | null | undefined,
): Date {
  const raw = Math.floor(rentDue ?? 1);
  const day = raw >= 1 ? raw : 1;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * Pure function, no DB access. Full semantics: docs/BILLING_MODEL.md.
 *
 * Water/service-charge attribution is keyed entirely off `billingPeriod` — the
 * explicit, human-assigned "this reading closes month X" field — not `readOn`
 * (when it was logged) or reading order. This is what actually fixes the
 * misattribution bugs found in V1: there is no date-inference left to get wrong.
 * Readings with `billingPeriod: null` (opening/baseline readings, or anything not
 * yet classified) are excluded from closing a period; the opening reading is still
 * used as the starting baseline for the first real interval.
 *
 * Every month's rent + recurring extras post on that month's billing date
 * (`rentDue`, clamped), and only once that date has been reached (`<= asOf`):
 * until the due day, the month's rent is not yet owed, and a lease terminated
 * before it is never billed it. The first month's rent can't predate the
 * tenancy (`max(startDate, billingDate)`). Water posts on the billing date of
 * the month its `billingPeriod` names, without the asOf gate — measured
 * consumption is always owed.
 */
export function generateCharges(
  lease: LeaseFieldsForLedger,
  readings: ReadingPoint[],
  asOf: Date,
): ChargeEvent[] {
  const events: ChargeEvent[] = [];

  if (lease.arrearsbf) {
    events.push({ date: lease.startDate, label: 'arrearsbf', amount: lease.arrearsbf });
  }
  if (lease.deposit) {
    events.push({ date: lease.startDate, label: 'deposit', amount: lease.deposit });
  }

  let m = startOfMonth(lease.startDate);
  let isFirst = true;
  while (m <= asOf) {
    const due = billingDateFor(m.getFullYear(), m.getMonth(), lease.rentDue);
    const billOn = isFirst && lease.startDate > due ? lease.startDate : due;
    if (billOn <= asOf) {
      events.push({ date: billOn, label: 'rent', amount: lease.rentRate });
      if (!isFirst) {
        if (lease.garbageFee) {
          events.push({ date: billOn, label: 'garbageFee', amount: lease.garbageFee });
        }
        if (lease.additional && lease.additionalCharges) {
          events.push({ date: billOn, label: lease.additional, amount: lease.additionalCharges });
        }
        for (let i = 1; i <= 7; i++) {
          const price = (lease as any)[`added_field_${i}_price`];
          const label = (lease as any)[`added_field_${i}`];
          if (price && label) events.push({ date: billOn, label, amount: price });
        }
      }
    }
    isFirst = false;
    m = addMonths(m, 1);
  }

  const closingReadings = readings
    .filter((r) => r.billingPeriod !== null)
    .sort((a, b) => a.billingPeriod!.getTime() - b.billingPeriod!.getTime());

  const startYear = lease.startDate.getFullYear();
  const startMonth = lease.startDate.getMonth();

  let prevReading = lease.onEntryMeterReading;
  for (const r of closingReadings) {
    // A meter reset means the physical meter changed — there's no meaningful "usage"
    // across the transition, so don't bill it; this reading just becomes the new baseline.
    if (r.isMeterReset) {
      prevReading = r.currentReading;
      continue;
    }

    const bp = r.billingPeriod!;
    const afterFirstMonth =
      bp.getFullYear() > startYear ||
      (bp.getFullYear() === startYear && bp.getMonth() > startMonth);
    if (afterFirstMonth) {
      const usage = Math.max(0, r.currentReading - prevReading);
      const serviceChargeAmt = usage > 0 ? (lease.serviceCharge ?? 0) : 0;
      events.push({
        date: billingDateFor(bp.getFullYear(), bp.getMonth(), lease.rentDue),
        label: 'water',
        amount: usage * lease.waterRate + serviceChargeAmt,
        meta: {
          usage,
          waterCharge: usage * lease.waterRate,
          serviceCharge: serviceChargeAmt,
          previousReading: prevReading,
          currentReading: r.currentReading,
        },
      });
    }
    prevReading = r.currentReading;
  }

  return events;
}

/**
 * Pure. Merge charges + payments into one cumulative timeline. Single sort, single pass.
 * Charges are enqueued before payments so the stable sort settles a same-timestamp
 * payment against that day's charge instead of preceding it.
 */
export function buildLedger(
  charges: ChargeEvent[],
  payments: { date: Date; amount: number }[],
): LedgerPoint[] {
  const events = [
    ...charges.map((c) => ({ date: c.date, expected: c.amount, collected: 0 })),
    ...payments.map((p) => ({ date: p.date, expected: 0, collected: p.amount })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumExpected = 0;
  let cumCollected = 0;
  return events.map((e) => {
    cumExpected += e.expected;
    cumCollected += e.collected;
    return { date: e.date, cumExpected, cumCollected, balance: cumExpected - cumCollected };
  });
}

const MONTH_ORDER = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Rebuild each year's month map in calendar order. Summary objects rely on
 * string-key insertion order for display, and merging multiple leases inserts
 * months in encounter order — a lease starting in August would otherwise put
 * Aug–Dec before Jan–Jun in the charts.
 */
export function sortSummaryMonths<T>(
  summary: Record<number, Record<string, T>>,
): Record<number, Record<string, T>> {
  const ordered: Record<number, Record<string, T>> = {};
  for (const year of Object.keys(summary)) {
    const months = summary[year];
    ordered[year] = {};
    for (const month of MONTH_ORDER) {
      if (months[month] !== undefined) ordered[year][month] = months[month];
    }
  }
  return ordered;
}

export { startOfMonth, addMonths, endOfMonth };
