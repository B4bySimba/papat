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
  currentCharges: number;
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

export default function Ledger({ data, year }: LedgerProps) {
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let carryForward = 0;
    return data.map((entry, index) => {
      const currentCharges = (entry.expected || 0) - (entry.waterCharge || 0) - carryForward;
      const newEntry: LedgerEntry = {
        year: parseInt(year),
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

      // Update carry forward for next month
      carryForward = newEntry.balance;

      return newEntry;
    });
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
    <div className="p-4 space-y-6 max-w-4xl mx-auto print-container h-[400px] overflow-y-auto">
      {transformedData.map((entry, idx) => (
        <Card
          key={idx}
          className="rounded-xl shadow-lg overflow-hidden print-card"
        >
          <CardHeader className="bg-gray-50 p-4 border-b print-card-header">
            <CardTitle className="text-2xl font-bold text-gray-800">
              {entry.month}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Main Financial Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Carry Forward</p>
                <p className="font-semibold text-lg">
                  Ksh.{entry.carryForward.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Charges</p>
                <p className="font-semibold text-lg">
                  Ksh.{entry.currentCharges.toLocaleString()}
                </p>
              </div>
            </div>
            water billage
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
              {entry.usage !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">Usage</p>
                  <p className="font-semibold text-lg">{entry.usage} units</p>
                </div>
              )}
              {entry.waterCharge !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">Water Charge</p>
                  <p className="font-semibold text-lg">
                    Ksh.{entry.waterCharge.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Expected</p>
                <p className="font-semibold text-lg">
                  Ksh.{entry.expected.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collected</p>
                <p className="font-semibold text-lg text-green-600">
                  Ksh.{entry.collected.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`font-bold text-xl ${balanceTone(entry.balance)}`}>
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
                            {new Date(p.date).toLocaleDateString()}
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
