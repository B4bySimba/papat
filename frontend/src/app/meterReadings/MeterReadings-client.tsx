"use client";
import { useAccess } from "@/components/AccessProvider";
import { useState } from "react";
import { SkeletonPage } from "@/components/skeleton/page";
import { MeterReadingsTable } from "./MeterReadingsTable";
import { MeterReading } from "@/lib/meterReadingsSchema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AddMeterReadingInline } from "@/components/forms/add-meter-readings-inline";
import { useServerTable } from "@/hooks/use-server-table";

export default function MeterReadingsPage() {
  const table = useServerTable<MeterReading>("/api/meterReading/get");
  const [showAddModal, setShowAddModal] = useState(false);
  const { can } = useAccess();

  const handleDelete = async (id: string) => {
    try {
      console.log("�️ Deleting transaction:", id);

      const res = await fetch("/api/meterReading/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Delete failed");

      table.refresh();
      toast.success("Transaction deleted successfully.");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction.");
    }
  };

  const handleEditSubmit = async (updated: MeterReading) => {
    function formatDate(date: string | Date): string {
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }); // outputs: 30/07/2025
    }
    
    try {
      const changes: Record<string, any> = {};

      for (const key of Object.keys(updated) as (keyof MeterReading)[]) {
        const updatedValue = updated[key];
        const originalValue = table.rows.find((t) => t.id === updated.id)?.[
          key
        ];
        if (updatedValue !== originalValue) {
          changes[key] = updatedValue;
        }
      }

      if (Object.keys(changes).length === 0) {
        toast.message("No changes to save.");
        return;
      }

      const payload: Record<string, any> = {
        id: updated.id,
        ...changes,
      };

      const res = await fetch("/api/meterReading/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("Transaction updated successfully");

      // Update local state to reflect the edit without refetching
      table.setRows((prev) =>
        prev.map((tx) => {
          if (tx.id !== updated.id) return tx;

          const updatedTx = { ...tx, ...changes };

          if (changes.readOn) {
            updatedTx.readOn = formatDate(changes.readOn);
          }

          return updatedTx;
        })
      );
          } catch (err) {
      console.error(err);
      toast.error("Failed to update transaction.");
    }
  };

  if (!table.loaded) {
    return <SkeletonPage variant="readings" columns={5} />;
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Meter Readings</h1>
        {can("readings.add") && <Button
          onClick={() => setShowAddModal(true)}
          className="ml-auto shrink-0 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer shadow-sm shadow-purple-600/20"
        >
          <Plus strokeWidth={3} />
          Add Meter Reading
        </Button>}
      </div>
      <MeterReadingsTable
        table={table}
        onDelete={handleDelete}
        onSubmitEdit={handleEditSubmit}
      />
      {showAddModal && (
        <AddMeterReadingInline
          onClose={() => {
            setShowAddModal(false);
            table.refresh();
          }}
        />
      )}
    </div>
  );
}
