"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, dayKey, fromMinutes, minutesNow, toMinutes } from "./date";
import {
  defaultBudget,
  rollDay,
  round2,
  whatBudgetForDay,
  type Budget,
  type RestMethod,
  type Spend,
} from "./budget";
import { SEED_CORRECTION_IDS, buildSeed, buildBudgetSeed } from "./seed";
import { resolveDay } from "./schedule";
import { uid } from "./utils";
import type {
  Capture,
  Correction,
  CorrectionStatus,
  Execution,
  Recurrence,
  ResolvedAction,
  ReviewEntry,
  Schedule,
  Verdict,
} from "./types";

/**
 * Local persistence.
 *
 * Everything lives in one localStorage-backed store behind a narrow action
 * API. The screens only ever call these actions, so swapping this for a real
 * API later is a change to this file and not to the interface.
 */

export interface CorrectiveState {
  corrections: Correction[];
  schedules: Schedule[];
  executions: Execution[];
  reviews: ReviewEntry[];
  captures: Capture[];
  /** The daily-budget period, or null until one is set up. */
  budget: Budget | null;
  /** Spends entered by hand. Correction-derived ones are computed. */
  spends: Spend[];
  /** Left-over money awaiting a decision under the "ask" rule. */
  pendingRest: number | null;

  /** Last day whose unexecuted actions were settled as missed. */
  lastRollover: string | null;
  /**
   * Every demo correction this store has ever been offered.
   *
   * Lets a newly added sample appear for existing installs exactly once: an
   * id recorded here is never re-added, so deleting a demo correction keeps
   * it deleted.
   */
  knownSeedIds: string[];
  theme: "system" | "light" | "dark";

  // corrections
  addCorrection: (
    input: Partial<Omit<Correction, "id" | "createdAt" | "updatedAt">>,
  ) => string;
  updateCorrection: (id: string, patch: Partial<Correction>) => void;
  setStatus: (id: string, status: CorrectionStatus) => void;
  removeCorrection: (id: string) => void;

  // schedules
  addSchedule: (
    input: Omit<Schedule, "id" | "timezone"> & { timezone?: string },
  ) => string;
  updateSchedule: (id: string, patch: Partial<Schedule>) => void;
  /** Used by the scheduler's drag interaction. */
  moveSchedule: (id: string, startTime: string) => void;
  setRecurrence: (id: string, recurrence: Recurrence) => void;
  toggleSchedule: (id: string) => void;
  removeSchedule: (id: string) => void;

  // execution
  ensureExecution: (action: ResolvedAction) => string;
  startExecution: (action: ResolvedAction) => void;
  pauseExecution: (action: ResolvedAction) => void;
  completeExecution: (
    action: ResolvedAction,
    verdict: Verdict,
    result?: string,
    note?: string,
    /** The measured figure, when the correction carries a metric. */
    value?: number,
  ) => void;
  skipExecution: (action: ResolvedAction, note?: string) => void;
  /** Clear the record so the action returns to pending. */
  undoExecution: (action: ResolvedAction) => void;
  annotateExecution: (id: string, patch: Partial<Execution>) => void;

  // review
  addReview: (input: Omit<ReviewEntry, "id">) => void;

  // capture
  addCapture: (text: string) => string;
  removeCapture: (id: string) => void;
  convertCapture: (id: string, correctionId: string) => void;

  // budget
  startBudget: (input: {
    amount: number;
    currency: string;
    endDate: string;
  }) => void;
  updateBudget: (patch: Partial<Budget>) => void;
  setRestMethod: (method: RestMethod) => void;
  finishBudget: () => void;
  addSpend: (input: { amount: number; tag?: string; date?: string }) => void;
  removeSpend: (id: string) => void;
  updateSpend: (id: string, patch: Partial<Spend>) => void;
  /** Applies the day change, honouring the rest-distribution rule. */
  rollBudget: (allSpends: Spend[]) => void;
  /** Answers the "ask" prompt. */
  distributeRest: (method: "rest" | "addToday", allSpends: Spend[]) => void;

