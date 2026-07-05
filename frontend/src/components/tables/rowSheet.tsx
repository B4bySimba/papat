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
  widthClass = "w-[400px] sm:w-[500px]",
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={widthClass}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        <div className="text-sm space-y-3 p-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
