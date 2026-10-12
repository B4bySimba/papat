# Papat Billing Model (V2: event ledger)

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

Everything is computed **from scratch on every request** from these sources of
truth. Nothing is stored derived; there is no "posted invoice" table.

| Source | Fields that matter |
|---|---|
| `Lease` | `startDate` (billing begins), `terminationDate` (billing ends; else "now"), `rentDue` (day-of-month the bill is due, e.g. `5`), `rentRate`, `deposit`, `arrearsbf`, `onEntryMeterReading`, `waterRate`, `serviceCharge`, `garbageFee`, `additional`+`additionalCharges`, `added_field_1..7`+`_price` (the monthly terms here are the **move-in** terms), `movedFromLeaseId` (set when the tenant moved here from another unit) |
| `RateChange` | `month` (`"YYYY-MM"`) plus any monthly term above; null means unchanged. Rows with `leaseId` change one tenancy from that month on; rows with `houseId` are a property's schedule, copied to tenants who move in later. See §12 |
| `MeterReading` | `currentReading` (odometer), `billingPeriod` (**the** month this reading closes; `null` = opening/unassigned → never billed), `isMeterReset` (new physical meter → becomes baseline, no usage billed), `readOn` (log time only, **not used** by billing) |
| `payment` | `amount`, `date` |
| Clock | `asOf = lease.terminationDate ?? now` |

`moveInDate`, `endDate`, `Unit.deposit` are **not** used by V2 billing
(the lease's own `deposit` is the one charged).

## 2. Posting date and due date

A month's charges **post on the 1st** (the start date in the lease's first
month), so the ledger, charts and reports show them from the 1st. Each month
also has a **due date**:

```
billingDate(M) = day `rentDue` of M, clamped into the month
```

- `rentDue = 31` in February → Feb 28/29. `rentDue` missing/0/invalid → day 1.
- **First month only:** the due date can't precede the tenancy:
  `max(startDate, billingDate(startMonth))`.
- The due date decides two things: an invoice is due on it (and says its
  amount is as of that date), and a tenant who **moves out before it** is not
  charged that month's rent/extras.

Rent is **in advance**: month M's rent pays for M.

## 3. Charge events (`generateCharges`)

The lease is unrolled into dated charge events, each posted only once its date
is reached (`≤ asOf`):

| Charge | Date | Months | Amount |
|---|---|---|---|
| `arrearsbf` | `startDate` | once | `lease.arrearsbf` |
| `deposit` | `startDate` | once | `lease.deposit` |
| `rent` | the 1st of M (first month: `startDate`) | every month, unless the tenant moved out before M's due date | `rentRate` in force in M |
| extras: `garbageFee`, `additional`, `added_field_1..7` | same date as that month's rent | every month **except the first**, same rule | each price in force in M |
| `water` | the 1st of the month **after** the reading's `billingPeriod`, or the move-out date if earlier | one per closing reading whose `billingPeriod` is in or after the first month | `usage × waterRate + (usage > 0 ? serviceCharge : 0)`, at the rates in force in the month it is **billed** |
| `transfer` | move day (see §12) | only for a tenant who moved units | the balance carried across |

"In force in M" means the move-in terms with every `RateChange` up to M applied
(`termsAt`), so the due date in M uses M's `rentDue` too.

Water used in month M can only be measured once M is over, so it is billed with
M+1's charges: the first month has no water, and its usage bills in month 2.
Usage walk (readings sorted by `billingPeriod`, baseline `onEntryMeterReading`):
- `isMeterReset` → no charge; reading becomes the new baseline.
- otherwise `usage = max(0, currentReading − previousBaseline)`, then the
  reading becomes the baseline.
- `billingPeriod` before the tenancy → no charge, but it sets the baseline.
- `billingPeriod: null` readings (opening reading, unclassified) never bill.
- At move-out, water not yet billed posts on the move-out date; after that the
  tenant's maths halts.

Examples (rentDue 5): on July 3 July's charges are already in the ledger, so a
July 2 payment simply reduces what is owed. A lease terminated July 4 is never
charged July rent (left before it came due); its measured water still bills.

