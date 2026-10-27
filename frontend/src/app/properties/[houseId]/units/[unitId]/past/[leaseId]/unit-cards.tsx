"use client";

import { useAccess } from "@/components/AccessProvider";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Receipt,
  Edit,
  PersonStanding,
  ClipboardList,
  ArrowRight,
  HandCoins,
  UserRoundX,
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
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatCard from "@/components/StatCard";
import Link from "next/link";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { LedgerModal } from "@/components/charts/LedgerModular";
import VacateTenantSheet from "@/components/tenant/VacateTenantSheet";
import { LogPaymentFloating } from "@/components/forms/log-payment-floating";

interface Props {
  unitId: string;
  tenant: any;
  message: any;
  tenantSheetOpen: boolean;
  setTenantSheetOpen: (val: boolean) => void;
  refreshTenant: () => void;
  onUpdateTenant: (updatedTenant: any) => void;
}

export default function UnitCards({
  unitId,
  tenant,
  message,
  tenantSheetOpen,
  setTenantSheetOpen,
  refreshTenant,
  onUpdateTenant,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [ledgerData, setLedgerData] = useState<any[]>([]);

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
  const [moveOutOpen, setMoveOutOpen] = useState(false);
  const [vacateOpen, setVacateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const { houseId } = useParams<{ houseId: string }>();
  const { can } = useAccess();
  const money = can("payments.view", houseId);
  const moveOut = tenant.moveOut;
  const movedOnText = moveOut.date.split("-").reverse().join("/");
  const balanceText =
    moveOut.balance > 0
      ? `Owes KES ${moveOut.balance.toLocaleString()}`
      : moveOut.balance < 0
        ? `In credit KES ${(-moveOut.balance).toLocaleString()}`
        : "Settled";
  const reload = () =>
    fetch(`/api/tenant/pastTenant/${tenant.leaseId}`)
      .then((res) => res.json())
      .then((json) => json?.data?.moveOut && onUpdateTenant(json))
      .catch(() => {});

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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {/* � Tenant Info: opens Sheet */}
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
          <div onClick={() => setTenantSheetOpen(true)} className="col-span-2 sm:col-span-1">
            <StatCard
              title="Tenant Info"
              value={tenant?.tenant.name}
              icon={PersonStanding}
              subtext={`Contact: ${tenant.tenant.contact ?? "N/A"}`}
              className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-full sm:w-[500px] flex flex-col p-4 sm:p-6"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl">Tenant Overview</SheetTitle>
            <SheetDescription>
              {editMode
                ? "Edit tenant details."
                : "View tenant and unit information."}
            </SheetDescription>
          </SheetHeader>

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
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  Rent <span className="text-muted-foreground">:</span> KES{" "}
                  {tenant.rentRate.toLocaleString()}
                </span>
              }
              icon={Receipt}
              subtext="Click to view breakdown"
              className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-full sm:w-[500px] flex flex-col p-4 sm:p-6 border-l border-border bg-background shadow-xl"
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

            {money && <div>
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
            </div>}
          </div>
        </SheetContent>
      </Sheet>

      {/* Move-out */}
      <Sheet open={moveOutOpen} onOpenChange={setMoveOutOpen}>
        <SheetTrigger asChild>
          <div>
            <StatCard
              title="Move-out"
              value={moveOut.movedToUnit ? "Moved units" : money ? balanceText : "Moved out"}
              icon={UserRoundX}
              subtext={`Moved out ${movedOnText}`}
              className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
            />
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-full sm:w-[500px] flex flex-col p-4 sm:p-6"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-2xl">Move-out</SheetTitle>
            <SheetDescription>
              What happened when {tenant.tenant.name} left. Personal details stay as they were.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Moved out</dt>
              <dd className="text-right font-medium">{movedOnText}</dd>
              {moveOut.movedToUnit && (
                <>
                  <dt className="text-muted-foreground">Moved to</dt>
                  <dd className="text-right font-medium">Unit {moveOut.movedToUnit}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="text-right font-medium">{moveOut.reason || "-"}</dd>
              <dt className="text-muted-foreground">Final meter reading</dt>
              <dd className="text-right font-medium">{moveOut.finalReading ?? "-"}</dd>
              <dt className="text-muted-foreground">Lease code</dt>
              <dd className="text-right font-medium">{tenant.leaseCode}</dd>
              {!moveOut.movedToUnit && money && (
                <>
                  <dt className="text-muted-foreground">Deposit held</dt>
                  <dd className="text-right font-medium">KES {moveOut.depositHeld.toLocaleString()}</dd>
                  <dt className="text-muted-foreground">
                    Used for expenses{moveOut.depositExpensesNote ? ` (${moveOut.depositExpensesNote})` : ""}
                  </dt>
                  <dd className="text-right font-medium">KES {(moveOut.depositExpenses ?? 0).toLocaleString()}</dd>
                  <dt className="text-muted-foreground">Refunded to tenant</dt>
                  <dd className="text-right font-medium">KES {(moveOut.depositRefund ?? 0).toLocaleString()}</dd>
                  <dt className="font-medium">Balance now</dt>
                  <dd className="text-right font-semibold">{balanceText}</dd>
                </>
              )}
            </dl>
          </div>

          <SheetFooter className="mt-4 border-t pt-4 flex-col gap-2 sm:flex-row sm:justify-end">
            {money && <Button variant="outline" onClick={() => setLedgerOpen(true)}>
              <ClipboardList className="w-4 h-4 mr-2" />
              View Ledger
            </Button>}
            {!moveOut.movedToUnit && can("tenants.vacate", houseId) && (
              <Button variant="outline" onClick={() => setVacateOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit move-out
              </Button>
            )}
            {can("payments.add", houseId) && <Button onClick={() => setPayOpen(true)}>
              <HandCoins className="w-4 h-4 mr-2" />
              Record payment
            </Button>}
          </SheetFooter>
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
      <VacateTenantSheet
        open={vacateOpen}
        onOpenChange={setVacateOpen}
        tenantId={tenant.tenant.id}
        waterBilled={tenant.water_bill > 0}
        initial={moveOut}
        onDone={() => window.location.reload()}
      />

      {payOpen && (
        <LogPaymentFloating
          leaseCode={tenant.leaseCode}
          onClose={() => {
            setPayOpen(false);
            reload();
          }}
        />
      )}

      <LedgerModal
        name={tenant.tenant.name}
        data={ledgerData || []}
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
      />
    </div>
  );
}
