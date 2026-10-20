"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AMOUNT_FIELDS,
  describeChange,
  EXTRA_FIELDS,
  Impact,
  monthLabel,
  nextMonth,
  Terms,
  toTerms,
} from "@/lib/rates";
import { SkeletonRateForm } from "@/components/skeleton/form";

interface LeaseTerms {
  startMonth: string;
  endMonth: string | null;
  terms: Terms;
  changes: { month: string; note: string | null; fields: Terms }[];
}

interface Props {
  leaseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function RateChangeSheet({ leaseId, open, onOpenChange, onSaved }: Props) {
  const [month, setMonth] = useState(nextMonth());
  const [data, setData] = useState<LeaseTerms | null>(null);
  const [form, setForm] = useState<Terms>({});
  const [unitDeposit, setUnitDeposit] = useState("");
  const [note, setNote] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/rates/lease/${leaseId}?month=${month}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setData(json);
        setForm(json.terms);
        setImpact(null);
        setRemoving(null);
      })
      .catch(() => toast.error("Could not load the current charges."));
  }, [open, leaseId, month, version]);

  const edit = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setImpact(null);
  };

  // Shown: the extras this lease has, plus one empty slot to add another.
  const extras = data
    ? EXTRA_FIELDS.filter(([label, amount]) => data.terms[label] || data.terms[amount])
    : [];
  const spare = data && EXTRA_FIELDS.slice(1).find(([label, amount]) => !data.terms[label] && !data.terms[amount]);

  const send = async (preview: boolean): Promise<Impact> => {
    const body = removing
      ? { month: removing, remove: true }
      : { month, fields: toTerms(form), unitDeposit: unitDeposit === "" ? null : Number(unitDeposit), note };
    setBusy(true);
    try {
      const res = await fetch(`/api/rates/lease/${leaseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, preview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save the change.");
      return json;
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    try {
      setImpact(await send(true));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const confirm = async () => {
    try {
      await send(false);
      toast.success(removing ? `Removed the change from ${monthLabel(removing)}.` : `Saved from ${monthLabel(month)}.`);
      setUnitDeposit("");
      setNote("");
      setVersion((v) => v + 1);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[500px] flex flex-col p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">Change rent or charges</SheetTitle>
          <SheetDescription>
            A change applies from the month you pick until the next change. Earlier months stay as they were.
          </SheetDescription>
        </SheetHeader>

        {!data ? (
          <SkeletonRateForm amounts={AMOUNT_FIELDS.length} columns={2} />
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-2 text-sm">
            <div>
              <Label htmlFor="rate-month">From month</Label>
              <Input
                id="rate-month"
                type="month"
                value={month}
                min={data.startMonth}
                max={data.endMonth ?? undefined}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
              />
              {month === data.startMonth && (
                <p className="text-xs text-muted-foreground mt-1">
                  This is the move-in month, so the change corrects every month.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AMOUNT_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`rate-${key}`}>{label}</Label>
                  <Input
                    id={`rate-${key}`}
                    type="number"
                    min={0}
                    value={form[key] ?? ""}
                    onChange={(e) => edit(key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Other monthly charges</h3>
              {[...extras, ...(spare ? [spare] : [])].map(([label, amount]) => (
                <div key={label} className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Name, e.g. Security"
                    value={form[label] ?? ""}
                    onChange={(e) => edit(label, e.target.value)}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Amount"
                    value={form[amount] ?? ""}
                    onChange={(e) => edit(amount, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="rate-deposit">New deposit for the next tenant (optional)</Label>
              <Input
                id="rate-deposit"
                type="number"
                min={0}
                value={unitDeposit}
                onChange={(e) => {
                  setUnitDeposit(e.target.value);
                  setImpact(null);
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This tenant is not charged anything extra; their own deposit stays as it is.
              </p>
            </div>

            <div>
              <Label htmlFor="rate-note">Note (optional)</Label>
              <Textarea id="rate-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {data.changes.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Saved changes</h3>
                {data.changes.map((change) => (
                  <div key={change.month} className="flex items-start justify-between gap-2 rounded-md border p-2">
                    <div>
                      <div className="font-medium">
                        From {monthLabel(change.month)}: {describeChange(change.fields, data.terms)}
                      </div>
                      {change.note && <div className="text-xs text-muted-foreground">{change.note}</div>}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRemoving(change.month);
                        setImpact(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {impact && <ImpactSummary impact={impact} />}
          </div>
        )}

        <SheetFooter className="mt-4 border-t pt-4 flex-col gap-2">
          {removing && (
            <p className="text-sm">
              Removing the change from {monthLabel(removing)}.{" "}
              <button
                className="underline"
                onClick={() => {
                  setRemoving(null);
                  setImpact(null);
                }}
              >
                Keep it
              </button>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={!data || busy} onClick={preview}>
              Preview
            </Button>
            <Button disabled={!impact || busy} onClick={confirm}>
              {removing ? "Confirm removal" : "Confirm"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** What saving will do: the months whose charges change, and the balance today before and after. */
function ImpactSummary({ impact }: { impact: Impact }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 space-y-1">
      {impact.months.length ? (
        impact.months.map((m) => (
          <div key={m.month} className="flex justify-between">
            <span>{m.month}</span>
            <span>
              KES {m.before.toLocaleString()} → {m.after.toLocaleString()}
            </span>
          </div>
        ))
      ) : (
        <div>No month billed so far changes; it applies when its month comes.</div>
      )}
      <div className="font-medium pt-1">
        Balance today: KES {impact.balanceBefore.toLocaleString()} → {impact.balanceAfter.toLocaleString()}
      </div>
    </div>
  );
}
