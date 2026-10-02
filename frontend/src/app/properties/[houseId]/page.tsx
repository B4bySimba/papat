import HousePageClient from "./HousePageClient";
import { fetchSummary } from "@/lib/summary";

interface Props {
  params: { houseId: string };
}

export default async function HousePage({
  params,
  searchParams,
}: {
  params: Promise<{ houseId: string }>;
  searchParams: Promise<{ pastTenants?: string }>;
}) {
  const { houseId } = await params;
  const pastTenants = (await searchParams).pastTenants === "1";

  const [res, summary] = await Promise.all([
    fetch(`${process.env.BACKEND_API_URL}/house/dets/${houseId}`, { cache: "no-store" }),
    fetchSummary(`/payment/${houseId}/summary${pastTenants ? "?includePastTenantsData=true" : ""}`),
  ]);

  if (!res.ok) {
    throw new Error(`Failed to fetch house details (status ${res.status})`);
  }

  const house = await res.json();

  return (
    <HousePageClient
      house={house}
      houseId={houseId}
      years={summary.years}
      summary={summary.summary}
      pastTenants={pastTenants}
    />
  );
}
