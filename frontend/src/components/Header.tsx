"use client";
import { BellDot, Building2, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import { Button } from "./ui/button";

export default function Header() {
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
        <div className="relative hidden flex-1 md:block md:max-w-sm">
          <Input
            type="text"
            placeholder="Search..."
            className="h-10 rounded-full bg-muted/60 pl-10 pr-4 border-transparent focus-visible:bg-background"
          />
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        </div>
        <Button variant="ghost" size="icon" className="size-9 rounded-full">
          <BellDot />
        </Button>
      </div>
    </header>
  );
}
