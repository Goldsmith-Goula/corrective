"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Confirm, Sheet } from "@/components/ui/Sheet";
import { Label } from "@/components/ui/Field";
import { formatValue } from "@/lib/metric";
import { spring } from "@/lib/motion";
import {
  REST_METHOD_HINT,
  REST_METHOD_LABEL,
  type BudgetState,
  type RestMethod,
} from "@/lib/budget";
import { formatDayShortish } from "@/lib/date";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const METHODS: RestMethod[] = ["rest", "addToday", "ask"];

/**
 * The budget summary.
 *
 * Three facts, each as a big number with a quiet caption underneath: what is
 * left, what it started as, and how long there is to go. The reference app
 * puts the proportion into the card's own background rather than adding a
 * separate progress bar, which is why the "left" card fills.
 */
export function BudgetSheet({
  state,
  open,
  onClose,
}: {
  state: BudgetState;
  open: boolean;
  onClose: () => void;
}) {
  const setRestMethod = useStore((s) => s.setRestMethod);
  const finishBudget = useStore((s) => s.finishBudget);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const { budget, budgetRest, restDays, totalDays, restFraction } = state;
  const money = (n: number) =>
    formatValue(n, {
      unit: budget.currency,
      currency: budget.currency,
      direction: "below",
    });

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Budget">
        <div className="space-y-3">
          {/* What is left, with the proportion carried by the fill. */}
          <div className="relative overflow-hidden rounded-[28px] bg-success-soft/45">
            <motion.div
              className="absolute inset-y-0 left-0 bg-success-soft"
              initial={false}
              animate={{ width: `${restFraction * 100}%` }}
              transition={spring}
              aria-hidden
            />
            <div className="relative px-5 py-7 text-center">
              <p className="tnum text-[40px] leading-none font-black tracking-[-0.03em]">
                {money(Math.max(0, budgetRest))}
              </p>
              <p className="mt-2 text-[16px] font-bold text-text-secondary">
                Left
              </p>
              <p className="mt-3 text-[14px] font-bold text-text-muted">
                {Math.round(restFraction * 100)}% of the budget
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="rounded-[28px] bg-accent-soft px-5 py-5">
              <p className="tnum text-[26px] leading-none font-black tracking-[-0.02em] text-accent-on-soft">
                {money(budget.amount)}
              </p>
              <p className="mt-1.5 text-[15px] font-bold text-accent-on-soft/75">
                Starting budget
              </p>
              <div className="mt-4 flex items-center gap-2 text-[14px] font-extrabold text-accent-on-soft/80">
                <span>{formatDayShortish(budget.startDate)}</span>
                <span className="h-px flex-1 bg-accent-on-soft/30" />
                <span>{formatDayShortish(budget.endDate)}</span>
              </div>
            </div>

            <div className="grid w-[112px] place-items-center rounded-[28px] bg-surface px-3 py-5 text-center">
              <div>
                <p className="tnum text-[30px] leading-none font-black tracking-[-0.02em]">
                  {restDays}
                </p>
                <p className="mt-1.5 text-[14px] font-bold text-text-muted">
                  {restDays === 1 ? "day left" : "days left"}
                </p>
                <p className="tnum mt-2 text-[13px] font-bold text-text-muted">
                  of {totalDays}
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------- left-over handling */}
          <div className="pt-3">
            <Label>When a day ends with money left</Label>
            <div className="mt-2 space-y-1.5">
              {METHODS.map((method) => {
                const active = budget.restMethod === method;
                return (
                  <button
                    key={method}
                    onClick={() => setRestMethod(method)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl p-3.5 text-left transition-colors",
                      active ? "bg-surface-high" : "hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                        active ? "border-accent" : "border-border-strong",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="rest-method-dot"
                          transition={spring}
                          className="size-2.5 rounded-full bg-accent"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-extrabold">
                        {REST_METHOD_LABEL[method]}
                      </span>
                      <span className="mt-0.5 block text-[14px] leading-snug font-semibold text-text-muted">
                        {REST_METHOD_HINT[method]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="ghostDanger"
              size="md"
              block
              onClick={() => setConfirmFinish(true)}
            >
              Finish this budget
            </Button>
          </div>
        </div>
      </Sheet>

      <Confirm
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        onConfirm={() => {
          finishBudget();
          onClose();
        }}
        title="Finish this budget?"
        body="The budget and the spends entered against it are cleared. Figures recorded through a correction stay in that correction's history."
        confirmLabel="Finish"
        destructive
      />
    </>
  );
}
