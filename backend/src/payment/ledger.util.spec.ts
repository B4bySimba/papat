import {
  billingDateFor,
  buildLedger,
  generateCharges,
  sortSummaryMonths,
  ChargeEvent,
  LeaseFieldsForLedger,
  ReadingPoint,
} from './ledger.util';

// Fixtures mirror the worked examples in docs/BILLING_MODEL.md — if one changes,
// change the other.

const baseLease: LeaseFieldsForLedger = {
  startDate: new Date(2025, 0, 15), // Jan 15 2025
  rentDue: 5,
  rentRate: 10000,
  waterRate: 100,
  serviceCharge: 200,
  garbageFee: 300,
  additional: null,
  additionalCharges: 0,
  deposit: 5000,
  arrearsbf: 2000,
  onEntryMeterReading: 100,
  added_field_1: 'security',
  added_field_1_price: 500,
};

const openingReading: ReadingPoint = {
  readOn: new Date(2025, 0, 15),
  currentReading: 100,
  billingPeriod: null,
  isMeterReset: false,
};

const febClosingReading: ReadingPoint = {
  readOn: new Date(2025, 2, 3), // logged Mar 3 — must not matter
  currentReading: 130,
  billingPeriod: new Date(2025, 1, 1), // closes February
  isMeterReset: false,
};

function byLabel(events: ChargeEvent[], label: string) {
  return events.filter((e) => e.label === label);
}

describe('billingDateFor', () => {
  it('uses the rentDue day of the month', () => {
    expect(billingDateFor(2025, 6, 5)).toEqual(new Date(2025, 6, 5));
  });

  it('clamps rentDue past the end of the month', () => {
    expect(billingDateFor(2025, 1, 31)).toEqual(new Date(2025, 1, 28)); // Feb 2025
    expect(billingDateFor(2024, 1, 31)).toEqual(new Date(2024, 1, 29)); // leap year
  });

  it('falls back to day 1 for missing/zero/invalid rentDue', () => {
    expect(billingDateFor(2025, 3, null)).toEqual(new Date(2025, 3, 1));
    expect(billingDateFor(2025, 3, undefined)).toEqual(new Date(2025, 3, 1));
    expect(billingDateFor(2025, 3, 0)).toEqual(new Date(2025, 3, 1));
    expect(billingDateFor(2025, 3, -4)).toEqual(new Date(2025, 3, 1));
  });
});

describe('generateCharges — fixture A (doc §9)', () => {
  const asOf = new Date(2025, 2, 20); // Mar 20 2025
  const charges = generateCharges(baseLease, [openingReading, febClosingReading], asOf);

  it('bills arrears + deposit at startDate', () => {
    expect(byLabel(charges, 'arrearsbf')).toEqual([
      { date: new Date(2025, 0, 15), label: 'arrearsbf', amount: 2000 },
    ]);
    expect(byLabel(charges, 'deposit')).toEqual([
      { date: new Date(2025, 0, 15), label: 'deposit', amount: 5000 },
    ]);
  });

  it('bills first-month rent at max(startDate, billing date), later months on the billing date', () => {
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 15), // start month: due Jan 5 < start Jan 15 → Jan 15
      new Date(2025, 1, 5),
      new Date(2025, 2, 5),
    ]);
  });

  it('skips extras in the first month, bills them with rent afterwards', () => {
    expect(byLabel(charges, 'garbageFee').map((e) => e.date)).toEqual([
      new Date(2025, 1, 5),
      new Date(2025, 2, 5),
    ]);
    expect(byLabel(charges, 'security').map((e) => e.date)).toEqual([
      new Date(2025, 1, 5),
      new Date(2025, 2, 5),
    ]);
  });

  it('bills water on the billing date of the month the reading closes, keyed off billingPeriod not readOn', () => {
    const water = byLabel(charges, 'water');
    expect(water).toHaveLength(1);
    expect(water[0].date).toEqual(new Date(2025, 1, 5)); // February's billing date, though logged Mar 3
    expect(water[0].amount).toBe(30 * 100 + 200); // 3200
    expect(water[0].meta).toMatchObject({
      usage: 30,
      waterCharge: 3000,
      serviceCharge: 200,
      previousReading: 100,
      currentReading: 130,
    });
  });
});

