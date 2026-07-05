import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  const { leaseId } = await params;

  try {
    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/tenant/byLeaseId/${leaseId}`
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const tenant = await backendRes.json();
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
