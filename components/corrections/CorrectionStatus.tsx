"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CorrectionStatus as Status, ExecutionStatus } from "@/lib/types";

export const STATUS_ORDER: Status[] = [
  "testing",
  "active",
  "improved",
  "solved",
  "abandoned",
];

export const STATUS_LABEL: Record<Status, string> = {
  testing: "Testing",
  active: "Active",
  improved: "Improved",
  solved: "Solved",
  abandoned: "Abandoned",
};

/** What each status actually asserts, shown when the user is choosing one. */
export const STATUS_MEANING: Record<Status, string> = {
  testing: "The correction is new. Not enough executions to judge it.",
  active: "Being executed. The outcome is not settled yet.",
  improved: "Being executed, and the problem is measurably smaller.",
  solved: "No longer needs scheduling. Stops generating actions.",
  abandoned: "Dropped. Kept as a record of what did not work.",
};

const STATUS_STYLE: Record<Status, string> = {
  testing: "bg-warning-soft text-warning",
  active: "bg-accent-soft text-accent-on-soft",
  improved: "bg-success-soft text-success",
  solved: "bg-success text-bg",
  abandoned: "bg-surface-high text-text-muted",
};

export function CorrectionStatusPill({
  status,
  className,
  size = "md",
}: {
  status: Status;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-extrabold",
        size === "sm" ? "h-5 px-2 text-[9.5px]" : "h-6 px-2.5 text-[13px]",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** The status picker, used in the detail view. */
export function StatusSelector({
  value,
  onChange,
}: {
  value: Status;
  onChange: (status: Status) => void;
}) {
  return (
    <div className="space-y-1.5">
      {STATUS_ORDER.map((status) => {
        const active = status === value;
        return (
          <motion.button
            key={status}
            whileTap={{ scale: 0.99 }}
            transition={spring}
            onClick={() => onChange(status)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors",
              active ? "bg-surface-high" : "hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2",
                active ? "border-accent" : "border-border-strong",
              )}
            >
              {active && (
                <motion.span
                  layoutId="status-dot"
                  transition={spring}
                  className="size-2 rounded-full bg-accent"
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <CorrectionStatusPill status={status} size="sm" />
              </span>
              <span className="mt-1 block text-[14px] font-semibold leading-snug text-text-muted">
                {STATUS_MEANING[status]}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export const EXEC_LABEL: Record<ExecutionStatus, string> = {
  pending: "Pending",
  running: "Running",
  paused: "Paused",
  done: "Done",
  partial: "Partial",
  missed: "Missed",
  skipped: "Skipped",
};

const EXEC_STYLE: Record<ExecutionStatus, string> = {
  pending: "bg-surface-high text-text-muted",
  running: "bg-accent text-accent-fg",
  paused: "bg-accent-soft text-accent-on-soft",
  done: "bg-success-soft text-success",
  partial: "bg-warning-soft text-warning",
  missed: "bg-error-soft text-error",
  skipped: "bg-surface-high text-text-muted",
};

export function ExecutionBadge({
  status,
  className,
}: {
  status: ExecutionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[9.5px] font-extrabold",
        EXEC_STYLE[status],
        className,
      )}
    >
      {EXEC_LABEL[status]}
    </span>
  );
}
