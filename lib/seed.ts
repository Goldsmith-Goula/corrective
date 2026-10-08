import { defaultBudget, round2, type Budget, type Spend } from "./budget";
import { addDays, dayKey, minutesNow, toMinutes } from "./date";
import { dueTimeOf, occursOn } from "./schedule";
import type {
  Capture,
  Correction,
  Execution,
  ReviewEntry,
  Schedule,
  Verdict,
} from "./types";

/**
 * Demo data.
 *
 * Generated relative to the current date so the app is never empty on first
 * open. It is written to demonstrate the mechanism, not to motivate: some
 * corrections are holding, one is being executed but is not working, and one
 * is not being executed at all.
 */

const TZ =
  typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "UTC";

type Outcome = "done" | "partial" | "missed" | "skipped";

interface Spec {
  correction: Omit<Correction, "createdAt" | "updatedAt">;
  ageDays: number;
  schedule: Omit<Schedule, "correctionId" | "timezone">;
  /** Outcomes oldest-first, cycled across the generated history. */
  pattern: Outcome[];
  /**
   * The figure recorded for an occurrence, where the correction is measured.
   * Takes the outcome so the number tracks the behaviour rather than drifting
   * independently of it, and `progress` (0 at the oldest, 1 at the newest) so
   * the history can show a trend.
   */
  values?: (outcome: Outcome, progress: number) => number;
  results: string[];
  reviews: Array<{
    assessment: ReviewEntry["assessment"];
    result: string;
    daysAgo: number;
  }>;
}

