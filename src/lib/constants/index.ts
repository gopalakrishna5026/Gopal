import type {
  BerthPreference,
  BookingStatus,
  ClassCode,
  Gender,
  PaymentMethodType,
  Quota,
  TrainType,
} from "@/types";

export const APP_NAME = "RailYatra";

export const CLASS_INFO: Record<
  ClassCode,
  {
    label: string;
    short: string;
    coachPrefix: string;
    seatsPerCoach: number;
    /** Berth pattern within a coach bay; index = (seatNo - 1) % length */
    berthCycle: string[];
    hasRac: boolean;
    /** Flat per-passenger cancellation charge for confirmed tickets (simulated). */
    minCancellationCharge: number;
  }
> = {
  "1A": {
    label: "First AC",
    short: "1A",
    coachPrefix: "H",
    seatsPerCoach: 24,
    berthCycle: ["LB", "UB"],
    hasRac: false,
    minCancellationCharge: 240,
  },
  "2A": {
    label: "Second AC",
    short: "2A",
    coachPrefix: "A",
    seatsPerCoach: 48,
    berthCycle: ["LB", "UB", "LB", "UB", "SL", "SU"],
    hasRac: true,
    minCancellationCharge: 200,
  },
  "3A": {
    label: "Third AC",
    short: "3A",
    coachPrefix: "B",
    seatsPerCoach: 72,
    berthCycle: ["LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"],
    hasRac: true,
    minCancellationCharge: 180,
  },
  SL: {
    label: "Sleeper",
    short: "SL",
    coachPrefix: "S",
    seatsPerCoach: 72,
    berthCycle: ["LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"],
    hasRac: true,
    minCancellationCharge: 120,
  },
  CC: {
    label: "Chair Car",
    short: "CC",
    coachPrefix: "C",
    seatsPerCoach: 78,
    berthCycle: ["WS", "MS", "AS", "AS", "WS"],
    hasRac: false,
    minCancellationCharge: 180,
  },
  "2S": {
    label: "Second Sitting",
    short: "2S",
    coachPrefix: "D",
    seatsPerCoach: 108,
    berthCycle: ["WS", "MS", "AS", "AS", "MS", "WS"],
    hasRac: false,
    minCancellationCharge: 60,
  },
};

export const CLASS_CODES = Object.keys(CLASS_INFO) as ClassCode[];

export const BERTH_TYPE_LABEL: Record<string, string> = {
  LB: "Lower",
  MB: "Middle",
  UB: "Upper",
  SL: "Side Lower",
  SU: "Side Upper",
  WS: "Window",
  MS: "Middle",
  AS: "Aisle",
};

export const QUOTA_INFO: Record<
  Quota,
  { label: string; share: number; description: string }
> = {
  GN: { label: "General", share: 0.7, description: "Open to all passengers" },
  TQ: {
    label: "Tatkal",
    share: 0.15,
    description: "Premium fare (+30%). Confirmed Tatkal tickets are non-refundable.",
  },
  LD: { label: "Ladies", share: 0.05, description: "All passengers must be female" },
  SS: {
    label: "Senior Citizen",
    share: 0.1,
    description: "Men 60+ / women 58+. 40% concession on base fare.",
  },
};

export const QUOTAS = Object.keys(QUOTA_INFO) as Quota[];

export const TATKAL_MULTIPLIER = 1.3;
export const SENIOR_DISCOUNT = 0.4;
export const SENIOR_AGE = { M: 60, F: 58, T: 58 } as const;

export const BERTH_PREFERENCES: { value: BerthPreference; label: string }[] = [
  { value: "LB", label: "Lower" },
  { value: "MB", label: "Middle" },
  { value: "UB", label: "Upper" },
  { value: "SL", label: "Side Lower" },
  { value: "SU", label: "Side Upper" },
  { value: "NP", label: "No Preference" },
];

export const GENDERS: { value: Gender; label: string }[] = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "T", label: "Transgender" },
];

export const TRAIN_TYPES: TrainType[] = [
  "Rajdhani",
  "Shatabdi",
  "Vande Bharat",
  "Duronto",
  "Superfast",
  "Express",
  "Garib Rath",
];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodType, string> = {
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  UPI: "UPI",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  RAC: "RAC",
  WAITING_LIST: "Waiting List",
  CANCELLED: "Cancelled",
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MAX_PASSENGERS = 6;
/** ₹30 + 18% GST, charged once per booking, non-refundable. */
export const CONVENIENCE_FEE = 35.4;
/** Booking horizon (days ahead) — mirrors the real 60-day ARP, simplified. */
export const ADVANCE_BOOKING_DAYS = 60;
export const RAC_CLERKAGE = 60;

export const DEMO_CREDENTIALS = {
  admin: { email: "admin@railyatra.demo", password: "Admin@123" },
  user: { email: "priya@railyatra.demo", password: "User@1234" },
} as const;
