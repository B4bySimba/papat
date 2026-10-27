import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendRes = await backendFetch(`${process.env.BACKEND_API_URL}/tenant/past`, { cache: "no-store" });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(await backendRes.json());
  } catch (error) {
    console.error("Proxy API error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
