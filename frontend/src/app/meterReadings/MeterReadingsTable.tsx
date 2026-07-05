"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RowSheet } from "@/components/tables/rowSheet";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { RowEditForm } from "@/components/tables/RowEditForm";
import { MeterReading } from "@/lib/meterReadingsSchema";

type Props = {
  data: MeterReading[];
  onDelete: (id: string) => void;
  onSubmitEdit: (updated: MeterReading) => void;
};

export function MeterReadingsTable({ data, onDelete, onSubmitEdit }: Props) {
  const [selected, setSelected] = useState<MeterReading | null>(null);
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
      key: "houseId" as keyof MeterReading,
      label: "Filter by House",
      options: [
        { value: "all", label: "All Houses" },
        ...uniqueHouses.map((h) => ({ value: h.id, label: h.name })),
      ],
    },
    {
      key: "unitId" as keyof MeterReading,
      label: "Filter by Unit",
      options: [
        { value: "all", label: "All Units" },
        ...uniqueUnits.map((u) => ({ value: u.id, label: u.number })),
      ],
    },
  ];

  const columns: DataTableProps<MeterReading>["columns"] = [
    { key: "houseName", label: "House" },
    { key: "unitNumber", label: "Unit" },
    { key: "readOn", label: "Read On" },
    { key: "currentReading", label: "Meter Reading" },
    { key: "pricePerUnit", label: "Price Per Unit" },
  ];

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        filters={filters}
        onDelete={onDelete}
        exportFilename="Meter Readings"
        caption="Recent Meter Readings"
        emptyLabel="No Meter Readings Found"
        onRowClick={(tx) => {
          setSelected(tx);
          setMode("view");
        }}
        renderRowDetail={(tx) => (
          <div className="text-sm space-y-3">
            <p>
              <strong>House:</strong> {tx.houseName}
            </p>
            <p>
              <strong>Unit:</strong> {tx.unitNumber}
            </p>
            <p>
              <strong>Read On:</strong> {tx.readOn}
            </p>
            <p>
              <strong>Reading:</strong> {tx.currentReading}
            </p>
          </div>
        )}
        detailSheetTitle="MeterReading Details"
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
          title={mode === "edit" ? "Edit MeterReading" : "MeterReading Details"}
        >
          {mode === "view" ? (
            <div className="text-sm space-y-3">
              <p>
                <strong>House:</strong> {selected.houseName}
              </p>
              <p>
                <strong>Unit:</strong> {selected.unitNumber}
              </p>
              <p>
                <strong>Read On:</strong> {selected.readOn}
              </p>
              <p>
                <strong>Reading:</strong> {selected.currentReading}
              </p>
            </div>
          ) : (
            <RowEditForm
              item={selected}
              onCancel={() => setMode("view")}
              onSubmit={(updated) => {
                onSubmitEdit(updated);
                setSelected(null);
              }}
              fields={[
                { key: "readOn", label: "Read On", type: "date" },
                { key: "currentReading", label: "Meter Reading", type: "number" },
              ]}
            />
          )}
        </RowSheet>
      )}
    </>
  );
}
