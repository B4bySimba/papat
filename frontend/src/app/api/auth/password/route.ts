import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

/** Changes the password; the backend answers with a fresh session cookie, passed on to the browser. */
export async function POST(req: NextRequest) {
  try {
    const res = await backendFetch(`${process.env.BACKEND_API_URL}/auth/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await req.json()),
    });
    const response = NextResponse.json(await res.json(), { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.append("Set-Cookie", setCookie);
    return response;
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
