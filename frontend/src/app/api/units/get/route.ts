import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const houseId = req.nextUrl.searchParams.get("houseId");

  if (!houseId) {
    return NextResponse.json({ error: "Missing houseId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${process.env.BACKEND_API_URL}/unit/byHouseId/${houseId}`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch units from backend");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error fetching units:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
