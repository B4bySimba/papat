"use client";

import DashboardCards from "@/app/dashboard/dashboard-cards";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { SkeletonChart } from "@/components/skeleton/chart";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, User, View } from "lucide-react";
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
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import UnitCards from "./unit-cards";
import UnitBar from "./unit-bar";
import UnitArea from "./unit-area";
import UnitYearSelector from "./year-selector";
import UnitLedger from "./unit-ledger";
import SkeletonBoard from "@/components/skeleton/board";
import { CardTitle } from "@/components/ui/card";
import { GlobalUnitEditSheet } from "@/components/GlobalUnitSheetEditor";
import { useUnitEditSheet } from "@/lib/store/useUnitEditsheet";
import { AddTenantModal } from "@/components/forms/add-tenant-modal";
import RecentPayments from "./recent-payments";
import MaintenanceRequests from "../../maintenance-requests";
import { LedgerModal } from "@/components/charts/LedgerModular";

type ViewType = "barChart" | "areaChart" | "ledger";

interface Props {
  unitId: string;
  tenant: any;
}

export default function UnitPageClient({
  unitId,
  tenant: initialTenant,
}: Props) {
  const [years, setYears] = useState<number[]>([]);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const params = useParams();
  const houseId = params.houseId as string;
  const [view, setView] = useState<ViewType>("barChart");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loading1, setLoading1] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [tenant, setTenant] = useState<any>(initialTenant);
  const [tenantSheetOpen, setTenantSheetOpen] = useState(false);

  const [showModal, setShowModal] = useState({
    show: false,
    houseId: "",
    unitId: "",
  });
  const router = useRouter();
  const leaseCode = tenant?.data?.leaseCode;

  useEffect(() => {
    if (leaseCode) {
      // Load chart data
      setLoading(true);
      fetch(`/api/payment/lease-summary?leaseCode=${leaseCode}&year=${year}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          return res.json();
        })
        .then(({ years, chartData }) => {
          setYears(years);
          setChartData(chartData);
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to load chart data");
        })
        .finally(() => {
          setLoading(false);
        });

      // Load ledger data
      fetch(`/api/payment/ledger?leaseCode=${leaseCode}`)
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
  }, [year, leaseCode]);

  const isVacant = tenant === null || tenant?.message === "Unit is Vacant";
  const isNotFound = tenant.message === "Unit does not exist";

  const hasValidData =
    chartData.length > 1 ||
    (chartData.length === 1 &&
      Object.values(chartData[0]).some(
        (v) => typeof v === "number" && v !== 0
      ));

  const refreshTenant = () => {
    fetch(`/api/tenant/byUnitId/${unitId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json?.data?.leaseCode) {
          toast.error("Invalid tenant data returned from server.");
          return;
        }
        setTenant(json);
      });
  };

  if (isNotFound) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <Trash2 className="w-10 h-10 text-destructive mb-3" />
        <h2 className="text-xl font-semibold text-destructive mb-1">
          Unit not found.
        </h2>
        <p className="text-sm text-muted-foreground">
          The unit you're trying to view does not exist or was deleted.
        </p>
        <div className="justify-center pt-8">
          <Button
            variant="default"
            className="text-sm min-w-[150px] cursor-pointer"
            onClick={() => {
              router.push(`/properties/${houseId}/units`);
            }}
          >
            Back to Units Listing
          </Button>
        </div>
      </div>
    );
  }

  if (isVacant) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <User className="w-12 h-12 text-muted-foreground mb-4" />
        <CardTitle className="text-xl font-semibold text-muted-foreground mb-2">
          This unit is currently vacant.
        </CardTitle>
        <p className="text-base text-muted-foreground">
          There is no active tenant in this unit at the moment.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pb-8">
          <Button
            variant="default"
            className="text-sm min-w-[150px] cursor-pointer"
            onClick={() =>
              setShowModal({
                show: true,
                houseId: houseId,
                unitId: unitId,
              })
            }
          >
            Add Tenant
          </Button>

          {showModal.show && (
            <AddTenantModal
              onClose={(submittedSuccessfully: boolean = false) => {
                setShowModal({ show: false, houseId: "", unitId: "" });
                if (submittedSuccessfully) {
                  fetch(`/api/tenant/byUnitId/${unitId}`)
                    .then((res) => res.json())
                    .then((json) => setTenant(json));
                }
              }}
              initialPropertyId={showModal.houseId}
              initialUnitId={showModal.unitId}
            />
          )}

          <Button
            variant="outline"
            className="text-sm min-w-[150px] bg-transparent cursor-pointer"
            onClick={() => {
              router.push(`/properties/${houseId}/units/${unitId}/past`);
            }}
          >
            View Past Tenants
          </Button>
          <Button
            variant="outline"
            className="text-sm min-w-[150px] bg-transparent cursor-pointer"
            onClick={() => {
              router.push(`/properties/${houseId}/units`);
            }}
          >
            Back to Units Listing
          </Button>
          <Button
            variant="outline"
            className="text-sm min-w-[150px] bg-transparent cursor-pointer"
            onClick={() => {
              fetch(`/api/units/one/${unitId}`)
                .then((res) => {
                  if (!res.ok) throw new Error("Failed to fetch unit data");
                  return res.json();
                })
                .then((unit) => {
                  if (unit && unit.unitId) {
                    useUnitEditSheet
                      .getState()
                      .openSheet(unit, async (updated) => {
                        const changes: Record<string, any> = {};

                        for (const key of Object.keys(updated)) {
                          if (updated[key] !== unit[key]) {
                            changes[key] = updated[key];
                          }
                        }

                        if (Object.keys(changes).length === 0) {
                          toast("No changes to save.");
                          return;
                        }

                        try {
                          const res = await fetch("/api/units/edit", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              id: updated.unitId,
                              ...changes,
                            }),
                          });

                          if (!res.ok)
                            throw new Error(
                              "Failed to update unit. Try again Later"
                            );

                          toast.success("Unit updated successfully.");
                        } catch (err) {
                          console.error(err);
                          toast.error("Update failed. Please try again.");
                        }
                      });
                  } else {
                    toast.error("Unit data not found");
                  }
                })
                .catch((err) => {
                  console.error(err);
                  toast.error("Could not load unit details.");
                });
            }}
          >
            Edit Unit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="text-sm min-w-[150px] cursor-pointer"
              >
                Delete Unit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              </AlertDialogHeader>
              <p>
                This action cannot be undone. The unit will be permanently
                deleted along with all its data.
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 cursor-pointer"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/units/delete/${unitId}`, {
                        method: "DELETE",
                      });

                      if (!res.ok) {
                        const err = await res.json();
                        toast.error(err?.error || "Failed to delete unit.");
                        return;
                      }

                      toast.success("Unit deleted successfully.");
                      router.push(`/properties/${houseId}/units`);
                    } catch (error) {
                      console.error(error);
                      toast.error(
                        "Something went wrong while deleting the unit."
                      );
                    }
                  }}
                >
                  Yes, Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // ✅ MAIN UI: only shown if tenant is valid

  return (
    <div className="space-y-6">
      <UnitCards
        houseId={houseId}
        unitId={unitId}
        tenant={tenant?.data}
        tenantSheetOpen={tenantSheetOpen}
        setTenantSheetOpen={setTenantSheetOpen}
        message={tenant?.message}
        refreshTenant={refreshTenant}
        onUpdateTenant={(updated) => setTenant(updated)}
      />

      <div className="flex justify-between flex-wrap items-center gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <TabsList className="flex gap-2 p-1 bg-muted rounded-full shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]">
            <TabsTrigger value="barChart" className="...">
              Bar Chart
            </TabsTrigger>
            <TabsTrigger value="areaChart" className="...">
              Area Chart
            </TabsTrigger>
            <TabsTrigger value="ledger" className="...">
              Ledger
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <UnitYearSelector year={year} setYear={setYear} years={years} />
      </div>

      {loading && <SkeletonChart />}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          {view === "barChart" && (
            <UnitBar data={chartData} year={year} noData={!hasValidData} />
          )}
          {view === "areaChart" && (
            <UnitArea data={chartData} year={year} noData={!hasValidData} />
          )}
          {view === "ledger" && (
            <>
              <div className="flex justify-end mb-4 no-print sticky top-0 bg-white z-50 border-b p-1">
                <Button
                  className="flex items-center gap-2"
                  onClick={() => setLedgerOpen(true)}
                >
                  <View className="h-4 w-4" />
                  View Full Ledger
                </Button>
              </div>
              <UnitLedger data={chartData} year={year} noData={!hasValidData} />
            </>
          )}
        </>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <RecentPayments leaseCode={leaseCode} />
        <MaintenanceRequests />
      </div>

      <LedgerModal
        name={tenant?.data?.tenant?.name || "Tenant Ledger"}
        data={ledgerData}
        open={ledgerOpen}
        onOpenChange={setLedgerOpen}
      />
    </div>
  );
}
