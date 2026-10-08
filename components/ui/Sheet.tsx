"use client";

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyLock, useEscape, useIsClient, useIsDesktop } from "@/lib/hooks";
import { fade, springSheet } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/**
 * One presentation primitive for every secondary surface.
 *
 * On a phone it is a bottom sheet that can be thrown downward to dismiss; on a
 * wider screen the same content becomes a centred dialog. Both are driven by
 * the same spring so the product only has one way of showing a second layer.
 */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Sits under the title, for the object the sheet is acting on. */
  subtitle?: string;
  children: ReactNode;
  /** Pinned to the bottom edge, outside the scrolling area. */
  footer?: ReactNode;
  /** Suppresses the close button and the drag-to-dismiss affordance. */
  dismissible?: boolean;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissible = true,
  className,
}: SheetProps) {
  const desktop = useIsDesktop();
  const mounted = useIsClient();

  useBodyLock(open);
  useEscape(open && dismissible, onClose);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    // Either a decisive flick or a long drag closes it.
    if (info.offset.y > 120 || info.velocity.y > 520) onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-[rgb(var(--scrim)/0.46)] backdrop-blur-[2px]"
          />

          <motion.div
            initial={desktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.98, y: 8 } : { y: "100%" }}
            transition={springSheet}
            drag={!desktop && dismissible ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={onDragEnd}
            className={cn(
              "relative flex max-h-[90dvh] w-full flex-col bg-elevated",
              "rounded-t-[28px] md:max-w-lg md:rounded-[28px]",
              "border border-border md:border",
              className,
            )}
          >
            {/* Drag handle — the sheet's only ornament, and it is functional. */}
            {!desktop && dismissible && (
              <div className="flex shrink-0 justify-center pt-2.5 pb-1">
                <div className="h-1 w-9 rounded-full bg-border-strong" />
              </div>
            )}

            {(title || dismissible) && (
              <div className="flex shrink-0 items-start gap-3 px-5 pt-3 pb-2 md:pt-5">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-[22px] leading-tight font-extrabold tracking-[-0.01em]">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="mt-0.5 truncate text-[15px] font-semibold text-text-muted">
                      {subtitle}
                    </p>
                  )}
                </div>
                {dismissible && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-high hover:text-text"
                  >
                    <X size={17} strokeWidth={2.75} />
                  </button>
                )}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-border bg-elevated px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:rounded-b-[28px]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * A short, decisive confirmation.
 *
 * Kept separate from Sheet because it must not be dismissible by dragging —
 * destructive answers should cost a deliberate tap.
 */
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  destructive = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} className="md:max-w-sm">
      {body && (
        <p className="text-[16px] leading-relaxed font-semibold text-text-secondary">
          {body}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <Button size="lg" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          size="lg"
          variant={destructive ? "destructive" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
