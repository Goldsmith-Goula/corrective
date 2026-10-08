"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Tag, X } from "lucide-react";
import { useState } from "react";
import { Keypad, applyKey } from "@/components/ui/Keypad";
import { spring, springSnap } from "@/lib/motion";
import type { Budget } from "@/lib/budget";
import { cn } from "@/lib/utils";

/** Offered first; anything typed into "Other" joins the list for next time. */
const DEFAULT_TAGS = [
  "Groceries",
  "Coffee",
  "Lunch",
  "Transport",
  "Household",
];

function symbolFor(currency: string) {
  try {
    return (
      new Intl.NumberFormat(undefined, { style: "currency", currency })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function group(raw: string) {
  const [whole, fraction] = raw.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/**
 * The spend editor.
 *
 * The number is the screen, as in the reference app: oversized, tabular, and
 * animated per character so typing reads as moving a counter rather than
 * filling a field. Everything else — the tag row, the commit key — is sized
 * to be reachable with a thumb while the figure stays legible above it.
 */
export function SpendEditor({
  budget,
  knownTags,
  onCommit,
}: {
  budget: Budget;
  /** Tags already used in this budget, offered before the defaults. */
  knownTags: string[];
  onCommit: (amount: number, tag?: string) => void;
}) {
  const [entry, setEntry] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const symbol = symbolFor(budget.currency);
  const parsed = entry === "" ? 0 : Number(entry);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const shown = entry === "" ? "0" : group(entry);

  const tags = [
    ...new Set([...(tag ? [tag] : []), ...knownTags, ...DEFAULT_TAGS]),
  ].slice(0, 12);

  const commit = () => {
    if (!valid) return;
    onCommit(parsed, tag ?? undefined);
    setEntry("");
    setTag(null);
  };

  return (
    // The pad is a thumb control. Left to itself it stretches to the full
    // content column on a desktop, which turned the keys into dinner plates.
    <div className="flex w-full max-w-[380px] flex-col gap-4">
      {/* ------------------------------------------------------ the figure */}
      <div className="flex min-h-[128px] flex-1 items-center justify-end gap-1.5 px-1">
        <span
          className={cn(
            "font-black",
            shown.length > 6 ? "text-[28px]" : "text-[36px]",
            valid ? "text-text" : "text-text-muted/35",
          )}
        >
          {symbol}
        </span>
        <span className="tnum flex items-baseline">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.split("").map((char, i) => (
              <motion.span
                key={`${i}-${char}`}
                layout
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={springSnap}
                className={cn(
                  "leading-none font-black tracking-[-0.045em]",
                  // Steps down only when the number would otherwise overflow.
                  shown.length > 8
                    ? "text-[48px]"
                    : shown.length > 6
                      ? "text-[62px]"
                      : "text-[84px]",
                  valid ? "text-text" : "text-text-muted/35",
                )}
              >
                {char}
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
      </div>

      {/* --------------------------------------------------------- the tag */}
      {customOpen ? (
        // Naming a new category happens in place. Sending the user to a sheet
        // to type one word, mid-entry, would lose the amount they are part
        // way through.
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = custom.trim();
            if (!name) return;
            setTag(name);
            setCustom("");
            setCustomOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onBlur={() => !custom.trim() && setCustomOpen(false)}
            placeholder="Toys, Rent, Petrol…"
            maxLength={24}
            aria-label="New category"
            className="h-11 min-w-0 flex-1 rounded-full bg-surface px-4 text-[16px] font-extrabold text-text placeholder:font-semibold placeholder:text-text-muted/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!custom.trim()}
            aria-label="Use this category"
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full transition-colors",
              custom.trim()
                ? "bg-accent text-accent-fg"
                : "bg-surface text-text-muted/40",
            )}
          >
            <Check size={19} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={() => {
              setCustom("");
              setCustomOpen(false);
            }}
            aria-label="Cancel"
            className="grid size-11 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface"
          >
            <X size={19} strokeWidth={2.75} />
          </button>
        </form>
      ) : (
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={spring}
          onClick={() => setCustomOpen(true)}
          aria-label="New category"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 text-[16px] font-extrabold text-accent transition-colors hover:bg-surface-high"
        >
          <Tag size={16} strokeWidth={2.75} />
          New
        </motion.button>
        {tags.map((t) => {
          const active = tag === t;
          return (
            <motion.button
              key={t}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setTag(active ? null : t)}
              aria-pressed={active}
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-[16px] font-extrabold transition-colors",
                active
                  ? "bg-accent text-accent-fg"
                  : "bg-surface text-text-secondary hover:bg-surface-high",
              )}
            >
              {t}
            </motion.button>
          );
        })}
      </div>
      )}

      {/* ------------------------------------------------------ the keypad */}
      <Keypad
        size="lg"
        onKey={(key) => setEntry((v) => applyKey(v, key))}
        commit={
          <motion.button
            type="button"
            whileTap={valid ? { scale: 0.96 } : undefined}
            transition={springSnap}
            onClick={commit}
            disabled={!valid}
            aria-label="Add spend"
            className={cn(
              "grid h-full w-full place-items-center rounded-2xl transition-colors",
              valid
                ? "bg-accent text-accent-fg"
                : "bg-surface text-text-muted/35",
            )}
          >
            {valid ? (
              <Check size={26} strokeWidth={3} />
            ) : (
              <Plus size={24} strokeWidth={3} />
            )}
          </motion.button>
        }
      />
    </div>
  );
}
