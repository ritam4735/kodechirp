export const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-[#21262d] bg-[#0d1117] hidden md:flex flex-col">
      <div className="p-4">
        <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Navigation</span>
        <ul className="mt-4 space-y-2">
          <li>
            <a href="/" className="block px-3 py-2 rounded text-sm text-[#e6edf3] hover:bg-[#161b22] hover:text-[#22c55e] transition-colors">Problems</a>
          </li>
          <li>
            <a href="#" className="block px-3 py-2 rounded text-sm text-[#484f58] cursor-not-allowed">Battles (Coming Soon)</a>
          </li>
        </ul>
      </div>
    </aside>
  );
};
