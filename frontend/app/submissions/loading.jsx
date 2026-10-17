export default function SubmissionsLoading() {
  return (
    <div className="relative flex-1 overflow-hidden min-h-screen bg-[var(--kc-bg)]">
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-3">
          <div className="w-24 h-4 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
          <div className="w-48 h-7 rounded-md bg-[var(--kc-surface)] animate-pulse" />
          <div className="w-64 h-3.5 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
        </div>

        {/* Submissions List Skeleton */}
        <div className="rounded-lg overflow-hidden border border-[var(--kc-border)] bg-[var(--kc-surface)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--kc-border)] animate-pulse"
            >
              <div className="w-4 h-4 rounded-full bg-[var(--kc-surface-subtle)] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-2/5 h-3.5 rounded bg-[var(--kc-surface-subtle)]" />
                <div className="w-1/4 h-2.5 rounded bg-[var(--kc-surface-subtle)]" />
              </div>
              <div className="w-16 h-5 rounded bg-[var(--kc-surface-subtle)] shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