const SPECS: Spec[] = [
  {
    ageDays: 24,
    correction: {
      id: "c_teaching",
      problem: "I taught a lesson without revising the material first.",
      cause: "I prepared written notes but never rehearsed them out loud.",
      cost: "I fumbled explanations in class and had to read from my own notes.",
      correction: "Spend 20 minutes verbally revising before every lesson.",
      measurement: "Did I revise out loud before the session? Yes / No",
      status: "testing",
    },
    schedule: {
      id: "s_teaching",
      label: "Verbal revision",
      startTime: "08:10",
      duration: 20,
      recurrence: {
        kind: "before",
        anchor: "teaching",
        anchorTime: "08:30",
        offsetMinutes: 20,
        days: [1, 2, 3, 4, 5],
      },
      active: true,
    },
    pattern: ["done", "done", "missed", "done", "done", "partial", "done", "done"],
    results: [
      "Explained the derivation without looking down once.",
      "Smoother than last week. Still slow on the second example.",
      "Ran out of time and went in cold. Lost the thread twice.",
      "No fumbling. Finished the section with ten minutes to spare.",
    ],
    reviews: [
      {
        assessment: "working",
        result: "Lessons are noticeably smoother on the days the revision happens.",
        daysAgo: 14,
      },
      {
        assessment: "working",
        result: "Second week running. Fewer questions I could not answer.",
        daysAgo: 7,
      },
      {
        assessment: "working",
        result: "Did not need the notes at all in two of three lessons.",
        daysAgo: 2,
      },
    ],
  },
  {
    ageDays: 19,
    correction: {
      id: "c_procrastination",
      problem: "I lose the first two hours of the day before starting to code.",
      cause: "I open messages and news before I open the editor.",
      cost:
        "Deep work starts after lunch, so the hard problems get my worst hours.",
      correction:
        "Open the editor and start the first task before anything else, with the phone in another room.",
      measurement: "Was the first commit pushed before 10:00? Yes / No",
      status: "active",
    },
    schedule: {
      id: "s_procrastination",
      label: "First task, cold start",
      startTime: "08:45",
      duration: 90,
      recurrence: { kind: "weekdays" },
      active: true,
    },
    pattern: [
      "missed",
      "done",
      "missed",
      "partial",
      "missed",
      "done",
      "missed",
      "missed",
    ],
    results: [
      "Phone stayed in the kitchen. First commit at 09:20.",
      "Checked messages for a second at 08:40. Started at 10:35.",
      "Got going, but only after reading mail. Half the block gone.",
    ],
    reviews: [
      {
        assessment: "unclear",
        result:
          "When it happens it clearly works. It mostly does not happen, so there is little to judge.",
        daysAgo: 9,
      },
    ],
  },
  {
    ageDays: 38,
    correction: {
      id: "c_deepwork",
      problem: "My coding blocks get fragmented by notifications.",
      cause: "Slack and email stay open on the second monitor all day.",
      cost: "A two-hour block produced about forty minutes of real work.",
      correction:
        "Close all messaging apps and run one 50-minute block with no tabs open besides the task.",
      measurement: "Did the block run 50 minutes without switching away? Yes / No",
      status: "improved",
    },
    schedule: {
      id: "s_deepwork",
      label: "Sealed block",
      startTime: "14:00",
      duration: 50,
      recurrence: { kind: "weekdays" },
      active: true,
    },
    pattern: ["done", "done", "done", "partial", "done", "done", "done", "done"],
    results: [
      "Full fifty with no switching. Finished the parser.",
      "One interruption from a call I had forgotten to silence.",
      "Cleared the whole migration in a single block.",
    ],
    reviews: [
      {
        assessment: "working",
        result: "Roughly double the output per block compared with before.",
        daysAgo: 21,
      },
      {
        assessment: "working",
        result: "Still holding. It is the default now rather than an effort.",
        daysAgo: 10,
      },
      {
        assessment: "working",
        result: "Moved from Testing to Improved. Considering a second block.",
        daysAgo: 3,
      },
    ],
  },
  {
    ageDays: 16,
    correction: {
      id: "c_exercise",
      problem: "I skip exercise whenever the day gets busy.",
      cause:
        "It is scheduled for the evening, by which point I am depleted and negotiating with myself.",
      cost: "Two sessions in three weeks, and the lower back pain came back.",
      correction:
        "Move the session to 06:40 and do it before the day can make any claim on the time.",
      measurement: "Did the session happen before 08:00? Yes / No",
      status: "testing",
    },
    schedule: {
      id: "s_exercise",
      label: "Morning session",
      startTime: "06:40",
      duration: 35,
      recurrence: { kind: "weekly", days: [1, 3, 5] },
      active: true,
    },
    pattern: ["missed", "missed", "done", "missed", "missed", "partial", "missed"],
    results: [
      "Up and out before the house woke. Back felt better by midday.",
      "Alarm went off and I reset it. Told myself I would go at six in the evening. I did not.",
      "Twenty minutes instead of thirty-five. Better than nothing.",
    ],
    reviews: [
      {
        assessment: "not-working",
        result:
          "Moving the time did not fix it. The alarm is not the obstacle: the phone is next to the bed and I dismiss it half asleep.",
        daysAgo: 6,
      },
    ],
  },
  {
    ageDays: 12,
    correction: {
      id: "c_study",
      problem: "I re-read study material instead of testing myself on it.",
      cause: "Re-reading feels productive and recall feels uncomfortable.",
      cost:
        "I recognised everything during review and could reproduce almost none of it in the exam.",
      correction:
        "Close the book and write out everything I can recall for 15 minutes before opening it again.",
      measurement: "Did I write a recall sheet with the book closed? Yes / No",
      status: "active",
    },
    schedule: {
      id: "s_study",
      label: "Blank-page recall",
      startTime: "20:30",
      duration: 15,
      recurrence: { kind: "daily" },
      active: true,
    },
    pattern: [
      "partial",
      "done",
      "done",
      "missed",
      "done",
      "done",
      "done",
      "partial",
      "done",
    ],
    results: [
      "Recalled about half the chapter. The gaps were exactly what I had skimmed.",
      "Uncomfortable, and much more useful than re-reading.",
      "Wrote two pages from memory. Found three things I thought I knew.",
    ],
    reviews: [
      {
        assessment: "working",
        result:
          "The gaps it exposes are consistently the material I would have failed on.",
        daysAgo: 5,
      },
    ],
  },
  {
    ageDays: 28,
    correction: {
      id: "c_lunch",
      problem:
        "I buy lunch out whenever I have not prepped the night before.",
      cause:
        "I decide what to eat at 12:30, when I am already hungry and in a hurry.",
      cost: "Around 85 pounds a week, for food worse than I would have made.",
      correction:
        "Pack tomorrow's lunch while clearing up after dinner, before sitting down.",
      measurement: "What did lunch cost today?",
      metric: { unit: "GBP", currency: "GBP", target: 10, direction: "below" },
      status: "active",
    },
    schedule: {
      id: "s_lunch",
      label: "Pack tomorrow's lunch",
      startTime: "21:00",
      duration: 10,
      recurrence: { kind: "weekdays" },
      active: true,
    },
    pattern: [
      "missed",
      "missed",
      "done",
      "missed",
      "done",
      "partial",
      "done",
      "done",
      "missed",
      "done",
    ],
    // Packing costs ingredients; not packing costs a bought lunch. The early
    // weeks also ran pricier, before the habit of walking to the same shop
    // every day was broken.
    values: (outcome, progress) => {
      const base =
        outcome === "done" ? 2.3 : outcome === "partial" ? 6.4 : 12.8;
      const earlyPremium = (1 - progress) * 2.2;
      const jitter = (((progress * 97) % 1) - 0.5) * 1.4;
      return Math.max(0, Math.round((base + earlyPremium + jitter) * 100) / 100);
    },
    results: [
      "Packed it in four minutes while the pan soaked.",
      "Forgot, and the sandwich shop queue ate twenty minutes as well as the money.",
      "Made two at once so tomorrow is already done.",
    ],
    reviews: [
      {
        assessment: "working",
        result:
          "Weeks where it gets packed four or more times come in well under budget.",
        daysAgo: 11,
      },
      {
        assessment: "working",
        result: "Spend is roughly halved against the first fortnight.",
        daysAgo: 4,
      },
    ],
  },
  {
    ageDays: 63,
    correction: {
      id: "c_sleep",
      problem:
        "I stay up ninety minutes past my intended bedtime scrolling in bed.",
      cause: "The phone charges on the nightstand and is the last thing I touch.",
      cost: "Six hours of sleep on weekdays, and I was unusable before 10:00.",
      correction:
        "Charge the phone in the kitchen and use a separate alarm clock.",
      measurement: "Was the phone out of the bedroom at lights out? Yes / No",
      status: "solved",
    },
    schedule: {
      id: "s_sleep",
      label: "Phone out of the room",
      startTime: "22:30",
      duration: 5,
      recurrence: { kind: "daily" },
      active: false,
    },
    pattern: ["done", "done", "partial", "done", "done", "done", "done", "done"],
    results: [
      "Asleep by 23:10 without deciding to be.",
      "Reached for it, remembered, read a book instead.",
    ],
    reviews: [
      {
        assessment: "working",
        result: "Bedtime moved by about an hour within the first week.",
        daysAgo: 40,
      },
      {
        assessment: "working",
        result:
          "Four weeks in and it takes no effort at all now. Marking as solved.",
        daysAgo: 12,
      },
    ],
  },
];

