"use client";

import { useState } from "react";
import * as React from "react";
import {
  Check,
  ChevronsUpDown,
  X,
  User,
  Phone,
  Home,
  Gauge,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-transparent",
            !value && className
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder || "Select item..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No Units found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function AddTenantModal({
  onClose,
  initialPropertyId,
  initialUnitId,
}: {
  onClose: (submittedSuccessfully?: boolean) => void;
  initialPropertyId?: string;
  initialUnitId?: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationalId: "",
    emergencyContact: "",
    emergencyPhone: "",
    property: "",
    unit: "",
    leaseStart: "",
    leaseEnd: "",
    rentAmount: "",
    securityDeposit: "",
    notes: "",
    initialMeterReading: "",
    rentDue: "",
    arrearsbf: "",
  });

  const [properties, setProperties] = useState<{ id: string; name: string }[]>(
    []
  );
  React.useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/properties/get");
        if (!res.ok) throw new Error("Failed to load properties");
        const data = await res.json();

        const sorted = data.sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
        );

        setProperties(sorted);

        // If initialPropertyId was passed, prefill it
        if (initialPropertyId) {
          setFormData((prev) => ({
            ...prev,
            property: initialPropertyId,
          }));
        }
      } catch (error) {
        console.error("Error fetching properties", error);
        setProperties([]);
      }
    };

    fetchProperties();
  }, [initialPropertyId]);

  const [loading, setLoading] = useState(false);
  React.useEffect(() => {
    if (!formData.property) return;

    const fetchUnits = async () => {
      try {
        const res = await fetch(`/api/units/byHouseId/${formData.property}`);
        const data = await res.json();

        setHasWaterBill(data.hasWaterBill);

        if (!data.units || data.units.length === 0) {
          setNoUnitsFound(true);
          setUnits([]);
          return;
        }

        setNoUnitsFound(false);

        const formatted = data.units.map((unit: any) => ({
          value: unit.id,
          label: unit.number,
          rent: unit.rent,
          deposit: unit.deposit,
        }));

        setUnits(formatted);

        // Auto-select unit if provided
        if (initialUnitId) {
          const selected = formatted.find(
            (u: { value: string }) => u.value === initialUnitId
          );
          if (selected) {
            setFormData((prev) => ({
              ...prev,
              unit: selected.value,
              rentAmount: selected.rent.toString(),
              securityDeposit: selected.deposit.toString(),
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch units", error);
        setUnits([]);
        setNoUnitsFound(true);
      }
    };

    fetchUnits();
  }, [formData.property, initialUnitId]);

  interface UnitOption extends ComboboxOption {
    rent: number;
    deposit: number;
  }

  const [units, setUnits] = useState<UnitOption[]>([]);
  const [noUnitsFound, setNoUnitsFound] = useState(false);
  const [hasWaterBill, setHasWaterBill] = useState(false);

  React.useEffect(() => {
    if (initialPropertyId) {
      setFormData((prev) => ({
        ...prev,
        property: initialPropertyId,
      }));
    }
  }, [initialPropertyId]);

  const handleSubmit = async () => {
    setSubmitted(true);
    const errors = [];

    if (!formData.firstName.trim()) errors.push("First name is required.");
    if (!formData.phone.trim()) errors.push("Phone number is required.");
    if (!formData.property) errors.push("Property is required.");
    if (!formData.unit) errors.push("Unit is required.");
    if (!formData.leaseStart) errors.push("Lease start date is required.");
    if (!formData.rentDue) errors.push("Rent due date is required.");
    if (hasWaterBill && !formData.initialMeterReading.trim()) {
      errors.push("Initial meter reading is required.");
    }

    if (errors.length > 0) {
      toast.error("Please fix the following errors:", {
        description: errors.join("\n"),
      });
      return;
    }

    const selectedProperty = properties.find((p) => p.id === formData.property);
    const selectedUnit = units.find((u) => u.value === formData.unit);

    const payload = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      contact: formData.phone,
      nationId: formData.nationalId || null,
      emergencyContactName: formData.emergencyContact || null,
      emergencyContactPhone: formData.emergencyPhone || null,
      notes: formData.notes || null,
      effectiveFrom: formData.leaseStart
        ? new Date(formData.leaseStart).toISOString()
        : null,
      endDate: formData.leaseEnd
        ? new Date(formData.leaseEnd).toISOString()
        : null,
      rentDue: formData.rentDue ? Number(formData.rentDue) : null,
      currentMeterReading: formData.initialMeterReading
        ? Number(formData.initialMeterReading)
        : null,
      rentRate: formData.rentAmount ? Number(formData.rentAmount) : 0,
      deposit: formData.securityDeposit ? Number(formData.securityDeposit) : 0,
      unitId: selectedUnit?.value,
      arrearsbf: formData.arrearsbf ? Number(formData.arrearsbf) : 0
    };

    try {
      const cleanedPayload = Object.fromEntries(
        Object.entries(payload).filter(
          ([_, v]) => v !== null && v !== "" && v !== undefined
        )
      );
      console.log(cleanedPayload);
      const res = await fetch("/api/tenant/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to create Tenant");
      }

      toast.success("Tenant created successfully!");
      onClose(true);
    } catch (error: any) {
      console.error("Error creating Tenant:", error.message);
      toast.error(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Add New Tenant
            </CardTitle>
            <CardDescription>
              Enter tenant information and lease details
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onClose(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="lease" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Lease
              </TabsTrigger>
              {hasWaterBill && (
                <TabsTrigger value="meter" className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" /> Meter Reading
                </TabsTrigger>
              )}
            </TabsList>

            {/* PERSONAL TAB */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    className={cn(
                      submitted &&
                        !formData.firstName.trim() &&
                        "ring-1 ring-red-500"
                    )}
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    className={cn(
                      submitted &&
                        !formData.phone.trim() &&
                        "ring-1 ring-red-500"
                    )}
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="eg. 0712345678"
                  />
                </div>

                <div>
                  <Label htmlFor="nationalId">
                    National Id/Passport Number
                  </Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) =>
                      setFormData({ ...formData, nationalId: e.target.value })
                    }
                    placeholder="eg. 12345678"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john.doe@email.com"
                />
              </div>
            </TabsContent>

            {/* CONTACT TAB */}
            <TabsContent value="contact" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emergencyContact: e.target.value,
                    })
                  }
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyPhone: e.target.value })
                  }
                  placeholder="eg. 0712345678"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any special notes about the tenant..."
                  rows={4}
                />
              </div>
            </TabsContent>

            {/* LEASE TAB */}
            <TabsContent value="lease" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property">
                    Property <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={properties.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                    value={formData.property}
                    onValueChange={(value) =>
                      setFormData({ ...formData, property: value, unit: "" })
                    }
                    placeholder="Select property"
                    className={
                      submitted && !formData.property
                        ? "ring-1 ring-red-500"
                        : ""
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="unit">
                    Unit <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={units}
                    value={formData.unit}
                    onValueChange={(value) => {
                      const selectedUnit = units.find((u) => u.value === value);

                      setFormData({
                        ...formData,
                        unit: value,
                        rentAmount: selectedUnit?.rent?.toString() || "",
                        securityDeposit:
                          selectedUnit?.deposit?.toString() || "",
                      });
                    }}
                    placeholder="Select unit"
                    className={
                      submitted && !formData.unit ? "ring-1 ring-red-500" : ""
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="leaseStart">
                    Lease Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    id="leaseStart"
                    className={cn(
                      submitted && !formData.leaseStart && "ring-1 ring-red-500"
                    )}
                    value={formData.leaseStart}
                    onChange={(e) =>
                      setFormData({ ...formData, leaseStart: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="leaseEnd">Lease End Date</Label>
                  <Input
                    id="leaseEnd"
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, leaseEnd: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rentAmount">Monthly Rent ($)</Label>
                  <Input
                    id="rentAmount"
                    type="number"
                    value={formData.rentAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, rentAmount: e.target.value })
                    }
                    placeholder="eg .1800"
                  />
                </div>

                <div>
                  <Label htmlFor="securityDeposit">Security Deposit ($)</Label>
                  <Input
                    id="securityDeposit"
                    type="number"
                    value={formData.securityDeposit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        securityDeposit: e.target.value,
                      })
                    }
                    placeholder="eg. 1800"
                  />
                </div>
                <div>
                  <Label htmlFor="rentDue">
                    Rent Due Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rentDue"
                    type="number"
                    className={cn(
                      submitted &&
                        !formData.rentDue.trim() &&
                        "ring-1 ring-red-500"
                    )}
                    value={formData.rentDue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rentDue: e.target.value,
                      })
                    }
                    placeholder="eg. 5"
                  />
                </div>
                <div>
                  <Label htmlFor="rentDue">
                    Arrears Brought Forward
                  </Label>
                  <Input
                    id="arresrsbf"
                    type="number"
                    value={formData.arrearsbf}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        arrearsbf: e.target.value,
                      })
                    }
                    placeholder="Any balances from a previous system"
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="meter" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="initialMeterReading">
                  Initial Meter Reading{" "}
                  {hasWaterBill && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="initialMeterReading"
                  type="number"
                  className={cn(
                    submitted &&
                      hasWaterBill &&
                      !formData.initialMeterReading.trim() &&
                      "ring-1 ring-red-500"
                  )}
                  value={formData.initialMeterReading}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      initialMeterReading: e.target.value,
                    })
                  }
                  placeholder="Enter initial meter units"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Add Tenant</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
