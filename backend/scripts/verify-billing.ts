/**
 * Seeds fixture A+B from docs/BILLING_MODEL.md into the throwaway verify DB,
 * then checks EVERY figure served by the V2 endpoints against hand-computed
 * values, plus the invoice item builder against the live summary JSON.
 *
 * Run from backend/:  DATABASE_URL=... BASE_URL=http://localhost:3001 npx tsx <this file> [seed|verify]
 */
import prisma from '../lib/db';
import Hashids from 'hashids';
import {
  buildInvoiceItems,
} from '../../frontend/src/lib/invoice-items';

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const hashids = new Hashids(process.env.HASHID_SALT ?? 'your_secret_salt_here', 10);

let failures = 0;
let checks = 0;
function eq(label: string, actual: any, expected: any) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✓ ${label} = ${e}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}: expected ${e}, got ${a}`);
  }
}

async function seed() {
  const house = await prisma.house.create({
    data: {
      name: 'Verify House',
      code: 'VH1',
      water_bill: 100,
      serviceCharge: 200,
      garbage_collection: 300,
      added_field_1: 'security',
      added_field_1_price: 500,
    },
  });

  const unitA = await prisma.unit.create({
    data: { code: 'VH1A1', number: 'A1', type: 'bedsitter', rentRate: 10000, houseId: house.id },
  });
  const unitB = await prisma.unit.create({
    data: { code: 'VH1B2', number: 'B2', type: 'bedsitter', rentRate: 8000, houseId: house.id },
  });

  const tenantA = await prisma.tenant.create({
    data: { code: 'VH1A1t1', name: 'Tenant A', contact: '0700000001', unitId: unitA.id },
  });
  const tenantB = await prisma.tenant.create({
    data: { code: 'VH1B2t1', name: 'Tenant B', contact: '0700000002', unitId: unitB.id },
  });

  const zeros = {
    added_field_1_price: 0, added_field_2_price: 0, added_field_3_price: 0,
    added_field_4_price: 0, added_field_5_price: 0, added_field_6_price: 0,
    added_field_7_price: 0,
  };

  const leaseB = await prisma.lease.create({
    data: {
      code: 'LB1',
      houseId: house.id, unitId: unitB.id, tenantId: tenantB.id,
      moveInDate: new Date(2025, 1, 1),
      startDate: new Date(2025, 1, 1),
      terminationDate: new Date(2025, 2, 20),
      rentDue: 1,
      rentRate: 8000,
      deposit: null,
      arrearsbf: null,
      onEntryMeterReading: 0,
      waterRate: 100,
      serviceCharge: 200,
      electricityRate: 0,
      garbageFee: 0,
      additionalCharges: 0,
      ...zeros,
    },
  });

  // Lease A is created AFTER lease B on purpose: the house/manager merge walks
  // leases in id order, so without sortSummaryMonths the 2025 keys would come
  // out February, March, January.
  const leaseA = await prisma.lease.create({
    data: {
      code: 'LA1',
      houseId: house.id, unitId: unitA.id, tenantId: tenantA.id,
      moveInDate: new Date(2025, 0, 15),
      startDate: new Date(2025, 0, 15),
      terminationDate: new Date(2025, 2, 20), // asOf pin — status stays ACTIVE
      rentDue: 5,
      rentRate: 10000,
      deposit: 5000,
      arrearsbf: 2000,
      onEntryMeterReading: 100,
      waterRate: 100,
      serviceCharge: 200,
      electricityRate: 0,
      garbageFee: 300,
      additionalCharges: 0,
      ...zeros,
      added_field_1: 'security',
      added_field_1_price: 500,
    },
  });

  // Lease A readings: opening (billingPeriod null) + closing for February,
  // logged Mar 3 — attribution must follow billingPeriod, not readOn.
  await prisma.meterReading.create({
    data: {
      currentReading: 100, readOn: new Date(2025, 0, 15), billingPeriod: null,
      unitId: unitA.id, houseId: house.id, tenantId: tenantA.id, leaseId: leaseA.id,
    },
  });
  await prisma.meterReading.create({
    data: {
      currentReading: 130, readOn: new Date(2025, 2, 3),
      billingPeriod: new Date('2025-02-01T00:00:00.000Z'), // UTC month-start, as production writes it
      unitId: unitA.id, houseId: house.id, tenantId: tenantA.id, leaseId: leaseA.id,
    },
  });

  const pay = (leaseId: number, tenantId: number, unitId: number, date: Date, amount: number, ref: string) =>
    prisma.payment.create({
      data: {
        amount, date, reference: ref, paymentMethod: 'cash', manualInput: true,
        houseId: house.id, tenantId, leaseId, unitId,
      },
    });

  await pay(leaseA.id, tenantA.id, unitA.id, new Date(2025, 0, 20), 17000, 'PA-1');
  await pay(leaseA.id, tenantA.id, unitA.id, new Date(2025, 1, 4), 10000, 'PA-2');
  await pay(leaseA.id, tenantA.id, unitA.id, new Date(2025, 2, 6), 4000, 'PA-3');
  await pay(leaseB.id, tenantB.id, unitB.id, new Date(2025, 1, 10), 8000, 'PB-1');

  console.log(`Seeded house ${house.id} (hash ${hashids.encode(house.id)}), leases LA1/LB1`);
}

async function verify() {
  const get = async (path: string) => {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`${path} -> ${res.status}`);
    return res.json();
  };

  // ---------- Tenant A ----------
  console.log('\n— Tenant A summary (LA1) —');
  const sa = await get('/payment/le/LA1/summary');
  eq('years', sa.years, [2025]);
  const A = sa.summary['2025'];

  eq('Jan expected', A.January.expected, 17000);
  eq('Jan collected', A.January.collected, 17000);
  eq('Jan balance', A.January.balance, 0);
  eq('Jan rentCharged', A.January.rentCharged, 10000);
  eq('Jan deposit', A.January.deposit, 5000);
  eq('Jan arrearsbf', A.January.arrearsbf, 2000);
  eq('Jan billingDate (max(start, due))', A.January.billingDate, '2025-01-15');
  eq('Jan extraCharges', A.January.extraCharges, {});
  eq('Jan usage', A.January.usage, 0);
  eq('Jan waterCharge', A.January.waterCharge, 0);
  eq('Jan payments count', A.January.payments.length, 1);

  eq('Feb expected', A.February.expected, 14000);
  eq('Feb collected', A.February.collected, 10000);
  eq('Feb balance', A.February.balance, 4000);
  eq('Feb rentCharged', A.February.rentCharged, 10000);
  eq('Feb deposit', A.February.deposit, 0);
  eq('Feb billingDate', A.February.billingDate, '2025-02-05');
  eq('Feb usage', A.February.usage, 30);
  eq('Feb waterCharge (incl. service)', A.February.waterCharge, 3200);
  eq('Feb serviceCharge', A.February.serviceCharge, 200);
  eq('Feb previousReading', A.February.previousReading, 100);
  eq('Feb currentReading', A.February.currentReading, 130);
  eq('Feb extraCharges', A.February.extraCharges, { garbageFee: 300, security: 500 });

  eq('Mar expected (carry 4000 + 10800 new)', A.March.expected, 14800);
  eq('Mar collected', A.March.collected, 4000);
  eq('Mar balance', A.March.balance, 10800);
  eq('Mar usage', A.March.usage, 0);
  eq('Mar billingDate', A.March.billingDate, '2025-03-05');
  eq('Mar extraCharges', A.March.extraCharges, { garbageFee: 300, security: 500 });

  // ---------- Tenant B ----------
  console.log('\n— Tenant B summary (LB1) —');
  const sb = await get('/payment/le/LB1/summary');
  const B = sb.summary['2025'];
  eq('Feb expected', B.February.expected, 8000);
  eq('Feb collected', B.February.collected, 8000);
  eq('Feb balance', B.February.balance, 0);
  eq('Feb billingDate', B.February.billingDate, '2025-02-01');
  eq('Feb deposit', B.February.deposit, 0);
  eq('Mar expected', B.March.expected, 8000);
  eq('Mar collected', B.March.collected, 0);
  eq('Mar balance', B.March.balance, 8000);
  eq('no January row', B.January, undefined);

  // ---------- House ----------
  const houseRow = await prisma.house.findFirst({ where: { name: 'Verify House' } });
  const houseHash = hashids.encode(houseRow!.id);
  console.log(`\n— House summary (${houseHash}) —`);
  const hs = await get(`/payment/${houseHash}/summary`);
  const H = hs.summary['2025'];
  eq('Jan expected', H.January.expected, 17000);
  eq('Jan collected', H.January.collected, 17000);
  eq('Jan balance', H.January.balance, 0);
  eq('Feb expected (A+B)', H.February.expected, 22000);
  eq('Feb collected (A+B)', H.February.collected, 18000);
  eq('Feb balance (A+B)', H.February.balance, 4000);
  eq('Feb usage', H.February.usage, 30);
  eq('Feb waterCharge', H.February.waterCharge, 3200);
  eq('Mar expected (A+B)', H.March.expected, 22800);
  eq('Mar collected (A+B)', H.March.collected, 4000);
  eq('Mar balance (A+B)', H.March.balance, 18800);
  eq('Feb payments count (A+B)', H.February.payments.length, 2);
  eq('months in calendar order (house)', Object.keys(H), ['January', 'February', 'March']);

  // ---------- Manager ----------
  console.log('\n— Manager summary —');
  const ms = await get('/payment/summary');
  const M = ms.summary['2025'];
  eq('Mar expected', M.March.expected, 22800);
  eq('Mar balance', M.March.balance, 18800);
  eq('months in calendar order (manager)', Object.keys(M), ['January', 'February', 'March']);

  // ---------- Monthly report ----------
  console.log('\n— Monthly report (March 2025) —');
  const mr = await get(`/payment/report/monthly/${houseHash}?year=2025&month=3`);
  eq('rows', mr, [
    { unitName: 'A1', expected: 14800, collected: 4000, balance: 10800 },
    { unitName: 'B2', expected: 8000, collected: 0, balance: 8000 },
  ]);

  // ---------- Yearly report ----------
  console.log('\n— Yearly report (2025) —');
  const yr = await get(`/payment/report/yearly/${houseHash}?year=2025`);
  const yrA = yr.find((r: any) => r.unitNumber === 'A1');
  const yrB = yr.find((r: any) => r.unitNumber === 'B2');
  eq('A1 totalExpected (no carry double-count)', yrA.totalExpected, 41800);
  eq('A1 totalCollected', yrA.totalCollected, 31000);
  eq('A1 totalBalance (= closing balance)', yrA.totalBalance, 10800);
  eq('A1 months collected', yrA.months, [
    { month: 'January', collected: 17000 },
    { month: 'February', collected: 10000 },
    { month: 'March', collected: 4000 },
  ]);
  eq('B2 totalExpected', yrB.totalExpected, 16000);
  eq('B2 totalCollected', yrB.totalCollected, 8000);
  eq('B2 totalBalance', yrB.totalBalance, 8000);

  // ---------- Invoice builder against live JSON ----------
  console.log('\n— Invoice items (lease A live summary) —');
  const jan = buildInvoiceItems(sa, 2025, 1, 'Comprehensive')!;
  eq('Jan items', jan.items.map((i) => [i.description, i.amount]), [
    ['Monthly Rent', 10000],
    ['Security Deposit', 5000],
    ['Arrears Brought Forward', 2000],
  ]);
  eq('Jan total = Jan expected', jan.total, A.January.expected);
  eq('Jan dueDate', jan.dueDate, '2025-01-15');

  const feb = buildInvoiceItems(sa, 2025, 2, 'Comprehensive')!;
  eq('Feb items', feb.items.map((i) => [i.description, i.amount]), [
    ['Monthly Rent', 10000],
    ['Water Charge (100 → 130)', 3200],
    ['Garbage Fee', 300],
    ['Security', 500],
  ]);
  eq('Feb total = Feb expected', feb.total, A.February.expected);
  eq('Feb water quantity/rate/serviceCharge', [feb.items[1].quantity, feb.items[1].rate, feb.items[1].serviceCharge], [30, 100, 200]);

  const mar = buildInvoiceItems(sa, 2025, 3, 'Comprehensive')!;
  eq('Mar items', mar.items.map((i) => [i.description, i.amount]), [
    ['Monthly Rent', 10000],
    ['Arrears Balance', 4000],
    ['Garbage Fee', 300],
    ['Security', 500],
  ]);
  eq('Mar total = Mar expected', mar.total, A.March.expected);
  eq('Mar dueDate', mar.dueDate, '2025-03-05');

  const febWater = buildInvoiceItems(sa, 2025, 2, 'utilities', 'water')!;
  eq('Feb water invoice total', febWater.total, 3200);
  eq('Feb water billed lines', febWater.items.filter((i) => !i.isInfoItem).map((i) => [i.description, i.amount]), [
    ['Water Rate (KSH 100/unit)', 3000],
    ['Service Charge', 200],
  ]);

  // January-of-next-year arrears lookup (cross-year path) — synthetic summary.
  const synthetic = {
    summary: {
      2025: { December: { balance: 1234 } },
      2026: {
        January: {
          expected: 11234, collected: 0, balance: 11234, rentCharged: 10000, rentRate: 10000,
          billingDate: '2026-01-05', deposit: 0, arrearsbf: 0, usage: 0, waterCharge: 0,
          serviceCharge: 0, previousReading: null, currentReading: null, extraCharges: {}, payments: [],
        },
      },
    },
  };
  const janNext = buildInvoiceItems(synthetic, 2026, 1, 'Comprehensive')!;
  eq('cross-year arrears (Dec 2025 → Jan 2026 invoice)', janNext.items.map((i) => [i.description, i.amount]), [
    ['Monthly Rent', 10000],
    ['Arrears Balance', 1234],
  ]);
  eq('cross-year total = expected', janNext.total, 11234);

  console.log(`\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ''}`);
  process.exit(failures ? 1 : 0);
}

const mode = process.argv[2] ?? 'seed';
(mode === 'seed' ? seed() : verify()).catch((e) => {
  console.error(e);
  process.exit(1);
});
