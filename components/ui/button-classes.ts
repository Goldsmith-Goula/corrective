import { cn } from "@/lib/utils";

/**
 * Button styling, kept out of any client boundary.
 *
 * `buttonClasses` is a pure string builder, so it lives in its own module and
 * can be used by server components (the offline page) and by links that must
 * stay anchors, as well as by the Button component itself.
 */
export type ButtonVariant =
  | "primary"
  | "tonal"
  | "ghost"
  | "outline"
  | "destructive"
  | "ghostDanger";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  // The one loud control on a screen. Pill-shaped, like Buckwheat's commit button.
  primary:
    "bg-accent text-accent-fg transition-[filter] hover:brightness-[1.06] active:brightness-95",
  // The workhorse: a surface blended toward the background, not a stacked card.
  tonal: "bg-surface-high transition-colors hover:bg-border/70",
  ghost:
    "text-text-muted transition-colors hover:bg-surface-high hover:text-text",
  outline:
    "border border-border-strong transition-colors hover:bg-surface-high",
  destructive: "bg-error text-bg transition-[filter] hover:brightness-110",
  // Quiet until hovered, then clearly dangerous. For delete affordances that
  // should not shout from a toolbar.
  ghostDanger:
    "text-text-muted transition-colors hover:bg-error-soft hover:text-error",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-8 px-3 text-[14px] gap-1.5",
  sm: "h-9 px-3.5 text-[15px] gap-1.5",
  md: "h-10 px-4 text-[16px] gap-2",
  lg: "h-11 px-5 text-[17px] gap-2",
};

const ICON_SIZES: Record<ButtonSize, string> = {
  xs: "size-8 px-0",
  sm: "size-9 px-0",
  md: "size-10 px-0",
  lg: "size-11 px-0",
};

/**
 * The same styling, for elements that are semantically links.
 *
 * A link that navigates must stay an anchor for middle-click, copy-link and
 * keyboard behaviour, so it borrows the classes rather than the component.
 */
export function buttonClasses({
  variant = "tonal",
  size = "md",
  icon = false,
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: boolean;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center rounded-full font-extrabold",
    "disabled:pointer-events-none disabled:opacity-40",
    icon ? ICON_SIZES[size] : SIZES[size],
    VARIANTS[variant],
    block && "w-full",
    className,
  );
}
