'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsLeft, 
  ChevronsRight, 
  AlertTriangle 
} from 'lucide-react';
import { useProblem } from '../../hooks/useProblem';

const PAGE_SIZE = 50;

function formatAcceptanceRate(rate) {
  if (rate === null || rate === undefined || rate === '') return '0.0%';
  const num = parseFloat(rate);
  if (isNaN(num)) return '0.0%';
  const percent = num <= 1.0 ? num * 100 : num;
  return `${percent.toFixed(1)}%`;
}

function DifficultyBadge({ difficulty }) {
  if (difficulty === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
  if (difficulty === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
  return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
}

export default function QuestionsPage() {
  const router = useRouter();
  const { problems, isLoading, error, pagination, fetchProblems } = useProblem();
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleDifficultyChange = (val) => {
    setDifficulty(val);
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProblems(search, { page, limit: PAGE_SIZE, difficulty });
    }, search ? 250 : 0);

    return () => clearTimeout(timer);
  }, [search, page, difficulty, fetchProblems]);

  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;
  const total = pagination?.total || problems.length;
  const startIndex = (page - 1) * PAGE_SIZE;

  // Derive counts for difficulties
  const difficultyCounts = useMemo(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    problems.forEach((p) => {
      if (counts[p.difficulty] !== undefined) {
        counts[p.difficulty]++;
      }
    });
    return counts;
  }, [problems]);

  // Generate page numbers
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
    <div className="flex-1 flex flex-col bg-[var(--kc-bg)] py-8 sm:py-12">
      <div className="kc-container">
        {/* Editorial Page Header */}
        <div className="mb-8">
          <div className="kc-kicker" style={{ animation: 'none' }}>
            <span className="kc-kicker-dot" />
            <span>Problem Repository</span>
            <span className="kc-kicker-sep">/</span>
            <span className="kc-kicker-ver">Active Catalog</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--kc-text-primary)] mb-2 font-display">
            Benchmark Challenges
          </h1>
          <p className="text-sm sm:text-base text-[var(--kc-text-secondary)] max-w-2xl">
            Algorithmic challenges executed in isolated runtime sandboxes. Master fundamental algorithms, time complexities, and implementation trade-offs.
          </p>
        </div>

        {/* Problem Table Card */}
        <div className="kc-table-wrapper">
          {/* Table Toolbar */}
          <div className="kc-table-toolbar">
            <div className="kc-diff-filters" role="tablist" aria-label="Filter problems by difficulty">
              {[
                { label: 'All', value: '' },
                { label: 'Easy', value: 'Easy' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Hard', value: 'Hard' },
              ].map(({ label, value }) => {
                const isActive = difficulty === value;
                const count = value === '' ? total : difficultyCounts[value] || 0;
                return (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`kc-diff-tab ${isActive ? 'active' : ''}`}
                    onClick={() => handleDifficultyChange(value)}
                  >
                    {label} {count > 0 && <span className="opacity-60 text-[10px] ml-1 font-mono">({count})</span>}
                  </button>
                );
              })}
            </div>

            <div className="kc-search-box">
              <Search size={13} className="kc-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Filter by challenge title..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="kc-search-input"
                aria-label="Filter problems by title"
              />
              {search && (
                <button
                  type="button"
                  className="kc-search-clear"
                  onClick={() => handleSearchChange('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="kc-problems-table" role="table" aria-label="Challenges List">
            <div className="kc-table-head" role="row">
              <span role="columnheader">STATUS</span>
              <span role="columnheader">CHALLENGE TITLE</span>
              <span role="columnheader">DIFFICULTY</span>
              <span role="columnheader">ACCEPTANCE</span>
              <span role="columnheader" className="kc-head-action">ACTION</span>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-6 h-6 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-[var(--kc-text-muted)] uppercase tracking-wider">
                  Loading challenges from sandbox cluster…
                </span>
              </div>
            ) : error ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
                <AlertTriangle size={28} className="text-[#EF4444]" />
                <p className="text-sm font-semibold text-[#EF4444]">{error}</p>
                <p className="text-xs text-[var(--kc-text-muted)]">Failed to retrieve challenges from the API cluster.</p>
                <button
                  type="button"
                  onClick={() => fetchProblems(search, { page, limit: PAGE_SIZE, difficulty })}
                  className="kc-btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px', marginTop: '8px' }}
                >
                  Retry Connection
                </button>
              </div>
            ) : problems.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
                <Search size={24} className="text-[var(--kc-text-muted)]" />
                <p className="text-sm text-[var(--kc-text-secondary)]">
                  {search ? (
                    <>No challenges match &ldquo;<strong className="text-[var(--kc-text-primary)]">{search}</strong>&rdquo;</>
                  ) : (
                    'No challenges found in this category'
                  )}
                </p>
                {search && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="text-xs text-[var(--kc-accent)] hover:underline mt-1"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            ) : (
              problems.map((problem, idx) => (
                <div
                  key={problem.id || problem.slug}
                  className="kc-prob-row"
                  onClick={() => router.push(`/problems/${problem.slug}`)}
                  role="row"
                  tabIndex={0}
                  aria-label={`Open problem: ${problem.title}, difficulty ${problem.difficulty}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/problems/${problem.slug}`);
                    }
                  }}
                >
                  <div className="kc-prob-cell-status">
                    <span className="kc-prob-index">#{String(startIndex + idx + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="kc-prob-cell-title">
                    <div className="kc-prob-name">{problem.title}</div>
                    {problem.short_description ? (
                      <div className="kc-prob-slug">{problem.short_description}</div>
                    ) : (
                      <div className="kc-prob-slug">slug: {problem.slug}</div>
                    )}
                  </div>

                  <div className="kc-prob-cell-diff">
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>

                  <div className="kc-prob-cell-rate">
                    <span className="kc-rate-val">{formatAcceptanceRate(problem.acceptance_rate)}</span>
                  </div>

                  <div className="kc-prob-cell-action">
                    <span className="kc-btn-solve">
                      <span>Solve</span>
                      <ChevronRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Clean Pagination Footer */}
          {!isLoading && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-[var(--kc-border-subtle)] bg-[var(--kc-surface-subtle)]">
              <span className="text-xs text-[var(--kc-text-muted)] font-mono">
                Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, total)} of {total.toLocaleString()} challenges
              </span>

              <div className="flex items-center gap-1" role="navigation" aria-label="Pagination Navigation">
                <button
                  type="button"
                  aria-label="First page"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {getPageNumbers().map((p, i) =>
                    p === '...' ? (
                      <span key={`dots-${i}`} className="px-1.5 text-[var(--kc-text-muted)] text-xs font-mono" aria-hidden="true">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        aria-label={`Page ${p}`}
                        aria-current={page === p ? 'page' : undefined}
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 rounded text-[11.5px] font-mono font-medium transition-colors ${
                          page === p
                            ? 'bg-[var(--kc-surface)] text-[var(--kc-text-primary)] border border-[var(--kc-border)] font-semibold shadow-sm'
                            : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Last page"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
