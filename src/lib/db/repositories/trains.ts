import { AppError } from "@/lib/errors";
import { passengerFare, segmentFare } from "@/lib/rules/fare";
import { inventoryKey } from "@/lib/rules/inventory";
import { combineDateTime, minutesBetween, nowIso, shiftDateKey, todayKey, uid } from "@/lib/utils";
import { parseDateKey } from "@/lib/utils/time";
import type {
  Availability,
  ClassCode,
  Quota,
  RouteStop,
  Train,
  TrainClassConfig,
  TrainType,
  TrainWithDetails,
} from "@/types";
import { getDb } from "../database";
import { peekAvailabilities } from "./inventory";

export interface TrainInput {
  number: string;
  name: string;
  type: TrainType;
  runDays: number[];
  classes: TrainClassConfig[];
  stops: RouteStop[];
}

export interface ClassOffer {
  code: ClassCode;
  fare: number;
  availability: Availability;
}

export interface TrainSearchResult {
  train: TrainWithDetails;
  from: RouteStop;
  to: RouteStop;
  /** Date the train leaves its origin. */
  startDate: string;
  /** Boarding date at `from`. */
  journeyDate: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  distanceKm: number;
  departed: boolean;
  classes: ClassOffer[];
}

async function attachDetails(trains: Train[]): Promise<TrainWithDetails[]> {
  const db = getDb();
  const ids = trains.map((t) => t.id);
  const [routes, schedules] = await Promise.all([
    db.trainRoutes.where("trainId").anyOf(ids).toArray(),
    db.trainSchedules.where("trainId").anyOf(ids).toArray(),
  ]);
  const routeBy = new Map(routes.map((r) => [r.trainId, r]));
  const scheduleBy = new Map(schedules.map((s) => [s.trainId, s]));
  return trains.flatMap((t) => {
    const route = routeBy.get(t.id);
    const schedule = scheduleBy.get(t.id);
    return route && schedule ? [{ ...t, route, schedule }] : [];
  });
}

export async function listTrains(): Promise<TrainWithDetails[]> {
  const trains = await getDb().trains.orderBy("number").toArray();
  return attachDetails(trains);
}

export async function getTrain(id: string): Promise<TrainWithDetails | undefined> {
  const train = await getDb().trains.get(id);
  if (!train) return undefined;
  return (await attachDetails([train]))[0];
}

export function routeSegment(train: TrainWithDetails, fromCode: string, toCode: string) {
  const stops = train.route.stops;
  const fromIdx = stops.findIndex((s) => s.stationCode === fromCode);
  const toIdx = stops.findIndex((s) => s.stationCode === toCode);
  if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return null;
  const from = stops[fromIdx];
  const to = stops[toIdx];
  return {
    from,
    to,
    distanceKm: to.distanceKm - from.distanceKm,
    totalKm: stops[stops.length - 1].distanceKm,
    durationMinutes: minutesBetween(
      { dayOffset: from.dayOffset, time: from.departure! },
      { dayOffset: to.dayOffset, time: to.arrival! },
    ),
  };
}

export function fareFor(
  train: TrainWithDetails,
  classCode: ClassCode,
  quota: Quota,
  fromCode: string,
  toCode: string,
): number {
  const segment = routeSegment(train, fromCode, toCode);
  const config = train.classes.find((c) => c.code === classCode);
  if (!segment || !config) throw new AppError("INVALID", "This train does not serve the selected journey.");
  return passengerFare(segmentFare(config.fare, segment.distanceKm, segment.totalKm), quota);
}

/** Builds a priced, availability-annotated offer for one train on one journey date. */
export async function buildJourney(
  train: TrainWithDetails,
  fromCode: string,
  toCode: string,
  journeyDate: string,
  quota: Quota,
): Promise<TrainSearchResult | null> {
  return (await buildJourneys([train], fromCode, toCode, journeyDate, quota))[0] ?? null;
}

