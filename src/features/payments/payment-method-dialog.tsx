"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { savePaymentMethod, type PaymentMethodInput } from "@/lib/db/repositories/payment-methods";
import { AppError, errorMessage } from "@/lib/errors";
import {
  detectCardBrand,
  savedCardSchema,
  savedUpiSchema,
  type SavedCardValues,
  type SavedUpiValues,
} from "@/lib/validations";
import type { PaymentMethod } from "@/types";
import { formatCardNumberInput, formatExpiryInput } from "./payment-utils";

/** Editing a card keeps its number; only label, holder, expiry and default flag change. */
const editCardSchema = savedCardSchema.omit({ cardNumber: true });
type EditCardValues = Omit<SavedCardValues, "cardNumber">;

interface Props {
  userId: string;
  method?: PaymentMethod;
  trigger: React.ReactNode;
}

export function PaymentMethodDialog({ userId, method, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"card" | "upi">(method?.type === "UPI" ? "upi" : "card");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{method ? "Edit payment method" : "Add payment method"}</DialogTitle>
          <DialogDescription>
            Simulated only — nothing is charged. We store the card brand, last 4 digits and expiry. Never the
            full number or CVV.
          </DialogDescription>
        </DialogHeader>
        {method ? (
          method.type === "UPI" ? (
            <UpiForm userId={userId} method={method} onDone={() => setOpen(false)} />
          ) : (
            <EditCardForm userId={userId} method={method} onDone={() => setOpen(false)} />
          )
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "card" | "upi")}>
            <TabsList className="w-full">
              <TabsTrigger value="card">Card</TabsTrigger>
              <TabsTrigger value="upi">UPI</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="pt-4">
              <NewCardForm userId={userId} onDone={() => setOpen(false)} />
            </TabsContent>
            <TabsContent value="upi" className="pt-4">
              <UpiForm userId={userId} onDone={() => setOpen(false)} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function persist(userId: string, input: PaymentMethodInput, id: string | undefined, onDone: () => void) {
  try {
    await savePaymentMethod(userId, input, id);
    toast.success(id ? "Payment method updated." : "Payment method saved.");
    onDone();
    return null;
  } catch (error) {
    if (error instanceof AppError && error.code === "DUPLICATE") return error.message;
    toast.error(errorMessage(error));
    return null;
  }
}

function DefaultCheckbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <FieldLabel htmlFor={id} className="font-normal">Make this my default payment method</FieldLabel>
    </Field>
  );
}

function FormFooter({ formId, pending, label }: { formId: string; pending: boolean; label: string }) {
  return (
    <DialogFooter className="mt-4">
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button type="submit" form={formId} disabled={pending}>
        {pending && <Spinner data-icon="inline-start" />}
        {label}
      </Button>
    </DialogFooter>
  );
}

function NewCardForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const form = useForm<SavedCardValues>({
    resolver: zodResolver(savedCardSchema),
    defaultValues: { type: "CREDIT_CARD", label: "", cardHolder: "", cardNumber: "", expiry: "", isDefault: false },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (raw) => {
    const v = savedCardSchema.parse(raw);
    const [mm, yy] = v.expiry.split("/").map(Number);
    // Reduce the PAN to brand + last 4 before it reaches the repository.
    const duplicate = await persist(
      userId,
      {
        type: v.type,
        label: v.label,
        cardHolder: v.cardHolder,
        cardBrand: detectCardBrand(v.cardNumber),
        last4: v.cardNumber.slice(-4),
        expiryMonth: mm,
        expiryYear: 2000 + yy,
        isDefault: v.isDefault,
      },
      undefined,
      onDone,
    );
    if (duplicate) form.setError("cardNumber", { message: duplicate });
  });

  return (
    <form id="new-card-form" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <ToggleGroup type="single" variant="outline" value={field.value} onValueChange={(v) => v && field.onChange(v)} aria-label="Card type">
              <ToggleGroupItem value="CREDIT_CARD" className="px-4">Credit card</ToggleGroupItem>
              <ToggleGroupItem value="DEBIT_CARD" className="px-4">Debit card</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
        <Field data-invalid={!!errors.label || undefined}>
          <FieldLabel htmlFor="nc-label">Nickname</FieldLabel>
          <Input id="nc-label" placeholder="e.g. Travel card" aria-invalid={!!errors.label} {...form.register("label")} />
          <FieldError errors={[errors.label]} />
        </Field>
        <Field data-invalid={!!errors.cardNumber || undefined}>
          <FieldLabel htmlFor="nc-number">Card number</FieldLabel>
          <Controller
            control={form.control}
            name="cardNumber"
            render={({ field }) => (
              <Input
                id="nc-number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4111 1111 1111 1111"
                value={field.value}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(formatCardNumberInput(e.target.value))}
                aria-invalid={!!errors.cardNumber}
              />
            )}
          />
          <FieldDescription>Only the last 4 digits are kept.</FieldDescription>
          <FieldError errors={[errors.cardNumber]} />
        </Field>
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <Field data-invalid={!!errors.cardHolder || undefined}>
            <FieldLabel htmlFor="nc-holder">Name on card</FieldLabel>
            <Input id="nc-holder" aria-invalid={!!errors.cardHolder} {...form.register("cardHolder")} />
            <FieldError errors={[errors.cardHolder]} />
          </Field>
          <Field data-invalid={!!errors.expiry || undefined}>
            <FieldLabel htmlFor="nc-expiry">Expiry</FieldLabel>
            <Controller
              control={form.control}
              name="expiry"
              render={({ field }) => (
                <Input
                  id="nc-expiry"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(formatExpiryInput(e.target.value))}
                  aria-invalid={!!errors.expiry}
                />
              )}
            />
            <FieldError errors={[errors.expiry]} />
          </Field>
        </div>
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => <DefaultCheckbox id="nc-default" checked={field.value} onChange={field.onChange} />}
        />
      </FieldGroup>
      <FormFooter formId="new-card-form" pending={isSubmitting} label="Save card" />
    </form>
  );
}

