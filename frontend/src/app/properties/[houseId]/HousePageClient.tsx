"use client";

import DashboardCards from "@/app/dashboard/dashboard-cards";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import HouseYearSelector from "./house-year-selector";
import HouseCards from "./house-cards";
import HouseArea from "./house-area";
import { SkeletonChart } from "@/components/skeleton/chart";
import HouseBar from "./house-bar";
import RecentPayments from "./recent-payments";
import MaintenanceRequests from "./maintenance-requests";
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

interface Props {
  houseId: string;
  house: any;
}

export default function HousePageClient({
  house: initialHouse,
  houseId,
}: Props) {
  const [years, setYears] = useState<number[]>([]);

  const [house, setHouse] = useState<any>(initialHouse);
  const [view, setView] = useState<ViewType>("barChart");
  const [year, setYear] = useState("2025");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log("dsdsds", house);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/payment/summary?year=${year}&houseId=${houseId}`)
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
  }, [year, houseId]);
  
  const hasValidData =
    chartData.length > 1 ||
    (chartData.length === 1 &&
      Object.values(chartData[0]).some(
        (v) => typeof v === "number" && v !== 0
      ));

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

      <div className="flex justify-between flex-wrap items-center gap-4 ">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
          <TabsList className="flex gap-2 p-1 bg-muted rounded-full shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]">
            <TabsTrigger
              value="barChart"
              className="data-[state=active]:bg-primary data-[state=active]:text-white
                 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Bar Chart
            </TabsTrigger>
            <TabsTrigger
              value="areaChart"
              className="data-[state=active]:bg-primary data-[state=active]:text-white
                 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Area Chart
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <HouseYearSelector year={year} setYear={setYear} years={years} />
      </div>

      {loading && <SkeletonChart />}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <>
          {view === "barChart" && (
            <HouseBar data={chartData} year={year} noData={!hasValidData} />
          )}
          {view === "areaChart" && (
            <HouseArea data={chartData} year={year} noData={!hasValidData} />
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <RecentPayments />
        <MaintenanceRequests />
      </div>
    </div>
  );
}
