"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  X,
  BarChart3,
  Eye,
  DollarSign,
  Home,
  Users,
  FileSpreadsheet,
  FileText,
  Printer,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PropertyMonthly } from "@/app/reports/property-monthly";
import { PropertyYearly } from "@/app/reports/property-yearly";

interface Unit {
  id: string;
  name: string;
}

interface Property {
  id: string;
  name: string;
  units: Unit[];
}

interface ReportFilters {
  properties: string[];
  units: string[];
  reportFormat: string;
  selectedYear: string;
  selectedMonth?: string;
  startMonth?: string;
  endMonth?: string;
  periodType?: "all-year" | "custom-range";
  includePastTenantsData: boolean;
}

const REPORT_TYPES = {
  financial: [
    {
      id: "landlord-report",
      name: "Landlord's Report",
      description: "Comprehensive landlord financial overview",
    },
    {
      id: "consolidated-report",
      name: "Consolidated Report",
      description: "Consolidated financial data across all properties",
    },
    {
      id: "cumulative-report",
      name: "Cumulative Report",
      description: "Cumulative financial data over time",
    },
    {
      id: "bills-report",
      name: "Bills",
      description: "Outstanding and paid bills summary",
    },
  ],
  property: [
    {
      id: "utility-consumption",
      name: "Utility Consumption",
      description: "Water and electricity usage patterns",
    },
    {
      id: "maintenance-report",
      name: "Maintenance",
      description: "Property maintenance and repair expenses",
    },
    {
      id: "yearly-report",
      name: "Yearly Report",
      description: "Annual property performance summary",
    },
    {
      id: "monthly-report",
      name: "Monthly Report",
      description: "Monthly property performance summary",
    },
  ],
  tenant: [
    {
      id: "tenant-monthly",
      name: "Monthly Report",
      description: "Monthly tenant activity and payments",
    },
    {
      id: "tenant-yearly",
      name: "Yearly Report",
      description: "Annual tenant activity and payments",
    },
  ],
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const YEARLY_REPORTS = ["yearly-report", "tenant-yearly"];
const MONTHLY_REPORTS = ["monthly-report", "tenant-monthly"];

export function ReportsGenerator({ onClose }: { onClose: () => void }) {
  const [selectedReportType, setSelectedReportType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("financial");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    properties: [],
    units: [],
    reportFormat: "pdf",
    selectedYear: CURRENT_YEAR.toString(),
    selectedMonth: "all",
    startMonth: "01",
    endMonth: "12",
    periodType: "all-year",
    includePastTenantsData: false,
  });
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportView, setReportView] = useState<{
    type: string;
    data: any;
    propertyName: string;
    month: string;
    year: string;
    selectedUnits?: string[];
  } | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch("/api/properties/reports");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProperties(data);
      } catch (err) {
        console.error("Failed to fetch properties", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const availableUnits = useMemo(() => {
    if (filters.properties.length === 0) {
      return [];
    }
    return properties
      .filter((p) => filters.properties.includes(p.id))
      .flatMap((p) => p.units);
  }, [filters.properties, properties]);

  const isYearlyReport = YEARLY_REPORTS.includes(selectedReportType);
  const isMonthlyReport = MONTHLY_REPORTS.includes(selectedReportType);
  const isLandlordReport = selectedReportType === "landlord-report";
  const shouldShowDateFilters = !!selectedReportType;
  const unitsDisabled = filters.properties.length === 0;

  const handleReportTypeChange = (reportId: string) => {
    setSelectedReportType(reportId);
    const newMonth = YEARLY_REPORTS.includes(reportId) ? "all" : "01";
    setFilters((prev) => ({ ...prev, selectedMonth: newMonth }));
  };

  const getPeriodDisplay = () => {
    if (filters.periodType === "all-year") {
      return "All Year";
    }
    const startLabel = getMonthLabel(filters.startMonth || "01");
    const endLabel = getMonthLabel(filters.endMonth || "12");
    return `${startLabel} - ${endLabel}`;
  };

  const toggleProperty = (propertyId: string) => {
    setFilters((prev) => ({
      ...prev,
      properties: [propertyId],
      units: [],
    }));
    setPropertyOpen(false);
  };

  const toggleUnit = (unitId: string) => {
    setFilters((prev) => ({
      ...prev,
      units: prev.units.includes(unitId)
        ? prev.units.filter((id) => id !== unitId)
        : [...prev.units, unitId],
    }));
  };

  const toggleAllUnits = () => {
    setFilters((prev) => ({
      ...prev,
      units: prev.units.includes("all")
        ? []
        : ["all", ...availableUnits.map((u) => u.id)],
    }));
  };

  const getPropertiesDisplay = () => {
    if (loading) return "Loading properties...";
    if (filters.properties.length === 0) return "Select a property...";
    return (
      properties.find((p) => p.id === filters.properties[0])?.name ||
      "Select a property..."
    );
  };

  const getUnitsDisplay = () => {
    if (filters.units.length === 0) return "Select units...";
    if (filters.units.includes("all")) return "All Units";
    if (filters.units.length === 1) {
      return (
        availableUnits.find((u) => u.id === filters.units[0])?.name ||
        "Select units..."
      );
    }
    return `${filters.units.length} selected`;
  };

  const getMonthLabel = (value: string) => {
    if (value === "all") return "All Months";
    return MONTHS.find((m) => m.value === value)?.label || value;
  };

  const shouldShowAllOption = () => {
    if (selectedCategory === "tenant") return false;
    return selectedCategory !== "financial" || !isLandlordReport;
  };

  const selectedReport = REPORT_TYPES[
    selectedCategory as keyof typeof REPORT_TYPES
  ]?.find((report) => report.id === selectedReportType);

  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      if (!selectedReportType) {
        toast.error("Please select a report type");
        return;
      }

      if (filters.properties.length === 0) {
        toast.error("Please select a property");
        return;
      }

      if (
        selectedReportType === "monthly-report" &&
        filters.properties.length === 1
      ) {
        const propertyId = filters.properties[0];

        const selectedProperty = properties.find((p) => p.id === propertyId);

        if (!selectedProperty) {
          toast.error("Selected property not found");
          return;
        }

        const houseId = selectedProperty.id;

        if (!filters.selectedMonth || !filters.selectedYear) {
          toast.error("Please select both year and month for monthly reports");
          return;
        }

        console.log("Generating monthly report for:", {
          propertyName: selectedProperty.name,
          houseId: houseId,
          year: filters.selectedYear,
          month: filters.selectedMonth,
          format: filters.reportFormat,
          includePastTenantsData: filters.includePastTenantsData,
        });

        const response = await fetch(
          `/api/reports/monthly/${houseId}?year=${filters.selectedYear}&month=${filters.selectedMonth}&includePastTenantsData=${filters.includePastTenantsData}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to generate report: ${response.status}`
          );
        }

        const reportData = await response.json();
        console.log("Report data received:", reportData);

        // Set report view for modular display
        setReportView({
          type: selectedReportType,
          data: reportData,
          propertyName: selectedProperty.name,
          month: getMonthLabel(filters.selectedMonth),
          year: filters.selectedYear,
          selectedUnits: filters.units,
        });
      }
      else if (selectedReportType === "yearly-report" && filters.properties.length === 1) {
      const propertyId = filters.properties[0];
      const selectedProperty = properties.find((p) => p.id === propertyId);

      if (!selectedProperty) {
        toast.error("Selected property not found");
        return;
      }

      const houseId = selectedProperty.id;

      if (!filters.selectedYear) {
        toast.error("Please select a year for yearly reports");
        return;
      }

      console.log("Generating yearly report for:", {
        propertyName: selectedProperty.name,
        houseId: houseId,
        year: filters.selectedYear,
        periodType: filters.periodType,
        startMonth: filters.startMonth,
        endMonth: filters.endMonth,
        format: filters.reportFormat,
        includePastTenantsData: filters.includePastTenantsData,
      });

      // Build query parameters
      const queryParams = new URLSearchParams({
        year: filters.selectedYear,
        includePastTenantsData: filters.includePastTenantsData.toString(),
      });

      // Add period filters if custom range
      if (filters.periodType === "custom-range") {
        if (filters.startMonth) queryParams.append('startMonth', filters.startMonth);
        if (filters.endMonth) queryParams.append('endMonth', filters.endMonth);
      }

      const response = await fetch(
        `/api/reports/yearly/${houseId}?${queryParams}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to generate report: ${response.status}`
        );
      }

      const reportData = await response.json();
      console.log("Yearly report data received:", reportData);

      // Set report view for modular display
      setReportView({
        type: selectedReportType,
        data: reportData,
        propertyName: selectedProperty.name,
        month:
          filters.periodType === "custom-range"
            ? `${getMonthLabel(filters.startMonth || "01")} - ${getMonthLabel(
                filters.endMonth || "12"
              )}`
            : "All Year",
        year: filters.selectedYear,
        selectedUnits: filters.units,
      });
    } else {
        console.log("Generating other report type:", {
          selectedReportType,
          selectedCategory,
          filters,
          includePastTenantsData: filters.includePastTenantsData,
        });
        toast.message(
          `Report generation for ${selectedReportType} would be implemented here`
        );
      }
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(`Error generating report: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewReport = () => {
    console.log("Previewing report:", {
      selectedReportType,
      selectedCategory,
      filters,
    });
  };

  const renderReportModal = () => {
    if (!reportView) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Report Preview</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReportView(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[calc(95vh-80px)]">
            {reportView.type === "monthly-report" ? (
              <PropertyMonthly
                data={reportView.data}
                propertyName={reportView.propertyName}
                month={reportView.month}
                year={reportView.year}
                onBack={() => setReportView(null)}
                selectedUnits={reportView.selectedUnits}
                includePastTenantsData={filters.includePastTenantsData}
              />
            ) : reportView.type === "yearly-report" ? (
              <PropertyYearly
                data={reportView.data}
                propertyName={reportView.propertyName}
                year={reportView.year}
                period={reportView.month} // This is correct
                onBack={() => setReportView(null)}
                selectedUnits={reportView.selectedUnits}
                includePastTenantsData={filters.includePastTenantsData}
              />
            ) : (
              <div className="p-4">
                <pre>{JSON.stringify(reportView.data, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Reports Generator
              </CardTitle>
              <CardDescription>
                Generate comprehensive property management reports
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Report Type Selection */}
              <div className="lg:col-span-2 space-y-4">
                <Tabs
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger
                      value="financial"
                      className="flex items-center gap-1"
                    >
                      <DollarSign className="h-3 w-3" />
                      Financial
                    </TabsTrigger>
                    <TabsTrigger
                      value="property"
                      className="flex items-center gap-1"
                    >
                      <Home className="h-3 w-3" />
                      Property
                    </TabsTrigger>
                    <TabsTrigger
                      value="tenant"
                      className="flex items-center gap-1"
                    >
                      <Users className="h-3 w-3" />
                      Tenant
                    </TabsTrigger>
                  </TabsList>

                  {Object.entries(REPORT_TYPES).map(([category, reports]) => (
                    <TabsContent
                      key={category}
                      value={category}
                      className="space-y-2"
                    >
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedReportType === report.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "hover:border-muted-foreground/20"
                          }`}
                          onClick={() => handleReportTypeChange(report.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{report.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {report.description}
                              </p>
                            </div>
                            {selectedReportType === report.id && (
                              <Badge variant="default" className="ml-2">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* Filters and Options */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Report Filters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {shouldShowDateFilters && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs font-medium">Year</Label>
                            <Select
                              value={filters.selectedYear}
                              onValueChange={(value) =>
                                setFilters({ ...filters, selectedYear: value })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {YEAR_OPTIONS.map((year) => (
                                  <SelectItem
                                    key={year}
                                    value={year.toString()}
                                  >
                                    {year}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {isYearlyReport ? (
                            <div>
                              <Label className="text-xs font-medium">
                                Period
                              </Label>
                              <Select
                                value={filters.periodType || "all-year"}
                                onValueChange={(value) =>
                                  setFilters({
                                    ...filters,
                                    periodType: value as
                                      | "all-year"
                                      | "custom-range",
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all-year">
                                    All Year
                                  </SelectItem>
                                  <SelectItem value="custom-range">
                                    Custom
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div>
                              <Label className="text-xs font-medium">
                                Month
                              </Label>
                              <Select
                                value={filters.selectedMonth}
                                onValueChange={(value) =>
                                  setFilters({
                                    ...filters,
                                    selectedMonth: value,
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {!isMonthlyReport && (
                                    <SelectItem value="all">
                                      All Months
                                    </SelectItem>
                                  )}
                                  {MONTHS.map((month) => (
                                    <SelectItem
                                      key={month.value}
                                      value={month.value}
                                    >
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {isYearlyReport &&
                          filters.periodType === "custom-range" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs font-medium">
                                  Start Month
                                </Label>
                                <Select
                                  value={filters.startMonth || "01"}
                                  onValueChange={(value) =>
                                    setFilters({
                                      ...filters,
                                      startMonth: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MONTHS.map((month) => (
                                      <SelectItem
                                        key={month.value}
                                        value={month.value}
                                      >
                                        {month.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">
                                  End Month
                                </Label>
                                <Select
                                  value={filters.endMonth || "12"}
                                  onValueChange={(value) =>
                                    setFilters({
                                      ...filters,
                                      endMonth: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MONTHS.map((month) => (
                                      <SelectItem
                                        key={month.value}
                                        value={month.value}
                                      >
                                        {month.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        <Separator />
                      </>
                    )}
                    <Separator />

                    {/* Properties Filter */}
                    <div>
                      <Label className="text-xs font-medium">Properties</Label>
                      <Popover
                        open={propertyOpen}
                        onOpenChange={setPropertyOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={propertyOpen}
                            className="w-full justify-between h-8 text-xs bg-transparent"
                            disabled={loading}
                          >
                            {getPropertiesDisplay()}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search properties..."
                              className="h-8"
                            />
                            <CommandList>
                              <CommandEmpty>
                                {loading
                                  ? "Loading properties..."
                                  : "No properties found."}
                              </CommandEmpty>
                              <CommandGroup>
                                {properties.map((property) => (
                                  <CommandItem
                                    key={property.id}
                                    value={property.name}
                                    onSelect={() => toggleProperty(property.id)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        filters.properties.includes(property.id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {property.name}
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 text-xs"
                                    >
                                      {property.units.length} units
                                    </Badge>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Separator />

                    {/* Units Filter */}
                    {!isLandlordReport && (
                      <div>
                        <Label className="text-xs font-medium">Units</Label>
                        <Popover open={unitsOpen} onOpenChange={setUnitsOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={unitsOpen}
                              className="w-full justify-between h-8 text-xs bg-transparent"
                              disabled={unitsDisabled}
                            >
                              {unitsDisabled
                                ? "Select a property first"
                                : getUnitsDisplay()}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search units..."
                                className="h-8"
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {unitsDisabled
                                    ? "Select a property to see units"
                                    : "No units found for selected property"}
                                </CommandEmpty>
                                <CommandGroup>
                                  {shouldShowAllOption() && !unitsDisabled && (
                                    <CommandItem
                                      value="all"
                                      onSelect={toggleAllUnits}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          filters.units.includes("all")
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      All Units ({availableUnits.length})
                                    </CommandItem>
                                  )}
                                  {availableUnits.map((unit) => (
                                    <CommandItem
                                      key={unit.id}
                                      value={unit.id}
                                      onSelect={() => toggleUnit(unit.id)}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          filters.units.includes(unit.id)
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {unit.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    <Separator />

                    {(selectedCategory === "financial" ||
                      (selectedCategory === "property" &&
                        selectedReportType !== "yearly-report")) && (
                      <div className="flex items-center space-x-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <Checkbox
                          id="past-tenants"
                          checked={filters.includePastTenantsData}
                          onCheckedChange={(checked) =>
                            setFilters({
                              ...filters,
                              includePastTenantsData: checked as boolean,
                            })
                          }
                          className="border-purple-500 data-[state=checked]:bg-purple-600"
                        />
                        <Label
                          htmlFor="past-tenants"
                          className="text-sm font-semibold cursor-pointer text-purple-900"
                        >
                          Include past tenants data
                        </Label>
                      </div>
                    )}

                    <Separator />

                    {/* Format Selection */}
                    <div>
                      <Label className="text-xs font-medium">
                        Export Format
                      </Label>
                      <Select
                        value={filters.reportFormat}
                        onValueChange={(value) =>
                          setFilters({ ...filters, reportFormat: value })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              PDF Document
                            </div>
                          </SelectItem>
                          <SelectItem value="excel">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-3 w-3" />
                              Excel Spreadsheet
                            </div>
                          </SelectItem>
                          <SelectItem value="print">
                            <div className="flex items-center gap-2">
                              <Printer className="h-3 w-3" />
                              Print Ready
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                {/* Selected Report Summary */}
                {selectedReport && (
                  <Card className="border-primary/20 bg-primary/5 gap-1!">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Selected Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium text-sm">
                        {selectedReport.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedReport.description}
                      </p>

                      <div className="mt-3 space-y-1 text-xs">
                        {shouldShowDateFilters && (
                          <>
                            <div className="flex justify-between">
                              <span>Year:</span>
                              <span>{filters.selectedYear}</span>
                            </div>
                            {isYearlyReport ? (
                              <>
                                <div className="flex justify-between">
                                  <span>Period:</span>
                                  <span>
                                    {filters.periodType === "all-year"
                                      ? "All Year"
                                      : `${getMonthLabel(
                                          filters.startMonth || "01"
                                        )} - ${getMonthLabel(
                                          filters.endMonth || "12"
                                        )}`}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between">
                                <span>Month:</span>
                                <span>
                                  {getMonthLabel(
                                    filters.selectedMonth || "all"
                                  )}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between">
                          <span>Properties:</span>
                          <span>
                            {filters.properties.length === 0
                              ? "All"
                              : properties
                                  .filter((p) =>
                                    filters.properties.includes(p.id)
                                  )
                                  .map((p) => p.name)
                                  .join(", ")}
                          </span>
                        </div>

                        {!isLandlordReport && (
                          <div className="flex justify-between">
                            <span>Units:</span>
                            <span>
                              {filters.units.length === 0 ||
                              filters.units.includes("all")
                                ? "All Units"
                                : `${filters.units.length} units selected`}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span>Format:</span>
                          <span className="uppercase">
                            {filters.reportFormat}
                          </span>
                        </div>
                      </div>
                      {(selectedCategory === "financial" ||
                        (selectedCategory === "property" &&
                          selectedReportType !== "yearly-report")) && (
                        <div className="flex justify-between text-xs">
                          <span>Include past tenants data:</span>
                          <span>
                            {filters.includePastTenantsData ? "Yes" : "No"}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}{" "}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedReport
                  ? `Ready to generate: ${selectedReport.name}`
                  : "Select a report type to continue"}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePreviewReport}
                  disabled={!selectedReportType}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleGenerateReport}
                  disabled={!selectedReportType || isGenerating}
                >
                  {isGenerating ? (
                    "Generating..."
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Report Preview Modal */}
      {renderReportModal()}
    </>
  );
}
