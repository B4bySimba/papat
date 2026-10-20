"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface UnitRow {
  unitNumber: string;
  tenantName: string;
  movedOut: boolean;
  expected: number;
  collected: number;
  balance: number;
}

interface Props {
  houseId: string;
  year: string;
  month: string | null;
  pastTenants: boolean;
  onClose: () => void;
}

const amount = (value: number) => value.toLocaleString();
const credit = (value: number) => (value < 0 ? "text-green-600" : "");
const sum = (rows: UnitRow[], key: "expected" | "collected" | "balance") => rows.reduce((s, r) => s + r[key], 0);

/** One bar of the property chart split by unit; the rows add up to the bar, so credits that lower it show. */
export default function MonthUnitsDialog({ houseId, year, month, pastTenants, onClose }: Props) {
  const [rows, setRows] = useState<UnitRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return;
    const controller = new AbortController();
    setRows(null);
    setError(null);
    const query = new URLSearchParams({ houseId, year, month });
    if (pastTenants) query.set("pastTenants", "1");
    fetch(`/api/payment/house-units?${query}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Could not load the units (${res.status}).`))))
      .then(setRows)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [houseId, year, month, pastTenants]);

  const owing = rows?.filter((r) => r.expected > 0) ?? [];
  const ahead = rows?.filter((r) => r.expected < 0) ?? [];
  const summary = rows
    ? `${owing.length} ${owing.length === 1 ? "unit owes" : "units owe"} ${amount(sum(owing, "expected"))}` +
      (ahead.length
        ? ` and ${ahead.length} ${ahead.length === 1 ? "has" : "have"} paid ahead by ${amount(-sum(ahead, "expected"))} (in green)`
        : "") +
      `, so the property's expected is ${amount(sum(rows, "expected"))}.`
    : "Each unit's expected, collected and balance for the month.";

  return (
    <Dialog open={month !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-3 p-4 sm:max-h-[85vh] sm:max-w-3xl sm:gap-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">
            {month} {year} by unit
          </DialogTitle>
          <DialogDescription className="text-left">{summary}</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 overflow-y-auto px-1">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !rows ? (
            <div aria-busy="true">
              <ul className="space-y-2 md:hidden">
                {["w-28", "w-24", "w-32", "w-20", "w-28"].map((width, i) => (
                  <li key={i} className="rounded-xl border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className={`h-3.5 ${width}`} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((j) => (
                        <div key={j} className="space-y-1.5">
                          <Skeleton className="h-2.5 w-12" />
                          <Skeleton className="h-4 w-14" />
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <div className="grid h-10 grid-cols-[4rem_1fr_6rem_6rem_6rem] items-center gap-2 border-b px-2">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="ml-auto h-3 w-14" />
                  <Skeleton className="ml-auto h-3 w-14" />
                  <Skeleton className="ml-auto h-3 w-14" />
                </div>
                {["w-28", "w-24", "w-32", "w-20", "w-28", "w-24"].map((width, i) => (
                  <div key={i} className="grid h-[37px] grid-cols-[4rem_1fr_6rem_6rem_6rem] items-center gap-2 border-b px-2">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className={`h-4 ${width}`} />
                    <Skeleton className="ml-auto h-4 w-14" />
                    <Skeleton className="ml-auto h-4 w-14" />
                    <Skeleton className="ml-auto h-4 w-14" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
            <ul className="space-y-2 md:hidden">
              {rows.map((r, i) => (
                <li key={`${r.unitNumber}-${i}`} className="rounded-xl border bg-card p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-semibold">{r.unitNumber}</span>
                    <span className="min-w-0 truncate text-sm text-muted-foreground">
                      {r.tenantName}
                      {r.movedOut && " (moved out)"}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    {(["expected", "collected", "balance"] as const).map((key) => (
                      <div key={key} className="min-w-0">
                        <dt className="text-[11px] capitalize text-muted-foreground">{key}</dt>
                        <dd className={`truncate font-medium tabular-nums ${key === "collected" ? "" : credit(r[key])}`}>
                          {amount(r[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
              <li className="sticky bottom-0 rounded-xl border bg-muted p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
                <dl className="mt-1 grid grid-cols-3 gap-2 text-sm">
                  {(["expected", "collected", "balance"] as const).map((key) => (
                    <div key={key} className="min-w-0">
                      <dt className="text-[11px] capitalize text-muted-foreground">{key}</dt>
                      <dd className={`truncate font-semibold tabular-nums ${key === "collected" ? "" : credit(sum(rows, key))}`}>
                        {amount(sum(rows, key))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            </ul>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.unitNumber}-${i}`}>
                    <TableCell className="font-medium">{r.unitNumber}</TableCell>
                    <TableCell>
                      {r.tenantName}
                      {r.movedOut && <span className="text-muted-foreground"> (moved out)</span>}
                    </TableCell>
                    <TableCell className={`text-right ${credit(r.expected)}`}>{amount(r.expected)}</TableCell>
                    <TableCell className="text-right">{amount(r.collected)}</TableCell>
                    <TableCell className={`text-right ${credit(r.balance)}`}>{amount(r.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className={`text-right ${credit(sum(rows, "expected"))}`}>
                    {amount(sum(rows, "expected"))}
                  </TableCell>
                  <TableCell className="text-right">{amount(sum(rows, "collected"))}</TableCell>
                  <TableCell className={`text-right ${credit(sum(rows, "balance"))}`}>
                    {amount(sum(rows, "balance"))}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
