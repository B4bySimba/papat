import BarChartCard from "@/components/charts/BarChartMultiple";
import { ChartConfig } from "@/components/ui/chart";

interface Props {
  data: any[];
  year: string;
  noData?: boolean;
}

const chartKeys: string[] = ["expected", "collected", "balance"];

const chartConfig: ChartConfig = {
  expected: { label: "Expected", color: "#ad46ff" },
  collected: { label: "Collected", color: "#8327c1" },
  balance: { label: "Balance", color: "#59168b" },
};

export default function Dashboardbar({ data, year, noData }: Props) {
  return (
    <div className="relative">
      <BarChartCard
        title={`Monthly Overview — ${year}`}
        description="Track expected vs collected vs balance"
        data={data}
        chartKeys={chartKeys}
        chartConfig={chartConfig}
        xDataKey="month"
      />

      {noData && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl text-muted-foreground text-sm font-medium z-20">
          No data to display for {year}
        </div>
      )}
    </div>
  );
}