const verdictFor = (status: Outcome): Verdict | undefined =>
  status === "done"
    ? "yes"
    : status === "partial"
      ? "partial"
      : status === "missed"
        ? "no"
        : undefined;

function isoAt(key: string, time: string, offsetMin = 0) {
  const [y, m, d] = key.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min + offsetMin).toISOString();
}

/** The ids buildSeed() produces, for telling demo data from the user's own. */
export const SEED_CORRECTION_IDS = SPECS.map((spec) => spec.correction.id);

export function buildSeed() {
  const today = dayKey();
  const now = minutesNow();
  const nowIso = new Date().toISOString();

  const corrections: Correction[] = [];
  const schedules: Schedule[] = [];
  const executions: Execution[] = [];
  const reviews: ReviewEntry[] = [];

  for (const spec of SPECS) {
    const createdAt = isoAt(addDays(today, -spec.ageDays), "09:00");
    corrections.push({ ...spec.correction, createdAt, updatedAt: nowIso });

    const schedule: Schedule = {
      ...spec.schedule,
      correctionId: spec.correction.id,
      timezone: TZ,
    };
    schedules.push(schedule);

    // Walk the correction's lifetime forward and settle every past occurrence.
    // `active: true` is forced here so a paused schedule still has the history
    // it accumulated while it was running.
    const occurrences: string[] = [];
    for (let i = spec.ageDays; i >= 1; i--) {
      const key = addDays(today, -i);
      if (occursOn({ ...schedule, active: true }, key)) occurrences.push(key);
    }

    // Keep only as much history as the pattern can speak to, so the demo
    // numbers stay legible rather than running into the hundreds.
    const kept = occurrences.slice(-spec.pattern.length * 2);
    const dueTime = dueTimeOf(schedule);

    kept.forEach((key, i) => {
      const status = spec.pattern[i % spec.pattern.length];
      const settled = status === "done" || status === "partial";
      const drift = (i % 5) - 2;
      const progress = kept.length > 1 ? i / (kept.length - 1) : 1;
      executions.push({
        id: `e_${spec.schedule.id}_${key}`,
        correctionId: spec.correction.id,
        scheduleId: schedule.id,
        date: key,
        status,
        dueTime,
        startedAt: settled ? isoAt(key, dueTime, drift) : undefined,
        completedAt: settled
          ? isoAt(key, dueTime, spec.schedule.duration + drift)
          : undefined,
        elapsed: settled ? spec.schedule.duration * 60 + drift * 60 : undefined,
        verdict: verdictFor(status),
        // A skipped occurrence produced no figure; everything else did, a
        // miss included — not doing the thing is exactly when it costs most.
        value:
          spec.values && status !== "skipped"
            ? spec.values(status, progress)
            : undefined,
        // Written results are attached to some executions and not others. The
        // product never requires a note, and the demo should not imply it does.
        result:
          settled && i % 3 === 0
            ? spec.results[Math.floor(i / 3) % spec.results.length]
            : undefined,
      });
    });

    // Today: settle only what is already in the past, and deliberately leave
    // one action overdue so the Today screen has a real overdue state to show.
    if (occursOn(schedule, today) && spec.correction.status !== "solved") {
      const dueMin = toMinutes(dueTime);
      const leaveOverdue = spec.correction.id === "c_procrastination";
      if (dueMin + spec.schedule.duration < now && !leaveOverdue) {
        executions.push({
          id: `e_${spec.schedule.id}_${today}`,
          correctionId: spec.correction.id,
          scheduleId: schedule.id,
          date: today,
          status: "done",
          dueTime,
          startedAt: isoAt(today, dueTime, -3),
          completedAt: isoAt(today, dueTime, spec.schedule.duration - 3),
          elapsed: spec.schedule.duration * 60,
          verdict: "yes",
          value: spec.values ? spec.values("done", 1) : undefined,
          result: spec.results[0],
        });
      }
    }

    // No ReviewEntry rows are seeded. The separate "has the problem got
    // smaller?" prompt is gone, so demo data that referred to it would
    // describe a screen the user cannot find.
  }

  const captures: Capture[] = [
    {
      id: "cap_1",
      text: "Said yes to a meeting inside my deep work block again. Third time this month.",
      createdAt: isoAt(addDays(today, -1), "16:40"),
    },
    {
      id: "cap_2",
      text: "Skipped lunch, crashed at 15:00, got nothing done after.",
      createdAt: isoAt(addDays(today, -3), "15:20"),
    },
  ];

  return { corrections, schedules, executions, reviews, captures };
}

