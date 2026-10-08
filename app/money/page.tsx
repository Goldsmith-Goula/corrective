"use client";

import { AnimatePresence, motion } from "motion/react";
import { History, PieChart, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BudgetSetup } from "@/components/money/BudgetSetup";
import { BudgetSheet } from "@/components/money/BudgetSheet";
import { RestBudgetPill } from "@/components/money/RestBudgetPill";
import { SpendEditor } from "@/components/money/SpendEditor";
import { SpendHistory } from "@/components/money/SpendHistory";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { budgetState, spendsFromCorrections } from "@/lib/budget";
import { formatValue } from "@/lib/metric";
import { springSoft } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Money.
 *
 * The daily-budget model from Buckwheat rather than a report: a budget is an
 * amount and an end date, each day gets a share of what remains, and the
 * screen's job is to answer "what can I spend today" before anything else.
 *
 * It is linked to the rest of the app rather than parallel to it. Any
 * correction measured in this budget's currency contributes its recorded
 * figures as spends — derived, not copied, so completing or undoing an action
 * on Today moves the budget with no second entry anywhere.
 */
export default function MoneyPage() {
  const state = useStore();
  const addSpend = useStore((s) => s.addSpend);
  const rollBudget = useStore((s) => s.rollBudget);
  const distributeRest = useStore((s) => s.distributeRest);

  const [setupOpen, setSetupOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Spends the user typed, plus the ones their corrections produced.
  const allSpends = useMemo(() => {
    if (!state.budget) return [];
    return [
      ...state.spends,
      ...spendsFromCorrections(
        state.corrections,
        state.executions,
        state.budget.currency,
      ),
    ];
  }, [state.spends, state.corrections, state.executions, state.budget]);

  // Move the budget onto today if it is still sitting on an earlier one.
  useEffect(() => {
    if (state.budget) rollBudget(allSpends);
  }, [state.budget, allSpends, rollBudget]);

  const view = useMemo(
    () => (state.budget ? budgetState(state.budget, allSpends) : null),
    [state.budget, allSpends],
  );

  const knownTags = useMemo(
    () =>
      [...new Set(state.spends.map((s) => s.tag).filter(Boolean))] as string[],
    [state.spends],
  );

  if (!state.budget || !view) {
    return (
      <>
        <div>
          <EmptyState
            icon={Wallet}
            title="No budget running"
            body="Set an amount and an end date. Corrective works out what you can spend each day, and carries forward what you do not."
            action={
              <Button variant="primary" onClick={() => setSetupOpen(true)}>
                Start a budget
              </Button>
            }
          />
        </div>
        <BudgetSetup open={setupOpen} onClose={() => setSetupOpen(false)} />
      </>
    );
  }

  const money = (n: number) =>
    formatValue(n, {
      unit: view.budget.currency,
      currency: view.budget.currency,
      direction: "below",
    });

  const fromCorrections = allSpends.filter((s) => s.correctionId);

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBudgetOpen(true)}
            className="min-w-0 flex-1 text-left"
            aria-label="Open budget summary"
          >
            <RestBudgetPill state={view} />
          </button>
          <Button
            variant="ghost"
            size="lg"
            icon
            onClick={() => setHistoryOpen(true)}
            aria-label="Spend history"
          >
            <History size={20} strokeWidth={2.5} />
          </Button>
        </div>

        <SpendEditor
          budget={view.budget}
          knownTags={knownTags}
          onCommit={(amount, tag) => addSpend({ amount, tag })}
        />

        {/* The link back to the rest of the app, stated as a fact rather than
            as an advert for a feature. */}
        {fromCorrections.length > 0 && (
          <Link
            href="/corrections"
            className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5"
          >
            <PieChart
              size={18}
              strokeWidth={2.5}
              className="shrink-0 text-accent"
            />
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-text-secondary">
              {money(fromCorrections.reduce((n, s) => n + s.amount, 0))} of this
              came from corrections you measure in {view.budget.currency}.
            </span>
          </Link>
        )}
      </div>

      {/* ----------------------------------------------- left-over decision */}
      <AnimatePresence>
        {state.pendingRest !== null && state.pendingRest > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={springSoft}
            className={cn(
              "fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40",
              "rounded-[28px] border border-border bg-elevated p-4 md:inset-x-auto md:right-8 md:w-96",
            )}
          >
            <p className="text-[17px] font-extrabold">
              {money(state.pendingRest)} left from yesterday
            </p>
            <p className="mt-1 text-[15px] leading-snug font-semibold text-text-muted">
              Where should it go?
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="md"
                className="flex-1"
                onClick={() => distributeRest("rest", allSpends)}
              >
                Spread it
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => distributeRest("addToday", allSpends)}
              >
                Add to today
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BudgetSheet
        state={view}
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
      />

      <Sheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="History"
        subtitle={`${money(view.spentBefore + view.spentToday)} spent this period`}
      >
        <SpendHistory spends={view.spends} currency={view.budget.currency} />
      </Sheet>

      <BudgetSetup open={setupOpen} onClose={() => setSetupOpen(false)} />
    </>
  );
}
