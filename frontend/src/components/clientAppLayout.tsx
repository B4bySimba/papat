"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "./ui/sidebar";
import AppSidebar from "./Sidebar";
import Header from "./Header";
import dynamic from "next/dynamic";

// Loaded on open, not on first paint: the invoice generator alone pulls in html2canvas and jsPDF.
const AddPropertyWizard = dynamic(() => import("./forms/add-property-wizard").then((m) => m.AddPropertyWizard));
const AddUnitSlideout = dynamic(() => import("./forms/add-unit-slideout").then((m) => m.AddUnitSlideout));
const AddTenantModal = dynamic(() => import("./forms/add-tenant-modal").then((m) => m.AddTenantModal));
const LogPaymentFloating = dynamic(() => import("./forms/log-payment-floating").then((m) => m.LogPaymentFloating));
const AddMeterReadingInline = dynamic(() => import("./forms/add-meter-readings-inline").then((m) => m.AddMeterReadingInline));
const ReportsGenerator = dynamic(() => import("./forms/reports-generator").then((m) => m.ReportsGenerator));
const InvoiceGenerator = dynamic(() => import("./forms/invoice-generator").then((m) => m.InvoiceGenerator));

const hiddenRoutes = ["/login", "/register", "/forgot-password"];

export default function ClientAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideLayout = hiddenRoutes.includes(pathname);

  const [ShowGenerateReport, setShowGenerateReport] = useState(false);
  const [ShowGenerateInvoice, setShowGenerateInvoice] = useState(false);

  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showLogPayment, setLogPayment] = useState(false);
  const [showAddMeterReading, setShowAddMeterReading] = useState(false);

  if (hideLayout) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <AppSidebar
          onGenerateReport={() => setShowGenerateReport(true)}
          onGenerateInvoice={() => setShowGenerateInvoice(true)}
          onAddProperty={() => setShowAddProperty(true)}
          onAddUnit={() => setShowAddUnit(true)}
          onAddTenant={() => setShowAddTenant(true)}
          onLogPayment={() => setLogPayment(true)}
          onAddMeterReading={() => setShowAddMeterReading(true)}
        />
        <div className="flex flex-col flex-1 h-full">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
        </div>
      </div>

      {ShowGenerateReport && (
        <ReportsGenerator onClose={() => setShowGenerateReport(false)} />
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
