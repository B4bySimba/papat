"use client";

import { useState } from "react";
import type { Transaction } from "@/lib/transactionSchema";
import { Badge } from "@/components/ui/badge";
import { RowSheet } from "@/components/tables/rowSheet";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RowEditForm } from "@/components/tables/RowEditForm";
import type { ServerTableState } from "@/hooks/use-server-table";
import { CreditCard, Edit, Globe, Landmark, LucideIcon, ScrollText, Smartphone, Wallet } from "lucide-react";

const methodIcons: Record<string, LucideIcon> = {
  "mobile-money": Smartphone,
  "bank-transfer": Landmark,
  online: Globe,
  cheque: ScrollText,
  "credit-card": CreditCard,
};

const methodLabel = (method: string) => {
  const words = method.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const tints = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];
const tintFor = (name: string) => tints[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % tints.length];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "?";

// "14/09/2026" -> "Sunday · 14/09/2026", with Today and Yesterday for the last two days.
const dayHeading = (value: string) => {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!parts) return value;
  const day = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const name = diff === 0 ? "Today" : diff === -1 ? "Yesterday" : day.toLocaleDateString("en-GB", { weekday: "long" });
  return `${name} · ${value}`;
};

type Props = {
  table: ServerTableState<Transaction>;
  onDelete: (id: string) => void;
  onSubmitEdit: (updated: Transaction) => void;
};

export function TransactionsTable({ table, onDelete, onSubmitEdit }: Props) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const filters = [
    {
      key: "houseId" as keyof Transaction,
      label: "Filter by House",
      options: [{ value: "all", label: "All Houses" }, ...(table.filterOptions.houseId ?? [])],
    },
    {
      key: "unitId" as keyof Transaction,
      label: "Filter by Unit",
      options: [{ value: "all", label: "All Units" }, ...(table.filterOptions.unitId ?? [])],
    },
  ];

  const columns: DataTableProps<Transaction>["columns"] = [
    { key: "tenantName", label: "Tenant" },
    { key: "tenantContact", label: "Contact" },
    {
      key: "date",
      label: "Date",
      render: (value: string, tx: Transaction) =>
        tx.futureDated ? (
          <span className="flex items-center gap-2">
            {value}
            <Badge variant="destructive">Future date</Badge>
          </span>
        ) : (
          value
        ),
    },
    { key: "reference", label: "Reference" },
    { key: "paymentMethod", label: "Method" },
    {
      key: "amount",
      label: "Amount",
      render: (value: number) => `KES ${value.toLocaleString()}`,
    },
    {
      key: "processed",
      label: "Status",
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Processed" : "Pending"}
        </Badge>
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={table.rows}
        server={table}
        columns={columns}
        filters={filters}
        onDelete={onDelete}
        exportFilename="transactions"
        caption="Recent transactions"
        mobileGroupBy={{ key: "date", label: dayHeading }}
        renderMobileRow={(tx, { grouped }) => {
          const MethodIcon = methodIcons[tx.paymentMethod] ?? Wallet;
          const name = tx.tenantName ?? "";
          return (
            <div className="flex items-center gap-3">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tintFor(name)}`}>
                {initials(name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold">{name}</p>
                  <p className="shrink-0 text-[15px] font-semibold tabular-nums">KES {tx.amount.toLocaleString()}</p>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {!grouped && `${tx.date} · `}
                    {tx.unitNumber} · {tx.houseName}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <MethodIcon className="size-3.5" />
                    {methodLabel(tx.paymentMethod)}
                  </span>
                </div>
                {(tx.futureDated || !tx.processed) && (
                  <div className="mt-1.5 flex gap-1.5">
                    {tx.futureDated && (
                      <Badge className="h-5 border-0 bg-red-50 px-1.5 text-[10px] text-red-700 ring-1 ring-inset ring-red-600/20">Future date</Badge>
                    )}
                    {!tx.processed && (
                      <Badge className="h-5 border-0 bg-amber-50 px-1.5 text-[10px] text-amber-700 ring-1 ring-inset ring-amber-600/25">Pending</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }}
        emptyLabel="No Transactions Found"
        onRowClick={(tx) => {
          setSelected(tx);
          setMode("view");
        }}
        renderRowDetail={(tx) => (
          <div className="text-sm space-y-3">
            <p>
              <strong>Payee:</strong> {tx.tenantName}
            </p>
            <p>
              <strong>Tenant Contact:</strong> {tx.tenantContact}
            </p>
            <p>
              <strong>Unit:</strong> {tx.unitNumber}
            </p>
            <p>
              <strong>House:</strong> {tx.houseName}
            </p>
            <p>
              <strong>Date:</strong> {tx.date}
            </p>
            <p>
              <strong>Amount:</strong> KES {tx.amount.toLocaleString()}
            </p>
            <p>
              <strong>Reference:</strong> {tx.reference}
            </p>
            <p>
              <strong>Method:</strong> {tx.paymentMethod}
            </p>
            <p>
              <strong>Status:</strong> {tx.processed ? "Processed" : "Pending"}
            </p>
          </div>
        )}
        detailSheetTitle="Transaction Details"
        onEditClick={(tx) => {
          setSelected(tx);
          setMode("edit");
        }}
      />

      {selected && (
        <RowSheet
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={mode === "edit" ? "Edit Transaction" : "Transaction Details"}
        >
          {mode === "view" ? (
            <>
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("edit")}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="text-sm space-y-3">
                <p>
                  <strong>Payee:</strong> {selected.tenantName}
                </p>
                <p>
                  <strong>Tenant Contact:</strong> {selected.tenantContact}
                </p>
                <p>
                  <strong>Unit:</strong> {selected.unitNumber}
                </p>
                <p>
                  <strong>House:</strong> {selected.houseName}
                </p>
                <p>
                  <strong>Date:</strong> {selected.date}
                </p>
                <p>
                  <strong>Amount:</strong> KES{" "}
                  {selected.amount.toLocaleString()}
                </p>
                <p>
                  <strong>Reference:</strong> {selected.reference}
                </p>
                <p>
                  <strong>Method:</strong> {selected.paymentMethod}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {selected.processed ? "Processed" : "Pending"}
                </p>
              </div>
            </>
          ) : (
            <RowEditForm
              item={selected}
              onCancel={() => setMode("view")}
              onSubmit={(updated) => {
                onSubmitEdit(updated);
                setSelected(null);
              }}
              fields={[
                { key: "amount", label: "Amount", type: "number" },
                { key: "reference", label: "Reference" },
                { key: "paymentMethod", label: "Method" },
                { key: "date", label: "Date", type: "date" },
              ]}
            />
          )}
        </RowSheet>
      )}
    </>
  );
}
