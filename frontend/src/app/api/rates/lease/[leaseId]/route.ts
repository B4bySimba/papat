import { forward } from "@/lib/forward";

type Params = { params: Promise<{ leaseId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { leaseId } = await params;
  const month = new URL(request.url).searchParams.get("month") ?? "";
  return forward(`/rates/lease/${leaseId}?month=${encodeURIComponent(month)}`);
}

export async function POST(request: Request, { params }: Params) {
  const { leaseId } = await params;
  return forward(`/rates/lease/${leaseId}`, await request.json());
}
