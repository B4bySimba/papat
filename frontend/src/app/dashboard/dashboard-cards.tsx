import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonCard } from "@/components/skeleton/card";

export default function DashboardCards() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-muted/50 shadow-md">
          <SkeletonCard />
        </Card>
        <Card className="p-4 bg-muted/50 shadow-md">
          <SkeletonCard />
        </Card>
        <Card className="p-4 bg-muted/50 shadow-md">
          <SkeletonCard />
        </Card>
      </div>
    );
}
