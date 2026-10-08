"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { springSnap, tapScale } from "@/lib/motion";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./button-classes";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square, for icon-only controls. Supply an aria-label alongside. */
  icon?: boolean;
  /** Fills the width of its container. */
  block?: boolean;
  children?: ReactNode;
}

/**
 * The only button in the app.
 *
 * Every control routes through here so that press feedback, disabled
 * behaviour, radius and type scale are decided once. Screens pick a variant
 * and a size; they do not restate the styling.
 */
export function Button({
  variant = "tonal",
  size = "md",
  icon = false,
  block = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={props.disabled ? undefined : tapScale}
      transition={springSnap}
      className={buttonClasses({ variant, size, icon, block, className })}
      {...props}
    >
      {children}
    </motion.button>
  );
}
