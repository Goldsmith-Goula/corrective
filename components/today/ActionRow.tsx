"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Pause,
  Play,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Label } from "@/components/ui/Field";
import { formatClock, formatDuration, timeOf } from "@/lib/date";
import { formatValue } from "@/lib/metric";
import { useSecondsTicker } from "@/lib/hooks";
import { fade, spring, springSoft } from "@/lib/motion";
import { liveElapsed, useStore } from "@/lib/store";
import type { Metric, ResolvedAction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export type ActionTone = "upcoming" | "live" | "overdue" | "settled";

/**
 * One scheduled action, as something that can be acted on where it sits.
 *
 * Start and the completion control are both on the row, because the moment the
 * user has to navigate somewhere to record a result is the moment they stop
 * recording results. Tapping the body unfolds the correction behind the action
 * so the user can see why this is on their day without leaving it.
 */
export function ActionRow({
  action,
  tone,
  readOnly,
  onComplete,
}: {
  action: ResolvedAction;
  tone: ActionTone;
  /** A day in the future: show the plan, offer no controls to act on it. */
  readOnly?: boolean;
  /** Opens the verdict sheet. */
  onComplete: (action: ResolvedAction) => void;
}) {
  const startExecution = useStore((s) => s.startExecution);
  const pauseExecution = useStore((s) => s.pauseExecution);
  const skipExecution = useStore((s) => s.skipExecution);
  const undoExecution = useStore((s) => s.undoExecution);

  const [expanded, setExpanded] = useState(false);

  const exec = action.execution;
  const running = exec?.status === "running";
  const paused = exec?.status === "paused";
  const settled = tone === "settled";

  // Only the running row needs a per-second re-render.
  useSecondsTicker(running);

  const elapsed = liveElapsed(exec);
  const target = action.schedule.duration * 60;

  return (
    <motion.li
      layout
      transition={springSoft}
      className={cn(
        "overflow-hidden rounded-2xl transition-colors duration-200",
        settled ? "bg-surface/60" : "bg-surface",
        running && "bg-accent-soft/55 ring-1 ring-accent/35",
        tone === "overdue" && "ring-1 ring-error/25",
      )}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-4 pt-4 pb-3.5 text-left"
      >
        {/* Time gutter — tabular so the column aligns down the whole day. */}
        <span className="w-[62px] shrink-0 pt-px">
          <span
            className={cn(
              "tnum block text-[22px] leading-none font-black tracking-[-0.02em]",
              tone === "overdue" && "text-error",
              tone === "live" && "text-accent",
              settled && "text-text-muted",
            )}
          >
            {action.dueTime}
          </span>
          <span className="tnum mt-1 block text-[13px] leading-none font-bold text-text-muted">
            {formatDuration(action.schedule.duration)}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                "text-[18px] leading-tight font-extrabold tracking-[-0.01em]",
                settled && "text-text-secondary",
              )}
            >
              {action.schedule.label}
            </span>
            {tone === "overdue" && (
              <span className="shrink-0 rounded-full bg-error-soft px-1.5 py-0.5 text-[9.5px] font-extrabold text-error">
                Overdue
              </span>
            )}
          </span>

          {/* The completed state replaces the controls rather than sitting
              beside them: the row has finished its job. */}
          <AnimatePresence initial={false}>
            {settled && exec && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={fade}
                className="mt-2 flex items-center gap-1.5"
              >
                <SettledLine
                  status={exec.status}
                  at={exec.completedAt}
                  elapsed={exec.elapsed}
                  value={exec.value}
                  metric={action.correction.metric}
                />
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={spring}
          className="shrink-0 pt-0.5 text-text-muted"
        >
          <ChevronDown size={16} strokeWidth={2.75} />
        </motion.span>
      </button>

      {/* The unfold: the causal chain behind this action, in place. */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springSoft}
            className="overflow-hidden"
          >
            <div className="mx-3.5 mb-3 space-y-3 rounded-xl bg-bg/55 px-3.5 py-3">
              <div>
                <Label>Problem</Label>
                <p className="mt-1 text-[15px] leading-snug font-bold text-text">
                  {action.correction.problem}
                </p>
              </div>
              <div>
                <Label>Measurement</Label>
                <p className="mt-1 text-[15px] leading-snug font-semibold text-text-secondary">
                  {action.correction.measurement}
                </p>
              </div>
              {exec?.result && (
                <div>
                  <Label>Result recorded</Label>
                  <p className="mt-1 text-[15px] leading-relaxed font-semibold text-text-secondary">
                    {exec.result}
                  </p>
                </div>
              )}
              <Link
                href={`/corrections/${action.correction.id}`}
                className="inline-flex items-center gap-1 text-[14px] font-extrabold text-accent"
              >
                Open correction
                <ArrowUpRight size={13} strokeWidth={3} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls. Two taps at most to record anything. */}
      {readOnly ? null : !settled ? (
        <div className="flex items-center gap-2 px-4 pb-4">
          {running || paused ? (
            <>
              <Button
                size="sm"
                onClick={() =>
                  running ? pauseExecution(action) : startExecution(action)
                }
                className="flex-1 bg-elevated hover:brightness-[0.98]"
              >
                {running ? (
                  <Pause size={14} strokeWidth={3} />
                ) : (
                  <Play size={14} strokeWidth={3} />
                )}
                <span className="tnum">{formatClock(elapsed)}</span>
                <span className="text-text-muted">
                  / {formatClock(target)}
                </span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onComplete(action)}
              >
                <Check size={14} strokeWidth={3} />
                Done
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => startExecution(action)}
                className="flex-1"
              >
                <Play size={13} strokeWidth={3} />
                Start
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onComplete(action)}
              >
                <Check size={14} strokeWidth={3} />
                Done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon
                onClick={() => skipExecution(action)}
                aria-label="Skip"
                title="Skip"
              >
                <SkipForward size={14} strokeWidth={2.75} />
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="px-3.5 pb-3">
          <button
            onClick={() => undoExecution(action)}
            className="text-[13px] font-extrabold text-text-muted transition-colors hover:text-accent"
          >
            Undo
          </button>
        </div>
      )}
    </motion.li>
  );
}

/** The one-line outcome shown in place of the controls. */
function SettledLine({
  status,
  at,
  elapsed,
  value,
  metric,
}: {
  status: string;
  at?: string;
  elapsed?: number;
  value?: number;
  metric?: Metric;
}) {
  const time = at ? timeOf(at) : null;

  const map: Record<string, { text: string; className: string }> = {
    done: { text: "Completed", className: "text-success" },
    partial: { text: "Partial", className: "text-warning" },
    missed: { text: "Not done", className: "text-error" },
    skipped: { text: "Skipped", className: "text-text-muted" },
  };
  const spec = map[status] ?? { text: status, className: "text-text-muted" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[14px] font-extrabold",
        spec.className,
      )}
    >
      {status === "done" && <Check size={13} strokeWidth={3.5} />}
      {spec.text}
      {time && <span className="tnum font-bold opacity-80">{time}</span>}
      {/* A recorded figure is the most informative thing about a completed
          action, so it takes the slot the elapsed timer would have used. */}
      {metric && typeof value === "number" ? (
        <span className="tnum font-extrabold text-text">
          · {formatValue(value, metric)}
        </span>
      ) : status === "done" && elapsed && elapsed > 30 ? (
        <span className="tnum font-bold text-text-muted">
          · {formatClock(elapsed)}
        </span>
      ) : null}
    </span>
  );
}
