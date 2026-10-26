"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, PlusIcon, Trash2Icon, UserCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDbQuery } from "@/hooks/use-db-query";
import { BERTH_PREFERENCES, GENDERS, MAX_PASSENGERS, QUOTA_INFO, SENIOR_AGE } from "@/lib/constants";
import { listPassengers, savePassenger } from "@/lib/db/repositories/passengers";
import { AppError } from "@/lib/errors";
import { cn, uid } from "@/lib/utils";
import { passengerSchema } from "@/lib/validations";
import { useBookingStore, type PassengerDraft } from "@/stores/booking-store";
import type { Quota, SavedPassenger } from "@/types";

function stepSchema(quota: Quota) {
  const max = quota === "TQ" ? 4 : MAX_PASSENGERS;
  return z
    .object({
      passengers: z
        .array(
          passengerSchema.omit({ mobile: true }).extend({
            key: z.string(),
            savedPassengerId: z.string().optional(),
            saveToProfile: z.boolean(),
          }),
        )
        .min(1, "Add at least one passenger")
        .max(max, `A maximum of ${max} passengers is allowed${quota === "TQ" ? " on Tatkal" : ""}`),
    })
    .superRefine(({ passengers }, ctx) => {
      const seen = new Map<string, number>();
      passengers.forEach((p, i) => {
        const id = `${p.fullName.trim().toLowerCase()}|${p.age}`;
        if (seen.has(id)) {
          ctx.addIssue({ code: "custom", path: ["passengers", i, "fullName"], message: "This passenger is already added" });
        }
        seen.set(id, i);
        if (quota === "LD" && p.gender !== "F") {
          ctx.addIssue({ code: "custom", path: ["passengers", i, "gender"], message: "Ladies quota: female passengers only" });
        }
        if (quota === "SS" && p.age < SENIOR_AGE[p.gender]) {
          ctx.addIssue({
            code: "custom",
            path: ["passengers", i, "age"],
            message: `Senior quota: ${p.gender === "M" ? "60+" : "58+"} years`,
          });
        }
      });
    });
}

type StepValues = { passengers: PassengerDraft[] };

const blankPassenger = (): PassengerDraft => ({
  key: uid(),
  fullName: "",
  age: Number.NaN,
  gender: "M",
  berthPreference: "NP",
  saveToProfile: false,
});

const fromSaved = (p: SavedPassenger): PassengerDraft => ({
  key: uid(),
  savedPassengerId: p.id,
  fullName: p.fullName,
  age: p.age,
  gender: p.gender,
  berthPreference: p.berthPreference,
  saveToProfile: false,
});

