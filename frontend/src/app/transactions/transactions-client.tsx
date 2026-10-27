"use client";
import { useAccess } from "@/components/AccessProvider";
import { useState } from "react";
import type { Transaction } from "@/lib/transactionSchema";
import { TransactionsTable } from "./TransactionsTable";
import { SkeletonPage } from "@/components/skeleton/page";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { LogPaymentFloating } from "@/components/forms/log-payment-floating";
import { useServerTable } from "@/hooks/use-server-table";

export default function TransactionsPage() {
  const table = useServerTable<Transaction>("/api/payment/transactions");
  const [showAddForm, setShowAddForm] = useState(false);
  const { can } = useAccess();

  const handleDelete = async (id: string) => {
    try {
      console.log("�️ Deleting transaction:", id);

      const res = await fetch("/api/payment/delete", {
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
  
  const handleEditSubmit = async (updated: Transaction) => {
    try {
      const changes: Record<string, any> = {};

      for (const key of Object.keys(updated) as (keyof Transaction)[]) {
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

      const res = await fetch("/api/payment/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("Transaction updated successfully");

      // Update local state to reflect the edit without refetching
      if (changes.date) changes.date = changes.date.split("-").reverse().join("/");
      table.setRows((prev) =>
        prev.map((tx) => (tx.id === updated.id ? { ...tx, ...changes } : tx))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update transaction.");
    }
  };
    

  if (!table.loaded) {
    return <SkeletonPage variant="statement" columns={7} />;
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Transactions</h1>
        {can("payments.add") && <Button
          onClick={() => setShowAddForm(true)}
          className="ml-auto shrink-0 bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer shadow-sm shadow-purple-600/20"
        >
          <Plus strokeWidth={3} />
          Add Payment
        </Button>}
      </div>
      <TransactionsTable
        table={table}
        onDelete={handleDelete}
        onSubmitEdit={handleEditSubmit}
      />
      {showAddForm && (
        <LogPaymentFloating
          onClose={() => {
            setShowAddForm(false);
            table.refresh();
          }}
        />
      )}
    </div>
  );
}
