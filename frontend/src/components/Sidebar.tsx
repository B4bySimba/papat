"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Building,
  Users,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Sparkles,
  BadgeCheck,
  Bell,
  LogOut,
  Gauge,
  Wrench,
  Clipboard,
  Receipt,
  House,
  ChevronDown,
  Zap,
  HousePlus,
  UserRoundPlus,
  UserRoundX,
  PackagePlus,
  Droplet,
  HandCoins,
  Droplets,
  Notebook,
  NotebookTabs,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onGenerateReport: () => void;
  onGenerateInvoice: () => void;

  onAddProperty: () => void;
  onAddUnit: () => void;
  onAddTenant: () => void;
  onLogPayment: () => void;
  onAddMeterReading: () => void;
}

export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Properties", href: "/properties", icon: Building },
  { label: "Past Tenants", href: "/pastTenants", icon: UserRoundX },
  { label: "Transactions", href: "/transactions", icon: CreditCard },
  { label: "Meter Readings", href: "/meterReadings", icon: Gauge },
  { label: "Maintenances", href: "/maintenances", icon: Wrench },
  { label: "Bills", href: "/bills", icon: NotebookTabs },
];

const user = {
  name: "shadcn",
  email: "m@example.com",
  avatar: "https://github.com/shadcn.png",
};

export default function AppSidebar({
  onAddProperty,
  onAddUnit,
  onAddTenant,
  onLogPayment,
  onAddMeterReading,
  onGenerateReport,
  onGenerateInvoice,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => isMobile && setOpenMobile(false);
  const run = (fn: () => void) => () => {
    closeOnMobile();
    fn();
  };

  const documents = [
    { label: "Reports", onClick: run(onGenerateReport), icon: Clipboard },
    { label: "Invoices", onClick: run(onGenerateInvoice), icon: Receipt },
  ];

  const actions = [
    { label: "Add Property", onClick: run(onAddProperty), icon: HousePlus },
    { label: "Add Unit", onClick: run(onAddUnit), icon: PackagePlus },
    { label: "Add Tenant", onClick: run(onAddTenant), icon: UserRoundPlus },
    { label: "Log Payment", onClick: run(onLogPayment), icon: HandCoins },
    { label: "Add Meter Reading", onClick: run(onAddMeterReading), icon: Droplets },
  ];

  const others = [
    {label: "Admin", href: "/admin", icon: Zap}
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
            <Building className="size-4" />
          </span>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-base font-bold tracking-tight">RentalSys</span>
            <span className="truncate text-xs text-muted-foreground">Papat Properties</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ label, href, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-auto px-4 border rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-primary/5 border-primary/20"
                          : "border-transparent hover:bg-primary/5 hover:border-primary/20"
                      )}
                    >
                      <Link href={href} onClick={closeOnMobile}>
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {documents.map((action) => (
                <SidebarMenuItem key={action.label}>
                  <SidebarMenuButton
                    onClick={action.onClick}
                    className="h-auto px-4 hover:bg-primary/5 hover:border-primary/20 border border-transparent rounded-xl transition-all duration-200 group"
                  >
                    <action.icon className="mr-2 h-4 w-4" />
                    <span>{action.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                Actions
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {actions.map((action) => (
                    <SidebarMenuItem key={action.label}>
                      <SidebarMenuButton
                        onClick={action.onClick}
                        className="h-auto px-4 hover:bg-primary/5 hover:border-primary/20 border border-transparent rounded-xl transition-all duration-200 group"
                      >
                        <action.icon className="mr-2 h-4 w-4" />
                        <span>{action.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        <SidebarGroup>
          <SidebarGroupLabel>Others</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {others.map(({ label, href, icon: Icon }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-auto px-4 border rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-primary/5 border-primary/20"
                          : "border-transparent hover:bg-primary/5 hover:border-primary/20"
                      )}
                    >
                      <Link href={href} onClick={closeOnMobile}>
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user.name}
                      </span>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Sparkles />
                    Upgrade to Pro
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <BadgeCheck />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/logout", {
                        method: "POST",
                        credentials: "include",
                      });

                      if (!response.ok) throw new Error("Logout failed");

                      // Optionally show toast notification
                      // toast.success("Logged out successfully");

                      window.location.href = "/login";
                    } catch (error) {
                      console.error("Logout error:", error);
                      // toast.error("Logout failed. Please try again.");
                      window.location.href = "/login"; // Still redirect even if logout failed
                    }
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>{" "}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
