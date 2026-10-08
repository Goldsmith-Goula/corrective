import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/**
 * Every LAN address this machine answers on.
 *
 * Next 16 blocks cross-origin requests to dev resources (`/_next/*`, HMR) by
 * default. Opening the dev server from a phone on the same network therefore
 * loads the server-rendered HTML and then stalls, because the JS chunks are
 * refused — which looks exactly like the app hanging on its loading skeleton.
 *
 * Detecting the addresses rather than hard-coding one means this keeps working
 * when the machine moves between networks and gets a new IP. It affects
 * `next dev` only; production builds ignore it.
 */
function localNetworkOrigins() {
  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address);
    }
  }
  return addresses;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkOrigins(),
  env: {
    /**
     * Changes on every build.
     *
     * The service worker is registered at `/sw.js?v=<this>`, so each deploy is
     * a different script URL and therefore a different registration. Without
     * it, sw.js is byte-identical between deploys, no update ever fires, and
     * the caches from an older build live on indefinitely.
     */
    NEXT_PUBLIC_SW_VERSION: String(Date.now()),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

/**
 * `cacheComponents` and `partialPrefetching` are deliberately not enabled.
 *
 * They exist to coordinate cached and dynamic *server* data, and this
 * milestone has none: every screen is a client component reading the current
 * date and localStorage. Both of those are client facts — the day boundary in
 * particular depends on the viewer's timezone, not the server's — so page
 * content cannot be prerendered without producing a hydration mismatch, and
 * the shell renders a skeleton until the store has been read instead.
 *
 * When a real backend is introduced, turning these back on is the right move.
 */
export default nextConfig;
