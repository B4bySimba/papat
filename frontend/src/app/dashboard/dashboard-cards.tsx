import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from "@/components/skeleton/card";

export default function DashboardCards() {
    return (
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 bg-muted/40 shadow-xs sm:p-4">
          <SkeletonCard />
        </Card>
        <Card className="p-3 bg-muted/40 shadow-xs sm:p-4">
          <SkeletonCard />
        </Card>
        <Card className="p-3 bg-muted/40 shadow-xs sm:p-4">
          <SkeletonCard />
        </Card>
      </div>
    );
}
