import { format, parseISO } from "date-fns";

const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹4,950 for whole rupees, ₹35.40 when paise are involved. */
export function formatCurrency(amount: number): string {
  return Number.isInteger(amount) ? inrWhole.format(amount) : inrPaise.format(amount);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Formats a yyyy-MM-dd date string. */
export function formatDate(date: string, pattern = "EEE, dd MMM yyyy"): string {
  return format(parseISO(date), pattern);
}

export function formatDateTime(iso: string, pattern = "dd MMM yyyy, HH:mm"): string {
  return format(parseISO(iso), pattern);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function maskMobile(mobile: string): string {
  return mobile.length < 4 ? mobile : `••••••${mobile.slice(-4)}`;
}
