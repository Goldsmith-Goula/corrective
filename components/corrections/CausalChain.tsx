"use client";

import { motion } from "motion/react";
import { listItem, springSoft } from "@/lib/motion";
import type { Correction } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Node {
  label: string;
  text: string;
  /** The correction is the pivot: everything above it is the failure. */
  pivot?: boolean;
  empty?: string;
}

/**
 * Problem, cause, cost, correction — read as one chain.
 *
 * The connector is continuous and the nodes sit on it, so the causality is
 * carried by the layout rather than stated in a heading. The correction is the
 * only accented node because it is the only line in the record that describes
 * something the user is supposed to do.
 */
export function CausalChain({ correction }: { correction: Correction }) {
  const nodes: Node[] = [
    {
      label: "Problem",
      text: correction.problem,
      empty: "No problem recorded.",
    },
    {
      label: "Cause",
      text: correction.cause,
      empty: "Cause not identified yet.",
    },
    {
      label: "Cost",
      text: correction.cost,
      empty: "No cost recorded.",
    },
    {
      label: "Correction",
      text: correction.correction,
      pivot: true,
      empty: "No corrective behaviour defined.",
    },
  ];

  return (
    <ol className="relative">
      {nodes.map((node, i) => {
        const last = i === nodes.length - 1;
        const filled = Boolean(node.text?.trim());
        return (
          <motion.li
            key={node.label}
            {...listItem}
            transition={{ ...springSoft, delay: i * 0.035 }}
            className="relative flex gap-3.5 pb-5 last:pb-0"
          >
            {/* The spine */}
            {!last && (
              <span
                className="absolute top-5 bottom-0 left-[7px] w-px bg-border"
                aria-hidden
              />
            )}

            <span
              className={cn(
                "relative z-10 mt-[5px] size-[15px] shrink-0 rounded-full border-2 bg-bg",
                node.pivot
                  ? "border-accent bg-accent"
                  : filled
                    ? "border-border-strong"
                    : "border-border",
              )}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[13px] font-extrabold",
                  node.pivot ? "text-accent" : "text-text-muted",
                )}
              >
                {node.label}
              </p>
              <p
                className={cn(
                  "mt-1 leading-relaxed",
                  node.pivot
                    ? "text-[18px] font-extrabold tracking-[-0.01em] text-text"
                    : "text-[16px] font-semibold text-text-secondary",
                  !filled && "text-text-muted/80 italic",
                )}
              >
                {filled ? node.text : node.empty}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
