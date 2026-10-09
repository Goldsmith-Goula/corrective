"use client";

import { motion } from "motion/react";
import { formatValue } from "@/lib/metric";
import { spring } from "@/lib/motion";
import type { BudgetState } from "@/lib/budget";
import { cn } from "@/lib/utils";

/**
 * "For today — £37".
 *
 * The pill from the reference app: a stadium whose own background fills to
 * show how much of today's allowance is still unspent. The number and the bar
 * are the same fact, so they share one object instead of sitting next to each
 * other as a figure and a separate progress bar.
 */
export function RestBudgetPill({ state }: { state: BudgetState }) {
  const { budget, todayLeft, overspent, finished } = state;
  const money = (n: number) =>
    formatValue(n, {
      unit: budget.currency,
      currency: budget.currency,
      direction: "below",
    });

  const fraction =
    budget.dailyBudget > 0
      ? Math.max(0, Math.min(1, todayLeft / budget.dailyBudget))
      : 0;

  const label = finished
    ? "Period finished"
    : overspent
      ? "Over today by"
      : "For today";

  return (
    <div
      className={cn(
        "relative h-14 w-full overflow-hidden rounded-full",
        overspent ? "bg-error-soft" : "bg-surface",
      )}
    >
      {!overspent && !finished && (
        <motion.div
          className="absolute inset-y-0 left-0 bg-success-soft"
          initial={false}
          animate={{ width: `${fraction * 100}%` }}
          transition={spring}
          aria-hidden
        />
      )}

      <div className="relative flex h-full items-center justify-between gap-3 px-5">
        <span
          className={cn(
            "min-w-0 truncate text-[17px] font-extrabold",
            overspent ? "text-error" : "text-text",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "tnum shrink-0 text-[22px] leading-none font-black tracking-[-0.02em]",
            overspent ? "text-error" : "text-text",
          )}
        >
          {money(Math.abs(todayLeft))}
        </span>
      </div>
    </div>
  );
}
