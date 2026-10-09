"use client";

import { AnimatePresence, motion } from "motion/react";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { CorrectionCard } from "@/components/corrections/CorrectionCard";
import { CorrectionEditor } from "@/components/corrections/CorrectionEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { Section } from "@/components/ui/Surface";
import { formatRelativeDay } from "@/lib/date";
import { listItem, springSoft } from "@/lib/motion";
import { statsFor } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Capture, CorrectionStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const FILTERS = [
  { value: "live", label: "Live" },
  { value: "settled", label: "Settled" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

const LIVE: CorrectionStatus[] = ["testing", "active", "improved"];

/**
 * Corrections.
 *
 * Two things live here: the capture inbox, which is unprocessed raw material,
 * and the corrections themselves. The inbox sits on top because an unstructured
 * note is the one thing in the product that is genuinely waiting on the user.
 */
export default function CorrectionsPage() {
  const state = useStore();
  const [filter, setFilter] = useState<Filter>("live");
  const [editing, setEditing] = useState(false);
  const [fromCapture, setFromCapture] = useState<Capture | null>(null);

  const convertCapture = useStore((s) => s.convertCapture);
  const removeCapture = useStore((s) => s.removeCapture);

  const inbox = state.captures.filter((c) => !c.convertedTo);
  const live = state.corrections.filter((c) => LIVE.includes(c.status)).length;

  const rows = useMemo(() => {
    const all = state.corrections.map((c) => ({
      stats: statsFor(c, state.executions, state.schedules, state.reviews),
      executions: state.executions
        .filter((e) => e.correctionId === c.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
      label: state.schedules.find((s) => s.correctionId === c.id)?.label,
    }));

    const filtered = all.filter(({ stats }) =>
      filter === "all"
        ? true
        : filter === "live"
          ? LIVE.includes(stats.correction.status)
          : !LIVE.includes(stats.correction.status),
    );

    // Whatever is due soonest comes first; unscheduled corrections sink.
    return filtered.sort((a, b) => {
      if (!a.stats.next && !b.stats.next) return 0;
      if (!a.stats.next) return 1;
      if (!b.stats.next) return -1;
      return (
        a.stats.next.date.localeCompare(b.stats.next.date) ||
        a.stats.next.time.localeCompare(b.stats.next.time)
      );
    });
  }, [state.corrections, state.executions, state.schedules, state.reviews, filter]);

  return (
    <>
      <PageHeader
        title="Corrections"
        eyebrow={`${live} live · ${state.corrections.length - live} settled`}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFromCapture(null);
              setEditing(true);
            }}
          >
            <Plus size={15} strokeWidth={3} />
            New
          </Button>
        }
      >
        <Segmented
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filter corrections"
        />
      </PageHeader>

      <div className="space-y-6 pb-4">
        {inbox.length > 0 && (
          <Section label="Unstructured — captured, not yet corrected">
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {inbox.map((capture) => (
                  <motion.li
                    key={capture.id}
                    layout
                    {...listItem}
                    transition={springSoft}
                    className="rounded-2xl border border-dashed border-border px-3.5 py-3"
                  >
                    <p className="text-[16px] leading-snug font-bold text-text break-words">
                      {capture.text}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="flex-1 text-[13px] font-bold text-text-muted">
                        {formatRelativeDay(capture.createdAt.slice(0, 10))}
                      </span>
                      <Button
                        variant="ghostDanger"
                        size="xs"
                        icon
                        onClick={() => removeCapture(capture.id)}
                        aria-label="Discard"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => {
                          setFromCapture(capture);
                          setEditing(true);
                        }}
                      >
                        Structure it
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </Section>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={
              filter === "settled"
                ? "Nothing settled yet"
                : "No corrections here"
            }
            body={
              filter === "settled"
                ? "Corrections appear here once they are solved or abandoned."
                : "Start from a problem you have actually had, not one you expect to have."
            }
            action={
              filter !== "settled" && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setFromCapture(null);
                    setEditing(true);
                  }}
                >
                  <Plus size={15} strokeWidth={3} />
                  New correction
                </Button>
              )
            }
          />
        ) : (
          <motion.ul layout transition={springSoft} className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map((row) => (
                <CorrectionCard
                  key={row.stats.correction.id}
                  stats={row.stats}
                  executions={row.executions}
                  label={row.label}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      <CorrectionEditor
        open={editing}
        onClose={() => setEditing(false)}
        initialProblem={fromCapture?.text}
        onSaved={(id) => {
          // Mark the capture as processed so it leaves the inbox but stays
          // traceable to what it became.
          if (fromCapture) convertCapture(fromCapture.id, id);
          setFromCapture(null);
        }}
      />
    </>
  );
}
