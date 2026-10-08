"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import type { ResolvedAction } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_START = 5 * 60; // 05:00
const DAY_END = 24 * 60;

const MARK: Record<string, string> = {
  done: "bg-success",
  partial: "bg-warning",
  missed: "bg-error",
  skipped: "bg-border-strong",
  running: "bg-accent",
  paused: "bg-accent/60",
};

/**
 * The day as a single strip.
 *
 * Answers "where am I in the day" before the list does. Positions are real —
 * the marks sit at their actual times — so the spacing itself shows where the
 * day is loaded and where it is empty.
 */
export function DayRail({
  actions,
  now,
  showNow,
}: {
  actions: ResolvedAction[];
  /** Minutes from midnight. */
  now: number;
  showNow: boolean;
}) {
  if (!actions.length) return null;

  const span = DAY_END - DAY_START;
  const at = (mins: number) =>
    `${Math.max(0, Math.min(100, ((mins - DAY_START) / span) * 100))}%`;

  return (
    <div className="select-none">
      <div className="relative h-9">
        <div className="absolute inset-x-0 top-4 h-px bg-border" />

        {/* Elapsed portion of the day, so the remaining time reads as room. */}
        {showNow && (
          <motion.div
            className="absolute top-4 left-0 h-px bg-border-strong"
            initial={false}
            animate={{ width: at(now) }}
            transition={spring}
          />
        )}

        {actions.map((a) => {
          const status = a.execution?.status;
          const settled =
            status === "done" ||
            status === "partial" ||
            status === "missed" ||
            status === "skipped";
          return (
            <motion.div
              key={a.schedule.id}
              layout
              transition={spring}
              className="absolute top-4 -translate-x-1/2 -translate-y-1/2"
              style={{ left: at(a.dueMinutes) }}
              title={`${a.dueTime} · ${a.schedule.label}`}
            >
              <span
                className={cn(
                  "block rounded-full ring-2 ring-bg",
                  settled || status === "running" || status === "paused"
                    ? "size-2.5"
                    : "size-2.5",
                  status ? MARK[status] : "bg-border-strong",
                )}
              />
            </motion.div>
          );
        })}

        {showNow && (
          <motion.div
            className="absolute top-1 bottom-1 w-[2px] -translate-x-1/2 rounded-full bg-accent"
            initial={false}
            animate={{ left: at(now) }}
            transition={spring}
          />
        )}
      </div>

      <div className="tnum flex justify-between text-[10px] font-bold text-text-muted">
        <span>05:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
