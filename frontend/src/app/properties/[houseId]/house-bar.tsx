import BarChartCard from "@/components/charts/BarChartMultiple";
import { ChartConfig } from "@/components/ui/chart";

interface Props {
  data: any[];
  year: string;
  noData?: boolean
  onMonthClick?: (month: string) => void;
}

const chartKeys: string[] = ["expected", "collected", "balance"];

const chartConfig: ChartConfig = {
  expected: { label: "Expected", color: "#ad46ff" },
  collected: { label: "Collected", color: "#8327c1" },
  balance: { label: "Balance", color: "#59168b" },
};

export default function HouseBar({ data, year, noData, onMonthClick }: Props) {
  return (
    <div>
      <div className="relative w-full">
        <BarChartCard
          title={`Monthly Overview (${year})`}
          description="Track expected vs collected vs balance"
          data={data}
          chartKeys={chartKeys}
          chartConfig={chartConfig}
          xDataKey="month"
          onMonthClick={onMonthClick}
          clickHint="Click to see each unit's expected, collected and balance."
        />

        {noData && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl text-muted-foreground text-sm font-medium z-10">
            No data to display for {year}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Click a month to see each unit&apos;s expected, collected and balance. Units that have paid ahead show negative
        amounts, which lower the property&apos;s total.
      </p>
    </div>
  );
}
