"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";
import { Field, Input, Label } from "@/components/ui/Field";
import { Confirm, Sheet } from "@/components/ui/Sheet";
import { describeRecurrence, dueTimeOf } from "@/lib/schedule";
import { useOnOpen } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import type { Correction, Recurrence, Schedule } from "@/lib/types";
import { RecurrenceSelector } from "./RecurrenceSelector";
import { DurationSelector, TimeSelector } from "./TimeSelector";
import { Button } from "@/components/ui/Button";

interface Draft {
  label: string;
  startTime: string;
  duration: number;
  recurrence: Recurrence;
}

const DEFAULT: Draft = {
  label: "",
  startTime: "08:00",
  duration: 20,
  recurrence: { kind: "weekdays" },
};

/**
 * Attaching a correction to a time.
 *
 * This is the step the product exists to force: a correction with no schedule
 * is an intention. The sheet previews the resolved sentence at the bottom so
 * the user can read back what they have actually committed to.
 */
export function ScheduleEditor({
  open,
  onClose,
  correction,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  correction: Correction;
  existing?: Schedule;
}) {
  const addSchedule = useStore((s) => s.addSchedule);
  const updateSchedule = useStore((s) => s.updateSchedule);
  const removeSchedule = useStore((s) => s.removeSchedule);
  const toggleSchedule = useStore((s) => s.toggleSchedule);

  const [draft, setDraft] = useState<Draft>(DEFAULT);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useOnOpen(open, () => {
    setDraft(
      existing
        ? {
            label: existing.label,
            startTime: existing.startTime,
            duration: existing.duration,
            recurrence: existing.recurrence,
          }
        : DEFAULT,
    );
  });

  // An anchored action derives its time, so the drum is hidden for that kind.
  const anchored = draft.recurrence.kind === "before";
  const resolved = dueTimeOf({
    startTime: draft.startTime,
    recurrence: draft.recurrence,
  });

  const label = draft.label.trim() || "Corrective action";

  const save = () => {
    const payload = {
      label,
      startTime: anchored ? resolved : draft.startTime,
      duration: draft.duration,
      recurrence: draft.recurrence,
      correctionId: correction.id,
      active: existing?.active ?? true,
    };
    if (existing) updateSchedule(existing.id, payload);
    else addSchedule(payload);
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={existing ? "Edit schedule" : "Schedule this correction"}
        subtitle={correction.correction}
        footer={
          <div className="flex items-center gap-2">
            {existing && (
              <Button
                variant="ghostDanger"
                size="lg"
                icon
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete schedule"
              >
                <Trash2 size={16} strokeWidth={2.5} />
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              onClick={save}
              className="flex-1"
            >
              {existing ? "Save schedule" : "Schedule it"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field
            label="Action"
            hint="What you will actually be doing at that moment."
          >
            <Input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder="Verbal revision"
            />
          </Field>

          <div className="space-y-2">
            <Label>Repeat</Label>
            <RecurrenceSelector
              value={draft.recurrence}
              onChange={(recurrence) => setDraft((d) => ({ ...d, recurrence }))}
            />
          </div>

          {!anchored && (
            <TimeSelector
              label="Time"
              value={draft.startTime}
              onChange={(startTime) => setDraft((d) => ({ ...d, startTime }))}
            />
          )}

          <div className="space-y-2">
            <Label>Duration</Label>
            <DurationSelector
              value={draft.duration}
              onChange={(duration) => setDraft((d) => ({ ...d, duration }))}
            />
          </div>

          {/* Pausing used to live in a list on the Schedule tab. With that
              tab gone it belongs with the schedule it acts on. */}
          {existing && (
            <button
              onClick={() => toggleSchedule(existing.id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-high"
            >
              {existing.active ? (
                <Pause size={16} strokeWidth={2.75} className="shrink-0 text-text-muted" />
              ) : (
                <Play size={16} strokeWidth={2.75} className="shrink-0 text-accent" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-extrabold">
                  {existing.active ? "Pause this schedule" : "Resume this schedule"}
                </span>
                <span className="mt-0.5 block text-[14px] font-semibold text-text-muted">
                  {existing.active
                    ? "Stops generating actions. History is kept."
                    : "Paused — it is not generating actions."}
                </span>
              </span>
            </button>
          )}

          {/* The commitment, stated back in words. */}
          <div className="rounded-2xl bg-accent-soft px-3.5 py-3">
            <Label className="text-accent-on-soft/70">This becomes</Label>
            <p className="mt-1 text-[16px] leading-snug font-extrabold text-accent-on-soft break-words">
              {label} — {describeRecurrence(draft.recurrence, draft.startTime)}
            </p>
            {anchored && (
              <p className="tnum mt-1 text-[14px] font-bold text-accent-on-soft/75">
                Lands at {resolved}
              </p>
            )}
          </div>
        </div>
      </Sheet>

      {existing && (
        <Confirm
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            removeSchedule(existing.id);
            onClose();
          }}
          title="Delete this schedule?"
          body="The correction stays. Its execution history for this schedule is removed and the Review numbers will change."
          confirmLabel="Delete"
          destructive
        />
      )}
    </>
  );
}
