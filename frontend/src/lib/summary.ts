/** Shared shape of every V2 money endpoint: years plus year -> month -> totals. */
export interface Summary {
  years: number[];
  summary: Record<string, Record<string, any>>;
}

/** One year flattened into the `{month, ...totals}` rows the charts and ledgers consume. */
export function yearRows(summary: Summary["summary"], year: string) {
  return Object.entries(summary?.[year] ?? {}).map(([month, values]: [string, any]) => ({
    month,
    ...values,
  }));
}

/** Every year flattened, oldest first: the all-years ledger view. */
export function allRows(summary: Summary["summary"]) {
  return Object.keys(summary ?? {})
    .sort((a, b) => Number(a) - Number(b))
    .flatMap((year) => yearRows(summary, year).map((row) => ({ year: Number(year), ...row })));
}

/** The current year when it has data, otherwise the most recent year that does. */
export function defaultYear(years: number[] = []) {
  const current = String(new Date().getFullYear());
  return years.map(String).includes(current) ? current : String(years[0] ?? current);
}

/** True when a year holds at least one non-zero figure, used to show the empty state. */
export function hasData(rows: any[]) {
  return rows.some((row) =>
    Object.entries(row).some(([k, v]) => k !== "month" && typeof v === "number" && v !== 0),
  );
}
