import type { Weekday } from "./types";

/** "YYYY-MM-DD" in local time — the canonical day key. */
export function dayKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number) {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function weekdayOf(key: string): Weekday {
  return parseDayKey(key).getDay() as Weekday;
}

/** Minutes from midnight for "HH:mm". */
export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number) {
  const wrapped = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${`${h}`.padStart(2, "0")}:${`${m}`.padStart(2, "0")}`;
}

export function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** mm:ss for the running timer. */
export function formatClock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${`${m}`.padStart(2, "0")}:${`${rem}`.padStart(2, "0")}`;
}

/** "08:27" from an ISO timestamp. */
export function timeOf(iso: string) {
  const d = new Date(iso);
  return `${`${d.getHours()}`.padStart(2, "0")}:${`${d.getMinutes()}`.padStart(2, "0")}`;
}

/** "26 Mar" — the compact form used on budget date ranges. */
export function formatDayShortish(key: string) {
  return parseDayKey(key).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatDayLong(key: string) {
  const d = parseDayKey(key);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "Today" / "Tomorrow" / "Sat 11 Oct" — relative where it helps, absolute otherwise. */
export function formatRelativeDay(key: string, today = dayKey()) {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key === addDays(today, -1)) return "Yesterday";
  const d = parseDayKey(key);
  const sameYear = d.getFullYear() === parseDayKey(today).getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function minutesNow(d: Date = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}
