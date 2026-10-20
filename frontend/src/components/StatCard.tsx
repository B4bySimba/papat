"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  subtext?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtext,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("@container/stat h-full w-full justify-between gap-2 py-4 sm:gap-3 sm:py-5", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3.5 @min-[12rem]/stat:px-5">
        <CardTitle className="text-xs font-medium leading-snug text-muted-foreground @min-[12rem]/stat:text-sm">
          {title}
        </CardTitle>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary @max-[12rem]/stat:hidden">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </CardHeader>
      <CardContent className="px-3.5 @min-[12rem]/stat:px-5">
        <div className="wrap-break-word text-lg font-bold leading-tight tracking-tight tabular-nums @min-[12rem]/stat:text-2xl">
          {value}
        </div>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground @max-[8rem]/stat:hidden">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
