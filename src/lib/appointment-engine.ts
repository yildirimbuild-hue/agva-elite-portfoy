import { randomUUID } from "node:crypto";
import type { Appointment, AppointmentDay, AppointmentHold, AppointmentSettings, AppointmentSlot } from "./types";

export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
  timezone: "Europe/Istanbul",
  workDays: [1, 2, 3, 4, 5, 6],
  dayStart: "09:00",
  dayEnd: "18:00",
  slotMinutes: 60,
  bufferMinutes: 30,
  minNoticeHours: 4,
  maxAdvanceDays: 30,
  mode: "request",
  blockedDates: [],
  updatedAt: new Date(0).toISOString(),
};

export function normalizeAppointmentSettings(value: Partial<AppointmentSettings> | null | undefined): AppointmentSettings {
  const workDays = Array.isArray(value?.workDays)
    ? [...new Set(value.workDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    : DEFAULT_APPOINTMENT_SETTINGS.workDays;
  const blockedDates = Array.isArray(value?.blockedDates)
    ? [...new Set(value.blockedDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))].slice(0, 180)
    : [];
  const time = (candidate: unknown, fallback: string) => typeof candidate === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
  return {
    timezone: "Europe/Istanbul",
    workDays: workDays.length ? workDays : DEFAULT_APPOINTMENT_SETTINGS.workDays,
    dayStart: time(value?.dayStart, DEFAULT_APPOINTMENT_SETTINGS.dayStart),
    dayEnd: time(value?.dayEnd, DEFAULT_APPOINTMENT_SETTINGS.dayEnd),
    slotMinutes: Math.min(180, Math.max(15, Math.round(Number(value?.slotMinutes) || DEFAULT_APPOINTMENT_SETTINGS.slotMinutes))),
    bufferMinutes: Math.min(120, Math.max(0, Math.round(Number(value?.bufferMinutes) || 0))),
    minNoticeHours: Math.min(168, Math.max(0, Math.round(Number(value?.minNoticeHours) || 0))),
    maxAdvanceDays: Math.min(180, Math.max(1, Math.round(Number(value?.maxAdvanceDays) || DEFAULT_APPOINTMENT_SETTINGS.maxAdvanceDays))),
    mode: value?.mode === "instant" ? "instant" : "request",
    blockedDates,
    updatedAt: typeof value?.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
  };
}

function dateKeyInIstanbul(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return date.toISOString().slice(0, 10);
}

function dayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T12:00:00+03:00`).getDay();
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function localIso(dateKey: string, totalMinutes: number) {
  const hour = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");
  return `${dateKey}T${hour}:${minute}:00+03:00`;
}

function overlaps(startAt: string, endAt: string, busyStart: string, busyEnd: string) {
  return Date.parse(startAt) < Date.parse(busyEnd) && Date.parse(endAt) > Date.parse(busyStart);
}

export function purgeExpiredHolds(holds: AppointmentHold[], now = new Date()) {
  return holds.filter((hold) => Date.parse(hold.expiresAt) > now.getTime());
}

export function isSlotAvailable(args: {
  startAt: string;
  endAt: string;
  appointments: Appointment[];
  holds: AppointmentHold[];
  settings: AppointmentSettings;
  ignoreHoldToken?: string;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const minimum = now.getTime() + args.settings.minNoticeHours * 60 * 60 * 1000;
  if (Date.parse(args.startAt) < minimum) return false;
  const bufferMs = args.settings.bufferMinutes * 60 * 1000;
  const busyAppointments = args.appointments.filter((appointment) => !["İptal Edildi", "Gelmedi"].includes(appointment.status));
  if (busyAppointments.some((appointment) => overlaps(
    args.startAt,
    args.endAt,
    appointment.startAt,
    new Date(Date.parse(appointment.endAt) + bufferMs).toISOString(),
  ))) return false;
  const activeHolds = purgeExpiredHolds(args.holds, now).filter((hold) => hold.token !== args.ignoreHoldToken);
  return !activeHolds.some((hold) => overlaps(args.startAt, args.endAt, hold.startAt, new Date(Date.parse(hold.endAt) + bufferMs).toISOString()));
}

export function buildAvailability(args: {
  settings: AppointmentSettings;
  appointments: Appointment[];
  holds: AppointmentHold[];
  now?: Date;
}) : AppointmentDay[] {
  const now = args.now ?? new Date();
  const today = dateKeyInIstanbul(now);
  const days: AppointmentDay[] = [];
  const startMinute = minutes(args.settings.dayStart);
  const endMinute = minutes(args.settings.dayEnd);
  const step = args.settings.slotMinutes + args.settings.bufferMinutes;
  for (let offset = 0; offset <= args.settings.maxAdvanceDays; offset += 1) {
    const date = addDays(today, offset);
    if (!args.settings.workDays.includes(dayOfWeek(date)) || args.settings.blockedDates.includes(date)) continue;
    const slots: AppointmentSlot[] = [];
    for (let cursor = startMinute; cursor + args.settings.slotMinutes <= endMinute; cursor += step) {
      const startAt = localIso(date, cursor);
      const endAt = localIso(date, cursor + args.settings.slotMinutes);
      if (!isSlotAvailable({ ...args, startAt, endAt, now })) continue;
      slots.push({
        startAt,
        endAt,
        label: new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(new Date(startAt)),
      });
    }
    if (slots.length) {
      days.push({
        date,
        label: new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00+03:00`)),
        slots,
      });
    }
  }
  return days;
}

export function createAppointmentHold(listingReference: string, startAt: string, endAt: string, now = new Date()): AppointmentHold {
  return {
    token: randomUUID(),
    listingReference,
    startAt,
    endAt,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
  };
}
