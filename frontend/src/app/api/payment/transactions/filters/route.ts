import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await backendFetch(`${process.env.BACKEND_API_URL}/payment/getAll/filters`);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("Error in /api/payment/transactions/filters:", err);
    return NextResponse.json(
      { error: "Failed to fetch transaction filters" },
      { status: 500 }
    );
  }
}
