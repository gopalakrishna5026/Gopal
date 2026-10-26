"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CLASS_INFO } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useSearchStore, type TimeSlot } from "@/stores/search-store";
import type { ClassCode, TrainType } from "@/types";
import { TIME_SLOTS } from "./filter-utils";

interface Props {
  availableTypes: TrainType[];
  availableClasses: ClassCode[];
  bounds: [number, number];
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function SearchFilters({ availableTypes, availableClasses, bounds }: Props) {
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const resetFilters = useSearchStore((s) => s.resetFilters);
  const [min, max] = bounds;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        <Button variant="link" size="sm" onClick={resetFilters} className="px-0">
          Reset all
        </Button>
      </div>

      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="only-available">Available seats only</FieldLabel>
        </FieldContent>
        <Switch
          id="only-available"
          checked={filters.onlyAvailable}
          onCheckedChange={(onlyAvailable) => setFilters({ onlyAvailable })}
        />
      </Field>

      <Separator />

      {(["departureSlots", "arrivalSlots"] as const).map((key) => (
        <FieldSet key={key}>
          <FieldLegend variant="label">{key === "departureSlots" ? "Departure time" : "Arrival time"}</FieldLegend>
          <ToggleGroup
            type="multiple"
            variant="outline"
            spacing={2}
            className="grid w-full grid-cols-2"
            value={filters[key]}
            onValueChange={(value) => setFilters({ [key]: value as TimeSlot[] })}
          >
            {TIME_SLOTS.map((slot) => (
              <ToggleGroupItem
                key={slot.value}
                value={slot.value}
                className="h-auto flex-col items-start gap-0 px-2.5 py-2 text-left"
                aria-label={`${slot.label} ${slot.range}`}
              >
                <span className="text-xs font-medium">{slot.label}</span>
                <span className="text-[11px] text-muted-foreground">{slot.range}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>
      ))}

      <Separator />

      <FieldSet>
        <FieldLegend variant="label">Travel class</FieldLegend>
        <div className="flex flex-col gap-2.5">
          {availableClasses.map((code) => (
            <Field key={code} orientation="horizontal">
              <Checkbox
                id={`class-${code}`}
                checked={filters.classes.includes(code)}
                onCheckedChange={() => setFilters({ classes: toggle(filters.classes, code) })}
              />
              <FieldLabel htmlFor={`class-${code}`} className="font-normal">
                {CLASS_INFO[code].label} ({code})
              </FieldLabel>
            </Field>
          ))}
        </div>
      </FieldSet>

      <Separator />

      <FieldSet>
        <FieldLegend variant="label">Train type</FieldLegend>
        <div className="flex flex-col gap-2.5">
          {availableTypes.map((type) => (
            <Field key={type} orientation="horizontal">
              <Checkbox
                id={`type-${type}`}
                checked={filters.trainTypes.includes(type)}
                onCheckedChange={() => setFilters({ trainTypes: toggle(filters.trainTypes, type) })}
              />
              <FieldLabel htmlFor={`type-${type}`} className="font-normal">
                {type}
              </FieldLabel>
            </Field>
          ))}
        </div>
      </FieldSet>

      {max > min && (
        <>
          <Separator />
          <FieldSet>
            <FieldLegend variant="label">Max fare per passenger</FieldLegend>
            <Slider
              min={min}
              max={max}
              step={10}
              value={[filters.maxPrice ?? max]}
              onValueChange={([v]) => setFilters({ maxPrice: v >= max ? null : v })}
              aria-label="Maximum fare"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(min)}</span>
              <span className="font-medium text-foreground">
                Up to {formatCurrency(filters.maxPrice ?? max)}
              </span>
            </div>
          </FieldSet>
        </>
      )}
    </div>
  );
}
