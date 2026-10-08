"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Field";
import { Keypad, applyKey } from "@/components/ui/Keypad";
import { Sheet } from "@/components/ui/Sheet";
import { UNIT_PRESETS } from "@/lib/metric";
import { addDays, dayKey, formatDayShortish } from "@/lib/date";
import { countDays } from "@/lib/budget";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const LENGTHS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
];

const CURRENCIES = UNIT_PRESETS.filter((p) => p.currency).map(
  (p) => p.currency as string,
);

/**
 * Starting a budget.
 *
 * Two decisions and nothing else: how much, and until when. The daily
 * allowance follows from those, which is the whole point of the model — you
 * never set a per-day number by hand.
 */
export function BudgetSetup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const startBudget = useStore((s) => s.startBudget);
  const [entry, setEntry] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [days, setDays] = useState(30);

  const amount = entry === "" ? 0 : Number(entry);
  const valid = Number.isFinite(amount) && amount > 0;
  const endDate = addDays(dayKey(), days - 1);
  const perDay = valid ? amount / countDays(dayKey(), endDate) : 0;

  const symbol = (() => {
    try {
      return (
        new Intl.NumberFormat(undefined, { style: "currency", currency })
          .formatToParts(0)
          .find((p) => p.type === "currency")?.value ?? currency
      );
    } catch {
      return currency;
    }
  })();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Start a budget"
      subtitle="How much, and until when. The daily amount follows."
      footer={
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!valid}
          onClick={() => {
            startBudget({ amount, currency, endDate });
            setEntry("");
            onClose();
          }}
        >
          {valid
            ? `${symbol}${perDay.toFixed(2)} a day`
            : "Enter an amount"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex min-h-[80px] items-center justify-center gap-1.5">
          <span
            className={cn(
              "text-[26px] font-black",
              valid ? "text-text" : "text-text-muted/40",
            )}
          >
            {symbol}
          </span>
          <span
            className={cn(
              "tnum text-[52px] leading-none font-black tracking-[-0.04em]",
              valid ? "text-text" : "text-text-muted/40",
            )}
          >
            {entry === "" ? "0" : entry}
          </span>
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <div className="flex gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                aria-pressed={c === currency}
                className={cn(
                  "h-11 flex-1 rounded-full text-[16px] font-extrabold transition-colors",
                  c === currency
                    ? "bg-accent text-accent-fg"
                    : "bg-surface text-text-muted hover:text-text",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Until</Label>
          <div className="grid grid-cols-4 gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.days}
                onClick={() => setDays(l.days)}
                aria-pressed={l.days === days}
                className={cn(
                  "h-11 rounded-full text-[15px] font-extrabold transition-colors",
                  l.days === days
                    ? "bg-accent text-accent-fg"
                    : "bg-surface text-text-muted hover:text-text",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-2 pt-1 text-[15px] font-bold text-text-muted">
            <Wallet size={15} strokeWidth={2.5} />
            {formatDayShortish(dayKey())} — {formatDayShortish(endDate)}
          </p>
        </div>

        <Keypad onKey={(key) => setEntry((v) => applyKey(v, key))} />
      </div>
    </Sheet>
  );
}
