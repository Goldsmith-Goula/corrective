"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, Inbox, LayoutList, Rows3 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { buttonClasses } from "@/components/ui/button-classes";
import { ActionRow, type ActionTone } from "@/components/today/ActionRow";
import { CompletionControl } from "@/components/today/CompletionControl";
import { DayRail } from "@/components/today/DayRail";
import { DateStrip } from "@/components/schedule/RecurrenceSelector";
import { ScheduleEditor } from "@/components/schedule/ScheduleEditor";
import { Timeline, type TimelineItem } from "@/components/schedule/Timeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/Progress";
import { Section } from "@/components/ui/Surface";
import { addDays, dayKey, formatDayLong, formatRelativeDay } from "@/lib/date";
import { useMinutesNow } from "@/lib/hooks";
import { springSoft } from "@/lib/motion";
import { selectDay, useStore } from "@/lib/store";
import type { ResolvedAction, Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Today — and any other day.
 *
 * This used to be two tabs. "Schedule" showed the same actions as Today at a
 * different zoom, which is the kind of duplication that makes an app feel
 * larger than it is. The day strip and the draggable timeline now live here,
 * because the day was already here.
 *
 * The ordering within a day is deliberate: what is live or late first, then
 * what is still coming, then what is finished — finished work sinks to the
 * bottom and stops competing for attention.
 */
export default function TodayPage() {
  const state = useStore();
  const moveSchedule = useStore((s) => s.moveSchedule);
  const now = useMinutesNow();
  const today = dayKey();

  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<"list" | "timeline">("list");
  const [completing, setCompleting] = useState<ResolvedAction | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const isToday = selected === today;
  const isFuture = selected > today;

  // On a day that is not today there is no "now", so nothing is live or
  // overdue — passing -1 keeps that explicit rather than implied.
  const day = useMemo(
    () => selectDay(state, selected, isToday ? now : -1),
    [state, selected, isToday, now],
  );

  const captures = state.captures.filter((c) => !c.convertedTo);

  // Consecutive days ending today on which something was actually done.
  // Shown only once it is real (two days or more), and only ever as a count.
  const run = useMemo(() => {
    const days = new Set(
      state.executions
        .filter((e) => e.status === "done" || e.status === "partial")
        .map((e) => e.date),
    );
    let n = 0;
    for (let i = 0; i < 365; i++) {
      const key = addDays(today, -i);
      if (days.has(key)) n++;
      else if (i > 0) break;
    }
    return n;
  }, [state.executions, today]);
  const remaining = day.overdue.length + day.live.length + day.upcoming.length;
  const settledCount = day.done.length;
  const total = day.actions.length;

  const title = !total
    ? "Nothing scheduled"
    : isFuture
      ? `${total} ${total === 1 ? "action" : "actions"} planned`
      : remaining === 0
        ? "All actions recorded"
        : `${remaining} ${remaining === 1 ? "action" : "actions"} to execute`;

  const timelineItems: TimelineItem[] = day.actions.map((a) => ({
    schedule: a.schedule,
    correction: a.correction,
    dueTime: a.dueTime,
    dueMinutes: a.dueMinutes,
  }));

  return (
    <>
      <PageHeader
        eyebrow={isToday ? formatDayLong(today) : formatRelativeDay(selected)}
        title={title}
      >
        <div className="space-y-4">
          <DateStrip value={selected} onChange={setSelected} days={14} />

          {total > 0 && !isFuture && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="tnum text-[15px] font-bold text-text-muted">
                  <span
                    className={cn(
                      settledCount > 0 && "font-extrabold text-success",
                    )}
                  >
                    {settledCount} of {total} done
                  </span>
                  {run >= 2 && (
                    <span className="text-text-secondary">
                      {" · "}
                      {run} days running
                    </span>
                  )}
                </p>
                {day.overdue.length > 0 && (
                  <p className="text-[14px] font-extrabold text-error">
                    {day.overdue.length} overdue
                  </p>
                )}
              </div>
              <ProgressBar
                value={total ? settledCount / total : 0}
                tone={settledCount === total ? "success" : "accent"}
                label="Actions recorded"
              />
            </div>
          )}
        </div>
      </PageHeader>

      <div className="space-y-6 pb-4">
        {total === 0 && (
          <EmptyState
            icon={CalendarCheck}
            title={
              isToday ? "No actions due today" : "Nothing scheduled this day"
            }
            body="Corrections only change behaviour once they are attached to a time. Add a schedule to one and it will appear here."
            action={
              <Link
                href="/corrections"
                className={buttonClasses({ variant: "primary" })}
              >
                Go to corrections
              </Link>
            }
          />
        )}

        {total > 0 && (
          <Section
            label={view === "list" ? "The day" : "Drag a block to move it"}
            action={<ViewToggle value={view} onChange={setView} />}
          >
            {view === "timeline" ? (
              <div className="no-scrollbar max-h-[62dvh] overflow-y-auto overscroll-contain rounded-2xl bg-surface/40 p-3 md:max-h-[68dvh]">
                <Timeline
                  items={timelineItems}
                  now={now}
                  showNow={isToday && now >= 0}
                  onMove={moveSchedule}
                  onOpen={(item) => setEditingSchedule(item.schedule)}
                />
              </div>
            ) : (
              <>
                {isToday && (
                  <DayRail actions={day.actions} now={now} showNow={now >= 0} />
                )}
                <div className={cn("space-y-6", isToday && "pt-2")}>
                  <Bucket
                    label="Now"
                    actions={day.live}
                    tone="live"
                    onComplete={setCompleting}
                  />
                  <Bucket
                    label="Overdue"
                    actions={day.overdue}
                    tone="overdue"
                    onComplete={setCompleting}
                  />
                  <Bucket
                    label={isFuture ? "Planned" : "Later"}
                    actions={day.upcoming}
                    tone="upcoming"
                    readOnly={isFuture}
                    onComplete={setCompleting}
                  />
                  <Bucket
                    label="Recorded"
                    actions={day.done}
                    tone="settled"
                    onComplete={setCompleting}
                  />
                </div>
              </>
            )}
          </Section>
        )}

        {/* The capture inbox is surfaced here only as a count — Today is for
            executing, not for processing notes. */}
        {isToday && captures.length > 0 && (
          <Link href="/corrections" className="block">
            <motion.div
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-3.5 py-3"
            >
              <Inbox
                size={17}
                strokeWidth={2.5}
                className="shrink-0 text-text-muted"
              />
              <p className="min-w-0 flex-1 text-[15px] font-bold text-text-secondary">
                {captures.length} captured{" "}
                {captures.length === 1 ? "problem" : "problems"} waiting to be
                structured
              </p>
              <span className="shrink-0 text-[14px] font-extrabold text-accent">
                Open
              </span>
            </motion.div>
          </Link>
        )}
      </div>

      <CompletionControl
        action={completing}
        open={completing !== null}
        onClose={() => setCompleting(null)}
      />

      {editingSchedule && (
        <ScheduleEditor
          open
          onClose={() => setEditingSchedule(null)}
          correction={
            state.corrections.find((c) => c.id === editingSchedule.correctionId)!
          }
          existing={editingSchedule}
        />
      )}
    </>
  );
}

