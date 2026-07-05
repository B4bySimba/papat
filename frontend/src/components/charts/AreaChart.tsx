"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { CustomTooltipProps } from "@/components/ui/chart";


interface Props {
  data: Record<string, any>[];
  config: ChartConfig;
  xDataKey?: string;
  title?: string;
  description?: string;
}

export default function AreaChartCard({
  data,
  config,
  xDataKey = "month",
  title = "Area Chart",
  description = "Showing previous, current, and next month",
}: Props) {
  const months = data.map((d) => d[xDataKey]);
  const [selectedMonth, setSelectedMonth] = React.useState("all");

  const selectedIndex = months.indexOf(selectedMonth);
  const slicedData =
    selectedMonth === "all"
      ? data
      : data.slice(Math.max(0, selectedIndex - 1), selectedIndex + 2);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto">
            <SelectValue>
              {selectedMonth === "all" ? "All months" : selectedMonth}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem
              value="all"
              className="rounded-lg font-semibold text-primary"
            >
              All months
            </SelectItem>
            {months.map((month) => (
              <SelectItem key={month} value={month} className="rounded-lg">
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="px-1 pt-4 sm:px-4 sm:pt-6">
        <ChartContainer
          config={config}
          className="aspect-auto h-[265px] w-full"
        >
          <AreaChart data={slicedData}>
            <defs>
              {Object.entries(config).map(([key, { color }]) => (
                <linearGradient
                  id={`${key}Fill`}
                  key={key}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xDataKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={(props: any) => (
                <ChartTooltipContent {...(props as CustomTooltipProps)} hideIndicator hideLabel />
              )}
            />

            {Object.entries(config).map(([key, { color }]) => (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                fill={`url(#${key}Fill)`}
                stroke={color}
                strokeWidth={2}
              />
            ))}

            <ChartLegend
              content={(props) => <ChartLegendContent {...(props as any)} />}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
