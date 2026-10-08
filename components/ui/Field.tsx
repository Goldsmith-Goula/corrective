"use client";

import type {
  ComponentPropsWithoutRef,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** The small all-caps label used throughout the app. */
export function Label({
  children,
  className,
  as: As = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "label" | "h2" | "h3";
}) {
  return (
    <As
      className={cn(
        "block text-[13px] font-extrabold text-text-muted",
        className,
      )}
    >
      {children}
    </As>
  );
}

const fieldBase =
  "w-full rounded-xl bg-surface px-3.5 py-2.5 text-[17px] font-semibold text-text " +
  "placeholder:font-semibold placeholder:text-text-muted/70 " +
  "border border-transparent transition-colors " +
  "focus:border-accent focus:bg-surface-high focus:outline-none";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

/** Grows with its content so long answers do not get a scrollbar. */
export function Textarea({
  className,
  value,
  minRows = 2,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={cn(fieldBase, "resize-none leading-relaxed", className)}
      {...props}
    />
  );
}

/**
 * One step of the causal chain in an editing context.
 *
 * The question is the label, so the form reads as a sequence of questions
 * rather than a database row.
 */
export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label as="label">{label}</Label>
      {hint && (
        <p className="text-[14px] font-semibold leading-snug text-text-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}