First month = `arrearsbf + deposit + rent` only: no extras, no water.

## 4. The ledger (`buildLedger`)

Charges and payments merge into one timeline sorted by date
(stable sort; charges are enqueued before payments, so a same-timestamp payment
settles that day's charge rather than preceding it). Each point carries:

```
cumExpected  : all charges up to and including this event
cumCollected : all payments up to and including this event
balance      = cumExpected − cumCollected   (positive = owed, negative = credit)
```

The balance at any date is the tenant's true position **as of that date**;
this is what "does the tenant owe money" means.

## 5. Monthly summary rows (`getTenantLevelSummaryV2`)

Walk calendar months from `startOfMonth(startDate)` to `asOf`. For month M with
`last` = latest ledger point ≤ end-of-M, and `prevCumCollected` = cumCollected
at end of M−1:

| Field | Definition |
|---|---|
| `expected` | `last.cumExpected − prevCumCollected` = **carry-forward balance + charges posted in M**. This is a *statement* ("pay this to be square"), not new-charges-only. |
| `collected` | `last.cumCollected − prevCumCollected` |
| `balance` | `last.balance`: cumulative position at month end. Always `expected − collected` of the same row. |
| `carryForward` | previous row's `balance` |
| `currentCharges` | `expected − carryForward`: everything posted in M, water included |
| `usage`, `waterCharge`, `serviceCharge`, `previousReading`, `currentReading` | Sum/ends of **all** water events dated in M, i.e. last month's usage (`waterCharge` includes the service charge) |
| `rentCharged` | rent actually posted in M (0 when the tenant left before the due date) |
| `billingDate` | `YYYY-MM-DD` of M's due date |
| `deposit`, `arrearsbf` | posted amounts, first month only (0 otherwise) |
| `extraCharges` | `{label: amount}` of extras posted in M |
| `rentRate`, `waterRate` | the rates in force in M (after move-out: the final ones) |
| `transfer`, `transferNote` | balance moved out (negative) or brought in (positive) in M, e.g. "Moved to unit 7"; 0 and null otherwise |
| `payments` | raw payments dated in M |

Identity to remember: `expected(M) = carryForward(M) + currentCharges(M)` and
`balance(M) = expected(M) − collected(M)`.

Numbers are `Math.round`ed at the row level. With fixed inputs, advancing the
clock only appends months; a month never changes once it appears (tested).
Payments dated after the last row (typed in the future) are not counted; they
are listed by `GET payment/future-dated` and flagged on the dashboard, the
tenant's page and the transactions list.

## 6. Aggregations

- **House** (`getHouseLevelSummaryV2`): per month, sum `expected/collected/
  balance/usage/waterCharge/serviceCharge` over every lease that has a row that
  month (a tenant's rows stop at move-out). `includePastTenantsData=true` runs a
  past tenant's rows on to today with no new charges, so what they still owe
  (and anything they pay later) stays in the totals (the "Include past tenants"
  switch on the dashboard and property pages).
- **Manager** (`getManagerLevelSummaryV2`): same, over all houses.
- **Monthly report** (`monthlyReportV2`): the tenant row of (year, month) per
  unit, with statement semantics (expected includes carry).
- **Reports** list one row per unit: the current tenant by default, every
  tenant who occupied the unit with `includePastTenantsData=true` (Rate is then
  the latest tenant's rent).
- **Yearly report** (`yearlyReportV2`) per lease over a month window `[f..l]`,
  then summed per unit:
  - `totalExpected = expected(f) + Σ_{m>f} (expected(m) − balance(m−1))`
    = carry into the window + new charges inside it,
  - `totalCollected = Σ collected(m)`,
  - `totalBalance = totalExpected − totalCollected`, which telescopes to exactly
    `balance(l)`, the true closing position.
  (The pre-fix code summed statement-`expected` directly, double-counting every
  month's carry-forward.)

## 7. Charts, tables, invoice: who reads what

| UI | Endpoint | Fields |
|---|---|---|
| Dashboard charts | `GET payment/summary` | month rows: expected/collected/balance |
| House charts | `GET payment/:houseId/summary` | same |
| Unit bar/area/ledger + LedgerModal | `GET payment/le/:code/summary` | full rows, including `carryForward` and `currentCharges` |
| Reports pages | `report/monthly`, `report/yearly` | as in §6 |
| Invoice generator | `/api/invoiceItems` → tenant summary | see §8 |

## 8. Invoice composition (`frontend/src/lib/invoice-items.ts`)

"Comprehensive" invoice for (year, month), from the summary rows alone:

1. **Monthly Rent**: `rentCharged` (falls back to `rentRate` when the row
   predates the field). Omitted only when genuinely not billed (terminated
   before due).
2. **Security Deposit** / **Arrears B/F**: first-month rows only (`deposit`,
   `arrearsbf` fields). A negative deposit (a move's deposit credit) shows as
   **Deposit Credit**.
3. **Arrears Balance**: previous row's `balance` if positive. Previous row for
   January is **December of the previous year** (the old code looked in the
   same year, a year-boundary bug, and also subtracted rent from it for no
   reason).
4. **Water Charge**: the row's `waterCharge` (already includes service
   charge), with usage/rate/readings shown from the row's meter fields.
5. **Extras**: every entry of `extraCharges`.
6. **Transfer**: the row's `transfer` under its `transferNote` ("Moved to
   unit 7" / "Brought from unit 3").

**Invariant: invoice total = the row's `expected`** (to rounding). The
generated invoice *is* the month's statement. `dueDate = billingDate`, and the
printed invoice states that the expected amount is as of that due date.
Invoice numbers are generated once per invoice (`invoiceNumber`) and displayed
verbatim, never re-randomized at render.

The "utilities → water" invoice lists readings/usage as info lines plus the
water amounts from the same row fields.

## 9. Worked example (verified by `ledger.util.spec.ts`)

Lease: start **Jan 15 2025**, `rentDue 5`, rent 10 000, deposit 5 000,
arrearsbf 2 000, garbage 300, "security" extra 500, waterRate 100,
serviceCharge 200, opening reading 100. Reading logged Mar 3 (130) closing
**February**. Payments: Jan 20 → 17 000, Feb 4 → 10 000, Mar 6 → 4 000.
asOf = Mar 20 2025.

Charge events: arrears 2 000 + deposit 5 000 + rent 10 000 @ **Jan 15**;
rent+garbage+security @ **Feb 1**; rent+garbage+security @ **Mar 1**, plus
February's water 30 × 100 + 200 = 3 200 @ **Mar 1**.

| Month | carry fwd | charges | expected | collected | balance | notes |
|---|---|---|---|---|---|---|
| Jan | 0 | 17 000 | 17 000 | 17 000 | 0 | first month: arrears+deposit+rent, no extras/water |
| Feb | 0 | 10 800 | 10 800 | 10 000 | 800 | 10 000+300+500; no water measured yet |
| Mar | 800 | 14 000 | 14 800 | 4 000 | 10 800 | 10 000+300+500 + February water 3 200 |

Yearly totals: expected 17 000 + 10 800 + (14 800 − 800) = **41 800**
(= every shilling actually charged), collected 31 000, balance **10 800** ✓.

Invoices: Jan = rent 10 000 + deposit 5 000 + arrearsbf 2 000 = 17 000 ✓;
Feb = rent + garbage + security = 10 800 ✓;
Mar = rent + arrears 800 + water + garbage + security = 14 800 ✓. Each equals
the row's `expected`.

## 10. Edge-case ledger

| Case | Behavior |
|---|---|
| `rentDue` > days in month | clamped to last day |
| `rentDue` null/0/negative | day 1 (legacy behavior) |
| payment early in the month | reduces what is owed; the month's charges posted on the 1st |
| termination before month's due date | that month's rent/extras never billed; unbilled water posts on the move-out date |
| meter reset | no usage billed across the swap; reading becomes baseline |
| reading with `billingPeriod` inside the first month | billed with month 2's charges |
| payment dated in the future | not counted; flagged for someone to check the date |
| two readings closing the same month | both bill; row water fields are the sums |
| negative usage (typo, not flagged reset) | clamped to 0 |
| same-day charge + payment | charge sorts first; payment settles it |
| a monthly term changes | applies from its month (whole months) until the next change; earlier months never change; the move-in month corrects every month (§12) |

## 11. Timezone convention

The engine reads every date with server-local getters, so the backend must run
in Africa/Nairobi (`main.ts` refuses to start otherwise; Docker sets `TZ`).
`billingPeriod` is written as the Nairobi month start (`parseMonth`). The meter
form requires it ("For Month") except for an opening reading. `readOn` never
affects money.

## 12. Changes and moves

**Changing a term.** A change sets any monthly term from a chosen month (always
from the 1st) until the next change. Only the fields that differ from the terms
in force just before that month are stored, so a change saved later never
undoes an earlier one (rent from January and garbage from November both hold).
Picking the move-in month corrects the lease's own terms for every month.
Changes can be back-dated or recorded ahead: they apply whenever their month is
reached, because nothing is stored derived. The form previews the effect by
running the real save in a transaction and rolling it back.

A sitting tenant's rent change also sets the unit's rent (the next tenant's
pre-fill). A new deposit entered with it only goes on the unit; the sitting
tenant is never charged a top-up.

Example (rent 10 000 + garbage 300, rent to 11 000 from March, tenant pays
10 300 a month):

| Month | Carry fwd | Rent | Charges | Expected | Paid | Balance |
|---|---|---|---|---|---|---|
| Jan | 0 | 10 000 | 20 000 | 20 000 | 20 000 | 0 |
| Feb | 0 | 10 000 | 10 300 | 10 300 | 10 300 | 0 |
| Mar | 0 | 11 000 | 11 300 | 11 300 | 10 300 | 1 000 |
| Apr | 1 000 | 11 000 | 11 300 | 12 300 | 10 300 | 2 000 |

Water uses the rate in force when the bill goes out: with the water rate going
from 100 to 120 in March, February's 20 units billed on 1 March cost
20 × 120 + 200 = 2 600.

**Property-wide change.** Saves the property's own row (its schedule), then the
same change for every ticked current tenant, plus any new unit rents (vacant
units included). Tenants only receive the terms this change sets or undoes, so
a later water change leaves an unticked garbage deal alone. A tenant who moved
in after the chosen month gets it from their move-in month. A tenant added later
starts on the property's terms in force at their start and receives the
property's later scheduled changes as their own.

**Moving units** (same property). The old lease ends on the move day and a new
tenant record and lease start on the new unit, linked by `movedFromLeaseId`:

- The old unit skips the move month's rent and extras but still bills its water
  (the previous month's on the 1st, and a final reading on the move day).
- At the end of the move day the old lease posts a transfer of minus what was
  owed (`moveOutBalance`: all charges less every payment up to that day), so it
  closes at exactly 0. The new lease posts the same amount on its start date.
  Both read it live, so a later edit on the old lease still carries across.
- The new unit bills the move month's rent and its extras (the "no extras in
  the first month" rule does not apply to a moved tenant), on the new unit's
  normal charges.
- The new lease's `deposit` holds only what the move charged: 0 when the deposit
  moves as it is, or the difference (negative when it is a credit). The deposit
  held is the sum along the chain of moves.
- Payments already entered for dates after the move go to the new lease.

Example: owes 4 000 at the end of February, moves from unit 3 to unit 7 on
15 March; February's water 500 and the final reading's 300 bill on unit 3:

| Unit | Month | Carry fwd | Charges | Transfer | Expected | Balance |
|---|---|---|---|---|---|---|
| 3 | Mar | 4 000 | 800 | -4 800 | 0 | 0 |
| 7 | Mar | 0 | 12 300 (rent + garbage) | 4 800 | 17 100 | 17 100 |
