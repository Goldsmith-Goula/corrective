import { metricEvidence, summariseMetric, type MetricSummary } from "./metric";
import { nextForCorrection } from "./schedule";
import type {
  Correction,
  Execution,
  ReviewEntry,
  Schedule,
} from "./types";

/** Statuses that mean the action's outcome is settled. */
const TERMINAL = new Set(["done", "partial", "missed", "skipped"]);

export interface CorrectionStats {
  correction: Correction;
  /** Actions whose outcome is settled — the honest denominator. */
  attempted: number;
  completed: number;
  partial: number;
  missed: number;
  skipped: number;
  /** completed / attempted, 0 when nothing has been attempted. */
  completionRate: number;
  /** Consecutive completions ending at the most recent settled action. */
  streak: number;
  /** Completions within the last `window` settled actions. */
  windowCompleted: number;
  windowTotal: number;
  /** Free-text results the user wrote after executing. */
  resultsRecorded: number;
  /** Reviews where the correction itself was judged to be working. */
  reviewsWorking: number;
  reviewsTotal: number;
  next: { date: string; time: string } | null;
  /** Present only when the correction carries a metric and has figures. */
  metric: MetricSummary | null;
  /** Is the behaviour being performed? */
  execution: "untested" | "failing" | "inconsistent" | "holding";
  /** Given that it was performed, is it changing the outcome? */
  effect: "no-evidence" | "working" | "unclear" | "not-working";
}

export function statsFor(
  correction: Correction,
  executions: Execution[],
  schedules: Schedule[],
  reviews: ReviewEntry[],
  window = 8,
): CorrectionStats {
  const mine = executions
    .filter((e) => e.correctionId === correction.id && TERMINAL.has(e.status))
    .sort((a, b) => a.date.localeCompare(b.date));

  const completed = mine.filter((e) => e.status === "done").length;
  const partial = mine.filter((e) => e.status === "partial").length;
  const missed = mine.filter((e) => e.status === "missed").length;
  const skipped = mine.filter((e) => e.status === "skipped").length;
  const attempted = mine.length;

  let streak = 0;
  for (let i = mine.length - 1; i >= 0; i--) {
    if (mine[i].status === "done") streak++;
    else break;
  }

  const recent = mine.slice(-window);
  const myReviews = reviews.filter((r) => r.correctionId === correction.id);
  const completionRate = attempted ? completed / attempted : 0;

  // Execution: am I doing the thing?
  let execution: CorrectionStats["execution"] = "untested";
  if (attempted >= 3) {
    if (completionRate >= 0.8) execution = "holding";
    else if (completionRate >= 0.5) execution = "inconsistent";
    else execution = "failing";
  } else if (attempted > 0) {
    execution = "inconsistent";
  }

  // Effect: given that it was done, did anything change?
  //
  // This used to come from a separate "has the problem got smaller?" prompt.
  // That asked the user to do the work twice: ticking a day done and writing
  // what happened is already the evidence. So it is computed now — from the
  // measured figure where one exists, and otherwise left unclaimed.
  //
  // Completion is deliberately never treated as effect on its own. Doing the
  // behaviour is not the same as the problem shrinking, and collapsing the
  // two is exactly how this turns into a habit tracker.
  const metric = correction.metric
    ? summariseMetric(correction.metric, mine)
    : null;

  let effect: CorrectionStats["effect"] = "no-evidence";
  if (metric) {
    if (metric.improving === true) effect = "working";
    else if (metric.improving === false) effect = "not-working";
    else if (metric.values.length >= 3) effect = "unclear";
  }

  // Without a figure, the evidence is what the user wrote after doing it.
  // Their words: ticking a day done and writing what happened is itself the
  // proof. Only results attached to a completion count — a note left after a
  // miss is describing what got in the way, not an improvement.
  const positiveResults = mine.filter(
    (e) =>
      (e.status === "done" || e.status === "partial") && e.result?.trim(),
  ).length;

  if (!metric) {
    if (positiveResults >= 2 && completionRate >= 0.5) effect = "working";
    else if (positiveResults >= 1) effect = "unclear";
  }

  // Older stores may still hold entries from the retired prompt. They were
  // real statements by the user, so they still count where they exist.
  const reviewsWorking = myReviews.filter((r) => r.assessment === "working").length;
  const reviewsNot = myReviews.filter((r) => r.assessment === "not-working").length;
  if (!metric && reviewsNot > reviewsWorking) effect = "not-working";

  return {
    correction,
    metric,
    attempted,
    completed,
    partial,
    missed,
    skipped,
    completionRate,
    streak,
    windowCompleted: recent.filter((e) => e.status === "done").length,
    windowTotal: recent.length,
    resultsRecorded: mine.filter((e) => e.result && e.result.trim()).length,
    reviewsWorking,
    reviewsTotal: myReviews.length,
    next: nextForCorrection(schedules, correction.id),
    execution,
    effect,
  };
}

