import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonTabs() {
  return (
    <div className="flex justify-between flex-wrap items-center gap-4">
      <div className="flex gap-2 p-1 bg-muted rounded-full shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15)]">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}
