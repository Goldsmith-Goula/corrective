"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { motion } from "motion/react";
import { spring } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

/**
 * Applies the stored theme to the document.
 *
 * `system` clears the attribute entirely so the CSS media query takes over,
 * which keeps the two schemes defined in one place.
 */
export function useApplyTheme() {
  const theme = useStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <div
      role="group"
      aria-label="Colour scheme"
      className={cn("flex gap-1 rounded-full bg-surface p-1", className)}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            aria-pressed={active}
            title={opt.label}
            className={cn(
              "relative grid h-7 flex-1 place-items-center rounded-full transition-colors duration-150",
              active ? "text-accent-fg" : "text-text-muted hover:text-text",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-pill"
                transition={spring}
                className="absolute inset-0 rounded-full bg-accent"
              />
            )}
            <Icon size={14} strokeWidth={2.75} className="relative z-10" />
            <span className="sr-only">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
