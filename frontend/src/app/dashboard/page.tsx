import DashboardClient from "./dashboard-client";
import DashboardCards from "./dashboard-cards";
import RecentPayments from "./recent-payments";
import MaintenanceRequests from "./maintenance-requests";
import FutureDatedPayments from "@/components/FutureDatedPayments";
import { fetchFutureDated, fetchSummary } from "@/lib/summary";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pastTenants?: string }>;
}) {
  const pastTenants = (await searchParams).pastTenants === "1";
  // Every year at once: switching year is then a local filter, not another round trip.
  const [{ years, summary }, futurePayments] = await Promise.all([
    fetchSummary(`/payment/summary${pastTenants ? "?includePastTenantsData=true" : ""}`),
    fetchFutureDated(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardCards />
      <FutureDatedPayments payments={futurePayments} />
      <DashboardClient years={years} summary={summary} pastTenants={pastTenants} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <RecentPayments />
        <MaintenanceRequests />
      </div>
    </div>
  );
}
