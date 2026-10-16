"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDmy = (iso: string) => iso.split("-").reverse().join("/");
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** "yyyy-mm-dd" from 16/10/2026, 5/10/2026, 16102026 or 2026-10-16; "" while incomplete or not a real date. */
function parse(text: string) {
  const t = text.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t) ?? /^(\d{2})(\d{2})(\d{4})$/.exec(t);
  if (!ymd && !dmy) return "";
  const [y, m, d] = (ymd ? [ymd[1], ymd[2], ymd[3]] : [dmy![3], dmy![2], dmy![1]]).map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? toIso(date) : "";
}

/** A date box that shows and takes dd/mm/yyyy. Like a native date input, onChange gets "yyyy-mm-dd", or "" until the date is complete. */
export function DateInput({
  id,
  value,
  onChange,
  max,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  className?: string;
}) {
  const current = parse(value);
  const last = max ? parse(max) : "";
  const [text, setText] = useState(toDmy(current));
  const [synced, setSynced] = useState(value);
  const [open, setOpen] = useState(false);

  if (value !== synced) {
    setSynced(value);
    if (current !== parse(text)) setText(toDmy(current));
  }

  const update = (next: string) => {
    if (next !== current) onChange(next);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={text}
        placeholder="dd/mm/yyyy"
        autoComplete="off"
        onChange={(e) => {
          setText(e.target.value);
          update(parse(e.target.value));
        }}
        onBlur={() => {
          const typed = parse(text);
          if (typed) setText(toDmy(typed));
        }}
        className={cn("pr-9", className)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Pick a date"
            className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <CalendarIcon className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            required
            selected={current ? toDate(current) : undefined}
            defaultMonth={current ? toDate(current) : undefined}
            captionLayout="dropdown"
            endMonth={last ? toDate(last) : new Date(new Date().getFullYear() + 10, 11)}
            disabled={last ? { after: toDate(last) } : undefined}
            onSelect={(date) => {
              setText(toDmy(toIso(date)));
              update(toIso(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
