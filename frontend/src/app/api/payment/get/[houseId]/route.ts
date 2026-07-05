import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params;

  try {
    const res = await fetch(
      `${process.env.BACKEND_API_URL}/payment/byHouseId/${houseId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch transactions");
    }

    const payments = await res.json();
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
