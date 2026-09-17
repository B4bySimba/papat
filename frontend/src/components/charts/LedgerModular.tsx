"use client"
import { Button } from "@/components/ui/button"
import { ChevronDown, LayoutGrid, Printer, TableIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { useMemo, useRef, useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { balanceTone, formatBalance } from "@/lib/utils"

interface Payment {
  date: string
  amount: number
  method: string
  reference: string
}

interface LedgerEntry {
  year: number
  month: string
  carryForward: number
  currentCharges: number
  expected: number
  collected: number
  balance: number
  usage?: number
  waterCharge?: number
  extraCharges?: Record<string, any>
  payments: Payment[]
}

interface LedgerModalProps {
  name: string
  data: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LedgerModal({ name, data, open, onOpenChange }: LedgerModalProps) {
  const [viewMode, setViewMode] = useState<"card" | "table">("card")
  const printRef = useRef<HTMLDivElement>(null)

  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return []

    let carryForward = 0
    return data.map((entry) => {
      const currentCharges = (entry.expected || 0) - (entry.waterCharge || 0) - carryForward
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
      }

      carryForward = newEntry.balance
      return newEntry
    })
  }, [data])

const handlePrint = async () => {
  if (!printRef.current) return;
  const sourceNode = printRef.current;

  const originalHeight = sourceNode.style.height;
  sourceNode.style.height = "auto";

  // Deep clone visible content
  const clone = sourceNode.cloneNode(true) as HTMLElement;

  // Remove script tags in clone (safety)
  clone.querySelectorAll("script").forEach((s) => s.remove());

  // Helper: get computed styles and apply as inline styles
  const applyComputedStyles = (el: Element) => {
    try {
      const cs = window.getComputedStyle(el as Element);
      let cssText = "";
      for (let i = 0; i < cs.length; i++) {
        const prop = cs[i];
        // Skip browser-only or problematic properties if desired (optional)
        const val = cs.getPropertyValue(prop);
        cssText += `${prop}:${val};`;
      }

      // Force printable safe properties
      cssText +=
        "visibility:visible !important;opacity:1 !important;transform:none !important;filter:none !important;position:static !important;overflow:visible !important;";

      // Apply inline style
      (el as HTMLElement).setAttribute("style", cssText);
    } catch (err) {
      // ignore nodes that can't be styled (SVG root, etc.)
    }
  };

  // Walk tree and inline computed styles
  const walker = document.createTreeWalker(
    clone,
    NodeFilter.SHOW_ELEMENT,
    null
  );
  // Also apply to root
  applyComputedStyles(clone);
  let node = walker.nextNode();
  while (node) {
    applyComputedStyles(node as Element);
    node = walker.nextNode();
  }

  // Also ensure fonts / head resources exist: copy link[rel=stylesheet] and style tags from original head
  const headClone = document.createElement("head");
  // copy links
  Array.from(
    document.querySelectorAll(
      'link[rel="stylesheet"], link[rel="preload"][as="font"]'
    )
  ).forEach((l) => {
    headClone.appendChild(l.cloneNode(true));
  });
  // copy style tags (some Tailwind injected styles)
  Array.from(document.querySelectorAll("style")).forEach((s) => {
    headClone.appendChild(s.cloneNode(true));
  });

  // Add a print-specific style to ensure page sizing and remove any remaining problems
  const overrideStyle = document.createElement("style");
  overrideStyle.innerHTML = `
  @page { size: A4 landscape; margin: 0.5cm; }
  html, body {
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  forced-color-adjust: none !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    overflow: visible !important;
  }
    * {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
  forced-color-adjust: none !important;
  color-adjust: exact !important;
}

[class*="text-red-"] { color: #dc2626 !important; }
  [class*="text-green-"] { color: #16a34a !important; }
  [class*="text-blue-"] { color: #2563eb !important; }
  [class*="text-gray-"] { color: #4b5563 !important; }
  [class*="bg-gray-50"] { background-color: #f9fafb !important; }
  [class*="bg-gray-100"] { background-color: #f3f4f6 !important; }
  [class*="bg-gray-200"] { background-color: #e5e7eb !important; }
  [class*="bg-white"] { background-color: #ffffff !important; }

  /* Remove blank pages caused by flex + vh */
  .flex, .flex-col {
    display: block !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
  }

  /* Hide print:hidden and no-print elements */
  .print\\:hidden, .no-print {
    display: none !important;
    visibility: hidden !important;
  }

  .overflow-y-scroll, .overflow-y-auto {
    overflow: visible !important;
  }

  .h-\\[90vh\\], [class*="h-[90vh]"], [style*="90vh"] {
    height: auto !important;
    max-height: none !important;
  }

  /* Allow tables and cards to break cleanly between pages */
  div, section, main, article, table, tr, td {
    page-break-before: auto !important;
    page-break-after: auto !important;
    page-break-inside: auto !important;
  }

  /* Fix trailing white space (prevents ghost last page) */
  body::after {
    content: "" !important;
    display: block !important;
    height: 0 !important;
    margin: 0 !important;
    page-break-after: avoid !important;
  }

  * {
    break-inside: auto !important;
    box-sizing: border-box !important;
  }
`;

  headClone.appendChild(overrideStyle);

  // Build a minimal HTML document
  const html = document.implementation.createHTMLDocument("");
  // append our head clone contents
  headClone.childNodes.forEach((n) => html.head.appendChild(n.cloneNode(true)));
  // build a body wrapper to keep margins consistent
  const bodyWrapper = html.createElement("div");
  bodyWrapper.setAttribute(
    "style",
    "box-sizing:border-box;padding:12px;background:white;"
  );
  bodyWrapper.appendChild(clone);
  html.body.appendChild(bodyWrapper);

  // Open print window and write the serialized HTML
  const printWindow = window.open("", "_blank", "width=1000,height=800");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write("<!doctype html>\n");
  printWindow.document.write("<html>");
  printWindow.document.write(html.head.outerHTML);
  printWindow.document.write("<body>");
  printWindow.document.write(bodyWrapper.outerHTML);
  printWindow.document.write("</body></html>");
  sourceNode.style.height = originalHeight;

  printWindow.document.close();

  // Wait for resources/fonts to load (safest approach)
  const waitForLoad = () =>
    new Promise<void>((resolve) => {
      // resolve on load OR after timeout
      let resolved = false;
      const finalize = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      printWindow.addEventListener("load", finalize, { once: true });
      // safety timeout — adjust as needed; needed because some injected styles don't trigger load
      setTimeout(finalize, 700);
    });

  await waitForLoad();

  // Give browser a final tick to layout
  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (e) {
      // If print fails, still close window after a short delay
      setTimeout(() => printWindow.close(), 500);
    }
  }, 150);
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-6xl h-[90vh] flex flex-col overflow-y-scroll">
        <div ref={printRef}>
          <DialogHeader>
            <DialogTitle>{name}'s Ledger</DialogTitle>
            <DialogDescription>Complete payment history and financial records</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === "card" ? "table" : "card")}
                className="flex items-center gap-2 print:hidden no-print"
              >
                {viewMode === "card" ? (
                  <>
                    <TableIcon className="h-4 w-4" />
                    Tabular View
                  </>
                ) : (
                  <>
                    <LayoutGrid className="h-4 w-4" />
                    Card View
                  </>
                )}
              </Button>
              <Button onClick={handlePrint} className="flex items-center gap-2 print:hidden no-print">
                <Printer className="h-4 w-4" />
                Print Ledger
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-1">
              {transformedData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No ledger data available
                </div>
              ) : viewMode === "card" ? (
                <div className="space-y-6">
                  {transformedData.map((entry, idx) => (
                    <Card key={idx} className="rounded-xl shadow-lg overflow-hidden">
                      <CardHeader className="bg-gray-50 p-4 border-b">
                        <CardTitle className="text-2xl font-bold text-gray-800">
                          {entry.month} {entry.year}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Financial Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Carry Forward</p>
                            <p className="font-semibold text-lg">Ksh.{entry.carryForward.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Current Charges</p>
                            <p className="font-semibold text-lg">Ksh.{entry.currentCharges.toLocaleString()}</p>
                          </div>
                        </div>
                        <u>water billage</u>
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
                              <p className="font-semibold text-lg">Ksh.{entry.waterCharge.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Expected</p>
                            <p className="font-semibold text-lg">Ksh.{entry.expected.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Collected</p>
                            <p className="font-semibold text-lg text-green-600">
                              Ksh.{entry.collected.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Balance</p>
                            <p className={`font-bold text-xl ${balanceTone(entry.balance)}`}>{formatBalance(entry.balance)}</p>
                          </div>
                        </div>

                        {/* Payments Section */}
                        {entry.payments.length > 0 && (
                          <Collapsible className="w-full">
                            <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-4 bg-gray-50 rounded-md border text-left font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                              <h3 className="text-base">Payments ({entry.payments.length})</h3>
                              <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4 overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="min-w-[100px]">Date</TableHead>
                                    <TableHead className="min-w-[100px]">Amount</TableHead>
                                    <TableHead className="min-w-[120px]">Method</TableHead>
                                    <TableHead className="min-w-[180px]">Reference</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {entry.payments.map((p: Payment, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium">
                                        {new Date(p.date).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>Ksh.{p.amount.toLocaleString()}</TableCell>
                                      <TableCell className="capitalize">{p.method.replace("-", " ")}</TableCell>
                                      <TableCell className="text-muted-foreground text-sm">{p.reference}</TableCell>
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
              ) : (
                <div className="overflow-x-auto">
                  <Table className="border">
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="w-[80px] print:w-[12%]">Month/Year</TableHead>
                        <TableHead className="w-[80px] print:w-[10%]">Carry Fwd</TableHead>
                        <TableHead className="w-[80px] print:w-[10%]">Charges</TableHead>
                        <TableHead className="w-[60px] print:w-[8%]">Usage</TableHead>
                        <TableHead className="w-[80px] print:w-[10%]">Water Chg</TableHead>
                        <TableHead className="w-[80px] print:w-[10%]">Expected</TableHead>
                        <TableHead className="w-[80px] print:w-[10%]">Collected</TableHead>
                        <TableHead className="w-[80px] print:w-[10%]">Balance</TableHead>
                        <TableHead className="print:w-[20%]">Payments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transformedData.map((entry, idx) => (
                        <TableRow key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <TableCell className="font-medium py-2 print:py-1">
                            {entry.month} {entry.year}
                          </TableCell>
                          <TableCell>Ksh.{entry.carryForward.toLocaleString()}</TableCell>
                          <TableCell>Ksh.{entry.currentCharges.toLocaleString()}</TableCell>
                          <TableCell>
                            {entry.usage || "-"} {entry.usage ? "units" : ""}
                          </TableCell>
                          <TableCell>{entry.waterCharge ? `Ksh.${entry.waterCharge.toLocaleString()}` : "-"}</TableCell>
                          <TableCell>Ksh.{entry.expected.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">Ksh.{entry.collected.toLocaleString()}</TableCell>
                          <TableCell className={`font-semibold ${balanceTone(entry.balance)}`}>
                            {formatBalance(entry.balance)}
                          </TableCell>
                          <TableCell className="py-2 print:py-1">
                            {entry.payments.length > 0 ? (
                              <Table className="border compact-table">
                                <TableBody>
                                  {entry.payments.map((payment, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="py-1 px-2 text-sm print:p-1 print:text-xs">
                                        {new Date(payment.date).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell className="py-1 px-2 text-sm print:p-1 print:text-xs">
                                        Ksh.{payment.amount.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="py-1 px-2 text-sm text-muted-foreground print:p-1 print:text-xs truncate">
                                        {payment.reference}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <span className="text-muted-foreground text-sm print:text-xs">No payments</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
