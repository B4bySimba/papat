"use client";

import { useAccess } from "@/components/AccessProvider";
import { useMemo, useState } from "react";
import ViewTabs from "@/components/ViewTabs";
import YearSelector from "./year-selector";
import Dashboardbar from "./dashboard-bar";
import Dashboardarea from "./dashboard-area";
import PastTenantsToggle from "@/components/PastTenantsToggle";
import { defaultYear, hasData, yearRows, Summary } from "@/lib/summary";

type ViewType = "barChart" | "areaChart";

export default function DashboardClient({ years, summary, pastTenants }: Summary & { pastTenants: boolean }) {
  const [view, setView] = useState<ViewType>("barChart");
  const [year, setYear] = useState(() => defaultYear(years));
  const { can } = useAccess();

  const chartData = useMemo(() => yearRows(summary, year), [summary, year]);
  const hasValidData = hasData(chartData);

  if (!can("payments.view")) {
    return (
      <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Money figures appear here for houses where you can see payments. Your houses are under Properties.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
