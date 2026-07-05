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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Plus, Minus, Save } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { AsyncCombobox } from "../AsyncCombobox";
import { toast } from "sonner";


export function AddMeterReadingInline({ onClose }: { onClose: () => void }) {
  const [readings, setReadings] = useState([
    {
      id: uuidv4(),
      property: "",
      unit: "",
      meterType: "water",
      reading: "",
      date: new Date().toISOString().split("T")[0],
    },
  ]);

  const addReading = () => {
    setReadings((prev) => [
      ...prev,
      {
        id: uuidv4(),
        property: "",
        unit: "",
        meterType: "water",
        reading: "",
        date: new Date().toISOString().split("T")[0],
      },
    ]);
  };
    
  const removeReading = (id: string) => {
    setReadings(readings.filter((r) => r.id !== id));
  };

  const updateReading = (id: string, field: string, value: string) => {
    setReadings(
      readings.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSubmit = async () => {
    const formattedReadings = readings.map((r) => ({
        currentReading: Number(r.reading),
        readOn: r.date,
        unitId: r.unit,
        houseId: r.property,
      }));
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

      const data = await res.json();
      toast.success("Logged successfully:");
      onClose();
    } catch (error) {
      toast.error("Error logging meter readings:"+ error);
    }
  };
  
  return (
    <div className="fixed inset-4 z-50 sm:inset-x-4 sm:top-4 max-w-4xl mx-auto">
      <Card className="shadow-xl border-2">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
            Add Meter Readings
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {readings.length} reading{readings.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={addReading}
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="sr-only sm:not-sr-only">Add Row</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              className="flex-1 sm:flex-none"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="sr-only sm:not-sr-only">Save All</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {readings.map((reading, index) => (
              <div
                key={reading.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-2 items-end p-3 bg-muted/30 rounded-lg"
              >
                <div className="sm:col-span-2">
                  <Label className="text-xs">Property</Label>
                  <AsyncCombobox
                    value={reading.property}
                    onValueChange={(value) =>
                      updateReading(reading.id, "property", value)
                    }
                    placeholder="Select property"
                    fetchUrl="/api/meterReading/properties"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs">Unit</Label>
                  <AsyncCombobox
                    value={reading.unit}
                    onValueChange={(value) =>
                      updateReading(reading.id, "unit", value)
                    }
                    placeholder="Select unit"
                    fetchUrl={`/api/meterReading/units?propertyId=${reading.property}`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs">Meter Type</Label>
                  <Select
                    value={reading.meterType}
                    onValueChange={(value) =>
                      updateReading(reading.id, "meterType", value)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs sm:text-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem
                        value="electric"
                        disabled
                        className="cursor-not-allowed opacity-50"
                      >
                        Electric
                      </SelectItem>
                      <SelectItem
                        value="gas"
                        disabled
                        className="cursor-not-allowed opacity-50"
                      >
                        Gas
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs">Reading</Label>
                  <Input
                    type="number"
                    value={reading.reading}
                    onChange={(e) =>
                      updateReading(reading.id, "reading", e.target.value)
                    }
                    placeholder="0000"
                    className="h-8 text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={reading.date}
                    onChange={(e) =>
                      updateReading(reading.id, "date", e.target.value)
                    }
                    className="h-8 text-xs sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2 flex gap-1 justify-end">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  {readings.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReading(reading.id)}
                      className="h-6 w-6"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t gap-4">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Tip: You can add multiple readings at once for efficiency
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1 sm:flex-none">
                Save {readings.length} Reading{readings.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );}
