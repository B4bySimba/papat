"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Receipt,
  Eye,
  Send,
  Building,
  Users,
  FileText,
  Mail,
  Printer,
  Plus,
  Minus,
  Download,
  ArrowLeft,
  Calendar,
  ChevronsUpDown,
  Check,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "@/app/invoice-print.css";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { buildInvoiceItems, BuiltInvoice } from "@/lib/invoice-items";

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface specificInvoiceItem {
  id: number;
  description: string;
  amount: number;
}

interface InvoiceData {
  invoiceType: string;
  property: string;
  units: string[];
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  specificItems: specificInvoiceItem[],
  notes: string;
  template: string;
  deliveryMethod: string[];
  year: number;
  month: number;
  selectedUtility?: string;
}

interface Unit {
  id: string;
  name: string;
  tenant: string;
  rent: number;
  email: string;
  leaseCode: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  units: Unit[];
}

const invoiceTemplates = [
  {
    id: "detailed",
    name: "Detailed Invoice",
    description: "Company branding, colors, and full breakdown",
  },
  {
    id: "minimal",
    name: "Minimal Invoice",
    description: "Simple, compact design",
  },
];

const invoiceTypes = [
  {
    id: "Comprehensive",
    name: "Comprehensive",
    description: "monthly rent charge + all other charges",
  },
  {
    id: "utilities",
    name: "Utilities",
    description: "Water, electricity, and other utilities",
  },
  {
    id: "maintenance",
    name: "Maintenance",
    description: "Repair and maintenance costs",
  },
  {
    id: "late-fees",
    name: "Late Fees",
    description: "Penalty charges for late payments",
  },
  {
    id: "security-deposit",
    name: "Security Deposit",
    description: "Initial security deposit",
  },
  {
    id: "custom",
    name: "Custom Invoice",
    description: "Custom charges and items",
  },
];

const utilities = [
  { id: "water", name: "Water", selectable: true },
  { id: "electricity", name: "Electricity", selectable: false },
  { id: "internet", name: "Internet", selectable: false },
  { id: "trash", name: "Trash Collection", selectable: false },
  { id: "gas", name: "Gas", selectable: false },
];

