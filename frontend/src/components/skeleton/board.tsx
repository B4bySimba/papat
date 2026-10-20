import { SkeletonTableCard } from "./table";
import { SkeletonStatCard } from "./card";
import { SkeletonChart } from "./chart";
import SkeletonTabs from "./tabs";

/** Mirrors a unit page: tenant, bills and actions cards, the chart toolbar, the chart, then the two lower cards. */
export default function SkeletonBoard() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <SkeletonStatCard className="col-span-2 sm:col-span-1" />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <SkeletonTabs tabs={3} pastTenantsToggle={false} />
      <SkeletonChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <SkeletonTableCard />
        <SkeletonTableCard />
      </div>
    </div>
  );
}
