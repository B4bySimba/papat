"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UnitOption {
  id: string;
  label: string;
}

interface MoveTenantSheetProps {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  currentUnitId: string;
  availableUnits: UnitOption[];
  onConfirm: (newUnitId: string) => void;
}

export default function MoveTenantSheet({
  open,
  onOpenChange,
  currentUnitId,
  availableUnits,
  onConfirm,
}: MoveTenantSheetProps) {
  const [selectedUnit, setSelectedUnit] = useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[500px] flex flex-col p-6"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="text-2xl">Move Tenant</SheetTitle>
          <SheetDescription>
            Move the tenant currently in Unit <strong>{currentUnitId}</strong>{" "}
            to another available unit.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <Label htmlFor="unitSelect">Select New Unit</Label>
          <select
            id="unitSelect"
            className="w-full border rounded-md p-2"
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
          >
            <option value="">-- Choose Unit --</option>
            {availableUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>

          <Button
            disabled={!selectedUnit}
            onClick={() => {
              onConfirm(selectedUnit);
              onOpenChange(false);
              setSelectedUnit("");
            }}
          >
            Confirm Move
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
