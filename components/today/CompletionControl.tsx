"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CircleSlash, Minus } from "lucide-react";
import { useState } from "react";
import { Label, Textarea } from "@/components/ui/Field";
import { NumericPad } from "@/components/ui/NumericPad";
import { Sheet } from "@/components/ui/Sheet";
import { formatClock } from "@/lib/date";
import { fade, spring, springSoft } from "@/lib/motion";
import { useOnOpen } from "@/lib/hooks";
import { describeTarget, formatValue, verdictFor } from "@/lib/metric";
import { liveElapsed, useStore } from "@/lib/store";
import type { ResolvedAction, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const CHOICES: Array<{
  verdict: Verdict;
  label: string;
  icon: typeof Check;
  className: string;
}> = [
  {
    verdict: "yes",
    label: "Yes",
    icon: Check,
    className:
      "bg-success-soft text-success aria-pressed:bg-success aria-pressed:text-bg",
  },
  {
    verdict: "partial",
    label: "Partial",
    icon: Minus,
    className:
      "bg-warning-soft text-warning aria-pressed:bg-warning aria-pressed:text-bg",
  },
  {
    verdict: "no",
    label: "No",
    icon: CircleSlash,
    className:
      "bg-error-soft text-error aria-pressed:bg-error aria-pressed:text-bg",
  },
];

/**
 * Recording what happened.
 *
 * Two questions, in this order: did the behaviour occur, and what followed.
 * The first is required because it is the only thing the product actually
 * measures; the second is optional because demanding a reflection is how
 * trackers turn into paperwork and stop being used.
 */
export function CompletionControl({
  action,
  open,
  onClose,
}: {
  action: ResolvedAction | null;
  open: boolean;
  onClose: () => void;
}) {
  const completeExecution = useStore((s) => s.completeExecution);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [result, setResult] = useState("");
  /** Raw keypad entry, kept as a string so "7." is a valid intermediate. */
  const [entry, setEntry] = useState("");
  /** Set once the user overrides the verdict the figure implies. */
  const [overridden, setOverridden] = useState(false);

  useOnOpen(open, () => {
    setVerdict(null);
    setResult(action?.execution?.result ?? "");
    setEntry(
      typeof action?.execution?.value === "number"
        ? String(action.execution.value)
        : "",
    );
    setOverridden(false);
  });

  if (!action) return null;

  const metric = action.correction.metric;
  const seconds = liveElapsed(action.execution);

  const parsed = entry === "" ? null : Number(entry);
  const hasFigure = parsed !== null && Number.isFinite(parsed);

  // With a metric the verdict follows from the figure, so the common case is
  // one entry and no further decision. An explicit tap still wins: a number
  // does not always know what happened.
  const effectiveVerdict: Verdict | null =
    metric && hasFigure && !overridden
      ? verdictFor(parsed as number, metric)
      : verdict;

  const canSave = metric ? hasFigure && Boolean(effectiveVerdict) : Boolean(verdict);

  /** The figure has answered the question, so the buttons are a correction. */
  const derived = Boolean(metric?.target !== undefined && hasFigure);

  const save = () => {
    if (!effectiveVerdict || !canSave) return;
    completeExecution(
      action,
      effectiveVerdict,
      result,
      undefined,
      hasFigure ? (parsed as number) : undefined,
    );
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Did you do it?"
      subtitle={`${action.schedule.label} · ${action.dueTime}`}
      footer={
        <Button
          variant="primary"
          size="lg"
          block
          onClick={save}
          disabled={!canSave}
        >
          {canSave
            ? "Record it"
            : metric
              ? "Enter the figure"
              : "Choose an answer"}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* The measurement the user themselves defined. Restating it here is
            what keeps the answer objective. */}
        <div className="rounded-xl bg-surface px-3.5 py-3">
          <Label>Measurement</Label>
          <p className="mt-1 text-[16px] leading-snug font-bold text-text break-words">
            {action.correction.measurement}
          </p>
          {metric && describeTarget(metric) && (
            <p className="mt-1 text-[14px] font-bold text-text-muted break-words">
              Target: {describeTarget(metric)}
            </p>
          )}
        </div>

        {metric && (
          <NumericPad
            metric={metric}
            value={entry}
            onChange={(raw) => {
              setEntry(raw);
              // Typing a new figure returns control to the derived verdict.
              setOverridden(false);
            }}
            autoFocusTarget
          />
        )}

        {/* When a target answers the question, the three choices become a
            compact correction strip rather than the main event — they are an
            override, not the decision. */}
        <div className="grid grid-cols-3 gap-2">
          {CHOICES.map((choice) => {
            const Icon = choice.icon;
            const active = effectiveVerdict === choice.verdict;
            return (
              <motion.button
                key={choice.verdict}
                whileTap={{ scale: 0.96 }}
                transition={spring}
                aria-pressed={active}
                onClick={() => {
                  setVerdict(choice.verdict);
                  setOverridden(true);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-2xl font-extrabold transition-colors duration-150",
                  derived
                    ? "h-11 flex-row"
                    : "h-[76px] flex-col gap-1.5",
                  choice.className,
                )}
              >
                <Icon size={derived ? 15 : 20} strokeWidth={3} />
                <span className={derived ? "text-[14px]" : "text-[15px]"}>
                  {choice.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {metric && hasFigure && !overridden && describeTarget(metric) && (
          <p className="text-center text-[14px] font-semibold text-text-muted">
            {formatValue(parsed as number, metric)} against a target of{" "}
            {describeTarget(metric)} — answered for you. Tap to change it.
          </p>
        )}

        {seconds > 5 && (
          <p className="tnum text-center text-[14px] font-bold text-text-muted">
            Timer ran {formatClock(seconds)} of{" "}
            {formatClock(action.schedule.duration * 60)}
          </p>
        )}

        {/* The result question only appears once there is a verdict — it has
            no meaning before one, and showing it early makes the sheet read
            as a form. */}
        <AnimatePresence initial={false}>
          {effectiveVerdict && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={springSoft}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 pt-0.5">
                <Label as="label">What happened?</Label>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={fade}>
                  <Textarea
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    minRows={3}
                    // A prompt, not a worked example: a sample sentence from
                    // one correction reads as nonsense under another.
                    placeholder={
                      effectiveVerdict === "no"
                        ? "What got in the way?"
                        : "What changed as a result?"
                    }
                  />
                  <p className="mt-1.5 text-[13px] font-semibold text-text-muted">
                    Optional. This is the evidence the Review reads.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
