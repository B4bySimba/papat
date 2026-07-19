"use client";
import { useState, useEffect } from "react";
import { SkeletonPage } from "@/components/skeleton/page";
import { MeterReadingsTable } from "./MeterReadingsTable";
import { MeterReading } from "@/lib/meterReadingsSchema";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AddMeterReadingInline } from "@/components/forms/add-meter-readings-inline";

export default function MeterReadingsPage() {
  const [transactions, setTransactions] = useState<MeterReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`/api/meterReading/get`);
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      console.log("�️ Deleting transaction:", id);

      const res = await fetch("/api/meterReading/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Delete failed");

      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      toast.success("Transaction deleted successfully.");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction.");
    }
  };

  const refreshTransactions = async () => {
    try {
      const response = await fetch(`/api/meterReading/get`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleEditSubmit = async (updated: MeterReading) => {
    function formatDate(date: string | Date): string {
      const d = new Date(date);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }); // outputs: 30 Jul 2025
    }
    
    try {
      const changes: Record<string, any> = {};

      for (const key of Object.keys(updated) as (keyof MeterReading)[]) {
        const updatedValue = updated[key];
        const originalValue = transactions.find((t) => t.id === updated.id)?.[
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
      setTransactions((prev) =>
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

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-bold">Meter Readings</h1>
        <Button
          onClick={() => setShowAddModal(true)}
          className="ml-auto bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer"
        >
          Add Meter Reading
        </Button>
      </div>
      <MeterReadingsTable
        data={transactions}
        onDelete={handleDelete}
        onSubmitEdit={handleEditSubmit}
      />
      {showAddModal && (
        <AddMeterReadingInline
          onClose={() => {
            setShowAddModal(false);
            refreshTransactions();
          }}
        />
      )}
    </div>
  );
}
