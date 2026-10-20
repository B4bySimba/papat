import { Skeleton } from "@/components/ui/skeleton";

type Variant = "statement" | "readings" | "cards";

interface Props {
  /** statement: Transactions, readings: Meter Readings, cards: Units. */
  variant?: Variant;
  columns?: number;
  filters?: number;
  statusTabs?: boolean;
}

const WIDE = ["w-20", "w-28", "w-16", "w-24", "w-14", "w-20", "w-16"];
const NARROW = ["w-32", "w-24", "w-36", "w-28", "w-24", "w-32", "w-20", "w-28", "w-36", "w-24"];
const dots = <Skeleton className="ml-2 mr-1 h-1.5 w-4 shrink-0 rounded-full" />;

function StatementRows({ count, offset }: { count: number; offset: number }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-3 pl-3.5 pr-2">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className={`h-4 max-w-[60%] ${NARROW[(i + offset) % NARROW.length]}`} />
              <Skeleton className="h-4 w-20 shrink-0" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-28 max-w-[55%]" />
              <Skeleton className="h-3 w-20 shrink-0" />
            </div>
          </div>
          {dots}
        </li>
      ))}
    </ul>
  );
}

function NarrowList({ variant }: { variant: Variant }) {
  if (variant === "statement") {
    return (
      <div className="space-y-4">
        {[3, 5].map((count, g) => (
          <section key={g}>
            <Skeleton className="mb-2 h-3 w-40" />
            <StatementRows count={count} offset={g * 3} />
          </section>
        ))}
      </div>
    );
  }
  if (variant === "readings") {
    return (
      <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
        {NARROW.map((width, i) => (
          <li key={i} className="flex items-center gap-3 py-3 pl-3.5 pr-2">
            <Skeleton className="h-10 w-11 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={`h-4 max-w-full ${width}`} />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            {dots}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="space-y-2.5">
      {NARROW.map((width, i) => (
        <li key={i} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className={`h-3.5 max-w-full ${width}`} />
          </div>
          <Skeleton className="mt-0.5 h-4 w-20 shrink-0" />
          {dots}
        </li>
      ))}
    </ul>
  );
}

/** Mirrors a DataTable page: header, optional status tabs, toolbar, rows and pager, at every width. */
export function SkeletonPage({ variant = "cards", columns = 6, filters = 2, statusTabs = false }: Props) {
  const cols = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr)) 3rem` };
  return (
    <div className="w-full" aria-busy="true">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
        <Skeleton className="h-7 w-36 sm:h-8 sm:w-44" />
        <Skeleton className="h-9 w-32 sm:w-40" />
      </div>

      {statusTabs && (
        <div className="mb-4 grid h-11 w-full grid-cols-3 gap-1 rounded-xl bg-muted p-1 sm:mb-6 sm:w-64">
          <Skeleton className="h-full rounded-lg" />
          <div className="flex items-center justify-center"><Skeleton className="h-3 w-16" /></div>
          <div className="flex items-center justify-center"><Skeleton className="h-3 w-14" /></div>
        </div>
      )}

      <div className="@container/table">
        <div className="mb-4 flex flex-col gap-2 @3xl/table:flex-row @3xl/table:items-center @3xl/table:gap-3">
          <div className="flex gap-2 @3xl/table:w-full @3xl/table:max-w-sm">
            <Skeleton className="h-10 min-w-0 flex-1" />
            <Skeleton className="size-10 shrink-0 @3xl/table:hidden" />
          </div>
          <div className="flex gap-2 overflow-hidden">
            <Skeleton className="h-9 w-[9.5rem] shrink-0 rounded-full @3xl/table:hidden" />
            {Array.from({ length: filters }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-[8.5rem] shrink-0 rounded-full @3xl/table:h-10 @3xl/table:w-[180px] @3xl/table:rounded-md" />
            ))}
          </div>
          <Skeleton className="hidden h-10 w-32 @3xl/table:ml-auto @3xl/table:block" />
        </div>

        <div className="@3xl/table:hidden">
          <NarrowList variant={variant} />
        </div>

        <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs @3xl/table:block">
          <div className="grid h-11 items-center border-b bg-muted/50" style={cols}>
            {Array.from({ length: columns }).map((_, c) => (
              <div key={c} className="px-4">
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, r) => (
            <div key={r} className="grid h-[53px] items-center border-b" style={cols}>
              {Array.from({ length: columns }).map((_, c) => (
                <div key={c} className="px-4">
                  <Skeleton className={`h-4 max-w-full ${WIDE[(r + c) % WIDE.length]}`} />
                </div>
              ))}
              <div className="flex justify-center">{dots}</div>
            </div>
          ))}
          <div className="flex justify-center py-4">
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 @xl/table:flex-row @xl/table:items-center @xl/table:justify-between">
          <Skeleton className="h-4 w-44" />
          <div className="flex items-center justify-between gap-3 @xl/table:gap-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-9" />
              <Skeleton className="h-9 w-16" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="hidden size-9 @xl/table:block" />
              <Skeleton className="size-9" />
              <Skeleton className="mx-3 h-3.5 w-10" />
              <Skeleton className="size-9" />
              <Skeleton className="hidden size-9 @xl/table:block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mirrors the past tenants list: a row per tenant on phones, a three-column table above. */
export function SkeletonPastTenants() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-5 h-7 w-40 sm:mb-8 sm:h-8 sm:w-48" />
      <ul className="space-y-2.5 md:hidden">
        {NARROW.slice(0, 4).map((width, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={`h-4 max-w-full ${width}`} />
              <Skeleton className="h-3.5 w-48 max-w-full" />
            </div>
            <Skeleton className="size-4 shrink-0 rounded-sm" />
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-xs md:block">
        <div className="grid h-11 grid-cols-3 items-center border-b bg-muted/50">
          {["w-24", "w-24", "w-28"].map((width, i) => (
            <div key={i} className="px-4"><Skeleton className={`h-3 ${width}`} /></div>
          ))}
        </div>
        {NARROW.slice(0, 4).map((width, i) => (
          <div key={i} className="grid h-[49px] grid-cols-3 items-center border-b last:border-0">
            <div className="px-4"><Skeleton className={`h-4 ${width}`} /></div>
            <div className="px-4"><Skeleton className="h-4 w-20" /></div>
            <div className="px-4"><Skeleton className="h-4 w-20" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
