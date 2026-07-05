import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/meter-reading/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add Authorization here if needed
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || "Failed to create unit");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("POST /api/units/create failed:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
