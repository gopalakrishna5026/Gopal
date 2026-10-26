import type { Metadata } from "next";
import { PaymentMethodList } from "@/features/payments/payment-method-list";

export const metadata: Metadata = { title: "Payment methods" };

export default function PaymentMethodsPage() {
  return <PaymentMethodList />;
}
