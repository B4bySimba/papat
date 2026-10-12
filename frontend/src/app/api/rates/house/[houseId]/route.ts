import { forward } from "@/lib/forward";

type Params = { params: Promise<{ houseId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { houseId } = await params;
  const month = new URL(request.url).searchParams.get("month") ?? "";
  return forward(`/rates/house/${houseId}?month=${encodeURIComponent(month)}`);
}

export async function POST(request: Request, { params }: Params) {
  const { houseId } = await params;
  return forward(`/rates/house/${houseId}`, await request.json());
}
