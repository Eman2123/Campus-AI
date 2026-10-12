/**
 * Shared loading state for route transitions (used by the loading.tsx files).
 * Three pixel blocks that blink in turn; `prefers-reduced-motion` already
 * disables CSS animation globally (see globals.css), leaving a static row.
 */
export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-brand-white p-8 text-brand-black">
      <div className="flex gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-4 w-4 animate-pulse border-2 border-brand-black bg-brand-yellow"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="font-pixel text-base font-semibold">{label}…</p>
    </div>
  );
}
