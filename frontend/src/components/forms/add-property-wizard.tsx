"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  Search,
  Plus,
  X,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface LandlordData {
  id: string;
  name: string;
  contact: string;
  nationalId: string;
  email: string;
}

interface PropertyData {
  name: string;
  address: string;
  lrNumber: string;
  agreedCommission: string;
}

interface BillsData {
  serviceCharge: string;
  waterPricePerUnit: string;
  electricityPricePerUnit: string;
  garbageCollectionFee: string;
  additionalCharges: { description: string; value: string; id: number }[];
}

interface PropertyFormData {
  selectedLandlord: string;
  isNewLandlord: boolean;
  landlord: LandlordData;
  property: PropertyData;
  bills: BillsData;
  description: string;
}

export function AddPropertyWizard({ onClose }: { onClose: () => void }) {
  const [landlords, setLandlords] = useState<LandlordData[]>([]);
  const [loadingLandlords, setLoadingLandlords] = useState(true);

  useEffect(() => {
    const fetchLandlords = async () => {
      try {
        const res = await fetch("/api/landlords");
        const data = await res.json();
        setLandlords(data);
      } catch (error) {
        console.error("Failed to fetch landlords:", error);
      } finally {
        setLoadingLandlords(false);
      }
    };

    fetchLandlords();
  }, []);

  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [nextChargeId, setNextChargeId] = useState(1);

  const [formData, setFormData] = useState<PropertyFormData>({
    selectedLandlord: "",
    isNewLandlord: false,
    landlord: {
      id: "",
      name: "",
      contact: "",
      nationalId: "",
      email: "",
    },
    property: {
      name: "",
      address: "",
      lrNumber: "",
      agreedCommission: "",
    },
    bills: {
      serviceCharge: "",
      waterPricePerUnit: "",
      electricityPricePerUnit: "",
      garbageCollectionFee: "",
      additionalCharges: [],
    },
    description: "",
  });

  const totalSteps = formData.isNewLandlord ? 5 : 4;
  const progress = (step / totalSteps) * 100;

  const filteredLandlords = landlords.filter((landlord) => {
    const term = searchTerm.toLowerCase();
    return (
      landlord.name?.toLowerCase().includes(term) ||
      landlord.email?.toLowerCase().includes(term) ||
      landlord.contact?.toLowerCase().includes(term) ||
      landlord.nationalId?.toLowerCase().includes(term)
    );
  });

  const handleNext = () => {
    setAttemptedNext(true);

    let missingFields: string[] = [];

    if (step === 1) {
      if (!formData.selectedLandlord && !formData.isNewLandlord) {
        missingFields.push("Select a landlord or add a new one");
      }
    }

    if (step === 2 && formData.isNewLandlord) {
      const { name, contact, nationalId } = formData.landlord;

      if (!name.trim()) missingFields.push("Landlord full name");
      if (!contact.trim()) missingFields.push("Landlord contact number");

      const normalizePhone = (phone: string) => {
        const trimmed = phone.replace(/\s+/g, "");
        if (trimmed.startsWith("+254")) {
          return "0" + trimmed.slice(4);
        }
        return trimmed;
      };

      const normalizedInputContact = normalizePhone(contact);

      const duplicateContactLandlord = landlords.find(
        (l) => l.contact && normalizePhone(l.contact) === normalizedInputContact
      );

      const duplicateIdLandlord =
        nationalId.trim() &&
        landlords.find(
          (l) => l.nationalId && l.nationalId.trim() === nationalId.trim()
        );

      if (duplicateContactLandlord || duplicateIdLandlord) {
        if (duplicateContactLandlord)
          missingFields.push(
            `A landlord with this contact number already exists: ${duplicateContactLandlord.name}`
          );
        if (duplicateIdLandlord)
          missingFields.push(
            `A landlord with this ID/Passport number already exists: ${duplicateIdLandlord.name}`
          );
      }
    }

    if (
      (step === 2 && !formData.isNewLandlord) ||
      (step === 3 && formData.isNewLandlord)
    ) {
      if (!formData.property.name.trim()) missingFields.push("Property name");
      const commission = parseFloat(formData.property.agreedCommission);
      if (formData.property.agreedCommission.trim() === "") {
        missingFields.push("Commission");
      } else if (isNaN(commission) || commission < 0) {
        missingFields.push("Commission must be a non-negative number");
      }
    }

    if (missingFields.length > 0) {
      toast.error(`Missing or invalid: ${missingFields.join(", ")}`);
      return;
    }

    setStep(step + 1);
    setAttemptedNext(false);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleNewLandlord = () => {
    if (formData.selectedLandlord) {
      toast.warning("Unselect the current landlord first to add a new one.");
      return;
    }

    setFormData({ ...formData, isNewLandlord: true });
    setStep(2);
  };

  const handleSelectLandlord = (landlordId: string) => {
    if (formData.selectedLandlord === landlordId) {
      setFormData({
        ...formData,
        selectedLandlord: "",
        landlord: {
          id: "",
          name: "",
          contact: "",
          nationalId: "",
          email: "",
        },
      });
      return;
    }

    const selectedLandlord = landlords.find((l) => l.id === landlordId);
    if (selectedLandlord) {
      setFormData({
        ...formData,
        selectedLandlord: landlordId,
        isNewLandlord: false,
        landlord: {
          id: selectedLandlord.id,
          name: selectedLandlord.name,
          contact: selectedLandlord.contact,
          nationalId: selectedLandlord.nationalId,
          email: selectedLandlord.email,
        },
      });
    }
  };

  const addAdditionalCharge = () => {
    if (formData.bills.additionalCharges.length >= 7) return;

    setFormData({
      ...formData,
      bills: {
        ...formData.bills,
        additionalCharges: [
          ...formData.bills.additionalCharges,
          { description: "", value: "", id: nextChargeId },
        ],
      },
    });
    setNextChargeId(nextChargeId + 1);
  };

  const removeAdditionalCharge = (id: number) => {
    setFormData({
      ...formData,
      bills: {
        ...formData.bills,
        additionalCharges: formData.bills.additionalCharges.filter(
          (charge) => charge.id !== id
        ),
      },
    });
  };

  const updateAdditionalCharge = (
    id: number,
    field: "description" | "value",
    value: string
  ) => {
    setFormData({
      ...formData,
      bills: {
        ...formData.bills,
        additionalCharges: formData.bills.additionalCharges.map((charge) =>
          charge.id === id ? { ...charge, [field]: value } : charge
        ),
      },
    });
  };

  const handleSubmit = async () => {
    const {
      landlord,
      isNewLandlord,
      selectedLandlord,
      property,
      bills,
      description,
    } = formData;

    // Transform additional charges
    const additionalChargesObject: Record<string, string | number | null> = {};

    bills.additionalCharges.forEach((charge, index) => {
      const fieldNum = index + 1;

      additionalChargesObject[`added_field_${fieldNum}`] =
        charge.description.trim() === "" ? null : charge.description.trim();

      additionalChargesObject[`added_field_${fieldNum}_price`] =
        charge.value.trim() === "" ? null : parseFloat(charge.value);
    });
    
    // Construct the final payload
    const payload: Record<string, any> = {
      name: property.name,
      agreed_commission: parseFloat(property.agreedCommission),
    };

    // Add optional string fields only if they have values
    if (property.address.trim()) payload.address = property.address.trim();
    if (property.lrNumber.trim()) payload.lr_number = property.lrNumber.trim();
    if (description.trim()) payload.description = description.trim();

    // Add bill fields only if they are valid numbers
    const addBillIfValid = (key: string, value: string) => {
      const num = parseFloat(value);
      if (!isNaN(num)) payload[key] = num;
    };

    addBillIfValid("water_bill", bills.waterPricePerUnit);
    addBillIfValid("service_charge", bills.serviceCharge);
    addBillIfValid("electricity_bill", bills.electricityPricePerUnit);
    addBillIfValid("garbage_collection", bills.garbageCollectionFee);

    // Add additional charges only if they’re filled
    bills.additionalCharges.forEach((charge, index) => {
      const num = parseFloat(charge.value);
      if (charge.description.trim() && !isNaN(num)) {
        const fieldNum = index + 1;
        payload[`added_field_${fieldNum}`] = charge.description.trim();
        payload[`added_field_${fieldNum}_price`] = num;
      }
    });

    // Add landlord fields
    if (isNewLandlord) {
      payload.landlordName = landlord.name;
      payload.landlordContact = landlord.contact;
      if (landlord.email.trim()) payload.landlordEmail = landlord.email.trim();
      if (landlord.nationalId.trim())
        payload.landlordNationalId = landlord.nationalId.trim();
    } else {
      payload.landlordId = selectedLandlord;
    }
    
    console.log(payload);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error("Error adding property:", error);
        return;
      }

      const data = await res.json();
      toast.success("Property added successfully!");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Failed to add property:", error);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Select Landlord";
      case 2:
        return formData.isNewLandlord ? "Landlord Details" : "Property Details";
      case 3:
        return formData.isNewLandlord ? "Property Details" : "Bills & Payments";
      case 4:
        return formData.isNewLandlord
          ? "Bills & Payments"
          : "Review & Description";
      case 5:
        return "Review & Description";
      default:
        return "";
    }
  };

  const [attemptedNext, setAttemptedNext] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <CardTitle>Add New Property</CardTitle>
          </div>
          <CardDescription>
            Step {step} of {totalSteps} - {getStepTitle()}
          </CardDescription>
          <Progress value={progress} className="w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Select Landlord */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Landlord</h3>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search landlords by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loadingLandlords ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[70px] rounded-md bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredLandlords.map((landlord) => (
                    <div
                      key={landlord.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                        formData.selectedLandlord === landlord.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleSelectLandlord(landlord.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{landlord.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {landlord.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {landlord.contact}
                          </p>
                        </div>
                        {formData.selectedLandlord === landlord.id && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleNewLandlord}
                  className={`w-full bg-transparent transition ${
                    formData.selectedLandlord
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  title={
                    formData.selectedLandlord
                      ? "Unselect the current landlord to add a new one"
                      : ""
                  }
                >
                  <User className="h-4 w-4 mr-2" />
                  Add New Landlord
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Landlord Details (only if new landlord) */}
          {step === 2 && formData.isNewLandlord && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Landlord Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="landlordName">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="landlordName"
                    value={formData.landlord.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landlord: {
                          ...formData.landlord,
                          name: e.target.value,
                        },
                      })
                    }
                    placeholder="John Doe"
                    aria-invalid={
                      attemptedNext && formData.landlord.name.trim() === ""
                    }
                    className={
                      attemptedNext && formData.landlord.name.trim() === ""
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {attemptedNext && formData.landlord.name.trim() === "" && (
                    <p className="text-red-500 text-sm mt-1">
                      Full name is required
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="landlordContact">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="landlordContact"
                    value={formData.landlord.contact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landlord: {
                          ...formData.landlord,
                          contact: e.target.value,
                        },
                      })
                    }
                    placeholder="+254 712 345 678"
                    aria-invalid={
                      attemptedNext && formData.landlord.contact.trim() === ""
                    }
                    className={
                      attemptedNext && formData.landlord.contact.trim() === ""
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {attemptedNext && formData.landlord.contact.trim() === "" && (
                    <p className="text-red-500 text-sm mt-1">
                      Contact number is required
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="nationalId">
                  National ID / Passport Number
                </Label>
                <Input
                  id="nationalId"
                  value={formData.landlord.nationalId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      landlord: {
                        ...formData.landlord,
                        nationalId: e.target.value,
                      },
                    })
                  }
                  placeholder="12345678"
                />
              </div>
              <div>
                <Label htmlFor="landlordEmail">Email Address</Label>
                <Input
                  id="landlordEmail"
                  type="email"
                  value={formData.landlord.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      landlord: { ...formData.landlord, email: e.target.value },
                    })
                  }
                  placeholder="john.doe@email.com"
                />
              </div>
            </div>
          )}

          {/* Property Details Step */}
          {((step === 2 && !formData.isNewLandlord) ||
            (step === 3 && formData.isNewLandlord)) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Property Details</h3>
              <div>
                <Label htmlFor="propertyName">
                  Property Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="propertyName"
                  value={formData.property.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property: { ...formData.property, name: e.target.value },
                    })
                  }
                  placeholder="Sunset Apartments"
                  aria-invalid={
                    attemptedNext && formData.property.name.trim() === ""
                  }
                  className={
                    attemptedNext && formData.property.name.trim() === ""
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {attemptedNext && formData.property.name.trim() === "" && (
                  <p className="text-red-500 text-sm mt-1">
                    Property name is required
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="propertyAddress">Property Address</Label>
                <Textarea
                  id="propertyAddress"
                  value={formData.property.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property: {
                        ...formData.property,
                        address: e.target.value,
                      },
                    })
                  }
                  placeholder="123 Main Street, Nairobi, Kenya"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lrNumber">LR Number</Label>
                  <Input
                    id="lrNumber"
                    value={formData.property.lrNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property: {
                          ...formData.property,
                          lrNumber: e.target.value,
                        },
                      })
                    }
                    placeholder="LR/12345/67"
                  />
                </div>
                <div>
                  <Label htmlFor="agreedCommission">
                    Agreed Commission (%){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="agreedCommission"
                    type="number"
                    value={formData.property.agreedCommission}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        property: {
                          ...formData.property,
                          agreedCommission: e.target.value,
                        },
                      })
                    }
                    placeholder="10"
                    aria-invalid={
                      attemptedNext &&
                      (formData.property.agreedCommission.trim() === "" ||
                        parseFloat(formData.property.agreedCommission) < 0)
                    }
                    className={
                      attemptedNext &&
                      (formData.property.agreedCommission.trim() === "" ||
                        parseFloat(formData.property.agreedCommission) < 0)
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  {attemptedNext &&
                    formData.property.agreedCommission.trim() === "" && (
                      <p className="text-red-500 text-sm mt-1">
                        Commission is required
                      </p>
                    )}
                  {attemptedNext &&
                    formData.property.agreedCommission.trim() !== "" &&
                    parseFloat(formData.property.agreedCommission) < 0 && (
                      <p className="text-red-500 text-sm mt-1">
                        Commission cannot be negative
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Bills & Payments Step */}
          {((step === 3 && !formData.isNewLandlord) ||
            (step === 4 && formData.isNewLandlord)) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bills & Payments</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stack these two vertically */}
                <div className="flex flex-col gap-4">
                  <div>
                    <Label htmlFor="waterPrice">
                      Water Price per Unit (KSH)
                    </Label>
                    <Input
                      id="waterPrice"
                      type="number"
                      value={formData.bills.waterPricePerUnit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bills: {
                            ...formData.bills,
                            waterPricePerUnit: e.target.value,
                          },
                        })
                      }
                      placeholder="eg. 500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="serviceCharge">Service Charge (KSH)</Label>
                    <Input
                      id="serviceCharge"
                      type="number"
                      value={formData.bills.serviceCharge}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bills: {
                            ...formData.bills,
                            serviceCharge: e.target.value,
                          },
                        })
                      }
                      placeholder="eg. 50"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="electricityPrice">
                    Electricity Price per Unit (KSH)
                  </Label>
                  <Input
                    id="electricityPrice"
                    type="number"
                    value={formData.bills.electricityPricePerUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bills: {
                          ...formData.bills,
                          electricityPricePerUnit: e.target.value,
                        },
                      })
                    }
                    placeholder="0"
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="garbageFee">
                    Garbage Collection Fee (KSH)
                  </Label>
                  <Input
                    id="garbageFee"
                    type="number"
                    value={formData.bills.garbageCollectionFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bills: {
                          ...formData.bills,
                          garbageCollectionFee: e.target.value,
                        },
                      })
                    }
                    placeholder="eg. 200"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Additional Charges</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalCharge}
                    disabled={formData.bills.additionalCharges.length >= 7}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Charge
                  </Button>
                </div>

                {formData.bills.additionalCharges.map((charge) => (
                  <div key={charge.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Description</Label>
                      <Input
                        value={charge.description}
                        onChange={(e) =>
                          updateAdditionalCharge(
                            charge.id,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Security fee, Parking fee, etc."
                      />
                    </div>
                    <div className="w-32">
                      <Label>Amount (KSH)</Label>
                      <Input
                        type="number"
                        value={charge.value}
                        onChange={(e) =>
                          updateAdditionalCharge(
                            charge.id,
                            "value",
                            e.target.value
                          )
                        }
                        placeholder="eg. 500"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAdditionalCharge(charge.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review & Description Step */}
          {((step === 4 && !formData.isNewLandlord) ||
            (step === 5 && formData.isNewLandlord)) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review & Description</h3>

              <div>
                <Label htmlFor="description">Property Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe the property features, amenities, and any special notes..."
                  rows={4}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <h4 className="font-semibold">Review Your Information</h4>

                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Landlord:</strong> {formData.landlord.name}
                    {formData.isNewLandlord && (
                      <Badge variant="secondary" className="ml-2">
                        New
                      </Badge>
                    )}
                  </div>
                  <div>
                    <strong>Contact:</strong> {formData.landlord.contact}
                  </div>
                  <div>
                    <strong>Email:</strong> {formData.landlord.email}
                  </div>
                  {formData.landlord.nationalId && (
                    <div>
                      <strong>ID/Passport:</strong>{" "}
                      {formData.landlord.nationalId}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm border-t pt-2">
                  <div>
                    <strong>Property:</strong> {formData.property.name}
                  </div>
                  <div>
                    <strong>Address:</strong> {formData.property.address}
                  </div>
                  <div>
                    <strong>LR Number:</strong> {formData.property.lrNumber}
                  </div>
                  <div>
                    <strong>Commission:</strong>{" "}
                    {formData.property.agreedCommission}%
                  </div>
                </div>

                <div className="space-y-2 text-sm border-t pt-2">
                  <div>
                    <strong>Water:</strong> KSH{" "}
                    {formData.bills.waterPricePerUnit}/unit
                  </div>
                  <div>
                    <strong>Electricity:</strong> KSH{" "}
                    {formData.bills.electricityPricePerUnit}/unit
                  </div>
                  <div>
                    <strong>Garbage:</strong> KSH{" "}
                    {formData.bills.garbageCollectionFee}
                  </div>
                  {formData.bills.additionalCharges.length > 0 && (
                    <div>
                      <strong>Additional Charges:</strong>
                      {formData.bills.additionalCharges.map((charge) => (
                        <div key={charge.id} className="ml-4">
                          • {charge.description}: KSH {charge.value}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handlePrev}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step < totalSteps ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 1 &&
                      !formData.selectedLandlord &&
                      !formData.isNewLandlord) ||
                    (step === 2 &&
                      formData.isNewLandlord &&
                      !formData.landlord.name)
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>Add Property</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
