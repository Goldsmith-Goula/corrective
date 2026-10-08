import {
  WEEKDAY_NAMES,
  addDays,
  dayKey,
  formatRelativeDay,
  fromMinutes,
  minutesNow,
  toMinutes,
  weekdayOf,
} from "./date";
import type {
  Correction,
  Execution,
  Recurrence,
  ResolvedAction,
  Schedule,
} from "./types";

/** The clock time an action actually lands on, after anchor offsets. */
export function dueTimeOf(schedule: Pick<Schedule, "startTime" | "recurrence">) {
  const r = schedule.recurrence;
  if (r.kind === "before") {
    return fromMinutes(toMinutes(r.anchorTime) - r.offsetMinutes);
  }
  return schedule.startTime;
}

export function occursOn(schedule: Schedule, key: string) {
  if (!schedule.active) return false;
  const r = schedule.recurrence;
  const wd = weekdayOf(key);
  switch (r.kind) {
    case "once":
      return r.date === key;
    case "daily":
      return true;
    case "weekdays":
      return wd >= 1 && wd <= 5;
    case "weekly":
      return r.days.includes(wd);
    case "before":
      return r.days.includes(wd);
  }
}

const dayList = (days: number[]) => {
  const sorted = [...days].sort();
  const isWeekdays =
    sorted.length === 5 && sorted.every((d, i) => d === i + 1);
  if (isWeekdays) return "every weekday";
  if (sorted.length === 7) return "every day";
  return sorted.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(", ");
};

/** Human phrasing, matching how the brief words schedules. */
export function describeRecurrence(r: Recurrence, startTime: string) {
  switch (r.kind) {
    case "once":
      return `Once · ${formatRelativeDay(r.date)} at ${startTime}`;
    case "daily":
      return `Every day at ${startTime}`;
    case "weekdays":
      return `Every weekday at ${startTime}`;
    case "weekly":
      return r.days.length === 1
        ? `Every ${WEEKDAY_NAMES[r.days[0]]} at ${startTime}`
        : `${dayList(r.days)} at ${startTime}`;
    case "before":
      return `${r.offsetMinutes} min before ${r.anchor} · ${dayList(r.days)}`;
  }
}

/** Compact form for dense rows. */
export function describeRecurrenceShort(r: Recurrence) {
  switch (r.kind) {
    case "once":
      return formatRelativeDay(r.date);
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekly":
      return r.days.length === 7 ? "Daily" : dayList(r.days);
    case "before":
      return `${r.offsetMinutes}m before ${r.anchor}`;
  }
}

export interface ResolveInput {
  corrections: Correction[];
  schedules: Schedule[];
  executions: Execution[];
}

const LIVE_STATUSES = new Set(["testing", "active", "improved"]);

/** Every action due on one day, ordered by time, joined to any execution. */
export function resolveDay(
  { corrections, schedules, executions }: ResolveInput,
  key: string,
): ResolvedAction[] {
  const byId = new Map(corrections.map((c) => [c.id, c]));
  const out: ResolvedAction[] = [];

  for (const schedule of schedules) {
    if (!occursOn(schedule, key)) continue;
    const correction = byId.get(schedule.correctionId);
    // Solved and abandoned corrections stop generating work.
    if (!correction || !LIVE_STATUSES.has(correction.status)) continue;

    const dueTime = dueTimeOf(schedule);
    out.push({
      schedule,
      correction,
      date: key,
      dueTime,
      dueMinutes: toMinutes(dueTime),
      execution: executions.find(
        (e) => e.scheduleId === schedule.id && e.date === key,
      ),
    });
  }

  return out.sort(
    (a, b) => a.dueMinutes - b.dueMinutes || a.schedule.label.localeCompare(b.schedule.label),
  );
}

/**
 * The next time this schedule comes around, searching forward from a day.
 *
 * An occurrence earlier today has already been and gone, so it is skipped:
 * "next" has to mean something the user can still act on.
 */
export function nextOccurrence(
  schedule: Schedule,
  from = dayKey(),
  horizonDays = 120,
): { date: string; time: string } | null {
  const time = dueTimeOf(schedule);
  const today = dayKey();
  const passed = minutesNow();

  for (let i = 0; i <= horizonDays; i++) {
    const key = addDays(from, i);
    if (!occursOn(schedule, key)) continue;
    if (key === today && toMinutes(time) <= passed) continue;
    return { date: key, time };
  }
  return null;
}

/** The soonest upcoming action across a correction's schedules. */
export function nextForCorrection(
  schedules: Schedule[],
  correctionId: string,
  from = dayKey(),
) {
  const candidates = schedules
    .filter((s) => s.correctionId === correctionId)
    .map((s) => nextOccurrence(s, from))
    .filter((x): x is { date: string; time: string } => x !== null)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || toMinutes(a.time) - toMinutes(b.time),
    );
  return candidates[0] ?? null;
}
