import { NextResponse } from "next/server";

/** Passes a request on to the backend and returns its answer, with the backend's message on an error. */
export async function forward(path: string, body?: unknown) {
  try {
    const res = await fetch(`${process.env.BACKEND_API_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || "Request failed" }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("API Route Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
