/**
 * The route-level loading state.
 *
 * Next wraps each page in a Suspense boundary with this as the fallback, so a
 * segment that is still streaming shows the shell's skeleton rather than
 * nothing. Without a boundary the suspension travels up past the app shell and
 * blanks the whole frame until the payload lands — invisible on a fast
 * connection, and a blank screen on a slow one.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-3 pt-6" aria-hidden>
      <div className="h-3 w-24 rounded-full bg-surface-high" />
      <div className="h-8 w-52 rounded-lg bg-surface-high" />
      <div className="h-20 rounded-2xl bg-surface" />
      <div className="h-20 rounded-2xl bg-surface" />
      <div className="h-20 rounded-2xl bg-surface" />
    </div>
  );
}
