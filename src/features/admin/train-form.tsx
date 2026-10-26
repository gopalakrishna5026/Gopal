"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, MapPinPlusIcon, PlusIcon, SaveIcon, Trash2Icon, TrainFrontIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PageHeader } from "@/components/shared/page-header";
import { QueryError } from "@/components/shared/query-state";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StationCombobox } from "@/components/shared/station-combobox";
import { useDbQuery } from "@/hooks/use-db-query";
import { useStations } from "@/hooks/use-stations";
import { CLASS_CODES, CLASS_INFO, TRAIN_TYPES, WEEKDAYS } from "@/lib/constants";
import { createTrain, getTrain, updateTrain, type TrainInput } from "@/lib/db/repositories/trains";
import { AppError, errorMessage } from "@/lib/errors";
import { formatDuration, minutesBetween } from "@/lib/utils";
import { trainSchema, type TrainFormValues } from "@/lib/validations";
import type { ClassCode, TrainType, TrainWithDetails } from "@/types";

const EMPTY: TrainFormValues = {
  number: "",
  name: "",
  type: "Express",
  runDays: [0, 1, 2, 3, 4, 5, 6],
  classes: [{ code: "3A", totalSeats: 288, fare: 1500 }],
  stops: [
    { stationCode: "", arrival: null, departure: "08:00", dayOffset: 0, distanceKm: 0 },
    { stationCode: "", arrival: "16:00", departure: null, dayOffset: 0, distanceKm: 500 },
  ],
};

function toValues(t: TrainWithDetails): TrainFormValues {
  return {
    number: t.number,
    name: t.name,
    type: t.type,
    runDays: t.schedule.runDays,
    classes: t.classes,
    stops: t.route.stops,
  };
}

export function TrainFormPage({ trainId }: { trainId?: string }) {
  const { data, error, loading } = useDbQuery(() => (trainId ? getTrain(trainId) : Promise.resolve(null)), [trainId]);
  if (trainId) {
    if (loading) return <PageSkeleton />;
    if (error) return <QueryError error={error} />;
    if (!data) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrainFrontIcon />
            </EmptyMedia>
            <EmptyTitle>Train not found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/admin/trains">Back to trains</Link>
            </Button>
          </EmptyContent>
        </Empty>
      );
    }
    // Keyed by id: live DB updates while editing do not reset fields the admin is changing.
    return <TrainForm key={data.id} train={data} />;
  }
  return <TrainForm />;
}

function firstError(errors: FieldErrors<TrainFormValues>): string | null {
  if (errors.root?.message) return errors.root.message;
  const count = Object.keys(errors).length;
  return count ? "Please fix the highlighted fields." : null;
}

