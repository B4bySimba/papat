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
import { DateInput } from "@/components/DateInput";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface VacantUnit {
  id: string;
  number: string;
  rent: number;
  deposit: number | null;
}

interface MoveResult {
  unit: string;
  balanceMoved: number;
  paymentsMoved: number;
}

interface MoveTenantSheetProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  houseId: string;
  tenantId: string;
  currentDeposit: number;
  onMoved: (unitId: string) => void;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function MoveTenantSheet({
  open,
  onOpenChange,
  houseId,
  tenantId,
  currentDeposit,
  onMoved,
}: MoveTenantSheetProps) {
  const [units, setUnits] = useState<VacantUnit[]>([]);
  const [hasWater, setHasWater] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [date, setDate] = useState(today());
  const [rent, setRent] = useState("");
  const [chargeDifference, setChargeDifference] = useState(false);
  const [finalReading, setFinalReading] = useState("");
  const [openingReading, setOpeningReading] = useState("");
  const [result, setResult] = useState<MoveResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/units/byHouseId/${houseId}`)
      .then((res) => res.json())
      .then((data) => {
        setUnits(data.units ?? []);
        setHasWater(!!data.hasWaterBill);
      })
      .catch(() => toast.error("Could not load the vacant units."));
  }, [open, houseId]);

  const unit = units.find((u) => u.id === unitId);
  const difference = (unit?.deposit ?? 0) - currentDeposit;
  const ready = !!unit && !!date && (!hasWater || (finalReading !== "" && openingReading !== ""));

  const send = async (preview: boolean): Promise<MoveResult> => {
    setBusy(true);
    try {
      const res = await fetch(`/api/tenant/move/${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUnitId: unitId,
          date,
          rentRate: Number(rent) || 0,
          deposit: chargeDifference ? difference : 0,
          finalReading: hasWater ? Number(finalReading) : null,
          openingReading: hasWater ? Number(openingReading) : null,
          preview,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not move the tenant.");
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
      const moved = await send(false);
      toast.success(`Moved to unit ${moved.unit}.`);
      onOpenChange(false);
      onMoved(unitId);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px] flex flex-col p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">Move Tenant</SheetTitle>
          <SheetDescription>
            Move this tenant to a vacant unit in the same property. What they owe moves with them, and the new
            unit bills the move month.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm">
          <div>
            <Label htmlFor="unitSelect">New unit</Label>
            {units.length ? (
              <select
                id="unitSelect"
                className="w-full border rounded-md p-2"
                value={unitId}
                onChange={(e) => {
                  setUnitId(e.target.value);
                  setRent(String(units.find((u) => u.id === e.target.value)?.rent ?? ""));
                  setChargeDifference(false);
                  setResult(null);
                }}
              >
                <option value="">-- Choose Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.number} (rent {u.rent.toLocaleString()})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-muted-foreground">No vacant units in this property.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="moveDate">Move date</Label>
              <DateInput id="moveDate" max={today()} value={date} onChange={(value) => { setDate(value); setResult(null); }} />
            </div>
            <div>
              <Label htmlFor="moveRent">Rent on the new unit</Label>
              <Input id="moveRent" type="number" min={0} value={rent} onChange={(e) => { setRent(e.target.value); setResult(null); }} />
            </div>
          </div>

          {unit && difference !== 0 && (
            <div className="space-y-2">
              <Label>Deposit</Label>
              <p className="text-xs text-muted-foreground">
                The tenant holds KES {currentDeposit.toLocaleString()}; unit {unit.number} asks for KES{" "}
                {(unit.deposit ?? 0).toLocaleString()}.
              </p>
              <RadioGroup
                value={chargeDifference ? "difference" : "keep"}
                onValueChange={(value) => { setChargeDifference(value === "difference"); setResult(null); }}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="keep" id="depositKeep" />
                  <Label htmlFor="depositKeep">Keep {currentDeposit.toLocaleString()} as it is</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="difference" id="depositDifference" />
                  <Label htmlFor="depositDifference">
                    {difference > 0
                      ? `Charge the ${difference.toLocaleString()} difference`
                      : `Credit the ${(-difference).toLocaleString()} difference`}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {hasWater && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="finalReading">Final meter reading (this unit)</Label>
                <Input
                  id="finalReading"
                  type="number"
                  min={0}
                  value={finalReading}
                  onChange={(e) => { setFinalReading(e.target.value); setResult(null); }}
                />
              </div>
              <div>
                <Label htmlFor="openingReading">Opening meter reading (new unit)</Label>
                <Input
                  id="openingReading"
                  type="number"
                  min={0}
                  value={openingReading}
                  onChange={(e) => { setOpeningReading(e.target.value); setResult(null); }}
                />
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-1">
              <div className="font-medium">
                Balance moving to unit {result.unit}: KES {result.balanceMoved.toLocaleString()}
              </div>
              {result.paymentsMoved > 0 && (
                <div>
                  Payments dated after the move that go to unit {result.unit}: {result.paymentsMoved}
                </div>
              )}
              <div>The move month&apos;s rent is billed on unit {result.unit} only.</div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-4 border-t pt-4 flex-row justify-end gap-2">
          <Button variant="outline" disabled={!ready || busy} onClick={preview}>
            Preview
          </Button>
          <Button disabled={!result || busy} onClick={confirm}>
            Confirm Move
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
