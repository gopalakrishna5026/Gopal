"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { BERTH_PREFERENCES, GENDERS } from "@/lib/constants";
import { savePassenger } from "@/lib/db/repositories/passengers";
import { AppError, errorMessage } from "@/lib/errors";
import { passengerSchema, type PassengerValues } from "@/lib/validations";
import type { SavedPassenger } from "@/types";

interface Props {
  userId: string;
  passenger?: SavedPassenger;
  trigger: React.ReactNode;
}

export function PassengerFormDialog({ userId, passenger, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const defaults: PassengerValues = passenger
    ? {
        fullName: passenger.fullName,
        age: passenger.age,
        gender: passenger.gender,
        berthPreference: passenger.berthPreference,
        mobile: passenger.mobile ?? "",
      }
    : { fullName: "", age: Number.NaN, gender: "M", berthPreference: "NP", mobile: "" };

  const form = useForm<PassengerValues>({ resolver: zodResolver(passengerSchema), defaultValues: defaults });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await savePassenger(userId, { ...values, mobile: values.mobile || undefined }, passenger?.id);
      toast.success(passenger ? "Passenger updated." : `${values.fullName} added to your passengers.`);
      setOpen(false);
    } catch (error) {
      if (error instanceof AppError && error.code === "DUPLICATE") form.setError("fullName", { message: error.message });
      else toast.error(errorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) form.reset(defaults);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{passenger ? "Edit passenger" : "Add passenger"}</DialogTitle>
          <DialogDescription>Saved passengers can be added to any booking with one tap.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate id="passenger-form">
          <FieldGroup>
            <Field data-invalid={!!errors.fullName || undefined}>
              <FieldLabel htmlFor="ps-name">Full name</FieldLabel>
              <Input id="ps-name" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
              <FieldDescription>As on a government photo ID.</FieldDescription>
              <FieldError errors={[errors.fullName]} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!errors.age || undefined}>
                <FieldLabel htmlFor="ps-age">Age</FieldLabel>
                <Input id="ps-age" type="number" inputMode="numeric" min={5} max={120} aria-invalid={!!errors.age} {...form.register("age", { valueAsNumber: true })} />
                <FieldError errors={[errors.age]} />
              </Field>
              <Field data-invalid={!!errors.gender || undefined}>
                <FieldLabel htmlFor="ps-gender">Gender</FieldLabel>
                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="ps-gender" className="w-full"><SelectValue /></SelectTrigger>
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
                <FieldError errors={[errors.gender]} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ps-berth">Berth preference</FieldLabel>
              <Controller
                control={form.control}
                name="berthPreference"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ps-berth" className="w-full"><SelectValue /></SelectTrigger>
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
            <Field data-invalid={!!errors.mobile || undefined}>
              <FieldLabel htmlFor="ps-mobile">Mobile number (optional)</FieldLabel>
              <Input id="ps-mobile" inputMode="numeric" maxLength={10} aria-invalid={!!errors.mobile} {...form.register("mobile")} />
              <FieldError errors={[errors.mobile]} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="passenger-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {passenger ? "Save changes" : "Add passenger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
