import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const NAME_WIDTHS = ["w-28", "w-24", "w-32", "w-20", "w-28"];

/** The rows of the Recent Payments table: a list in a narrow card, a table in a wide one (needs @container/mini). */
export default function SkeletonTable({ rows = 5 }: { rows?: number }) {
  const names = Array.from({ length: rows }, (_, i) => NAME_WIDTHS[i % NAME_WIDTHS.length]);
  return (
    <div aria-busy="true">
      <ul className="divide-y rounded-xl border @md/mini:hidden">
        {names.map((width, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-3">
            <Skeleton className="h-5 w-[4.5rem] shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className={`h-4 max-w-full ${width}`} />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border @md/mini:block">
        <div className="flex h-10 items-center gap-4 border-b bg-muted/50 px-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-12 h-3 w-24" />
          <Skeleton className="ml-auto h-3 w-14" />
        </div>
        {names.map((width, i) => (
          <div key={i} className="flex h-[45px] items-center gap-4 border-b px-3 last:border-0">
            <Skeleton className="h-5 w-[4.5rem] shrink-0 rounded-full" />
            <Skeleton className={`h-4 ${width}`} />
            <Skeleton className="ml-auto h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A whole Recent Payments card: header, buttons, rows and pager, laid out exactly like DataCardTable. */
export function SkeletonTableCard() {
  return (
    <Card className="@container/mini gap-4 overflow-hidden py-5 sm:gap-6 sm:py-6" aria-busy="true">
      <div className="px-4 sm:px-6">
        <div className="flex flex-col gap-3 @lg/mini:flex-row @lg/mini:items-start @lg/mini:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 @lg/mini:w-28 @lg/mini:flex-none" />
            <Skeleton className="h-8 flex-1 @lg/mini:w-32 @lg/mini:flex-none" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-4 sm:px-6">
        <SkeletonTable />
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="mr-auto hidden h-4 w-36 @md/mini:block" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-14" />
        </div>
      </div>
    </Card>
  );
}
