"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {month} {year} by unit
          </DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !rows ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
