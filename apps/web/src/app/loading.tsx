/** Route-level loading state while a page's server data is fetched. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16" aria-busy="true" aria-live="polite">
      <div className="bg-surface-overlay mb-8 h-10 w-64 animate-pulse motion-reduce:animate-none" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-surface-overlay h-32 animate-pulse motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