async function buildJourneys(
  trains: TrainWithDetails[],
  fromCode: string,
  toCode: string,
  journeyDate: string,
  quota: Quota,
): Promise<TrainSearchResult[]> {
  const candidates = trains.flatMap((train) => {
    const segment = routeSegment(train, fromCode, toCode);
    if (!segment) return [];
    const startDate = shiftDateKey(journeyDate, -segment.from.dayOffset);
    if (!train.schedule.runDays.includes(parseDateKey(startDate).getDay())) return [];
    return [{ train, segment, startDate }];
  });

  const availability = await peekAvailabilities(
    candidates.flatMap(({ train, startDate }) =>
      train.classes.map((c) => ({ train, startDate, classCode: c.code, quota })),
    ),
  );

  const now = Date.now();
  return candidates.map(({ train, segment, startDate }) => {
    const departureAt = combineDateTime(startDate, segment.from.dayOffset, segment.from.departure!);
    return {
      train,
      from: segment.from,
      to: segment.to,
      startDate,
      journeyDate,
      departureAt,
      arrivalAt: combineDateTime(startDate, segment.to.dayOffset, segment.to.arrival!),
      durationMinutes: segment.durationMinutes,
      distanceKm: segment.distanceKm,
      departed: new Date(departureAt).getTime() <= now,
      classes: train.classes.map((c) => ({
        code: c.code,
        fare: passengerFare(segmentFare(c.fare, segment.distanceKm, segment.totalKm), quota),
        availability: availability.get(inventoryKey(train.id, startDate, c.code, quota))!,
      })),
    };
  });
}

export async function searchTrains(params: {
  fromCode: string;
  toCode: string;
  journeyDate: string;
  quota: Quota;
}): Promise<TrainSearchResult[]> {
  const db = getDb();
  const routes = await db.trainRoutes.where("stationCodes").equals(params.fromCode).toArray();
  const trainIds = routes.filter((r) => r.stationCodes.includes(params.toCode)).map((r) => r.trainId);
  if (!trainIds.length) return [];
  const trains = await attachDetails(await db.trains.bulkGet(trainIds).then((t) => t.filter(Boolean) as Train[]));
  return buildJourneys(trains, params.fromCode, params.toCode, params.journeyDate, params.quota);
}

/** Availability for a train across a window of journey dates (boarding at `fromCode`). */
export async function availabilityCalendar(params: {
  train: TrainWithDetails;
  fromCode: string;
  toCode: string;
  startJourneyDate: string;
  days: number;
  quota: Quota;
}): Promise<{ journeyDate: string; runs: boolean; result: TrainSearchResult | null }[]> {
  const dates = Array.from({ length: params.days }, (_, i) => shiftDateKey(params.startJourneyDate, i));
  return Promise.all(
    dates.map(async (journeyDate) => {
      const result = await buildJourney(params.train, params.fromCode, params.toCode, journeyDate, params.quota);
      return { journeyDate, runs: Boolean(result), result };
    }),
  );
}

// ---------- Admin ----------

export async function validateTrainInput(input: TrainInput, existingId?: string): Promise<void> {
  const db = getDb();
  const clash = await db.trains.where("number").equals(input.number).first();
  if (clash && clash.id !== existingId) {
    throw new AppError("DUPLICATE", `Train number ${input.number} already exists (${clash.name}).`);
  }
  const { stops } = input;
  if (stops.length < 2) throw new AppError("INVALID", "A route needs at least an origin and a destination.");
  const codes = stops.map((s) => s.stationCode);
  if (new Set(codes).size !== codes.length) throw new AppError("INVALID", "A station can appear only once on a route.");
  const known = await db.stations.bulkGet(codes);
  const missing = codes.filter((_, i) => !known[i]);
  if (missing.length) throw new AppError("INVALID", `Unknown station code(s): ${missing.join(", ")}.`);

  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const cur = stops[i];
    if (cur.distanceKm <= prev.distanceKm) {
      throw new AppError("INVALID", `Distance must increase along the route (at ${cur.stationCode}).`);
    }
    const arrivalGap = minutesBetween(
      { dayOffset: prev.dayOffset, time: prev.departure! },
      { dayOffset: cur.dayOffset, time: cur.arrival! },
    );
    if (arrivalGap <= 0) {
      throw new AppError("INVALID", `Arrival at ${cur.stationCode} must be after departure from ${prev.stationCode}.`);
    }
    if (cur.departure) {
      const halt = minutesBetween(
        { dayOffset: cur.dayOffset, time: cur.arrival! },
        { dayOffset: cur.dayOffset, time: cur.departure },
      );
      if (halt < 0) throw new AppError("INVALID", `Departure from ${cur.stationCode} cannot be before its arrival.`);
    }
  }
  if (!input.classes.length) throw new AppError("INVALID", "Configure at least one travel class.");
  if (!input.runDays.length) throw new AppError("INVALID", "Select at least one operating day.");
}

