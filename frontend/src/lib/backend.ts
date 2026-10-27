import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Me } from "@/components/AccessProvider";
import type { Summary } from "./summary";

/** For pages: an ended session goes back to login; a record the user may not see is simply not found. */
export function pageGuard(res: Response) {
  if (res.status === 401) redirect("/login");
  if (res.status === 403 || res.status === 404) notFound();
}

/** Who is signed in and what they may do; null when nobody is. */
export async function fetchMe(): Promise<Me | null> {
  if (!(await cookies()).get("token")) return null;
  const res = await backendFetch(`${process.env.BACKEND_API_URL}/auth/me`, { cache: "no-store" });
  return res.ok ? res.json() : null;
}

/** Server-side `fetch` to the backend, sent as the signed-in user. */
export async function backendFetch(input: string | URL, init: RequestInit = {}) {
  const [jar, incoming] = await Promise.all([cookies(), headers()]);
  const token = jar.get("token")?.value;
  const ip = incoming.get("x-forwarded-for");
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(ip && { "X-Forwarded-For": ip }),
    },
  });
}

/** Fetches a summary straight from the backend, no proxy hop. Null when the user may not see this money. */
export async function fetchSummary(path: string): Promise<Summary | null> {
  const res = await backendFetch(`${process.env.BACKEND_API_URL}${path}`, { cache: "no-store" });
  if (res.status === 401) redirect("/login");
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend returned ${res.status} for ${path}`);
  return res.json();
}

/** Payments typed with a date after today, optionally for one lease. */
export async function fetchFutureDated(leaseCode?: string) {
  const query = leaseCode ? `?leaseCode=${encodeURIComponent(leaseCode)}` : "";
  const res = await backendFetch(`${process.env.BACKEND_API_URL}/payment/future-dated${query}`, { cache: "no-store" });
  return res.ok ? res.json() : [];
}
