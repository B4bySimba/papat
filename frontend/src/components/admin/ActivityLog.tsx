"use client";

import { useState } from "react";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { RowSheet } from "@/components/tables/rowSheet";
import { SkeletonPage } from "@/components/skeleton/page";
import { useServerTable } from "@/hooks/use-server-table";
import { when } from "./api";

type Row = Record<string, unknown>;
type Change = { table: string; op: string; before?: Row | Row[] | null; after?: Row | Row[] | null };
type RightsDiff = { house: string; added: string[]; removed: string[] };
type Entry = {
  id: string;
  at: string;
  username: string;
  action: string;
  actionLabel: string;
  subject: string | null;
  houses: string;
  changes: Change[] | { reason: string } | null;
  ip: string | null;
};

const TABLES: Record<string, string> = {
  payment: "Payment",
  MeterReading: "Meter reading",
  RateChange: "Rent or charge change",
  HouseAccess: "House rights",
  User: "Account",
};
const OPS: Record<string, string> = {
  create: "added",
  createMany: "added",
  update: "changed",
  updateMany: "changed",
  upsert: "saved",
  delete: "removed",
  deleteMany: "removed",
};
const NOISE = new Set(["updatedAt", "createdAt", "cretedAt", "sessionVersion"]);
const show = (v: unknown) =>
  v === null || v === undefined || v === ""
    ? "-"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);

/** The fields worth showing: for an edit, only those that changed. */
const visibleKeys = (change: Change) => {
  const before = (change.before ?? {}) as Row;
  const after = (change.after ?? {}) as Row;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (k) =>
      !NOISE.has(k) &&
      (!change.before || !change.after || show(before[k]) !== show(after[k])),
  );
};

/** The fields of one change: what each was and became, or the values added or removed. */
function Fields({ change }: { change: Change }) {
  if (Array.isArray(change.before) || Array.isArray(change.after))
    return (
      <pre className="overflow-x-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify(change.after ?? change.before, null, 2)}
      </pre>
    );
  const before = (change.before ?? {}) as Row;
  const after = (change.after ?? {}) as Row;
  const keys = visibleKeys(change);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {keys.map((k) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="break-all">
            {change.before && change.after ? (
              <>
                <span className="text-red-700 line-through">
                  {show(before[k])}
                </span>{" "}
                <span className="text-emerald-700">{show(after[k])}</span>
              </>
            ) : (
              show(after[k] ?? before[k])
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const columns: DataTableProps<Entry>["columns"] = [
  { key: "at", label: "When", render: (v: string) => when(v) },
  { key: "username", label: "Who" },
  {
    key: "actionLabel",
    label: "What",
    render: (v: string, e) => (e.subject ? `${v} · ${e.subject}` : v),
  },
  { key: "houses", label: "Houses", render: (v: string) => v || "-" },
];

export default function ActivityLog() {
  const table = useServerTable<Entry>("/api/admin/audit");
  const [open, setOpen] = useState<Entry | null>(null);
  if (!table.loaded) return <SkeletonPage variant="cards" columns={4} />;

  return (
    <>
      <DataTable
        data={table.rows}
        server={table}
        columns={columns}
        filters={[
          {
            key: "user" as keyof Entry,
            label: "Filter by Person",
            options: [
              { value: "all", label: "Everyone" },
              ...(table.filterOptions.user ?? []),
            ],
          },
          {
            key: "house" as keyof Entry,
            label: "Filter by House",
            options: [
              { value: "all", label: "All Houses" },
              ...(table.filterOptions.house ?? []),
            ],
          },
          {
            key: "action",
            label: "Filter by Action",
            options: [
              { value: "all", label: "Everything" },
              ...(table.filterOptions.action ?? []),
            ],
          },
        ]}
        searchPlaceholder="Search person or action..."
        exportFilename="activity-log"
        caption="Everything changed in the system, newest first"
        emptyLabel="Nothing recorded yet"
        mobileCard={{ title: "actionLabel", subtitle: "username", value: "at" }}
        onRowClick={setOpen}
      />
      <RowSheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title="What happened"
      >
        {open && <EntryDetail entry={open} />}
      </RowSheet>
    </>
  );
}

function EntryDetail({ entry: e }: { entry: Entry }) {
  const changes = Array.isArray(e.changes) ? e.changes : [];
  const rights = changes.find((c) => c.table === "Rights")?.after as unknown as RightsDiff[] | undefined;
  // A rights change reads best as its summary; the raw rows behind it add nothing.
  const rows = changes.filter(
    (c) =>
      c.table !== "Rights" &&
      !(rights && (c.table === "HouseAccess" || c.table === "User")) &&
      (Array.isArray(c.before) || Array.isArray(c.after) || visibleKeys(c).length > 0),
  );
  return (
    <div className="space-y-4 text-sm">
      <p>
        <strong>{e.username}</strong> · {e.actionLabel}
        {e.subject && ` · ${e.subject}`} · {when(e.at)}
        {e.houses && ` · ${e.houses}`}
      </p>
      {e.ip && <p className="text-xs text-muted-foreground">From {e.ip}</p>}
      {rights && !rights.length && <p className="text-muted-foreground">Saved with no change.</p>}
      {rights?.map((d) => (
        <div key={d.house} className="space-y-1 rounded-lg border p-3">
          <p className="font-medium">{d.house}</p>
          {d.added.map((r) => (
            <p key={`+${r}`} className="text-xs text-emerald-700">Added: {r}</p>
          ))}
          {d.removed.map((r) => (
            <p key={`-${r}`} className="text-xs text-red-700">Removed: {r}</p>
          ))}
        </div>
      ))}
      {Array.isArray(e.changes) ? (
        rows.map((c, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border p-3">
            <p className="font-medium">
              {TABLES[c.table] ?? c.table} {OPS[c.op] ?? c.op}
            </p>
            <Fields change={c} />
          </div>
        ))
      ) : e.changes ? (
        <p className="text-muted-foreground">Reason: {e.changes.reason}</p>
      ) : null}
    </div>
  );
}
