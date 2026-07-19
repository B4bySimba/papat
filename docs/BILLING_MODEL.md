# Papat Billing Model (V2 — event ledger, rentDue-based billing dates)

This is the complete mental model of how money is computed in Papat: every charge,
every ledger figure, every summary/report/chart/invoice number. V1 methods still
exist in `payment.service.ts` but **no route uses them**; every live endpoint is
served by the V2 engine described here.

- Engine core: [`backend/src/payment/ledger.util.ts`](../backend/src/payment/ledger.util.ts) (pure functions, no DB)
- Service wrappers: `getTenantLevelSummaryV2`, `getHouseLevelSummaryV2`,
  `getManagerLevelSummaryV2`, `monthlyReportV2`, `yearlyReportV2` in
  [`backend/src/payment/payment.service.ts`](../backend/src/payment/payment.service.ts)
- Invoice item builder: [`frontend/src/lib/invoice-items.ts`](../frontend/src/lib/invoice-items.ts)

---

## 1. Inputs

Everything is computed **from scratch on every request** from four sources of
truth. Nothing is stored derived; there is no "posted invoice" table.

| Source | Fields that matter |
|---|---|
| `Lease` | `startDate` (billing begins), `terminationDate` (billing ends; else "now"), `rentDue` (day-of-month the bill is due, e.g. `5`), `rentRate`, `deposit`, `arrearsbf`, `onEntryMeterReading`, `waterRate`, `serviceCharge`, `garbageFee`, `additional`+`additionalCharges`, `added_field_1..7`+`_price` |
| `MeterReading` | `currentReading` (odometer), `billingPeriod` (**the** month this reading closes; `null` = opening/unassigned → never billed), `isMeterReset` (new physical meter → becomes baseline, no usage billed), `readOn` (log time only — **not used** by billing) |
| `payment` | `amount`, `date` |
| Clock | `asOf = lease.terminationDate ?? now` |

