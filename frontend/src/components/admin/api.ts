/** A person as the admin pages list them. */
export type Person = {
  id: string;
  username: string;
  name: string | null;
  role: "ROOT" | "ADMIN" | "AGENT";
  suspended: boolean;
  locked: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  houseCount: number;
};

export type PersonDetail = Person & { rights: string[]; houses: { id: string; name: string; rights: string[] }[] };

export type Catalog = {
  rights: { key: string; area: string; label: string; global?: boolean }[];
  onTick: string[];
  needs: Record<string, string[]>;
};

/** Calls the admin API; a refusal becomes an Error carrying the backend's message. */
export async function adminApi<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

export const ROLE_LABEL: Record<Person["role"], string> = { ROOT: "Root", ADMIN: "Admin", AGENT: "Agent" };

/** dd/mm/yyyy, hh:mm, like every other date in the app. */
export const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

export function statusOf(p: Person) {
  if (p.suspended) return { label: "Suspended", tone: "bg-red-50 text-red-700 ring-red-600/20" };
  if (p.locked) return { label: "Locked", tone: "bg-amber-50 text-amber-700 ring-amber-600/20" };
  if (p.mustChangePassword) return { label: "Awaiting first login", tone: "bg-sky-50 text-sky-700 ring-sky-600/20" };
  return { label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" };
}
