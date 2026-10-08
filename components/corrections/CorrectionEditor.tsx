"use client";

import { useState } from "react";
import { Field, Input, Label, Textarea } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useOnOpen } from "@/lib/hooks";
import { UNIT_PRESETS, describeTarget } from "@/lib/metric";
import { useStore } from "@/lib/store";
import type { Correction, Metric } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/** The five questions, in the order the causal chain runs. */
const STEPS = [
  {
    key: "problem",
    label: "Problem",
    question: "What went wrong?",
    placeholder: "I taught a lesson without revising.",
  },
  {
    key: "cause",
    label: "Cause",
    question: "Why did it happen?",
    placeholder: "I prepared the notes but didn't rehearse the material.",
  },
  {
    key: "cost",
    label: "Cost",
    question: "What did it cause?",
    placeholder: "I fumbled explanations during class.",
  },
  {
    key: "correction",
    label: "Correction",
    question: "What specific behaviour replaces the old one?",
    placeholder: "Spend 20 minutes verbally revising before every lesson.",
  },
  {
    key: "measurement",
    label: "Measurement",
    question: "What evidence shows it was performed?",
    placeholder: "Did I revise? Yes / No",
  },
] as const;

type Draft = Record<(typeof STEPS)[number]["key"], string>;

const EMPTY: Draft = {
  problem: "",
  cause: "",
  cost: "",
  correction: "",
  measurement: "",
};

/**
 * Creating or editing a correction.
 *
 * Only the problem and the correction are required. Demanding all five fields
 * would make the editor the hard part of the product, when the hard part is
 * supposed to be the execution.
 */
export function CorrectionEditor({
  open,
  onClose,
  existing,
  initialProblem,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Present when editing. */
  existing?: Correction;
  /** Pre-fills the problem when promoting a capture. */
  initialProblem?: string;
  onSaved?: (id: string) => void;
}) {
  const addCorrection = useStore((s) => s.addCorrection);
  const updateCorrection = useStore((s) => s.updateCorrection);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [metric, setMetric] = useState<Metric | null>(null);
  /** Kept as a string so a half-typed "1." does not collapse to 1. */
  const [targetText, setTargetText] = useState("");

  useOnOpen(open, () => {
    setDraft(
      existing
        ? {
            problem: existing.problem,
            cause: existing.cause,
            cost: existing.cost,
            correction: existing.correction,
            measurement: existing.measurement,
          }
        : { ...EMPTY, problem: initialProblem ?? "" },
    );
    setMetric(existing?.metric ?? null);
    setTargetText(
      existing?.metric?.target !== undefined
        ? String(existing.metric.target)
        : "",
    );
  });

  const valid = draft.problem.trim() && draft.correction.trim();

  const resolvedMetric: Metric | undefined = metric
    ? {
        ...metric,
        target:
          targetText.trim() === "" || !Number.isFinite(Number(targetText))
            ? undefined
            : Number(targetText),
      }
    : undefined;

  const save = () => {
    if (!valid) return;
    const payload = { ...draft, metric: resolvedMetric };
    if (existing) {
      // Passing undefined would be merged away, so the absence of a metric
      // has to be written explicitly when one is switched off.
      updateCorrection(existing.id, { ...payload, metric: resolvedMetric });
      onSaved?.(existing.id);
    } else {
      const id = addCorrection({ ...payload, status: "testing" });
      onSaved?.(id);
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? "Edit correction" : "New correction"}
      subtitle={
        existing
          ? undefined
          : "A correction is only worth writing if it names a behaviour."
      }
      footer={
        <Button variant="primary" size="lg" block onClick={save} disabled={!valid}>
          {existing ? "Save changes" : "Create correction"}
        </Button>
      }
    >
      <div className="space-y-4">
        {STEPS.map((step, i) => (
          <div key={step.key} className="relative">
            {/* A connector between steps, so the five fields read as one
                chain rather than five unrelated boxes. */}
            {i < STEPS.length - 1 && (
              <span className="absolute top-[26px] -bottom-4 left-[7px] w-px bg-border" />
            )}
            <div className="flex gap-3">
              <span className="mt-[7px] size-[15px] shrink-0 rounded-full border-2 border-border-strong bg-bg" />
              <div className="min-w-0 flex-1">
                <Field label={step.label} hint={step.question}>
                  <Textarea
                    value={draft[step.key]}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [step.key]: e.target.value }))
                    }
                    placeholder={step.placeholder}
                    minRows={step.key === "measurement" ? 1 : 2}
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}

        {/* Quantified measurement. Off by default: most corrections are
            answered yes or no, and a number that nobody will record is worse
            than no number at all. */}
        <div className="rounded-xl bg-surface p-3.5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <Label as="label">Measure a number</Label>
              <p className="mt-1 text-[14px] leading-snug font-semibold text-text-muted">
                For problems with a figure attached — money, minutes, pages.
                The Review then shows whether that figure is moving.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={metric !== null}
              aria-label="Measure a number"
              onClick={() =>
                setMetric((m) =>
                  m ? null : { unit: "GBP", currency: "GBP", direction: "below" },
                )
              }
              className={cn(
                "mt-0.5 h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors",
                metric ? "bg-accent" : "bg-border-strong",
              )}
            >
              <span
                className={cn(
                  "block size-5 rounded-full bg-bg transition-transform",
                  metric && "translate-x-4",
                )}
              />
            </button>
          </div>

          {metric && (
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {UNIT_PRESETS.map((preset) => {
                    const active = metric.unit === preset.unit;
                    return (
                      <button
                        key={preset.unit}
                        onClick={() =>
                          setMetric({
                            unit: preset.unit,
                            currency: preset.currency,
                            direction: preset.direction,
                            target: metric.target,
                          })
                        }
                        aria-pressed={active}
                        className={cn(
                          "h-9 shrink-0 rounded-full px-3.5 text-[14px] font-extrabold transition-colors",
                          active
                            ? "bg-accent text-accent-fg"
                            : "bg-surface-high text-text-muted hover:text-text",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Which way is better?</Label>
                <Segmented
                  size="sm"
                  ariaLabel="Target direction"
                  value={metric.direction}
                  onChange={(direction) => setMetric({ ...metric, direction })}
                  options={[
                    { value: "below" as const, label: "Lower" },
                    { value: "above" as const, label: "Higher" },
                  ]}
                />
              </div>

              <Field
                label="Target"
                hint="Optional. With one, the verdict is answered by the figure."
              >
                <Input
                  inputMode="decimal"
                  value={targetText}
                  onChange={(e) =>
                    setTargetText(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="10"
                />
              </Field>

              {resolvedMetric && describeTarget(resolvedMetric) && (
                <p className="text-[14px] font-bold text-accent">
                  Recorded as {describeTarget(resolvedMetric)} each time.
                </p>
              )}
            </div>
          )}
        </div>

        {!valid && (
          <p className="text-[14px] font-semibold text-text-muted">
            A problem and a correction are required. The rest can be filled in
            later.
          </p>
        )}
      </div>
    </Sheet>
  );
}
