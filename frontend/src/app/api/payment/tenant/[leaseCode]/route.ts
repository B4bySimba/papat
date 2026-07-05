import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leaseCode: string }> }
) {
  const { leaseCode } = await params;
  try {
    const res = await fetch(
      `${process.env.BACKEND_API_URL}/payment/get/tenant/${leaseCode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // If needed: credentials, authorization, etc.
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch transactions");
    }

    const payments = await res.json();
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
