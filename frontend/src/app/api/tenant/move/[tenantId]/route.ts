import { forward } from "@/lib/forward";

export async function POST(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return forward(`/tenant/move/${tenantId}`, await request.json());
}
