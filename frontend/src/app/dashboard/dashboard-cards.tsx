import { SkeletonStatCard } from "@/components/skeleton/card";

export default function DashboardCards() {
    return (
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
    );
}
