import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ houseId: string }> }
) {
  try {
    const { houseId } = await params;

    if (!houseId) {
      return NextResponse.json({ error: "Missing houseId" }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/unit/names/${houseId}`
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
