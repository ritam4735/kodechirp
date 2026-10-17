export default function GlobalLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#58a6ff] animate-spin" />
        <span className="absolute text-lg select-none" aria-hidden="true">🦅</span>
      </div>
      <p className="text-xs font-mono text-[#8b949e] uppercase tracking-widest animate-pulse">
        Initializing workspace…
      </p>
    </div>
  );
}
