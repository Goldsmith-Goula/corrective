"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChartNoAxesColumn, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { ReviewMetric, SummaryMetric } from "@/components/review/ReviewMetric";
import { EmptyState } from "@/components/ui/EmptyState";
import { Confirm } from "@/components/ui/Sheet";
import { Card, Divider, Section } from "@/components/ui/Surface";
import { Segmented } from "@/components/ui/Segmented";
import { addDays, dayKey } from "@/lib/date";
import { spring, springSoft } from "@/lib/motion";
import { percent, portfolio, type CorrectionStats } from "@/lib/stats";
import { WinsSummary } from "@/components/review/WinsSummary";
import { useStore } from "@/lib/store";
import type { Execution } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const WINDOWS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "all", label: "All" },
] as const;

type Window = (typeof WINDOWS)[number]["value"];

/**
 * Review.
 *
 * The question is "am I actually changing", and the only honest answer is two
 * separate counts: how often the behaviour happened, and how often the problem
 * got smaller afterwards. Corrections are grouped by what the record supports,
 * so a correction that is being executed faithfully but is not working is
 * called out rather than buried in an average.
 */
export default function ReviewPage() {
  const state = useStore();
  const resetDemo = useStore((s) => s.resetDemo);
  const clearAll = useStore((s) => s.clearAll);

  const [window, setWindow] = useState<Window>("30");
  const [confirmReset, setConfirmReset] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const cutoff =
    window === "all" ? "0000-00-00" : addDays(dayKey(), -Number(window));

  const executions = useMemo(
    () => state.executions.filter((e) => e.date >= cutoff),
    [state.executions, cutoff],
  );

  const book = useMemo(
    () =>
      portfolio(state.corrections, executions, state.schedules, state.reviews),
    [state.corrections, executions, state.schedules, state.reviews],
  );

  const labelFor = (correctionId: string) =>
    state.schedules.find((s) => s.correctionId === correctionId)?.label;

  const execsFor = (correctionId: string) =>
    state.executions
      .filter((e) => e.correctionId === correctionId)
      .sort((a, b) => b.date.localeCompare(a.date));

  // There is no "has the problem got smaller?" prompt any more. Ticking a
  // day done and writing what happened is already the evidence, so Review
  // reads what was entered rather than asking for a second judgement.

  const anyData = book.totalAttempted > 0;

  return (
    <>
      <PageHeader eyebrow="Am I actually changing?" title="Review">
        <Segmented
          options={WINDOWS}
          value={window}
          onChange={setWindow}
          ariaLabel="Time window"
        />
      </PageHeader>

      <div className="space-y-6 pb-4">
        {!anyData ? (
          <EmptyState
            icon={ChartNoAxesColumn}
            title="Nothing to review yet"
            body="Once corrective actions have been executed or missed, this is where the record of what actually changed will be."
          />
        ) : (
          <>
            <WinsSummary
              executions={executions}
              corrections={state.corrections}
            />

            <Card className="px-3.5 py-4">
              <div className="flex gap-4">
                <SummaryMetric
                  value={book.totalAttempted}
                  label="Attempted"
                  sub="actions that came due"
                />
                <SummaryMetric
                  value={book.totalCompleted}
                  label="Completed"
                  tone="success"
                  sub={percent(book.completionRate)}
                />
                <SummaryMetric
                  value={book.totalMissed}
                  label="Missed"
                  tone={book.totalMissed > book.totalCompleted ? "error" : undefined}
                  sub="not performed"
                />
              </div>
              <p className="mt-4 text-[14px] leading-relaxed font-semibold text-text-secondary">
                {book.totalCompleted} of {book.totalAttempted} scheduled
                corrective actions were performed
                {window === "all" ? " in total" : ` in the last ${window} days`}.
              </p>
            </Card>

            <Group
              label="Working"
              note="The problem is measurably smaller."
              stats={book.working}
              tone="working"
              labelFor={labelFor}
              execsFor={execsFor}
            />

            <Group
              label="Being done, not working"
              note="Being done. The problem is not responding."
              stats={book.ineffective}
              tone="ineffective"
              labelFor={labelFor}
              execsFor={execsFor}
            />

            <Group
              label="Not being executed"
              note="The behaviour is not happening."
              stats={book.unexecuted}
              tone="unexecuted"
              labelFor={labelFor}
              execsFor={execsFor}
            />

            {/* "No verdict yet" and "too early to say" were two labels for
                the same cell: there is nothing to conclude. One bucket. */}
            <Group
              label="Not enough evidence yet"
              note="Too little has settled to say."
              stats={[...book.inconclusive, ...book.tooEarly]}
              tone="early"
              labelFor={labelFor}
              execsFor={execsFor}
            />
          </>
        )}

        <Divider className="mt-2" />

        {/* Appearance and data are settings, not findings. They sat as two
            more labelled sections on the busiest screen in the app; folded
            away they cost one row until someone wants them. */}
        <div>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            className="flex w-full items-center gap-2 px-1 py-1 text-left"
          >
            <span className="flex-1 text-[13px] font-extrabold text-text-muted">
              Settings
            </span>
            <motion.span
              animate={{ rotate: settingsOpen ? 180 : 0 }}
              transition={spring}
              className="text-text-muted"
            >
              <ChevronDown size={15} strokeWidth={2.75} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {settingsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={springSoft}
                className="overflow-hidden"
              >
                <Card className="mt-2 space-y-4 px-3.5 py-3.5">
                  <div className="space-y-2">
                    <p className="text-[14px] font-extrabold">Appearance</p>
                    <ThemeToggle className="max-w-[220px]" />
                  </div>
                  <div className="space-y-3 border-t border-border pt-3.5">
                    <p className="text-[14px] leading-relaxed font-semibold text-text-secondary">
                      Everything is stored on this device. Nothing is sent
                      anywhere.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setConfirmReset(true)}>
                        <RotateCcw size={13} strokeWidth={2.75} />
                        Reset to demo data
                      </Button>
                      {/* Deleting the samples one at a time is nobody's idea
                          of a first run. This empties the app in one go. */}
                      <Button
                        variant="ghostDanger"
                        size="sm"
                        onClick={() => setConfirmClear(true)}
                      >
                        <Trash2 size={13} strokeWidth={2.75} />
                        Clear everything
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Confirm
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAll}
        title="Clear everything?"
        body="Every correction, schedule, execution, capture and the running budget are deleted from this device. The app starts empty — the samples do not come back."
        confirmLabel="Clear it all"
        destructive
      />

      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetDemo}
        title="Reset to demo data?"
        body="Your corrections, schedules and execution history on this device are replaced with the sample set."
        confirmLabel="Reset"
        destructive
      />
    </>
  );
}

function Group({
  label,
  note,
  stats,
  tone,
  labelFor,
  execsFor,
}: {
  label: string;
  note: string;
  stats: CorrectionStats[];
  tone: "working" | "ineffective" | "unexecuted" | "early";
  labelFor: (id: string) => string | undefined;
  execsFor: (id: string) => Execution[];
}) {
  if (!stats.length) return null;

  return (
    <Section
      label={label}
      action={
        <span className="tnum text-[13px] font-extrabold text-text-muted">
          {stats.length}
        </span>
      }
    >
      <p className="px-1 pb-1 text-[14px] leading-relaxed font-semibold text-text-muted">
        {note}
      </p>
      <motion.ul layout transition={springSoft} className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {stats.map((s) => (
            <ReviewMetric
              key={s.correction.id}
              stats={s}
              executions={execsFor(s.correction.id)}
              actionLabel={labelFor(s.correction.id)}
              tone={tone}
            />
          ))}
        </AnimatePresence>
      </motion.ul>
    </Section>
  );
}
