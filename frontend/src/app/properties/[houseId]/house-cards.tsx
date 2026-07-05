"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, DoorOpen, DoorClosed, Home, Edit } from "lucide-react";
import StatCard from "@/components/StatCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  house: any;
  houseId: string;
  onUpdateHouse: (updatedHouse: any) => void;
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  sheetOpen: boolean;
  setSheetOpen: (val: boolean) => void;
}

export default function HouseCards({
  house,
  houseId,
  onUpdateHouse,
  editMode,
  setEditMode,
  sheetOpen,
  setSheetOpen,
}: Props) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // const [sheetOpen, setSheetOpen] = useState(false);
  // const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: house.name,
    lr_number: house.lr_number || "",
    address: house.address || "",
    landlordName: house.landlord?.name || "",
    email: house.landlord?.email || "",
    contact: house.landlord?.contact || "",
    nationalId: house.landlord?.nationalId || "",
  });
  const totalUnits = house.unit.true + house.unit.false;
  const occupiedUnits = house.unit.true;
  const vacantUnits = house.unit.false;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const original = {
      name: house.name || "",
      lr_number: house.lr_number || "",
      address: house.address || "",
    };

    const payload: Partial<typeof original> = {};

    (["name", "lr_number", "address"] as const).forEach((key) => {
      if (form[key] !== original[key]) {
        payload[key] = form[key];
      }
    });

    if (Object.keys(payload).length === 0) {
      console.log("No changes to save.");
      setEditMode(false);
      return;
    }

    try {
      const res = await fetch("/api/properties/edit", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ houseId, payload }),
      });

      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);

      const result = await res.json();
      console.log("Updated house:", result);

      setEditMode(false);
      setSheetOpen(false);
      onUpdateHouse({
        ...house,
        ...payload,
      });
    } catch (err) {
      console.error("Error saving house:", err);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      name: house.name,
      lr_number: house.lr_number || "",
      address: house.address || "",
      landlordName: house.landlord?.name || "",
      email: house.landlord?.email || "",
      contact: house.landlord?.contact || "",
      nationalId: house.landlord?.nationalId || "",
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {/*  House Info Card → opens Sheet */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open && editMode) {
            setShowDiscardConfirm(true);
          } else {
            setSheetOpen(open);
            if (!open) {
              setEditMode(false);
              handleCancel();
            }
          }
        }}
      >
        <SheetTrigger asChild>
          <div onClick={() => setSheetOpen(true)}>
            <StatCard
              title="House Info"
              value={house.name}
              icon={Building2}
              subtext={`LR No: ${house.lr_number ?? "N/A"} | Landlord: ${
                house.landlord?.name ?? "N/A"
              }`}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-[400px] sm:w-[500px] flex flex-col p-6"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl">Property Overview</SheetTitle>
            <SheetDescription>
              {editMode
                ? "Edit house details."
                : "View the house and landlord information."}
            </SheetDescription>
          </SheetHeader>

          {!editMode && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
                className="cursor-pointer"
              >
                <Edit />
                Edit
              </Button>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid gap-6 text-sm text-muted-foreground">
              {/* House Details */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">
                  House Details
                </h3>

                {editMode ? (
                  <>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lr_number">LR Number</Label>
                      <Input
                        id="lr_number"
                        name="lr_number"
                        value={form.lr_number}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={form.address}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      To edit landlord details, please visit the{" "}
                      <Link
                        href={`/landlords/${house.landlord?.id}`}
                        className="underline font-medium text-primary"
                      >
                        Edit Landlord
                      </Link>{" "}
                      page.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <strong className="text-foreground">Name:</strong>{" "}
                      {form.name}
                    </div>
                    <div>
                      <strong className="text-foreground">LR Number:</strong>{" "}
                      {form.lr_number || "N/A"}
                    </div>
                    <div>
                      <strong className="text-foreground">address:</strong>{" "}
                      {form.address || "N/A"}
                    </div>
                  </div>
                )}
              </div>

              {/* Landlord Details - only in view mode */}
              {!editMode && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-base font-semibold text-foreground">
                    Landlord Details
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <strong className="text-foreground">Name:</strong>{" "}
                      {form.landlordName}
                    </div>
                    <div>
                      <strong className="text-foreground">Email:</strong>{" "}
                      {form.email}
                    </div>
                    <div>
                      <strong className="text-foreground">Phone:</strong>{" "}
                      {form.contact}
                    </div>
                    <div>
                      <strong className="text-foreground">National ID:</strong>{" "}
                      {form.nationalId}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {editMode && (
            <SheetFooter className="mt-6 border-t pt-4 bg-background sticky bottom-0 z-10 flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" onClick={handleSave}>
                Save Changes
              </Button>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/*  Other Stat Cards */}
      <Link
        href={`/properties/${houseId}/units?status=vacant`}
        className="block"
      >
        <StatCard
          title="Vacant Units"
          value={vacantUnits}
          icon={DoorOpen}
          subtext={`${vacantUnits} currently available`}
          className="cursor-pointer hover:shadow-lg transition"
        />
      </Link>

      <Link
        href={`/properties/${houseId}/units?status=occupied`}
        className="block"
      >
        <StatCard
          title="Occupied Units"
          value={occupiedUnits}
          icon={DoorClosed}
          subtext={`${occupiedUnits} currently occupied`}
          className="cursor-pointer hover:shadow-lg transition"
        />
      </Link>

      <Link href={`/properties/${houseId}/units?status=all`} className="block">
        <StatCard
          title="Total Units"
          value={totalUnits}
          icon={Home}
          subtext={`${totalUnits} total`}
          className="cursor-pointer hover:shadow-lg transition"
        />
      </Link>

      <AlertDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you close now, they'll be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEditMode(false);
                setSheetOpen(false);
                setShowDiscardConfirm(false);
                handleCancel();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
