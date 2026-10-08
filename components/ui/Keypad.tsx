"use client";

import { motion } from "motion/react";
import { Delete } from "lucide-react";
import type { ReactNode } from "react";
import { springSnap } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * The number pad.
 *
 * Shared by the money editor, the budget setup and the execution verdict
 * sheet so the three never drift apart.
 *
 * With `commit` it takes the reference app's layout exactly: one four-column
 * grid of round keys, backspace sitting in the grid at the top right, and the
 * confirm key filling the column beneath it. Round keys matter — stretched
 * rectangles read as a table of buttons, circles read as a keypad.
 */
export function Keypad({
  onKey,
  allowsDecimal = true,
  size = "md",
  commit,
  className,
}: {
  /** A digit, "." or "del". */
  onKey: (key: string) => void;
  allowsDecimal?: boolean;
  size?: "md" | "lg";
  /** The confirm key. Switches the pad to the four-column layout. */
  commit?: ReactNode;
  className?: string;
}) {
  // The large pad makes its keys square, so they come out circular. The small
  // one is used inside sheets where a square key would be far too tall.
  const shape =
    size === "lg" ? "aspect-square rounded-full" : "h-14 rounded-2xl";
  const text = size === "lg" ? "text-[26px]" : "text-[22px]";
  const iconSize = size === "lg" ? 24 : 19;

  const digitKeys = DIGITS.map((key) => (
    <Key key={key} onPress={() => onKey(key)} shape={shape} text={text}>
      {key}
    </Key>
  ));

  const dotKey = (
    <Key
      onPress={() => onKey(".")}
      disabled={!allowsDecimal}
      shape={shape}
      text={text}
    >
      .
    </Key>
  );
  const zeroKey = (
    <Key onPress={() => onKey("0")} shape={shape} text={text}>
      0
    </Key>
  );
  const delKey = (
    <Key onPress={() => onKey("del")} label="Delete" shape={shape} text={text}>
      <Delete size={iconSize} strokeWidth={2.75} />
    </Key>
  );

  if (!commit) {
    return (
      <div className={cn("grid grid-cols-3 gap-2.5", className)}>
        {digitKeys}
        {dotKey}
        {zeroKey}
        {delKey}
      </div>
    );
  }

  // 1 2 3 ⌫
  // 4 5 6 ┐
  // 7 8 9 │ commit
  // . 0   ┘
  return (
    <div className={cn("grid grid-cols-4 gap-2.5", className)}>
      {digitKeys[0]}
      {digitKeys[1]}
      {digitKeys[2]}
      {delKey}

      {digitKeys[3]}
      {digitKeys[4]}
      {digitKeys[5]}
      <div className="row-span-3">{commit}</div>

      {digitKeys[6]}
      {digitKeys[7]}
      {digitKeys[8]}

      {dotKey}
      {zeroKey}
    </div>
  );
}

function Key({
  children,
  onPress,
  disabled,
  label,
  shape,
  text,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  shape: string;
  text: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={springSnap}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "tnum grid w-full place-items-center bg-surface font-extrabold",
        "transition-colors hover:bg-surface-high active:bg-border/60",
        "disabled:pointer-events-none disabled:opacity-30",
        shape,
        text,
      )}
    >
      {children}
    </motion.button>
  );
}

/**
 * Apply a keypad press to a raw entry string.
 *
 * Kept here rather than in each caller so the editing rules — one decimal
 * point, at most two decimal places, no runaway integers — are decided once.
 */
export function applyKey(
  value: string,
  key: string,
  { allowsDecimal = true, maxIntegerDigits = 9 } = {},
) {
  if (key === "del") return value.slice(0, -1);

  if (key === ".") {
    if (!allowsDecimal || value.includes(".")) return value;
    return value === "" ? "0." : `${value}.`;
  }

  const [, fraction] = value.split(".");
  if (fraction !== undefined && fraction.length >= 2) return value;
  if (value.replace(".", "").length >= maxIntegerDigits) return value;
  if (value === "0") return key;
  return value + key;
}
