import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leaseCode = url.searchParams.get("leaseCode");

    if (!leaseCode) {
      return NextResponse.json({ error: "Missing leaseCode" }, { status: 400 });
    }

    const res = await backendFetch(
      `${process.env.BACKEND_API_URL}/payment/le/${leaseCode}/summary`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();

    const transformed: any[] = [];

    // Flatten and transform the summary object
    for (const year of Object.keys(json.summary)) {
      const months = json.summary[year];
      for (const month of Object.keys(months)) {
        const details = months[month];

        transformed.push({
          year: parseInt(year),
          month,
          carryForward: details.carryForward || 0,
          rentCharged: details.rentCharged || 0,
          currentCharges: details.currentCharges || 0,
          transfer: details.transfer || 0,
          transferNote: details.transferNote ?? null,
          expected: details.expected || 0,
          collected: details.collected || 0,
          balance: details.balance || 0,
          usage: details.usage || 0,
          waterCharge: details.waterCharge || 0,
          payments: details.payments || [],
        });
      }
    }

    return NextResponse.json({ data: transformed }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ledger summary:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
