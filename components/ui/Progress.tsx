"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ExecutionStatus } from "@/lib/types";

type Tone = "accent" | "success" | "warning" | "error" | "muted";

const BAR: Record<Tone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  muted: "bg-border-strong",
};

export function ProgressBar({
  value,
  tone = "accent",
  className,
  label,
}: {
  /** 0–1. */
  value: number;
  tone?: Tone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-high", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={cn("h-full rounded-full", BAR[tone])}
        initial={false}
        animate={{ width: `${pct * 100}%` }}
        transition={spring}
      />
    </div>
  );
}

const DOT: Record<string, string> = {
  done: "bg-success",
  partial: "bg-warning",
  missed: "bg-error/70",
  skipped: "bg-border-strong",
  pending: "bg-border",
  running: "bg-accent",
  paused: "bg-accent/50",
};

const DOT_TITLE: Record<string, string> = {
  done: "Completed",
  partial: "Partial",
  missed: "Missed",
  skipped: "Skipped",
  pending: "Not yet due",
  running: "In progress",
  paused: "Paused",
};

/**
 * The run of recent outcomes, as discrete marks.
 *
 * A continuous bar would average the history into a single feeling. Separate
 * marks keep each attempt countable, which is the whole point of the Review.
 */
export function RunMeter({
  statuses,
  className,
  size = "md",
}: {
  statuses: ExecutionStatus[];
  className?: string;
  size?: "sm" | "md";
}) {
  if (!statuses.length) return null;
  return (
    <div className={cn("flex items-center gap-[3px]", className)}>
      {statuses.map((s, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0.4, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ ...spring, delay: i * 0.015 }}
          title={DOT_TITLE[s] ?? s}
          className={cn(
            "flex-1 rounded-full",
            size === "sm" ? "h-2 max-w-2.5" : "h-2.5 max-w-3.5",
            DOT[s] ?? "bg-border",
          )}
        />
      ))}
    </div>
  );
}
