"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Surface";
import { addDays, dayKey, formatRelativeDay } from "@/lib/date";
import { spring } from "@/lib/motion";
import type { Correction, Execution } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * What actually went right.
 *
 * Every number here is a count of something the user did, which is the only
 * kind of encouragement this product is willing to offer — "you completed 14"
 * is a fact they can check, where "you're 87% productive!" is a compliment
 * dressed as data.
 *
 * It exists because a record that only ever surfaces what slipped is one
 * people stop opening. The wins are already in the data; they were just never
 * added up.
 */
export function WinsSummary({
  executions,
  corrections,
}: {
  executions: Execution[];
  corrections: Correction[];
}) {
  const today = dayKey();
  const byId = new Map(corrections.map((c) => [c.id, c]));

  const wins = executions
    .filter((e) => e.status === "done" || e.status === "partial")
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!wins.length) return null;

  const doneToday = wins.filter((e) => e.date === today).length;

  // Consecutive days, counting back from today, on which something was done.
  const daysWithAWin = new Set(wins.map((e) => e.date));
  let run = 0;
  for (let i = 0; i < 365; i++) {
    const key = addDays(today, -i);
    if (daysWithAWin.has(key)) run++;
    else if (i > 0) break;
    // Today not being done yet should not end a run that is still alive.
  }

  // The most recent thing the user wrote about something that went right.
  const latest = wins.find((e) => e.result?.trim());

  return (
    <Card className="px-4 py-4">
      <div className="flex items-center gap-3">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success"
        >
          <Check size={20} strokeWidth={3.5} />
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="tnum text-[26px] leading-none font-black tracking-[-0.02em]">
            {wins.length}
            <span className="ml-2 text-[16px] font-extrabold text-text-secondary">
              {wins.length === 1 ? "win" : "wins"}
            </span>
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-text-muted">
            {doneToday > 0
              ? `${doneToday} today`
              : "nothing recorded yet today"}
            {run >= 2 && (
              <span className={cn("text-text-secondary")}>
                {" · "}
                {run} days running
              </span>
            )}
          </p>
        </div>
      </div>

      {latest && (
        <div className="mt-4 border-t border-border pt-3.5">
          <p className="text-[15px] leading-relaxed font-semibold text-text-secondary break-words">
            &ldquo;{latest.result}&rdquo;
          </p>
          <p className="mt-1.5 text-[14px] font-bold text-text-muted break-words">
            {byId.get(latest.correctionId)?.correction ?? ""}
            {" · "}
            {formatRelativeDay(latest.date)}
          </p>
        </div>
      )}
    </Card>
  );
}