/**
 * A budget part-way through its period, so the Money screen demonstrates a
 * running budget rather than an empty one. Dates are relative to today for
 * the same reason the rest of the seed is.
 */
export function buildBudgetSeed(): { budget: Budget; spends: Spend[] } {
  const today = dayKey();
  const startDate = addDays(today, -11);
  const endDate = addDays(today, 16);

  const budget: Budget = {
    ...defaultBudget("GBP"),
    amount: 840,
    currency: "GBP",
    startDate,
    endDate,
    dailyBudget: 31.5,
    dailyBudgetDate: today,
    restMethod: "rest",
  };

  const TAGS = [
    "Groceries",
    "Coffee",
    "Transport",
    "Lunch",
    "Household",
    "Books",
  ];

  const spends: Spend[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = addDays(today, -i);
    // Two or three items a day, varied but deterministic.
    const count = 2 + ((i * 7) % 2);
    for (let j = 0; j < count; j++) {
      const seed = (i * 13 + j * 29) % 97;
      const amount = round2(3.2 + (seed % 23) * 0.85);
      const hour = 8 + ((seed % 11) + j * 3);
      spends.push({
        id: `sp_seed_${i}_${j}`,
        amount,
        date,
        at: new Date(
          `${date}T${`${Math.min(22, hour)}`.padStart(2, "0")}:${`${
            (seed * 7) % 60
          }`.padStart(2, "0")}:00`,
        ).toISOString(),
        tag: TAGS[seed % TAGS.length],
      });
    }
  }

  return { budget, spends };
}
