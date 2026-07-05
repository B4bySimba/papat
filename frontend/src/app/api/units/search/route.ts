import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") || "";
  const houseId = req.nextUrl.searchParams.get("propertyId");

  const url = new URL(`${process.env.BACKEND_API_URL}/unit/search`);
  url.searchParams.append("search", search);
  if (houseId)  url.searchParams.append("houseId", houseId);
  
  try {
    const backendRes = await fetch(url.toString(), { cache: "no-store" });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json({ options: data }); // ✅ pass through cleanly
  } catch (error) {
    console.error("Units Proxy Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