describe('ledger + monthly figures — fixture A (doc §9)', () => {
  const asOf = new Date(2025, 2, 20);
  const charges = generateCharges(baseLease, [openingReading, febClosingReading], asOf);
  const payments = [
    { date: new Date(2025, 0, 20), amount: 17000 },
    { date: new Date(2025, 1, 4), amount: 10000 },
    { date: new Date(2025, 2, 6), amount: 4000 },
  ];
  const ledger = buildLedger(charges, payments);

  function monthEndPoint(year: number, month: number) {
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const pts = ledger.filter((p) => p.date <= monthEnd);
    return pts[pts.length - 1];
  }

  it('January: arrears + deposit + rent = 17 000, fully paid', () => {
    const jan = monthEndPoint(2025, 0);
    expect(jan.cumExpected).toBe(17000);
    expect(jan.cumCollected).toBe(17000);
    expect(jan.balance).toBe(0);
  });

  it('Feb 4 payment is credit until the Feb 5 billing date posts the charges', () => {
    const beforeDue = ledger.filter((p) => p.date <= new Date(2025, 1, 4, 23, 59, 59));
    expect(beforeDue[beforeDue.length - 1].balance).toBe(-10000);
  });

  it('February: expected 14 000 (rent+garbage+security+water), collected 10 000, balance 4 000', () => {
    const feb = monthEndPoint(2025, 1);
    const jan = monthEndPoint(2025, 0);
    expect(feb.cumExpected - jan.cumCollected).toBe(14000); // month "expected" statement
    expect(feb.cumCollected - jan.cumCollected).toBe(10000);
    expect(feb.balance).toBe(4000);
  });

  it('March (asOf Mar 20): expected 14 800 = carry 4 000 + rent + extras, balance 10 800', () => {
    const mar = monthEndPoint(2025, 2);
    const feb = monthEndPoint(2025, 1);
    expect(mar.cumExpected - feb.cumCollected).toBe(14800);
    expect(mar.cumCollected - feb.cumCollected).toBe(4000);
    expect(mar.balance).toBe(10800);
  });

  it('total charged over the window telescopes to 41 800', () => {
    expect(ledger[ledger.length - 1].cumExpected).toBe(41800);
  });
});

describe('asOf gate — current month before its billing date (fixture D)', () => {
  it('does not post the month until the billing date is reached', () => {
    const asOf = new Date(2025, 2, 3); // Mar 3, before Mar 5
    const charges = generateCharges(baseLease, [openingReading], asOf);
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 15),
      new Date(2025, 1, 5), // February only — March not due yet
    ]);
    expect(byLabel(charges, 'garbageFee')).toHaveLength(1);
  });

  it('posts the month once the billing date arrives', () => {
    const charges = generateCharges(baseLease, [openingReading], new Date(2025, 2, 5));
    expect(byLabel(charges, 'rent')).toHaveLength(3);
  });
});

describe('termination before the billing date (fixture C)', () => {
  it('never bills the final month rent, but still bills its measured water', () => {
    const lease = { ...baseLease, rentDue: 15 };
    const asOf = new Date(2025, 2, 10); // terminated Mar 10, rent due Mar 15
    const readings: ReadingPoint[] = [
      openingReading,
      {
        readOn: new Date(2025, 2, 9),
        currentReading: 150,
        billingPeriod: new Date(2025, 2, 1), // closes March
        isMeterReset: false,
      },
    ];
    const charges = generateCharges(lease, readings, asOf);
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 15),
      new Date(2025, 1, 15),
    ]);
    const water = byLabel(charges, 'water');
    expect(water).toHaveLength(1);
    expect(water[0].date).toEqual(new Date(2025, 2, 15)); // March billing date, ungated
    expect(water[0].amount).toBe(50 * 100 + 200);
  });
});

