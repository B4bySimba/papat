import PastClients from "./past-clients";
interface Props {
  params: { unitId: string };
}

export default async function Past({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;

  return <PastClients unitId={unitId} />;
}