function EditCardForm({ userId, method, onDone }: { userId: string; method: PaymentMethod; onDone: () => void }) {
  const form = useForm<EditCardValues>({
    resolver: zodResolver(editCardSchema),
    defaultValues: {
      type: method.type as "CREDIT_CARD" | "DEBIT_CARD",
      label: method.label,
      cardHolder: method.cardHolder ?? "",
      expiry: method.expiryMonth && method.expiryYear
        ? `${String(method.expiryMonth).padStart(2, "0")}/${String(method.expiryYear).slice(-2)}`
        : "",
      isDefault: method.isDefault,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (v) => {
    const [mm, yy] = v.expiry.split("/").map(Number);
    await persist(
      userId,
      {
        type: v.type,
        label: v.label,
        cardHolder: v.cardHolder,
        cardBrand: method.cardBrand,
        last4: method.last4,
        expiryMonth: mm,
        expiryYear: 2000 + yy,
        isDefault: v.isDefault,
      },
      method.id,
      onDone,
    );
  });

  return (
    <form id="edit-card-form" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ec-number">Card</FieldLabel>
          <Input id="ec-number" value={`${method.cardBrand ?? "Card"} •••• ${method.last4}`} disabled readOnly />
          <FieldDescription>To use a different card number, add a new card.</FieldDescription>
        </Field>
        <Field data-invalid={!!errors.label || undefined}>
          <FieldLabel htmlFor="ec-label">Nickname</FieldLabel>
          <Input id="ec-label" aria-invalid={!!errors.label} {...form.register("label")} />
          <FieldError errors={[errors.label]} />
        </Field>
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <Field data-invalid={!!errors.cardHolder || undefined}>
            <FieldLabel htmlFor="ec-holder">Name on card</FieldLabel>
            <Input id="ec-holder" aria-invalid={!!errors.cardHolder} {...form.register("cardHolder")} />
            <FieldError errors={[errors.cardHolder]} />
          </Field>
          <Field data-invalid={!!errors.expiry || undefined}>
            <FieldLabel htmlFor="ec-expiry">Expiry</FieldLabel>
            <Controller
              control={form.control}
              name="expiry"
              render={({ field }) => (
                <Input
                  id="ec-expiry"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(formatExpiryInput(e.target.value))}
                  aria-invalid={!!errors.expiry}
                />
              )}
            />
            <FieldError errors={[errors.expiry]} />
          </Field>
        </div>
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => <DefaultCheckbox id="ec-default" checked={field.value} onChange={field.onChange} />}
        />
      </FieldGroup>
      <FormFooter formId="edit-card-form" pending={isSubmitting} label="Save changes" />
    </form>
  );
}

function UpiForm({ userId, method, onDone }: { userId: string; method?: PaymentMethod; onDone: () => void }) {
  const form = useForm<SavedUpiValues>({
    resolver: zodResolver(savedUpiSchema),
    defaultValues: { type: "UPI", label: method?.label ?? "", upiId: method?.upiId ?? "", isDefault: method?.isDefault ?? false },
  });
  const { errors, isSubmitting } = form.formState;
  const formId = method ? "edit-upi-form" : "new-upi-form";

  const onSubmit = form.handleSubmit(async (raw) => {
    const v = savedUpiSchema.parse(raw);
    const duplicate = await persist(userId, { type: "UPI", label: v.label, upiId: v.upiId, isDefault: v.isDefault }, method?.id, onDone);
    if (duplicate) form.setError("upiId", { message: duplicate });
  });

  return (
    <form id={formId} onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.label || undefined}>
          <FieldLabel htmlFor={`${formId}-label`}>Nickname</FieldLabel>
          <Input id={`${formId}-label`} placeholder="e.g. Personal UPI" aria-invalid={!!errors.label} {...form.register("label")} />
          <FieldError errors={[errors.label]} />
        </Field>
        <Field data-invalid={!!errors.upiId || undefined}>
          <FieldLabel htmlFor={`${formId}-vpa`}>UPI ID</FieldLabel>
          <Input id={`${formId}-vpa`} placeholder="name@bank" autoComplete="off" aria-invalid={!!errors.upiId} {...form.register("upiId")} />
          <FieldDescription>Simulated UPI — no collect request is actually sent.</FieldDescription>
          <FieldError errors={[errors.upiId]} />
        </Field>
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => <DefaultCheckbox id={`${formId}-default`} checked={field.value} onChange={field.onChange} />}
        />
      </FieldGroup>
      <FormFooter formId={formId} pending={isSubmitting} label={method ? "Save changes" : "Save UPI ID"} />
    </form>
  );
}
