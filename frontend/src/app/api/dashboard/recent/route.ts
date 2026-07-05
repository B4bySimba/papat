import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
) {
  try {
    const res = await fetch(
      `${process.env.BACKEND_API_URL}/payment/recent`,
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
