"use client";

import { useAccess } from "@/components/AccessProvider";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RowSheet } from "@/components/tables/rowSheet";
import { DataTable, DataTableProps } from "@/components/tables/DataTable";
import { RowEditForm } from "@/components/tables/RowEditForm";
import { MeterReading } from "@/lib/meterReadingsSchema";
import type { ServerTableState } from "@/hooks/use-server-table";
import PlaceLink from "@/components/PlaceLink";

type Props = {
  table: ServerTableState<MeterReading>;
  onDelete: (id: string) => void;
  onSubmitEdit: (updated: MeterReading) => void;
};

export function MeterReadingsTable({ table, onDelete, onSubmitEdit }: Props) {
  const { can } = useAccess();
  const [selected, setSelected] = useState<MeterReading | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");

  const filters = [
    {
      key: "houseId" as keyof MeterReading,
      label: "Filter by House",
      options: [{ value: "all", label: "All Houses" }, ...(table.filterOptions.houseId ?? [])],
    },
    {
      key: "unitId" as keyof MeterReading,
      label: "Filter by Unit",
      options: [{ value: "all", label: "All Units" }, ...(table.filterOptions.unitId ?? [])],
    },
  ];

  const columns: DataTableProps<MeterReading>["columns"] = [
    { key: "houseName", label: "House", render: (value: string, r) => <PlaceLink href={`/properties/${r.houseId}`}>{value}</PlaceLink> },
    { key: "unitNumber", label: "Unit", render: (value: string, r) => <PlaceLink href={`/properties/${r.houseId}/units/${r.unitId}`}>{value}</PlaceLink> },
    // { key: "readOn", label: "Read On" },
    { key: "closingFor", label: "Closing For" },
    { key: "currentReading", label: "Meter Reading" },
    { key: "pricePerUnit", label: "Price Per Unit" },
  ];

  return (
    <>
      <DataTable
        data={table.rows}
        server={table}
        columns={columns}
        filters={filters}
        onDelete={onDelete}
        canAct={(r, action) => can(`readings.${action}`, r.houseId)}
        renderMobileRow={(reading) => (
          <div className="flex items-center gap-3">
            <span className="flex h-10 min-w-10 max-w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 px-2 text-sm font-bold text-primary">
              <span className="truncate">{reading.unitNumber}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{reading.houseName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{reading.closingFor}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold leading-none tabular-nums">{reading.currentReading}</p>
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">KES {reading.pricePerUnit}/unit</p>
            </div>
          </div>
        )}
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
              <strong>House:</strong> <PlaceLink href={`/properties/${tx.houseId}`}>{tx.houseName}</PlaceLink>
            </p>
            <p>
              <strong>Unit:</strong> <PlaceLink href={`/properties/${tx.houseId}/units/${tx.unitId}`}>{tx.unitNumber}</PlaceLink>
            </p>
            <p>
              <strong>Read On:</strong> {tx.readOn}
            </p>
            <p>
              <strong>Closing For:</strong> {tx.closingFor}
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
                <strong>House:</strong> <PlaceLink href={`/properties/${selected.houseId}`}>{selected.houseName}</PlaceLink>
              </p>
              <p>
                <strong>Unit:</strong> <PlaceLink href={`/properties/${selected.houseId}/units/${selected.unitId}`}>{selected.unitNumber}</PlaceLink>
              </p>
              <p>
                <strong>Read On:</strong> {selected.readOn}
              </p>
              <p>
                <strong>Closing For:</strong> {selected.closingFor}
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
