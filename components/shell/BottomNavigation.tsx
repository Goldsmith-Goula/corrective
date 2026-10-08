"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * The mobile navigation bar.
 *
 * The active item is marked by a pill that slides between destinations, so
 * switching tabs reads as movement along a row rather than four independent
 * highlights blinking on and off.
 *
 * Split in two: the bar itself takes the path as a prop so it can be
 * prerendered with no active item, and the wrapper below supplies the real
 * path once the route is known on the client.
 */
export function BottomNavigationBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 md:hidden",
        "border-t border-border bg-bg/85 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = pathname !== null && isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 pt-2.5 pb-2"
              >
                <span className="relative grid h-7 w-14 place-items-center">
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={spring}
                      className="absolute inset-0 rounded-full bg-accent-soft"
                    />
                  )}
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.75 : 2.25}
                    className={cn(
                      "relative z-10 transition-colors duration-150",
                      active ? "text-accent-on-soft" : "text-text-muted",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "text-[13px] font-extrabold tracking-[0.01em] transition-colors duration-150",
                    active ? "text-text" : "text-text-muted",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNavigation() {
  return <BottomNavigationBar pathname={usePathname()} />;
}
