"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { formatRelativeDay } from "@/lib/date";
import { describeTarget, formatValue, meetsTarget } from "@/lib/metric";
import { spring } from "@/lib/motion";
import type { Execution, Metric } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLOT_HEIGHT = 72;

/**
 * Recorded figures over time.
 *
 * Bars rather than a line: each occurrence is a discrete event, and magnitude
 * is the point. One hue for every bar, with the target drawn as a reference
 * line — over or under is read from position, not from colour. That matters
 * because red/green separate by only ΔE 5 under deuteranopia, so encoding the
 * verdict by colour here would hide it from some readers entirely.
 *
 * Only the most recent value is labelled; hovering any column names the rest.
 * The full list of figures is in the execution history below, which is the
 * table view for this chart.
 */
export function ValueTrend({
  metric,
  executions,
  limit = 12,
  hideSummary = false,
}: {
  metric: Metric;
  /** Any order; the chart sorts oldest-first itself. */
  executions: Execution[];
  limit?: number;
  /**
   * Drop the footer counts. The chart only plots the most recent `limit`
   * figures, so its on-target count has a different denominator from a
   * whole-period count — showing both side by side reads as a contradiction.
   */
  hideSummary?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const points = executions
    .filter((e) => typeof e.value === "number" && Number.isFinite(e.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((e) => ({ date: e.date, value: e.value as number }));

  if (points.length < 2) return null;

  // Headroom so the tallest bar does not touch the top, and so the target
  // line stays visible even when every figure is under it.
  const peak = Math.max(...points.map((p) => p.value), metric.target ?? 0);
  const scale = peak > 0 ? peak * 1.18 : 1;

  const targetY =
    metric.target !== undefined
      ? PLOT_HEIGHT - (metric.target / scale) * PLOT_HEIGHT
      : null;

  const active = hovered ?? points.length - 1;
  const shown = points[active];
  const met = meetsTarget(shown.value, metric);
  const onTarget =
    metric.target !== undefined
      ? points.filter((p) => meetsTarget(p.value, metric) === true).length
      : null;

  return (
    <div>
      {/* The caption is the direct label: one value, not a number per bar. */}
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="tnum text-[20px] leading-none font-black tracking-[-0.02em]">
          {formatValue(shown.value, metric)}
        </span>
        <span className="text-[13px] font-bold text-text-muted">
          {formatRelativeDay(shown.date)}
          {met !== null && (
            <span className={cn("ml-1.5", met ? "text-success" : "text-error")}>
              {met ? "on target" : "over"}
            </span>
          )}
        </span>
      </div>

      <div
        className="relative"
        style={{ height: PLOT_HEIGHT }}
        role="img"
        aria-label={
          `${points.length} recorded figures, from ` +
          `${formatValue(points[0].value, metric)} to ` +
          `${formatValue(points[points.length - 1].value, metric)}` +
          (describeTarget(metric) ? `, target ${describeTarget(metric)}` : "")
        }
      >
        {/* Baseline */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-chart-grid" aria-hidden />

        {/* Target reference line — recessive, dashed, behind the marks. */}
        {targetY !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-chart-grid"
            style={{ top: targetY }}
            aria-hidden
          />
        )}

        <div className="absolute inset-0 flex items-end gap-[2px]">
          {points.map((point, i) => {
            const height = Math.max(
              3,
              (point.value / scale) * PLOT_HEIGHT,
            );
            const isActive = i === active;
            return (
              // The whole column is the hit target, not the bar alone.
              <div
                key={`${point.date}-${i}`}
                className="flex h-full flex-1 cursor-default items-end"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                title={`${formatRelativeDay(point.date)} · ${formatValue(point.value, metric)}`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height }}
                  transition={{ ...spring, delay: i * 0.02 }}
                  className={cn(
                    "w-full rounded-t-[4px] bg-chart-bar transition-opacity",
                    // A small step, not a big one: the highlighted bar should
                    // read as emphasis within one series, not as a second
                    // colour.
                    isActive ? "opacity-100" : "opacity-75",
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {!hideSummary && (
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-bold text-text-muted">
            {describeTarget(metric) ?? `${points.length} recorded`}
          </span>
          {onTarget !== null && (
            <span className="tnum text-[13px] font-extrabold text-text-secondary">
              {onTarget} of {points.length} on target
            </span>
          )}
        </div>
      )}
    </div>
  );
}
