"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { formatClock, formatRelativeDay, timeOf } from "@/lib/date";
import { formatValue } from "@/lib/metric";
import { springSoft } from "@/lib/motion";
import type { Execution, Metric } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExecutionBadge } from "./CorrectionStatus";

const INITIAL = 8;

/**
 * Every attempt, newest first.
 *
 * Deliberately a flat list rather than a calendar heat map: a grid of squares
 * invites the user to admire a pattern, where a list keeps each attempt as a
 * separate event with a date and an outcome attached to it.
 */
export function ExecutionHistory({
  executions,
  metric,
}: {
  executions: Execution[];
  /** When present, each row shows the figure that was recorded. */
  metric?: Metric;
}) {
  const [expanded, setExpanded] = useState(false);
  const settled = executions.filter((e) => e.status !== "pending");
  const shown = expanded ? settled : settled.slice(0, INITIAL);

  if (!settled.length) {
    return (
      <p className="px-1 text-[15px] font-semibold text-text-muted">
        No attempts recorded yet.
      </p>
    );
  }

  return (
    <div>
      <ul className="overflow-hidden rounded-2xl bg-surface">
        <AnimatePresence initial={false}>
          {shown.map((e, i) => (
            <motion.li
              key={e.id}
              layout
              initial={i >= INITIAL ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={springSoft}
              className={cn(
                "overflow-hidden",
                i > 0 && "border-t border-bg/60",
              )}
            >
              <div className="flex items-baseline gap-3 px-3.5 py-3">
                <span className="tnum w-[76px] shrink-0 text-[14px] font-extrabold text-text-secondary">
                  {formatRelativeDay(e.date)}
                </span>
                <span className="tnum w-[38px] shrink-0 text-[14px] font-bold text-text-muted">
                  {e.dueTime}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <ExecutionBadge status={e.status} />
                    {metric && typeof e.value === "number" && (
                      <span className="tnum text-[14px] font-extrabold text-text">
                        {formatValue(e.value, metric)}
                      </span>
                    )}
                  </span>
                  {e.result && (
                    <span className="mt-1.5 block text-[14px] leading-snug font-semibold text-text-secondary break-words">
                      {e.result}
                    </span>
                  )}
                  {e.note && !e.result && (
                    <span className="mt-1.5 block text-[14px] leading-snug font-semibold text-text-muted break-words">
                      {e.note}
                    </span>
                  )}
                </span>
                <span className="tnum shrink-0 text-[13px] font-bold text-text-muted">
                  {e.completedAt
                    ? timeOf(e.completedAt)
                    : e.elapsed
                      ? formatClock(e.elapsed)
                      : ""}
                </span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {settled.length > INITIAL && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 px-1 text-[14px] font-extrabold text-accent"
        >
          {expanded
            ? "Show less"
            : `Show all ${settled.length} attempts`}
        </button>
      )}
    </div>
  );
}

/**
 * The written results, separated from the attempt list.
 *
 * The history answers "did it happen". This answers "did anything change",
 * which is a different question and deserves its own reading.
 */
export function ResultEntries({ executions }: { executions: Execution[] }) {
  const withResults = executions.filter((e) => e.result?.trim());

  if (!withResults.length) {
    return (
      <p className="px-1 text-[15px] font-semibold leading-relaxed text-text-muted">
        Nothing recorded yet. After an execution you can note what happened —
        that note is what the Review reads back to you.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {withResults.map((e) => (
        <li key={e.id} className="rounded-2xl bg-surface px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="tnum text-[13px] font-extrabold text-text-muted">
              {formatRelativeDay(e.date)}
            </span>
            <ExecutionBadge status={e.status} />
          </div>
          <p className="mt-1.5 text-[16px] leading-relaxed font-semibold text-text break-words">
            {e.result}
          </p>
        </li>
      ))}
    </ul>
  );
}
