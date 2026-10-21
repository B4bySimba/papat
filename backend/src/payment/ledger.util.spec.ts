import {
  billingDateFor,
  buildLedger,
  changeFor,
  computeLeaseLedger,
  endOfLocalDay,
  formatMonth,
  generateCharges,
  ledgerImpact,
  moveOutBalance,
  parseMonth,
  rateFields,
  sortSummaryMonths,
  termsAt,
  ChargeEvent,
  LeaseFieldsForLedger,
  ReadingPoint,
} from './ledger.util';

// Fixtures mirror the worked examples in docs/BILLING_MODEL.md; if one changes,
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
  readOn: new Date(2025, 2, 3), // logged Mar 3; must not matter
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

describe('generateCharges: fixture A (doc §9)', () => {
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

describe('ledger + monthly figures: fixture A (doc §9)', () => {
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

describe('asOf gate: current month posts on the 1st (fixture D)', () => {
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

// Example 1 of the rent-change plan: rent 10 000 -> 11 000 from March, tenant keeps paying 10 300.
describe('rate changes', () => {
  const lease: LeaseFieldsForLedger = {
    ...baseLease,
    startDate: new Date(2025, 0, 1),
    deposit: 10000,
    arrearsbf: 0,
    added_field_1: null,
    added_field_1_price: 0,
  };
  const payments = [
    { date: new Date(2025, 0, 2), amount: 20000 },
    { date: new Date(2025, 1, 2), amount: 10300 },
    { date: new Date(2025, 2, 2), amount: 10300 },
    { date: new Date(2025, 3, 2), amount: 10300 },
  ];
  const asOf = endOfLocalDay(new Date(2025, 3, 30));
  const raised = { ...lease, rates: [{ month: '2025-03', rentRate: 11000 }] };

  it('applies a change from its month on and leaves earlier months exactly as they were', () => {
    const before = computeLeaseLedger(lease, [], payments, asOf);
    const after = computeLeaseLedger(raised, [], payments, asOf);
    expect(after.slice(0, 2)).toEqual(before.slice(0, 2));
    expect(after.map((r) => [r.month, r.rentRate, r.currentCharges, r.expected, r.balance])).toEqual([
      ['January', 10000, 20000, 20000, 0],
      ['February', 10000, 10300, 10300, 0],
      ['March', 11000, 11300, 11300, 1000],
      ['April', 11000, 11300, 12300, 2000],
    ]);
    expect(computeLeaseLedger({ ...lease, rates: [] }, [], payments, asOf)).toEqual(before);
  });

  it('reports the months a change touches and the balance before and after, for the preview', () => {
    const impact = ledgerImpact(computeLeaseLedger(lease, [], payments, asOf), computeLeaseLedger(raised, [], payments, asOf));
    expect(impact).toEqual({
      months: [
        { month: 'March 2025', before: 10300, after: 11300 },
        { month: 'April 2025', before: 10300, after: 11300 },
      ],
      balanceBefore: 0,
      balanceAfter: 2000,
    });
  });

  it('stores only what changed, so a later change does not undo an earlier one', () => {
    const jan = changeFor(lease, '2026-01', { ...rateFields(lease), rentRate: 11000 })!;
    expect(jan).toMatchObject({ rentRate: 11000, garbageFee: null });
    const scheduled = { ...lease, rates: [{ month: '2026-01', ...jan }] };
    const nov = changeFor(scheduled, '2025-11', { ...rateFields(termsAt(scheduled, parseMonth('2025-11'))), garbageFee: 400 })!;
    expect(nov).toMatchObject({ garbageFee: 400, rentRate: null });
    const both = { ...lease, rates: [{ month: '2025-11', ...nov }, { month: '2026-01', ...jan }] };
    expect(termsAt(both, parseMonth('2025-12'))).toMatchObject({ rentRate: 10000, garbageFee: 400 });
    expect(termsAt(both, parseMonth('2026-01'))).toMatchObject({ rentRate: 11000, garbageFee: 400 });
  });

  it('keeps fields a partial change leaves out, and drops a change that no longer differs', () => {
    const saved = { ...lease, rates: [{ month: '2025-03', ...rateFields({}), rentRate: 11000 }] };
    expect(changeFor(saved, '2025-03', { garbageFee: 400 })).toMatchObject({ rentRate: 11000, garbageFee: 400 });
    expect(changeFor(saved, '2025-03', { rentRate: 10000 })).toBeNull();
  });

  it('bills water at the rate in force in the month the bill goes out', () => {
    const readings: ReadingPoint[] = [
      { readOn: new Date(2025, 1, 1), currentReading: 110, billingPeriod: new Date(2025, 0, 1), isMeterReset: false },
      { readOn: new Date(2025, 2, 1), currentReading: 130, billingPeriod: new Date(2025, 1, 1), isMeterReset: false },
    ];
    const water = byLabel(generateCharges({ ...lease, rates: [{ month: '2025-03', waterRate: 120 }] }, readings, asOf), 'water');
    expect(water.map((w) => w.amount)).toEqual([10 * 100 + 200, 20 * 120 + 200]);
  });

  it('uses the due day in force that month, for the charge and for the billing date', () => {
    const left = { ...lease, terminationDate: new Date(2025, 2, 20) };
    const later = { ...left, rates: [{ month: '2025-03', rentDue: 25 }] };
    expect(byLabel(generateCharges(left, [], left.terminationDate), 'rent')).toHaveLength(3);
    expect(byLabel(generateCharges(later, [], later.terminationDate), 'rent')).toHaveLength(2);
    expect(computeLeaseLedger(later, [], [], later.terminationDate)[2].billingDate).toBe('2025-03-25');
  });

  it('shows a past tenant the terms they left on, not a change they never reached', () => {
    const left = { ...lease, terminationDate: new Date(2025, 2, 20), rates: [{ month: '2025-05', rentRate: 12000 }] };
    const rows = computeLeaseLedger(left, [], [], left.terminationDate, new Date(2025, 5, 30));
    expect(rows.map((r) => r.rentRate)).toEqual([10000, 10000, 10000, 10000, 10000, 10000]);
  });

  it('stops an extra by setting it to 0 from a month', () => {
    const withExtra = { ...baseLease, rates: [{ month: '2025-03', added_field_1_price: 0 }] };
    const security = byLabel(generateCharges(withExtra, [], asOf), 'security');
    expect(security.map((e) => e.date)).toEqual([new Date(2025, 1, 1)]);
  });

  it('with changes scheduled ahead, still only appends months as the clock advances', () => {
    const scheduled = { ...lease, rates: [{ month: '2025-06', rentRate: 11000 }, { month: '2025-09', garbageFee: 400 }] };
    const key = (r: { year: number; month: string }) => `${r.year}-${r.month}`;
    const snap = (d: Date) =>
      new Map(computeLeaseLedger(scheduled, [], payments, endOfLocalDay(d)).map((r) => [key(r), JSON.stringify(r)]));
    let previous = snap(scheduled.startDate);
    for (let day = 1; day <= 400; day++) {
      const current = snap(new Date(2025, 0, 1 + day));
      for (const [k, v] of previous) expect(current.get(k)).toBe(v);
      previous = current;
    }
  });
});

// Example 6 of the plan: owes 4 000 at the end of February, moves from unit 3 to unit 7 on 15 March.
describe('moving units', () => {
  const movedOn = new Date(2025, 2, 15);
  const old: LeaseFieldsForLedger = {
    ...baseLease,
    startDate: new Date(2025, 0, 1),
    terminationDate: movedOn,
    serviceCharge: 0,
    deposit: 0,
    arrearsbf: 0,
    onEntryMeterReading: 0,
    added_field_1: null,
    added_field_1_price: 0,
    movedOut: true,
    transferNote: 'Moved to unit 7',
  };
  const readings: ReadingPoint[] = [
    { readOn: new Date(2025, 2, 1), currentReading: 5, billingPeriod: new Date(2025, 1, 1), isMeterReset: false },
    { readOn: movedOn, currentReading: 8, billingPeriod: new Date(2025, 2, 1), isMeterReset: false },
  ];
  const payments = [{ date: new Date(2025, 1, 10), amount: 16300 }];
  const next: LeaseFieldsForLedger = {
    ...old,
    startDate: movedOn,
    terminationDate: null,
    rentRate: 12000,
    movedOut: false,
    transferNote: 'Brought from unit 3',
  };
  const endOfMarch = endOfLocalDay(new Date(2025, 2, 31));

  it('closes the old unit at 0 and opens the new one with the balance, counted once', () => {
    const owed = moveOutBalance(generateCharges(old, readings, movedOn), payments, movedOn);
    expect(owed).toBe(4000 + 500 + 300);

    const mar = computeLeaseLedger(old, readings, payments, movedOn).at(-1)!;
    expect(mar).toMatchObject({ month: 'March', carryForward: 4000, rentCharged: 0, extraCharges: {} });
    expect(mar).toMatchObject({ transfer: -4800, transferNote: 'Moved to unit 7', expected: 0, balance: 0 });

    const first = computeLeaseLedger({ ...next, transferIn: owed }, [], [], endOfMarch)[0];
    expect(first).toMatchObject({ month: 'March', rentCharged: 12000, extraCharges: { garbageFee: 300 } });
    expect(first).toMatchObject({ transfer: 4800, transferNote: 'Brought from unit 3', expected: 17100, balance: 17100 });
    expect(mar.balance + first.balance).toBe(4000 + 800 + 12300);
  });

  it('includes a payment made later on the move day, so the old unit still closes at 0', () => {
    const paid = [...payments, { date: new Date(2025, 2, 15, 14), amount: 1000 }];
    const mar = computeLeaseLedger(old, readings, paid, movedOn).at(-1)!;
    expect(mar).toMatchObject({ collected: 1000, transfer: -3800, balance: 0 });
  });

  it('a negative deposit on the new unit is a credit for the deposit difference', () => {
    const first = computeLeaseLedger({ ...next, transferIn: 4800, deposit: -2000 }, [], [], endOfMarch)[0];
    expect(first.expected).toBe(17100 - 2000);
  });

  it('without the link the old unit is an ordinary move-out again', () => {
    const mar = computeLeaseLedger({ ...old, movedOut: false }, readings, payments, movedOn).at(-1)!;
    expect(mar).toMatchObject({ rentCharged: 10000, transfer: 0, transferNote: null });
  });
});

describe('deposit at move-out (Tenant B)', () => {
  // Deposit 10,000 paid at move-in, owes 3,000 when leaving on 3 Sep (before the 5th, so no September rent).
  const movedOn = new Date(2026, 8, 3);
  const lease: LeaseFieldsForLedger = {
    ...baseLease,
    startDate: new Date(2026, 7, 1),
    terminationDate: movedOn,
    deposit: 10000,
    arrearsbf: 0,
    waterRate: 0,
    serviceCharge: 0,
    garbageFee: 0,
    added_field_1: null,
    added_field_1_price: 0,
  };
  const payments = [{ date: new Date(2026, 7, 2), amount: 17000 }];
  const september = (l: LeaseFieldsForLedger, paid = payments, rowsUntil = movedOn) =>
    computeLeaseLedger(l, [], paid, movedOn, rowsUntil).find((r) => r.month === 'September')!;

  it('returns the deposit, spends and refunds what staff chose, and settles at 0', () => {
    const sep = september({ ...lease, depositExpenses: 2000, depositExpensesNote: 'painting, new door', depositRefund: 5000 });
    expect(sep).toMatchObject({ carryForward: 3000, currentCharges: -3000, expected: 0, collected: 0, balance: 0 });
    expect(sep.depositLines).toEqual([
      { label: 'Deposit returned', amount: -10000 },
      { label: 'Deposit used: painting, new door', amount: 2000 },
      { label: 'Deposit refunded', amount: 5000 },
    ]);
  });

  it('before staff decide, the company owes the tenant what is left of the deposit', () => {
    expect(september(lease).balance).toBe(-7000);
  });

  it('a tenant who owed more than the deposit still owes the rest', () => {
    expect(september(lease, [{ date: new Date(2026, 7, 2), amount: 5000 }]).balance).toBe(5000);
  });

  it('a payment after moving out lowers the balance when the rows run on', () => {
    const paid = [{ date: new Date(2026, 7, 2), amount: 5000 }, { date: new Date(2026, 9, 10), amount: 5000 }];
    const oct = computeLeaseLedger(lease, [], paid, movedOn, endOfLocalDay(new Date(2026, 9, 31))).at(-1)!;
    expect(oct).toMatchObject({ month: 'October', carryForward: 5000, collected: 5000, balance: 0 });
  });

  it('a tenant who moved units keeps their deposit', () => {
    expect(byLabel(generateCharges({ ...lease, movedOut: true }, [], movedOn), 'depositReturned')).toHaveLength(0);
  });

  it('returns the deposit held across earlier units', () => {
    expect(september({ ...lease, depositHeld: 12000 }).balance).toBe(3000 - 12000);
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
