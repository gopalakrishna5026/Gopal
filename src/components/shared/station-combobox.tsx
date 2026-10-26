"use client";

import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Station } from "@/types";

interface StationComboboxProps {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  stations: Station[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Hide stations already used elsewhere (e.g. the other end of the journey). */
  exclude?: string[];
}

export function StationCombobox({
  id,
  value,
  onChange,
  stations,
  placeholder = "Select station",
  invalid,
  disabled,
  className,
  exclude = [],
}: StationComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = stations.find((s) => s.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn("h-auto min-h-9 w-full justify-between bg-background px-3 py-2 font-normal", className)}
        >
          {selected ? (
            <span className="flex min-w-0 flex-col items-start text-left">
              <span className="truncate font-medium">{selected.name}</span>
              <span className="text-xs text-muted-foreground">
                {selected.code} · {selected.state}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDownIcon className="opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by station, city or code…" />
          <CommandList>
            <CommandEmpty>No station found.</CommandEmpty>
            <CommandGroup>
              {stations
                .filter((s) => !exclude.includes(s.code) || s.code === value)
                .map((station) => (
                  <CommandItem
                    key={station.code}
                    value={`${station.code} ${station.name} ${station.city}`}
                    onSelect={() => {
                      onChange(station.code);
                      setOpen(false);
                    }}
                  >
                    <MapPinIcon className="text-muted-foreground" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{station.name}</span>
                      <span className="text-xs text-muted-foreground">{station.city}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{station.code}</span>
                    <CheckIcon className={cn(value === station.code ? "opacity-100" : "opacity-0")} aria-hidden />
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
