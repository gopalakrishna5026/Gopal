"use client";

import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeftIcon,
  CircleXIcon,
  CreditCardIcon,
  FlaskConicalIcon,
  LockIcon,
  RotateCwIcon,
  SmartphoneIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDbQuery } from "@/hooks/use-db-query";
import { createBooking, recordUnbookedPayment } from "@/lib/db/repositories/bookings";
import { listPaymentMethods, savePaymentMethod } from "@/lib/db/repositories/payment-methods";
import { AppError, errorMessage } from "@/lib/errors";
import { bookingTotals } from "@/lib/rules/fare";
import { cn, formatCurrency } from "@/lib/utils";
import { checkoutCardSchema, cvvSchema, detectCardBrand, upiIdSchema, type CheckoutCardValues } from "@/lib/validations";
import { useBookingStore, type BookingDraft } from "@/stores/booking-store";
import type { Booking, PaymentMethod, PaymentMethodType } from "@/types";
import { describeMethod, formatCardNumberInput, formatExpiryInput, isExpired } from "./payment-utils";

const upiFormSchema = z.object({ upiId: upiIdSchema, save: z.boolean() });
type UpiFormValues = z.input<typeof upiFormSchema>;

type Phase =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "declined"; reason: string }
  | { kind: "booking-failed"; reason: string; code?: string };

interface Props {
  userId: string;
  draft: BookingDraft;
  fare: number;
  onBack: () => void;
  onSuccess: (booking: Booking) => void;
}

const SIMULATED_LATENCY_MS = 1600;

