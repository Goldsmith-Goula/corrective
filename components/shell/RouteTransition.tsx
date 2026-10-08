"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { fade } from "@/lib/motion";

/**
 * Cross-fades between screens.
 *
 * Keyed on the path so each screen animates in as its own object rather than
 * the content swapping underneath a static frame. The movement is small and
 * quick: enough to say "this is a different place", not enough to wait for.
 *
 * Isolated in its own file because reading the path is what forces a Suspense
 * boundary, and that boundary should contain as little as possible.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={fade}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
