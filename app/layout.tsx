import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { ServiceWorker } from "@/components/shell/ServiceWorker";
import "./globals.css";

/**
 * Manrope, as in the reference application — a geometric sans that stays
 * legible at small sizes and holds up at heavy weights, which is where most of
 * this interface lives.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Corrective",
  description:
    "Identify a recurring mistake, write a specific correction, schedule it, and record whether it actually happened.",
  applicationName: "Corrective",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Corrective",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The scheduler uses horizontal drag; page zoom fights it on touch.
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#15100d" },
  ],
};

/**
 * Applies the stored theme before first paint.
 *
 * Without this the app renders in the system scheme for a frame and then
 * snaps to the chosen one, which is exactly the kind of unexplained movement
 * the rest of the interface avoids.
 */
const THEME_SCRIPT = `
try {
  var raw = localStorage.getItem("corrective.v1");
  var t = raw && JSON.parse(raw).state && JSON.parse(raw).state.theme;
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is required, not a sloppy silencer: the script
    // below deliberately sets data-theme on this element before React
    // hydrates, so the server HTML and the client DOM genuinely differ here.
    // The attribute is the only difference, and it is scoped to <html>.
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <ServiceWorker />
      </body>
    </html>
  );
}
