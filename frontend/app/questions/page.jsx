'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, ChevronRight, ChevronLeft, Code2, Layers, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useProblem } from '../../hooks/useProblem';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

const PAGE_SIZE = 50;

function DifficultyBadge({ difficulty }) {
  const styles = {
    Easy:   'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
    Medium: 'bg-[#eab308]/10 text-[#eab308] border border-[#eab308]/20',
    Hard:   'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${styles[difficulty] ?? styles.Easy}`}>
      {difficulty}
    </span>
  );
}

function ProblemRow({ problem, index, globalIndex }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.02, ease: 'easeOut' }}
    >
      <Link
        href={`/problems/${problem.slug}`}
        className="group flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200"
      >
        <span className="w-7 text-[12px] text-[#484f58] font-mono tabular-nums shrink-0 text-right">
          {String(globalIndex + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-[#c9d1d9] group-hover:text-white transition-colors truncate">
            {problem.title}
          </h3>
          {problem.short_description && (
            <p className="text-[12px] text-[#484f58] mt-0.5 truncate">{problem.short_description}</p>
          )}
        </div>
        <DifficultyBadge difficulty={problem.difficulty} />
        <ChevronRight
          size={14}
          className="text-[#484f58] group-hover:text-[#58a6ff] group-hover:translate-x-0.5 transition-all duration-200 shrink-0 ml-1"
        />
      </Link>
    </motion.div>
  );
}

export default function QuestionsPage() {
  const { problems, isLoading, pagination, fetchProblems } = useProblem();
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);

  const doFetch = useCallback(() => {
    fetchProblems(search, { page, limit: PAGE_SIZE, difficulty });
  }, [search, page, difficulty]);

  useEffect(() => {
    const t = setTimeout(doFetch, 220);
    return () => clearTimeout(t);
  }, [doFetch]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, difficulty]);

  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;
  const total = pagination?.total || problems.length;
  const startIndex = (page - 1) * PAGE_SIZE;

  const easy   = problems.filter(p => p.difficulty === 'Easy').length;
  const medium = problems.filter(p => p.difficulty === 'Medium').length;
  const hard   = problems.filter(p => p.difficulty === 'Hard').length;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <AnimatedBackground variant="questions" />

      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#58a6ff]/15 border border-[#58a6ff]/20 flex items-center justify-center">
              <Code2 size={14} className="text-[#58a6ff]" />
            </div>
            <span className="text-[12px] font-bold text-[#58a6ff] uppercase tracking-widest">Questions</span>
          </div>
          <h1 className="text-3xl font-display font-extrabold text-white mb-1">
            Solve. Think. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#58a6ff] to-[#a371f7]">Chirp.</span>
          </h1>
          <p className="text-[#8b949e] text-sm">
            Browse challenges, solve them, and share your approach with the flock.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="grid grid-cols-4 gap-3 mb-6"
        >
          <div
            className="rounded-xl p-3 text-center border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: difficulty === '' ? 'rgba(88,166,255,0.12)' : 'rgba(88,166,255,0.04)',
              borderColor: difficulty === '' ? 'rgba(88,166,255,0.3)' : 'rgba(88,166,255,0.1)',
            }}
            onClick={() => setDifficulty('')}
          >
            <div className="text-xl font-display font-bold text-[#58a6ff]">{total}</div>
            <div className="text-[11px] font-medium text-[#8b949e] mt-0.5">All</div>
          </div>
          {[
            { label: 'Easy',   color: '#22c55e', rgb: '34,197,94',  count: easy },
            { label: 'Medium', color: '#eab308', rgb: '234,179,8',  count: medium },
            { label: 'Hard',   color: '#ef4444', rgb: '239,68,68',  count: hard },
          ].map(({ label, color, rgb, count }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: difficulty === label ? `rgba(${rgb},0.15)` : `rgba(${rgb},0.06)`,
                borderColor: difficulty === label ? `rgba(${rgb},0.4)` : `rgba(${rgb},0.15)`,
              }}
              onClick={() => setDifficulty(difficulty === label ? '' : label)}
            >
              <div className="text-xl font-display font-bold" style={{ color }}>{count}</div>
              <div className="text-[11px] font-medium text-[#8b949e] mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="relative mb-5"
        >
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#484f58] pointer-events-none" />
          <input
            type="text"
            placeholder="Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full bg-white/[0.04] border border-white/[0.08]
              text-sm text-[#e6edf3] placeholder-[#484f58]
              rounded-xl pl-10 pr-4 py-2.5
              focus:outline-none focus:border-[#58a6ff]/50 focus:bg-white/[0.06]
              transition-all duration-200
            "
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#484f58] hover:text-[#8b949e] text-xs transition-colors"
            >
              Clear
            </button>
          )}
        </motion.div>

        {/* Problem list glass panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="rounded-2xl overflow-hidden border border-white/[0.07]"
          style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* List header */}
          <div className="flex items-center justify-between gap-2.5 px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <Layers size={13} className="text-[#58a6ff]" />
              <span className="text-[11px] font-bold text-[#8b949e] uppercase tracking-wider">
                {isLoading ? 'Loading…' : `Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, total)} of ${total.toLocaleString()} problems`}
              </span>
            </div>
            {difficulty && (
              <button
                onClick={() => setDifficulty('')}
                className="text-[11px] text-[#58a6ff] hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#484f58]">Loading questions…</span>
            </div>
          ) : problems.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
              <Search size={28} className="text-[#484f58]" />
              <p className="text-sm text-[#8b949e]">
                {search
                  ? <>No problems match <strong className="text-[#c9d1d9]">"{search}"</strong></>
                  : 'No problems found'
                }
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-[#58a6ff] hover:underline transition-colors">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            problems.map((problem, i) => (
              <ProblemRow key={problem.id} problem={problem} index={i} globalIndex={startIndex + i} />
            ))
          )}

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.05] bg-white/[0.02]">
              <span className="text-[11px] text-[#484f58]">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-[#484f58] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-[#484f58] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="px-1.5 text-[#484f58] text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[28px] h-7 rounded-lg text-[12px] font-medium transition-all ${
                        page === p
                          ? 'bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/30'
                          : 'text-[#8b949e] hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-[#484f58] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-[#484f58] hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
