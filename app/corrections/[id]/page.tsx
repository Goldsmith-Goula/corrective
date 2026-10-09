"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CausalChain } from "@/components/corrections/CausalChain";
import { CorrectionEditor } from "@/components/corrections/CorrectionEditor";
import {
  CorrectionStatusPill,
  StatusSelector,
} from "@/components/corrections/CorrectionStatus";
import {
  ExecutionHistory,
  ResultEntries,
} from "@/components/corrections/ExecutionHistory";
import { ValueTrend } from "@/components/corrections/ValueTrend";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { RunMeter } from "@/components/ui/Progress";
import { Confirm, Sheet } from "@/components/ui/Sheet";
import { Card, Divider, Section, Stat } from "@/components/ui/Surface";
import { formatDuration, formatRelativeDay } from "@/lib/date";
import { springSoft } from "@/lib/motion";
import { describeRecurrence, dueTimeOf } from "@/lib/schedule";
import { describeTarget, formatValue } from "@/lib/metric";
import { evidenceLine, percent, statsFor } from "@/lib/stats";
import { selectCorrection, useStore } from "@/lib/store";
import type { Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/button-classes";

/**
 * A correction, in full.
 *
 * Laid out as a record being inspected rather than a form being filled: the
 * causal chain reads top to bottom, the mechanism that acts on it sits beside
 * it, and the evidence underneath is what the status is supposed to be
 * justified by. Editing is deliberately one step removed, behind a button.
 */
export default function CorrectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const state = useStore();
  const setStatus = useStore((s) => s.setStatus);
  const removeCorrection = useStore((s) => s.removeCorrection);

  const [editing, setEditing] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [scheduling, setScheduling] = useState<Schedule | null | "new">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = useMemo(
    () => selectCorrection(state, params.id),
    [state, params.id],
  );

  const stats = useMemo(
    () =>
      data
        ? statsFor(
            data.correction,
            state.executions,
            state.schedules,
            state.reviews,
          )
        : null,
    [data, state.executions, state.schedules, state.reviews],
  );

  if (!data || !stats) {
    return (
      <div className="py-16 text-center">
        <p className="text-[17px] font-extrabold">Correction not found</p>
        <Link
          href="/corrections"
          className={buttonClasses({ className: "mt-4" })}
        >
          Back to corrections
        </Link>
      </div>
    );
  }

  const { correction, schedules, executions } = data;
  const primary = schedules[0];
  const recent = executions
    .filter((e) => e.status !== "pending")
    .slice(0, 12)
    .reverse()
    .map((e) => e.status);

  return (
    <>
      <div className="flex items-center justify-between gap-2 pb-2">
        <button
          onClick={() => router.back()}
          className="-ml-1.5 flex h-9 items-center gap-1.5 rounded-full pr-3 pl-2 text-[15px] font-extrabold text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <ArrowLeft size={16} strokeWidth={2.75} />
          Back
        </button>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={() => setEditing(true)}>
            <Pencil size={13} strokeWidth={2.75} />
            Edit
          </Button>
          <Button
            variant="ghostDanger"
            size="sm"
            icon
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete correction"
          >
            <Trash2 size={15} strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 pb-4 md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 md:pt-2">
        {/* ---------------------------------------------- the causal chain */}
        <div className="space-y-6">
          <motion.div layout transition={springSoft}>
            <CausalChain correction={correction} />
          </motion.div>

          <Divider />

          {/* The mechanism: when it happens, and how it is judged. */}
          <Section label="Schedule">
            {schedules.length ? (
              <ul className="space-y-2">
                {schedules.map((schedule) => (
                  <li key={schedule.id}>
                    <button
                      onClick={() => setScheduling(schedule)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors",
                        schedule.active
                          ? "bg-accent-soft hover:brightness-[0.98]"
                          : "bg-surface hover:bg-surface-high",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span
                            className={cn(
                              "tnum text-[20px] leading-none font-black tracking-[-0.02em]",
                              schedule.active
                                ? "text-accent-on-soft"
                                : "text-text-muted",
                            )}
                          >
                            {dueTimeOf(schedule)}
                          </span>
                          <span
                            className={cn(
                              "truncate text-[16px] font-extrabold",
                              schedule.active
                                ? "text-accent-on-soft"
                                : "text-text-muted",
                            )}
                          >
                            {schedule.label}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "mt-1 block text-[14px] font-bold",
                            schedule.active
                              ? "text-accent-on-soft/75"
                              : "text-text-muted",
                          )}
                        >
                          {describeRecurrence(
                            schedule.recurrence,
                            schedule.startTime,
                          )}{" "}
                          {/* "for" matters here: an anchored action already
                              states an offset in minutes, and a bare second
                              number reads as a second offset. */}
                          · for {formatDuration(schedule.duration)}
                          {!schedule.active && " · paused"}
                        </span>
                      </span>
                      <Pencil
                        size={14}
                        strokeWidth={2.5}
                        className={cn(
                          "shrink-0",
                          schedule.active
                            ? "text-accent-on-soft/60"
                            : "text-text-muted",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <button
                onClick={() => setScheduling("new")}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-3.5 py-4 text-left transition-colors hover:bg-surface"
              >
                <CalendarClock
                  size={17}
                  strokeWidth={2.5}
                  className="shrink-0 text-text-muted"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-extrabold">
                    Not scheduled
                  </span>
                  <span className="mt-0.5 block text-[14px] font-semibold text-text-muted">
                    A correction with no time attached will not happen.
                  </span>
                </span>
                <Plus size={16} strokeWidth={3} className="shrink-0 text-accent" />
              </button>
            )}

            {schedules.length > 0 && (
              <button
                onClick={() => setScheduling("new")}
                className="mt-2 px-1 text-[14px] font-extrabold text-accent"
              >
                Add another time
              </button>
            )}
          </Section>

          <Section label="Measurement">
            <Card className="px-3.5 py-3">
              <p className="text-[16px] leading-relaxed font-bold break-words">
                {correction.measurement || (
                  <span className="text-text-muted italic">
                    No measurement defined. Without one, completion is an
                    opinion.
                  </span>
                )}
              </p>
              {correction.metric && (
                <p className="mt-2 flex items-center gap-2 text-[14px] font-extrabold text-accent">
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] text-accent-on-soft">
                    Measured
                  </span>
                  {describeTarget(correction.metric) ??
                    `recorded in ${correction.metric.unit}`}
                </p>
              )}
            </Card>
          </Section>
        </div>

        {/* ------------------------------------------------------ evidence */}
        <div className="space-y-6">
          <Section label="Execution">
            <Card className="px-3.5 py-4">
              <div className="flex items-start justify-between gap-4">
                <Stat
                  value={
                    <span className="tnum">
                      {stats.completed}
                      <span className="text-text-muted">/{stats.attempted}</span>
                    </span>
                  }
                  label="Completed"
                />
                <Stat
                  value={percent(stats.completionRate)}
                  label="Rate"
                  tone={
                    stats.completionRate >= 0.8
                      ? "success"
                      : stats.completionRate >= 0.5
                        ? "warning"
                        : "error"
                  }
                />
              </div>

              {recent.length > 0 && <RunMeter statuses={recent} className="mt-4" />}

              <p className="mt-3.5 text-[14px] leading-relaxed font-semibold text-text-secondary break-words">
                {evidenceLine(stats, primary?.label ?? "This correction")}
              </p>

              {stats.streak >= 3 && (
                <p className="tnum mt-1.5 text-[14px] font-extrabold text-success">
                  {stats.streak} in a row
                </p>
              )}
            </Card>
          </Section>

          {correction.metric && stats.metric && (
            <Section label="Measured">
              <Card className="px-3.5 py-3.5">
                <ValueTrend metric={correction.metric} executions={executions} />
                {stats.metric.values.length >= 2 && (
                  <p className="mt-3 border-t border-border pt-3 text-[14px] font-semibold text-text-secondary">
                    {stats.metric.values.length} figures recorded, totalling{" "}
                    <span className="tnum font-extrabold text-text">
                      {formatValue(stats.metric.total, correction.metric)}
                    </span>
                    .
                  </p>
                )}
              </Card>
            </Section>
          )}

          <Section label="Status">
            <button
              onClick={() => setStatusOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-high"
            >
              <CorrectionStatusPill status={correction.status} />
              <span className="min-w-0 flex-1 text-[14px] font-semibold text-text-muted">
                {stats.next
                  ? `Next ${formatRelativeDay(stats.next.date)} · ${stats.next.time}`
                  : "No upcoming action"}
              </span>
              <Pencil size={13} strokeWidth={2.5} className="shrink-0 text-text-muted" />
            </button>
          </Section>
        </div>

        {/* ---------------------------------------- history, full width */}
        <div className="space-y-6 md:col-span-2">
          <Divider />
          <Section label="Execution history">
            <ExecutionHistory executions={executions} metric={correction.metric} />
          </Section>

          <Section label="Results">
            <ResultEntries executions={executions} />
          </Section>
        </div>
      </div>

      <CorrectionEditor
        open={editing}
        onClose={() => setEditing(false)}
        existing={correction}
      />

      <Sheet
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Status"
        subtitle="What the evidence currently supports."
      >
        <StatusSelector
          value={correction.status}
          onChange={(status) => {
            setStatus(correction.id, status);
            setStatusOpen(false);
          }}
        />
        <p className="mt-4 text-[14px] leading-relaxed font-semibold text-text-muted">
          Marking a correction solved or abandoned stops it generating actions.
          Its history stays.
        </p>
      </Sheet>

      {scheduling !== null && (
        <ScheduleEditor
          open
          onClose={() => setScheduling(null)}
          correction={correction}
          existing={scheduling === "new" ? undefined : scheduling}
        />
      )}

      <Confirm
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeCorrection(correction.id);
          router.push("/corrections");
        }}
        title="Delete this correction?"
        body="Its schedules, executions and results are deleted with it. Abandoning it instead keeps the record of what did not work."
        confirmLabel="Delete"
        destructive
      />
    </>
  );
}
