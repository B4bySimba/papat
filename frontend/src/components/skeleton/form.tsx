import { Skeleton } from "@/components/ui/skeleton";

const field = (labelWidth: string, key?: number) => (
  <div key={key} className="space-y-2">
    <Skeleton className={`h-3.5 ${labelWidth}`} />
    <Skeleton className="h-9 w-full" />
  </div>
);

const TENANTS = ["w-24", "w-28", "w-20", "w-32", "w-24"];

/** Mirrors the rent and charges sheets: month, amounts, extra charges, then the deposit or unit table, then the note. */
export function SkeletonRateForm({ amounts, columns, unitTable = false }: { amounts: number; columns: 2 | 3; unitTable?: boolean }) {
  return (
    <div className="flex-1 space-y-5 overflow-hidden pr-2" aria-busy="true">
      {field("w-24")}
      <div className={columns === 3 ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
        {Array.from({ length: amounts }).map((_, i) => field(i % 2 ? "w-28" : "w-16", i))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
      {unitTable ? (
        <>
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-9 w-28" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <div className="overflow-hidden rounded-md border">
            <div className="grid h-10 grid-cols-[3rem_1fr_5rem_7rem_3rem] items-center gap-2 border-b px-2">
              {["w-8", "w-14", "w-14", "w-16", "w-10"].map((width, i) => (
                <Skeleton key={i} className={`h-3 ${width}`} />
              ))}
            </div>
            {TENANTS.map((width, i) => (
              <div key={i} className="grid h-12 grid-cols-[3rem_1fr_5rem_7rem_3rem] items-center gap-2 border-b px-2 last:border-0">
                <Skeleton className="h-4 w-8" />
                <Skeleton className={`h-4 ${width} max-w-full`} />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="size-4 rounded-sm" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      )}
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
