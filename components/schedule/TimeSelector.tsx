"use client";

import { useEffect, useRef } from "react";
import { fromMinutes, toMinutes } from "@/lib/date";
import { cn } from "@/lib/utils";

const ITEM = 40; // px per row
const VISIBLE = 5; // rows in the window
const PAD = ((VISIBLE - 1) / 2) * ITEM;

/**
 * A scrolling drum.
 *
 * Scroll snapping does the work: the list moves under a fixed selection band
 * and settles on a value, so choosing a time is a physical gesture rather than
 * a dropdown. The native scroller also gives momentum and rubber-banding for
 * free, which is most of what makes it feel right on a phone.
 */
function Drum({
  values,
  value,
  onChange,
  format,
  ariaLabel,
}: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against the scroll handler firing for our own programmatic scroll.
  const silent = useRef(false);

  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM;
    if (Math.abs(el.scrollTop - target) < 2) return;
    silent.current = true;
    el.scrollTo({ top: target, behavior: "auto" });
    requestAnimationFrame(() => {
      silent.current = false;
    });
  }, [index]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || silent.current) return;
    if (settle.current) clearTimeout(settle.current);
    // Commit once the scroll has actually stopped; committing on every frame
    // would fight the user's finger.
    settle.current = setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM);
      const next = values[Math.max(0, Math.min(values.length - 1, i))];
      if (next !== value) onChange(next);
    }, 90);
  };

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const delta = e.key === "ArrowUp" ? -1 : 1;
          const i = Math.max(0, Math.min(values.length - 1, index + delta));
          onChange(values[i]);
        }
      }}
      className="no-scrollbar relative flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ height: VISIBLE * ITEM, scrollPaddingTop: PAD }}
    >
      <div style={{ height: PAD }} aria-hidden />
      {values.map((v) => {
        const selected = v === value;
        return (
          <div
            key={v}
            role="option"
            aria-selected={selected}
            onClick={() => onChange(v)}
            className={cn(
              "tnum flex cursor-pointer snap-center items-center justify-center font-extrabold transition-all duration-150",
              selected
                ? "text-[26px] text-text"
                : "text-[20px] text-text-muted/55",
            )}
            style={{ height: ITEM }}
          >
            {format(v)}
          </div>
        );
      })}
      <div style={{ height: PAD }} aria-hidden />
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export function TimeSelector({
  value,
  onChange,
  label,
}: {
  /** "HH:mm" */
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const mins = toMinutes(value);
  const hour = Math.floor(mins / 60);
  // Snap to the nearest five so the drum always has the value it is showing.
  const minute = Math.round((mins % 60) / 5) * 5 === 60 ? 55 : Math.round((mins % 60) / 5) * 5;

  return (
    <div>
      {label && (
        <p className="mb-2 text-[13px] font-extrabold text-text-muted">
          {label}
        </p>
      )}
      <div className="relative overflow-hidden rounded-2xl bg-surface">
        {/* The selection band stays put; the numbers move through it. */}
        <div
          className="pointer-events-none absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-xl bg-accent-soft/60"
          style={{ height: ITEM }}
          aria-hidden
        />
        <div className="relative flex items-stretch">
          <Drum
            values={HOURS}
            value={hour}
            onChange={(h) => onChange(fromMinutes(h * 60 + minute))}
            format={(h) => `${h}`.padStart(2, "0")}
            ariaLabel="Hour"
          />
          <div
            className="pointer-events-none grid shrink-0 place-items-center text-[22px] font-extrabold text-text-muted"
            style={{ height: VISIBLE * ITEM }}
            aria-hidden
          >
            :
          </div>
          <Drum
            values={MINUTES}
            value={minute}
            onChange={(m) => onChange(fromMinutes(hour * 60 + m))}
            format={(m) => `${m}`.padStart(2, "0")}
            ariaLabel="Minute"
          />
        </div>
      </div>
    </div>
  );
}

const DURATIONS = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120];

/** Duration as a row of chips — the plausible values are few and known. */
export function DurationSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {DURATIONS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          aria-pressed={d === value}
          className={cn(
            "tnum h-9 shrink-0 rounded-full px-3.5 text-[14px] font-extrabold transition-colors duration-150",
            d === value
              ? "bg-accent text-accent-fg"
              : "bg-surface text-text-muted hover:bg-surface-high hover:text-text",
          )}
        >
          {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h ${d % 60}m`}
        </button>
      ))}
    </div>
  );
}