`moveInDate`, `endDate`, `Unit.deposit` are **not** used by V2 billing
(the lease's own `deposit` is the one charged).

## 2. The billing date

Every month `M` of a lease has one **billing date**:

```
billingDate(M) = day `rentDue` of M, clamped into the month
```

- `rentDue = 31` in February → Feb 28/29. `rentDue` missing/0/invalid → day 1.
- **First month only:** the billing date can't precede the tenancy:
  `firstBillingDate = max(startDate, billingDate(startMonth))`.
  (Lease starts Jan 15, rentDue 5 → first rent is due Jan 15, not Jan 5.)

Rent is **in advance**: month M's rent pays for M and is due on M's billing date.

## 3. Charge events (`generateCharges`)

The lease is unrolled into dated charge events:

| Charge | Date | Months | Amount |
|---|---|---|---|
| `arrearsbf` | `startDate` | once | `lease.arrearsbf` |
| `deposit` | `startDate` | once | `lease.deposit` |
| `rent` | `billingDate(M)` (first month: `max(startDate, …)`) | every month, **only if the date has been reached** (`≤ asOf`) | `rentRate` |
| extras: `garbageFee`, `additional`, `added_field_1..7` | same date as that month's rent | every month **except the first**, same `≤ asOf` gate | each price |
| `water` | `billingDate(month of billingPeriod)` | one per closing reading whose `billingPeriod` is after the first month | `usage × waterRate + (usage > 0 ? serviceCharge : 0)` |

Water usage walk (readings sorted by `billingPeriod`, baseline
`onEntryMeterReading`):
- `isMeterReset` → no charge; reading becomes the new baseline.
- otherwise `usage = max(0, currentReading − previousBaseline)`, then the
  reading becomes the baseline.
- `billingPeriod: null` readings (opening reading, unclassified) never bill.
- Water has **no** `≤ asOf` gate: measured consumption is always owed, even if
  the lease terminated before that month's billing date.

**The gate is the whole point of `rentDue`.** Until a month's billing date
arrives, that month's rent/extras do not exist in the ledger:

- On July 3 with rentDue 5, the tenant owes nothing for July yet; a payment
  made July 2 shows as **credit (negative balance)** until July 5 posts the
  charges. That is correct, intended display behavior.
- A lease terminated July 4 with rentDue 5 is never billed July rent at all
  (left before it came due). Its measured water still bills.

First month = `arrearsbf + deposit + rent` only — no extras, no water. This
month-1 rule is inherited V1 behavior, deliberately preserved.

## 4. The ledger (`buildLedger`)

Charges and payments merge into one timeline sorted by date
(stable sort; charges are enqueued before payments, so a same-timestamp payment
settles that day's charge rather than preceding it). Each point carries:

```
cumExpected  — all charges up to and including this event
cumCollected — all payments up to and including this event
balance      = cumExpected − cumCollected   (positive = owed, negative = credit)
```

The balance at any date is the tenant's true position **as of that date** —
this is what "does the tenant owe money" means, and it is marked from billing
dates, not month boundaries.

## 5. Monthly summary rows (`getTenantLevelSummaryV2`)

Walk calendar months from `startOfMonth(startDate)` to `asOf`. For month M with
`last` = latest ledger point ≤ end-of-M, and `prevCumCollected` = cumCollected
at end of M−1:

| Field | Definition |
|---|---|
| `expected` | `last.cumExpected − prevCumCollected` = **carry-forward balance + charges posted in M**. This is a *statement* ("pay this to be square"), not new-charges-only. |
| `collected` | `last.cumCollected − prevCumCollected` |
| `balance` | `last.balance` — cumulative position at month end. Always `expected − collected` of the same row. |
| `usage`, `waterCharge`, `serviceCharge`, `previousReading`, `currentReading` | Sum/ends of **all** water events dated in M (`waterCharge` includes the service charge) |
| `rentCharged` | rent actually posted in M (0 while gated / terminated-before-due) |
| `billingDate` | `YYYY-MM-DD` of M's billing date |
| `deposit`, `arrearsbf` | posted amounts, first month only (0 otherwise) |
| `extraCharges` | `{label: amount}` of extras posted in M |
| `payments` | raw payments dated in M |

Identity to remember: `expected(M) = balance(M−1) + newCharges(M)` and
`balance(M) = expected(M) − collected(M)`.

A month with nothing posted yet (current month before its billing date) shows
`expected = carry-forward`, `collected = payments so far`, possibly negative
balance. Numbers are `Math.round`ed at the row level.

## 6. Aggregations

- **House** (`getHouseLevelSummaryV2`): per month, sum `expected/collected/
  balance/usage/waterCharge/serviceCharge` over ACTIVE leases; concat payments.
- **Manager** (`getManagerLevelSummaryV2`): same, over all houses.
- **Monthly report** (`monthlyReportV2`): the tenant row of (year, month) per
  unit — statement semantics (expected includes carry).
- **Yearly report** (`yearlyReportV2`) per unit over a month window `[f..l]`:
  - `totalExpected = expected(f) + Σ_{m>f} (expected(m) − balance(m−1))`
    = carry into the window + new charges inside it,
  - `totalCollected = Σ collected(m)`,
  - `totalBalance = totalExpected − totalCollected` — telescopes to exactly
    `balance(l)`, the true closing position.
  (The pre-fix code summed statement-`expected` directly, double-counting every
  month's carry-forward.)

## 7. Charts / tables / invoice — who reads what

| UI | Endpoint | Fields |
|---|---|---|
| Dashboard charts | `GET payment/summary` | month rows: expected/collected/balance |
| House charts | `GET payment/:houseId/summary` | same |
| Unit bar/area/ledger + LedgerModal | `GET payment/le/:code/summary` | full rows; frontend derives `carryForward = prev balance`, `currentCharges = expected − waterCharge − carryForward` |
| Reports pages | `report/monthly`, `report/yearly` | as in §6 |
| Invoice generator | `/api/invoiceItems` → tenant summary | see §8 |

## 8. Invoice composition (`frontend/src/lib/invoice-items.ts`)

"Comprehensive" invoice for (year, month), from the summary rows alone:

1. **Monthly Rent** — `rentCharged` (falls back to `rentRate` when the row
   predates the field). Omitted only when genuinely not billed (terminated
   before due).
2. **Security Deposit** / **Arrears B/F** — first-month rows only (`deposit`,
   `arrearsbf` fields).
3. **Arrears Balance** — previous row's `balance` if positive. Previous row for
   January is **December of the previous year** (the old code looked in the
   same year — year-boundary bug — and also subtracted rent from it for no
   reason).
4. **Water Charge** — the row's `waterCharge` (already includes service
   charge), with usage/rate/readings shown from the row's meter fields.
5. **Extras** — every entry of `extraCharges`.

**Invariant: invoice total = the row's `expected`** (to rounding). The
generated invoice *is* the month's statement. `dueDate = billingDate`.
Invoice numbers are generated once per invoice (`invoiceNumber`) and displayed
verbatim — never re-randomized at render.

The "utilities → water" invoice lists readings/usage as info lines plus the
water amounts from the same row fields.

## 9. Worked example (verified by `ledger.util.spec.ts`)

Lease: start **Jan 15 2025**, `rentDue 5`, rent 10 000, deposit 5 000,
arrearsbf 2 000, garbage 300, "security" extra 500, waterRate 100,
serviceCharge 200, opening reading 100. Reading logged Mar 3 (130) closing
**February**. Payments: Jan 20 → 17 000, Feb 4 → 10 000, Mar 6 → 4 000.
asOf = Mar 20 2025.

Charge events: arrears 2 000 + deposit 5 000 + rent 10 000 @ **Jan 15**;
rent+garbage+security @ **Feb 5**; water 30 × 100 + 200 = 3 200 @ **Feb 5**;
rent+garbage+security @ **Mar 5**.

| Month | expected | collected | balance | notes |
|---|---|---|---|---|
| Jan | 17 000 | 17 000 | 0 | first month: arrears+deposit+rent, no extras/water |
| Feb | 14 000 | 10 000 | 4 000 | 10 000+300+500+3 200; Feb 4 payment was credit until Feb 5 |
| Mar | 14 800 | 4 000 | 10 800 | carry 4 000 + 10 000 + 800 |

Yearly totals: expected 17 000 + 14 000 + (14 800 − 4 000) = **41 800**
(= every shilling actually charged), collected 31 000, balance **10 800** ✓.

Invoices: Jan = rent 10 000 + deposit 5 000 + arrearsbf 2 000 = 17 000 ✓;
Feb = rent + garbage + security + water = 14 000 ✓;
Mar = rent + arrears 4 000 + garbage + security = 14 800 ✓ — each equals the
row's `expected`.

## 10. Edge-case ledger

| Case | Behavior |
|---|---|
| `rentDue` > days in month | clamped to last day |
| `rentDue` null/0/negative | day 1 (legacy behavior) |
| payment before billing date | credit; negative balance until the date passes |
| termination before month's billing date | that month's rent/extras never billed; water still bills |
| meter reset | no usage billed across the swap; reading becomes baseline |
| reading with `billingPeriod` inside the first month | dropped (month-1 rule) |
| two readings closing the same month | both bill; row water fields are the sums |
| negative usage (typo, not flagged reset) | clamped to 0 |
| same-day charge + payment | charge sorts first; payment settles it |
| rentRate/serviceCharge changes | not versioned — current lease values apply to all history (known limitation, unchanged) |

## 11. Timezone convention

`billingPeriod` is stored as UTC month-start. Billing dates are constructed
with the month/day taken from that UTC value in server-local time, and the
month walk uses server-local boundaries throughout — consistent as long as the
server runs a single timezone (docker: UTC). `readOn` never affects money.
