"use client";

import { motion, useMotionValue } from "motion/react";
import { GripHorizontal } from "lucide-react";
import { useRef, useState } from "react";
import { formatDuration, fromMinutes } from "@/lib/date";
import { spring, springSnap } from "@/lib/motion";
import { describeRecurrenceShort } from "@/lib/schedule";
import type { Correction, Schedule } from "@/lib/types";
import { cn } from "@/lib/utils";

export const DAY_START = 5 * 60;
export const DAY_END = 24 * 60;
const PX_PER_MIN = 1.2;
const SNAP = 5;
const MIN_HEIGHT = 44;

const toY = (mins: number) => (mins - DAY_START) * PX_PER_MIN;
const toMins = (y: number) => DAY_START + y / PX_PER_MIN;

export interface TimelineItem {
  schedule: Schedule;
  correction: Correction;
  dueMinutes: number;
  dueTime: string;
}

/**
 * The day as vertical time.
 *
 * Dragging a block is the point of this screen. While a block is held it
 * reports the time it would land on and a guide line tracks it, so moving a
 * corrective action to a better moment is a direct manipulation rather than a
 * trip through a form. Anchored actions ("20 minutes before teaching") move
 * their offset instead of their clock time, which is what the user means.
 */
export function Timeline({
  items,
  now,
  showNow,
  onMove,
  onOpen,
}: {
  items: TimelineItem[];
  /** Minutes from midnight. */
  now: number;
  showNow: boolean;
  onMove: (scheduleId: string, startTime: string) => void;
  onOpen: (item: TimelineItem) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const height = (DAY_END - DAY_START) * PX_PER_MIN;

  const hours = Array.from(
    { length: (DAY_END - DAY_START) / 60 + 1 },
    (_, i) => DAY_START + i * 60,
  );

  return (
    <div className="relative flex gap-2">
      {/* Hour gutter */}
      <div className="relative w-9 shrink-0" style={{ height }}>
        {hours.map((h) => (
          <span
            key={h}
            className="tnum absolute right-0 -translate-y-1/2 text-[13px] font-bold text-text-muted"
            style={{ top: toY(h) }}
          >
            {`${Math.floor(h / 60)}`.padStart(2, "0")}
          </span>
        ))}
      </div>

      <div ref={railRef} className="relative flex-1" style={{ height }}>
        {hours.map((h) => (
          <div
            key={h}
            className="absolute inset-x-0 h-px bg-border"
            style={{ top: toY(h) }}
            aria-hidden
          />
        ))}

        {showNow && now >= DAY_START && now <= DAY_END && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
            style={{ top: toY(now) }}
            aria-hidden
          >
            <span className="size-2 shrink-0 -translate-x-1/2 rounded-full bg-accent" />
            <span className="h-px flex-1 bg-accent/55" />
          </div>
        )}

        {items.map((item) => (
          <Block
            key={item.schedule.id}
            item={item}
            railRef={railRef}
            onMove={onMove}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function Block({
  item,
  railRef,
  onMove,
  onOpen,
}: {
  item: TimelineItem;
  railRef: React.RefObject<HTMLDivElement | null>;
  onMove: (scheduleId: string, startTime: string) => void;
  onOpen: (item: TimelineItem) => void;
}) {
  const y = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(item.dueMinutes);

  const top = toY(item.dueMinutes);
  const height = Math.max(MIN_HEIGHT, item.schedule.duration * PX_PER_MIN);
  const inactive = !item.schedule.active;

  /** Where this block would land, snapped and clamped to the day. */
  const landing = (offsetY: number) => {
    const raw = toMins(top + offsetY);
    const snapped = Math.round(raw / SNAP) * SNAP;
    return Math.max(
      DAY_START,
      Math.min(DAY_END - item.schedule.duration, snapped),
    );
  };

  return (
    <motion.div
      drag="y"
      dragMomentum={false}
      dragElastic={0.04}
      style={{ top, height, y }}
      dragConstraints={railRef}
      onDragStart={() => setDragging(true)}
      onDrag={(_, info) => setPreview(landing(info.offset.y))}
      onDragEnd={(_, info) => {
        const mins = landing(info.offset.y);
        setDragging(false);
        // Snap the motion value home; the committed time re-renders `top`.
        y.set(0);
        if (mins !== item.dueMinutes) onMove(item.schedule.id, fromMinutes(mins));
      }}
      animate={{ scale: dragging ? 1.02 : 1 }}
      transition={springSnap}
      className={cn(
        "absolute inset-x-0 z-10 touch-none select-none",
        dragging && "z-30",
      )}
    >
      <button
        onClick={() => !dragging && onOpen(item)}
        className={cn(
          "flex h-full w-full flex-col justify-center gap-0.5 overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition-colors",
          inactive
            ? "border border-dashed border-border-strong bg-surface/50"
            : "bg-accent-soft",
          dragging && "ring-2 ring-accent",
        )}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "tnum text-[13px] leading-none font-extrabold",
              inactive ? "text-text-muted" : "text-accent-on-soft/80",
            )}
          >
            {dragging ? fromMinutes(preview) : item.dueTime}
          </span>
          <span
            className={cn(
              "truncate text-[14px] leading-none font-extrabold",
              inactive ? "text-text-muted" : "text-accent-on-soft",
            )}
          >
            {item.schedule.label}
          </span>
          <GripHorizontal
            size={12}
            strokeWidth={2.5}
            className={cn(
              "ml-auto shrink-0",
              inactive ? "text-text-muted/60" : "text-accent-on-soft/45",
            )}
          />
        </span>
        {height > 52 && (
          <span
            className={cn(
              "truncate text-[13px] leading-tight font-bold",
              inactive ? "text-text-muted/80" : "text-accent-on-soft/70",
            )}
          >
            {formatDuration(item.schedule.duration)} ·{" "}
            {describeRecurrenceShort(item.schedule.recurrence)}
          </span>
        )}
      </button>

      {/* While held, the landing time is also stated outside the block so it
          stays readable when the block itself is small. */}
      {dragging && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={spring}
          className="tnum pointer-events-none absolute top-1/2 -right-1 -translate-y-1/2 translate-x-full rounded-full bg-accent px-2 py-0.5 text-[13px] font-extrabold text-accent-fg"
        >
          {fromMinutes(preview)}
        </motion.span>
      )}
    </motion.div>
  );
}
