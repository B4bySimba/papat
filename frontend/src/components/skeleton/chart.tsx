import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "../ui/card";

export function SkeletonChart() {
  return (
    <Card className="h-[300px] w-full flex items-center justify-center bg-muted/40 shadow-xs">
      <Skeleton className="h-[250px] w-[90%] rounded-md bg-muted" />
    </Card>
  );
}
