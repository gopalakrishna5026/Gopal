"use client";

import { useState } from "react";
import { addDays, format, startOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ADVANCE_BOOKING_DAYS } from "@/lib/constants";
import { cn, parseDateKey, toDateKey } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (dateKey: string) => void;
  invalid?: boolean;
  className?: string;
  /** Allow dates in the past (e.g. date of birth). Defaults to journey-date rules. */
  mode?: "journey" | "past";
}

export function DatePicker({ id, value, onChange, invalid, className, mode = "journey" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDateKey(value) : undefined;
  const today = startOfDay(new Date());
  const disabled =
    mode === "journey"
      ? [{ before: today }, { after: addDays(today, ADVANCE_BOOKING_DAYS) }]
      : [{ after: addDays(today, -365 * 5) }];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={invalid || undefined}
          className={cn("h-auto min-h-9 w-full justify-start bg-background px-3 py-2 text-left font-normal", className)}
        >
          <CalendarIcon className="text-muted-foreground" aria-hidden />
          {selected ? (
            <span className="flex flex-col">
              <span className="font-medium">{format(selected, "dd MMM yyyy")}</span>
              <span className="text-xs text-muted-foreground">{format(selected, "EEEE")}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          captionLayout={mode === "past" ? "dropdown" : "label"}
          startMonth={mode === "past" ? new Date(1920, 0) : today}
          endMonth={mode === "past" ? today : addDays(today, ADVANCE_BOOKING_DAYS)}
          disabled={disabled}
          onSelect={(date) => {
            if (date) {
              onChange(toDateKey(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
