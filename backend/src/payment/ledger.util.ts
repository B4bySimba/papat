export interface ChargeEvent {
  date: Date;
  label: string;
  amount: number;
  meta?: Record<string, any>;
}

export interface LeaseFieldsForLedger {
  startDate: Date;
  terminationDate?: Date | null;
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
  rates?: RateChange[];
  movedOut?: boolean;
  transferIn?: number;
  transferNote?: string;
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
/** "YYYY-MM" <-> local month start. The engine reads dates locally, so writers must too. */
export function formatMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function parseMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1);
}
/** Last instant of `d`'s local day: keeps a lease's rows valid for the whole day. */
export function endOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
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

/** The monthly terms a change can set. Deposit, arrears b/f and the start date are one-offs. */
export const RATE_FIELDS = [
  'rentRate', 'rentDue', 'waterRate', 'serviceCharge', 'garbageFee', 'additional', 'additionalCharges',
  'added_field_1', 'added_field_1_price', 'added_field_2', 'added_field_2_price',
  'added_field_3', 'added_field_3_price', 'added_field_4', 'added_field_4_price',
  'added_field_5', 'added_field_5_price', 'added_field_6', 'added_field_6_price',
  'added_field_7', 'added_field_7_price',
] as const;
export type RateField = (typeof RATE_FIELDS)[number];

/** From `month` ("YYYY-MM") on, each non-null field replaces the lease's value until a later change. */
export type RateChange = { month: string } & { [F in RateField]?: LeaseFieldsForLedger[F] | null };

/** The terms in force in `d`'s month: the move-in terms with every change up to that month applied. */
export function termsAt<T extends { rates?: RateChange[] }>(lease: T, d: Date): T {
  const ym = formatMonth(d);
  let terms = lease;
  for (const r of lease.rates ?? []) {
    if (r.month > ym) break;
    terms = { ...terms };
    for (const f of RATE_FIELDS) if (r[f] != null) (terms as any)[f] = r[f];
  }
  return terms;
}

/** Just the term fields of a lease, change or property, nulls included. */
export function rateFields(source: object): Record<RateField, any> {
  return Object.fromEntries(RATE_FIELDS.map((f) => [f, (source as any)[f] ?? null])) as Record<RateField, any>;
}

/**
 * The change to store for `month` so that `fields` apply from then on: only what differs from
 * the terms in force just before it, merged into any change already saved for that month.
 * Null when nothing is left to store.
 */
export function changeFor(base: { rates?: RateChange[] }, month: string, fields: Partial<Record<RateField, any>>) {
  const rates = base.rates ?? [];
  const before = termsAt({ ...base, rates: rates.filter((r) => r.month !== month) }, parseMonth(month));
  const same = (a: any, b: any) => a === b || (!a && !b);
  const row = rateFields(rates.find((r) => r.month === month) ?? {});
  for (const f of RATE_FIELDS) {
    if (f in fields) row[f] = same(fields[f], (before as any)[f]) ? null : fields[f];
  }
  return RATE_FIELDS.some((f) => row[f] != null) ? row : null;
}

/** A property's default charges under the lease field names, with its scheduled changes. */
export function houseBase(house: Record<string, any>) {
  const base: Record<string, any> & { rates: RateChange[] } = {
    waterRate: house.water_bill ?? 0,
    serviceCharge: house.serviceCharge ?? 0,
    garbageFee: house.garbage_collection ?? 0,
    rates: house.rates ?? [],
  };
  for (let i = 1; i <= 7; i++) {
    base[`added_field_${i}`] = house[`added_field_${i}`] ?? null;
    base[`added_field_${i}_price`] = house[`added_field_${i}_price`] ?? 0;
  }
  return base;
}

