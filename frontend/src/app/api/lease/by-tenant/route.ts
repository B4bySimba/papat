import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  try {
    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/landlord/by-tenant?tenantId=${tenantId}`,
      {
        cache: "no-store",
      }
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const lease = await backendRes.json();
    return NextResponse.json({ leaseCode: lease.code });
  } catch (err) {
    console.error("Lease by tenant error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
