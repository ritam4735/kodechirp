export default function ProblemLoading() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] px-3 sm:px-6 py-4 overflow-hidden bg-[#0d1117]">
      {/* Top action bar skeleton */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-20 h-7 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="w-48 h-6 rounded-md bg-white/[0.08] animate-pulse" />
          <div className="w-14 h-5 rounded-md bg-white/[0.05] animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 rounded-lg bg-white/[0.06] animate-pulse" />
          <div className="w-20 h-8 rounded-lg bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* Main split pane skeleton */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
        {/* Left description skeleton */}
        <div className="rounded-xl border border-white/[0.08] bg-[#161b22]/50 p-6 space-y-4 animate-pulse">
          <div className="w-3/5 h-6 rounded bg-white/[0.08]" />
          <div className="space-y-2 pt-2">
            <div className="w-full h-4 rounded bg-white/[0.04]" />
            <div className="w-5/6 h-4 rounded bg-white/[0.04]" />
            <div className="w-4/6 h-4 rounded bg-white/[0.04]" />
          </div>
          <div className="w-full h-32 rounded-lg bg-white/[0.03] border border-white/[0.04] mt-6" />
        </div>

        {/* Right editor skeleton */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1117] flex flex-col overflow-hidden">
          <div className="h-10 bg-[#161b22] border-b border-white/[0.08] flex items-center px-4 justify-between">
            <div className="w-24 h-4 rounded bg-white/[0.06] animate-pulse" />
            <div className="w-16 h-4 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#8b949e] font-mono text-xs animate-pulse">Warming up execution sandbox…</span>
          </div>
        </div>
      </div>
    </div>
  );
}
