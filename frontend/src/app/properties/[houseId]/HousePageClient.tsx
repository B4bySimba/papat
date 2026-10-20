"use client";

import DashboardCards from "@/app/dashboard/dashboard-cards";
import ViewTabs from "@/components/ViewTabs";
import { useMemo, useState } from "react";
import HouseYearSelector from "./house-year-selector";
import HouseCards from "./house-cards";
import HouseArea from "./house-area";
import HouseBar from "./house-bar";
import { defaultYear, hasData, yearRows, Summary } from "@/lib/summary";
import RecentPayments from "./recent-payments";
import MaintenanceRequests from "./maintenance-requests";
import PastTenantsToggle from "@/components/PastTenantsToggle";
import MonthUnitsDialog from "./month-units-dialog";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { SkeletonHouseList } from "@/components/skeleton/houseList";

type ViewType = "barChart" | "areaChart";

interface Props extends Summary {
  houseId: string;
  house: any;
  pastTenants: boolean;
}

export default function HousePageClient({
  house: initialHouse,
  houseId,
  years,
  summary,
  pastTenants,
}: Props) {
  const [house, setHouse] = useState<any>(initialHouse);
  const [view, setView] = useState<ViewType>("barChart");
  const [year, setYear] = useState(() => defaultYear(years));
  const [unitsMonth, setUnitsMonth] = useState<string | null>(null);

  const chartData = useMemo(() => yearRows(summary, year), [summary, year]);
  const hasValidData = hasData(chartData);

  const [editMode, setEditMode] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleEdit = () => {
    setEditMode(true);
    setSheetOpen(true);
  };

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  if (deleting) {
    return <SkeletonHouseList />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">House Overview</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="cursor-pointer"
          >
            <Edit />
            Edit
          </Button>
          <AlertDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="cursor-pointer"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the house along with all its
                  data. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      const res = await fetch("/api/properties/delete", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ houseId }),
                      });

                      if (!res.ok) {
                        const text = await res.text();
                        throw new Error(text || "Failed to delete house");
                      }

                      toast.success("House deleted successfully");
                      setTimeout(() => {
                        router.push("/properties");
                      }, 1500); // gives the user a moment to see the toast
                    } catch (err) {
                      console.error("Error deleting house:", err);
                      setDeleting(false);
                      setDeleteError((err as Error).message);
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

      <HouseCards
        house={house}
        houseId={houseId}
        onUpdateHouse={setHouse}
        editMode={editMode}
        setEditMode={setEditMode}
        sheetOpen={sheetOpen}
        setSheetOpen={setSheetOpen}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <ViewTabs
          value={view}
          onValueChange={setView}
          options={[
            { value: "barChart", label: "Bar Chart" },
            { value: "areaChart", label: "Area Chart" },
          ]}
        />
        <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
          <PastTenantsToggle checked={pastTenants} />
          <HouseYearSelector year={year} setYear={setYear} years={years} />
        </div>
      </div>

      {view === "barChart" && (
        <HouseBar data={chartData} year={year} noData={!hasValidData} onMonthClick={setUnitsMonth} />
      )}
      <MonthUnitsDialog
        houseId={houseId}
        year={year}
        month={unitsMonth}
        pastTenants={pastTenants}
        onClose={() => setUnitsMonth(null)}
      />
      {view === "areaChart" && (
        <HouseArea data={chartData} year={year} noData={!hasValidData} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <RecentPayments />
        <MaintenanceRequests />
      </div>
    </div>
  );
}
