import PastLeaseClient from "./pastLease-clients";
interface Props {
  params: { leaseId: string };
}

export default async function PastLease({
  params,
}: {
  params: Promise<{ leaseId: string }>;
}) {
  const { leaseId } = await params;

  const res = await fetch(
    `${process.env.BACKEND_API_URL}/tenant/byLeaseId/${leaseId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch house details (status ${res.status})`);
  }

  const tenant = await res.json();

  return <PastLeaseClient unitId={""} tenant={tenant} />
}