"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The desktop sidebar.
 *
 * Restrained on purpose: a column of four labels, the capture action, and the
 * theme switch. Desktop gets more room for content, not more navigation.
 *
 * Takes the path as a prop so it can be prerendered with no active item; the
 * wrapper below supplies the real path once it is known on the client.
 */
export function SidebarShell({
  onCapture,
  pathname,
}: {
  onCapture: () => void;
  pathname: string | null;
}) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-2.5 pb-5">
        <Mark />
        <span className="text-[17px] font-black tracking-[-0.02em]">
          Corrective
        </span>
      </div>

      <button
        onClick={onCapture}
        className="mb-5 flex h-10 items-center gap-2 rounded-full bg-accent px-3.5 text-[16px] font-extrabold text-accent-fg transition-[filter] hover:brightness-[1.06]"
      >
        <Plus size={16} strokeWidth={3} />
        Capture a problem
        <kbd className="ml-auto rounded bg-black/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">
          C
        </kbd>
      </button>

      <nav aria-label="Primary" className="flex-1">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname !== null && isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-xl px-2.5 text-[16px] font-extrabold transition-colors duration-150",
                    active ? "text-accent-on-soft" : "text-text-muted hover:text-text",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-pill"
                      transition={spring}
                      className="absolute inset-0 rounded-xl bg-accent-soft"
                    />
                  )}
                  <Icon
                    size={17}
                    strokeWidth={active ? 2.75 : 2.25}
                    className="relative z-10"
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border pt-4">
        <p className="px-2.5 text-[13px] font-semibold leading-relaxed text-text-muted">
          Thinking about changing is not changing.
        </p>
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function Sidebar({ onCapture }: { onCapture: () => void }) {
  return <SidebarShell onCapture={onCapture} pathname={usePathname()} />;
}

/**
 * The mark: a line that steps up once.
 *
 * It is the product's whole claim — a measured change in direction — and it
 * doubles as the app icon.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[22px] shrink-0", className)}
      aria-hidden
    >
      <path
        d="M3.5 15.5H10V8.5h5.5"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19.5" cy="8.5" r="2.6" fill="var(--accent)" />
    </svg>
  );
}
