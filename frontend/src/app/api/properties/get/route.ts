import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(`${process.env.BACKEND_API_URL}/house/names`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // If needed: credentials, authorization, etc.
    });

    if (!res.ok) {
      throw new Error("Failed to fetch properties");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/properties/get:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
