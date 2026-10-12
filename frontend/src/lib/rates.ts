// Shared by the rent-change and property-wide forms. Field names match the backend's lease terms.

export type Terms = Record<string, string | number | null>;

export interface Impact {
  months: { month: string; before: number; after: number }[];
  balanceBefore: number;
  balanceAfter: number;
}

export const AMOUNT_FIELDS: [string, string][] = [
  ["rentRate", "Rent"],
  ["rentDue", "Rent due day"],
  ["waterRate", "Water rate (per unit)"],
  ["serviceCharge", "Water service charge"],
  ["garbageFee", "Garbage"],
];

/** [label field, amount field] pairs: the unit's additional charge, then the seven named extras. */
export const EXTRA_FIELDS: [string, string][] = [
  ["additional", "additionalCharges"],
  ...Array.from({ length: 7 }, (_, i): [string, string] => [`added_field_${i + 1}`, `added_field_${i + 1}_price`]),
];

const isLabel = (key: string) => key === "additional" || /^added_field_\d$/.test(key);

/** "2026-03" as "Mar 2026". */
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "short", year: "numeric" });
}

/** Next month as "YYYY-MM", the usual start for a change. */
export function nextMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

/** Form values as the backend expects them: amounts as numbers, empty names as null. */
export function toTerms(form: Terms): Terms {
  const out: Terms = {};
  for (const [key, value] of Object.entries(form)) {
    out[key] = isLabel(key) ? String(value ?? "").trim() || null : Number(value) || 0;
  }
  return out;
}

/** A saved change in words, e.g. "Rent 11,000, Garbage 400". */
export function describeChange(fields: Terms, current: Terms) {
  const parts = AMOUNT_FIELDS.filter(([key]) => fields[key] != null).map(
    ([key, label]) => `${label} ${Number(fields[key]).toLocaleString()}`
  );
  for (const [label, amount] of EXTRA_FIELDS) {
    const name = fields[label] ?? current[label] ?? "Extra";
    if (fields[amount] != null) parts.push(`${name} ${Number(fields[amount]).toLocaleString()}`);
    else if (fields[label] != null) parts.push(`renamed to ${name}`);
  }
  return parts.join(", ");
}
