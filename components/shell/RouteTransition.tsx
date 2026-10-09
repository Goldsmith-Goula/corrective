"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { fade } from "@/lib/motion";

/**
 * Cross-fades between screens.
 *
 * Rendered without AnimatePresence mode="wait" to avoid blocking Next.js App Router
 * child mounting during client-side transitions.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fade}
    >
      {children}
    </motion.div>
  );
}