/** List or timeline. Two options, so a pair of icons rather than a menu. */
function ViewToggle({
  value,
  onChange,
}: {
  value: "list" | "timeline";
  onChange: (v: "list" | "timeline") => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-full bg-surface p-0.5">
      {(
        [
          ["list", LayoutList, "List"],
          ["timeline", Rows3, "Timeline"],
        ] as const
      ).map(([key, Icon, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          aria-label={label}
          title={label}
          className={cn(
            "grid size-7 place-items-center rounded-full transition-colors",
            value === key
              ? "bg-accent text-accent-fg"
              : "text-text-muted hover:text-text",
          )}
        >
          <Icon size={13} strokeWidth={2.75} />
        </button>
      ))}
    </div>
  );
}

function Bucket({
  label,
  actions,
  tone,
  readOnly,
  onComplete,
}: {
  label: string;
  actions: ResolvedAction[];
  tone: ActionTone;
  readOnly?: boolean;
  onComplete: (action: ResolvedAction) => void;
}) {
  if (!actions.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-[13px] font-extrabold text-text-muted">
          {label}
        </h3>
        <span className="tnum text-[13px] font-extrabold text-text-muted">
          {actions.length}
        </span>
      </div>
      <motion.ul layout transition={springSoft} className="space-y-2">
        <AnimatePresence initial={false} mode="popLayout">
          {actions.map((action) => (
            <ActionRow
              key={`${action.schedule.id}:${action.date}`}
              action={action}
              tone={tone}
              readOnly={readOnly}
              onComplete={onComplete}
            />
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
