export default function ProgressLoading() {
  return (
    <div className="relative flex-1 overflow-hidden min-h-screen bg-[#050812]">
      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-8 space-y-3">
          <div className="w-24 h-5 rounded-md bg-white/[0.06] animate-pulse" />
          <div className="w-64 h-8 rounded-lg bg-white/[0.08] animate-pulse" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 flex flex-col justify-between animate-pulse">
              <div className="w-20 h-4 rounded bg-white/[0.06]" />
              <div className="w-16 h-8 rounded bg-white/[0.08]" />
            </div>
          ))}
        </div>

        {/* Chart / Section Skeleton */}
        <div className="w-full h-72 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 animate-pulse" />
      </div>
    </div>
  );
}
