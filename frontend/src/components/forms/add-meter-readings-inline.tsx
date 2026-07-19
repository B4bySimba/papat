"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Gauge,
  Plus,
  Trash2,
  Loader2,
  X,
  Building2,
  Home,
  CalendarDays,
  Droplets,
  RefreshCw,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { AsyncCombobox } from "../AsyncCombobox";
import { toast } from "sonner";

type ReadingRow = {
  id: string;
  property: string;
  unit: string;
  meterType: string;
  reading: string;
  billingPeriod: string; // "YYYY-MM", empty = unassigned — filled in manually, never auto-suggested
  periodStatus: "suggested" | "opening-reading" | "no-lease-found" | "unset";
  isMeterReset: boolean;
};

function newRow(): ReadingRow {
  return {
    id: uuidv4(),
    property: "",
    unit: "",
    meterType: "water",
    reading: "",
    billingPeriod: "",
    periodStatus: "unset",
    isMeterReset: false,
  };
}

export function AddMeterReadingInline({ onClose }: { onClose: () => void }) {
  const [readings, setReadings] = useState<ReadingRow[]>([newRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addReading = () => {
    setReadings((prev) => [...prev, newRow()]);
  };

  // Checks whether "now" would be an opening reading or has no covering lease,
  // purely to show a warning — never overwrites billingPeriod, which is manual-only.
  const fetchSuggestion = async (row: ReadingRow) => {
    if (!row.unit) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({ unitId: row.unit, readOn: today });
      if (row.reading) params.set("currentReading", row.reading);
      const res = await fetch(`/api/meterReading/suggest-period?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setReadings((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, periodStatus: data.status } : r))
      );
    } catch {
      // Convenience check only — silently skip on failure.
    }
  };

  const removeReading = (id: string) => {
    setReadings(readings.filter((r) => r.id !== id));
  };

  const updateReading = (id: string, field: string, value: string | boolean) => {
    setReadings((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      if (field === "unit" || field === "reading") {
        const row = next.find((r) => r.id === id);
        if (row) fetchSuggestion(row);
      }
      return next;
    });
  };

  const isRowIncomplete = (r: ReadingRow) => !r.property || !r.unit || !r.reading;
  const isFormValid = readings.length > 0 && !readings.some(isRowIncomplete);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isFormValid) {
      toast.error("Please fill in property, unit and reading for every row.");
      return;
    }

    const formattedReadings = readings.map((r) => ({
      currentReading: Number(r.reading),
      unitId: r.unit,
      houseId: r.property,
      billingPeriod: r.periodStatus === "opening-reading" ? null : (r.billingPeriod || undefined),
      isMeterReset: r.isMeterReset,
    }));

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/meterReading/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ readings: formattedReadings }),
      });

      if (!res.ok) {
        throw new Error("Failed to save meter readings.");
      }

      await res.json();
      toast.success("Meter readings logged successfully.");
      onClose();
    } catch (error) {
      toast.error("Error logging meter readings: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <Card className="w-full max-w-5xl gap-0 py-0 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                Add Meter Readings
                <Badge variant="secondary" className="font-normal">
                  {readings.length} reading{readings.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              <CardDescription>
                Log one or more water meter readings across your properties.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="max-h-[60vh] space-y-3 overflow-y-auto p-4 sm:p-6">
          {readings.map((reading, index) => {
            const incomplete = submitted && isRowIncomplete(reading);
            return (
              <div
                key={reading.id}
                className={cn(
                  "relative rounded-lg border bg-muted/30 p-4 transition-colors",
                  incomplete ? "border-red-300 bg-red-50/50" : "border-border"
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-medium">
                    Reading #{index + 1}
                  </Badge>
                  {readings.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReading(reading.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div>
                    <Label className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" /> Property
                    </Label>
                    <AsyncCombobox
                      value={reading.property}
                      onValueChange={(value) => {
                        updateReading(reading.id, "property", value);
                        updateReading(reading.id, "unit", "");
                      }}
                      placeholder="Select property"
                      fetchUrl="/api/meterReading/properties"
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Home className="h-3 w-3" /> Unit
                    </Label>
                    <AsyncCombobox
                      value={reading.unit}
                      onValueChange={(value) =>
                        updateReading(reading.id, "unit", value)
                      }
                      placeholder="Select unit"
                      fetchUrl={`/api/meterReading/units?propertyId=${reading.property}`}
                      key={reading.property}
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Droplets className="h-3 w-3" /> Meter Type
                    </Label>
                    <Select
                      value={reading.meterType}
                      onValueChange={(value) =>
                        updateReading(reading.id, "meterType", value)
                      }
                    >
                      <SelectTrigger className="h-9 w-full text-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="water">Water</SelectItem>
                        <SelectItem
                          value="electric"
                          disabled
                          className="cursor-not-allowed opacity-50"
                        >
                          Electric (soon)
                        </SelectItem>
                        <SelectItem
                          value="gas"
                          disabled
                          className="cursor-not-allowed opacity-50"
                        >
                          Gas (soon)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1.5 block text-xs text-muted-foreground">
                      Reading
                    </Label>
                    <Input
                      type="number"
                      value={reading.reading}
                      onChange={(e) =>
                        updateReading(reading.id, "reading", e.target.value)
                      }
                      placeholder="0000"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" /> For Month
                    </Label>
                    {reading.periodStatus === "opening-reading" ? (
                      <div className="flex h-9 items-center rounded-md border border-dashed px-2 text-xs italic text-muted-foreground">
                        Opening reading
                      </div>
                    ) : (
                      <Input
                        type="month"
                        value={reading.billingPeriod}
                        onChange={(e) =>
                          updateReading(reading.id, "billingPeriod", e.target.value)
                        }
                        className="h-9 text-sm"
                      />
                    )}
                    {reading.periodStatus === "no-lease-found" && (
                      <p className="mt-1 text-[10px] text-amber-600">
                        No lease found — pick manually
                      </p>
                    )}
                  </div>

                  <div className="flex items-end pb-1.5">
                    <label
                      htmlFor={`reset-${reading.id}`}
                      className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <input
                        type="checkbox"
                        id={`reset-${reading.id}`}
                        checked={reading.isMeterReset}
                        onChange={(e) =>
                          updateReading(reading.id, "isMeterReset", e.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-purple-600"
                      />
                      <RefreshCw className="h-3 w-3" />
                      Meter replaced
                    </label>
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            variant="outline"
            onClick={addReading}
            className="w-full border-dashed text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Another Reading
          </Button>
        </CardContent>

        <Separator />

        <CardFooter className="flex flex-col-reverse items-center justify-between gap-3 py-4 sm:flex-row sm:py-5">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Tip: you can log multiple readings at once for efficiency.
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-purple-600 hover:bg-purple-700 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${readings.length} Reading${readings.length !== 1 ? "s" : ""}`
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
