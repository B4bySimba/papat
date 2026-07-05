import UnitPageClient from "./unit-clients";
import { headers } from "next/headers";

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

  return <UnitPageClient unitId={unitId} tenant={tenant} />;
}