// Minimal template
export function MinimalInvoiceTemplate({ invoice, unit, property }: any) {
  const monthName = new Date(invoice.year, invoice.month - 1).toLocaleString(
    "default",
    { month: "long" }
  );

  return (
    <div className="bg-white p-6 max-w-lg mx-auto border rounded-lg">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
        <p className="text-gray-600">
          {"#"}
          {invoice.invoiceNumber}
        </p>
      </div>
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">To:</span>
          <span className="font-medium">{unit.tenant}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Unit:</span>
          <span className="font-medium">{unit.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Month:</span>
          <span className="font-medium">
            {monthName}/{invoice.year}
          </span>
        </div>
        {invoice.dueDate && (
          <div className="flex justify-between">
            <span className="text-gray-600">Due Date:</span>
            <span className="font-medium">
              {new Date(invoice.dueDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
      <Separator className="my-4" />
      <div className="space-y-2 mb-6">
        {invoice.items.map((item: any, index: number) => (
          <div key={index} className="flex justify-between">
            <span className="text-gray-900">{item.description}</span>
            <span className="font-medium">
              KSH {item.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <Separator className="my-4" />
      <div className="flex justify-between text-lg font-bold">
        <span>Total:</span>
        <span>
          {"KSH "}
          {invoice.items
            .reduce((sum: number, item: any) => sum + item.amount, 0)
            .toLocaleString()}
        </span>
      </div>
      <div className="text-center text-gray-500 text-xs mt-6">
        <p>Papat Properties Limited | +254 700 123 456</p>
      </div>
    </div>
  );
}

// Detailed template
export function DetailedInvoiceTemplate({ invoice, unit, property }: any) {
  const monthName = new Date(invoice.year, invoice.month - 1).toLocaleString(
    "default",
    { month: "long" }
  );
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 max-w-2xl mx-auto border rounded-lg">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 -m-8 mb-2 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="text-purple-100">
              {"#"}
              {invoice.invoiceNumber}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold">Papat Properties Limited</h2>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-2">
        <div className="bg-white/70 backdrop-blur p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Bill To:
          </h3>
          <p className="text-gray-900 font-medium">{unit.tenant}</p>
          <p className="text-gray-700">{unit.name}</p>
          <p className="text-gray-700">lease Code: {unit.leaseCode}</p>
          <p className="text-gray-700">{property.address}</p>
        </div>
        <div className="bg-white/70 backdrop-blur p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Invoice Details:
          </h3>
          <div className="space-y-1">
            <p className="text-gray-700">
              Month: {monthName}/{invoice.year}
            </p>
            {invoice.dueDate && (
              <p className="text-gray-700">
                Due Date:{" "}
                {new Date(invoice.dueDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            <p className="text-gray-700">Property: {property.name}</p>
          </div>
        </div>
      </div>
      <div className="bg-white/70 backdrop-blur rounded-lg border border-purple-200 mb-2">
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1">
            {" "}
            Invoice Items
          </h3>
          <div className="space-y-3">
            {invoice.items.map((item: any, index: number) => {
              const formatAmount = (value: number | undefined) => {
                return value ? `KSH ${value.toLocaleString()}` : "KSH 0";
              };

              return (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-white/50 rounded"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.description}
                    </p>
                    {item.utilityType === "water" && (
                      <p className="text-sm text-gray-600">
                        {item.quantity} × {formatAmount(item.rate)} (Water)
                        {item.serviceCharge > 0 &&
                          ` + ${formatAmount(
                            item.serviceCharge
                          )} (Service Charge)`}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatAmount(item.amount)}
                  </span>
                </div>
              );
            })}
          </div>{" "}
        </div>
      </div>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg mb-2">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold">
            {"KSH "}
            {invoice.items
              .reduce((sum: number, item: any) => sum + item.amount, 0)
              .toLocaleString()}
          </span>
        </div>
      </div>
      {invoice.notes && (
        <div className="bg-white/70 backdrop-blur p-4 rounded-lg border border-purple-200 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Notes:</h3>
          <p className="text-gray-700">{invoice.notes}</p>
        </div>
      )}
      <div className="text-center text-gray-600 text-sm">
        <p>Thank you for your business! 💜</p>
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

export default function InvoiceGeneratorDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Receipt className="mr-2 h-4 w-4" />
        Open Invoice Generator
      </Button>
      {open ? <InvoiceGenerator onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function InvoiceGenerator({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [invoiceYear, setInvoiceYear] = useState(new Date().getFullYear());
  const [invoiceMonth, setInvoiceMonth] = useState(new Date().getMonth() + 1); // 1-12

  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

  const mounted = useMounted();
  const [invoiceMode, setInvoiceMode] = useState<"bulk" | "individual">("bulk");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatedInvoices, setGeneratedInvoices] = useState<any[]>([]);
  const [nextItemId, setNextItemId] = useState(1);
  const currentDate = new Date();

  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceType: "",
    property: "",
    units: [],
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    items: [],
    specificItems: [],
    notes: "",
    template: "detailed",
    deliveryMethod: ["print"],
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1, // 1-12
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Months with full names
  const months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/properties/withUnits");
        const data: Property[] = await res.json();
        setProperties(data);
      } catch (err) {
        console.error("Failed to fetch properties", err);
      }
    };
    fetchProperties();
  }, []);

  const selectedProperty = properties.find(
    (property) => property.id === invoiceData.property
  );

  const selectedUnits: Unit[] = useMemo(() => {
    return (
      selectedProperty?.units.filter((unit) =>
        invoiceData.units.includes(unit.id)
      ) || []
    );
  }, [selectedProperty, invoiceData.units]);

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: nextItemId,
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    };
    setInvoiceData({
      ...invoiceData,
      items: [...invoiceData.items, newItem],
    });
    setNextItemId(nextItemId + 1);
  };

  const removeInvoiceItem = (id: number) => {
    setInvoiceData({
      ...invoiceData,
      items: invoiceData.items.filter((item) => item.id !== id),
    });
  };

  const updateInvoiceItem = (
    id: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setInvoiceData({
      ...invoiceData,
      items: invoiceData.items.map((item) => {
        if (item.id === id) {
          const updatedItem: InvoiceItem = {
            ...item,
            [field]: value,
          } as InvoiceItem;
          if (field === "quantity" || field === "rate") {
            updatedItem.amount = updatedItem.quantity * updatedItem.rate;
          }
          return updatedItem;
        }
        return item;
      }),
    });
  };

  const toggleUnit = (unitId: string) => {
    setInvoiceData({
      ...invoiceData,
      units: invoiceData.units.includes(unitId)
        ? invoiceData.units.filter((id) => id !== unitId)
        : [...invoiceData.units, unitId],
    });
  };

  const selectAllUnits = () => {
    if (selectedProperty) {
      setInvoiceData({
        ...invoiceData,
        units: selectedProperty.units.map((unit) => unit.id),
      });
    }
  };

  const toggleDeliveryMethod = (method: string) => {
    setInvoiceData({
      ...invoiceData,
      deliveryMethod: invoiceData.deliveryMethod.includes(method)
        ? invoiceData.deliveryMethod.filter((m) => m !== method)
        : [...invoiceData.deliveryMethod, method],
    });
  };

  // Ledger-derived types pull their lines from the tenant summary via the pure
  // builder in lib/invoice-items; manual types (custom/maintenance/late-fees)
  // use the items entered in the form instead.
  const MANUAL_ITEM_TYPES = ["custom", "maintenance", "late-fees"];

  const fetchInvoiceItemsByLeaseCode = async (
    leaseCode: string,
    year: number,
    month: number,
    invoiceType: string,
    selectedUtility?: string
  ): Promise<BuiltInvoice> => {
    try {
      const response = await fetch(`/api/invoiceItems?leaseCode=${leaseCode}`);
      if (!response.ok) throw new Error("Failed to fetch invoice items");

      const data = await response.json();
      const built = buildInvoiceItems(
        data,
        year,
        month,
        invoiceType,
        selectedUtility
      );
      return built ?? { items: [], dueDate: null, total: 0 };
    } catch (error) {
      console.error(`Error fetching items for lease ${leaseCode}:`, error);
      return { items: [], dueDate: null, total: 0 };
    }
  };
  
  const processInvoices = async (isPreview: boolean = false) => {
    // Common validation
    if (selectedUnits.length === 0) {
      toast.error("Please select at least one unit");
      return;
    }

    if (
      invoiceData.invoiceType === "utilities" &&
      !invoiceData.selectedUtility
    ) {
      toast.error("Please select a utility type");
      return;
    }

    setIsGenerating(true);

    try {
      // Limit units for preview in individual mode
      const unitsToProcess =
        isPreview && invoiceMode === "individual"
          ? selectedUnits.slice(0, 1)
          : selectedUnits;

      const invoices = await Promise.all(
        unitsToProcess.map(async (unit) => {
          const built = MANUAL_ITEM_TYPES.includes(invoiceData.invoiceType)
            ? { items: invoiceData.items, dueDate: null, total: 0 }
            : await fetchInvoiceItemsByLeaseCode(
                unit.leaseCode,
                invoiceData.year,
                invoiceData.month,
                invoiceData.invoiceType,
                invoiceData.selectedUtility
              );

          return {
            ...invoiceData,
            unit,
            property: selectedProperty,
            items: built.items,
            dueDate: built.dueDate ?? invoiceData.dueDate,
            invoiceNumber: `INV-${Date.now()
              .toString()
              .slice(-6)}-${Math.random()
              .toString(36)
              .slice(2, 6)
              .toUpperCase()}`,
          };
        })
      );

      setGeneratedInvoices(invoices);
      setShowPreview(true);
      toast.success(`Generated ${invoices.length} invoice(s)`);

      // Only process delivery for actual generation
      if (!isPreview) {
        if (invoiceData.deliveryMethod.includes("email")) {
          // Email sending logic
        }
        if (invoiceData.deliveryMethod.includes("print")) {
          // Print logic
        }
      }
    } catch (error) {
      console.error("Error processing invoices:", error);
      toast.error(`Failed to ${isPreview ? "preview" : "generate"} invoices`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Updated handler functions
  const handlePreviewInvoice = () => processInvoices(true);
  const handleGenerateInvoice = () => processInvoices(false);  
  
    const renderInvoiceTemplate = (invoice: any) => {
    switch (invoice.template) {
      case "minimal":
        return (
          <MinimalInvoiceTemplate
            invoice={invoice}
            unit={invoice.unit}
            property={invoice.property}
          />
        );
      case "detailed":
      case "branded": // backward compatibility
      default:
        return (
          <DetailedInvoiceTemplate
            invoice={invoice}
            unit={invoice.unit}
            property={invoice.property}
          />
        );
    }
  };

  const totalAmount = useMemo(
    () => invoiceData.items.reduce((sum, item) => sum + item.amount, 0),
    [invoiceData.items]
  );

  // ---------- Preview Scroller ----------
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollBySlide = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>(".invoice-slide");
    const width = slide?.clientWidth ?? el.clientWidth;
    el.scrollBy({ left: dir * (width + 16), behavior: "smooth" });
  };

  // ---------- Print/Download (A4, 4 per page) ----------
  const printRootRef = useRef<HTMLDivElement>(null);

  const pagesForPrint = useMemo(() => {
    const pages = chunk(generatedInvoices, 4);
    return pages;
  }, [generatedInvoices]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    // Ensure the print DOM exists off-screen to render
    const root = printRootRef.current;
    if (!root) return;

    // Allow layout flush
    await new Promise((r) => setTimeout(r, 16));

    const pageNodes = Array.from(
      root.querySelectorAll<HTMLElement>(".print-page")
    );

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const margin = 10; // mm
    const renderWidth = 210 - margin * 2; // 190
    const renderHeight = 297 - margin * 2; // 277

    for (let i = 0; i < pageNodes.length; i++) {
      const pageEl = pageNodes[i];
      // Render page DOM to canvas
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: pageEl.scrollWidth,
        windowHeight: pageEl.scrollHeight,
      });
      const imgData = canvas.toDataURL("image/png");

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, margin, renderWidth, renderHeight);
    }

    pdf.save("invoices.pdf");
  };

  // ---------- UI ----------
  if (!mounted) return null;

  // Preview modal
  if (showPreview) {
    return (
      <>
        {/* Off-screen print document root for Download/Print */}
        <div ref={printRootRef} className="print-root">
          {/* Build A4 pages with 4 invoices per page in TR, TL, BR, BL order */}
          {pagesForPrint.map((page, pIdx) => {
            // Map 4 positions: [TR, TL, BR, BL]
            const orderClasses = ["pos-tr", "pos-tl", "pos-br", "pos-bl"];
            return (
              <div key={pIdx} className="print-page">
                {page.map((invoice, idx) => (
                  <div
                    key={idx}
                    className={`print-invoice ${orderClasses[idx]}`}
                  >
                    <div className="print-scale">
                      {renderInvoiceTemplate(invoice)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Preview Modal */}
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <Card className="w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Invoice Preview -{" "}
                  {
                    invoiceTemplates.find((t) => t.id === invoiceData.template)
                      ?.name
                  }
                </CardTitle>
                <CardDescription>
                  {generatedInvoices.length} invoice
                  {generatedInvoices.length > 1 ? "s" : ""} generated
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Editor</span>
                  <span className="sm:hidden">Back</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 max-h-[calc(90vh-120px)]">
              {/* Multi-invoice scroller (horizontal with snap) */}
              <div className="relative">
                {generatedInvoices.length > 1 && (
                  <div className="absolute right-2 -top-12 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => scrollBySlide(-1)}
                      aria-label="Previous invoice"
                    >
                      {"<"}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => scrollBySlide(1)}
                      aria-label="Next invoice"
                    >
                      {">"}
                    </Button>
                  </div>
                )}
                <div
                  ref={scrollerRef}
                  className="overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex gap-4 pb-2"
                >
                  {generatedInvoices.map((invoice, index) => (
                    <div
                      key={index}
                      className="invoice-slide min-w-[92%] md:min-w-[680px] snap-center"
                    >
                      {generatedInvoices.length > 1 && (
                        <div className="mb-3 p-3 bg-muted rounded-lg">
                          <h3 className="font-medium">
                            Invoice {index + 1} of {generatedInvoices.length}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {invoice.unit.name} - {invoice.unit.tenant}
                          </p>
                        </div>
                      )}
                      {renderInvoiceTemplate(invoice)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-2 pt-4 border-t bg-background sticky bottom-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {generatedInvoices.length} invoice
                    {generatedInvoices.length > 1 ? "s" : ""} ready for delivery
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadPdf}>
                      <Download className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Download All</span>
                      <span className="sm:hidden">Download</span>
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Print All</span>
                      <span className="sm:hidden">Print</span>
                    </Button>
                    <Button
                      onClick={() =>
                        toast.info(
                          "Email delivery isn't available yet — use Print or Download."
                        )
                      }
                    >
                      <Send className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Send All</span>
                      <span className="sm:hidden">Send</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Editor modal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
      <Card className="w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice Generator
            </CardTitle>
            <CardDescription>
              Generate and send invoices to tenants
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Mode */}
          <div className="mb-6">
            <Label className="text-sm font-medium">Invoice Mode</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Card
                className={`cursor-pointer transition-all ${
                  invoiceMode === "bulk"
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/20"
                }`}
                onClick={() => setInvoiceMode("bulk")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium">Bulk Invoice</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate invoices for all units in a property
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${
                  invoiceMode === "individual"
                    ? "border-primary bg-primary/5"
                    : "hover:border-muted-foreground/20"
                }`}
                onClick={() => setInvoiceMode("individual")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <div>
                      <h4 className="font-medium">Individual Invoice</h4>
                      <p className="text-sm text-muted-foreground">
                        Generate invoice for specific units
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Invoice Type</Label>
                      <Select
                        value={invoiceData.invoiceType}
                        onValueChange={(value) =>
                          setInvoiceData({ ...invoiceData, invoiceType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select invoice type" />
                        </SelectTrigger>
                        <SelectContent>
                          {invoiceTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div>
                                <div className="font-medium">{type.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Property</Label>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-[300px] justify-between"
                          >
                            {selectedProperty
                              ? selectedProperty.name
                              : "Select property"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search property..." />
                            <CommandEmpty>No property found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {properties.map((property) => (
                                <CommandItem
                                  key={property.id}
                                  value={property.name}
                                  onSelect={() => {
                                    setInvoiceData({
                                      ...invoiceData,
                                      property: property.id,
                                      units: [],
                                    });

                                    console.log(
                                      "Lease codes for property:",
                                      property.name
                                    );
                                    property.units.forEach((unit) => {
                                      console.log(
                                        `Lease Code: ${unit.leaseCode}`
                                      );
                                    });
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      property.id === invoiceData.property
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {property.name}
                                  <div className="ml-auto text-xs text-muted-foreground">
                                    {property.units.length} units
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {invoiceData.invoiceType === "utilities" && (
                      <div className="flex flex-col gap-2">
                        <Label>Utility</Label>
                        <Select
                          value={invoiceData.selectedUtility}
                          onValueChange={(value) =>
                            setInvoiceData({
                              ...invoiceData,
                              selectedUtility: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select utility" />
                          </SelectTrigger>
                          <SelectContent>
                            {utilities.map((utility) => (
                              <SelectItem
                                key={utility.id}
                                value={utility.id}
                                disabled={!utility.selectable}
                                className={
                                  !utility.selectable
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                {utility.name}
                                {!utility.selectable && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    (Coming soon)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Year Picker */}
                    <div className="flex flex-col gap-2">
                      <Label>Invoice Year</Label>
                      <Popover open={yearOpen} onOpenChange={setYearOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {invoiceData.year}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <div className="grid grid-cols-3 gap-1 p-2">
                            {years.map((year) => (
                              <Button
                                key={year}
                                variant={
                                  year === invoiceData.year
                                    ? "default"
                                    : "ghost"
                                }
                                onClick={() => {
                                  setInvoiceData({ ...invoiceData, year });
                                  setYearOpen(false);
                                }}
                                className="h-8 w-16"
                              >
                                {year}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Month Picker */}
                    <div className="flex flex-col gap-2">
                      <Label>Invoice Month</Label>
                      <Popover open={monthOpen} onOpenChange={setMonthOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {
                              months.find((m) => m.value === invoiceData.month)
                                ?.name
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <div className="grid grid-cols-3 gap-1 p-2">
                            {months.map((month) => (
                              <Button
                                key={month.value}
                                variant={
                                  month.value === invoiceData.month
                                    ? "default"
                                    : "ghost"
                                }
                                onClick={() => {
                                  setInvoiceData({
                                    ...invoiceData,
                                    month: month.value,
                                  });
                                  setMonthOpen(false);
                                }}
                                className="h-8 w-24"
                              >
                                {month.name}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>{" "}
                </CardContent>
              </Card>

              {/* Units */}
              {selectedProperty && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Select Units</CardTitle>
                      {invoiceMode === "bulk" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllUnits}
                        >
                          Select All
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedProperty.units.map((unit) => (
                        <div
                          key={unit.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            invoiceData.units.includes(unit.id)
                              ? "border-primary bg-primary/5"
                              : "hover:border-muted-foreground/20"
                          }`}
                          onClick={() => toggleUnit(unit.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{unit.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {unit.tenant}
                              </p>
                              <p className="text-xs text-green-600">
                                KSH {unit.rent.toLocaleString()}/month
                              </p>
                            </div>
                            <Checkbox
                              checked={invoiceData.units.includes(unit.id)}
                              onCheckedChange={() => toggleUnit(unit.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Invoice Items</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addInvoiceItem}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invoiceData.items.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/30 rounded-lg"
                      >
                        <div className="col-span-5">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) =>
                              updateInvoiceItem(
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Item description"
                            className="h-8"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateInvoiceItem(
                                item.id,
                                "quantity",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Rate</Label>
                          <Input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              updateInvoiceItem(
                                item.id,
                                "rate",
                                Number.parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            value={`KSH ${item.amount.toLocaleString()}`}
                            readOnly
                            className="h-8 bg-muted"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInvoiceItem(item.id)}
                            className="h-8 w-8"
                            aria-label="Remove item"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {invoiceData.items.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items added yet</p>
                        <p className="text-xs">
                          Click "Add Item" to get started
                        </p>
                      </div>
                    )}
                  </div>
                  {invoiceData.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-lg font-bold text-green-600">
                          KSH {totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={invoiceData.notes}
                    onChange={(e) =>
                      setInvoiceData({ ...invoiceData, notes: e.target.value })
                    }
                    placeholder="Add any additional notes or payment instructions..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Template */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Invoice Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invoiceTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-2 border rounded cursor-pointer transition-all ${
                        invoiceData.template === template.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground/20"
                      }`}
                      onClick={() =>
                        setInvoiceData({
                          ...invoiceData,
                          template: template.id,
                        })
                      }
                    >
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Delivery */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Delivery Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    {
                      id: "email",
                      name: "Email",
                      icon: Mail,
                      disabled: true,
                      tooltip: "Emailing is currently unavailable",
                    },
                    { id: "print", name: "Print", icon: Printer },
                    { id: "download", name: "Download", icon: FileText },
                  ].map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-2 ${
                        method.disabled ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                    >
                      <Checkbox
                        id={method.id}
                        checked={invoiceData.deliveryMethod.includes(method.id)}
                        onCheckedChange={() =>
                          !method.disabled && toggleDeliveryMethod(method.id)
                        }
                        disabled={method.disabled}
                      />
                      <Label
                        htmlFor={method.id}
                        className={`flex items-center gap-2 text-sm ${
                          method.disabled ? "cursor-not-allowed" : ""
                        }`}
                      >
                        <method.icon className="h-3 w-3" />
                        {method.name}
                        {method.disabled && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Unavailable)
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <Badge variant="secondary">{invoiceMode}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Property:</span>
                    <span>{selectedProperty?.name || "Not selected"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units:</span>
                    <span>{invoiceData.units.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{invoiceData.items.length}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>KSH {totalAmount.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {invoiceData.units.length > 0
                ? `Ready to generate ${invoiceData.units.length} invoice${
                    invoiceData.units.length > 1 ? "s" : ""
                  }`
                : "Select units and add items to continue"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewInvoice}
                disabled={
                  invoiceData.units.length === 0 ||
                  isGeneratingPreview ||
                  !invoiceData.invoiceType
                }
              >
                {isGenerating ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </div>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </>
                )}
              </Button>
              <Button
                onClick={handleGenerateInvoice}
                disabled={
                  invoiceData.units.length === 0 ||
                  isGenerating ||
                  !invoiceData.invoiceType
                }
              >
                {isGenerating ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </div>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Generate & Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
