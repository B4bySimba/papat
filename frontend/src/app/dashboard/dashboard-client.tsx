"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import YearSelector from "./year-selector";
import Dashboardbar from "./dashboard-bar";
import Dashboardarea from "./dashboard-area";
import PastTenantsToggle from "@/components/PastTenantsToggle";
import { defaultYear, hasData, yearRows, Summary } from "@/lib/summary";

type ViewType = "barChart" | "areaChart";

export default function DashboardClient({ years, summary, pastTenants }: Summary & { pastTenants: boolean }) {
  const [view, setView] = useState<ViewType>("barChart");
  const [year, setYear] = useState(() => defaultYear(years));

  const chartData = useMemo(() => yearRows(summary, year), [summary, year]);
  const hasValidData = hasData(chartData);

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
        <div className="flex flex-wrap items-center gap-4">
          <PastTenantsToggle checked={pastTenants} />
          <YearSelector year={year} setYear={setYear} years={years} />
        </div>
      </div>

      {view === "barChart" && (
        <Dashboardbar data={chartData} year={year} noData={!hasValidData} />
      )}
      {view === "areaChart" && (
        <Dashboardarea data={chartData} year={year} noData={!hasValidData} />
      )}
    </div>
  );
}
