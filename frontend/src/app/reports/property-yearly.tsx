"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

// Define the actual data structure from your API
interface MonthlyData {
  month: string;
  collected: number;
}

interface PropertyYearlyData {
  unitNumber: string;
  rentRate: number;
  year: number;
  months: MonthlyData[];
  totalExpected: number;
  totalCollected: number;
  totalBalance: number;
}

interface PropertyYearlyProps {
  data: PropertyYearlyData[];
  propertyName: string;
  year: string;
  period: string;
  onBack: () => void;
  includePastTenantsData?: boolean;
  selectedUnits?: string[];
  isLoading?: boolean;
}

export function PropertyYearly({
  data,
  propertyName,
  year,
  period,
  onBack,
  includePastTenantsData = false,
  selectedUnits = [],
  isLoading = false,
}: PropertyYearlyProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(value);
  };

  // Transform and validate data to match component expectations
  const transformedData = useMemo(() => {
    if (!Array.isArray(data)) {
      console.warn("Invalid data format received");
      return [];
    }

    // Filter data based on selected units
    let filteredData = data;
    if (
      selectedUnits &&
      selectedUnits.length > 0 &&
      !selectedUnits.includes("all")
    ) {
      filteredData = data.filter((item) =>
        selectedUnits.includes(item.unitNumber)
      );
    }

    // Transform data to match the component's expected structure
    return filteredData.map((item) => ({
      unitName: item.unitNumber,
      rate: item.rentRate,
      expected: item.totalExpected,
      months: item.months.reduce((acc, monthData) => {
        acc[monthData.month] = monthData.collected;
        return acc;
      }, {} as { [month: string]: number }),
      total: item.totalCollected,
      balance: item.totalBalance,
    }));
  }, [data, selectedUnits]);

  // Get all unique months from the data
  const allMonths = useMemo(() => {
    const months = new Set<string>();
    transformedData.forEach((item) => {
      Object.keys(item.months).forEach((month) => months.add(month));
    });
    return Array.from(months).sort((a, b) => {
      const monthOrder = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return monthOrder.indexOf(a) - monthOrder.indexOf(b);
    });
  }, [transformedData]);

  // Calculate totals for each column
  const totals = useMemo(() => {
    const monthlyTotals: { [month: string]: number } = {};

    // Initialize monthly totals
    allMonths.forEach((month) => {
      monthlyTotals[month] = 0;
    });

    const result = transformedData.reduce(
      (acc, item) => {
        acc.rate += item.rate;
        acc.expected += item.expected;
        acc.total += item.total;
        acc.balance += item.balance;

        // Add monthly values
        Object.entries(item.months).forEach(([month, amount]) => {
          monthlyTotals[month] = (monthlyTotals[month] || 0) + amount;
        });

        return acc;
      },
      { rate: 0, expected: 0, total: 0, balance: 0, months: monthlyTotals }
    );

    return { ...result, months: monthlyTotals };
  }, [transformedData, allMonths]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-full mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (transformedData.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-full mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{propertyName}</h1>
              <p className="text-muted-foreground">
                Yearly Report - {year} {period !== "All Year" && `(${period})`}
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No data available for the selected period
              </p>
              <Button variant="outline" onClick={onBack} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isFiltered =
    selectedUnits && selectedUnits.length > 0 && !selectedUnits.includes("all");
  const reportTitle = `${propertyName} - Yearly Report - ${year}${
    period !== "All Year" ? ` (${period})` : ""
  }${includePastTenantsData ? " (Including Past Tenants)" : ""}${
    isFiltered ? ` (${transformedData.length} units)` : ""
  }`;

  const downloadCSV = () => {
    try {
      const headers = [
        "Unit",
        "Rate",
        "Expected",
        ...allMonths,
        "Total Collected",
        "Balance",
      ];

      const rows = transformedData.map((row) => [
        row.unitName,
        row.rate,
        row.expected,
        ...allMonths.map((month) => row.months[month] || 0),
        row.total,
        row.balance,
      ]);

      const totalRow = [
        "TOTAL",
        totals.rate,
        totals.expected,
        ...allMonths.map((month) => totals.months[month] || 0),
        totals.total,
        totals.balance,
      ];

      const csvContent = [[reportTitle], [], headers, ...rows, totalRow]
        .map((row) => {
          return Array.isArray(row) ? row.map(String).join(",") : row;
        })
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${propertyName.replace(/\s+/g, "-")}-${year}${
        includePastTenantsData ? "-with-past-tenants" : ""
      }${isFiltered ? "-filtered" : ""}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("CSV file downloaded successfully");
    } catch (error) {
      console.error("Failed to download CSV:", error);
      toast.error("Failed to download CSV file");
    }
  };

  const downloadPDF = () => {
    try {
      const printContent = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { margin-bottom: 5px; font-size: 24px; color: #1a1a1a; }
            .subtitle { color: #666; margin-bottom: 20px; font-size: 14px; }
            .period { color: #888; font-size: 12px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            th { background-color: #f3f4f6; padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background-color: #f3f4f6; }
            .summary { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 4px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 10px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
            .rate { color: #1a1a1a; }
            .expected { color: #1a1a1a; }
            .collected { color: #059669; }
            .balance { color: #dc2626; }
            @media print { 
              body { padding: 10px; } 
              table { font-size: 10px; }
              th, td { padding: 6px; }
            }
          </style>
        </head>
        <body>
          <h1>${propertyName}</h1>
          <p class="subtitle">Yearly Report - ${year}</p>
          ${
            period !== "All Year"
              ? `<p class="period">Period: ${period}</p>`
              : ""
          }
          ${
            includePastTenantsData
              ? '<p class="period">Including Past Tenants Data</p>'
              : ""
          }
          ${
            isFiltered
              ? `<p class="period">Filtered: ${transformedData.length} units</p>`
              : ""
          }
          
          <div class="summary">
            <h3>Summary</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div>Total Rate</div>
                <div class="summary-value rate">${formatCurrency(
                  totals.rate
                )}</div>
              </div>
              <div class="summary-item">
                <div>Total Expected</div>
                <div class="summary-value expected">${formatCurrency(
                  totals.expected
                )}</div>
              </div>
              <div class="summary-item">
                <div>Total Collected</div>
                <div class="summary-value collected">${formatCurrency(
                  totals.total
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
                <th>Unit</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Expected</th>
                ${allMonths
                  .map((month) => `<th class="text-right">${month}</th>`)
                  .join("")}
                <th class="text-right">Total Collected</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transformedData
                .map(
                  (row) => `
                <tr>
                  <td>${row.unitName}</td>
                  <td class="text-right">${formatCurrency(row.rate)}</td>
                  <td class="text-right">${formatCurrency(row.expected)}</td>
                  ${allMonths
                    .map(
                      (month) =>
                        `<td class="text-right">${formatCurrency(
                          row.months[month] || 0
                        )}</td>`
                    )
                    .join("")}
                  <td class="text-right">${formatCurrency(row.total)}</td>
                  <td class="text-right">${formatCurrency(row.balance)}</td>
                </tr>
              `
                )
                .join("")}
              <tr class="total-row">
                <td>TOTAL</td>
                <td class="text-right">${formatCurrency(totals.rate)}</td>
                <td class="text-right">${formatCurrency(totals.expected)}</td>
                ${allMonths
                  .map(
                    (month) =>
                      `<td class="text-right">${formatCurrency(
                        totals.months[month] || 0
                      )}</td>`
                  )
                  .join("")}
                <td class="text-right">${formatCurrency(totals.total)}</td>
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

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Please allow pop-ups for PDF download");
        return;
      }

      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open("", "", "height=600,width=1200");
      if (!printWindow) {
        toast.error("Could not open print window");
        return;
      }

      const tableHTML = `
        <html>
          <head>
            <title>${reportTitle}</title>
            <style>px; font-size: 20px; }
              .subtitle { color: #666; margin-bottom: 15px; font-size: 12px; }
              .period { color: #888; font-size: 11px; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { background-color: #f3f4f6; padding: 6px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
              td { padding: 6px; border: 1px solid #ddd; }
              .text-right { t
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
              h1 { margin-bottom: 5ext-align: right; }
              .total-row { font-weight: bold; background-color: #f3f4f6; }
              @media print { 
                body { padding: 10px; font-size: 10px; } 
                th, td { padding: 4px; }
              }
            </style>
          </head>
          <body onload="window.print()">
            <h1>${propertyName}</h1>
            <p class="subtitle">Yearly Report - ${year}</p>
            ${
              period !== "All Year"
                ? `<p class="period">Period: ${period}</p>`
                : ""
            }
            ${
              includePastTenantsData
                ? '<p class="period">Including Past Tenants Data</p>'
                : ""
            }
            ${
              isFiltered
                ? `<p class="period">Filtered: ${transformedData.length} units</p>`
                : ""
            }
            <table>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Expected</th>
                  ${allMonths
                    .map((month) => `<th class="text-right">${month}</th>`)
                    .join("")}
                  <th class="text-right">Total Collected</th>
                  <th class="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                ${transformedData
                  .map(
                    (row) => `
                  <tr>
                    <td>${row.unitName}</td>
                    <td class="text-right">${formatCurrency(row.rate)}</td>
                    <td class="text-right">${formatCurrency(row.expected)}</td>
                    ${allMonths
                      .map(
                        (month) =>
                          `<td class="text-right">${formatCurrency(
                            row.months[month] || 0
                          )}</td>`
                      )
                      .join("")}
                    <td class="text-right">${formatCurrency(row.total)}</td>
                    <td class="text-right">${formatCurrency(row.balance)}</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr class="total-row">
                  <td>TOTAL</td>
                  <td class="text-right">${formatCurrency(totals.rate)}</td>
                  <td class="text-right">${formatCurrency(totals.expected)}</td>
                  ${allMonths
                    .map(
                      (month) =>
                        `<td class="text-right">${formatCurrency(
                          totals.months[month] || 0
                        )}</td>`
                    )
                    .join("")}
                  <td class="text-right">${formatCurrency(totals.total)}</td>
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

        // Try using onafterprint event
        printWindow.onafterprint = closeWindow;

        setTimeout(closeWindow, 5);
      };
    } catch (error) {
      console.error("Failed to print:", error);
      toast.error("Failed to open print window");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div id="report-content" className="max-w-full mx-auto space-y-6">
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
                Yearly Report - {year}
                {period !== "All Year" && (
                  <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {period}
                  </span>
                )}
                {includePastTenantsData && (
                  <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    Including Past Tenants
                  </span>
                )}
                {isFiltered && (
                  <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                    {transformedData.length} units selected
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
            <CardTitle>Yearly Units Summary</CardTitle>
            <CardDescription>
              Breakdown of rates, expected, monthly collections, total
              collected, and balance for each unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    {allMonths.map((month) => (
                      <TableHead key={month} className="text-right">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">
                      Total Collected
                    </TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transformedData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {row.unitName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.expected)}
                      </TableCell>
                      {allMonths.map((month) => (
                        <TableCell
                          key={month}
                          className="text-right text-green-600 font-medium"
                        >
                          {formatCurrency(row.months[month] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        {formatCurrency(row.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold bg-muted/50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.rate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totals.expected)}
                    </TableCell>
                    {allMonths.map((month) => (
                      <TableCell
                        key={month}
                        className="text-right text-green-600"
                      >
                        {formatCurrency(totals.months[month] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(totals.total)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(totals.balance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.rate)}
              </div>
            </CardContent>
          </Card>
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
                {formatCurrency(totals.total)}
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
