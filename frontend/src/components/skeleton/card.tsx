import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Same box, padding and container breakpoints as StatCard, so it swaps in place. */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <Card className={cn("@container/stat h-full w-full justify-between gap-2 py-4 sm:gap-3 sm:py-5", className)}>
      <div className="flex items-center justify-between gap-2 px-3.5 @min-[12rem]/stat:px-5">
        <Skeleton className="h-3.5 w-3/5 max-w-28" />
        <Skeleton className="size-8 shrink-0 rounded-lg @max-[12rem]/stat:hidden" />
      </div>
      <div className="space-y-2 px-3.5 @min-[12rem]/stat:px-5">
        <Skeleton className="h-6 w-2/3 max-w-40 @min-[12rem]/stat:h-7" />
        <Skeleton className="h-3 w-1/2 max-w-32 @max-[8rem]/stat:hidden" />
      </div>
    </Card>
  );
}
