import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leaseCode: string }> }
) {
  const { leaseCode } = await params;

  try {
    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/tenant/year/${leaseCode}`
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    const year = await backendRes.json();
    return NextResponse.json(year);
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
