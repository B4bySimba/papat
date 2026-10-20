import { SkeletonChart } from "@/components/skeleton/chart";
import SkeletonTable from "@/components/skeleton/table";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonChart />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <SkeletonTable />
        <SkeletonTable />
      </div>
    </div>
  );
}
