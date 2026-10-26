import { addDays, format, parseISO, startOfDay } from "date-fns";

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function shiftDateKey(dateKey: string, days: number): string {
  return toDateKey(addDays(parseISO(dateKey), days));
}

export function parseDateKey(dateKey: string): Date {
  return startOfDay(parseISO(dateKey));
}

/** Combines a yyyy-MM-dd date, a day offset and HH:mm into a local ISO timestamp. */
export function combineDateTime(dateKey: string, dayOffset: number, hhmm: string): string {
  const base = parseDateKey(shiftDateKey(dateKey, dayOffset));
  base.setMinutes(toMinutes(hhmm));
  return base.toISOString();
}

/** Minutes between two (dayOffset, HH:mm) points on a route. */
export function minutesBetween(
  from: { dayOffset: number; time: string },
  to: { dayOffset: number; time: string },
): number {
  return to.dayOffset * 1440 + toMinutes(to.time) - (from.dayOffset * 1440 + toMinutes(from.time));
}

export function nowIso(): string {
  return new Date().toISOString();
}
