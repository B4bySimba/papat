import {
  billingDateFor,
  buildLedger,
  computeLeaseLedger,
  endOfLocalDay,
  formatMonth,
  generateCharges,
  parseMonth,
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

  it('bills first-month rent on the start date, later months on the 1st', () => {
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 15),
      new Date(2025, 1, 1),
      new Date(2025, 2, 1),
    ]);
  });

  it('skips extras in the first month, bills them with rent afterwards', () => {
    expect(byLabel(charges, 'garbageFee').map((e) => e.date)).toEqual([
      new Date(2025, 1, 1),
      new Date(2025, 2, 1),
    ]);
    expect(byLabel(charges, 'security').map((e) => e.date)).toEqual([
      new Date(2025, 1, 1),
      new Date(2025, 2, 1),
    ]);
  });

  it('bills a month\'s water with the next month\'s charges, keyed off billingPeriod not readOn', () => {
    const water = byLabel(charges, 'water');
    expect(water).toHaveLength(1);
    expect(water[0].date).toEqual(new Date(2025, 2, 1)); // February's usage, billed with March's charges
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

  it('February charges post on the 1st, so the Feb 4 payment (before the 5th) leaves 800 owed, not a credit', () => {
    const beforeDue = ledger.filter((p) => p.date <= new Date(2025, 1, 4, 23, 59, 59));
    expect(beforeDue[beforeDue.length - 1].balance).toBe(800);
  });

  it('February: expected 10 800 (rent+garbage+security, no water measured yet), collected 10 000, balance 800', () => {
    const feb = monthEndPoint(2025, 1);
    const jan = monthEndPoint(2025, 0);
    expect(feb.cumExpected - jan.cumCollected).toBe(10800); // month "expected" statement
    expect(feb.cumCollected - jan.cumCollected).toBe(10000);
    expect(feb.balance).toBe(800);
  });

  it('March (asOf Mar 20): expected 14 800 = carry 800 + rent + extras + February water 3 200, balance 10 800', () => {
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

describe('asOf gate — current month posts on the 1st (fixture D)', () => {
  it('posts the month on the 1st, before its due date', () => {
    const asOf = new Date(2025, 2, 3); // Mar 3, rent due Mar 5
    const charges = generateCharges(baseLease, [openingReading], asOf);
    expect(byLabel(charges, 'rent').map((e) => e.date)).toEqual([
      new Date(2025, 0, 15),
      new Date(2025, 1, 1),
      new Date(2025, 2, 1),
    ]);
    expect(byLabel(charges, 'garbageFee')).toHaveLength(2);
  });

  it('does not post a month before its 1st', () => {
    const charges = generateCharges(baseLease, [openingReading], new Date(2025, 1, 28));
    expect(byLabel(charges, 'rent')).toHaveLength(2);
  });

  it('posts last month\'s water on the 1st, with the month\'s other charges', () => {
    const readings = [openingReading, febClosingReading];
    expect(byLabel(generateCharges(baseLease, readings, new Date(2025, 1, 28)), 'water')).toHaveLength(0);
    expect(byLabel(generateCharges(baseLease, readings, new Date(2025, 2, 1)), 'water')).toHaveLength(1);
  });
});

describe('termination before the billing date (fixture C)', () => {
  it('never bills the final month rent, and bills the unbilled water on the move-out date', () => {
    const lease = { ...baseLease, rentDue: 15, terminationDate: new Date(2025, 2, 10) };
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
      new Date(2025, 1, 1),
    ]);
    const water = byLabel(charges, 'water');
    expect(water).toHaveLength(1);
    expect(water[0].date).toEqual(new Date(2025, 2, 10)); // move-out date, not 1 April
    expect(water[0].amount).toBe(50 * 100 + 200);
  });
});

describe('rentDue clamping inside charge generation (fixture B)', () => {
  it('with rentDue 31, February is due on the 28th: leaving on the 27th skips it, leaving on the 28th does not', () => {
    const lease = { ...baseLease, rentDue: 31, startDate: new Date(2025, 0, 1) };
    const leftOn = (day: number) => {
      const left = { ...lease, terminationDate: new Date(2025, 1, day) };
      return byLabel(generateCharges(left, [], left.terminationDate), 'rent').map((e) => e.date);
    };
    expect(leftOn(27)).toEqual([new Date(2025, 0, 1)]);
    expect(leftOn(28)).toEqual([new Date(2025, 0, 1), new Date(2025, 1, 1)]);
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

  it('bills the first month\'s usage in month two; readings before the tenancy only set the baseline', () => {
    const readings: ReadingPoint[] = [
      { readOn: new Date(2024, 11, 31), currentReading: 90, billingPeriod: new Date(2024, 11, 1), isMeterReset: false },
      { readOn: new Date(2025, 0, 30), currentReading: 120, billingPeriod: new Date(2025, 0, 1), isMeterReset: false },
    ];
    const water = byLabel(generateCharges(baseLease, readings, new Date(2025, 4, 1)), 'water');
    expect(water).toHaveLength(1);
    expect(water[0].date).toEqual(new Date(2025, 1, 1));
    expect(water[0].meta).toMatchObject({ usage: 30, previousReading: 90, currentReading: 120 });
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

describe('computeLeaseLedger', () => {
  const lease: LeaseFieldsForLedger = { ...baseLease, startDate: new Date(2025, 0, 15) };
  const readings = [openingReading, febClosingReading];
  const asOf = new Date(2025, 3, 30);

  it('carries the previous row balance forward; expected = carry forward + this month\'s charges (water included)', () => {
    const rows = computeLeaseLedger(lease, readings, [{ date: new Date(2025, 0, 20), amount: 5000 }], asOf);
    expect(rows[0].carryForward).toBe(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].carryForward).toBe(rows[i - 1].balance);
      expect(rows[i].carryForward + rows[i].currentCharges).toBe(rows[i].expected);
    }
    expect(rows.find((r) => r.month === 'March')?.currentCharges).toBe(10800 + 3200);
  });

  it('runs a past tenant\'s rows on after move-out with no new charges', () => {
    const left = { ...lease, terminationDate: new Date(2025, 2, 20) };
    const payments = [{ date: new Date(2025, 0, 20), amount: 17000 }, { date: new Date(2025, 4, 10), amount: 2000 }];
    const halted = computeLeaseLedger(left, readings, payments, left.terminationDate);
    const rows = computeLeaseLedger(left, readings, payments, left.terminationDate, new Date(2025, 5, 30));
    expect(halted.map((r) => r.month)).toEqual(['January', 'February', 'March']);
    expect(rows.map((r) => r.month)).toEqual(['January', 'February', 'March', 'April', 'May', 'June']);
    expect(rows.slice(0, 3)).toEqual(halted);
    const [apr, may, jun] = rows.slice(3);
    expect([apr.currentCharges, may.currentCharges, jun.currentCharges]).toEqual([0, 0, 0]);
    expect(apr.expected).toBe(halted[2].balance);
    expect(may.collected).toBe(2000);
    expect(jun.balance).toBe(halted[2].balance - 2000);
  });

  it('puts a payment predating the opening month on the first row', () => {
    const early = { date: new Date(2024, 11, 20), amount: 3000 };
    const rows = computeLeaseLedger(lease, readings, [early], asOf);
    expect(rows[0].month).toBe('January');
    expect(rows[0].payments).toHaveLength(1);
    expect(rows[0].collected).toBe(3000);
  });

  // The whole read model rests on this: nothing already shown may change tomorrow.
  it('only ever appends months as the clock advances, and a month never changes once it appears', () => {
    const payments = [
      { date: new Date(2025, 0, 20), amount: 5000 },
      { date: new Date(2025, 2, 6), amount: 12000 },
    ];
    const key = (r: { year: number; month: string }) => `${r.year}-${r.month}`;
    const snap = (d: Date) =>
      new Map(computeLeaseLedger(lease, readings, payments, endOfLocalDay(d)).map((r) => [key(r), JSON.stringify(r)]));

    let previous = snap(lease.startDate);
    for (let day = 1; day <= 400; day++) {
      const current = snap(new Date(2025, 0, 15 + day));
      for (const [k, v] of previous) expect(current.get(k)).toBe(v);
      previous = current;
    }
    expect(previous.size).toBeGreaterThan(12);
  });
});

describe('month keys', () => {
  it('round-trips a local month start', () => {
    expect(formatMonth(parseMonth('2026-02'))).toBe('2026-02');
    expect(parseMonth('2026-02').getMonth()).toBe(1);
  });

  it('formats the local month, not the UTC one', () => {
    expect(formatMonth(new Date(2026, 1, 1))).toBe('2026-02');
  });
});