  // housekeeping
  setTheme: (theme: "system" | "light" | "dark") => void;
  rollover: () => void;
  resetDemo: () => void;
  clearAll: () => void;
}

const TZ = () =>
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

const nowIso = () => new Date().toISOString();

/** Fold the running segment into the banked total. */
function bankElapsed(e: Execution) {
  const banked = e.elapsed ?? 0;
  if (e.status !== "running" || !e.segmentStart) return banked;
  return banked + (Date.now() - new Date(e.segmentStart).getTime()) / 1000;
}

/** Seconds on the clock right now, including any segment still running. */
export function liveElapsed(e: Execution | undefined) {
  if (!e) return 0;
  return bankElapsed(e);
}

/** How far back rollover will reach on first run. */
const ROLLOVER_HORIZON = 21;

export const useStore = create<CorrectiveState>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      ...buildBudgetSeed(),
      pendingRest: null,
      lastRollover: null,
      knownSeedIds: SEED_CORRECTION_IDS,
      theme: "system",

      addCorrection: (input) => {
        const id = uid("c");
        const ts = nowIso();
        set((s) => ({
          corrections: [
            {
              id,
              problem: input.problem ?? "",
              cause: input.cause ?? "",
              cost: input.cost ?? "",
              correction: input.correction ?? "",
              measurement: input.measurement ?? "",
              metric: input.metric,
              status: input.status ?? "testing",
              createdAt: ts,
              updatedAt: ts,
            },
            ...s.corrections,
          ],
        }));
        return id;
      },

      updateCorrection: (id, patch) =>
        set((s) => ({
          corrections: s.corrections.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
          ),
        })),

      setStatus: (id, status) =>
        set((s) => ({
          corrections: s.corrections.map((c) =>
            c.id === id ? { ...c, status, updatedAt: nowIso() } : c,
          ),
        })),

      removeCorrection: (id) =>
        set((s) => ({
          corrections: s.corrections.filter((c) => c.id !== id),
          schedules: s.schedules.filter((x) => x.correctionId !== id),
          executions: s.executions.filter((x) => x.correctionId !== id),
          reviews: s.reviews.filter((x) => x.correctionId !== id),
        })),

      addSchedule: (input) => {
        const id = uid("s");
        set((s) => ({
          schedules: [
            ...s.schedules,
            { ...input, id, timezone: input.timezone ?? TZ() },
          ],
        }));
        return id;
      },

      updateSchedule: (id, patch) =>
        set((s) => ({
          schedules: s.schedules.map((x) =>
            x.id === id ? { ...x, ...patch } : x,
          ),
        })),

      moveSchedule: (id, startTime) =>
        set((s) => ({
          schedules: s.schedules.map((x) => {
            if (x.id !== id) return x;
            // Dragging an anchored action moves it relative to its anchor, so
            // the offset is what changes and the anchor stays put. The offset
            // cannot go negative — a correction that happens after the event
            // it corrects is not the same correction — and startTime is
            // derived back from the clamped offset so the stored time never
            // disagrees with where the action actually resolves.
            if (x.recurrence.kind === "before") {
              const anchor = toMinutes(x.recurrence.anchorTime);
              const offsetMinutes = Math.max(0, anchor - toMinutes(startTime));
              return {
                ...x,
                startTime: fromMinutes(anchor - offsetMinutes),
                recurrence: { ...x.recurrence, offsetMinutes },
              };
            }
            return { ...x, startTime };
          }),
        })),

      setRecurrence: (id, recurrence) =>
        set((s) => ({
          schedules: s.schedules.map((x) =>
            x.id === id ? { ...x, recurrence } : x,
          ),
        })),

      toggleSchedule: (id) =>
        set((s) => ({
          schedules: s.schedules.map((x) =>
            x.id === id ? { ...x, active: !x.active } : x,
          ),
        })),

      removeSchedule: (id) =>
        set((s) => ({
          schedules: s.schedules.filter((x) => x.id !== id),
          executions: s.executions.filter((x) => x.scheduleId !== id),
        })),

      ensureExecution: (action) => {
        const existing = get().executions.find(
          (e) => e.scheduleId === action.schedule.id && e.date === action.date,
        );
        if (existing) return existing.id;
        const id = uid("e");
        set((s) => ({
          executions: [
            ...s.executions,
            {
              id,
              correctionId: action.correction.id,
              scheduleId: action.schedule.id,
              date: action.date,
              status: "pending",
              dueTime: action.dueTime,
            },
          ],
        }));
        return id;
      },

      startExecution: (action) => {
        const id = get().ensureExecution(action);
        const ts = nowIso();
        set((s) => ({
          executions: s.executions.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status: "running",
                  // The first start is kept for the history; each resume only
                  // opens a new segment, so banked time is never lost.
                  startedAt: e.startedAt ?? ts,
                  segmentStart: ts,
                  elapsed: e.elapsed ?? 0,
                }
              : e,
          ),
        }));
      },

      pauseExecution: (action) => {
        const id = get().ensureExecution(action);
        set((s) => ({
          executions: s.executions.map((e) => {
            if (e.id !== id || e.status !== "running") return e;
            return {
              ...e,
              status: "paused",
              elapsed: bankElapsed(e),
              segmentStart: undefined,
            };
          }),
        }));
      },

      completeExecution: (action, verdict, result, note, value) => {
        const id = get().ensureExecution(action);
        const status =
          verdict === "yes" ? "done" : verdict === "partial" ? "partial" : "missed";
        set((s) => ({
          executions: s.executions.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status,
                  verdict,
                  result: result?.trim() || undefined,
                  note: note?.trim() || undefined,
                  value: Number.isFinite(value) ? value : undefined,
                  completedAt: nowIso(),
                  startedAt: e.startedAt ?? nowIso(),
                  elapsed: bankElapsed(e),
                  segmentStart: undefined,
                }
              : e,
          ),
        }));
      },

      skipExecution: (action, note) => {
        const id = get().ensureExecution(action);
        set((s) => ({
          executions: s.executions.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status: "skipped",
                  note: note?.trim() || undefined,
                  completedAt: nowIso(),
                }
              : e,
          ),
        }));
      },

      undoExecution: (action) =>
        set((s) => ({
          executions: s.executions.filter(
            (e) =>
              !(e.scheduleId === action.schedule.id && e.date === action.date),
          ),
        })),

      annotateExecution: (id, patch) =>
        set((s) => ({
          executions: s.executions.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),

      addReview: (input) =>
        set((s) => ({ reviews: [...s.reviews, { ...input, id: uid("r") }] })),

      addCapture: (text) => {
        const id = uid("cap");
        set((s) => ({
          captures: [{ id, text, createdAt: nowIso() }, ...s.captures],
        }));
        return id;
      },

      removeCapture: (id) =>
        set((s) => ({ captures: s.captures.filter((c) => c.id !== id) })),

      convertCapture: (id, correctionId) =>
        set((s) => ({
          captures: s.captures.map((c) =>
            c.id === id ? { ...c, convertedTo: correctionId } : c,
          ),
        })),

      startBudget: ({ amount, currency, endDate }) => {
        const today = dayKey();
        const budget: Budget = {
          ...defaultBudget(currency),
          amount,
          currency,
          startDate: today,
          endDate,
          dailyBudgetDate: today,
        };
        // The first day's allowance is just an even share of the whole thing.
        set({
          budget: { ...budget, dailyBudget: whatBudgetForDay(budget, [], today) },
          spends: [],
          pendingRest: null,
        });
      },

      updateBudget: (patch) =>
        set((s) => (s.budget ? { budget: { ...s.budget, ...patch } } : {})),

      setRestMethod: (restMethod) =>
        set((s) => (s.budget ? { budget: { ...s.budget, restMethod } } : {})),

      finishBudget: () => set({ budget: null, spends: [], pendingRest: null }),

      addSpend: ({ amount, tag, date }) =>
        set((s) => ({
          spends: [
            {
              id: uid("sp"),
              amount: round2(amount),
              date: date ?? dayKey(),
              at: nowIso(),
              tag: tag?.trim() || undefined,
            },
            ...s.spends,
          ],
        })),

      removeSpend: (id) =>
        set((s) => ({ spends: s.spends.filter((x) => x.id !== id) })),

      updateSpend: (id, patch) =>
        set((s) => ({
          spends: s.spends.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      rollBudget: (allSpends) => {
        const current = get().budget;
        if (!current) return;
        const { budget, askAbout } = rollDay(current, allSpends);
        if (budget === current && askAbout === null) return;
        set({ budget, pendingRest: askAbout });
      },

      distributeRest: (method, allSpends) => {
        const current = get().budget;
        if (!current) return;
        const today = dayKey();
        const base = whatBudgetForDay(current, allSpends, today);
        const leftOver = get().pendingRest ?? 0;
        set({
          budget: {
            ...current,
            dailyBudget:
              method === "addToday" ? round2(base + leftOver) : base,
            dailyBudgetDate: today,
          },
          pendingRest: null,
        });
      },

      setTheme: (theme) => set({ theme }),

      /**
       * Settle the past.
       *
       * An action that was due yesterday and never touched is a miss, and the
       * product only means anything if that is recorded. Running this on load
       * keeps the Review numbers honest without the user having to confirm
       * their own failures one by one.
       */
      rollover: () => {
        const state = get();
        const today = dayKey();
        if (state.lastRollover === today) return;

        const from = state.lastRollover
          ? addDays(state.lastRollover, 1)
          : addDays(today, -ROLLOVER_HORIZON);

        const additions: Execution[] = [];
        const seen = new Set(
          state.executions.map((e) => `${e.scheduleId}:${e.date}`),
        );

        for (let key = from; key < today; key = addDays(key, 1)) {
          for (const action of resolveDay(state, key)) {
            const token = `${action.schedule.id}:${key}`;
            if (seen.has(token)) continue;
            seen.add(token);
            additions.push({
              id: uid("e"),
              correctionId: action.correction.id,
              scheduleId: action.schedule.id,
              date: key,
              status: "missed",
              dueTime: action.dueTime,
              verdict: "no",
            });
          }
        }

        // A run that is still open from an earlier day is not running now.
        const closed = state.executions.map((e) =>
          (e.status === "running" || e.status === "paused") && e.date < today
            ? {
                ...e,
                status: "missed" as const,
                verdict: "no" as const,
                elapsed: bankElapsed(e),
                segmentStart: undefined,
              }
            : e,
        );

        set({
          executions: additions.length ? [...closed, ...additions] : closed,
          lastRollover: today,
        });
      },

      resetDemo: () =>
        set({
          ...buildSeed(),
          ...buildBudgetSeed(),
          pendingRest: null,
          lastRollover: dayKey(),
          knownSeedIds: SEED_CORRECTION_IDS,
        }),

      clearAll: () =>
        set({
          corrections: [],
          schedules: [],
          executions: [],
          reviews: [],
          captures: [],
          budget: null,
          spends: [],
          pendingRest: null,
          lastRollover: dayKey(),
          // Everything was cleared on purpose; samples must not creep back.
          knownSeedIds: SEED_CORRECTION_IDS,
        }),
    }),
    {
      name: "corrective.v1",
      // The store is read during SSR too, so hydration is deferred to the
      // client and the shell renders a skeleton until it has run.
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      /**
       * Introduce newly added demo corrections, additively.
       *
       * Persisted data always beats a new seed, so an install made before a
       * sample existed would never see it. Replacing the whole store would
       * destroy real work, and refusing outright leaves the sample permanently
       * invisible to anyone who has written even one correction of their own.
       *
       * So only the samples this store has never been offered are appended,
       * with their schedules and history. Nothing existing is touched, and a
       * demo correction the user deleted stays deleted because its id is
       * already recorded.
       */
      migrate: (persisted) => {
        const state = persisted as CorrectiveState;
        const corrections = state?.corrections ?? [];

        const known = new Set(state?.knownSeedIds ?? []);
        // Stores written before this field existed were seeded with whatever
        // samples shipped at the time, so treat the ones still present as
        // already offered.
        if (!state?.knownSeedIds) {
          for (const c of corrections) {
            if (SEED_CORRECTION_IDS.includes(c.id)) known.add(c.id);
          }
        }

        const missing = SEED_CORRECTION_IDS.filter((id) => !known.has(id));
        if (!missing.length) {
          return { ...state, knownSeedIds: [...known] };
        }

        const fresh = buildSeed();
        const wanted = new Set(missing);
        const schedules = fresh.schedules.filter((x) =>
          wanted.has(x.correctionId),
        );
        const scheduleIds = new Set(schedules.map((x) => x.id));

        return {
          ...state,
          corrections: [
            ...corrections,
            ...fresh.corrections.filter((c) => wanted.has(c.id)),
          ],
          schedules: [...(state?.schedules ?? []), ...schedules],
          executions: [
            ...(state?.executions ?? []),
            ...fresh.executions.filter((e) => scheduleIds.has(e.scheduleId)),
          ],
          reviews: [
            ...(state?.reviews ?? []),
            ...fresh.reviews.filter((r) => wanted.has(r.correctionId)),
          ],
          knownSeedIds: [...known, ...missing],
        };
      },
      partialize: (s) => ({
        corrections: s.corrections,
        schedules: s.schedules,
        executions: s.executions,
        reviews: s.reviews,
        captures: s.captures,
        budget: s.budget,
        spends: s.spends,
        pendingRest: s.pendingRest,
        lastRollover: s.lastRollover,
        knownSeedIds: s.knownSeedIds,
        theme: s.theme,
      }),
      version: 3,
    },
  ),
);

/* ---------------------------------------------------------------- selectors */

/**
 * Today's actions, split the way the Today screen presents them.
 *
 * `now` is passed in rather than read here so the split is a pure function of
 * its inputs: the same state and the same clock always produce the same
 * buckets, which is what lets this render identically on both sides of
 * hydration. Pass -1 when the clock is not known yet; nothing is then treated
 * as live or overdue.
 */
export function selectDay(
  state: CorrectiveState,
  key = dayKey(),
  now = minutesNow(),
) {
  const actions = resolveDay(state, key);
  const isToday = key === dayKey() && now >= 0;

  const done: ResolvedAction[] = [];
  const overdue: ResolvedAction[] = [];
  const live: ResolvedAction[] = [];
  const upcoming: ResolvedAction[] = [];

  for (const a of actions) {
    const st = a.execution?.status;
    // A run in progress is neither settled nor merely upcoming.
    if (
      st === "done" ||
      st === "partial" ||
      st === "missed" ||
      st === "skipped"
    ) {
      done.push(a);
      continue;
    }
    if (!isToday) {
      upcoming.push(a);
      continue;
    }
    const end = a.dueMinutes + a.schedule.duration;
    if (st === "running" || st === "paused") live.push(a);
    else if (end < now) overdue.push(a);
    else if (a.dueMinutes <= now) live.push(a);
    else upcoming.push(a);
  }

  return { actions, done, overdue, live, upcoming };
}

export function selectCorrection(state: CorrectiveState, id: string) {
  const correction = state.corrections.find((c) => c.id === id);
  if (!correction) return null;
  return {
    correction,
    schedules: state.schedules.filter((s) => s.correctionId === id),
    executions: state.executions
      .filter((e) => e.correctionId === id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    reviews: state.reviews
      .filter((r) => r.correctionId === id)
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

