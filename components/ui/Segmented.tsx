"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A segmented control whose selection slides between options.
 *
 * The sliding pill is the point: it carries the eye from the old choice to the
 * new one, so the change of state has a location rather than just appearing.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
  ariaLabel,
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const id = useId();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full rounded-full bg-surface p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative flex-1 rounded-full font-extrabold transition-colors duration-150",
              size === "sm" ? "h-7 text-[14px]" : "h-9 text-[15px]",
              active ? "text-accent-fg" : "text-text-muted hover:text-text",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                transition={spring}
                className="absolute inset-0 rounded-full bg-accent"
              />
            )}
            <span className="relative z-10 px-1">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * A row of weekday toggles.
 *
 * Deliberately not a segmented control: these are independent switches, and
 * they should not look like a single choice.
 */
export function WeekdayPicker({
  value,
  onChange,
  labels,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  labels: readonly string[];
}) {
  const toggle = (day: number) => {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day].sort();
    // A recurrence with no days would never fire; keep at least one.
    if (next.length) onChange(next);
  };

  return (
    <div className="flex gap-1.5">
      {labels.map((label, day) => {
        const active = value.includes(day);
        return (
          <motion.button
            key={day}
            whileTap={{ scale: 0.92 }}
            transition={spring}
            onClick={() => toggle(day)}
            aria-pressed={active}
            aria-label={label}
            className={cn(
              "h-9 flex-1 rounded-xl text-[14px] font-extrabold transition-colors duration-150",
              active
                ? "bg-accent text-accent-fg"
                : "bg-surface text-text-muted hover:bg-surface-high hover:text-text",
            )}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
