import { backendFetch } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const res = await backendFetch(`${process.env.BACKEND_API_URL}/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Backend error: ${res.status}` }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("Search proxy error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
