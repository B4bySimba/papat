import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.BACKEND_API_URL}/meter-reading/getAll/filters`);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("Error in /api/meterReading/get/filters:", err);
    return NextResponse.json(
      { error: "Failed to fetch meter reading filters" },
      { status: 500 }
    );
  }
}
