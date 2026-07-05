"use client";

import { useState } from "react";
import type { Transaction } from "@/lib/transactionSchema";
import { Badge } from "@/components/ui/badge";
import { RowSheet } from "@/components/tables/rowSheet";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RowEditForm } from "@/components/tables/RowEditForm";
import { Edit } from "lucide-react";

type Props = {
  data: Transaction[];
  onDelete: (id: string) => void;
  onSubmitEdit: (updated: Transaction) => void;
};

export function TransactionsTable({ data, onDelete, onSubmitEdit }: Props) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const uniqueHouses = [
    ...new Set(
      data.map((tx) => JSON.stringify({ id: tx.houseId, name: tx.houseName }))
    ),
  ].map((str) => JSON.parse(str));

  const uniqueUnits = [
    ...new Set(
      data.map((tx) => JSON.stringify({ id: tx.unitId, number: tx.unitNumber }))
    ),
  ].map((str) => JSON.parse(str));

  const filters = [
    {
      key: "houseId" as keyof Transaction,
      label: "Filter by House",
      options: [
        { value: "all", label: "All Houses" },
        ...uniqueHouses.map((h) => ({ value: h.id, label: h.name })),
      ],
    },
    {
      key: "unitId" as keyof Transaction,
      label: "Filter by Unit",
      options: [
        { value: "all", label: "All Units" },
        ...uniqueUnits.map((u) => ({ value: u.id, label: u.number })),
      ],
    },
  ];

  const columns: DataTableProps<Transaction>["columns"] = [
    { key: "tenantName", label: "Tenant" },
    { key: "tenantContact", label: "Contact" },
    { key: "date", label: "Date" },
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
        data={data}
        columns={columns}
        filters={filters}
        onDelete={onDelete}
        exportFilename="transactions"
        caption="Recent transactions"
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