/**
 * Pure function, no DB access. Full semantics: docs/BILLING_MODEL.md.
 *
 * Water/service-charge attribution is keyed entirely off `billingPeriod` (the
 * explicit, human-assigned "this reading closes month X" field), not `readOn`
 * (when it was logged) or reading order. This is what actually fixes the
 * misattribution bugs found in V1: there is no date-inference left to get wrong.
 * Readings with `billingPeriod: null` (opening/baseline readings, or anything not
 * yet classified) are excluded from closing a period; the opening reading is still
 * used as the starting baseline for the first real interval.
 *
 * Every month's rent + recurring extras post on the 1st (the start date in the
 * first month) once that day is reached (`<= asOf`). A tenant who moves out
 * before the month's due date (`rentDue`, clamped; never before the start date)
 * is not charged that month. Water measured for month M can only be read once M
 * is over, so it posts with M+1's charges on the 1st, or on the move-out date
 * when the tenant leaves before that.
 *
 * Each month uses the terms in force that month (`termsAt`); water uses the terms
 * of the month it is billed. A tenant who moved units is billed the move month on
 * the new unit only, and the new unit bills extras from its first month.
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
  if (lease.transferIn) {
    events.push({ date: lease.startDate, label: 'transfer', amount: lease.transferIn });
  }

  let m = startOfMonth(lease.startDate);
  let isFirst = true;
  while (m <= asOf) {
    const t = termsAt(lease, m);
    const due = billingDateFor(m.getFullYear(), m.getMonth(), t.rentDue);
    const dueOn = isFirst && lease.startDate > due ? lease.startDate : due;
    const billOn = isFirst ? lease.startDate : m;
    const leftBeforeDue =
      !!lease.terminationDate &&
      (lease.terminationDate < dueOn || (!!lease.movedOut && monthIndex(lease.terminationDate) === monthIndex(m)));
    if (billOn <= asOf && !leftBeforeDue) {
      events.push({ date: billOn, label: 'rent', amount: t.rentRate });
      if (!isFirst || lease.transferIn !== undefined) {
        if (t.garbageFee) {
          events.push({ date: billOn, label: 'garbageFee', amount: t.garbageFee });
        }
        if (t.additional && t.additionalCharges) {
          events.push({ date: billOn, label: t.additional, amount: t.additionalCharges });
        }
        for (let i = 1; i <= 7; i++) {
          const price = (t as any)[`added_field_${i}_price`];
          const label = (t as any)[`added_field_${i}`];
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
    // A meter reset means the physical meter changed: there's no meaningful "usage"
    // across the transition, so don't bill it; this reading just becomes the new baseline.
    if (r.isMeterReset) {
      prevReading = r.currentReading;
      continue;
    }

    const bp = r.billingPeriod!;
    const duringTenancy =
      bp.getFullYear() > startYear ||
      (bp.getFullYear() === startYear && bp.getMonth() >= startMonth);
    const nextMonth = new Date(bp.getFullYear(), bp.getMonth() + 1, 1);
    const billOn = lease.terminationDate && lease.terminationDate < nextMonth ? lease.terminationDate : nextMonth;
    if (duringTenancy && billOn <= asOf) {
      const t = termsAt(lease, billOn);
      const usage = Math.max(0, r.currentReading - prevReading);
      const serviceChargeAmt = usage > 0 ? (t.serviceCharge ?? 0) : 0;
      events.push({
        date: billOn,
        label: 'water',
        amount: usage * t.waterRate + serviceChargeAmt,
        meta: {
          usage,
          waterCharge: usage * t.waterRate,
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

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Rebuild each year's month map in calendar order. Summary objects rely on
 * string-key insertion order for display, and merging multiple leases inserts
 * months in encounter order: a lease starting in August would otherwise put
 * Aug–Dec before Jan–Jun in the charts.
 */
export function sortSummaryMonths<T>(
  summary: Record<number, Record<string, T>>,
): Record<number, Record<string, T>> {
  const ordered: Record<number, Record<string, T>> = {};
  for (const year of Object.keys(summary)) {
    const months = summary[year];
    ordered[year] = {};
    for (const month of MONTH_NAMES) {
      if (months[month] !== undefined) ordered[year][month] = months[month];
    }
  }
  return ordered;
}

export interface LedgerPayment {
  date: Date;
  amount: number;
  paymentMethod?: string | null;
  reference?: string | null;
}

export interface MonthRow {
  year: number;
  month: string;
  expected: number;
  collected: number;
  balance: number;
  carryForward: number;
  currentCharges: number;
  usage: number;
  waterCharge: number;
  serviceCharge: number;
  rentRate: number;
  rentCharged: number;
  billingDate: string;
  deposit: number;
  arrearsbf: number;
  waterRate: number;
  previousReading: number | null;
  currentReading: number | null;
  extraCharges: Record<string, number>;
  transfer: number;
  transferNote: string | null;
  payments: { date: Date; amount: number; method: string | null; reference: string | null }[];
}

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/** What a tenant who moved units owed on the move day: all charges, less everything paid by the end of that day. */
export function moveOutBalance(charges: ChargeEvent[], payments: { date: Date; amount: number }[], movedOn: Date) {
  const end = endOfLocalDay(movedOn);
  let owed = 0;
  for (const c of charges) owed += c.amount;
  for (const p of payments) if (p.date <= end) owed -= p.amount;
  return owed;
}

/**
 * Pure. The whole per-lease statement: charges, ledger and one row per month.
 * Single pass: events are bucketed by month once instead of rescanning the
 * full history per month, which is what made long leases quadratic.
 * `rowsUntil` lets a past tenant's rows run on after move-out with no new charges.
 */