export function PassengerStep({ userId, quota, onContinue }: { userId: string; quota: Quota; onContinue: () => void }) {
  const stored = useBookingStore((s) => s.passengers);
  const setPassengers = useBookingStore((s) => s.setPassengers);
  const saved = useDbQuery(() => listPassengers(userId), [userId]);
  const max = quota === "TQ" ? 4 : MAX_PASSENGERS;

  const form = useForm<StepValues>({
    resolver: zodResolver(stepSchema(quota)),
    defaultValues: { passengers: stored.length ? stored : [blankPassenger()] },
    mode: "onTouched",
  });
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "passengers", keyName: "fieldKey" });
  const { errors, isSubmitting } = form.formState;
  const values = useWatch({ control: form.control, name: "passengers" });

  // Persist as the user types, so a refresh or going back never loses entries.
  useEffect(() => {
    setPassengers(values);
  }, [values, setPassengers]);

  const toggleSaved = (p: SavedPassenger) => {
    const idx = values.findIndex((v) => v.savedPassengerId === p.id);
    if (idx >= 0) {
      remove(idx);
      return;
    }
    if (values.length >= max) {
      toast.error(`You can add up to ${max} passengers.`);
      return;
    }
    // Replace an untouched blank row instead of leaving it dangling.
    const blankIdx = values.findIndex((v) => !v.savedPassengerId && !v.fullName && Number.isNaN(v.age));
    if (blankIdx >= 0) update(blankIdx, fromSaved(p));
    else append(fromSaved(p));
  };

  const onSubmit = form.handleSubmit(async ({ passengers }) => {
    setPassengers(passengers);
    const toSave = passengers.filter((p) => p.saveToProfile && !p.savedPassengerId);
    for (const p of toSave) {
      try {
        await savePassenger(userId, { fullName: p.fullName, age: p.age, gender: p.gender, berthPreference: p.berthPreference });
      } catch (error) {
        if (!(error instanceof AppError && error.code === "DUPLICATE")) throw error;
      }
    }
    if (toSave.length) toast.success(`${toSave.length} passenger(s) saved to your profile.`);
    onContinue();
  });

  const rootError = errors.passengers?.root?.message ?? errors.passengers?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Saved passengers</CardTitle>
          <CardDescription>Tap to add or remove from this booking.</CardDescription>
        </CardHeader>
        <CardContent>
          {saved.loading ? (
            <Skeleton className="h-10" />
          ) : !saved.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No saved passengers yet. Tick &quot;Save to my passengers&quot; below to reuse details next time.
            </p>
          ) : (
            <ToggleGroup
              type="multiple"
              variant="outline"
              spacing={2}
              className="flex flex-wrap"
              value={values.filter((v) => v.savedPassengerId).map((v) => v.savedPassengerId!)}
            >
              {saved.data.map((p) => (
                <ToggleGroupItem
                  key={p.id}
                  value={p.id}
                  onClick={() => toggleSaved(p)}
                  className="h-auto gap-2 px-3 py-2"
                  aria-label={`${p.fullName}, ${p.age}`}
                >
                  <UserCheckIcon />
                  <span className="text-sm">{p.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.age} · {p.gender}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passenger details</CardTitle>
          <CardDescription>
            {QUOTA_INFO[quota].label} quota · up to {max} passengers. {QUOTA_INFO[quota].description}
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              {fields.length}/{max}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {fields.map((field, index) => {
            const e = errors.passengers?.[index];
            const fromProfile = !!values[index]?.savedPassengerId;
            return (
              <fieldset key={field.fieldKey} className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
                <legend className="sr-only">Passenger {index + 1}</legend>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    Passenger {index + 1}
                    {fromProfile && <Badge variant="secondary">From saved</Badge>}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    aria-label={`Remove passenger ${index + 1}`}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_0.8fr_1fr_1.2fr]">
                  <Field data-invalid={!!e?.fullName || undefined}>
                    <FieldLabel htmlFor={`p-${index}-name`}>Full name</FieldLabel>
                    <Input id={`p-${index}-name`} aria-invalid={!!e?.fullName} {...form.register(`passengers.${index}.fullName`)} />
                    <FieldError errors={[e?.fullName]} />
                  </Field>
                  <Field data-invalid={!!e?.age || undefined}>
                    <FieldLabel htmlFor={`p-${index}-age`}>Age</FieldLabel>
                    <Input
                      id={`p-${index}-age`}
                      type="number"
                      inputMode="numeric"
                      min={5}
                      max={120}
                      aria-invalid={!!e?.age}
                      {...form.register(`passengers.${index}.age`, { valueAsNumber: true })}
                    />
                    <FieldError errors={[e?.age]} />
                  </Field>
                  <Field data-invalid={!!e?.gender || undefined}>
                    <FieldLabel htmlFor={`p-${index}-gender`}>Gender</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`passengers.${index}.gender`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger id={`p-${index}-gender`} className="w-full" aria-invalid={!!e?.gender}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectGroup>
                              {GENDERS.map((g) => (
                                <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[e?.gender]} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`p-${index}-berth`}>Berth preference</FieldLabel>
                    <Controller
                      control={form.control}
                      name={`passengers.${index}.berthPreference`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger id={`p-${index}-berth`} className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectGroup>
                              {BERTH_PREFERENCES.map((b) => (
                                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </div>
                {!fromProfile && (
                  <Controller
                    control={form.control}
                    name={`passengers.${index}.saveToProfile`}
                    render={({ field: f }) => (
                      <Field orientation="horizontal">
                        <Checkbox id={`p-${index}-save`} checked={f.value} onCheckedChange={(v) => f.onChange(v === true)} />
                        <FieldLabel htmlFor={`p-${index}-save`} className="font-normal">
                          Save to my passengers
                        </FieldLabel>
                      </Field>
                    )}
                  />
                )}
              </fieldset>
            );
          })}

          {rootError && (
            <Alert variant="destructive">
              <AlertDescription>{rootError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            variant="outline"
            className={cn("w-full border-dashed")}
            onClick={() => append(blankPassenger())}
            disabled={fields.length >= max}
          >
            <PlusIcon data-icon="inline-start" />
            Add passenger
          </Button>
          <p className="text-xs text-muted-foreground">
            Berth preferences are honoured when such a berth is free; otherwise the next available berth is
            allotted. Children under 5 travel without a ticket.
          </p>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full md:w-auto">
          Continue to review
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </form>
  );
}
