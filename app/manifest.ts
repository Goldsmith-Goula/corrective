import type { MetadataRoute } from "next";

/**
 * The install manifest.
 *
 * `standalone` plus the four navigation shortcuts is what makes the app feel
 * installed rather than bookmarked: launched from the home screen it opens
 * without browser chrome, and a long-press lands directly on a section.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Corrective",
    short_name: "Corrective",
    description:
      "Identify a recurring mistake, write a specific correction, schedule it, and record whether it actually happened.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#15100d",
    theme_color: "#15100d",
    categories: ["productivity", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Today", url: "/", description: "What has to be executed now" },
      { name: "Corrections", url: "/corrections" },
      { name: "Money", url: "/money" },
      { name: "Review", url: "/review" },
    ],
  };
}
