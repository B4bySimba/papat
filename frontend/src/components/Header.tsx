"use client";
import { BellDot, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { SidebarTrigger } from "./ui/sidebar";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 [&_svg]:w-5! [&_svg]:h-5! hover:cursor-ew-resize" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-xl font-bold">RentalSys</h1>
      </div>
      <div className="relative">
        <Input
          type="text"
          placeholder="Search..."
          className="pl-10 pr-4 w-[260px] sm:w-[280px]"
        />
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>
      <Button variant="ghost" size="icon">
        <BellDot />
      </Button>
    </header>
  );
}