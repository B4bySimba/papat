import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const houseId = url.searchParams.get("houseId");
    const year = url.searchParams.get("year");
    const month = url.searchParams.get("month");

    if (!houseId || !year || !month) {
      return NextResponse.json({ error: "Missing houseId, year or month" }, { status: 400 });
    }

    const query = new URLSearchParams({ year, month });
    if (url.searchParams.get("pastTenants") === "1") query.set("includePastTenantsData", "true");

    const backendRes = await backendFetch(
      `${process.env.BACKEND_API_URL}/payment/${houseId}/summary/units?${query}`,
      { cache: "no-store" }
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend returned ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(await backendRes.json());
  } catch (err: any) {
    console.error("API route error:", err);
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
  }
}
