import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonHouseList() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3">
      {Array.from({ length: 24 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-16 w-full rounded-xl bg-muted"
        />
      ))}
    </div>
  );
}
