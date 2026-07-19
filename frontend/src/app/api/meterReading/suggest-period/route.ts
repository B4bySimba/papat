import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");
    const readOn = searchParams.get("readOn");
    const currentReading = searchParams.get("currentReading");

    if (!unitId || !readOn) {
      return NextResponse.json({ error: "Missing unitId or readOn" }, { status: 400 });
    }

    const backendUrl = new URL(`${process.env.BACKEND_API_URL}/meter-reading/suggest-period`);
    backendUrl.searchParams.set("unitId", unitId);
    backendUrl.searchParams.set("readOn", readOn);
    if (currentReading) backendUrl.searchParams.set("currentReading", currentReading);

    const res = await fetch(backendUrl.toString());
    if (!res.ok) {
      return NextResponse.json({ error: `Backend returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/meterReading/suggest-period failed:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