export function computeLeaseLedger(
  lease: LeaseFieldsForLedger,
  readings: ReadingPoint[],
  payments: LedgerPayment[],
  asOf: Date,
  rowsUntil: Date = asOf,
): MonthRow[] {
  const charges = generateCharges(lease, readings, asOf);
  if (lease.movedOut && lease.terminationDate) {
    // End of the move day, so a payment made later that day is included and the lease closes at 0.
    const movedOn = lease.terminationDate;
    charges.push({ date: endOfLocalDay(movedOn), label: 'transfer', amount: -moveOutBalance(charges, payments, movedOn) });
  }
  const ledger = buildLedger(charges, payments);
  const firstMonth = monthIndex(lease.startDate);

  const chargesBy = new Map<number, ChargeEvent[]>();
  for (const c of charges) {
    const k = monthIndex(c.date);
    const at = chargesBy.get(k);
    at ? at.push(c) : chargesBy.set(k, [c]);
  }

  const paymentsBy = new Map<number, LedgerPayment[]>();
  for (const p of payments) {
    // Payments predating the opening month land on the first row, matching `collected`.
    const k = Math.max(firstMonth, monthIndex(p.date));
    const at = paymentsBy.get(k);
    at ? at.push(p) : paymentsBy.set(k, [p]);
  }

  // Closing ledger point of each month, plus whatever carried in from before it.
  let carry: LedgerPoint = { date: lease.startDate, cumExpected: 0, cumCollected: 0, balance: 0 };
  const closingBy = new Map<number, LedgerPoint>();
  for (const pt of ledger) {
    const k = monthIndex(pt.date);
    if (k < firstMonth) carry = pt;
    closingBy.set(k, pt);
  }

  const rows: MonthRow[] = [];
  let m = startOfMonth(lease.startDate);
  let prevCumCollected = 0;
  let carryForward = 0;

  while (m <= rowsUntil) {
    const k = monthIndex(m);
    const closing = closingBy.get(k) ?? carry;

    let usage = 0, waterCharge = 0, serviceCharge = 0;
    let rentCharged = 0, deposit = 0, arrearsbf = 0, transfer = 0, waterEvents = 0;
    let previousReading: number | null = null;
    let currentReading: number | null = null;
    const extraCharges: Record<string, number> = {};

    for (const c of chargesBy.get(k) ?? []) {
      if (c.label === 'water') {
        if (waterEvents === 0) previousReading = c.meta?.previousReading ?? null;
        waterEvents++;
        currentReading = c.meta?.currentReading ?? null;
        usage += c.meta?.usage ?? 0;
        waterCharge += (c.meta?.waterCharge ?? 0) + (c.meta?.serviceCharge ?? 0);
        serviceCharge += c.meta?.serviceCharge ?? 0;
      } else if (c.label === 'rent') rentCharged += c.amount;
      else if (c.label === 'deposit') deposit += c.amount;
      else if (c.label === 'arrearsbf') arrearsbf += c.amount;
      else if (c.label === 'transfer') transfer += c.amount;
      else extraCharges[c.label] = (extraCharges[c.label] ?? 0) + c.amount;
    }

    // After move-out, show the final terms rather than a change the tenant never reached.
    const t = termsAt(lease, m < asOf ? m : asOf);
    let billingDate = billingDateFor(m.getFullYear(), m.getMonth(), t.rentDue);
    if (k === firstMonth && lease.startDate > billingDate) billingDate = new Date(lease.startDate);

    const expected = Math.round(closing.cumExpected - prevCumCollected);
    const collected = Math.round(closing.cumCollected - prevCumCollected);
    const balance = Math.round(closing.balance);

    rows.push({
      year: m.getFullYear(),
      month: MONTH_NAMES[m.getMonth()],
      expected,
      collected,
      balance,
      carryForward,
      currentCharges: expected - carryForward,
      usage,
      waterCharge,
      serviceCharge,
      rentRate: t.rentRate,
      rentCharged: Math.round(rentCharged),
      billingDate: `${billingDate.getFullYear()}-${String(billingDate.getMonth() + 1).padStart(2, '0')}-${String(billingDate.getDate()).padStart(2, '0')}`,
      deposit: Math.round(deposit),
      arrearsbf: Math.round(arrearsbf),
      waterRate: t.waterRate,
      previousReading,
      currentReading,
      extraCharges,
      transfer: Math.round(transfer),
      transferNote: transfer ? (lease.transferNote ?? null) : null,
      payments: (paymentsBy.get(k) ?? []).map((p) => ({
        date: p.date,
        amount: p.amount,
        method: p.paymentMethod ?? null,
        reference: p.reference ?? null,
      })),
    });

    prevCumCollected = closing.cumCollected;
    carry = closing;
    carryForward = balance;
    m = addMonths(m, 1);
  }

  return rows;
}

/** What a preview shows: the months whose charges changed, and the balance today before and after. */
export function ledgerImpact(before: MonthRow[], after: MonthRow[]) {
  const key = (r: MonthRow) => `${r.month} ${r.year}`;
  const was = new Map(before.map((r) => [key(r), r.currentCharges]));
  return {
    months: after
      .filter((r) => was.get(key(r)) !== r.currentCharges)
      .map((r) => ({ month: key(r), before: was.get(key(r)) ?? 0, after: r.currentCharges })),
    balanceBefore: before.at(-1)?.balance ?? 0,
    balanceAfter: after.at(-1)?.balance ?? 0,
  };
}

export { startOfMonth, addMonths, endOfMonth };
