import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonPage() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40 bg-muted" />
        <Skeleton className="h-9 w-32 rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Skeleton className="h-10 w-full rounded-md bg-muted sm:max-w-sm" />
        <Skeleton className="h-10 w-full rounded-md bg-muted sm:w-[180px]" />
        <Skeleton className="h-10 w-full rounded-md bg-muted sm:w-[180px]" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-muted md:h-12" />
        ))}
      </div>
    </div>
  );
}
