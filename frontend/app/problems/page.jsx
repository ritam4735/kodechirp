'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, BookOpen, Zap } from 'lucide-react';
import { useProblem } from '../../hooks/useProblem';

function ProblemCard({ problem, index }) {
  return (
    <Link
      href={`/problems/${problem.slug}`}
      className="group flex items-center gap-4 px-5 py-4 border-b border-[#21262d] hover:bg-[#161b22] transition-colors"
    >
      <span className="w-8 text-sm text-[#484f58] font-mono tabular-nums flex-shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors truncate">
          {problem.title}
        </h3>
        <p className="text-xs text-[#8b949e] mt-0.5 truncate">{problem.short_description}</p>
      </div>
      <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
        problem.difficulty === 'Easy' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
        problem.difficulty === 'Medium' ? 'bg-[#eab308]/10 text-[#eab308]' :
        'bg-[#ef4444]/10 text-[#ef4444]'
      }`}>
        {problem.difficulty}
      </span>
      <ChevronRight size={14} className="text-[#484f58] group-hover:text-[#58a6ff] transition-colors flex-shrink-0 ml-2" />
    </Link>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="flex flex-col items-center p-4 bg-[#161b22] rounded-xl border border-[#21262d]">
      <span className={`text-2xl font-bold font-display ${color}`}>{value}</span>
      <span className="text-xs text-[#8b949e] mt-0.5">{label}</span>
    </div>
  );
}

export default function ProblemsPage() {
  const { problems, isLoading, fetchProblems } = useProblem();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProblems(search);
    }, 250);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-10">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#58a6ff]/10 border border-[#58a6ff]/20 rounded-full text-[#58a6ff] text-xs font-medium mb-4">
          <Zap size={10} />
          Explore the Nest
        </div>
        <h1 className="font-display text-4xl font-extrabold text-white mb-3">
          Solve. Chirp.<br />
          <span className="text-[#58a6ff]">Inspire.</span>
        </h1>
        <p className="text-[#8b949e] max-w-md mx-auto text-sm leading-relaxed">
          Browse challenges, solve them elegantly, and share your wisdom with the flock.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatBadge label="Problems" value={problems.length || '—'} color="text-[#58a6ff]" />
        <StatBadge label="Chirps" value="100+" color="text-[#22c55e]" />
        <StatBadge label="Flock Size" value="Open" color="text-[#a78bfa]" />
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
        <input
          type="text"
          placeholder="Search problems..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#161b22] border border-[#21262d] text-sm text-[#e6edf3] placeholder-[#484f58] rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#58a6ff] transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#8b949e] text-xs"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-[#0d1117] border border-[#21262d] rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#21262d] bg-[#161b22]">
          <BookOpen size={14} className="text-[#58a6ff]" />
          <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
            {isLoading ? 'Loading…' : `${problems.length} Problem${problems.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#484f58]">Loading problems…</span>
          </div>
        ) : problems.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Search size={28} className="text-[#484f58]" />
            <p className="text-sm text-[#8b949e]">No problems match "{search}"</p>
            <button onClick={() => setSearch('')} className="text-xs text-[#58a6ff] hover:underline">
              Clear search
            </button>
          </div>
        ) : (
          problems.map((problem, i) => (
            <ProblemCard key={problem.id} problem={problem} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
