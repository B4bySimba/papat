import UnitPageClient from "./unit-clients";
import { headers } from "next/headers";
import { fetchFutureDated, fetchSummary, Summary } from "@/lib/summary";

interface Props {
  params: { unitId: string };
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;

  const res = await fetch(
    `${process.env.BACKEND_API_URL}/tenant/byUnitId/${unitId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch house details (status ${res.status})`);
  }

  const tenant = await res.json();

  // One summary for the whole page: the chart, the ledger and the cards all read it.
  const leaseCode = tenant?.data?.leaseCode;
  const empty: Summary = { years: [], summary: {} };
  const [{ years, summary }, futurePayments] = leaseCode
    ? await Promise.all([fetchSummary(`/payment/le/${leaseCode}/summary`), fetchFutureDated(leaseCode)])
    : [empty, []];

  return (
    <UnitPageClient
      unitId={unitId}
      tenant={tenant}
      years={years}
      summary={summary}
      futurePayments={futurePayments}
    />
  );
}
