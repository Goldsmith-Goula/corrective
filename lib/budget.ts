import { addDays, dayKey, parseDayKey } from "./date";
import type { Correction, Execution } from "./types";

/**
 * The daily-budget model, ported from Buckwheat.
 *
 * The idea is not "track what you spent" but "know what you can spend today".
 * A budget is an amount and an end date; everything else is derived. Each day
 * gets an allowance, and what you do not spend is redistributed by an explicit
 * rule rather than silently vanishing.
 *
 * Formulas follow the original's SpendsRepository:
 *   restDays          = days from today to the finish date, inclusive
 *   whatBudgetForDay  = (budget - spentBefore - spentToday) / max(restDays, 1)
 *   budgetRest        = budget - spentBefore - spentToday
 */

export type RestMethod = "rest" | "addToday" | "ask";

export interface Budget {
  amount: number;
  currency: string;
  /** "YYYY-MM-DD" */
  startDate: string;
  /** "YYYY-MM-DD", inclusive. */
  endDate: string;
  /** Today's allowance, fixed at the start of the day. */
  dailyBudget: number;
  /** The day `dailyBudget` was last computed for. */
  dailyBudgetDate: string;
  /** What happens to money left over at the end of a day. */
  restMethod: RestMethod;
}

export interface Spend {
  id: string;
  amount: number;
  /** "YYYY-MM-DD" */
  date: string;
  /** ISO timestamp, for ordering within a day. */
  at: string;
  /** Free-text category, as in the original's tags. */
  tag?: string;
  /**
   * Set when this spend came from executing a money-measured correction
   * rather than being entered by hand. Those rows are not editable here —
   * they belong to the correction's execution history.
   */
  correctionId?: string;
}

export const REST_METHOD_LABEL: Record<RestMethod, string> = {
  rest: "Spread over the rest",
  addToday: "Add to the next day",
  ask: "Always ask",
};

export const REST_METHOD_HINT: Record<RestMethod, string> = {
  rest: "Left-over money is divided evenly across the days that remain.",
  addToday: "Left-over money all goes onto the following day.",
  ask: "Decide each time there is something left.",
};

