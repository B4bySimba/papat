"use client";

import { AreaChart, BarChart3, BookOpen, LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const icons: Record<string, LucideIcon> = {
  barChart: BarChart3,
  areaChart: AreaChart,
  ledger: BookOpen,
};

interface Props<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: string; shortLabel?: string }[];
}

/** The chart/ledger switcher shared by the dashboard, property and unit pages. */
export default function ViewTabs<T extends string>({ value, onValueChange, options }: Props<T>) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)} className="w-full sm:w-auto">
      <TabsList className="grid h-10 w-full grid-flow-col auto-cols-fr gap-1 rounded-full bg-muted p-1 shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.08)] sm:inline-flex sm:w-auto">
        {options.map((option) => {
          const Icon = icons[option.value];
          return (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="h-full gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
            >
              {Icon && <Icon className="size-4" />}
              {option.shortLabel ? (
                <>
                  <span className="sm:hidden">{option.shortLabel}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
