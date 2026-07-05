import DashboardClient from "./dashboard-client";
import DashboardCards from "./dashboard-cards";
import RecentPayments from "./recent-payments";
import MaintenanceRequests from "./maintenance-requests";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardCards />
      <DashboardClient />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <RecentPayments />
        <MaintenanceRequests />
      </div>
    </div>
  );
}