/** Days from `from` to `to` inclusive; never negative. */
export function countDays(from: string, to: string) {
  const a = parseDayKey(from).getTime();
  const b = parseDayKey(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

/**
 * Spends from executing corrections that measure money.
 *
 * Derived rather than copied: the execution is the single source of truth, so
 * editing or undoing it on Today updates the budget with no second write and
 * no chance of the two disagreeing.
 */
export function spendsFromCorrections(
  corrections: Correction[],
  executions: Execution[],
  currency: string,
): Spend[] {
  const money = new Map(
    corrections
      .filter((c) => c.metric?.currency === currency)
      .map((c) => [c.id, c]),
  );
  if (!money.size) return [];

  return executions
    .filter(
      (e) =>
        money.has(e.correctionId) &&
        typeof e.value === "number" &&
        Number.isFinite(e.value) &&
        e.value > 0,
    )
    .map((e) => ({
      id: `x_${e.id}`,
      amount: e.value as number,
      date: e.date,
      at: e.completedAt ?? `${e.date}T12:00:00.000Z`,
      tag: money.get(e.correctionId)?.correction,
      correctionId: e.correctionId,
    }));
}

export interface BudgetState {
  budget: Budget;
  /** Manual spends and correction-derived spends, merged. */
  spends: Spend[];
  /** Spent on days before today. */
  spentBefore: number;
  /** Spent today. */
  spentToday: number;
  /** Whole-period money still unspent. */
  budgetRest: number;
  /** Today's allowance minus what today has already taken. */
  todayLeft: number;
  /** Days remaining including today. */
  restDays: number;
  /** Days from the start of the period to the finish. */
  totalDays: number;
  /** Fraction of the whole budget still unspent, 0–1. */
  restFraction: number;
  /** Has the finish date passed? */
  finished: boolean;
  /** Is today's allowance already exceeded? */
  overspent: boolean;
}

export function budgetState(
  budget: Budget,
  spends: Spend[],
  today = dayKey(),
): BudgetState {
  const inPeriod = spends.filter(
    (s) => s.date >= budget.startDate && s.date <= budget.endDate,
  );

  const spentBefore = inPeriod
    .filter((s) => s.date < today)
    .reduce((n, s) => n + s.amount, 0);
  const spentToday = inPeriod
    .filter((s) => s.date === today)
    .reduce((n, s) => n + s.amount, 0);

  const budgetRest = budget.amount - spentBefore - spentToday;
  const restDays = countDays(today, budget.endDate);

  return {
    budget,
    spends: inPeriod,
    spentBefore,
    spentToday,
    budgetRest,
    todayLeft: budget.dailyBudget - spentToday,
    restDays,
    totalDays: countDays(budget.startDate, budget.endDate),
    restFraction: budget.amount > 0 ? Math.max(0, budgetRest) / budget.amount : 0,
    finished: today > budget.endDate,
    overspent: budget.dailyBudget - spentToday < 0,
  };
}

/** The allowance a fresh day should get, given what is left and how long. */
export function whatBudgetForDay(
  budget: Budget,
  spends: Spend[],
  today = dayKey(),
) {
  const state = budgetState(budget, spends, today);
  const days = Math.max(1, state.restDays);
  return round2(Math.max(0, state.budgetRest) / days);
}

/** Money that was allowed yesterday and not used. */
export function howMuchNotSpent(
  budget: Budget,
  spends: Spend[],
  today = dayKey(),
) {
  const previous = budget.dailyBudgetDate;
  if (!previous || previous >= today) return 0;
  const spentThatDay = spends
    .filter((s) => s.date === previous)
    .reduce((n, s) => n + s.amount, 0);
  return round2(Math.max(0, budget.dailyBudget - spentThatDay));
}

/**
 * Roll the budget onto today.
 *
 * Returns the new daily allowance, plus whether the user still owes a decision
 * about left-over money (the ASK method). Mirrors runChangeDayAction.
 */
export function rollDay(
  budget: Budget,
  spends: Spend[],
  today = dayKey(),
): { budget: Budget; askAbout: number | null } {
  if (budget.dailyBudgetDate === today) return { budget, askAbout: null };

  const leftOver = howMuchNotSpent(budget, spends, today);

  // Nothing left over, or the period is done: just recompute the share.
  if (leftOver <= 0 || today > budget.endDate) {
    return {
      budget: {
        ...budget,
        dailyBudget: whatBudgetForDay(budget, spends, today),
        dailyBudgetDate: today,
      },
      askAbout: null,
    };
  }

  if (budget.restMethod === "ask") {
    // Hold the decision open, but do not leave the day without an allowance.
    return {
      budget: {
        ...budget,
        dailyBudget: whatBudgetForDay(budget, spends, today),
        dailyBudgetDate: today,
      },
      askAbout: leftOver,
    };
  }

  if (budget.restMethod === "addToday") {
    const base = whatBudgetForDay(budget, spends, today);
    return {
      budget: {
        ...budget,
        dailyBudget: round2(base + leftOver),
        dailyBudgetDate: today,
      },
      askAbout: null,
    };
  }

  // "rest": the leftover is already inside budgetRest, so an even share of
  // what remains spreads it across the days that are left.
  return {
    budget: {
      ...budget,
      dailyBudget: whatBudgetForDay(budget, spends, today),
      dailyBudgetDate: today,
    },
    askAbout: null,
  };
}

/** Spends grouped by day, newest day first, with a per-day total. */
export function groupByDay(spends: Spend[]) {
  const days = new Map<string, Spend[]>();
  for (const s of spends) {
    const list = days.get(s.date) ?? [];
    list.push(s);
    days.set(s.date, list);
  }
  return [...days.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.at.localeCompare(a.at)),
      total: items.reduce((n, s) => n + s.amount, 0),
    }));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** A sensible starting budget: a month from today. */
export function defaultBudget(currency = "GBP"): Budget {
  const today = dayKey();
  return {
    amount: 0,
    currency,
    startDate: today,
    endDate: addDays(today, 29),
    dailyBudget: 0,
    dailyBudgetDate: today,
    restMethod: "rest",
  };
}
