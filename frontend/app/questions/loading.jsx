export default function QuestionsLoading() {
  return (
    <div className="relative flex-1 overflow-hidden min-h-screen bg-[#050812]">
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-3">
          <div className="w-24 h-5 rounded-md bg-white/[0.06] animate-pulse" />
          <div className="w-64 h-8 rounded-lg bg-white/[0.08] animate-pulse" />
          <div className="w-80 h-4 rounded-md bg-white/[0.04] animate-pulse" />
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-18 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 flex flex-col items-center justify-center gap-1.5 animate-pulse">
              <div className="w-8 h-6 rounded bg-white/[0.08]" />
              <div className="w-12 h-3 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>

        {/* Search Bar Skeleton */}
        <div className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-5 animate-pulse" />

        {/* Question List Rows Skeleton */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.02]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] animate-pulse"
            >
              <div className="w-6 h-4 rounded bg-white/[0.04] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-4 rounded bg-white/[0.08]" />
                <div className="w-1/2 h-3 rounded bg-white/[0.03]" />
              </div>
              <div className="w-16 h-5 rounded-md bg-white/[0.06] shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
