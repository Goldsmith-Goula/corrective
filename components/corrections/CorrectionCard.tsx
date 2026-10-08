"use client";

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { RunMeter } from "@/components/ui/Progress";
import { formatRelativeDay } from "@/lib/date";
import { formatValue } from "@/lib/metric";
import { springSnap } from "@/lib/motion";
import type { CorrectionStats } from "@/lib/stats";
import type { Execution } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CorrectionStatusPill } from "./CorrectionStatus";

/**
 * A correction in a list.
 *
 * Leads with the problem rather than the correction, because the problem is
 * what the user recognises. Everything under it is evidence: the run of recent
 * outcomes, the count behind it, and when the next attempt is due.
 */
export function CorrectionCard({
  stats,
  executions,
  label,
}: {
  stats: CorrectionStats;
  /** This correction's executions, newest first. */
  executions: Execution[];
  /** The scheduled action's name, when it has one. */
  label?: string;
}) {
  const { correction } = stats;

  // Oldest-to-newest left-to-right: the meter reads like a timeline.
  const recent = executions
    .filter((e) => e.status !== "pending")
    .slice(0, 10)
    .reverse()
    .map((e) => e.status);

  return (
    <motion.li layout transition={springSnap}>
      <Link href={`/corrections/${correction.id}`} className="block">
        <motion.div
          whileTap={{ scale: 0.99 }}
          transition={springSnap}
          className="rounded-2xl bg-surface px-3.5 py-3.5 transition-colors hover:bg-surface-high"
        >
          <div className="flex items-start gap-3">
            <h3 className="min-w-0 flex-1 text-[17px] leading-snug font-extrabold tracking-[-0.01em]">
              {correction.problem}
            </h3>
            <CorrectionStatusPill status={correction.status} size="sm" />
          </div>

          {recent.length > 0 && (
            <RunMeter statuses={recent} size="sm" className="mt-3 max-w-[180px]" />
          )}

          <div className="mt-2.5 flex items-center gap-2 text-[14px] font-bold">
            <span className="tnum text-text-secondary">
              {stats.completed} / {stats.attempted} completed
            </span>
            {/* A measured correction says so here, with its figure. Without
                this the only way to discover that a correction tracks money
                was to open it and notice the currency. The attempt count that
                used to sit here just repeated the denominator above. */}
            {stats.metric && correction.metric && (
              <>
                <Dot />
                <span
                  className={cn(
                    "tnum",
                    stats.metric.improving === true
                      ? "text-success"
                      : stats.metric.improving === false
                        ? "text-error"
                        : "text-text-muted",
                  )}
                >
                  {formatValue(
                    stats.metric.recentMean ?? stats.metric.mean,
                    correction.metric,
                  )}{" "}
                  avg
                  {stats.metric.improving === true && " ↓"}
                  {stats.metric.improving === false && " ↑"}
                </span>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text-muted">
              {stats.next ? (
                <>
                  <span className="text-text-muted">Next: </span>
                  <span className="text-text-secondary">
                    {formatRelativeDay(stats.next.date)}
                  </span>
                  <span className="tnum text-text-secondary">
                    {" · "}
                    {stats.next.time}
                  </span>
                  {label && <span className="text-text-muted"> · {label}</span>}
                </>
              ) : correction.status === "solved" ? (
                "No longer scheduled"
              ) : (
                "Not scheduled"
              )}
            </span>
            <ChevronRight
              size={15}
              strokeWidth={2.75}
              className="shrink-0 text-text-muted"
            />
          </div>
        </motion.div>
      </Link>
    </motion.li>
  );
}

function Dot() {
  return <span className={cn("size-[3px] shrink-0 rounded-full bg-border-strong")} />;
}
