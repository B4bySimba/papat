"use client";
import { useEffect, useState } from "react";
import { BellDot, Building2, Search } from "lucide-react";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import { Button } from "./ui/button";
import GlobalSearch, { QuickActions } from "./GlobalSearch";

export default function Header(actions: QuickActions) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="no-print z-30 shrink-0 border-b bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-6 md:h-16">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 size-9 [&_svg]:w-5! [&_svg]:h-5! hover:cursor-ew-resize" />
          <Separator
            orientation="vertical"
            className="mx-1 hidden data-[orientation=vertical]:h-4 sm:block md:hidden"
          />
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30 md:hidden">
            <Building2 className="size-4" />
          </span>
          <h1 className="truncate text-lg font-bold tracking-tight md:hidden">RentalSys</h1>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="relative hidden h-10 flex-1 items-center rounded-full border border-transparent bg-muted/60 pl-10 pr-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted md:flex md:max-w-sm"
        >
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4" />
          Search...
          <kbd className="ml-auto rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
        </button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-9 rounded-full md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
            <Search />
          </Button>
          <Button variant="ghost" size="icon" className="size-9 rounded-full">
            <BellDot />
          </Button>
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} actions={actions} />
    </header>
  );
}
