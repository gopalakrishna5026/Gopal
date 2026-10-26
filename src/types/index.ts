export type UserRole = "user" | "admin";

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

/** User shape that is safe to keep in client state (no credential material). */
export type PublicUser = Omit<User, "passwordHash" | "passwordSalt">;

export interface Station {
  code: string;
  name: string;
  city: string;
  state: string;
}

export type ClassCode = "1A" | "2A" | "3A" | "SL" | "CC" | "2S";
export type Quota = "GN" | "TQ" | "LD" | "SS";
export type Gender = "M" | "F" | "T";
export type BerthPreference = "LB" | "MB" | "UB" | "SL" | "SU" | "NP";
export type TrainType =
  | "Rajdhani"
  | "Shatabdi"
  | "Vande Bharat"
  | "Duronto"
  | "Superfast"
  | "Express"
  | "Garib Rath";

export interface TrainClassConfig {
  code: ClassCode;
  totalSeats: number;
  /** Base adult fare for the full origin → destination journey. */
  fare: number;
}

export interface Train {
  id: string;
  number: string;
  name: string;
  type: TrainType;
  sourceCode: string;
  destinationCode: string;
  classes: TrainClassConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteStop {
  stationCode: string;
  /** "HH:mm"; null at origin */
  arrival: string | null;
  /** "HH:mm"; null at destination */
  departure: string | null;
  /** Days after the train's start date (0 = start day). */
  dayOffset: number;
  /** Cumulative distance from origin. */
  distanceKm: number;
}

export interface TrainRoute {
  id: string;
  trainId: string;
  stops: RouteStop[];
  /** Denormalised stop codes (multi-entry index) for station search. */
  stationCodes: string[];
}

export interface TrainSchedule {
  id: string;
  trainId: string;
  /** 0 = Sunday … 6 = Saturday (JS Date#getDay) */
  runDays: number[];
}

export interface TrainWithDetails extends Train {
  route: TrainRoute;
  schedule: TrainSchedule;
}

/**
 * Inventory for a single (train, start date, class, quota) bucket.
 * Seats pre-occupied by "other passengers" are represented by counters, while
 * passengers booked in this app hold real seat indices.
 */
export interface SeatInventory {
  key: string;
  trainId: string;
  startDate: string;
  classCode: ClassCode;
  quota: Quota;
  /** First absolute seat index (within the class) reserved for this quota. */
  seatOffset: number;
  capacity: number;
  racCapacity: number;
  wlCapacity: number;
  phantomConfirmed: number;
  phantomRac: number;
  phantomWl: number;
  /** Quota-relative seat indices held by passengers booked in this app. */
  allocatedSeats: number[];
  /** Passengers booked in this app currently in the RAC / WL queues. */
  racCount: number;
  wlCount: number;
  /** Monotonic counter used to order RAC / WL queues. */
  queueCounter: number;
  updatedAt: string;
}

export type AvailabilityKind = "AVAILABLE" | "RAC" | "WL" | "NOT_AVAILABLE";

export interface Availability {
  kind: AvailabilityKind;
  /** Seats left for AVAILABLE, next queue position for RAC / WL. */
  count: number;
  label: string;
}

export interface SavedPassenger {
  id: string;
  userId: string;
  fullName: string;
  age: number;
  gender: Gender;
  berthPreference: BerthPreference;
  mobile?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethodType = "CREDIT_CARD" | "DEBIT_CARD" | "UPI";

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  label: string;
  /** Cards only — masked details, never the full PAN or CVV. */
  cardHolder?: string;
  cardBrand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  /** UPI only */
  upiId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = "CONFIRMED" | "RAC" | "WAITING_LIST" | "CANCELLED";
export type PassengerStatus = "CNF" | "RAC" | "WL" | "CAN";

export interface Booking {
  id: string;
  pnr: string;
  userId: string;
  trainId: string;
  trainNumber: string;
  trainName: string;
  fromCode: string;
  toCode: string;
  /** Date of boarding at `fromCode` (yyyy-MM-dd). */
  journeyDate: string;
  /** Date the train leaves its origin (yyyy-MM-dd) — inventory key. */
  trainStartDate: string;
  departureTime: string;
  arrivalTime: string;
  /** ISO timestamps for boarding and arrival. */
  departureAt: string;
  arrivalAt: string;
  distanceKm: number;
  classCode: ClassCode;
  quota: Quota;
  inventoryKey: string;
  passengerCount: number;
  baseFare: number;
  convenienceFee: number;
  totalAmount: number;
  status: BookingStatus;
  paymentId: string;
  /** Client-generated idempotency key: one checkout attempt → at most one booking. */
  attemptId: string;
  cancellation?: {
    cancelledAt: string;
    charges: number;
    refundAmount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BookingPassenger {
  id: string;
  bookingId: string;
  inventoryKey: string;
  serial: number;
  fullName: string;
  age: number;
  gender: Gender;
  berthPreference: BerthPreference;
  fare: number;
  bookingStatus: PassengerStatus;
  bookingPosition: number | null;
  currentStatus: PassengerStatus;
  /** Position in the RAC / WL queue while waiting. */
  currentPosition: number | null;
  /** Ordering key while in RAC / WL queues. */
  queueSeq: number | null;
  /** Quota-relative seat index once confirmed. */
  seatIndex: number | null;
  coach: string | null;
  berthNumber: number | null;
  berthType: string | null;
}

export type PaymentStatus = "SUCCESS" | "FAILED" | "REVERSED" | "REFUNDED";

export interface Payment {
  id: string;
  userId: string;
  attemptId: string;
  bookingId: string | null;
  methodType: PaymentMethodType;
  methodLabel: string;
  amount: number;
  status: PaymentStatus;
  reference: string;
  failureReason?: string;
  refundAmount?: number;
  createdAt: string;
}

export interface BookingWithPassengers extends Booking {
  passengers: BookingPassenger[];
}
