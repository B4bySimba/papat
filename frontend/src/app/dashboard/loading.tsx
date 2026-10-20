import DashboardCards from "./dashboard-cards";
import { SkeletonChart } from "@/components/skeleton/chart";
import SkeletonTabs from "@/components/skeleton/tabs";
import { SkeletonTableCard } from "@/components/skeleton/table";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DashboardCards />
      <div className="space-y-4">
        <SkeletonTabs tabs={2} />
        <SkeletonChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <SkeletonTableCard />
        <SkeletonTableCard />
      </div>
    </div>
  );
}
