import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leaseCode = url.searchParams.get("leaseCode");
    const year = url.searchParams.get("year");

    if (!leaseCode) {
      return NextResponse.json({ error: "Missing leaseCode" }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.BACKEND_API_URL}/payment/le/${leaseCode}/summary`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const { years, summary } = await res.json();

    let chartData = [];

    if (year && summary?.[year]) {
      chartData = Object.entries(summary[year]).map(([month, values]: any) => ({
        month,
        ...values,
      }));
    }

    return NextResponse.json({ years, chartData });
  } catch (err) {
    console.error("Lease summary API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch lease summary" },
      { status: 500 }
    );
  }
}
