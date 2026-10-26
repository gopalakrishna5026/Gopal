import { addDays, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { z } from "zod";
import { ADVANCE_BOOKING_DAYS, CLASS_CODES, QUOTAS, TRAIN_TYPES } from "@/lib/constants";

const nameRegex = /^[A-Za-z][A-Za-z .'-]*$/;
export const mobileRegex = /^[6-9]\d{9}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const fullName = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters")
  .max(60, "Keep it under 60 characters")
  .regex(nameRegex, "Use letters, spaces, dots, apostrophes or hyphens only");

const mobile = z.string().trim().regex(mobileRegex, "Enter a valid 10-digit Indian mobile number");

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(64, "Keep it under 64 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a special character");

export const registerSchema = z
  .object({
    fullName,
    email: z.email("Enter a valid email address").trim(),
    mobile,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").trim(),
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  fullName,
  mobile,
  dateOfBirth: z
    .string()
    .optional()
    .refine((v) => !v || isBefore(parseISO(v), addDays(new Date(), -365 * 5)), "Enter a valid date of birth"),
  gender: z.enum(["M", "F", "T"]).optional(),
  address: z.string().trim().max(200, "Keep the address under 200 characters").optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must differ from the current one",
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const passengerSchema = z.object({
  fullName: fullName.max(50, "Keep it under 50 characters"),
  age: z
    .number({ error: "Enter age" })
    .int("Age must be a whole number")
    .min(5, "Children under 5 travel without a ticket")
    .max(120, "Enter a valid age"),
  gender: z.enum(["M", "F", "T"], { error: "Select gender" }),
  berthPreference: z.enum(["LB", "MB", "UB", "SL", "SU", "NP"]),
  mobile: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || mobileRegex.test(v), "Enter a valid 10-digit mobile number"),
});
export type PassengerValues = z.infer<typeof passengerSchema>;

export const searchSchema = z
  .object({
    from: z.string().min(1, "Select a source station"),
    to: z.string().min(1, "Select a destination station"),
    date: z
      .string()
      .min(1, "Select a journey date")
      .refine((v) => !isBefore(parseISO(v), startOfDay(new Date())), "Journey date cannot be in the past")
      .refine(
        (v) => !isAfter(parseISO(v), addDays(startOfDay(new Date()), ADVANCE_BOOKING_DAYS)),
        `Bookings open ${ADVANCE_BOOKING_DAYS} days in advance`,
      ),
    classCode: z.union([z.enum(CLASS_CODES as [string, ...string[]]), z.literal("ALL")]),
    quota: z.enum(QUOTAS as [string, ...string[]]),
  })
  .refine((v) => v.from !== v.to, { path: ["to"], message: "Source and destination must be different" });
export type SearchValues = z.infer<typeof searchSchema>;

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^(60|65|81|82|508)/.test(digits)) return "RuPay";
  if (/^3[47]/.test(digits)) return "Amex";
  return "Card";
}

const cardNumber = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\d{13,19}$/, "Enter a 13–19 digit card number")
      .refine(luhnValid, "This card number is not valid"),
  );

const expiry = z
  .string()
  .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY")
  .refine((v) => {
    const [mm, yy] = v.split("/").map(Number);
    const end = new Date(2000 + yy, mm, 0, 23, 59, 59);
    return end >= new Date();
  }, "This card has expired");

export const upiIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{2,64}@[a-z]{2,32}$/, "Enter a valid UPI ID, e.g. name@bank");

const label = z.string().trim().min(2, "Give it a short name").max(30, "Keep it under 30 characters");

export const savedCardSchema = z.object({
  type: z.enum(["CREDIT_CARD", "DEBIT_CARD"]),
  label,
  cardHolder: fullName,
  cardNumber,
  expiry,
  isDefault: z.boolean(),
});
export type SavedCardValues = z.input<typeof savedCardSchema>;

export const savedUpiSchema = z.object({
  type: z.literal("UPI"),
  label,
  upiId: upiIdSchema,
  isDefault: z.boolean(),
});
export type SavedUpiValues = z.input<typeof savedUpiSchema>;

export const cvvSchema = z.string().regex(/^\d{3,4}$/, "Enter the 3 or 4 digit CVV");

/** One-off card entered at checkout. CVV is validated, then discarded — never stored. */
export const checkoutCardSchema = z.object({
  type: z.enum(["CREDIT_CARD", "DEBIT_CARD"]),
  cardHolder: fullName,
  cardNumber,
  expiry,
  cvv: cvvSchema,
  save: z.boolean(),
});
export type CheckoutCardValues = z.input<typeof checkoutCardSchema>;

export const routeStopSchema = z.object({
  stationCode: z.string().min(2, "Select a station"),
  arrival: z.string().regex(timeRegex, "HH:mm").nullable(),
  departure: z.string().regex(timeRegex, "HH:mm").nullable(),
  dayOffset: z.number({ error: "Day" }).int().min(0, "≥ 0").max(6, "≤ 6"),
  distanceKm: z.number({ error: "Enter km" }).int("Whole km").min(0, "≥ 0").max(5000, "≤ 5000"),
});

export const trainSchema = z
  .object({
    number: z.string().trim().regex(/^\d{5}$/, "Train number must be 5 digits"),
    name: z.string().trim().min(3, "Enter a train name").max(60, "Keep it under 60 characters"),
    type: z.enum(TRAIN_TYPES as [string, ...string[]]),
    runDays: z.array(z.number()).min(1, "Select at least one operating day"),
    classes: z
      .array(
        z.object({
          code: z.enum(CLASS_CODES as [string, ...string[]]),
          totalSeats: z.number({ error: "Seats" }).int("Whole number").min(10, "Min 10").max(2000, "Max 2000"),
          fare: z.number({ error: "Fare" }).int("Whole ₹").min(50, "Min ₹50").max(50000, "Max ₹50,000"),
        }),
      )
      .min(1, "Add at least one travel class"),
    stops: z.array(routeStopSchema).min(2, "A route needs an origin and a destination"),
  })
  .superRefine((v, ctx) => {
    const codes = v.classes.map((c) => c.code);
    codes.forEach((code, i) => {
      if (codes.indexOf(code) !== i) {
        ctx.addIssue({ code: "custom", path: ["classes", i, "code"], message: "Class already added" });
      }
    });
    const stations = v.stops.map((s) => s.stationCode);
    v.stops.forEach((s, i) => {
      if (s.stationCode && stations.indexOf(s.stationCode) !== i) {
        ctx.addIssue({ code: "custom", path: ["stops", i, "stationCode"], message: "Station repeated" });
      }
      if (i > 0 && !s.arrival) {
        ctx.addIssue({ code: "custom", path: ["stops", i, "arrival"], message: "Required" });
      }
      if (i < v.stops.length - 1 && !s.departure) {
        ctx.addIssue({ code: "custom", path: ["stops", i, "departure"], message: "Required" });
      }
      if (i > 0 && s.distanceKm <= v.stops[i - 1].distanceKm) {
        ctx.addIssue({ code: "custom", path: ["stops", i, "distanceKm"], message: "Must increase" });
      }
      if (i > 0 && s.dayOffset < v.stops[i - 1].dayOffset) {
        ctx.addIssue({ code: "custom", path: ["stops", i, "dayOffset"], message: "Can't go back" });
      }
    });
  });
export type TrainFormValues = z.infer<typeof trainSchema>;
