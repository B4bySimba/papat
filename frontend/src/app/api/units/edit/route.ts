import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { id, ...updatePayload } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "Unit ID is required" },
        { status: 400 }
      );
    }      

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/unit/editUnit/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      return NextResponse.json(errorData, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json(
      { error: "Failed to update unit", details: String(err) },
      { status: 500 }
    );
  }
}
