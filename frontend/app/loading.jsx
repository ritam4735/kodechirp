export default function GlobalLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--kc-border)] border-t-[var(--kc-accent)] animate-spin" />
      </div>
      <p className="text-xs font-mono text-[var(--kc-text-muted)] uppercase tracking-wider">
        Initializing workspace…
      </p>
    </div>
  );
}