/**
 * One sentence of evidence about a correction.
 *
 * Deliberately phrased as a count against a count. No percentages dressed up
 * as achievement, no encouragement — the point is that the user can check it.
 */
export function evidenceLine(s: CorrectionStats, actionLabel: string) {
  if (!s.attempted) return `${actionLabel} has not been attempted yet.`;

  const base = `${actionLabel} was completed ${s.windowCompleted} of the last ${s.windowTotal} times.`;

  // A measured figure outranks a completion count: it says what changed
  // rather than only that something was done.
  if (s.metric && s.completed >= 2) {
    const line = metricEvidence(s.metric, "the figure");
    if (line) {
      return `After ${s.completed} completed executions, ${line}`;
    }
  }

  // Order matters. A correction that is mostly being missed must lead with
  // that, even when a couple of the completions had results written on them —
  // otherwise a failing correction gets a sentence that reads like progress.
  if (s.missed >= 2 && s.completionRate < 0.5) {
    return `${actionLabel} was missed ${s.missed} of ${s.attempted} times. The behaviour is not happening yet.`;
  }
  if (s.effect === "not-working" && s.completed >= 2) {
    return `${actionLabel} was completed ${s.completed} times and the problem still recurred — the correction itself may be wrong.`;
  }
  if (s.completed >= 2 && s.resultsRecorded >= 2) {
    return `Completed ${s.completed} times, and you wrote down what happened on ${s.resultsRecorded} of them.`;
  }
  return base;
}

export interface Portfolio {
  totalAttempted: number
  totalCompleted: number;
  totalMissed: number;
  completionRate: number;
  /** Being performed, and the problem is measurably smaller. */
  working: CorrectionStats[];
  /** Performed, but the problem persists — the correction is suspect. */
  ineffective: CorrectionStats[];
  /** Not being performed at all — the plan is suspect. */
  unexecuted: CorrectionStats[];
  /** Being performed, with nothing yet to show either way. */
  inconclusive: CorrectionStats[];
  /** Not enough settled actions to say anything. */
  tooEarly: CorrectionStats[];
  all: CorrectionStats[];
}

export function portfolio(
  corrections: Correction[],
  executions: Execution[],
  schedules: Schedule[],
  reviews: ReviewEntry[],
): Portfolio {
  const live = corrections.filter((c) => c.status !== "abandoned");
  const all = live.map((c) => statsFor(c, executions, schedules, reviews));

  const totalAttempted = all.reduce((n, s) => n + s.attempted, 0);
  const totalCompleted = all.reduce((n, s) => n + s.completed, 0);
  const totalMissed = all.reduce((n, s) => n + s.missed, 0);

  // Assigned in priority order, so the groups partition the set exactly.
  // Independent filters used to let a correction match none of them — one
  // being executed inconsistently but improving fell through every test and
  // disappeared from the page, which is the opposite of what Review is for.
  const working: CorrectionStats[] = [];
  const ineffective: CorrectionStats[] = [];
  const unexecuted: CorrectionStats[] = [];
  const inconclusive: CorrectionStats[] = [];
  const tooEarly: CorrectionStats[] = [];

  for (const s of all) {
    if (s.attempted < 3) tooEarly.push(s);
    else if (s.execution === "failing") unexecuted.push(s);
    else if (s.effect === "not-working") ineffective.push(s);
    else if (s.effect === "working") working.push(s);
    else inconclusive.push(s);
  }

  return {
    totalAttempted,
    totalCompleted,
    totalMissed,
    completionRate: totalAttempted ? totalCompleted / totalAttempted : 0,
    working,
    ineffective,
    unexecuted,
    inconclusive,
    tooEarly,
    all,
  };
}

export function percent(n: number) {
  return `${Math.round(n * 100)}%`;
}
