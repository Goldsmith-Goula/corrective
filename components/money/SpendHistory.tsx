"use client";

import { AnimatePresence, motion } from "motion/react";
import { Link2, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatRelativeDay, timeOf } from "@/lib/date";
import { formatValue } from "@/lib/metric";
import { springSoft } from "@/lib/motion";
import { groupByDay, type Spend } from "@/lib/budget";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Spend history, grouped by day.
 *
 * Rows follow the reference app: the amount leads at display size, the tag
 * sits under it in muted text, the time is right-aligned, and the day closes
 * with its own total. No cards and no dividers — the grouping is done with
 * space, which is what keeps a long list calm.
 *
 * Rows that came from executing a correction are marked and link back to it;
 * they cannot be deleted here, because the execution owns them.
 */
export function SpendHistory({
  spends,
  currency,
}: {
  spends: Spend[];
  currency: string;
}) {
  const removeSpend = useStore((s) => s.removeSpend);
  const days = groupByDay(spends);

  const money = (n: number) =>
    formatValue(n, { unit: currency, currency, direction: "below" });

  if (!days.length) {
    return (
      <p className="px-1 py-8 text-center text-[16px] font-semibold text-text-muted">
        Nothing recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {days.map((day) => (
        <section key={day.date}>
          <h3 className="px-1 text-[15px] font-bold text-text-muted">
            {formatRelativeDay(day.date)}
          </h3>

          <ul className="mt-2">
            <AnimatePresence initial={false}>
              {day.items.map((spend) => (
                <motion.li
                  key={spend.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springSoft}
                  className="group overflow-hidden"
                >
                  <div className="flex items-start gap-3 px-1 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="tnum text-[26px] leading-none font-black tracking-[-0.02em]">
                        {money(spend.amount)}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[16px] font-semibold text-text-muted">
                        {spend.correctionId && (
                          <Link2
                            size={14}
                            strokeWidth={2.75}
                            className="shrink-0 text-accent"
                            aria-label="From a correction"
                          />
                        )}
                        <span className="truncate">
                          {spend.tag ?? "No tag"}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 pt-1">
                      <span className="tnum text-[15px] font-bold text-text-muted">
                        {timeOf(spend.at)}
                      </span>
                      {spend.correctionId ? (
                        <Link
                          href={`/corrections/${spend.correctionId}`}
                          aria-label="Open the correction"
                          className="grid size-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface hover:text-accent"
                        >
                          <Link2 size={15} strokeWidth={2.5} />
                        </Link>
                      ) : (
                        <button
                          onClick={() => removeSpend(spend.id)}
                          aria-label="Delete this spend"
                          className={cn(
                            "grid size-9 place-items-center rounded-full text-text-muted transition-colors",
                            "hover:bg-error-soft hover:text-error",
                          )}
                        >
                          <Trash2 size={15} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <p className="tnum mt-1 px-1 text-right text-[15px] font-bold text-text-muted">
            Day total: <span className="text-text-secondary">{money(day.total)}</span>
          </p>
        </section>
      ))}
    </div>
  );
}
