"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, X, Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { AsyncCombobox } from "../AsyncCombobox";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // New import for Tabs

// Combobox Component (internal to this file)
interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder || "Select item..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for search matching
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

export function LogPaymentFloating({
  onClose,
  leaseCode,
}: {
  onClose: () => void;
  leaseCode?: string;
}) {
  const [formData, setFormData] = useState({
    tenant: "",
    property: "",
    unit: "",
    lease: leaseCode || "", // Initialize with prop or empty string
    amount: "",
    paymentMethod: "",
    date: new Date().toISOString().split("T")[0],
    reference: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showLeaseSearchTabs, setShowLeaseSearchTabs] = useState(false); // New state to control tab visibility

  const paymentMethods = [
    { value: "mobile-money", label: "Mobile Money" },
    { value: "cheque", label: "Cheque" },
    { value: "bank-transfer", label: "Bank Transfer" },
    { value: "credit-card", label: "Credit Card" },
    { value: "online", label: "Online Payment" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/payment/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lease: {
            connect: { code: formData.lease },
          },
          amount: Number.parseFloat(formData.amount),
          paymentMethod: formData.paymentMethod,
          reference: formData.reference,
          date: formData.date,
          house: formData.property
            ? { connect: { id: formData.property } }
            : undefined,
          unit: formData.unit ? { connect: { id: formData.unit } } : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.message || "Failed to log payment");
      }

      toast.success("The payment was recorded successfully.");

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Submit failed:", error);
      toast.error("Error logging payment" + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if the form is valid for submission
  const isFormValid =
    formData.amount &&
    formData.paymentMethod &&
    formData.lease &&
    formData.date &&
    formData.reference;

  useEffect(() => {
    console.log("✅ LogPaymentFloating mounted");
  }, []);
  // Effect to fetch lease code based on tenant/property/unit selection
  useEffect(() => {
    const fetchLease = async () => {
      // If leaseCode prop is present and no tenant/property/unit search is active,
      // we don't need to fetch. The lease is already set by prop.
      if (
        leaseCode &&
        !formData.tenant &&
        (!formData.property || !formData.unit)
      ) {
        return;
      }

      try {
        let res;
        if (formData.tenant) {
          res = await fetch(`/api/lease/by-tenant?tenantId=${formData.tenant}`);
        } else if (formData.property && formData.unit) {
          res = await fetch(
            `/api/lease/by-unit?propertyId=${formData.property}&unitId=${formData.unit}`
          );
        } else {
          // If no search criteria, clear the lease field unless it came from the prop
          if (formData.lease && formData.lease !== leaseCode) {
            setFormData((prev) => ({ ...prev, lease: "" }));
          }
          return;
        }

        if (!res.ok) {
          throw new Error(`Lease fetch failed: ${res.status}`);
        }

        const data = await res.json();
        if (data?.leaseCode) {
          setFormData((prev) => ({
            ...prev,
            lease: data.leaseCode,
          }));
        } else {
          // If no lease found for selected criteria, clear the lease field
          setFormData((prev) => ({ ...prev, lease: "" }));
        }
      } catch (error) {
        console.error("Failed to auto-fill lease code:", error);
        setFormData((prev) => ({ ...prev, lease: "" })); // Clear on error too
      }
    };

    fetchLease();
  }, [formData.tenant, formData.property, formData.unit, leaseCode]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isSuccess ? (
        <Card className="w-80 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="h-5 w-5" />
              <span className="font-medium">Payment logged successfully!</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-85 shadow-lg border-2 bg-slate-50">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              Quick Payment Log
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-2 text-sm">
              <div>
                <Label htmlFor="lease" className="text-xs mb-1 block">
                  Lease Code
                </Label>
                <Input
                  id="lease"
                  value={formData.lease}
                  onChange={(e) =>
                    setFormData({ ...formData, lease: e.target.value })
                  }
                  placeholder="e.g., LSE-2023-0021"
                  className="h-8"
                />
              </div>

              {!showLeaseSearchTabs && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-8 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                  onClick={() => setShowLeaseSearchTabs(true)}
                >
                  Find Lease by Tenant or Property
                </Button>
              )}

              {showLeaseSearchTabs && (
                <div className="space-y-2">
                  <Tabs defaultValue="tenant" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger
                        value="tenant"
                        className="text-xs data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                      >
                        Tenant
                      </TabsTrigger>
                      <TabsTrigger
                        value="property"
                        className="text-xs data-[state=active]:bg-green-100 data-[state=active]:text-green-600 data-[state=active]:shadow-sm"
                      >
                        Property & Unit
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="tenant" className="mt-2">
                      <div className="p-1 border border-blue-100 rounded-md bg-blue-50">
                        <Label
                          htmlFor="tenant"
                          className="text-xs text-blue-600"
                        >
                          Tenant
                        </Label>
                        <AsyncCombobox
                          fetchUrl="/api/tenant/search"
                          value={formData.tenant}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              tenant: value,
                              property: "",
                              unit: "",
                            })
                          }
                          placeholder="Select tenant"
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="property" className="mt-2">
                      <div className="p-x-5 border border-green-100 rounded-md bg-green-50">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div>
                            <Label
                              htmlFor="property"
                              className="text-xs text-green-600"
                            >
                              Property
                            </Label>
                            <AsyncCombobox
                              fetchUrl="/api/properties/search"
                              value={formData.property}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  property: value,
                                  tenant: "",
                                })
                              }
                              placeholder="Search property"
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor="unit"
                              className="text-xs text-green-600"
                            >
                              Unit
                            </Label>
                            <AsyncCombobox
                              fetchUrl={`/api/units/search?propertyId=${formData.property}`}
                              value={formData.unit}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  unit: value,
                                  tenant: "",
                                })
                              }
                              placeholder="Search unit"
                              key={formData.property}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => setShowLeaseSearchTabs(false)}
                  >
                    Hide search options
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="amount" className="text-xs">
                    Amount ($)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="1800"
                    className="h-8"
                  />
                </div>
                <div>
                  <Label htmlFor="date" className="text-xs">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="h-8"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="paymentMethod" className="text-xs">
                  Payment Method
                </Label>
                <Combobox
                  options={paymentMethods}
                  value={formData.paymentMethod}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMethod: value })
                  }
                  placeholder="Select method"
                />
              </div>
              <div>
                <Label htmlFor="reference" className="text-xs">
                  Reference/Check #
                </Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder="Optional"
                  className="h-8"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-8"
                disabled={isSubmitting || !isFormValid}
              >
                {isSubmitting ? "Logging..." : "Log Payment"}
              </Button>
            </form>
            <div className="flex gap-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Quick Entry
              </Badge>
              <Badge variant="outline" className="text-xs">
                Auto-save
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
