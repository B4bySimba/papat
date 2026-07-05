import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-1/3 bg-gray-300" />
      <Skeleton className="h-6 w-1/2 bg-gray-300" />
      <Skeleton className="h-4 w-1/4 bg-gray-300" />
    </div>
  );}