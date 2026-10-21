"use client";

import { useEffect, useState } from "react";
import { DataCardTable } from "@/components/tables/miniTable";
import { ColumnDef } from "@tanstack/react-table";
import { useParams } from "next/navigation";
import { LogPaymentFloating } from "@/components/forms/log-payment-floating";

export type Payment = {
  id: string;
  processed: boolean;
  tenantName: string;
  amount: number;
};

interface RecentPaymentsProps {
  leaseCode: string;
}

export const paymentColumns: ColumnDef<Payment>[] = [
  {
    accessorKey: "processed",
    header: "Status",
    cell: ({ row }) => {
      const processed = row.getValue("processed") as boolean;
      const statusText = processed ? "Processed" : "Pending";
      const colorClass = processed
        ? "bg-green-100 text-green-800"
        : "bg-yellow-100 text-yellow-800";

      return (
        <span
          className={`capitalize text-xs px-2 py-1 rounded-full font-medium ${colorClass}`}
        >
          {statusText}
        </span>
      );
    },
  },
  {
    accessorKey: "tenantName",
    header: "Tenant Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("tenantName")}</div>
    ),
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = Number(row.getValue("amount"));
      const formatted = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];

export default function RecentPayments({ leaseCode }: RecentPaymentsProps) {
  const params = useParams();
  const houseId = params.houseId as string;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!leaseCode) return;

    const fetchPayments = async () => {
      try {
        const res = await fetch(`/api/payment/tenant/${leaseCode}`);
        if (!res.ok) throw new Error("Failed to fetch payments");

        const json = await res.json();
        setPayments(json);
      } catch (error) {
        console.error("Failed to fetch payments", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [leaseCode]);

  return (
    <>
      <DataCardTable
        title="Recent Payments"
        description="A quick summary of latest payments"
        data={payments.slice(0, 5)}
        columns={paymentColumns}
        viewAllLabel="See All Payments"
        viewAllHref="/transactions"
        buttonLabel="Add Payment"
        onButtonClick={() => setShowAddForm(true)}
        loading={loading}
        emptyLabel="No Payments Found"
      />
      {showAddForm && (
        <LogPaymentFloating onClose={() => setShowAddForm(false)} leaseCode={leaseCode}/>
      )}
    </>
  );
}
