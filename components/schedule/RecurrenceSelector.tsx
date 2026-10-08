"use client";

import { AnimatePresence, motion } from "motion/react";
import { Input, Label } from "@/components/ui/Field";
import { Segmented, WeekdayPicker } from "@/components/ui/Segmented";
import { TimeSelector } from "./TimeSelector";
import { WEEKDAY_LABELS, addDays, dayKey } from "@/lib/date";
import { springSoft } from "@/lib/motion";
import type { Recurrence, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Days" },
  { value: "before", label: "Before" },
  { value: "once", label: "Once" },
] as const;

type Kind = (typeof KINDS)[number]["value"];

/** A sensible default for each kind, so switching never produces nonsense. */
function defaultFor(kind: Kind, previous: Recurrence): Recurrence {
  const days =
    previous.kind === "weekly" || previous.kind === "before"
      ? previous.days
      : ([1, 2, 3, 4, 5] as Weekday[]);

  switch (kind) {
    case "daily":
      return { kind: "daily" };
    case "weekdays":
      return { kind: "weekdays" };
    case "weekly":
      return { kind: "weekly", days };
    case "before":
      return {
        kind: "before",
        anchor: previous.kind === "before" ? previous.anchor : "teaching",
        anchorTime: previous.kind === "before" ? previous.anchorTime : "08:30",
        offsetMinutes:
          previous.kind === "before" ? previous.offsetMinutes : 20,
        days,
      };
    case "once":
      return {
        kind: "once",
        date: previous.kind === "once" ? previous.date : dayKey(),
      };
  }
}

const OFFSETS = [5, 10, 15, 20, 30, 45, 60, 90];

/**
 * Choosing when a corrective action happens.
 *
 * The "Before" option is the one that matters most: corrections usually need
 * to attach to the event they are correcting, not to a clock time the user
 * picked. Everything else is the ordinary set.
 */
export function RecurrenceSelector({
  value,
  onChange,
}: {
  value: Recurrence;
  onChange: (value: Recurrence) => void;
}) {
  return (
    <div className="space-y-3">
      <Segmented
        options={KINDS}
        value={value.kind}
        onChange={(kind) => onChange(defaultFor(kind, value))}
        size="sm"
        ariaLabel="Repeat"
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value.kind}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={springSoft}
          className="overflow-hidden"
        >
          <div className="space-y-3 pt-0.5">
            {value.kind === "weekly" && (
              <WeekdayPicker
                value={value.days}
                onChange={(days) =>
                  onChange({ kind: "weekly", days: days as Weekday[] })
                }
                labels={WEEKDAY_LABELS}
              />
            )}

            {value.kind === "before" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label as="label">Before what?</Label>
                  <Input
                    value={value.anchor}
                    onChange={(e) =>
                      onChange({ ...value, anchor: e.target.value })
                    }
                    placeholder="teaching"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>How long before?</Label>
                  <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {OFFSETS.map((m) => (
                      <button
                        key={m}
                        onClick={() => onChange({ ...value, offsetMinutes: m })}
                        aria-pressed={m === value.offsetMinutes}
                        className={cn(
                          "tnum h-9 shrink-0 rounded-full px-3.5 text-[14px] font-extrabold transition-colors",
                          m === value.offsetMinutes
                            ? "bg-accent text-accent-fg"
                            : "bg-surface text-text-muted hover:bg-surface-high hover:text-text",
                        )}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <TimeSelector
                  label={`When does ${value.anchor || "it"} start?`}
                  value={value.anchorTime}
                  onChange={(anchorTime) => onChange({ ...value, anchorTime })}
                />

                <WeekdayPicker
                  value={value.days}
                  onChange={(days) =>
                    onChange({ ...value, days: days as Weekday[] })
                  }
                  labels={WEEKDAY_LABELS}
                />
              </div>
            )}

            {value.kind === "once" && (
              <DateStrip
                value={value.date}
                onChange={(date) => onChange({ kind: "once", date })}
              />
            )}

            {(value.kind === "daily" || value.kind === "weekdays") && (
              <p className="text-[14px] font-semibold text-text-muted">
                {value.kind === "daily"
                  ? "Every day, including weekends."
                  : "Monday to Friday."}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * A horizontal run of upcoming days.
 *
 * A full month grid would be more than a one-off corrective action ever needs;
 * these are scheduled for soon, by definition.
 */
export function DateStrip({
  value,
  onChange,
  days = 21,
}: {
  value: string;
  onChange: (date: string) => void;
  days?: number;
}) {
  const today = dayKey();
  const options = Array.from({ length: days }, (_, i) => addDays(today, i));

  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {options.map((key) => {
        const active = key === value;
        const d = new Date(`${key}T00:00:00`);
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-pressed={active}
            className={cn(
              "flex h-14 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors duration-150",
              active
                ? "bg-accent text-accent-fg"
                : "bg-surface text-text-muted hover:bg-surface-high",
            )}
          >
            <span className="text-[10px] font-extrabold opacity-80">
              {d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}
            </span>
            <span className="tnum text-[17px] leading-none font-black">
              {d.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
