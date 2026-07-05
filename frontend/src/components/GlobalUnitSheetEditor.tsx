"use client";

import { RowSheet } from "@/components/tables/rowSheet";
import { RowEditForm } from "@/components/tables/RowEditForm";
import { toast } from "sonner";
import { useUnitEditSheet } from "@/lib/store/useUnitEditsheet";

export function GlobalUnitEditSheet({
  refreshData,
}: {
  refreshData?: () => void;
}) {
  const { open, unit, closeSheet, onSubmit } = useUnitEditSheet();

  if (!unit) return null;

  return (
    <RowSheet
      open={open}
      onOpenChange={(val) => !val && closeSheet()}
      title="Edit Unit"
    >
      <RowEditForm
        item={unit}
        onCancel={closeSheet}
        onSubmit={async (updated) => {
          if (onSubmit) {
            await onSubmit(updated); // � Call the custom handler if it exists
            closeSheet();
            return;
          }

          // Default handler
          const changes: Record<string, any> = {};
          for (const key of Object.keys(updated)) {
            if (updated[key] !== unit[key]) {
              changes[key] = updated[key];
            }
          }

          if (Object.keys(changes).length === 0) {
            toast("No changes to save.");
            return;
          }

          const payload: Record<string, any> = { id: updated.unitId };

          if ("unitNumber" in changes) {
            payload["number"] = changes["unitNumber"];
            delete changes["unitNumber"];
          }

          if ("rent" in changes) {
            payload["rentRate"] = changes["rent"];
            delete changes["rent"];
          }

          Object.assign(payload, changes);

          try {
            const res = await fetch("/api/units/edit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Update failed");

            toast.success("Unit updated.");
            closeSheet();
            if (refreshData) refreshData();
            else location.reload();
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
          { key: "additional", label: "Additional Charge (description)" },
          {
            key: "additionalCharges",
            label: "Additional Charge Amount",
            type: "number",
          },
        ]}
      />
    </RowSheet>
  );
}
  