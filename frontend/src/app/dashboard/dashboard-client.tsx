"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import YearSelector from "./year-selector";
import { SkeletonChart } from "@/components/skeleton/chart";
import Dashboardbar from "./dashboard-bar";
import Dashboardarea from "./dashboard-area";

type ViewType = "barChart" | "areaChart";

export default function DashboardClient() {
  const [years, setYears] = useState<number[]>([]);

  const [view, setView] = useState<ViewType>("barChart");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/summary?year=${year}`)
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
  }, [year]);
    
  const hasValidData =
    chartData.length > 1 ||
    (chartData.length === 1 &&
      Object.values(chartData[0]).some(
        (v) => typeof v === "number" && v !== 0
      ));

  return (
    <div className="space-y-4">
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
        <YearSelector year={year} setYear={setYear} years={years} />
      </div>

      {loading ? (
        <SkeletonChart />
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <>
          {view === "barChart" && (
            <Dashboardbar data={chartData} year={year} noData={!hasValidData} />
          )}
          {view === "areaChart" && (
            <Dashboardarea
              data={chartData}
              year={year}
              noData={!hasValidData}
            />
          )}
        </>
      )}
    </div>
  );
}
