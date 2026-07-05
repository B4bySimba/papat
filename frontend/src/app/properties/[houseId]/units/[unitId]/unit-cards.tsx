"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Receipt,
  MoreHorizontal,
  Edit,
  PersonStanding,
  ClipboardList,
  MessageCircle,
  MoveRight,
  Trash2,
  ArrowRight,
  Eye,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatCard from "@/components/StatCard";
import Link from "next/link";
import MoveTenantSheet from "@/components/tenant/MoveTenantSheet";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { LedgerModal } from "@/components/charts/LedgerModular";

interface Props {
  houseId: string;
  unitId: string;
  tenant: any;
  message: any;
  tenantSheetOpen: boolean;
  setTenantSheetOpen: (val: boolean) => void;
  refreshTenant: () => void;
  onUpdateTenant: (updatedTenant: any) => void;
}

export default function UnitCards({
  houseId,
  unitId,
  tenant,
  message,
  tenantSheetOpen,
  setTenantSheetOpen,
  refreshTenant,
  onUpdateTenant,
}: Props) {
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);
  const availableUnits = [
    { id: "101", label: "Unit A - 1st Floor" },
    { id: "102", label: "Unit B - 2nd Floor" },
    { id: "103", label: "Unit C - 3rd Floor" },
  ];

  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);

  const [deleting, setDeleting] = useState(false);

  const [billsSheetOpen, setBillsSheetOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const initialForm = {
    name: tenant?.tenant?.name ?? "",
    contact: tenant?.tenant?.contact ?? "",
    nationId: tenant?.tenant?.nationalId ?? "",
    rentRate: tenant?.rentRate ?? 0,
    deposit: tenant?.deposit ?? 0,
    emergencyContactName: tenant?.emergencyContactName ?? "",
    emergencyContactPhone: tenant?.emergencyContactPhone ?? "",
    notes: tenant?.notes ?? "",
  };

  const [form, setForm] = useState(initialForm);
  const [terminateSheetOpen, setTerminateSheetOpen] = useState(false);
  const [terminationDate, setTerminationDate] = useState("");
  const [terminationReason, setTerminationReason] = useState("");
  const [terminating, setTerminating] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const [editingArrears, setEditingArrears] = useState(false);
  const [arrearsValue, setArrearsValue] = useState(tenant.arrearsbf || 0);
  const [savingArrears, setSavingArrears] = useState(false);



  const getChangedFields = (original: typeof form, updated: typeof form) => {
    const changed: Partial<typeof form> = {};
    for (const key in updated) {
      if (
        updated[key as keyof typeof form] !== original[key as keyof typeof form]
      ) {
        changed[key as keyof typeof form] = updated[key as keyof typeof form];
      }
    }
    return changed;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      name: tenant?.tenant?.name ?? "",
      contact: tenant?.tenant?.contact ?? "",
      nationId: tenant?.tenant?.nationalId ?? "",
      rentRate: tenant?.rentRate ?? 0,
      deposit: tenant?.deposit ?? 0,
      emergencyContactName: tenant?.emergencyContactName ?? "",
      emergencyContactPhone: tenant?.emergencyContactPhone ?? "",
      notes: tenant?.notes ?? "",
    });
  };

  const handleSave = async () => {
    const changes = getChangedFields(initialForm, form);

    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save.");
      setEditMode(false);
      setTenantSheetOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/tenant/edit/${tenant.tenant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to update tenant.");
      }

      toast.success("Tenant updated successfully.");
      setEditMode(false);
      setTenantSheetOpen(false);
      onUpdateTenant({
        data: {
          ...tenant,
          tenant: {
            ...tenant.tenant,
            ...changes,
          },
        },
      });
      
    } catch (error) {
      toast.error("Update failed: " + (error as Error).message);
    }
  };

  const charges = [
    tenant.rentRate,
    tenant.garbage_collection,
    ...Array.from(
      { length: 7 },
      (_, i) => tenant[`added_field_${i + 1}_price`] || 0
    ),
    tenant.additionalCharges || 0,
  ];

  const totalBills = charges.reduce((sum, val) => sum + (val > 0 ? val : 0), 0);
  // console.log(tenant)

  useEffect(() => {
    if (tenant?.leaseCode) {
      fetch(`/api/payment/ledger?leaseCode=${tenant.leaseCode}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch ledger data");
          return res.json();
        })
        .then((data) => {
          setLedgerData(data.data || []);
        })
        .catch((err) => {
          console.error("Failed to load ledger data", err);
          toast.error("Failed to load ledger data");
        });
    }
  }, [tenant?.leaseCode]);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* � Tenant Info — opens Sheet */}
      <Sheet
        open={tenantSheetOpen}
        onOpenChange={(open) => {
          if (!open && editMode) {
            setShowDiscardConfirm(true);
          } else {
            setTenantSheetOpen(open);
            if (!open) {
              setEditMode(false);
              handleCancel();
            }
          }
        }}
      >
        <SheetTrigger asChild>
          <div onClick={() => setTenantSheetOpen(true)}>
            <StatCard
              title="Tenant Info"
              value={tenant?.tenant.name}
              icon={PersonStanding}
              subtext={`Contact: ${tenant.tenant.contact ?? "N/A"}`}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-[400px] sm:w-[500px] flex flex-col p-6"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl">Tenant Overview</SheetTitle>
            <SheetDescription>
              {editMode
                ? "Edit tenant details."
                : "View tenant and unit information."}
            </SheetDescription>
          </SheetHeader>

          {!editMode && (
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid gap-6 text-sm ">
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">
                  Tenant Details
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
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact">Contact</Label>
                      <Input
                        id="contact"
                        name="contact"
                        value={form.contact}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div>
                      <Label htmlFor="nationId">National ID</Label>
                      <Input
                        id="nationId"
                        name="nationId"
                        value={form.nationId}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactName">
                        Emergency Contact Name
                      </Label>
                      <Input
                        id="emergencyContactName"
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContactPhone">
                        Emergency Contact Phone
                      </Label>
                      <Input
                        id="emergencyContactPhone"
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleInputChange}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      To edit Unit details, please visit the{" "}
                      <Link
                        href={`/landlords/${tenant.landlord?.id}`}
                        className="underline font-medium text-primary"
                      >
                        Edit Unit
                      </Link>{" "}
                      page.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <strong>Name:</strong> {form.name}
                    </div>
                    <div>
                      <strong>Contact:</strong> {form.contact}
                    </div>
                    <div>
                      <strong>National ID:</strong> {form.nationId}
                    </div>
                    <div>
                      <strong>Emergency Contact Name:</strong>{" "}
                      {form.emergencyContactName}
                    </div>
                    <div>
                      <strong>Emergency Contact Phone:</strong>{" "}
                      {form.emergencyContactPhone}
                    </div>
                    <div>
                      <strong>notes:</strong> {form.notes}
                    </div>
                  </div>
                )}
              </div>
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

      {/* � Bills & Charges */}
      <Sheet open={billsSheetOpen} onOpenChange={setBillsSheetOpen}>
        <SheetTrigger asChild>
          <div onClick={() => setBillsSheetOpen(true)}>
            <StatCard
              title="Bills & Charges"
              value={
                <span className="flex items-center gap-2">
                  Rent <span className="text-muted-foreground">:</span> KES{" "}
                  {tenant.rentRate.toLocaleString()}
                </span>
              }
              icon={Receipt}
              subtext="Click to view breakdown"
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-full sm:w-[500px] flex flex-col p-6 border-l border-border bg-background shadow-xl"
        >
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-bold tracking-tight text-foreground">
              Bills & Charges
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Detailed breakdown of current charges for this tenant.
            </SheetDescription>
          </SheetHeader>

          {/* <div className="text-lg font-semibold text-foreground mb-6">
            Total:{" "}
            <span className="text-primary">
              KES {totalBills.toLocaleString()}
            </span>
          </div> */}

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Section: Fixed Bills */}
            <div>
              <h3 className="text-base font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Fixed Bills
              </h3>
              <div className="grid gap-3 text-sm ">
                {tenant.rentRate > 0 && (
                  <div className="flex justify-between">
                    <span>Rent Rate:</span>
                    <span className="text-foreground font-medium">
                      KES {tenant.rentRate}
                    </span>
                  </div>
                )}
                {tenant.garbage_collection > 0 && (
                  <div className="flex justify-between">
                    <span>Garbage:</span>
                    <span className="text-foreground font-medium">
                      KES {tenant.garbage_collection}
                    </span>
                  </div>
                )}
                {Array.from({ length: 7 }).map((_, i) => {
                  const label = tenant[`added_field_${i + 1}`];
                  const price = tenant[`added_field_${i + 1}_price`];
                  return label && price > 0 ? (
                    <div key={i} className="flex justify-between">
                      <span>{label}:</span>
                      <span className="text-foreground font-medium">
                        KES {price}
                      </span>
                    </div>
                  ) : null;
                })}
                {tenant.additional && tenant.additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span>{tenant.additional}:</span>
                    <span className="text-foreground font-medium">
                      KES {tenant.additionalCharges}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-muted" />

            {/* Section: Unit-Based Rates */}
            <div>
              <h3 className="text-base font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Unit-Based Rates
              </h3>
              <div className="grid gap-3 text-sm ">
                {tenant.water_bill > 0 && (
                  <div className="flex justify-between">
                    <span>Water (per unit):</span>
                    <span className="text-foreground font-medium">
                      KES {tenant.water_bill}
                    </span>
                  </div>
                )}
                {tenant.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge (water):</span>
                    <span className="text-foreground font-medium">
                      KES {tenant.serviceCharge}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-muted" />

            {/* Section: Other Charges */}
            <div>
              <h3 className="text-base font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Other Charges
              </h3>
              <div className="grid gap-3 text-sm ">
                {tenant.deposit > 0 && (
                  <div className="flex justify-between">
                    <span>Security Deposit:</span>
                    <span className="text-foreground font-medium">
                      KES {tenant.deposit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Arrears Brought Forward on Entry
              </h3>
              <div className="grid gap-3 text-sm">
                {!editingArrears ? (
                  <div className="flex justify-between items-center">
                    <span>Arrears B/F:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        KES {arrearsValue.toLocaleString()}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6"
                        onClick={() => setEditingArrears(true)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={arrearsValue}
                        onChange={(e) =>
                          setArrearsValue(Number(e.target.value))
                        }
                        className="w-32"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          setSavingArrears(true);
                          try {
                            const res = await fetch("/api/arrears/edit", {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                leaseId: tenant.leaseId,
                                arrearsbf: arrearsValue,
                              }),
                            });

                            if (!res.ok) {
                              const text = await res.text();
                              throw new Error(
                                text || "Failed to update arrears"
                              );
                            }

                            toast.success("Arrears updated");
                            setEditingArrears(false);
                          } catch (err) {
                            toast.error((err as Error).message);
                          } finally {
                            setSavingArrears(false);
                          }
                        }}
                        disabled={savingArrears}
                      >
                        {savingArrears ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingArrears(false);
                          setArrearsValue(tenant.arrearsbf || 0);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ⚙️ Actions */}
      <Sheet>
        <SheetTrigger asChild>
          <div onClick={() => {}}>
            <StatCard
              title="Actions"
              value="Manage"
              icon={MoreHorizontal}
              subtext="Click to view actions"
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-[400px] sm:w-[500px] flex flex-col p-6"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl">Tenant Actions</SheetTitle>
            <SheetDescription>
              Perform actions related to this tenant.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3">
            <Button
              variant="default"
              onClick={() => setLedgerOpen(true)}
              className="justify-start cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              View Ledger
            </Button>

            <Button
              variant="outline"
              onClick={() => console.log("Send Message")}
              className="justify-start cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Message
            </Button>

            <Button
              variant="outline"
              onClick={() => setMoveSheetOpen(true)}
              className="justify-start cursor-pointer"
            >
              <MoveRight className="w-4 h-4 mr-2" />
              Move Tenant to Another Unit
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setEditMode(true);
                setTenantSheetOpen(true);
              }}
              className="justify-start cursor-pointer"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Tenant Details
            </Button>

            <Button
              variant="destructive"
              onClick={() => setTerminateSheetOpen(true)}
              className="justify-start cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Terminate Lease
            </Button>

            <AlertDialog
              open={deleteConfirmOpen}
              onOpenChange={setDeleteConfirmOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer justify-start"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete Tenant: {tenant?.tenant?.name}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all data for{" "}
                    <strong>{tenant?.tenant?.name}</strong>. This action cannot
                    be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel
                    disabled={deleting}
                    className="cursor-pointer"
                  >
                    Cancel
                  </AlertDialogCancel>

                  <AlertDialogAction
                    disabled={deleting}
                    className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
                    onClick={async () => {
                      setDeleting(true);
                      setDeleteError(null);
                      try {
                        const res = await fetch(
                          `/api/tenant/delete/${tenant.tenant.id}`,
                          {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                            },
                          }
                        );

                        if (!res.ok) {
                          const text = await res.text();
                          throw new Error(text || "Failed to delete tenant");
                        }

                        toast.success(
                          `Tenant "${tenant?.tenant?.name}" deleted successfully`
                        );
                        setTenantSheetOpen(false); // Close tenant sheet if open
                        setDeleteConfirmOpen(false);

                        setTimeout(() => {
                          router.push(`/properties/${tenant.houseId}/units`);
                        }, 1000);
                      } catch (err) {
                        console.error("Error deleting tenant:", err);
                        toast.error(
                          (err as Error).message || "Failed to delete tenant"
                        );
                      } finally {
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting
                      ? "Deleting..."
                      : `Yes, delete ${tenant?.tenant?.name}`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              className="text-sm min-w-[150px] bg-transparent cursor-pointer justify-start"
              onClick={() => {
                router.push(`/properties/${houseId}/units/${unitId}/past`);
              }}
            >
              <Eye className="mr-1 h-4 w-4" />
              View Past Tenants
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {/* Discard Changes Dialog */}
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
                setTenantSheetOpen(false);
                setShowDiscardConfirm(false);
                handleCancel();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Sheet open={terminateSheetOpen} onOpenChange={setTerminateSheetOpen}>
        <SheetContent
          side="right"
          className="w-[400px] sm:w-[500px] p-6 flex flex-col"
        >
          <SheetHeader className="mb-4">
            <SheetTitle>Terminate Lease</SheetTitle>
            <SheetDescription>
              Please enter the termination date and optional reason.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 flex-1 overflow-auto pr-2">
            <div>
              <Label htmlFor="terminationDate">Termination Date</Label>
              <Input
                id="terminationDate"
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="terminationReason">Reason (optional)</Label>
              <Textarea
                id="terminationReason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
              />
            </div>
          </div>

          <SheetFooter className="mt-6 border-t pt-4">
            <Button
              disabled={!terminationDate || terminating}
              onClick={async () => {
                setTerminating(true);
                try {
                  const res = await fetch(
                    `/api/tenant/vacate/${tenant.tenant.id}`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        terminationDate,
                        reason: terminationReason,
                      }),
                    }
                  );

                  if (!res.ok) {
                    const msg = await res.text();
                    throw new Error(msg || "Failed to terminate lease");
                  }

                  toast.success("Lease terminated successfully.");
                  setTerminateSheetOpen(false);
                  setTenantSheetOpen(false);
                  onUpdateTenant({ message: "Unit is Vacant" });
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setTerminating(false);
                }
              }}
            >
              {terminating ? "Submitting..." : "Confirm Termination"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setTerminateSheetOpen(false)}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <MoveTenantSheet
        open={moveSheetOpen}
        onOpenChange={setMoveSheetOpen}
        currentUnitId={unitId}
        availableUnits={availableUnits}
        onConfirm={(newUnitId) => {
          console.log(`Move tenant from ${unitId} to ${newUnitId}`);
          // await moveTenant(unitId, newUnitId);
        }}
      />

      <LedgerModal
        name={tenant.tenant.name}
        data={ledgerData || []}
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
      />
    </div>
  );
}
