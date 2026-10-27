import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/logout"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") || // Next.js internal files
    pathname.includes(".") || // Files with extensions (e.g., .css, .js)
    pathname.startsWith("/favicon.ico") // Favicon
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  const refuse = () =>
    pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Your session has ended. Please log in again." }, { status: 401 })
      : NextResponse.redirect(new URL("/login", req.url));

  if (!token) return refuse();

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    return refuse();
  }
}
