"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/tables/DataTable";
import { UnitsList } from "@/lib/unitsSchema";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DoorClosed, DoorOpen } from "lucide-react";
import { useSelectedUnit } from "@/lib/store/useSelectedUnit";
import { RowSheet } from "@/components/tables/rowSheet";
import { RowEditForm } from "@/components/tables/RowEditForm";
import { toast } from "sonner";

type UnitWithId = UnitsList & { id: string };

type Props = {
  data: UnitWithId[];
  onDelete: (id: string) => void;
  onSubmitEdit: (updated: UnitWithId) => void;
  refreshData: () => void;
};

export function UnitsTable({ data, onDelete, refreshData }: Props) {
  const searchParams = useSearchParams();
  const { houseId } = useParams();
  const router = useRouter();

  const [selectedUnit, setSelectedUnit] = useState<UnitsList | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const uniqueUnits = [
    ...new Set(
      data.map((tx) => JSON.stringify({ id: tx.unitId, number: tx.unitNumber }))
    ),
  ].map((str) => JSON.parse(str));

  const uniqueTenants = [
    ...new Set(
      data.map((tx) =>
        JSON.stringify({ leaseId: tx.leaseId, name: tx.tenantName })
      )
    ),
  ].map((str) => JSON.parse(str));

  const columns = [
    {
      key: "unitNumber" as keyof UnitsList,
      label: "Unit Number",
    },
    {
      key: "tenantName" as keyof UnitsList,
      label: "Tenant Name",
    },
    {
      key: "tenantTel" as keyof UnitsList,
      label: "Tenant Contact",
    },
    {
      key: "rent" as keyof UnitsList,
      label: "Rate",
      render: (value: number) => `KES ${value.toLocaleString()}`,
    },
    {
      key: "state" as keyof UnitsList,
      label: "Status",
      render: (value: boolean) => (
        <Badge
          className={`text-white ${value ? "bg-green-600" : "bg-yellow-500"}`}
        >
          {value ? "Occupied" : "Vacant"}
        </Badge>
      ),
    },
    {
      key: "moveInDate" as keyof UnitsList,
      label: "Occupied Since",
    },
  ];

  const filters = [
    {
      key: "unitId" as keyof UnitsList,
      label: "Filter by Unit",
      options: [
        { value: "all", label: "All Units" },
        ...uniqueUnits.map((u) => ({ value: u.id, label: u.number })),
      ],
    },
    {
      key: "leaseId" as keyof UnitsList,
      label: "Filter by Tenant",
      options: [
        { value: "all", label: "All Tenants" },
        ...uniqueTenants.map((t) => ({ value: t.leaseId, label: t.name })),
      ],
    },
  ];

  const handleRowClick = (unit: UnitsList) => {
    if (unit.unitId) {
      useSelectedUnit.getState().setSelectedUnit(unit); // save to store
      router.push(`/properties/${houseId}/units/${unit.unitId}`);
    }
  };

  const initialStatus =
    (searchParams.get("status") as "all" | "occupied" | "vacant") ?? "all";
  const [statusFilter, setStatusFilter] = useState<
    "all" | "occupied" | "vacant"
  >(initialStatus);

  const filteredData = data.filter((unit) => {
    if (statusFilter === "occupied") return unit.state;
    if (statusFilter === "vacant") return !unit.state;
    return true;
  });

  return (
    <div>
      <Tabs
        value={statusFilter}
        onValueChange={(val) => setStatusFilter(val as any)}
        className="mb-6"
      >
        <TabsList className="w-full justify-center gap-2 rounded-xl bg-muted p-1 shadow-sm border border-border">
          <TabsTrigger
            value="all"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
          >
            <Building2 className="w-4 h-4" />
            All
          </TabsTrigger>

          <TabsTrigger
            value="occupied"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
          >
            <DoorClosed className="w-4 h-4" />
            Occupied
          </TabsTrigger>

          <TabsTrigger
            value="vacant"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg data-[state=active]:bg-yellow-500 data-[state=active]:text-white data-[state=inactive]:text-muted-foreground"
          >
            <DoorOpen className="w-4 h-4" />
            Vacant
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        data={filteredData}
        columns={columns}
        filters={filters}
        onDelete={onDelete}
        onRowClick={handleRowClick}
        onEditClick={(unit) => {
          if (!unit.state) {
            setSelectedUnit(unit);
            setSheetOpen(true);
          } else {
            toast.error("Only vacant units can be edited.");
          }
        }}
        renderRowDetail={(unit) => (
          <div className="text-sm space-y-3">
            <p>
              <strong>Unit:</strong> {unit.unitNumber}
            </p>
            <p>
              <strong>Tenant:</strong> {unit.tenantName}
            </p>
            <p>
              <strong>Contact:</strong> {unit.tenantTel}
            </p>
            <p>
              <strong>Rent:</strong> KES {unit.rent.toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <Badge
                className={`text-white ${
                  unit.state ? "bg-green-600" : "bg-yellow-500"
                }`}
              >
                {unit.state ? "Occupied" : "Vacant"}
              </Badge>
            </p>
            <p>
              <strong>Move In Date:</strong> {unit.moveInDate}
            </p>
          </div>
        )}
        searchPlaceholder="Search unit..."
        exportFilename="units"
        caption="Showing units"
        emptyLabel="No Units found"
      />

      {selectedUnit && (
        <RowSheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setSelectedUnit(null);
          }}
          title="Edit Unit"
        >
          <RowEditForm
            item={selectedUnit}
            onCancel={() => setSheetOpen(false)}
            onSubmit={async (updated) => {
              try {
                const changes: Partial<typeof updated> = {};

                for (const key of Object.keys(
                  updated
                ) as (keyof typeof updated)[]) {
                  const updatedValue = updated[key];
                  const originalValue = selectedUnit?.[key];

                  if (updatedValue !== originalValue) {
                    changes[key] = updatedValue as any;
                  }
                }

                if (Object.keys(changes).length === 0) {
                  toast.message("No changes to save.");
                  return;
                }

                const payload: Record<string, any> = {
                  id: updated.unitId,
                  ...changes,
                };
                // delete payload["id"]

                if ("unitNumber" in changes) {
                  payload["number"] = changes["unitNumber"];
                  delete payload["unitNumber"];
                } 
                
                if ("rent" in changes) {
                  payload["rentRate"] = changes["rent"];
                  delete payload["rent"];
                } 

                const res = await fetch("/api/units/edit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });


                if (!res.ok) throw new Error("Update failed");

                toast.success("Unit updated successfully.");
                setSheetOpen(false);
                refreshData();
              } catch (err) {
                toast.error("Failed to update unit.");
                console.error(err);
              }
            }}
            fields={[
              { key: "unitNumber", label: "Unit Number" },
              { key: "type", label: "Unit Type" },
              { key: "description", label: "Description" },
              { key: "rent", label: "Rent Rate", type: "number" },
              { key: "deposit", label: "Security Deposit", type: "number" },
              { key: "additional", label: "Additional Charge (descroption)" },
              {
                key: "additionalCharges",
                label: "Additional Charge Amount",
                type: "number",
              },
            ]}
          />
        </RowSheet>
      )}
    </div>
  );
}
