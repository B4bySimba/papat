import { Card } from "@/components/ui/card";
import SkeletonTable from "./table";
import { SkeletonCard } from "./card";
import { SkeletonChart } from "./chart";
import SkeletonTabs from "./tabs";

export default function SkeletonBoard() {
  return (
    <div className="space-y-6">
      {/* Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-muted/50 shadow-md">
          <SkeletonCard />
        </Card>
        <Card className="p-4 bg-muted/50 shadow-md">
          <SkeletonCard />
        </Card>
        <Card className="p-4 bg-muted/50 shadow-md">
          <SkeletonCard />
        </Card>
      </div>

      {/* Tabs + Year Selector */}
      <SkeletonTabs />

      {/* Chart skeleton */}
      <SkeletonChart />

      {/* Mini tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <SkeletonTable />
        <SkeletonTable />
      </div>
    </div>
  );
}

