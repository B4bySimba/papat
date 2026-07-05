import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("propertyId");
  const unitId = req.nextUrl.searchParams.get("unitId");

  if (!propertyId || !unitId) {
    return NextResponse.json(
      { error: "propertyId and unitId required" },
      { status: 400 }
    );
  }

  try {
    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/landlord/by-unit?houseId=${propertyId}&unitId=${unitId}`,
      { cache: "no-store" }
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
    console.error("Lease by unit error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
