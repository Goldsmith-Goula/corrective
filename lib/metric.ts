import type { Execution, Metric, Verdict } from "./types";

/**
 * Quantified measurement.
 *
 * Formatting, target comparison and trend, kept together so the rules about
 * what counts as an improvement live in one place rather than being decided
 * again in each screen.
 */

/** Common units, offered in the editor. Any string is still accepted. */
export const UNIT_PRESETS: Array<{
  unit: string;
  currency?: string;
  label: string;
  direction: Metric["direction"];
}> = [
  { unit: "GBP", currency: "GBP", label: "£ money", direction: "below" },
  { unit: "USD", currency: "USD", label: "$ money", direction: "below" },
  { unit: "EUR", currency: "EUR", label: "€ money", direction: "below" },
  { unit: "min", label: "minutes", direction: "below" },
  { unit: "pages", label: "pages", direction: "above" },
  { unit: "reps", label: "reps", direction: "above" },
];

export const isMoney = (metric: Metric) => Boolean(metric.currency);

/**
 * A value as the user should read it.
 *
 * Money gets real currency formatting; everything else gets the unit appended
 * and trailing zeros trimmed, because "3 pages" reads better than "3.00 pages".
 */
export function formatValue(value: number, metric: Metric) {
  if (metric.currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: metric.currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      // An unrecognised currency code should not blank the number out.
      return `${value.toFixed(2)} ${metric.currency}`;
    }
  }
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${metric.unit}`;
}

/** "under £10.00" / "at least 2 pages" — the target, stated as a rule. */
export function describeTarget(metric: Metric) {
  if (metric.target === undefined) return null;
  const amount = formatValue(metric.target, metric);
  return metric.direction === "below" ? `under ${amount}` : `at least ${amount}`;
}

/** Did this figure meet the target? Null when there is no target to meet. */
export function meetsTarget(value: number, metric: Metric): boolean | null {
  if (metric.target === undefined) return null;
  return metric.direction === "below"
    ? value <= metric.target
    : value >= metric.target;
}

/**
 * The verdict implied by a figure.
 *
 * Deriving it is the point of having a metric: the answer stops being a
 * judgement call. The user can still override it, because a number does not
 * always know what happened.
 */
export function verdictFor(value: number, metric: Metric): Verdict {
  const met = meetsTarget(value, metric);
  if (met === null) return "yes";
  return met ? "yes" : "no";
}

export interface MetricSummary {
  metric: Metric;
  /** Recorded figures, oldest first. */
  values: number[];
  total: number;
  mean: number;
  /** Mean of the older half, when there is enough history to split. */
  previousMean: number | null;
  /** Mean of the newer half. */
  recentMean: number | null;
  /** Signed change from previousMean to recentMean. */
  change: number | null;
  /** Did the change go the way the correction wants? */
  improving: boolean | null;
  /** Occurrences that met the target, out of those with a target. */
  met: number;
  scored: number;
}

/**
 * Aggregate the figures behind one correction.
 *
 * The trend is a split-half comparison rather than a fitted line: with eight
 * or ten data points a regression implies more confidence than the data has,
 * and "it averaged X, now it averages Y" is something the user can check by
 * eye against the history list.
 */
export function summariseMetric(
  metric: Metric,
  executions: Execution[],
): MetricSummary | null {
  // Oldest first, and only executions that actually carry a figure.
  const values = executions
    .filter((e) => typeof e.value === "number" && Number.isFinite(e.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => e.value as number);

  if (!values.length) return null;

  const total = values.reduce((n, v) => n + v, 0);
  const mean = total / values.length;

  let previousMean: number | null = null;
  let recentMean: number | null = null;
  if (values.length >= 4) {
    const mid = Math.floor(values.length / 2);
    const older = values.slice(0, mid);
    const newer = values.slice(mid);
    previousMean = older.reduce((n, v) => n + v, 0) / older.length;
    recentMean = newer.reduce((n, v) => n + v, 0) / newer.length;
  }

  const change =
    previousMean !== null && recentMean !== null
      ? recentMean - previousMean
      : null;

  let improving: boolean | null = null;
  if (change !== null && previousMean) {
    // Ignore noise: a swing under 5% of the earlier average is not a trend.
    const meaningful = Math.abs(change) > Math.abs(previousMean) * 0.05;
    improving = meaningful
      ? metric.direction === "below"
        ? change < 0
        : change > 0
      : null;
  }

  const scored = metric.target === undefined ? 0 : values.length;
  const met = scored
    ? values.filter((v) => meetsTarget(v, metric) === true).length
    : 0;

  return {
    metric,
    values,
    total,
    mean,
    previousMean,
    recentMean,
    change,
    improving,
    met,
    scored,
  };
}

/**
 * One sentence about the figures.
 *
 * Phrased as a movement between two averages the user can verify, never as a
 * score. Returns null when there is not enough to say, so the caller falls
 * back to the execution-count evidence instead of inventing a trend.
 */
export function metricEvidence(
  summary: MetricSummary,
  noun = "it",
): string | null {
  const { metric, previousMean, recentMean, improving } = summary;

  if (previousMean !== null && recentMean !== null && improving !== null) {
    const direction = improving ? "fell" : "rose";
    const from = formatValue(previousMean, metric);
    const to = formatValue(recentMean, metric);
    return `${noun} ${direction} from an average of ${from} to ${to}.`;
  }

  if (summary.scored >= 3) {
    return `${summary.met} of ${summary.scored} were ${
      describeTarget(metric) ?? "on target"
    }.`;
  }

  if (summary.values.length >= 2) {
    return `Averaging ${formatValue(summary.mean, metric)} across ${
      summary.values.length
    } recorded.`;
  }

  return null;
}
