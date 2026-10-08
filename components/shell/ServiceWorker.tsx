"use client";

import { useEffect } from "react";

/**
 * Registers the offline shell.
 *
 * Registration is deferred until after load so it never competes with first
 * paint, and it is skipped in development where the dev server's own assets
 * should not be cached.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        // updateViaCache: "none" stops the browser serving sw.js itself from
        // its HTTP cache, which is how an old worker survives a deploy.
        .register(
          `/sw.js?v=${process.env.NEXT_PUBLIC_SW_VERSION ?? "dev"}`,
          { scope: "/", updateViaCache: "none" },
        )
        .then((reg) => reg.update())
        .catch(() => {
          // An unavailable service worker costs offline support, nothing more.
        });
    };

    /**
     * Reload once when a new worker takes over.
     *
     * A worker from an earlier deploy can hold a precached HTML shell that
     * points at script hashes the new build no longer has. The scripts 404,
     * React never hydrates, and the page sits blank until the user refreshes
     * by hand. Reloading the moment control changes makes that self-healing
     * instead of something they have to know to do.
     */
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
