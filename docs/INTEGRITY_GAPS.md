# Integrity gaps

What stands between this system and one you could hand to an auditor. None of these are
caused by the ledger performance work; that work does not reach them. Ordered by value.

Verified 2026-09-20 against the code, not from memory.

## 1. The write path is unauthenticated

No controller applies a JWT guard. `grep -rn "UseGuards" backend/src` returns exactly one
hit, `PermissionsGuard` on `house.controller.ts:20`, and that guard checks permissions
without first validating a token. The frontend gate at `frontend/src/proxy.ts` is never
invoked because Next.js only runs `src/middleware.ts`, which does not exist. No API proxy
route forwards the auth cookie.

Anyone who can reach the backend can create, edit or delete a payment.

## 2. Posted money is mutable and erasable with no trace

`payment.update` (`payment.service.ts:818`) takes a raw update input, and `remove` (`:837`)
and `deleteMany` (`:1412`) delete rows outright. There is no reversal entry, no history
table and no record of who changed what. `updatedAt` is a Prisma client-side `@updatedAt`,
so a direct SQL edit does not move it, and a delete leaves nothing at all.

A wrong number can be introduced and then be undiscoverable.

**Fix shape:** make payments append-only. A correction posts a reversing row referencing
the original instead of overwriting it. The ledger already sums events, so it needs no
change to understand a negative entry.

## 3. Request bodies go straight to the database

`main.ts` installs no `ValidationPipe` and the create/update DTOs are passthrough, so
unexpected and nested relation writes are reachable. `tenant.controller.ts:201` passes a
raw body into `lease.update` from inside the controller.

## 4. The ledger is one-sided, so errors are correctable but not detectable

Charges on one side, payments on the other, and a running difference. There is no
double-entry and no control total that must balance, so nothing in the system can tell you
that a figure is wrong. Everything downstream trusts the rows.

## 5. Known-bad rows are still in the data

24 payments are dated before their lease's opening month. Three carry impossible years
(0001, 0006, 0025) and permanently anchor those ledgers; about five are genuinely attached
to the wrong tenant, the worst being lease `l5730` holding KSH 80,950 of a previous
tenant's rent. `createPayment` still binds to whichever lease is ACTIVE without checking
that the payment date falls inside that lease's period.

## 6. A property's history changes retroactively when a tenant leaves

House and manager aggregates count only `status: 'ACTIVE'` leases
(`payment.service.ts:2190`). Vacating a tenant removes that lease's entire history from
every chart and report. A vacated tenant's past months genuinely happened. The fix is to
aggregate over all leases and filter at read time, with status as a dimension.

## 7. The entered-on date is recorded but never used

Every payment stores both when the money moved (`date`) and when it was keyed in
(`cretedAt`, sic). That is the raw material for answering "what did we believe March's
balance was, back in March" — the question that matters when something is entered a year
late. Nothing reads the second field today.

## 8. Smaller items

- Money is stored as `Float` across 34 columns, so sums are order-dependent.
- `payment.id` and `MeterReading.id` are 32-bit and stop at 2.1 billion rows.
- Lease codes are `l${houseId}${sequence}` with no separator, so they can collide; a
  lookup by code could return another tenant's ledger. None collide today.
- `main.ts:18` logs every request's headers, cookies included.
- Test coverage outside `ledger.util.spec.ts` is Nest scaffolding.
- Single backend instance, no health check, no restore drill.
