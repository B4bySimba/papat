import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // CSRF validation
    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = (await cookies()).get("csrf_token")?.value;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return NextResponse.json(
        { message: "CSRF token mismatch" },
        { status: 403 }
      );
    }

    const backendRes = await fetch(
      `${process.env.BACKEND_API_URL}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      }
    );

    const data = await backendRes.json();

    const response = new NextResponse(JSON.stringify(data), {
      status: backendRes.status,
      headers: { "Content-Type": "application/json" },
    });

    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      response.headers.append("Set-Cookie", setCookie);
    }

    if (backendRes.ok) {
      response.headers.append("Set-Cookie", "csrf_token=; Max-Age=0; path=/");
    }
    

    return response;
  } catch (err) {
    console.error("Login proxy error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
