"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The empty state.
 *
 * No illustration and no encouragement — a line that says what is missing and,
 * where there is one, the action that fills it.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <Icon
          size={20}
          strokeWidth={2.25}
          className="mb-3 text-text-muted"
          aria-hidden
        />
      )}
      <p className="text-[17px] font-extrabold text-text">{title}</p>
      {body && (
        <p className="mt-1 max-w-md text-[15px] font-semibold leading-relaxed text-text-muted break-words">
          {body}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
