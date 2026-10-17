export default function SubmissionsLoading() {
  return (
    <div className="relative flex-1 overflow-hidden min-h-screen bg-[#050812]">
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-3">
          <div className="w-28 h-5 rounded-md bg-white/[0.06] animate-pulse" />
          <div className="w-56 h-8 rounded-lg bg-white/[0.08] animate-pulse" />
          <div className="w-72 h-4 rounded-md bg-white/[0.04] animate-pulse" />
        </div>

        {/* Submissions List Skeleton */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.02]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] animate-pulse"
            >
              <div className="w-5 h-5 rounded-full bg-white/[0.08] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-2/5 h-4 rounded bg-white/[0.08]" />
                <div className="w-1/4 h-3 rounded bg-white/[0.04]" />
              </div>
              <div className="w-20 h-6 rounded-md bg-white/[0.06] shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
