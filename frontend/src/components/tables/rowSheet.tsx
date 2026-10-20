"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ReactNode } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right" | "top" | "bottom"; // optional
  widthClass?: string; // override default width if needed
};

export function RowSheet({
  open,
  onOpenChange,
  title = "Details",
  children,
  side = "right",
  widthClass = "w-full sm:w-[500px]",
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={`gap-0 ${widthClass}`}>
        <SheetHeader className="px-4 pt-5 sm:px-6">
          <SheetTitle className="text-lg">{title}</SheetTitle>
        </SheetHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto text-sm space-y-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
