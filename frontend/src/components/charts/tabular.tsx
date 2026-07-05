"use client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface Payment {
  date: string;
  amount: number;
  method: string;
  reference: string;
}

interface LedgerEntry {
  year: number;
  month: string;
  carryForward: number;
  currentCharges: number;
  expected: number;
  collected: number;
  balance: number;
  usage?: number;
  waterCharge?: number;
  extraCharges?: Record<string, any>;
  payments: Payment[];
}

interface LedgerModalProps {
  name: string;
  data: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LedgerModal({
  name,
  data,
  open,
  onOpenChange,
}: LedgerModalProps) {
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let carryForward = 0;
    return data.map((entry) => {
      const currentCharges =
        (entry.expected || 0) - (entry.waterCharge || 0) - carryForward;
      const newEntry: LedgerEntry = {
        year: entry.year,
        month: entry.month,
        carryForward,
        currentCharges,
        expected: entry.expected,
        collected: entry.collected || 0,
        balance: entry.balance || 0,
        usage: entry.usage,
        waterCharge: entry.waterCharge,
        extraCharges: entry.extraCharges || {},
        payments: entry.payments || [],
      };

      carryForward = newEntry.balance;
      return newEntry;
    });
  }, [data]);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl h-[90vh] flex flex-col overflow-y-scroll">
        <div ref={printRef}>
          <DialogHeader>
            <DialogTitle>{name}'s Ledger (Tabular View)</DialogTitle>
            <DialogDescription>
              Complete payment history in tabular format
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-end mb-4">
              <Button
                onClick={handlePrint}
                className="flex items-center gap-2 print:hidden"
              >
                <Printer className="h-4 w-4" />
                Print Ledger
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-1">
              {transformedData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No ledger data available
                </div>
              ) : (
                <Table className="border">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-[120px]">Month/Year</TableHead>
                      <TableHead>Carry Forward</TableHead>
                      <TableHead>Current Charges</TableHead>
                      <TableHead>Water Usage</TableHead>
                      <TableHead>Water Charge</TableHead>
                      <TableHead>Total Expected</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Payments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformedData.map((entry, idx) => (
                      <TableRow
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <TableCell className="font-medium">
                          {entry.month} {entry.year}
                        </TableCell>
                        <TableCell>
                          Ksh.{entry.carryForward.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          Ksh.{entry.currentCharges.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {entry.usage || "-"} {entry.usage ? "units" : ""}
                        </TableCell>
                        <TableCell>
                          {entry.waterCharge
                            ? `Ksh.${entry.waterCharge.toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          Ksh.{entry.expected.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-green-600">
                          Ksh.{entry.collected.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            entry.balance > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          Ksh.{Math.abs(entry.balance).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {entry.payments.length > 0 ? (
                            <Table className="border">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-8">Date</TableHead>
                                  <TableHead className="h-8">Amount</TableHead>
                                  <TableHead className="h-8">
                                    Reference
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {entry.payments.map((payment, i) => (
                                  <TableRow
                                    key={i}
                                    className={
                                      i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                    }
                                  >
                                    <TableCell className="py-1 px-2 text-sm">
                                      {new Date(
                                        payment.date
                                      ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm">
                                      Ksh.{payment.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm text-muted-foreground">
                                      {payment.reference}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <span className="text-muted-foreground">
                              No payments
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
