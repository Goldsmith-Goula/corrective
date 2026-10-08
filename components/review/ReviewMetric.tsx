"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { RunMeter } from "@/components/ui/Progress";
import { Card } from "@/components/ui/Surface";
import { springSoft } from "@/lib/motion";
import { evidenceLine, type CorrectionStats } from "@/lib/stats";
import type { Execution } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One finding about one correction.
 *
 * The sentence comes first and the numbers support it, which is the opposite
 * of a dashboard tile. Every claim here is a count the user can go and check
 * in the execution history.
 */
export function ReviewMetric({
  stats,
  executions,
  actionLabel,
  tone,
}: {
  stats: CorrectionStats;
  executions: Execution[];
  actionLabel?: string;
  tone: "working" | "ineffective" | "unexecuted" | "early";
}) {
  const recent = executions
    .filter((e) => e.status !== "pending")
    .slice(0, 10)
    .reverse()
    .map((e) => e.status);

  const accent = {
    working: "border-l-success",
    ineffective: "border-l-warning",
    unexecuted: "border-l-error",
    early: "border-l-border-strong",
  }[tone];

  return (
    <motion.li layout transition={springSoft}>
      <Link href={`/corrections/${stats.correction.id}`}>
        <Card
          className={cn(
            "border-l-[3px] px-3.5 py-3.5 transition-colors hover:bg-surface-high",
            accent,
          )}
        >
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[16px] leading-snug font-extrabold tracking-[-0.01em]">
              {stats.correction.problem}
            </p>
            <ArrowUpRight
              size={14}
              strokeWidth={3}
              className="mt-0.5 shrink-0 text-text-muted"
            />
          </div>

          <p className="mt-2 text-[14px] leading-relaxed font-semibold text-text-secondary">
            {evidenceLine(stats, actionLabel ?? "This correction")}
          </p>

          {recent.length > 0 && (
            <RunMeter statuses={recent} size="sm" className="mt-3 max-w-[160px]" />
          )}
        </Card>
      </Link>
    </motion.li>
  );
}

/** A number in the summary strip. */
export function SummaryMetric({
  value,
  label,
  sub,
  tone,
}: {
  value: string | number;
  label: string;
  sub?: string;
  tone?: "success" | "warning" | "error";
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          "tnum text-[30px] leading-none font-black tracking-[-0.025em]",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "error" && "text-error",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[13px] font-extrabold text-text-muted">
        {label}
      </p>
      {sub && (
        <p className="mt-0.5 text-[13px] font-semibold text-text-secondary">
          {sub}
        </p>
      )}
    </div>
  );
}
