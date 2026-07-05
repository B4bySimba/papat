import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  try {
    const { houseId } = await req.json();

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/house/deleteHouse/${houseId}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to delete house" },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
