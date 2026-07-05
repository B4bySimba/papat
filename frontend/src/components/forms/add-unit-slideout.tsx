"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/command";
import { X, SquarePlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AddUnitSlideout({
  onClose,
  defaultHouseId,
  onSuccess,
}: {
  onClose: () => void;
  defaultHouseId: string;
  onSuccess?: () => void;
}) {
  const [formData, setFormData] = useState({
    houseId: defaultHouseId,
    number: "",
    type: "",
    description: "",
    rentRate: "",
    deposit: "",
    additional: "",
    additionalCharges: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.houseId) newErrors.houseId = "Property is required";
    if (!formData.number) newErrors.number = "Unit number is required";
    if (!formData.rentRate) newErrors.rentRate = "Rent rate is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const [openPropertyDropdown, setOpenPropertyDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const res = await fetch("/api/units/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          houseId: formData.houseId,
          number: formData.number,
          type: formData.type,
          description: formData.description,
          deposit: Number(formData.deposit),
          rentRate: Number(formData.rentRate),
          additional: formData.additional,
          additionalCharges: Number(formData.additionalCharges),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to create unit");
      }

      toast.success("Unit created successfully!");

      if (onSuccess) {
        onSuccess();
        onClose()
      } else {
      onClose();
      }
    } catch (error: any) {
      console.error("Error creating unit:", error.message);
      toast.error(error.message);
    }
  };

  const [properties, setProperties] = useState<{ id: string; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/properties/get");
        const data = await res.json();

        const sorted = data.sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
        );

        setProperties(sorted);
      } catch (error) {
        console.error("Failed to fetch properties", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <SquarePlus className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Add New Unit</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto h-[calc(100vh-140px)]"
        >
          <div>
            <Label>
              Select Property <span className="text-red-500">*</span>
            </Label>
            <div
              className={cn(errors.houseId && "ring-1 ring-red-500 rounded-md")}
            >
              <Popover
                open={openPropertyDropdown}
                onOpenChange={setOpenPropertyDropdown}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {formData.houseId
                      ? properties.find((p) => p.id === formData.houseId)?.name
                      : "Search property..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Command>
                    <CommandInput placeholder="Search properties..." />
                    <CommandEmpty>No property found.</CommandEmpty>
                    <CommandGroup>
                      {properties.map((p) => (
                        <CommandItem
                          key={p.id}
                          onSelect={() => {
                            setFormData({ ...formData, houseId: p.id });
                            setOpenPropertyDropdown(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.houseId === p.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {errors.houseId && (
              <p className="text-sm text-red-500 mt-1">{errors.houseId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="number">
              Unit Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) =>
                setFormData({ ...formData, number: e.target.value })
              }
              placeholder="e.g., A-101"
              className={cn(errors.number && "ring-1 ring-red-500")}
            />
            {errors.number && (
              <p className="text-sm text-red-500 mt-1">{errors.number}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Unit Type</Label>
            <Input
              id="type"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              placeholder="e.g., 2 Bed, 1 Bath"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe the unit"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="rentRate">
              Rent Rate (Ksh) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rentRate"
              type="number"
              value={formData.rentRate}
              onChange={(e) =>
                setFormData({ ...formData, rentRate: e.target.value })
              }
              placeholder="e.g., 18000"
              className={cn(errors.rentRate && "ring-1 ring-red-500")}
            />

            {errors.rentRate && (
              <p className="text-sm text-red-500 mt-1">{errors.rentRate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="deposit">Security Deposit (Ksh)</Label>
            <Input
              id="deposit"
              type="number"
              value={formData.deposit}
              onChange={(e) =>
                setFormData({ ...formData, deposit: e.target.value })
              }
              placeholder="e.g., 5000"
            />
          </div>

          <div>
            <Label htmlFor="additional">Additional Charge (Label)</Label>
            <Input
              id="additional"
              value={formData.additional}
              onChange={(e) =>
                setFormData({ ...formData, additional: e.target.value })
              }
              placeholder="e.g., Garbage, Internet"
            />
          </div>

          <div>
            <Label htmlFor="additionalCharges">
              Additional Charge (Amount)
            </Label>
            <Input
              id="additionalCharges"
              type="number"
              value={formData.additionalCharges}
              onChange={(e) =>
                setFormData({ ...formData, additionalCharges: e.target.value })
              }
              placeholder="e.g., 800"
            />
          </div>
        </form>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t bg-background">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Add Unit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
