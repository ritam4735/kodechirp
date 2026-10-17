export default function ProblemLoading() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] p-2 sm:p-3 overflow-hidden bg-[var(--kc-bg)]">
      {/* Top action bar skeleton */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--kc-border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-16 h-6 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
          <div className="w-48 h-5 rounded bg-[var(--kc-surface)] animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-7 rounded bg-[var(--kc-surface)] animate-pulse" />
          <div className="w-20 h-7 rounded bg-[var(--kc-surface)] animate-pulse" />
        </div>
      </div>

      {/* Main split pane skeleton */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0">
        {/* Left description skeleton */}
        <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] p-5 space-y-4 animate-pulse">
          <div className="w-2/5 h-6 rounded bg-[var(--kc-surface-subtle)]" />
          <div className="space-y-2 pt-2">
            <div className="w-full h-3.5 rounded bg-[var(--kc-surface-subtle)]" />
            <div className="w-5/6 h-3.5 rounded bg-[var(--kc-surface-subtle)]" />
            <div className="w-4/6 h-3.5 rounded bg-[var(--kc-surface-subtle)]" />
          </div>
          <div className="w-full h-32 rounded bg-[var(--kc-surface-subtle)] mt-6" />
        </div>

        {/* Right editor skeleton */}
        <div className="rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] flex flex-col overflow-hidden">
          <div className="h-9 bg-[var(--kc-surface-subtle)] border-b border-[var(--kc-border)] flex items-center px-4 justify-between">
            <div className="w-24 h-4 rounded bg-[var(--kc-surface)] animate-pulse" />
            <div className="w-16 h-4 rounded bg-[var(--kc-surface)] animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--kc-text-muted)] font-mono text-xs uppercase tracking-wider animate-pulse">
              Initializing sandbox runtime…
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
