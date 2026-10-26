import { AppError } from "@/lib/errors";
import { nowIso, uid } from "@/lib/utils";
import type { PaymentMethod, PaymentMethodType } from "@/types";
import { getDb } from "../database";

/**
 * What the UI may hand to the repository. Note the absence of a full card number
 * and CVV — the form reduces the PAN to brand + last four digits before calling.
 */
export interface PaymentMethodInput {
  type: PaymentMethodType;
  label: string;
  cardHolder?: string;
  cardBrand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  upiId?: string;
  isDefault?: boolean;
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const items = await getDb().paymentMethods.where("userId").equals(userId).toArray();
  return items.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt.localeCompare(b.createdAt));
}

function sanitise(input: PaymentMethodInput): Omit<PaymentMethodInput, "isDefault"> {
  if (input.type === "UPI") {
    return { type: input.type, label: input.label.trim(), upiId: input.upiId?.trim().toLowerCase() };
  }
  if (!input.last4 || !/^\d{4}$/.test(input.last4)) {
    throw new AppError("INVALID", "Only the last four digits of a card can be stored.");
  }
  return {
    type: input.type,
    label: input.label.trim(),
    cardHolder: input.cardHolder?.trim().toUpperCase(),
    cardBrand: input.cardBrand,
    last4: input.last4,
    expiryMonth: input.expiryMonth,
    expiryYear: input.expiryYear,
  };
}

export async function savePaymentMethod(
  userId: string,
  input: PaymentMethodInput,
  id?: string,
): Promise<PaymentMethod> {
  const db = getDb();
  const clean = sanitise(input);
  const now = nowIso();
  return db.transaction("rw", db.paymentMethods, async () => {
    const existing = await db.paymentMethods.where("userId").equals(userId).toArray();
    const duplicate = existing.find(
      (m) =>
        m.id !== id &&
        m.type === clean.type &&
        (clean.type === "UPI" ? m.upiId === clean.upiId : m.last4 === clean.last4 && m.cardBrand === clean.cardBrand),
    );
    if (duplicate) throw new AppError("DUPLICATE", "This payment method is already saved.");

    const makeDefault = input.isDefault || existing.length === 0 || (id && existing.find((m) => m.id === id)?.isDefault);
    if (makeDefault) {
      await db.paymentMethods.where("userId").equals(userId).modify({ isDefault: false });
    }
    if (id) {
      const current = existing.find((m) => m.id === id);
      if (!current) throw new AppError("NOT_FOUND", "Payment method not found.");
      // Replace card/UPI fields entirely so switching type leaves no stale data.
      const next: PaymentMethod = {
        id,
        userId,
        createdAt: current.createdAt,
        ...clean,
        isDefault: Boolean(makeDefault),
        updatedAt: now,
      };
      await db.paymentMethods.put(next);
      return next;
    }
    const record: PaymentMethod = {
      id: uid(),
      userId,
      ...clean,
      isDefault: Boolean(makeDefault),
      createdAt: now,
      updatedAt: now,
    };
    await db.paymentMethods.add(record);
    return record;
  });
}

export async function setDefaultPaymentMethod(userId: string, id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.paymentMethods, async () => {
    const target = await db.paymentMethods.get(id);
    if (!target || target.userId !== userId) throw new AppError("NOT_FOUND", "Payment method not found.");
    await db.paymentMethods.where("userId").equals(userId).modify({ isDefault: false });
    await db.paymentMethods.update(id, { isDefault: true, updatedAt: nowIso() });
  });
}

export async function deletePaymentMethod(userId: string, id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.paymentMethods, async () => {
    const target = await db.paymentMethods.get(id);
    if (!target || target.userId !== userId) throw new AppError("NOT_FOUND", "Payment method not found.");
    await db.paymentMethods.delete(id);
    if (target.isDefault) {
      const next = await db.paymentMethods.where("userId").equals(userId).first();
      if (next) await db.paymentMethods.update(next.id, { isDefault: true });
    }
  });
}
