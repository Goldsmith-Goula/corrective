"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useStore } from "./store";

/* Server snapshots are constant, so they live outside the hooks. */
const FALSE = () => false;
const MINUS_ONE = () => -1;
const noopSubscribe = () => () => {};

/**
 * True once the persisted store has been read from localStorage.
 *
 * Hydration state belongs to the persist middleware rather than to React, so
 * it is subscribed to rather than mirrored into component state. The store is
 * deliberately not hydrated during SSR, and screens wait on this before
 * rendering data to avoid a server/client mismatch.
 */
export function useHydrated() {
  const hydrated = useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    FALSE,
  );

  useEffect(() => {
    if (!useStore.persist.hasHydrated()) {
      void useStore.persist.rehydrate();
      return;
    }
    // Settle anything that was due before today and never touched.
    useStore.getState().rollover();
  }, [hydrated]);

  return hydrated;
}

export function useMediaQuery(query: string) {
  // The MediaQueryList is the external store. It is created lazily inside
  // these closures because matchMedia does not exist during SSR, and it never
  // becomes React state, so no render is needed to set it up.
  const [subscribe, getSnapshot] = useMemo(() => {
    let mql: MediaQueryList | null = null;
    const resolve = () =>
      (mql ??= typeof window === "undefined" ? null : window.matchMedia(query));

    return [
      (onChange: () => void) => {
        const list = resolve();
        if (!list) return () => {};
        list.addEventListener("change", onChange);
        return () => list.removeEventListener("change", onChange);
      },
      () => resolve()?.matches ?? false,
    ] as const;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, FALSE);
}

export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");

/** False during SSR and the first client render — for portals. */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, FALSE);
}

/**
 * The wall clock, as an external store.
 *
 * Shared by every component that needs the current time, so the whole app
 * re-buckets on the same tick instead of drifting apart. Treating it as an
 * external store rather than component state also gives it a server snapshot,
 * which keeps the first render identical on both sides of hydration.
 */
const clock = (() => {
  const listeners = new Set<() => void>();
  let minutes = -1;
  let timer: ReturnType<typeof setInterval> | null = null;

  const read = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const tick = () => {
    const next = read();
    if (next === minutes) return;
    minutes = next;
    for (const l of listeners) l();
  };

  const onVisible = () => {
    // A phone that was asleep comes back with a stale clock.
    if (document.visibilityState === "visible") tick();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!timer) {
        minutes = read();
        timer = setInterval(tick, 30_000);
        document.addEventListener("visibilitychange", onVisible);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
          document.removeEventListener("visibilitychange", onVisible);
        }
      };
    },
    /** -1 until the first subscription, which is also the server value. */
    snapshot: () => minutes,
  };
})();

/**
 * Minutes since midnight.
 *
 * Returns -1 before the clock has started — during prerender and the first
 * client render. Callers that bucket by time should treat that as "unknown"
 * rather than as midnight.
 */
export function useMinutesNow() {
  return useSyncExternalStore(clock.subscribe, clock.snapshot, MINUS_ONE);
}

/** A once-per-second ticker, for the running execution timer only. */
export function useSecondsTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}

export function useBodyLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

/** Close on Escape. */
export function useEscape(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);

  useEffect(() => {
    handler.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

/**
 * Runs `onOpen` the moment a panel opens, during render.
 *
 * This is the documented way to reset state when a prop changes: the sheets
 * stay mounted so they can animate out, which means an effect would reset
 * their draft one render too late and cause a visible flash of stale content.
 */
export function useOnOpen(open: boolean, onOpen: () => void) {
  const [previous, setPrevious] = useState(open);

  if (open !== previous) {
    setPrevious(open);
    if (open) onOpen();
  }
}
