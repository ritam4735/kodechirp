export default function QuestionsLoading() {
  return (
    <div className="flex-1 flex flex-col bg-[var(--kc-bg)] py-8 sm:py-12">
      <div className="kc-container">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-3">
          <div className="w-28 h-5 rounded-full bg-[var(--kc-surface-subtle)] border border-[var(--kc-border-subtle)] animate-pulse" />
          <div className="w-64 h-8 rounded-lg bg-[var(--kc-surface)] animate-pulse" />
          <div className="w-96 h-4 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
        </div>

        {/* Table Wrapper Skeleton */}
        <div className="kc-table-wrapper">
          {/* Toolbar Skeleton */}
          <div className="kc-table-toolbar">
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-16 h-7 rounded bg-[var(--kc-surface)] animate-pulse" />
              ))}
            </div>
            <div className="w-48 h-7 rounded bg-[var(--kc-surface)] animate-pulse" />
          </div>

          {/* Table Header */}
          <div className="kc-table-head">
            <span>STATUS</span>
            <span>CHALLENGE TITLE</span>
            <span>DIFFICULTY</span>
            <span>ACCEPTANCE</span>
            <span className="kc-head-action">ACTION</span>
          </div>

          {/* Rows Skeleton */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="kc-prob-row"
              style={{ cursor: 'default' }}
            >
              <div className="kc-prob-cell-status">
                <div className="w-6 h-3 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
              </div>
              <div className="kc-prob-cell-title space-y-1.5">
                <div className="w-2/5 h-4 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
                <div className="w-1/4 h-2.5 rounded bg-[var(--kc-border-subtle)] animate-pulse" />
              </div>
              <div className="kc-prob-cell-diff">
                <div className="w-14 h-5 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
              </div>
              <div className="kc-prob-cell-rate">
                <div className="w-12 h-4 rounded bg-[var(--kc-surface-subtle)] animate-pulse" />
              </div>
              <div className="kc-prob-cell-action">
                <div className="w-12 h-4 rounded bg-[var(--kc-surface-subtle)] animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