describe('rentDue clamping inside charge generation (fixture B)', () => {
  it('bills February on the 28th when rentDue is 31', () => {
    const lease = { ...baseLease, rentDue: 31, startDate: new Date(2025, 0, 1) };
    const charges = generateCharges(lease, [], new Date(2025, 1, 28));
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 31),
      new Date(2025, 1, 28),
    ]);
  });
});

describe('meter resets and misc water rules (fixtures E/F)', () => {
  it('a reset reading rebases without billing, later readings bill from the new baseline', () => {
    const readings: ReadingPoint[] = [
      openingReading,
      { readOn: new Date(2025, 1, 28), currentReading: 150, billingPeriod: new Date(2025, 1, 1), isMeterReset: false },
      { readOn: new Date(2025, 2, 28), currentReading: 20, billingPeriod: new Date(2025, 2, 1), isMeterReset: true },
      { readOn: new Date(2025, 3, 28), currentReading: 45, billingPeriod: new Date(2025, 3, 1), isMeterReset: false },
    ];
    const charges = generateCharges(baseLease, readings, new Date(2025, 4, 1));
    const water = byLabel(charges, 'water');
    expect(water).toHaveLength(2);
    expect(water[0].meta?.usage).toBe(50); // 150 - 100
    expect(water[1].meta?.usage).toBe(25); // 45 - 20 (rebased)
  });

  it('negative usage without a reset flag clamps to zero and charges no service fee', () => {
    const readings: ReadingPoint[] = [
      { readOn: new Date(2025, 1, 28), currentReading: 50, billingPeriod: new Date(2025, 1, 1), isMeterReset: false },
    ];
    const charges = generateCharges(baseLease, readings, new Date(2025, 4, 1));
    const water = byLabel(charges, 'water');
    expect(water).toHaveLength(1);
    expect(water[0].amount).toBe(0);
    expect(water[0].meta?.serviceCharge).toBe(0);
  });

  it('drops readings closing the first month or earlier', () => {
    const readings: ReadingPoint[] = [
      { readOn: new Date(2025, 0, 30), currentReading: 120, billingPeriod: new Date(2025, 0, 1), isMeterReset: false },
    ];
    const charges = generateCharges(baseLease, readings, new Date(2025, 4, 1));
    expect(byLabel(charges, 'water')).toHaveLength(0);
  });

  it('falls back to month-start billing when rentDue is absent', () => {
    const lease = { ...baseLease, rentDue: null, startDate: new Date(2025, 0, 1) };
    const charges = generateCharges(lease, [], new Date(2025, 1, 1));
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 1),
      new Date(2025, 1, 1),
    ]);
  });
});

describe('sortSummaryMonths', () => {
  it('reorders merge-insertion month keys into calendar order', () => {
    // The order a house summary actually produced when an Aug-start lease
    // merged before a Jan-start one.
    const jumbled: Record<number, Record<string, number>> = { 2025: {} };
    for (const m of [
      'August', 'September', 'October', 'November', 'December',
      'July', 'January', 'February', 'March', 'April', 'May', 'June',
    ]) {
      jumbled[2025][m] = 1;
    }
    expect(Object.keys(sortSummaryMonths(jumbled)[2025])).toEqual([
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]);
  });

  it('keeps only the months present', () => {
    const sparse = { 2025: { March: 1, January: 2 } };
    expect(Object.keys(sortSummaryMonths(sparse)[2025])).toEqual(['January', 'March']);
  });
});

describe('buildLedger ordering', () => {
  it('settles a same-timestamp payment against that day\'s charge (charge first)', () => {
    const d = new Date(2025, 1, 5);
    const ledger = buildLedger(
      [{ date: d, label: 'rent', amount: 10000 }],
      [{ date: d, amount: 10000 }],
    );
    expect(ledger.map((p) => p.balance)).toEqual([10000, 0]);
  });
});
