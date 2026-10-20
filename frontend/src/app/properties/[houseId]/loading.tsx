import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStatCard } from "@/components/skeleton/card";
import { SkeletonChart } from "@/components/skeleton/chart";
import SkeletonTabs from "@/components/skeleton/tabs";
import { SkeletonTableCard } from "@/components/skeleton/table";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-4">
        <SkeletonStatCard className="col-span-3 lg:col-span-1" />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <SkeletonTabs tabs={2} />
      <div>
        <SkeletonChart />
        <Skeleton className="mt-2 h-3 w-full max-w-xl" />
        <Skeleton className="mt-1.5 h-3 w-2/3 max-w-sm" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <SkeletonTableCard />
        <SkeletonTableCard />
      </div>
    </div>
  );
}
