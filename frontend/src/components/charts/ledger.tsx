"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Printer, View } from "lucide-react";
import { useMemo } from "react";
import { balanceTone, formatBalance } from "@/lib/utils";

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
  rentCharged: number;
  currentCharges: number;
  transfer: number;
  transferNote: string | null;
  depositLines: { label: string; amount: number }[];
  expected: number;
  collected: number;
  balance: number;
  usage?: number;
  waterCharge?: number;
  extraCharges?: Record<string, any>;
  payments: Payment[];
}

interface LedgerProps {
  data: any[];
  year: string;
}

const sumOf = (lines?: { amount: number }[]) => (lines ?? []).reduce((sum, l) => sum + l.amount, 0);

export default function Ledger({ data, year }: LedgerProps) {
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // From the backend, so January carries December's balance in instead of restarting at 0.
    return data.map((entry): LedgerEntry => ({
      year: parseInt(year),
      month: entry.month,
      carryForward: entry.carryForward || 0,
      rentCharged: entry.rentCharged || 0,
      currentCharges: (entry.currentCharges || 0) - (entry.transfer || 0) - sumOf(entry.depositLines),
      transfer: entry.transfer || 0,
      transferNote: entry.transferNote ?? null,
      depositLines: entry.depositLines || [],
      expected: entry.expected,
      collected: entry.collected || 0,
      balance: entry.balance || 0,
      usage: entry.usage,
      waterCharge: entry.waterCharge,
      extraCharges: entry.extraCharges || {},
      payments: entry.payments || [],
    }));
  }, [data, year]);

  const handlePrint = () => {
    window.print();
  };

  if (transformedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No ledger data available
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto print-container sm:space-y-4 md:h-[440px] md:overflow-y-auto md:p-1 md:pr-2">
      {transformedData.map((entry, idx) => (
        <Card
          key={idx}
          className="gap-0 py-0 rounded-xl shadow-xs overflow-hidden print-card"
        >
          <CardHeader className="bg-gray-50 px-4 py-3 border-b print-card-header sm:px-6 [.border-b]:pb-3">
            <CardTitle className="text-base font-bold text-gray-800 sm:text-lg">
              {entry.month}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 sm:p-6 sm:space-y-5">
            {/* Main Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 sm:gap-x-8 sm:gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Carry Forward</p>
                <p className="font-semibold text-base tabular-nums sm:text-lg">
                  Ksh.{entry.carryForward.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Rent</p>
                <p className="font-semibold text-base tabular-nums sm:text-lg">
                  {entry.rentCharged ? `Ksh.${entry.rentCharged.toLocaleString()}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Current Charges</p>
                <p className="font-semibold text-base tabular-nums sm:text-lg">
                  Ksh.{entry.currentCharges.toLocaleString()}
                </p>
              </div>
              {entry.transfer !== 0 && (
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">{entry.transferNote ?? "Transfer"}</p>
                  <p className="font-semibold text-base tabular-nums sm:text-lg">
                    Ksh.{entry.transfer.toLocaleString()}
                  </p>
                </div>
              )}
              {entry.depositLines.map((line) => (
                <div key={line.label}>
                  <p className="text-xs text-muted-foreground sm:text-sm">{line.label}</p>
                  <p className="font-semibold text-base tabular-nums sm:text-lg">
                    Ksh.{line.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Water billage</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 sm:gap-x-8 sm:gap-y-4">
              {entry.usage !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">Usage</p>
                  <p className="font-semibold text-base tabular-nums sm:text-lg">{entry.usage} units</p>
                </div>
              )}
              {entry.waterCharge !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">Water Charge</p>
                  <p className="font-semibold text-base tabular-nums sm:text-lg">
                    Ksh.{entry.waterCharge.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3 sm:gap-x-8 sm:gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Expected</p>
                <p className="font-semibold text-base tabular-nums sm:text-lg">
                  Ksh.{entry.expected.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Collected</p>
                <p className="font-semibold text-base tabular-nums text-green-600 sm:text-lg">
                  Ksh.{entry.collected.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Balance</p>
                <p className={`font-bold text-lg tabular-nums sm:text-xl ${balanceTone(entry.balance)}`}>
                  {formatBalance(entry.balance)}
                </p>
              </div>
            </div>

            {/* Payments Section */}
            {entry.payments.length > 0 && (
              <Collapsible className="w-full">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-50 rounded-md border text-left font-medium text-gray-700 hover:bg-gray-100 transition-colors print-collapsible-trigger">
                  <h3 className="text-base">
                    Payments ({entry.payments.length})
                  </h3>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 overflow-x-auto print-collapsible-content">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Date</TableHead>
                        <TableHead className="min-w-[100px]">Amount</TableHead>
                        <TableHead className="min-w-[120px]">Method</TableHead>
                        <TableHead className="min-w-[180px]">
                          Reference
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entry.payments.map((p: Payment, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {new Date(p.date).toLocaleDateString("en-GB")}
                          </TableCell>
                          <TableCell>Ksh.{p.amount.toLocaleString()}</TableCell>
                          <TableCell className="capitalize">
                            {p.method.replace("-", " ")}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.reference}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