function normaliseStops(stops: RouteStop[]): RouteStop[] {
  return stops.map((s, i) => ({
    ...s,
    stationCode: s.stationCode.toUpperCase(),
    arrival: i === 0 ? null : s.arrival,
    departure: i === stops.length - 1 ? null : s.departure,
    distanceKm: i === 0 ? 0 : s.distanceKm,
  }));
}

export async function createTrain(input: TrainInput): Promise<string> {
  const db = getDb();
  const stops = normaliseStops(input.stops);
  const data = { ...input, stops };
  await validateTrainInput(data);
  const id = uid();
  const now = nowIso();
  await db.transaction("rw", [db.trains, db.trainRoutes, db.trainSchedules], async () => {
    await db.trains.add({
      id,
      number: input.number,
      name: input.name.trim(),
      type: input.type,
      sourceCode: stops[0].stationCode,
      destinationCode: stops[stops.length - 1].stationCode,
      classes: input.classes,
      createdAt: now,
      updatedAt: now,
    });
    await db.trainRoutes.add({ id: uid(), trainId: id, stops, stationCodes: stops.map((s) => s.stationCode) });
    await db.trainSchedules.add({ id: uid(), trainId: id, runDays: [...input.runDays].sort() });
  });
  return id;
}

async function activeUpcomingBookings(trainId: string) {
  const today = todayKey();
  return getDb()
    .bookings.where("trainId")
    .equals(trainId)
    .filter((b) => b.status !== "CANCELLED" && b.journeyDate >= today)
    .toArray();
}

export async function updateTrain(id: string, input: TrainInput): Promise<void> {
  const db = getDb();
  const existing = await getTrain(id);
  if (!existing) throw new AppError("NOT_FOUND", "Train not found.");
  const stops = normaliseStops(input.stops);
  const data = { ...input, stops };
  await validateTrainInput(data, id);

  const upcoming = await activeUpcomingBookings(id);
  const removedClasses = existing.classes.filter((c) => !input.classes.some((n) => n.code === c.code)).map((c) => c.code);
  const blocked = upcoming.find((b) => removedClasses.includes(b.classCode));
  if (blocked) {
    throw new AppError(
      "INVALID",
      `Class ${blocked.classCode} has upcoming bookings (PNR ${blocked.pnr}) and cannot be removed.`,
    );
  }
  const codes = stops.map((s) => s.stationCode);
  const orphaned = upcoming.find((b) => {
    const a = codes.indexOf(b.fromCode);
    const z = codes.indexOf(b.toCode);
    return a < 0 || z < 0 || a >= z;
  });
  if (orphaned) {
    throw new AppError(
      "INVALID",
      `Route change would drop stations used by upcoming booking PNR ${orphaned.pnr}.`,
    );
  }

  await db.transaction("rw", [db.trains, db.trainRoutes, db.trainSchedules], async () => {
    await db.trains.update(id, {
      number: input.number,
      name: input.name.trim(),
      type: input.type,
      sourceCode: stops[0].stationCode,
      destinationCode: stops[stops.length - 1].stationCode,
      classes: input.classes,
      updatedAt: nowIso(),
    });
    await db.trainRoutes.update(existing.route.id, { stops, stationCodes: codes });
    await db.trainSchedules.update(existing.schedule.id, { runDays: [...input.runDays].sort() });
  });
}

export async function deleteTrain(id: string): Promise<void> {
  const db = getDb();
  const upcoming = await activeUpcomingBookings(id);
  if (upcoming.length) {
    throw new AppError(
      "INVALID",
      `This train has ${upcoming.length} upcoming active booking(s). Cancel them before deleting the train.`,
    );
  }
  await db.transaction("rw", [db.trains, db.trainRoutes, db.trainSchedules, db.seatInventory], async () => {
    await db.trains.delete(id);
    await db.trainRoutes.where("trainId").equals(id).delete();
    await db.trainSchedules.where("trainId").equals(id).delete();
    await db.seatInventory.where("trainId").equals(id).delete();
  });
}
