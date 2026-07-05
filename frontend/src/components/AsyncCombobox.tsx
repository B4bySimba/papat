import { useState, useEffect } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AsyncComboboxOption {
  value: string;
  label: string;
}

interface AsyncComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  fetchUrl: string;
}

export function AsyncCombobox({
  value,
  onValueChange,
  placeholder,
  fetchUrl,
}: AsyncComboboxProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AsyncComboboxOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const separator = fetchUrl.includes("?") ? "&" : "?";
        const url = `${fetchUrl}${separator}search=${encodeURIComponent(
          trimmedQuery
        )}`;

        const res = await fetch(url, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }

        const data = await res.json();
        setOptions(data.options ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Failed to fetch options", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [fetchUrl, query]);
    
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-fit justify-between bg-transparent"
        >
          {value
            ? options.find((o) => o.value === value)?.label
            : placeholder || "Select item"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading...</CommandEmpty>
            ) : options.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {options.map((option) => {

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onValueChange(
                          option.value === value ? "" : option.value
                        );
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
