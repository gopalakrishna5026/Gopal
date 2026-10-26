"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRightIcon, SearchIcon } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/shared/date-picker";
import { StationCombobox } from "@/components/shared/station-combobox";
import { useStations } from "@/hooks/use-stations";
import { CLASS_CODES, CLASS_INFO, QUOTA_INFO, QUOTAS } from "@/lib/constants";
import { cn, shiftDateKey, todayKey } from "@/lib/utils";
import { searchSchema, type SearchValues } from "@/lib/validations";
import { useSearchStore, type SearchCriteria } from "@/stores/search-store";
import type { ClassCode, Quota } from "@/types";

function initialValues(criteria: SearchCriteria | null): SearchValues {
  const tomorrow = shiftDateKey(todayKey(), 1);
  return {
    from: criteria?.from ?? "",
    to: criteria?.to ?? "",
    date: criteria && criteria.date >= todayKey() ? criteria.date : tomorrow,
    classCode: criteria?.classCode ?? "ALL",
    quota: criteria?.quota ?? "GN",
  };
}

export function TrainSearchForm({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const { stations, loading } = useStations();
  const criteria = useSearchStore((s) => s.criteria);
  const setCriteria = useSearchStore((s) => s.setCriteria);

  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    values: initialValues(criteria),
    resetOptions: { keepDirtyValues: true },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((v) => {
    setCriteria({
      from: v.from,
      to: v.to,
      date: v.date,
      classCode: v.classCode as ClassCode | "ALL",
      quota: v.quota as Quota,
    });
    router.push("/trains");
  });

  const swap = () => {
    const { from, to } = form.getValues();
    form.setValue("from", to, { shouldDirty: true });
    form.setValue("to", from, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
  };

  const compact = variant === "compact";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Search trains"
      className={cn(
        "grid gap-4",
        compact ? "md:grid-cols-[1fr_auto_1fr_1fr_auto] md:items-start" : "lg:grid-cols-[1fr_auto_1fr] lg:gap-x-3",
      )}
    >
      <Field data-invalid={!!errors.from || undefined}>
        <FieldLabel htmlFor="from">From</FieldLabel>
        {loading ? (
          <Skeleton className="h-[52px]" />
        ) : (
          <Controller
            control={form.control}
            name="from"
            render={({ field }) => (
              <StationCombobox
                id="from"
                stations={stations}
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.from}
                placeholder="Source station"
              />
            )}
          />
        )}
        <FieldError errors={[errors.from]} />
      </Field>

      <div className={cn("flex justify-center", compact ? "md:pt-7" : "lg:pt-7")}>
        <motion.div whileTap={{ rotate: 180 }} transition={{ duration: 0.25 }}>
          <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={swap} aria-label="Swap source and destination">
            <ArrowLeftRightIcon className="rotate-90 lg:rotate-0" />
          </Button>
        </motion.div>
      </div>

      <Field data-invalid={!!errors.to || undefined}>
        <FieldLabel htmlFor="to">To</FieldLabel>
        {loading ? (
          <Skeleton className="h-[52px]" />
        ) : (
          <Controller
            control={form.control}
            name="to"
            render={({ field }) => (
              <StationCombobox
                id="to"
                stations={stations}
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.to}
                placeholder="Destination station"
              />
            )}
          />
        )}
        <FieldError errors={[errors.to]} />
      </Field>

      <div className={cn("grid gap-4 sm:grid-cols-3", compact ? "md:col-span-1 md:grid-cols-1" : "lg:col-span-3")}>
        <Field data-invalid={!!errors.date || undefined}>
          <FieldLabel htmlFor="date">Journey date</FieldLabel>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <DatePicker id="date" value={field.value} onChange={field.onChange} invalid={!!errors.date} />
            )}
          />
          <FieldError errors={[errors.date]} />
        </Field>
        {!compact && (
          <>
            <Field>
              <FieldLabel htmlFor="classCode">Class</FieldLabel>
              <Controller
                control={form.control}
                name="classCode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="classCode" className="h-[52px]! w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectItem value="ALL">All classes</SelectItem>
                        {CLASS_CODES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {CLASS_INFO[c].label} ({c})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="quota">Quota</FieldLabel>
              <Controller
                control={form.control}
                name="quota"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="quota" className="h-[52px]! w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        {QUOTAS.map((q) => (
                          <SelectItem key={q} value={q}>
                            {QUOTA_INFO[q].label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </>
        )}
      </div>

      <div className={cn(compact ? "md:pt-7" : "lg:col-span-3")}>
        <Button
          type="submit"
          size="lg"
          className={cn(
            "w-full bg-highlight text-highlight-foreground hover:bg-highlight/90",
            compact && "h-[52px] md:w-auto",
          )}
        >
          <SearchIcon data-icon="inline-start" />
          {compact ? "Modify search" : "Search trains"}
        </Button>
      </div>
    </form>
  );
}
