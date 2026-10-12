"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AMOUNT_FIELDS, EXTRA_FIELDS, Impact, monthLabel, nextMonth, Terms, toTerms } from "@/lib/rates";

interface UnitRow {
  unitId: string;
  number: string;
  tenant: string | null;
  rentRate: number;
  terms: Terms | null;
}

type TenantImpact = Impact & { unit: string; tenant: string };

/** Rent is per unit and the additional charge belongs to the unit, so the shared form leaves them out. */
const SHARED_AMOUNTS = AMOUNT_FIELDS.filter(([key]) => key !== "rentRate" && key !== "rentDue");
const SHARED_EXTRAS = EXTRA_FIELDS.slice(1);

interface Props {
  houseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PropertyRatesSheet({ houseId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(nextMonth());
  const [terms, setTerms] = useState<Terms | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [form, setForm] = useState<Terms>({});
  const [rents, setRents] = useState<Record<string, string>>({});
  const [skip, setSkip] = useState<Record<string, boolean>>({});
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");
  const [impact, setImpact] = useState<TenantImpact[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/rates/house/${houseId}?month=${month}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setTerms(json.terms);
        setUnits(json.units);
        setForm(json.terms);
        setRents(Object.fromEntries(json.units.map((u: UnitRow) => [u.unitId, String(u.rentRate)])));
        setSkip({});
        setImpact(null);
      })
      .catch(() => toast.error("Could not load the property's charges."));
  }, [open, houseId, month, version]);

  const changed = () => setImpact(null);
  const edit = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    changed();
  };

  // Shown: the extras the property has, plus one empty slot to add another.
  const extras = terms ? SHARED_EXTRAS.filter(([label, amount]) => terms[label] || terms[amount]) : [];
  const spare = terms && SHARED_EXTRAS.find(([label, amount]) => !terms[label] && !terms[amount]);

  const raiseRents = () => {
    const p = Number(percent);
    if (!p) return;
    setRents(Object.fromEntries(units.map((u) => [u.unitId, String(Math.round((u.rentRate * (1 + p / 100)) / 100) * 100)])));
    changed();
  };

  // A tenant's own charges that differ from the property's, so staff can untick a special deal.
  const ownDeal = (unit: UnitRow) =>
    unit.terms && terms
      ? SHARED_AMOUNTS.filter(([key]) => Number(unit.terms![key] ?? 0) !== Number(terms[key] ?? 0))
          .map(([key, label]) => `${label} ${Number(unit.terms![key] ?? 0).toLocaleString()}`)
          .join(", ")
      : "";

  const send = async (preview: boolean): Promise<TenantImpact[]> => {
    setBusy(true);
    try {
      const res = await fetch(`/api/rates/house/${houseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          fields: toTerms(form),
          rents: Object.fromEntries(
            units.filter((u) => Number(rents[u.unitId]) !== u.rentRate).map((u) => [u.unitId, Number(rents[u.unitId]) || 0])
          ),
          skip: Object.keys(skip).filter((unitId) => skip[unitId]),
          note,
          preview,
        }),
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
      toast.success(`Saved for the whole property from ${monthLabel(month)}.`);
      setNote("");
      setVersion((v) => v + 1);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const touched = impact?.filter((row) => row.months.length) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[640px] sm:max-w-[640px] flex flex-col p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">Change charges for all units</SheetTitle>
          <SheetDescription>
            Applies to every ticked tenant from the month you pick, and to tenants who move in later. Earlier
            months stay as they were.
          </SheetDescription>
        </SheetHeader>

        {!terms ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-2 text-sm">
            <div>
              <Label htmlFor="house-month">From month</Label>
              <Input id="house-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SHARED_AMOUNTS.map(([key, label]) => (
                <div key={key}>
                  <Label htmlFor={`house-${key}`}>{label}</Label>
                  <Input
                    id={`house-${key}`}
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

            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div>
                  <Label htmlFor="house-percent">Raise every rent by (%)</Label>
                  <Input id="house-percent" type="number" className="w-28" value={percent} onChange={(e) => setPercent(e.target.value)} />
                </div>
                <Button variant="outline" onClick={raiseRents}>
                  Fill new rents
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Rounded to the nearest 100. Each new rent can still be edited.</p>
            </div>

            <Table className="border">
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Rent now</TableHead>
                  <TableHead>New rent</TableHead>
                  <TableHead>Apply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.unitId}>
                    <TableCell>{unit.number}</TableCell>
                    <TableCell>
                      {unit.tenant ?? <span className="text-muted-foreground">Vacant</span>}
                      {ownDeal(unit) && <div className="text-xs text-muted-foreground">Own: {ownDeal(unit)}</div>}
                    </TableCell>
                    <TableCell>{unit.rentRate.toLocaleString()}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-24"
                        value={rents[unit.unitId] ?? ""}
                        onChange={(e) => {
                          setRents((current) => ({ ...current, [unit.unitId]: e.target.value }));
                          changed();
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {unit.tenant ? (
                        <Checkbox
                          checked={!skip[unit.unitId]}
                          onCheckedChange={(checked) => {
                            setSkip((current) => ({ ...current, [unit.unitId]: checked !== true }));
                            changed();
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">next tenant</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div>
              <Label htmlFor="house-note">Note (optional)</Label>
              <Textarea id="house-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            {impact && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                {touched.length ? (
                  touched.map((row) => (
                    <div key={row.unit} className="flex justify-between gap-2">
                      <span>
                        Unit {row.unit} ({row.tenant})
                      </span>
                      <span>
                        Balance KES {row.balanceBefore.toLocaleString()} → {row.balanceAfter.toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div>No month billed so far changes; it applies when its month comes.</div>
                )}
              </div>
            )}
          </div>
        )}

        <SheetFooter className="mt-4 border-t pt-4 flex-row justify-end gap-2">
          <Button variant="outline" disabled={!terms || busy} onClick={preview}>
            Preview
          </Button>
          <Button disabled={!impact || busy} onClick={confirm}>
            Confirm
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
