import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const { houseId, payload } = await req.json();

    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/house/editHouse/${houseId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // Add auth headers here if needed
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Failed to patch house" },
      { status: 500 }
    );
  }
}
