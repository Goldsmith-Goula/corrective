/**
 * Offline shell for Corrective.
 *
 * The data lives in localStorage, so the only thing that has to survive going
 * offline is the application itself. Two strategies:
 *
 *   - navigations: network first, falling back to the cached shell, so the app
 *     opens on a train and the user can still record an execution
 *   - static build assets: cache first, because Next fingerprints them and a
 *     given URL never changes content
 *
 * Deliberately not a full precache manifest: the build output filenames are
 * not known here, and a stale precache is worse than a cold fetch.
 */

const VERSION = "v4";
const SHELL = `corrective-shell-${VERSION}`;
const ASSETS = `corrective-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";

/**
 * The four main routes are precached at install, not merely cached when first
 * visited. Otherwise a user who installs the app, goes offline and taps
 * "Review" before ever having opened it gets the offline page — which would
 * make the offline promise true only for the screens they happened to visit.
 */
const SHELL_URLS = [
  "/",
  "/corrections",
  "/money",
  "/review",
  OFFLINE_URL,
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // A single failed URL must not fail the whole install.
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL && key !== ASSETS)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the dev server's hot-reload channel.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return (
            (await caches.match(request)) ??
            (await caches.match(OFFLINE_URL)) ??
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // Fingerprinted build output and icons.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      (async () => {
        const hit = await caches.match(request);
        if (hit) return hit;
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(ASSETS);
          cache.put(request, fresh.clone());
        }
        return fresh;
      })(),
    );
  }
});
