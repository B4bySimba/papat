import AreaChartCard from "@/components/charts/AreaChart";
import { ChartConfig } from "@/components/ui/chart";

interface Props {
  data: any[];
  year: string;
  noData?: boolean;
}

const chartConfig: ChartConfig = {
  expected: { label: "Expected", color: "#ad46ff" },
  collected: { label: "Collected", color: "#8327c1" },
  balance: { label: "Balance", color: "#59168b" },
};

export default function HouseArea({ data, year, noData }: Props) {
  return (
    <div className="relative w-full">
      <AreaChartCard
        title={`Monthly Payment Overview — ${year}`}
        description="Zoom in to specific months"
        data={data}
        config={chartConfig}
        xDataKey="month"
      />

      {noData && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl text-muted-foreground text-sm font-medium z-10 pointer-events-none">
          No data to display for {year}
        </div>
      )}
    </div>
  );
}
  