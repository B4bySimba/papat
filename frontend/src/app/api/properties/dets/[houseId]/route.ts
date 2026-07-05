import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  try {
    const res = await fetch(
      `${process.env.BACKEND_API_URL}/house/dets/${houseId}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Failed to fetch house details:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
