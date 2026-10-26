"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRoundIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/shared/date-picker";
import { PasswordInput } from "@/components/shared/password-input";
import { BookingStatusBadge } from "@/components/shared/status-badges";
import { useDbQuery } from "@/hooks/use-db-query";
import { GENDERS } from "@/lib/constants";
import { listUserBookings } from "@/lib/db/repositories/bookings";
import { listPassengers } from "@/lib/db/repositories/passengers";
import { listPaymentMethods } from "@/lib/db/repositories/payment-methods";
import { changePassword, updateProfile } from "@/lib/db/repositories/users";
import { AppError, errorMessage } from "@/lib/errors";
import { formatCurrency, formatDate, formatDateTime, initials } from "@/lib/utils";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/lib/validations";
import { useAuthStore } from "@/stores/auth-store";
import type { PublicUser } from "@/types";

export function ProfileOverview() {
  const user = useAuthStore((s) => s.user)!;
  const stats = useDbQuery(async () => {
    const [bookings, passengers, methods] = await Promise.all([
      listUserBookings(user.id),
      listPassengers(user.id),
      listPaymentMethods(user.id),
    ]);
    return { bookings, passengers: passengers.length, methods: methods.length };
  }, [user.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <Avatar className="size-16">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-lg font-semibold">{user.fullName}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
            <span className="text-xs text-muted-foreground">Member since {formatDateTime(user.createdAt, "MMM yyyy")}</span>
          </CardContent>
        </Card>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {[
            { label: "Bookings", value: stats.data?.bookings.length, href: "/my-bookings" },
            { label: "Passengers", value: stats.data?.passengers, href: "/profile/passengers" },
            { label: "Payment methods", value: stats.data?.methods, href: "/profile/payment-methods" },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card size="sm" className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col">
                  <span className="text-2xl font-semibold tabular-nums">{s.value ?? "–"}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <ProfileForm user={user} />
        <Card>
          <CardHeader>
            <CardTitle>Recent bookings</CardTitle>
            <CardDescription>Your latest tickets.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.loading ? (
              <Skeleton className="h-24" />
            ) : !stats.data?.bookings.length ? (
              <p className="text-sm text-muted-foreground">
                No bookings yet.{" "}
                <Link href="/trains" className="font-medium text-brand hover:underline">
                  Find a train
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {stats.data.bookings.slice(0, 4).map((b) => (
                  <li key={b.id}>
                    <Link href={`/my-bookings/${b.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {b.trainNumber} · {b.fromCode} → {b.toCode}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(b.journeyDate)} · PNR {b.pnr}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="hidden tabular-nums sm:inline">{formatCurrency(b.totalAmount)}</span>
                        <BookingStatusBadge status={b.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <ChangePasswordForm userId={user.id} />
      </div>
    </div>
  );
}

function ProfileForm({ user }: { user: PublicUser }) {
  const setUser = useAuthStore((s) => s.setUser);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      mobile: user.mobile,
      dateOfBirth: user.dateOfBirth ?? "",
      gender: user.gender,
      address: user.address ?? "",
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateProfile(user.id, {
        ...values,
        dateOfBirth: values.dateOfBirth || undefined,
        address: values.address || undefined,
      });
      setUser(updated);
      form.reset(values);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal details</CardTitle>
        <CardDescription>Used to pre-fill bookings and on your tickets.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.fullName || undefined}>
                <FieldLabel htmlFor="pf-name">Full name</FieldLabel>
                <Input id="pf-name" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
                <FieldError errors={[errors.fullName]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pf-email">Email</FieldLabel>
                <Input id="pf-email" value={user.email} disabled readOnly />
              </Field>
              <Field data-invalid={!!errors.mobile || undefined}>
                <FieldLabel htmlFor="pf-mobile">Mobile number</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>+91</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput id="pf-mobile" inputMode="numeric" maxLength={10} aria-invalid={!!errors.mobile} {...form.register("mobile")} />
                </InputGroup>
                <FieldError errors={[errors.mobile]} />
              </Field>
              <Field data-invalid={!!errors.dateOfBirth || undefined}>
                <FieldLabel htmlFor="pf-dob">Date of birth</FieldLabel>
                <Controller
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <DatePicker id="pf-dob" mode="past" value={field.value ?? ""} onChange={field.onChange} className="py-1" />
                  )}
                />
                <FieldError errors={[errors.dateOfBirth]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="pf-gender">Gender</FieldLabel>
                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger id="pf-gender" className="w-full">
                        <SelectValue placeholder="Prefer not to say" />
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
              </Field>
            </div>
            <Field data-invalid={!!errors.address || undefined}>
              <FieldLabel htmlFor="pf-address">Address</FieldLabel>
              <Textarea id="pf-address" rows={2} aria-invalid={!!errors.address} {...form.register("address")} />
              <FieldError errors={[errors.address]} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 justify-end border-t py-3">
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ChangePasswordForm({ userId }: { userId: string }) {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await changePassword(userId, v.currentPassword, v.newPassword);
      form.reset();
      toast.success("Password changed.");
    } catch (error) {
      if (error instanceof AppError && error.code === "INVALID") {
        form.setError("currentPassword", { message: error.message });
      } else toast.error(errorMessage(error));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Passwords are hashed with PBKDF2 in your browser (demo-grade only).</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["currentPassword", "Current password", "current-password"],
                ["newPassword", "New password", "new-password"],
                ["confirmPassword", "Confirm new password", "new-password"],
              ] as const
            ).map(([name, label, ac]) => (
              <Field key={name} data-invalid={!!errors[name] || undefined}>
                <FieldLabel htmlFor={`cp-${name}`}>{label}</FieldLabel>
                <PasswordInput id={`cp-${name}`} autoComplete={ac} aria-invalid={!!errors[name]} {...form.register(name)} />
                <FieldError errors={[errors[name]]} />
              </Field>
            ))}
          </div>
        </CardContent>
        <CardFooter className="mt-4 justify-end border-t py-3">
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : <KeyRoundIcon data-icon="inline-start" />}
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
