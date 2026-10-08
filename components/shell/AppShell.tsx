"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QuickCapture } from "@/components/capture/QuickCapture";
import { useHydrated } from "@/lib/hooks";
import { springSnap } from "@/lib/motion";
import { BottomNavigation } from "./BottomNavigation";
import { RouteTransition } from "./RouteTransition";
import { Sidebar } from "./Sidebar";
import { useApplyTheme } from "./ThemeToggle";

/**
 * The application frame.
 *
 * Owns the two navigation treatments, the capture action, theme application
 * and the one-time store hydration. Screens below it can assume data is ready.
 *
 * Note the absence of Suspense boundaries around the routed children. An
 * earlier version wrapped them with `fallback={children}` so that
 * `usePathname()` satisfied prerendering under `cacheComponents`. That config
 * is off now, and the boundary was actively harmful: when a navigation
 * suspended, the fallback suspended with it, so the page rendered nothing
 * until a manual refresh.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const onMoney = pathname.startsWith("/money");
  const [capturing, setCapturing] = useState(false);

  useApplyTheme();

  const openCapture = useCallback(() => setCapturing(true), []);

  // Desktop keyboard affordance: "c" captures from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setCapturing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar onCapture={openCapture} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-lg flex-1 px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-44 md:max-w-3xl md:px-8 md:pb-14 lg:max-w-4xl">
          {/* Held back until localStorage has been read. The alternative is
              to render seed data and replace it a frame later, and the day
              boundary depends on the viewer's timezone in any case. */}
          {hydrated ? <RouteTransition>{children}</RouteTransition> : <BootSkeleton />}
        </main>
      </div>

      {/* Mobile capture.
          It used to be a bare "+", which on the Money screen read as "add a
          spend" and then opened "What went wrong?". A labelled pill says what
          it does, and it is hidden on Money, where capturing a problem is not
          the action anyone is reaching for. */}
      {!onMoney && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={springSnap}
          onClick={openCapture}
          className="fixed right-5 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex h-13 items-center gap-2 rounded-full bg-accent pr-5 pl-4 text-[18px] font-extrabold text-accent-fg md:hidden"
          style={{ height: 52 }}
        >
          <Plus size={20} strokeWidth={3} />
          Capture
        </motion.button>
      )}

      <BottomNavigation />

      <QuickCapture open={capturing} onClose={() => setCapturing(false)} />
    </div>
  );
}

/** Shown for the single frame before localStorage has been read. */
function BootSkeleton() {
  return (
    <div className="animate-pulse space-y-3 pt-12" aria-hidden>
      <div className="h-3 w-24 rounded-full bg-surface-high" />
      <div className="h-8 w-52 rounded-lg bg-surface-high" />
      <div className="h-20 rounded-2xl bg-surface" />
      <div className="h-20 rounded-2xl bg-surface" />
      <div className="h-20 rounded-2xl bg-surface" />
    </div>
  );
}
