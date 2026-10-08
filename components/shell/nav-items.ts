import { ChartNoAxesColumn, ListChecks, Sun, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Four destinations, and nothing for features that do not exist.
 *
 * There is no Schedule tab. It showed the same data as Today at a different
 * zoom, which made the app feel bigger than it is; the day view and its
 * drag-to-retime now live inside Today, where the day already was.
 *
 * The order is the loop: what is due now, what the corrections are, what the
 * behaviour has cost, and whether any of it worked.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/corrections", label: "Corrections", icon: ListChecks },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/review", label: "Review", icon: ChartNoAxesColumn },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
