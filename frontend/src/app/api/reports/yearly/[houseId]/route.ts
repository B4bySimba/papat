import { NextResponse } from "next/server";

// Define the type for params
interface RouteContext {
  params: Promise<{
    houseId: string;
  }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    // Await the params since they're now a Promise
    const { houseId } = await context.params;

    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const includePastTenantsData = url.searchParams.get(
      "includePastTenantsData"
    );
    const startMonth = url.searchParams.get("startMonth");
    const endMonth = url.searchParams.get("endMonth");

    // Validate required parameters
    if (!houseId) {
      return NextResponse.json(
        { error: "houseId is required" },
        { status: 400 }
      );
    }

    // Build query parameters for backend API
    const backendParams = new URLSearchParams();

    if (year?.trim()) {
      backendParams.append("year", year);
    }

    if (includePastTenantsData === "true") {
      backendParams.append("includePastTenantsData", "true");
    }

    if (startMonth?.trim()) {
      backendParams.append("startMonth", startMonth);
    }

    if (endMonth?.trim()) {
      backendParams.append("endMonth", endMonth);
    }

    const backendUrl = `${
      process.env.BACKEND_API_URL
    }/payment/report/yearly/${houseId}?${backendParams.toString()}`;

    console.log("Fetching from backend:", backendUrl);

    const backendRes = await fetch(backendUrl, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      console.error("Backend error:", backendRes.status, errorText);
      return NextResponse.json(
        { error: `Backend returned ${backendRes.status}: ${errorText}` },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("API route error:", err);
    return NextResponse.json(
      { error: "Failed to fetch yearly payment report" },
      { status: 500 }
    );
  }
}
