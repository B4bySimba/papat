import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the chart toolbar: the view switcher, the past-tenants switch and the year picker. */
export default function SkeletonTabs({ tabs = 2, pastTenantsToggle = true }: { tabs?: number; pastTenantsToggle?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="grid h-10 w-full grid-flow-col auto-cols-fr gap-1 rounded-full bg-muted p-1 sm:inline-grid sm:w-auto">
        {Array.from({ length: tabs }).map((_, i) =>
          i === 0 ? (
            <Skeleton key={i} className="h-full rounded-full sm:w-28" />
          ) : (
            <div key={i} className="flex h-full items-center justify-center sm:w-28">
              <Skeleton className="h-3 w-14" />
            </div>
          )
        )}
      </div>
      <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
        {pastTenantsToggle && (
          <div className="flex max-w-xs flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-[1.15rem] w-8 rounded-full" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        )}
        <Skeleton className="h-10 w-[120px] shrink-0 sm:w-[140px]" />
      </div>
    </div>
  );
}
