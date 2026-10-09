"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page header.
 *
 * An eyebrow for context, a title at a restrained size, and room for one
 * action. No hero sections: the first real content should be visible without
 * scrolling on a phone.
 */
export function PageHeader({
  eyebrow,
  title,
  action,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  /** A metric strip or similar, directly under the title. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    // The shell already holds the gap below the status bar, so the header only
    // owns the space under itself.
    <header className={cn("pb-5 md:pb-6", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[13px] font-extrabold text-text-muted break-words">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-[30px] leading-[1.1] font-black tracking-[-0.025em] break-words md:text-[34px]">
            {title}
          </h1>
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}
