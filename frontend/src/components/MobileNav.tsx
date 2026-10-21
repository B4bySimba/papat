"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building,
  Clipboard,
  CreditCard,
  Droplets,
  Gauge,
  HandCoins,
  HousePlus,
  LayoutDashboard,
  PackagePlus,
  Plus,
  Receipt,
  UserRoundPlus,
  UserRoundX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

interface MobileNavProps {
  onGenerateReport: () => void;
  onGenerateInvoice: () => void;
  onAddProperty: () => void;
  onAddUnit: () => void;
  onAddTenant: () => void;
  onLogPayment: () => void;
  onAddMeterReading: () => void;
}

const links = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Building },
  { label: "Transactions", href: "/transactions", icon: CreditCard },
  { label: "Meters", href: "/meterReadings", icon: Gauge },
];

/** Phone-only bottom bar: the main pages plus a "+" sheet with the sidebar's quick actions. */
export default function MobileNav(props: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const actions = [
    { label: "Log Payment", icon: HandCoins, onClick: props.onLogPayment, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Add Tenant", icon: UserRoundPlus, onClick: props.onAddTenant, tone: "bg-sky-50 text-sky-700" },
    { label: "Meter Reading", icon: Droplets, onClick: props.onAddMeterReading, tone: "bg-cyan-50 text-cyan-700" },
    { label: "Add Unit", icon: PackagePlus, onClick: props.onAddUnit, tone: "bg-amber-50 text-amber-700" },
    { label: "Add Property", icon: HousePlus, onClick: props.onAddProperty, tone: "bg-purple-50 text-purple-700" },
    { label: "Reports", icon: Clipboard, onClick: props.onGenerateReport, tone: "bg-rose-50 text-rose-700" },
    { label: "Invoices", icon: Receipt, onClick: props.onGenerateInvoice, tone: "bg-indigo-50 text-indigo-700" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderLink = ({ label, href, icon: Icon }: (typeof links)[number]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground active:text-foreground"
        )}
      >
        <span
          className={cn(
            "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
            active && "bg-primary/10"
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
        </span>
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-xl supports-backdrop-filter:bg-background/75 md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-1">
          {links.slice(0, 2).map(renderLink)}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Quick actions"
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>
          {links.slice(2).map(renderLink)}
        </div>
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="md:hidden">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle>Quick actions</DrawerTitle>
            <DrawerDescription>Record something or open a document.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-3 gap-2">
              {actions.slice(0, 3).map(({ label, icon: Icon, onClick, tone }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-2 py-4 text-xs font-medium shadow-xs transition-colors active:bg-muted"
                >
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {actions.slice(3).map(({ label, icon: Icon, onClick, tone }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 text-left text-sm font-medium shadow-xs transition-colors active:bg-muted"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <Link
              href="/pastTenants"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5 text-sm font-medium shadow-xs transition-colors active:bg-muted"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <UserRoundX className="h-4 w-4" />
              </span>
              Past Tenants
            </Link>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
