"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";


interface PropertyMonthlyData {
  unitName: string;
  expected: number;
  collected: number;
  balance: number;
}

interface PropertyMonthlyProps {
  data: PropertyMonthlyData[];
  propertyName: string;
  month: string;
  year: string;
  onBack: () => void;
  includePastTenantsData?: boolean;
  selectedUnits?: string[];
}

export function PropertyMonthly({
  data,
  propertyName,
  month,
  year,
  onBack,
  includePastTenantsData = false,
  selectedUnits = [],
}: PropertyMonthlyProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(value);
  };

  const filteredData = useMemo(() => {
    if (!selectedUnits || selectedUnits.length === 0) {
      return data;
    }

    return data.filter(
      (item) =>
        selectedUnits.includes(item.unitName) || selectedUnits.includes("all")
    );
  }, [data, selectedUnits]);


  const totals = {
    expected: filteredData.reduce((sum, item) => sum + item.expected, 0),
    collected: filteredData.reduce((sum, item) => sum + item.collected, 0),
    balance: filteredData.reduce((sum, item) => sum + item.balance, 0),
  };

  const isFiltered =
    selectedUnits && selectedUnits.length > 0 && !selectedUnits.includes("all");
  const reportTitle = `${propertyName} - Monthly Report - ${month} ${year}${
    includePastTenantsData ? " (Including Past Tenants)" : ""
  }${isFiltered ? ` (${filteredData.length} units)` : ""}`;

  const downloadCSV = () => {
    const headers = ["Unit Name", "Expected", "Collected", "Balance"];
    const rows = filteredData.map((row) => [
      row.unitName,
      row.expected,
      row.collected,
      row.balance,
    ]);
    const totalRow = [
      "TOTAL",
      totals.expected,
      totals.collected,
      totals.balance,
    ];

    const csvContent = [[reportTitle], [], [headers], ...rows, [totalRow]]
      .map((row) => {
        return Array.isArray(row) ? row.map(String).join(",") : row;
      })
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${propertyName}-${month}-${year}${
      includePastTenantsData ? "-with-past-tenants" : ""
    }${isFiltered ? "-filtered" : ""}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    // Create a print-friendly version of the content
    const printContent = `
    <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { margin-bottom: 5px; font-size: 24px; color: #1a1a1a; }
          .subtitle { color: #666; margin-bottom: 20px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
          td { padding: 12px; border: 1px solid #ddd; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f3f4f6; }
          .summary { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 4px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .expected { color: #1a1a1a; }
          .collected { color: #059669; }
          .balance { color: #dc2626; }
        </style>
      </head>
      <body>
        <h1>${propertyName}</h1>
        <p class="subtitle">Monthly Report - ${month} ${year} ${
      includePastTenantsData ? " (Including Past Tenants)" : ""
    }</p>
        
        <div class="summary">
          <h3>Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div>Total Expected</div>
              <div class="summary-value expected">${formatCurrency(
                totals.expected
              )}</div>
            </div>
            <div class="summary-item">
              <div>Total Collected</div>
              <div class="summary-value collected">${formatCurrency(
                totals.collected
              )}</div>
            </div>
            <div class="summary-item">
              <div>Total Balance</div>
              <div class="summary-value balance">${formatCurrency(
                totals.balance
              )}</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Unit Name</th>
              <th class="text-right">Expected</th>
              <th class="text-right">Collected</th>
              <th class="text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData
              .map(
                (row) => `
              <tr>
                <td>${row.unitName}</td>
                <td class="text-right">${formatCurrency(row.expected)}</td>
                <td class="text-right">${formatCurrency(row.collected)}</td>
                <td class="text-right">${formatCurrency(row.balance)}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td>TOTAL</td>
              <td class="text-right">${formatCurrency(totals.expected)}</td>
              <td class="text-right">${formatCurrency(totals.collected)}</td>
              <td class="text-right">${formatCurrency(totals.balance)}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </body>
    </html>
  `;

    // Create a new window for printing/download
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.message("Please allow pop-ups for PDF download");
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then trigger print as PDF
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Note: The actual PDF download depends on the user's print settings
        // They need to choose "Save as PDF" in the print dialog
      }, 250);
    };
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=600,width=900");
    if (!printWindow) return;

    const tableHTML = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { margin-bottom: 5px; font-size: 24px; }
            .subtitle { color: #666; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background-color: #f3f4f6; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 12px; border: 1px solid #ddd; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f3f4f6; }
            @media print { body { padding: 0; } a { color: inherit; } }
          </style>
        </head>
        <body onload="window.print()">
          <h1>${propertyName}</h1>
          <p class="subtitle">Monthly Report - ${month} ${year} ${
      includePastTenantsData ? " (Including Past Tenants)" : ""
    }</p>
          <table>
            <thead>
              <tr>
                <th>Unit Name</th>
                <th class="text-right">Expected</th>
                <th class="text-right">Collected</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData
                .map(
                  (row) => `
                <tr>
                  <td>${row.unitName}</td>
                  <td class="text-right">${formatCurrency(row.expected)}</td>
                  <td class="text-right">${formatCurrency(row.collected)}</td>
                  <td class="text-right">${formatCurrency(row.balance)}</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td>TOTAL</td>
                <td class="text-right">${formatCurrency(totals.expected)}</td>
                <td class="text-right">${formatCurrency(totals.collected)}</td>
                <td class="text-right">${formatCurrency(totals.balance)}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(tableHTML);
    printWindow.document.close();

    const closeWindow = () => {
      if (!printWindow.closed) {
        printWindow.close();
      }
    };

    printWindow.onload = () => {
      printWindow.print();

      printWindow.onafterprint = closeWindow;

      setTimeout(closeWindow, 5);
    };
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div id="report-content" className="max-w-4xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="h-10 w-10 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{propertyName}</h1>
              <p className="text-muted-foreground">
                Monthly Report - {month} {year}
                {includePastTenantsData && ( // Add indicator in the UI
                  <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Including Past Tenants
                  </span>
                )}
                {isFiltered && (
                  <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {filteredData.length} units selected
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadCSV}
              title="Download as CSV"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPDF}
              title="Download as PDF"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              title="Print report"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Units Summary</CardTitle>
            <CardDescription>
              Breakdown of expected, collected, and balance for each unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit Name</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {row.unitName}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.expected)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(row.collected)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600 font-medium">
                      {formatCurrency(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold bg-muted/50">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.expected)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(totals.collected)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {formatCurrency(totals.balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Expected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.expected)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.collected)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.balance)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
