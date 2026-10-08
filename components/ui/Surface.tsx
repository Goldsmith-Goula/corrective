"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The base card.
 *
 * Tonal rather than elevated: it sits on the background as a slightly
 * different tone, with no shadow. `inset` is for cards nested inside a card,
 * which step down toward the background instead of up.
 */
export function Card({
  children,
  className,
  tone = "surface",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "high" | "elevated" | "bare";
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <As
      className={cn(
        "rounded-2xl",
        tone === "surface" && "bg-surface",
        tone === "high" && "bg-surface-high",
        tone === "elevated" && "bg-elevated border border-border",
        tone === "bare" && "border border-border",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** A labelled band of content, with the label outside the card. */
export function Section({
  label,
  action,
  children,
  className,
}: {
  label?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-3 px-1">
          {label && (
            <h2 className="text-[13px] font-extrabold text-text-muted">
              {label}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A single statistic. The number leads; the label explains it afterwards. */
export function Stat({
  value,
  label,
  sub,
  tone = "text",
  className,
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  tone?: "text" | "accent" | "success" | "warning" | "error";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn(
          "tnum text-[32px] leading-none font-black tracking-[-0.02em]",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "error" && "text-error",
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[13px] font-extrabold text-text-muted">
        {label}
      </div>
      {sub && (
        <div className="mt-0.5 text-[14px] font-semibold text-text-secondary">
          {sub}
        </div>
      )}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border", className)} />;
}
