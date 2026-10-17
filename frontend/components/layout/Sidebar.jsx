export const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-[var(--kc-border)] bg-[var(--kc-surface)] hidden md:flex flex-col">
      <div className="p-4">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--kc-text-muted)]">Navigation</span>
        <ul className="mt-4 space-y-1">
          <li>
            <a href="/questions" className="block px-3 py-2 rounded-md text-sm text-white hover:bg-[var(--kc-surface-subtle)] hover:text-[var(--kc-accent)] transition-colors">Questions</a>
          </li>
          <li>
            <span className="block px-3 py-2 rounded-md text-sm text-[var(--kc-text-muted)] opacity-50 cursor-not-allowed">Battles (Coming Soon)</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};
