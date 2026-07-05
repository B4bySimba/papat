import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const houseId = url.searchParams.get("houseId");

    if (!houseId) {
      return NextResponse.json({ error: "Missing houseId" }, { status: 400 });
    }

    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/payment/${houseId}/summary`
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend returned ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const raw = await backendRes.json();
    const { years, summary } = raw;

    let chartData = [];

    if (year && summary?.[year]) {
      chartData = Object.entries(summary[year]).map(([month, values]: any) => ({
        month,
        ...values,
      }));
    }

    return NextResponse.json({ years, chartData });
  } catch (err: any) {
    console.error("API route error:", err);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
