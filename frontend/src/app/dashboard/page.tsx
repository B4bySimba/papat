import { Suspense } from "react";
import DashboardClient from "./dashboard-client";
import DashboardCards from "./dashboard-cards";
import RecentPayments from "./recent-payments";
import MaintenanceRequests from "./maintenance-requests";
import FutureDatedPayments from "@/components/FutureDatedPayments";
import { SkeletonChart } from "@/components/skeleton/chart";
import SkeletonTabs from "@/components/skeleton/tabs";
import { fetchFutureDated, fetchSummary } from "@/lib/summary";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pastTenants?: string }>;
}) {
  const pastTenants = (await searchParams).pastTenants === "1";

  // Both fetches start together; only the chart waits for the summary, so the rest of the page shows first.
  return (
    <div className="space-y-6">
      <DashboardCards />
      <FutureDated />
      <Suspense
        fallback={
          <div className="space-y-4">
            <SkeletonTabs tabs={2} />
            <SkeletonChart />
          </div>
        }
      >
        <Chart pastTenants={pastTenants} />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <RecentPayments />
        <MaintenanceRequests />
      </div>
    </div>
  );
}

async function FutureDated() {
  return <FutureDatedPayments payments={await fetchFutureDated()} />;
}

async function Chart({ pastTenants }: { pastTenants: boolean }) {
  // Every year at once: switching year is then a local filter, not another round trip.
  const { years, summary } = await fetchSummary(`/payment/summary${pastTenants ? "?includePastTenantsData=true" : ""}`);
  return <DashboardClient years={years} summary={summary} pastTenants={pastTenants} />;
}
