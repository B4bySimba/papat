import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonHouseList() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full">
      {Array.from({ length: 100 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-full min-h-[35px] w-full rounded-xl bg-gray-800"
        />
      ))}
    </div>
  );
}
