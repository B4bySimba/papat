"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "./ui/sidebar";
import AppSidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import PageNav from "./PageNav";
import dynamic from "next/dynamic";
import { useAccess } from "./AccessProvider";

// Loaded on open, not on first paint: the invoice generator alone pulls in html2canvas and jsPDF.
const AddPropertyWizard = dynamic(() => import("./forms/add-property-wizard").then((m) => m.AddPropertyWizard));
const AddUnitSlideout = dynamic(() => import("./forms/add-unit-slideout").then((m) => m.AddUnitSlideout));
const AddTenantModal = dynamic(() => import("./forms/add-tenant-modal").then((m) => m.AddTenantModal));
const LogPaymentFloating = dynamic(() => import("./forms/log-payment-floating").then((m) => m.LogPaymentFloating));
const AddMeterReadingInline = dynamic(() => import("./forms/add-meter-readings-inline").then((m) => m.AddMeterReadingInline));
const ReportsGenerator = dynamic(() => import("./forms/reports-generator").then((m) => m.ReportsGenerator));
const InvoiceGenerator = dynamic(() => import("./forms/invoice-generator").then((m) => m.InvoiceGenerator));

const hiddenRoutes = ["/login", "/register", "/forgot-password", "/change-password"];

export default function ClientAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideLayout = hiddenRoutes.includes(pathname);
  const { can } = useAccess();
  const allow = (right: string, fn: () => void) => (can(right) ? fn : undefined);

  const [ShowGenerateReport, setShowGenerateReport] = useState(false);
  const [reportHouseId, setReportHouseId] = useState<string>();
  const [ShowGenerateInvoice, setShowGenerateInvoice] = useState(false);

  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showLogPayment, setLogPayment] = useState(false);
  const [showAddMeterReading, setShowAddMeterReading] = useState(false);

  if (hideLayout) {
    return <>{children}</>;
  }

  // Only what the signed-in user may do; every menu leaves out the rest.
  const actions = {
    onGenerateReport: allow("reports.view", () => {
      setReportHouseId(undefined);
      setShowGenerateReport(true);
    }),
    onGenerateInvoice: allow("reports.view", () => setShowGenerateInvoice(true)),
    onAddProperty: allow("property.add", () => setShowAddProperty(true)),
    onAddUnit: allow("units.add", () => setShowAddUnit(true)),
    onAddTenant: allow("tenants.add", () => setShowAddTenant(true)),
    onLogPayment: allow("payments.add", () => setLogPayment(true)),
    onAddMeterReading: allow("readings.add", () => setShowAddMeterReading(true)),
  };

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden">
        <AppSidebar {...actions} />
        <div className="flex min-w-0 flex-1 flex-col h-full">
          <Header {...actions} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pt-4 pb-28 sm:px-6 sm:pt-6 md:pb-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <PageNav
                onPropertyReport={(houseId) => {
                  setReportHouseId(houseId);
                  setShowGenerateReport(true);
                }}
              />
              {children}
            </div>
          </main>
        </div>
      </div>
      <MobileNav {...actions} />

      {ShowGenerateReport && (
        <ReportsGenerator houseId={reportHouseId} onClose={() => setShowGenerateReport(false)} />
      )}
      {ShowGenerateInvoice && (
        <InvoiceGenerator onClose={() => setShowGenerateInvoice(false)} />
      )}

      {showAddProperty && (
        <AddPropertyWizard onClose={() => setShowAddProperty(false)} />
      )}
      {showAddUnit && (
        <AddUnitSlideout
          onClose={() => setShowAddUnit(false)}
          defaultHouseId={""}
        />
      )}
      {showAddTenant && (
        <AddTenantModal onClose={() => setShowAddTenant(false)} />
      )}
      {showLogPayment && (
        <LogPaymentFloating onClose={() => setLogPayment(false)} />
      )}
      {showAddMeterReading && (
        <AddMeterReadingInline onClose={() => setShowAddMeterReading(false)} />
      )}
    </SidebarProvider>
  );
}
