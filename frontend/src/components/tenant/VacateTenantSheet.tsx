"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/DateInput";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface MoveOut {
  date: string;
  reason: string | null;
  finalReading: number | null;
  depositExpenses: number | null;
  depositExpensesNote: string | null;
  depositRefund: number | null;
}

interface VacateResult {
  message: string;
  depositHeld: number;
  owedAtMoveOut: number;
  balance: number;
}

interface VacateTenantSheetProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  tenantId: string;
  waterBilled: boolean;
  /** A past tenant's saved move-out: the sheet then corrects it instead of vacating. */
  initial?: MoveOut;
  onDone: () => void;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const kes = (n: number) => `KES ${n.toLocaleString()}`;
const text = (n: number | null | undefined) => (n == null ? "" : String(n));

export default function VacateTenantSheet({
  open,
  onOpenChange,
  tenantId,
  waterBilled,
  initial,
  onDone,
}: VacateTenantSheetProps) {
  const [date, setDate] = useState(today());
  const [finalReading, setFinalReading] = useState("");
  const [reason, setReason] = useState("");
  const [expenses, setExpenses] = useState("");
  const [expensesNote, setExpensesNote] = useState("");
  const [refund, setRefund] = useState("");
  const [result, setResult] = useState<VacateResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(initial?.date ?? today());
    setFinalReading(text(initial?.finalReading));
    setReason(initial?.reason ?? "");
    setExpenses(text(initial?.depositExpenses));
    setExpensesNote(initial?.depositExpensesNote ?? "");
    setRefund(text(initial?.depositRefund));
    setResult(null);
  }, [open, initial]);

  const changed = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setResult(null);
  };
  const ready = !!date && (!waterBilled || !!initial || finalReading !== "");

  const send = async (preview: boolean): Promise<VacateResult> => {
    setBusy(true);
    try {
      const res = await fetch(`/api/tenant/vacate/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminationDate: date,
          reason,
          finalReading: finalReading === "" ? null : Number(finalReading),
          depositExpenses: Number(expenses) || null,
          depositExpensesNote: expensesNote,
          depositRefund: Number(refund) || null,
          preview,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the move-out.");
      return json;
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    try {
      setResult(await send(true));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const confirm = async () => {
    try {
      toast.success((await send(false)).message);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const owed = Math.max(result?.owedAtMoveOut ?? 0, 0);
  const left = (result?.depositHeld ?? 0) - (Number(expenses) || 0) - (Number(refund) || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[500px] flex flex-col p-4 sm:p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">{initial ? "Edit Move-out" : "Terminate Lease"}</SheetTitle>
          <SheetDescription>
            On the move-out day the deposit goes back to the tenant. Say what was spent from it and what was
            refunded; the rest clears what they owe.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="moveOutDate">Move-out date</Label>
              <DateInput id="moveOutDate" max={today()} value={date} onChange={changed(setDate)} />
            </div>
            {(waterBilled || finalReading !== "") && (
              <div>
                <Label htmlFor="finalReading">Final meter reading</Label>
                <Input
                  id="finalReading"
                  type="number"
                  min={0}
                  value={finalReading}
                  onChange={(e) => changed(setFinalReading)(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="moveOutReason">Reason for leaving (optional)</Label>
            <Textarea id="moveOutReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <Label>Deposit</Label>
            <div className="grid grid-cols-[8rem_1fr] gap-3">
              <div>
                <Label htmlFor="depositExpenses" className="text-xs text-muted-foreground">Used for expenses</Label>
                <Input
                  id="depositExpenses"
                  type="number"
                  min={0}
                  value={expenses}
                  onChange={(e) => changed(setExpenses)(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="depositExpensesNote" className="text-xs text-muted-foreground">What for</Label>
                <Input
                  id="depositExpensesNote"
                  placeholder="e.g. 5000 painting, new door"
                  value={expensesNote}
                  onChange={(e) => setExpensesNote(e.target.value)}
                />
              </div>
            </div>
            <div className="w-32">
              <Label htmlFor="depositRefund" className="text-xs text-muted-foreground">Refunded to tenant</Label>
              <Input
                id="depositRefund"
                type="number"
                min={0}
                value={refund}
                onChange={(e) => changed(setRefund)(e.target.value)}
              />
            </div>

            {result && (
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t pt-3 tabular-nums">
                <dt>Deposit held</dt>
                <dd className="text-right">{kes(result.depositHeld)}</dd>
                <dt>Owes at move-out</dt>
                <dd className="text-right">{kes(result.owedAtMoveOut)}</dd>
                <dt>Clears their balance</dt>
                <dd className="text-right">{kes(Math.min(owed, Math.max(left, 0)))}</dd>
                <dt>Still owed to tenant</dt>
                <dd className="text-right">{kes(Math.max(left - owed, 0))}</dd>
                <dt className="font-medium">Balance now</dt>
                <dd className="text-right font-medium">
                  {result.balance > 0
                    ? `Owes ${kes(result.balance)}`
                    : result.balance < 0
                      ? `In credit ${kes(-result.balance)}`
                      : "Settled"}
                </dd>
              </dl>
            )}
          </div>
        </div>

        <SheetFooter className="mt-4 border-t pt-4 flex-row justify-end gap-2">
          <Button variant="outline" disabled={!ready || busy} onClick={preview}>
            Preview
          </Button>
          <Button disabled={!result || busy} onClick={confirm}>
            {initial ? "Save" : "Vacate"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
