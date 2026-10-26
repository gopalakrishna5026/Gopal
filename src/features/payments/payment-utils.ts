import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import type { PaymentMethod } from "@/types";

export function formatCardNumberInput(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function describeMethod(m: PaymentMethod): string {
  if (m.type === "UPI") return `UPI · ${m.upiId}`;
  return `${m.cardBrand ?? "Card"} ${PAYMENT_METHOD_LABEL[m.type]} •••• ${m.last4}`;
}

export function isExpired(m: PaymentMethod): boolean {
  if (m.type === "UPI" || !m.expiryMonth || !m.expiryYear) return false;
  return new Date(m.expiryYear, m.expiryMonth, 0, 23, 59, 59) < new Date();
}
