/**
 * Corrective's domain model.
 *
 * The loop the whole product is built around:
 *   Problem -> Cause -> Correction -> Scheduled Action -> Execution -> Result -> Review
 *
 * Shapes are kept flat and id-referenced so the local store can be swapped for
 * a real API later without the UI changing.
 */

export type CorrectionStatus =
  | "testing"
  | "active"
  | "improved"
  | "solved"
  | "abandoned";

export type ExecutionStatus =
  | "pending"
  | "running"
  | "paused"
  | "done"
  | "partial"
  | "missed"
  | "skipped";

/** How the user answered "did you do it?" */
export type Verdict = "yes" | "no" | "partial";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Recurrence =
  | { kind: "once"; date: string }
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "weekly"; days: Weekday[] }
  /**
   * Anchored to a real-world event the user already has, e.g.
   * "20 minutes before teaching". The anchor carries its own time and days so
   * this needs no separate calendar entity; the due time is derived.
   */
  | {
      kind: "before";
      anchor: string;
      anchorTime: string;
      offsetMinutes: number;
      days: Weekday[];
    };

/**
 * A quantified measurement.
 *
 * Optional. Most corrections are answered yes or no, and forcing a number
 * onto them would be false precision. But some problems have a figure
 * attached — money spent, minutes lost, pages unread — and where one exists
 * it is far better evidence than a verdict.
 *
 * `direction` says which way is better, so the same type covers "spend under
 * ten pounds" and "write at least two pages".
 */
export interface Metric {
  /** Shown next to the number: "GBP", "min", "pages". */
  unit: string;
  /** ISO 4217 code when the unit is money; drives currency formatting. */
  currency?: string;
  /** The figure the correction is aiming for, per occurrence. */
  target?: number;
  direction: "below" | "above";
}

export interface Correction {
  id: string;
  /** What went wrong. */
  problem: string;
  /** Why it happened. */
  cause: string;
  /** What it cost. */
  cost: string;
  /** The specific replacement behaviour. */
  correction: string;
  /** The objective evidence that it was performed, as a question. */
  measurement: string;
  /** Turns that question into a number. Absent for yes/no corrections. */
  metric?: Metric;
  status: CorrectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  correctionId: string;
  /** Short name for the action itself, e.g. "Verbal revision". */
  label: string;
  /** "HH:mm", local. */
  startTime: string;
  /** Minutes. */
  duration: number;
  recurrence: Recurrence;
  timezone: string;
  active: boolean;
}

export interface Execution {
  id: string;
  correctionId: string;
  scheduleId: string;
  /** "YYYY-MM-DD" — the day the action was due. */
  date: string;
  status: ExecutionStatus;
  /** Scheduled time, copied at materialisation so edits don't rewrite history. */
  dueTime: string;
  /** First time the user pressed Start; never overwritten by a resume. */
  startedAt?: string;
  completedAt?: string;
  /** Seconds banked by previous run segments. */
  elapsed?: number;
  /** Start of the segment currently running, if any. */
  segmentStart?: string;
  verdict?: Verdict;
  /** The measured figure, when the correction carries a metric. */
  value?: number;
  /** What happened afterward. */
  result?: string;
  note?: string;
}

export interface ReviewEntry {
  id: string;
  correctionId: string;
  date: string;
  /** Did the correction itself work, independent of whether it was performed? */
  assessment: "working" | "unclear" | "not-working";
  result: string;
}

/** An unstructured problem captured in the moment, before it has a shape. */
export interface Capture {
  id: string;
  text: string;
  createdAt: string;
  /** Set once it has been promoted into a Correction. */
  convertedTo?: string;
}

/** A schedule resolved against one concrete day, joined to its correction. */
export interface ResolvedAction {
  schedule: Schedule;
  correction: Correction;
  date: string;
  dueTime: string;
  /** Minutes from midnight — the sort key for a day. */
  dueMinutes: number;
  execution?: Execution;
}
