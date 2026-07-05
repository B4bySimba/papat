import HousePageClient from "./HousePageClient";

interface Props {
  params: { houseId: string };
}

export default async function HousePage({
  params,
}: {
  params: Promise<{ houseId: string }>;
}) {
  const { houseId } = await params;

  const res = await fetch(
    `${process.env.BACKEND_API_URL}/house/dets/${houseId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch house details (status ${res.status})`);
  }

  const house = await res.json();

  return <HousePageClient house={house} houseId={houseId} />;
}
