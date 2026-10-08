/**
 * Motion presets.
 *
 * Buckwheat's interface moves on springs, fast and slightly damped — things
 * settle rather than ease to a stop. Nothing here is decorative: each preset
 * exists to communicate hierarchy, state, continuity, location or completion.
 */
import type { Transition } from "motion/react";

/** Default for layout and position changes. */
export const spring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.9,
};

/** Slightly looser — for things that unfold, like a card opening. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 32,
  mass: 1,
};

/** Tight and quick — for presses and small state flips. */
export const springSnap: Transition = {
  type: "spring",
  stiffness: 700,
  damping: 42,
  mass: 0.7,
};

/** Sheets rising from the bottom edge. */
export const springSheet: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 36,
  mass: 0.95,
};

/** For opacity and colour, where a spring would read as a wobble. */
export const fade: Transition = { duration: 0.16, ease: [0.3, 0, 0.2, 1] };

/** Touch/press feedback, applied with whileTap. */
export const tapScale = { scale: 0.975 };

export const listItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};