export function PaymentStep({ userId, draft, fare, onBack, onSuccess }: Props) {
  const { passengers, attemptId, bookOnlyIfConfirmed, payment, setPayment } = useBookingStore();
  const methods = useDbQuery(() => listPaymentMethods(userId), [userId]);
  const totals = bookingTotals(passengers.map(() => fare));
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [outcome, setOutcome] = useState<"approve" | "decline">("approve");
  const [cvv, setCvv] = useState("");
  const [cvvError, setCvvError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const cardForm = useForm<CheckoutCardValues>({
    resolver: zodResolver(checkoutCardSchema),
    defaultValues: { type: "DEBIT_CARD", cardHolder: "", cardNumber: "", expiry: "", cvv: "", save: false },
  });
  const upiForm = useForm<UpiFormValues>({
    resolver: zodResolver(upiFormSchema),
    defaultValues: { upiId: "", save: false },
  });

  const saved = methods.data ?? [];
  const fallback = saved.find((m) => m.isDefault && !isExpired(m)) ?? saved.find((m) => !isExpired(m));
  const selection =
    payment && (payment.kind === "new" || saved.some((m) => m.id === payment.methodId))
      ? payment
      : fallback
        ? ({ kind: "saved", methodId: fallback.id } as const)
        : ({ kind: "new", type: "UPI" } as const);
  const selectedSaved = selection.kind === "saved" ? saved.find((m) => m.id === selection.methodId) : undefined;
  const radioValue = selection.kind === "saved" ? `saved:${selection.methodId}` : `new:${selection.type}`;

  /** Validates the chosen method and returns what to record. Never returns CVV or full PAN. */
  async function collectMethod(): Promise<
    | { methodType: PaymentMethodType; methodLabel: string; toSave?: Parameters<typeof savePaymentMethod>[1] }
    | null
  > {
    if (selection.kind === "saved") {
      if (!selectedSaved) return null;
      if (isExpired(selectedSaved)) {
        setCvvError("This card has expired. Choose another method.");
        return null;
      }
      if (selectedSaved.type !== "UPI") {
        const parsed = cvvSchema.safeParse(cvv);
        if (!parsed.success) {
          setCvvError(parsed.error.issues[0].message);
          return null;
        }
      }
      setCvvError(null);
      return { methodType: selectedSaved.type, methodLabel: describeMethod(selectedSaved) };
    }
    if (selection.type === "UPI") {
      let result: UpiFormValues | null = null;
      await upiForm.handleSubmit((v) => {
        result = v;
      })();
      if (!result) return null;
      const { upiId, save } = upiFormSchema.parse(result);
      return {
        methodType: "UPI",
        methodLabel: `UPI · ${upiId}`,
        toSave: save ? { type: "UPI", label: "UPI", upiId } : undefined,
      };
    }
    let card: CheckoutCardValues | null = null;
    await cardForm.handleSubmit((v) => {
      card = v;
    })();
    if (!card) return null;
    const parsed = checkoutCardSchema.parse(card);
    const brand = detectCardBrand(parsed.cardNumber);
    const last4 = parsed.cardNumber.slice(-4);
    const [mm, yy] = parsed.expiry.split("/").map(Number);
    // The CVV and full number go out of scope here; only masked details are kept.
    return {
      methodType: parsed.type,
      methodLabel: `${brand} •••• ${last4}`,
      toSave: parsed.save
        ? {
            type: parsed.type,
            label: `${brand} card`,
            cardHolder: parsed.cardHolder,
            cardBrand: brand,
            last4,
            expiryMonth: mm,
            expiryYear: 2000 + yy,
          }
        : undefined,
    };
  }

  async function pay() {
    if (inFlight.current) return; // duplicate-submission guard
    inFlight.current = true;
    try {
      const method = await collectMethod();
      if (!method) return;
      setPhase({ kind: "processing" });
      await new Promise((r) => setTimeout(r, SIMULATED_LATENCY_MS));

      if (outcome === "decline") {
        const reason = "Payment declined by the issuer (simulated).";
        await recordUnbookedPayment({
          userId,
          attemptId,
          amount: totals.totalAmount,
          methodType: method.methodType,
          methodLabel: method.methodLabel,
          status: "FAILED",
          failureReason: reason,
        });
        setPhase({ kind: "declined", reason });
        return;
      }

      try {
        const booking = await createBooking({
          userId,
          attemptId,
          ...draft,
          passengers: passengers.map(({ fullName, age, gender, berthPreference }) => ({ fullName, age, gender, berthPreference })),
          bookOnlyIfConfirmed,
          expectedTotal: totals.totalAmount,
          payment: { methodType: method.methodType, methodLabel: method.methodLabel },
        });
        if (method.toSave) {
          await savePaymentMethod(userId, method.toSave).catch(() => undefined); // duplicates are fine
        }
        onSuccess(booking);
      } catch (error) {
        await recordUnbookedPayment({
          userId,
          attemptId,
          amount: totals.totalAmount,
          methodType: method.methodType,
          methodLabel: method.methodLabel,
          status: "REVERSED",
          failureReason: errorMessage(error),
        }).catch(() => undefined);
        setPhase({
          kind: "booking-failed",
          reason: errorMessage(error),
          code: error instanceof AppError ? error.code : undefined,
        });
      }
    } catch (error) {
      setPhase({ kind: "booking-failed", reason: errorMessage(error) });
    } finally {
      inFlight.current = false;
    }
  }

  if (phase.kind === "declined" || phase.kind === "booking-failed") {
    const declined = phase.kind === "declined";
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            {declined ? <CircleXIcon className="size-7" aria-hidden /> : <TriangleAlertIcon className="size-7" aria-hidden />}
          </span>
          <CardTitle className="text-xl">{declined ? "Payment failed" : "Booking could not be completed"}</CardTitle>
          <CardDescription>{phase.reason}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {declined
                ? "No money was taken. You can retry with the same or a different method — your passengers are saved."
                : `Your payment of ${formatCurrency(totals.totalAmount)} has been automatically reversed (simulated). No ticket was issued.`}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon data-icon="inline-start" />
            Back to review
          </Button>
          <Button onClick={() => setPhase({ kind: "idle" })}>
            <RotateCwIcon data-icon="inline-start" />
            {declined ? "Retry payment" : "Try again"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert>
        <FlaskConicalIcon />
        <AlertTitle>Mock payment gateway</AlertTitle>
        <AlertDescription>
          No real payment is processed and no provider is contacted. Card numbers are reduced to the last 4
          digits; CVVs are validated and immediately discarded.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Choose a payment method</CardTitle>
          <CardDescription>Amount payable: {formatCurrency(totals.totalAmount)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {methods.loading ? (
            <Skeleton className="h-32" />
          ) : (
            <RadioGroup
              value={radioValue}
              onValueChange={(v) => {
                const [kind, rest] = v.split(":");
                setCvv("");
                setCvvError(null);
                setPayment(kind === "saved" ? { kind: "saved", methodId: rest } : { kind: "new", type: rest as PaymentMethodType });
              }}
              aria-label="Payment method"
              className="flex flex-col gap-2"
            >
              {saved.map((m) => (
                <MethodOption key={m.id} value={`saved:${m.id}`} active={radioValue === `saved:${m.id}`} method={m} />
              ))}
              <MethodOption value="new:UPI" active={radioValue === "new:UPI"} title="New UPI ID" icon={SmartphoneIcon} />
              <MethodOption value="new:DEBIT_CARD" active={selection.kind === "new" && selection.type !== "UPI"} title="New credit / debit card" icon={CreditCardIcon} />
            </RadioGroup>
          )}

          {selectedSaved && selectedSaved.type !== "UPI" && (
            <Field data-invalid={!!cvvError || undefined} className="max-w-48">
              <FieldLabel htmlFor="saved-cvv">CVV for •••• {selectedSaved.last4}</FieldLabel>
              <Input
                id="saved-cvv"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!cvvError}
              />
              {cvvError && <FieldError>{cvvError}</FieldError>}
            </Field>
          )}
          {selectedSaved?.type === "UPI" && (
            <p className="text-sm text-muted-foreground">
              A collect request will be &quot;sent&quot; to {selectedSaved.upiId} (simulated).
            </p>
          )}

          {selection.kind === "new" && selection.type === "UPI" && (
            <FieldGroup className="max-w-md">
              <Field data-invalid={!!upiForm.formState.errors.upiId || undefined}>
                <FieldLabel htmlFor="upi-id">UPI ID</FieldLabel>
                <Input id="upi-id" placeholder="name@bank" autoComplete="off" aria-invalid={!!upiForm.formState.errors.upiId} {...upiForm.register("upiId")} />
                <FieldError errors={[upiForm.formState.errors.upiId]} />
              </Field>
              <Controller
                control={upiForm.control}
                name="save"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <Checkbox id="upi-save" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                    <FieldLabel htmlFor="upi-save" className="font-normal">Save this UPI ID for future bookings</FieldLabel>
                  </Field>
                )}
              />
            </FieldGroup>
          )}

          {selection.kind === "new" && selection.type !== "UPI" && <NewCardFields form={cardForm} />}
        </CardContent>
      </Card>

      <Card size="sm" className="border-dashed">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-sm font-medium">
              <FlaskConicalIcon className="size-4 text-highlight" aria-hidden /> Simulated bank response
            </span>
            <span className="text-xs text-muted-foreground">Choose how the mock gateway should respond.</span>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={outcome}
            onValueChange={(v) => v && setOutcome(v as "approve" | "decline")}
            aria-label="Simulated payment outcome"
          >
            <ToggleGroupItem value="approve" className="px-4">Approve</ToggleGroupItem>
            <ToggleGroupItem value="decline" className="px-4">Decline</ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:justify-between md:border-0 md:bg-transparent md:p-0">
        <Button variant="outline" size="lg" onClick={onBack} disabled={phase.kind === "processing"}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={pay}
          disabled={phase.kind === "processing" || methods.loading || passengers.length === 0}
          className="flex-1 bg-highlight text-highlight-foreground hover:bg-highlight/90 md:flex-none"
        >
          {phase.kind === "processing" ? <Spinner data-icon="inline-start" /> : <LockIcon data-icon="inline-start" />}
          Pay {formatCurrency(totals.totalAmount)}
        </Button>
      </div>

      <Dialog open={phase.kind === "processing"}>
        <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="items-center text-center">
            <Spinner className="mb-2 size-8 text-brand" />
            <DialogTitle>Processing payment…</DialogTitle>
            <DialogDescription>
              Contacting the simulated bank and reserving your berths. Please don&apos;t close or refresh this page.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MethodOption({
  value,
  active,
  method,
  title,
  icon: Icon,
}: {
  value: string;
  active: boolean;
  method?: PaymentMethod;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const expired = method ? isExpired(method) : false;
  const MethodIcon = Icon ?? (method?.type === "UPI" ? SmartphoneIcon : CreditCardIcon);
  return (
    <label
      htmlFor={value}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-brand/60",
        active && "border-brand bg-accent",
        expired && "cursor-not-allowed opacity-60",
      )}
    >
      <RadioGroupItem id={value} value={value} disabled={expired} />
      <MethodIcon className="size-4 text-brand" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{method ? method.label : title}</span>
        {method && <span className="truncate text-xs text-muted-foreground">{describeMethod(method)}</span>}
      </span>
      {method?.isDefault && <Badge variant="secondary">Default</Badge>}
      {expired && <Badge variant="destructive">Expired</Badge>}
    </label>
  );
}

function NewCardFields({ form }: { form: ReturnType<typeof useForm<CheckoutCardValues>> }) {
  const { errors } = form.formState;
  return (
    <FieldGroup className="max-w-xl">
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <ToggleGroup type="single" variant="outline" value={field.value} onValueChange={(v) => v && field.onChange(v)} aria-label="Card type">
            <ToggleGroupItem value="DEBIT_CARD" className="px-4">Debit card</ToggleGroupItem>
            <ToggleGroupItem value="CREDIT_CARD" className="px-4">Credit card</ToggleGroupItem>
          </ToggleGroup>
        )}
      />
      <Field data-invalid={!!errors.cardNumber || undefined}>
        <FieldLabel htmlFor="card-number">Card number</FieldLabel>
        <Controller
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <Input
              id="card-number"
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
        <FieldError errors={[errors.cardNumber]} />
      </Field>
      <Field data-invalid={!!errors.cardHolder || undefined}>
        <FieldLabel htmlFor="card-holder">Name on card</FieldLabel>
        <Input id="card-holder" autoComplete="off" aria-invalid={!!errors.cardHolder} {...form.register("cardHolder")} />
        <FieldError errors={[errors.cardHolder]} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!errors.expiry || undefined}>
          <FieldLabel htmlFor="card-expiry">Expiry (MM/YY)</FieldLabel>
          <Controller
            control={form.control}
            name="expiry"
            render={({ field }) => (
              <Input
                id="card-expiry"
                inputMode="numeric"
                autoComplete="off"
                placeholder="08/29"
                value={field.value}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(formatExpiryInput(e.target.value))}
                aria-invalid={!!errors.expiry}
              />
            )}
          />
          <FieldError errors={[errors.expiry]} />
        </Field>
        <Field data-invalid={!!errors.cvv || undefined}>
          <FieldLabel htmlFor="card-cvv">CVV</FieldLabel>
          <Input id="card-cvv" type="password" inputMode="numeric" maxLength={4} autoComplete="off" aria-invalid={!!errors.cvv} {...form.register("cvv")} />
          <FieldError errors={[errors.cvv]} />
        </Field>
      </div>
      <Controller
        control={form.control}
        name="save"
        render={({ field }) => (
          <Field orientation="horizontal">
            <Checkbox id="card-save" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            <FieldLabel htmlFor="card-save" className="font-normal">
              Save card (only brand, last 4 digits and expiry are stored)
            </FieldLabel>
          </Field>
        )}
      />
      <p className="text-xs text-muted-foreground">Test card: 4111 1111 1111 1111 · any future expiry · any 3-digit CVV.</p>
    </FieldGroup>
  );
}
