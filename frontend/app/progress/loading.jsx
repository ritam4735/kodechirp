export default function ProgressLoading() {
  return (
    <div className="relative flex-1 overflow-hidden min-h-screen bg-[var(--kc-bg)]">
      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-8 space-y-3">
          <div className="w-24 h-4 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
          <div className="w-56 h-7 rounded-md bg-[var(--kc-surface)] animate-pulse" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-[var(--kc-surface)] border border-[var(--kc-border)] p-5 flex flex-col justify-between animate-pulse">
              <div className="w-20 h-4 rounded bg-[var(--kc-surface-subtle)]" />
              <div className="w-16 h-7 rounded bg-[var(--kc-surface-subtle)]" />
            </div>
          ))}
        </div>

        {/* Chart / Section Skeleton */}
        <div className="w-full h-72 rounded-lg bg-[var(--kc-surface)] border border-[var(--kc-border)] p-6 animate-pulse" />
      </div>
    </div>
  );
}
