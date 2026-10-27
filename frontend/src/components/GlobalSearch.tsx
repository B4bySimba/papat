"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building,
  Clipboard,
  CreditCard,
  DoorOpen,
  Droplets,
  HandCoins,
  HousePlus,
  PackagePlus,
  Receipt,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useVisible } from "./Sidebar";

/** Each is missing when the signed-in user may not do it. */
export interface QuickActions {
  onGenerateReport?: () => void;
  onGenerateInvoice?: () => void;
  onAddProperty?: () => void;
  onAddUnit?: () => void;
  onAddTenant?: () => void;
  onLogPayment?: () => void;
  onAddMeterReading?: () => void;
}

type Hit = { id: string; label: string; detail: string; href: string };
type Results = Record<"tenants" | "properties" | "units" | "payments", Hit[]>;

const groups = [
  { key: "tenants", heading: "Tenants", icon: UserRound },
  { key: "properties", heading: "Properties", icon: Building },
  { key: "units", heading: "Units", icon: DoorOpen },
  { key: "payments", heading: "Payments", icon: CreditCard },
] as const;

/** One box for the whole app: tenants (current and past), properties, units, payment references, pages and quick actions. */
export default function GlobalSearch({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: QuickActions;
}) {
  const router = useRouter();
  const visible = useVisible();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then(setResults)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const go = (run: () => void) => {
    onOpenChange(false);
    setQuery("");
    run();
  };
  const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase());
  const quickActions = [
    { label: "Log Payment", icon: HandCoins, run: actions.onLogPayment },
    { label: "Add Tenant", icon: UserRoundPlus, run: actions.onAddTenant },
    { label: "Add Meter Reading", icon: Droplets, run: actions.onAddMeterReading },
    { label: "Add Unit", icon: PackagePlus, run: actions.onAddUnit },
    { label: "Add Property", icon: HousePlus, run: actions.onAddProperty },
    { label: "Reports", icon: Clipboard, run: actions.onGenerateReport },
    { label: "Invoices", icon: Receipt, run: actions.onGenerateInvoice },
  ].filter((a): a is typeof a & { run: () => void } => !!a.run && matches(a.label));
  const pages = visible.navItems.filter((p) => matches(p.label));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Find tenants, properties, units, payments and pages.</DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={false}
          className="**:data-[slot=command-input-wrapper]:h-12 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group]]:px-2 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-2.5"
        >
          <CommandInput
            placeholder="Name, phone, ID, lease code, property, unit, payment ref..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[min(60dvh,420px)]">
            <CommandEmpty>Nothing found.</CommandEmpty>
            {groups.map(({ key, heading, icon: Icon }) =>
              results?.[key]?.length ? (
                <CommandGroup key={key} heading={heading}>
                  {results[key].map((hit) => (
                    <CommandItem key={hit.id} value={`${key}-${hit.id}`} onSelect={() => go(() => router.push(hit.href))}>
                      <Icon />
                      <div className="min-w-0">
                        <p className="truncate">{hit.label}</p>
                        {hit.detail && <p className="truncate text-xs text-muted-foreground">{hit.detail}</p>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null
            )}
            {pages.length > 0 && (
              <CommandGroup heading="Pages">
                {pages.map(({ label, href, icon: Icon }) => (
                  <CommandItem key={href} value={`page-${href}`} onSelect={() => go(() => router.push(href))}>
                    <Icon />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {quickActions.length > 0 && (
              <CommandGroup heading="Actions">
                {quickActions.map(({ label, icon: Icon, run }) => (
                  <CommandItem key={label} value={`action-${label}`} onSelect={() => go(run)}>
                    <Icon />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
