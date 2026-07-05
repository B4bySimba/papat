"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "./ui/sidebar";
import AppSidebar from "./Sidebar";
import Header from "./Header";
import { AddPropertyWizard } from "./forms/add-property-wizard";
import { AddUnitSlideout } from "./forms/add-unit-slideout";
import { AddTenantModal } from "./forms/add-tenant-modal";
import { LogPaymentFloating } from "./forms/log-payment-floating";
import { AddMeterReadingInline } from "./forms/add-meter-readings-inline";
import { ReportsGenerator } from "./forms/reports-generator";
import { InvoiceGenerator } from "./forms/invoice-generator";

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