function TrainForm({ train }: { train?: TrainWithDetails }) {
  const router = useRouter();
  const { stations } = useStations();
  const form = useForm<TrainFormValues>({
    resolver: zodResolver(trainSchema),
    defaultValues: train ? toValues(train) : EMPTY,
    mode: "onTouched",
  });
  const classes = useFieldArray({ control: form.control, name: "classes" });
  const stops = useFieldArray({ control: form.control, name: "stops" });
  const { errors, isSubmitting } = form.formState;
  const watched = useWatch({ control: form.control, name: "stops" });
  const usedClasses = useWatch({ control: form.control, name: "classes" }).map((c) => c.code);

  const first = watched[0];
  const last = watched[watched.length - 1];
  const duration =
    first?.departure && last?.arrival
      ? minutesBetween({ dayOffset: 0, time: first.departure }, { dayOffset: last.dayOffset || 0, time: last.arrival })
      : null;

  const onSubmit = form.handleSubmit(async (values) => {
    const input: TrainInput = {
      ...values,
      type: values.type as TrainType,
      classes: values.classes.map((c) => ({ ...c, code: c.code as ClassCode })),
    };
    try {
      if (train) await updateTrain(train.id, input);
      else await createTrain(input);
      toast.success(train ? `Train ${values.number} updated.` : `Train ${values.number} added. It is now searchable.`);
      router.push("/admin/trains");
    } catch (error) {
      if (error instanceof AppError && error.code === "DUPLICATE") {
        form.setError("number", { message: error.message }, { shouldFocus: true });
      } else {
        form.setError("root", { message: errorMessage(error) });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  });

  const addStop = () => {
    const prev = watched[watched.length - 2];
    const lastStop = watched[watched.length - 1];
    stops.insert(watched.length - 1, {
      stationCode: "",
      arrival: prev?.departure ?? "12:00",
      departure: prev?.departure ?? "12:05",
      dayOffset: prev?.dayOffset ?? 0,
      distanceKm: Math.round(((prev?.distanceKm ?? 0) + (lastStop?.distanceKm ?? 0)) / 2) || 1,
    });
  };

  const summaryError = firstError(errors);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/admin/trains">
          <ArrowLeftIcon data-icon="inline-start" />
          All trains
        </Link>
      </Button>
      <PageHeader
        title={train ? `Edit ${train.number}` : "Add a train"}
        description="Configure route, timings, operating days, classes, seats and fares."
      />

      {summaryError && form.formState.submitCount > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save train</AlertTitle>
          <AlertDescription>{summaryError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-[160px_1fr_200px]">
              <Field data-invalid={!!errors.number || undefined}>
                <FieldLabel htmlFor="t-number">Train number</FieldLabel>
                <Input id="t-number" inputMode="numeric" maxLength={5} aria-invalid={!!errors.number} {...form.register("number")} />
                <FieldError errors={[errors.number]} />
              </Field>
              <Field data-invalid={!!errors.name || undefined}>
                <FieldLabel htmlFor="t-name">Train name</FieldLabel>
                <Input id="t-name" aria-invalid={!!errors.name} {...form.register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="t-type">Type</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="t-type" className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {TRAIN_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <FieldSet data-invalid={!!errors.runDays || undefined}>
              <FieldLegend variant="label">Operating days (from origin)</FieldLegend>
              <Controller
                control={form.control}
                name="runDays"
                render={({ field }) => (
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    spacing={1}
                    className="flex flex-wrap"
                    value={field.value.map(String)}
                    onValueChange={(v) => field.onChange(v.map(Number).sort())}
                    aria-label="Operating days"
                  >
                    {WEEKDAYS.map((d, i) => (
                      <ToggleGroupItem key={d} value={String(i)} className="w-12">{d}</ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
              <FieldError errors={[errors.runDays]} />
            </FieldSet>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Route & timings</CardTitle>
          <CardDescription>
            First row is the source, last row the destination. Day = days after the train leaves its origin.
            {duration !== null && duration > 0 && (
              <>
                {" "}Journey duration: <Badge variant="secondary">{formatDuration(duration)}</Badge>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {stops.fields.map((f, i) => {
            const isFirst = i === 0;
            const isLast = i === stops.fields.length - 1;
            const e = errors.stops?.[i];
            return (
              <fieldset key={f.id} className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,2fr)_1fr_1fr_80px_100px_auto] xl:items-start">
                <legend className="sr-only">{isFirst ? "Source" : isLast ? "Destination" : `Stop ${i}`}</legend>
                <Field data-invalid={!!e?.stationCode || undefined} className="sm:col-span-2 xl:col-span-1">
                  <FieldLabel htmlFor={`s-${i}-station`}>
                    {isFirst ? "Source station" : isLast ? "Destination station" : `Intermediate stop ${i}`}
                  </FieldLabel>
                  <Controller
                    control={form.control}
                    name={`stops.${i}.stationCode`}
                    render={({ field }) => (
                      <StationCombobox
                        id={`s-${i}-station`}
                        stations={stations}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={!!e?.stationCode}
                        exclude={watched.map((s) => s.stationCode).filter(Boolean)}
                      />
                    )}
                  />
                  <FieldError errors={[e?.stationCode]} />
                </Field>
                {(["arrival", "departure"] as const).map((key) => {
                  const disabled = (key === "arrival" && isFirst) || (key === "departure" && isLast);
                  return (
                    <Field key={key} data-invalid={!!e?.[key] || undefined} data-disabled={disabled || undefined}>
                      <FieldLabel htmlFor={`s-${i}-${key}`}>{key === "arrival" ? "Arrival" : "Departure"}</FieldLabel>
                      <Controller
                        control={form.control}
                        name={`stops.${i}.${key}`}
                        render={({ field }) => (
                          <Input
                            id={`s-${i}-${key}`}
                            type="time"
                            disabled={disabled}
                            value={disabled ? "" : field.value ?? ""}
                            onChange={(ev) => field.onChange(ev.target.value || null)}
                            onBlur={field.onBlur}
                            aria-invalid={!!e?.[key]}
                          />
                        )}
                      />
                      <FieldError errors={[e?.[key]]} />
                    </Field>
                  );
                })}
                <Field data-invalid={!!e?.dayOffset || undefined}>
                  <FieldLabel htmlFor={`s-${i}-day`}>Day</FieldLabel>
                  <Input
                    id={`s-${i}-day`}
                    type="number"
                    min={0}
                    max={6}
                    readOnly={isFirst}
                    aria-invalid={!!e?.dayOffset}
                    {...form.register(`stops.${i}.dayOffset`, { valueAsNumber: true })}
                  />
                  <FieldError errors={[e?.dayOffset]} />
                </Field>
                <Field data-invalid={!!e?.distanceKm || undefined}>
                  <FieldLabel htmlFor={`s-${i}-km`}>Km</FieldLabel>
                  <Input
                    id={`s-${i}-km`}
                    type="number"
                    min={0}
                    readOnly={isFirst}
                    aria-invalid={!!e?.distanceKm}
                    {...form.register(`stops.${i}.distanceKm`, { valueAsNumber: true })}
                  />
                  <FieldError errors={[e?.distanceKm]} />
                </Field>
                <div className="flex items-end xl:pt-6">
                  {!isFirst && !isLast && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => stops.remove(i)} aria-label={`Remove stop ${i}`}>
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </fieldset>
            );
          })}
          <Button type="button" variant="outline" className="w-fit border-dashed" onClick={addStop} disabled={stops.fields.length >= 12}>
            <MapPinPlusIcon data-icon="inline-start" />
            Add intermediate stop
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classes, seats & fares</CardTitle>
          <CardDescription>
            Fares are for the full route; shorter journeys are pro-rated by distance. Seat changes apply to
            dates that have no bookings yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {classes.fields.map((f, i) => {
            const e = errors.classes?.[i];
            return (
              <div key={f.id} className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-start">
                <Field data-invalid={!!e?.code || undefined} className="col-span-2 sm:col-span-1">
                  <FieldLabel htmlFor={`c-${i}-code`}>Class</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`classes.${i}.code`}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={`c-${i}-code`} className="w-full" aria-invalid={!!e?.code}><SelectValue /></SelectTrigger>
                        <SelectContent position="popper">
                          <SelectGroup>
                            {CLASS_CODES.map((c) => (
                              <SelectItem key={c} value={c} disabled={c !== field.value && usedClasses.includes(c)}>
                                {CLASS_INFO[c].label} ({c})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[e?.code]} />
                </Field>
                <Field data-invalid={!!e?.totalSeats || undefined}>
                  <FieldLabel htmlFor={`c-${i}-seats`}>Total seats</FieldLabel>
                  <Input id={`c-${i}-seats`} type="number" min={10} aria-invalid={!!e?.totalSeats} {...form.register(`classes.${i}.totalSeats`, { valueAsNumber: true })} />
                  <FieldError errors={[e?.totalSeats]} />
                </Field>
                <Field data-invalid={!!e?.fare || undefined}>
                  <FieldLabel htmlFor={`c-${i}-fare`}>Fare (₹)</FieldLabel>
                  <Input id={`c-${i}-fare`} type="number" min={50} aria-invalid={!!e?.fare} {...form.register(`classes.${i}.fare`, { valueAsNumber: true })} />
                  <FieldError errors={[e?.fare]} />
                </Field>
                <div className="flex items-end sm:pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => classes.remove(i)}
                    disabled={classes.fields.length === 1}
                    aria-label={`Remove class ${i + 1}`}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            );
          })}
          {errors.classes?.root && <FieldError errors={[errors.classes.root]} />}
          <Button
            type="button"
            variant="outline"
            className="w-fit border-dashed"
            disabled={usedClasses.length >= CLASS_CODES.length}
            onClick={() => {
              const next = CLASS_CODES.find((c) => !usedClasses.includes(c))!;
              classes.append({ code: next, totalSeats: 72, fare: 1000 });
            }}
          >
            <PlusIcon data-icon="inline-start" />
            Add class
          </Button>
          <FieldDescription>
            Seats are split per quota: General 70%, Tatkal 15%, Senior Citizen 10%, Ladies 5%.
          </FieldDescription>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t py-3">
          <Button variant="outline" asChild>
            <Link href="/admin/trains">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            {train ? "Save changes" : "Create train"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
