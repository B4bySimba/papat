import { Skeleton } from "@/components/ui/skeleton";

const NAMES = ["w-28", "w-40", "w-24", "w-36", "w-20", "w-32", "w-28", "w-24", "w-36", "w-20", "w-32", "w-28"];

/** Mirrors HousesList: the A-Z strip and search, then the grid of property rows. */
export function SkeletonHouseList() {
  return (
    <div aria-busy="true">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-center md:gap-4">
        <div className="-mx-3 flex gap-1 overflow-hidden px-3 py-1 md:fixed md:right-4 md:z-20 md:mx-0 md:flex-col md:items-center md:gap-0 md:space-y-1 md:overflow-visible md:p-2 md:bg-white/80 md:rounded-xl md:shadow-md md:border md:border-gray-200">
          {Array.from({ length: 26 }).map((_, i) => (
            <Skeleton key={i} className="size-8 shrink-0 rounded-full md:size-6" />
          ))}
        </div>
        <Skeleton className="h-10 w-full md:w-100" />
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3 md:pr-14">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className={`h-4 max-w-full ${NAMES[i % NAMES.length]}`} />
            </div>
            <Skeleton className="size-4 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
