import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonTable() {
  return (
    <Card className="p-4 bg-muted/50 shadow-md border border-gray-300">
      <div className="space-y-4">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-5 w-full bg-gray-300" />
          <Skeleton className="h-5 w-full bg-gray-300" />
          <Skeleton className="h-5 w-full bg-gray-300" />
          <Skeleton className="h-5 w-full bg-gray-300" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4 items-center">
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
          </div>
        ))}
      </div>
    </Card>
  );
}
