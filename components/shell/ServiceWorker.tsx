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
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // An unavailable service worker costs offline support, nothing more.
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
