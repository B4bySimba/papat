import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Expected, collected, balance for twelve months, as a share of the chart height.
const BARS = [
  [58, 26, 34], [62, 26, 38], [64, 27, 40], [66, 27, 44], [70, 26, 48], [72, 25, 54],
  [76, 24, 60], [80, 20, 66], [84, 14, 72], [92, 10, 92], [88, 18, 70], [82, 22, 62],
];

/** Mirrors BarChartCard: title, the three-figure strip, then the bars with both axes. */
export function SkeletonChart() {
  return (
    <Card className="@container/chart relative gap-0 overflow-hidden py-0" aria-busy="true">
      <div className="flex flex-col border-b @3xl/chart:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-4 @xl/chart:px-6 @3xl/chart:py-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
        </div>
        <div className="grid grid-cols-3 border-t @3xl/chart:flex @3xl/chart:border-t-0">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-w-0 flex-col justify-center gap-2 border-l px-3 py-3 first:border-l-0 @xl/chart:px-6 @3xl/chart:w-44 @3xl/chart:px-8 @3xl/chart:py-6 @3xl/chart:first:border-l"
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20 max-w-full @xl/chart:h-5 @4xl/chart:h-7 @4xl/chart:w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-2 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-6">
        <div className="flex h-[220px] gap-1 sm:h-[260px]">
          <div className="flex w-9 shrink-0 flex-col justify-between pb-7 pt-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-2.5 w-6" />
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-1 items-end border-b border-dashed">
              {BARS.map((group, i) => (
                <div key={i} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] px-0.5">
                  {group.map((height, j) => (
                    <Skeleton key={j} className="w-[24%] max-w-5 rounded-sm" style={{ height: `${height}%` }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex pt-2.5">
              {BARS.map((_, i) => (
                <div key={i} className="flex flex-1 justify-center">
                  <Skeleton className="h-2.5 w-5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
