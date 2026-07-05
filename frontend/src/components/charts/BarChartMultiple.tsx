"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

interface BarChartCardProps {
  title: string;
  description?: string;
  data: {
    [key: string]: any;
  }[];
  chartKeys: (keyof ChartConfig)[];
  chartConfig: ChartConfig;
  xDataKey: string;
}

export default function BarChartCard({
  title,
  description,
  data,
  chartKeys,
  chartConfig,
  xDataKey,
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
    <Card className="bg-background relative">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex">
          {chartKeys.map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-xs text-muted-foreground">
                {chartConfig[key].label}
              </span>
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {latestTotals[key]?.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xDataKey}
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(v) => v.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={(props: any) => (
                <ChartTooltipContent {...(props as CustomTooltipProps)} hideIndicator hideLabel />
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