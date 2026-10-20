"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { CustomTooltipProps } from "@/components/ui/chart";
import { formatCompact } from "@/lib/utils";

interface BarChartCardProps {
  title: string;
  description?: string;
  data: {
    [key: string]: any;
  }[];
  chartKeys: (keyof ChartConfig)[];
  chartConfig: ChartConfig;
  xDataKey: string;
  onMonthClick?: (month: string) => void;
  clickHint?: string;
}

export default function BarChartCard({
  title,
  description,
  data,
  chartKeys,
  chartConfig,
  xDataKey,
  onMonthClick,
  clickHint,
}: BarChartCardProps) {
  const [activeChart, setActiveChart] = React.useState(chartKeys[0]);

  // Modified to show latest month's values instead of sums
  const latestTotals = React.useMemo(() => {
    if (data.length === 0) {
      const emptyTotals: Record<string, number> = {};
      chartKeys.forEach((key) => {
        emptyTotals[key] = 0;
      });
      return emptyTotals;
    }

    const latestMonth = data[data.length - 1];
    const latestValues: Record<string, number> = {};
    
    chartKeys.forEach((key) => {
      latestValues[key] = latestMonth[key] || 0;
    });

    return latestValues;
  }, [data, chartKeys]);

  return (
    <Card className="@container/chart bg-background relative gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-col items-stretch gap-0 border-b p-0 @3xl/chart:flex-row [.border-b]:pb-0">
        <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-4 @xl/chart:px-6 @3xl/chart:py-6">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="grid grid-cols-3 border-t @3xl/chart:flex @3xl/chart:border-t-0">
          {chartKeys.map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="relative z-30 flex min-w-0 flex-col justify-center gap-1 border-l px-3 py-3 text-left transition-colors first:border-l-0 hover:bg-muted/30 data-[active=true]:bg-muted/50 @xl/chart:px-6 @3xl/chart:px-8 @3xl/chart:py-6 @3xl/chart:first:border-l"
              onClick={() => setActiveChart(key)}
            >
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground @xl/chart:text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: chartConfig[key].color }}
                />
                {chartConfig[key].label}
              </span>
              <span className="truncate text-[15px] font-bold leading-none tabular-nums @xl/chart:text-xl @4xl/chart:text-3xl">
                {latestTotals[key]?.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[220px] w-full sm:h-[260px]"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 0, right: 4, top: 4 }}
            className={onMonthClick ? "cursor-pointer" : undefined}
            onClick={
              onMonthClick &&
              ((state) => {
                const month = state.activeLabel ?? data[Number(state.activeIndex)]?.[xDataKey];
                if (month !== undefined) onMonthClick(String(month));
              })
            }
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey={xDataKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tickMargin={4}
              tickFormatter={formatCompact}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={(props: any) => (
                <ChartTooltipContent
                  {...(props as CustomTooltipProps)}
                  hideIndicator
                  hideLabel
                  footer={clickHint && <p className="text-muted-foreground border-t pt-1.5">{clickHint}</p>}
                />
              )}
            />
            {chartKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={4}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}