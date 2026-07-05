// src/app/api/reports/monthly/[houseId]/route.ts
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ houseId: string }> } // params is now a Promise
) {
  try {
    // Await the params to get the houseId
    const { houseId } = await params;

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const includePastTenantsData = searchParams.get("includePastTenantsData");;

    // Better validation
    if (!houseId?.trim()) {
      return NextResponse.json(
        { error: "House ID is required" },
        { status: 400 }
      );
    }
    if (!year?.trim()) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }
    if (!month?.trim()) {
      return NextResponse.json({ error: "Month is required" }, { status: 400 });
    }

    // Construct URL properly with URLSearchParams
    const backendUrl = new URL(
      `${process.env.BACKEND_API_URL}/payment/report/monthly/${houseId}`
    );

    const queryParams = new URLSearchParams({
      year: year,
      month: month,
    });

    if (includePastTenantsData === "true") {
      queryParams.append("includePastTenantsData", "true");
    }

    backendUrl.search = queryParams.toString();

    console.log("Backend URL:", backendUrl.toString()); // Debug log

    const response = await fetch(backendUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: `Backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Monthly report API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
