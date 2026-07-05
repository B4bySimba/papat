"use client";
import { useState, useEffect } from "react";
import type { Transaction } from "@/lib/transactionSchema";
import { TransactionsTable } from "./TransactionsTable";
import { SkeletonPage } from "@/components/skeleton/page";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogPaymentFloating } from "@/components/forms/log-payment-floating";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);


  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/payment/transactions");
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

      const res = await fetch("/api/payment/delete", {
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
  
  const handleEditSubmit = async (updated: Transaction) => {
    try {
      const changes: Record<string, any> = {};

      for (const key of Object.keys(updated) as (keyof Transaction)[]) {
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

      const res = await fetch("/api/payment/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("Transaction updated successfully");

      // Update local state to reflect the edit without refetching
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === updated.id ? { ...tx, ...changes } : tx))
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
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button
          onClick={() => setShowAddForm(true)}
          className="ml-auto bg-purple-600 hover:bg-purple-700 text-white border-purple-600 hover:border-purple-700 cursor-pointer"
        >
          Add Payment
        </Button>
      </div>
      <TransactionsTable
        data={transactions}
        onDelete={handleDelete}
        onSubmitEdit={handleEditSubmit}
      />
      {showAddForm && (
        <LogPaymentFloating onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
