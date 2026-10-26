"use client";

import { CreditCardIcon, PencilIcon, PlusIcon, ShieldCheckIcon, SmartphoneIcon, StarIcon, Trash2Icon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { QueryError } from "@/components/shared/query-state";
import { ListSkeleton } from "@/components/shared/skeletons";
import { useDbQuery } from "@/hooks/use-db-query";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { deletePaymentMethod, listPaymentMethods, setDefaultPaymentMethod } from "@/lib/db/repositories/payment-methods";
import { errorMessage } from "@/lib/errors";
import { useAuthStore } from "@/stores/auth-store";
import { PaymentMethodDialog } from "./payment-method-dialog";
import { isExpired } from "./payment-utils";

export function PaymentMethodList() {
  const user = useAuthStore((s) => s.user)!;
  const { data, error, loading } = useDbQuery(() => listPaymentMethods(user.id), [user.id]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const addButton = (
    <PaymentMethodDialog
      userId={user.id}
      trigger={
        <Button>
          <PlusIcon data-icon="inline-start" />
          Add method
        </Button>
      }
    />
  );

  if (error) return <QueryError error={error} />;
  if (loading) return <ListSkeleton rows={2} />;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="pm-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="pm-title" className="text-lg font-semibold">Payment methods</h2>
          <p className="text-sm text-muted-foreground">Pick a saved method at checkout in one tap.</p>
        </div>
        {!!data?.length && addButton}
      </div>

      <Alert>
        <ShieldCheckIcon />
        <AlertDescription>
          No real payment is processed. Cards are stored masked (brand + last 4 + expiry); CVV is never stored.
        </AlertDescription>
      </Alert>

      {!data?.length ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WalletIcon />
            </EmptyMedia>
            <EmptyTitle>No saved payment methods</EmptyTitle>
            <EmptyDescription>Add a card or UPI ID for faster checkout.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{addButton}</EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((m) => {
            const Icon = m.type === "UPI" ? SmartphoneIcon : CreditCardIcon;
            const expired = isExpired(m);
            return (
              <li key={m.id}>
                <Card size="sm" className={m.isDefault ? "ring-2 ring-brand" : undefined}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-brand">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex flex-wrap items-center gap-2 font-medium">
                          <span className="truncate">{m.label}</span>
                          {m.isDefault && <Badge>Default</Badge>}
                          {expired && <Badge variant="destructive">Expired</Badge>}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {m.type === "UPI" ? m.upiId : `${m.cardBrand} •••• ${m.last4}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {PAYMENT_METHOD_LABEL[m.type]}
                          {m.type !== "UPI" && ` · ${m.cardHolder} · exp ${String(m.expiryMonth).padStart(2, "0")}/${String(m.expiryYear).slice(-2)}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {!m.isDefault && (
                        <Button variant="ghost" size="sm" onClick={() => run(() => setDefaultPaymentMethod(user.id, m.id), `${m.label} is now your default.`)}>
                          <StarIcon data-icon="inline-start" />
                          Set default
                        </Button>
                      )}
                      <PaymentMethodDialog
                        userId={user.id}
                        method={m}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <PencilIcon data-icon="inline-start" />
                            Edit
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2Icon data-icon="inline-start" />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {m.label}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You can add it again any time.{m.isDefault && " Another saved method will become your default."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => run(() => deletePaymentMethod(user.id, m.id), "Payment method removed.")}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
