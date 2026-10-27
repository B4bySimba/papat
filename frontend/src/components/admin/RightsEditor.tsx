"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Catalog } from "./api";

export type Access = { rights: string[]; houses: Record<string, string[]> };

const AREAS = ["House details", "Units", "Tenants", "Payments", "Meter readings"];
const ACTIONS = ["View", "Add", "Edit", "Delete"];

/** Ticking a right adds what it needs; unticking one removes what can't work without it. */
function useRules(catalog: Catalog) {
  return useMemo(() => {
    const neededBy: Record<string, string[]> = {};
    for (const [right, needs] of Object.entries(catalog.needs)) for (const n of needs) (neededBy[n] ??= []).push(right);
    const walk = (start: string, next: Record<string, string[]>, into: Set<string>) => {
      const stack = [start];
      while (stack.length) {
        const r = stack.pop()!;
        if (into.has(r)) continue;
        into.add(r);
        stack.push(...(next[r] ?? []));
      }
      return into;
    };
    return {
      on: (rights: string[], right: string) => [...walk(right, catalog.needs, new Set(rights))],
      off: (rights: string[], right: string) => {
        const gone = walk(right, neededBy, new Set());
        return rights.filter((r) => !gone.has(r));
      },
    };
  }, [catalog]);
}

export function RightsEditor({
  catalog,
  houses,
  value,
  onChange,
  readOnly,
}: {
  catalog: Catalog;
  houses: { id: string; name: string }[];
  value: Access;
  onChange: (next: Access) => void;
  readOnly: boolean;
}) {
  const rules = useRules(catalog);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const byKey = useMemo(() => new Map(catalog.rights.map((r) => [`${r.area}|${r.label}`, r.key])), [catalog]);
  const special = catalog.rights.filter((r) => r.area === "Special");
  const global = catalog.rights.filter((r) => r.area === "Global");
  const label = useMemo(() => new Map(catalog.rights.map((r) => [r.key, r.area === "Special" ? r.label : `${r.area}: ${r.label}`])), [catalog]);

  const assigned = houses.filter((h) => value.houses[h.id]);
  const shown = houses.filter((h) => h.name.toLowerCase().includes(search.trim().toLowerCase()));

  const setHouse = (id: string, rights: string[] | null) => {
    const next = { ...value.houses };
    if (rights?.length) next[id] = rights;
    else delete next[id];
    onChange({ ...value, houses: next });
  };
  const toggle = (id: string, right: string, checked: boolean) => {
    const rights = value.houses[id] ?? [];
    setHouse(id, checked ? rules.on(rights, right) : rules.off(rights, right));
  };
  const summary = (rights: string[]) => {
    const extra = rights.filter((r) => !catalog.onTick.includes(r)).map((r) => label.get(r) ?? r);
    const missing = catalog.onTick.filter((r) => !rights.includes(r));
    const head = missing.length ? `View (${catalog.onTick.length - missing.length} of ${catalog.onTick.length})` : "View";
    return [head, ...extra.slice(0, 3), extra.length > 3 ? `+${extra.length - 3} more` : ""].filter(Boolean).join(" · ");
  };

  const box = (houseId: string, right: string | undefined) =>
    right ? (
      <Checkbox
        aria-label={label.get(right)}
        checked={!!value.houses[houseId]?.includes(right)}
        disabled={readOnly}
        onCheckedChange={(c) => toggle(houseId, right, c === true)}
      />
    ) : (
      <span className="text-muted-foreground">-</span>
    );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h3 className="font-semibold">Across the company</h3>
        <p className="mb-3 text-sm text-muted-foreground">Not tied to a house.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {global.map((r) => (
            <label key={r.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={value.rights.includes(r.key)}
                disabled={readOnly}
                onCheckedChange={(c) =>
                  onChange({ ...value, rights: c === true ? [...value.rights, r.key] : value.rights.filter((k) => k !== r.key) })
                }
              />
              {r.label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="font-semibold">Houses</h3>
            <p className="text-sm text-muted-foreground">
              {assigned.length} of {houses.length} houses. Ticking a house gives view rights; open it to add actions.
            </p>
          </div>
          <Input placeholder="Search houses..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
        </div>

        <ul className="divide-y">
          {shown.map((h) => {
            const rights = value.houses[h.id];
            const isOpen = open === h.id && !!rights;
            return (
              <li key={h.id}>
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Checkbox
                    aria-label={`Give ${h.name}`}
                    checked={!!rights}
                    disabled={readOnly}
                    onCheckedChange={(c) => setHouse(h.id, c === true ? [...catalog.onTick] : null)}
                  />
                  <button
                    type="button"
                    disabled={!rights}
                    onClick={() => setOpen(isOpen ? null : h.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left disabled:cursor-default"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{h.name}</span>
                      {rights && <span className="block truncate text-xs text-muted-foreground">{summary(rights)}</span>}
                    </span>
                    {rights && <ChevronDown className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-4 bg-muted/30 px-4 pb-4 pt-1 sm:px-5">
                    <div className="overflow-x-auto">
                      <div className="grid min-w-[20rem] grid-cols-[1fr_repeat(4,3.5rem)] items-center gap-y-2 text-sm">
                        <span />
                        {ACTIONS.map((a) => (
                          <span key={a} className="text-center text-xs font-medium text-muted-foreground">
                            {a}
                          </span>
                        ))}
                        {AREAS.map((area) => (
                          <Fragment key={area}>
                            <span>{area}</span>
                            {ACTIONS.map((a) => (
                              <span key={a} className="flex justify-center">
                                {box(h.id, byKey.get(`${area}|${a}`))}
                              </span>
                            ))}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {special.map((r) => (
                        <label key={r.key} className="flex items-center gap-2 text-sm">
                          {box(h.id, r.key)}
                          {r.label}
                        </label>
                      ))}
                    </div>
                    {!readOnly && assigned.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onChange({ ...value, houses: Object.fromEntries(assigned.map((a) => [a.id, [...rights]])) })
                        }
                      >
                        <CopyCheck />
                        Use these rights for all {assigned.length} houses
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
          {!shown.length && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No house matches.</li>}
        </ul>
      </section>
    </div>
  );
}
