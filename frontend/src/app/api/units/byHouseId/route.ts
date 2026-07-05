import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const houseId = searchParams.get("houseId");

    if (!houseId) {
      return NextResponse.json({ error: "Missing houseId" }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/unit/byHouseId/${houseId}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching units:", err);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}
