import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

const TARGET: Record<string, string> = { users: "/user", catalog: "/user/catalog", audit: "/audit" };

/** Passes admin requests (people, rights, activity log) to the backend, which decides who may make them. */
async function pass(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const [head, ...rest] = (await params).path;
  const base = TARGET[head];
  if (!base) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const body = req.method === "GET" ? undefined : (await req.text()) || undefined;
    const res = await backendFetch(
      `${process.env.BACKEND_API_URL}${[base, ...rest.map(encodeURIComponent)].join("/")}${req.nextUrl.search}`,
      { method: req.method, headers: { "Content-Type": "application/json" }, body, cache: "no-store" },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(res.ok ? data : { error: data?.message || "Request failed" }, { status: res.status });
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export { pass as GET, pass as POST, pass as PATCH, pass as PUT };
