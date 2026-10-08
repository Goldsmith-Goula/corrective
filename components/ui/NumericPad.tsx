"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { spring, springSnap } from "@/lib/motion";
import { Keypad, applyKey } from "./Keypad";
import { describeTarget, meetsTarget } from "@/lib/metric";
import type { Metric } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The currency symbol on its own, pulled out of a formatted sample. */
function symbolFor(metric: Metric) {
  if (!metric.currency) return null;
  try {
    return (
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: metric.currency,
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? metric.currency
    );
  } catch {
    return metric.currency;
  }
}

/** Group the integer part so long figures stay readable while being typed. */
function groupDigits(raw: string) {
  const [whole, fraction] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * The big-number editor, adapted from Buckwheat.
 *
 * The figure is the screen: oversized, tabular, and animated per character so
 * typing feels like moving a counter rather than filling a text field. The
 * keypad is deliberately large and separate from the system keyboard, which
 * on a phone would cover the very number being entered.
 */
export function NumericPad({
  metric,
  value,
  onChange,
  autoFocusTarget,
}: {
  metric: Metric;
  /** Raw entry, digits and at most one dot. Empty means nothing typed. */
  value: string;
  onChange: (raw: string) => void;
  /** Shows the target line under the figure. */
  autoFocusTarget?: boolean;
}) {
  const symbol = symbolFor(metric);
  const allowsDecimal = Boolean(metric.currency) || metric.unit === "min";

  const parsed = value === "" ? null : Number(value);
  const met =
    parsed !== null && Number.isFinite(parsed)
      ? meetsTarget(parsed, metric)
      : null;
  const targetLine = describeTarget(metric);

  const shown = useMemo(
    () => (value === "" ? "0" : groupDigits(value)),
    [value],
  );

  return (
    <div>
      {/* ----------------------------------------------------- the figure */}
      <div
        className={cn(
          "rounded-2xl px-4 py-5 text-center transition-colors duration-200",
          met === true && "bg-success-soft",
          met === false && "bg-error-soft",
          met === null && "bg-surface",
        )}
        aria-live="polite"
      >
        <div className="flex items-baseline justify-center gap-1">
          {symbol && (
            <span
              className={cn(
                "text-[26px] font-extrabold",
                met === true && "text-success",
                met === false && "text-error",
                met === null && "text-text-muted",
              )}
            >
              {symbol}
            </span>
          )}
          <span className="tnum flex items-baseline">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.split("").map((char, i) => (
                <motion.span
                  key={`${i}-${char}`}
                  layout
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={springSnap}
                  className={cn(
                    "text-[48px] leading-none font-black tracking-[-0.03em]",
                    value === "" && "text-text-muted/45",
                    met === true && "text-success",
                    met === false && "text-error",
                  )}
                >
                  {char}
                </motion.span>
              ))}
            </AnimatePresence>
          </span>
          {!symbol && (
            <span
              className={cn(
                "text-[17px] font-extrabold",
                met === true && "text-success",
                met === false && "text-error",
                met === null && "text-text-muted",
              )}
            >
              {metric.unit}
            </span>
          )}
        </div>

        {autoFocusTarget && targetLine && (
          <motion.p
            layout
            transition={spring}
            className={cn(
              "mt-2 text-[14px] font-extrabold",
              met === true && "text-success",
              met === false && "text-error",
              met === null && "text-text-muted",
            )}
          >
            {met === null
              ? `Target: ${targetLine}`
              : met
                ? `On target — ${targetLine}`
                : `Over — target is ${targetLine}`}
          </motion.p>
        )}
      </div>

      {/* ------------------------------------------------------- the keys */}
      <Keypad
        className="mt-3"
        allowsDecimal={allowsDecimal}
        onKey={(key) => onChange(applyKey(value, key, { allowsDecimal }))}
      />
    </div>
  );
}

