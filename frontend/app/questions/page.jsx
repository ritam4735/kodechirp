'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsLeft, 
  ChevronsRight, 
  AlertTriangle,
  Tag,
  Layers,
  X
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
  const { problems, counts, topics, pagination, isLoading, error, fetchProblems } = useProblem();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search input so backend isn't spammed per keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleDifficultyChange = (val) => {
    setDifficulty(val);
    setPage(1);
  };

  const handleTopicChange = (val) => {
    setSelectedTopic(val === selectedTopic ? '' : val);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Fetch problems whenever page, difficulty, selectedTopic, or debounced search changes
  useEffect(() => {
    fetchProblems(debouncedSearch, { page, limit: PAGE_SIZE, difficulty, topic: selectedTopic });
  }, [fetchProblems, page, difficulty, selectedTopic, debouncedSearch]);

  // Derive counts for difficulties from the backend catalog counts
  const difficultyCounts = useMemo(() => ({
    Easy: counts?.Easy ?? 0,
    Medium: counts?.Medium ?? 0,
    Hard: counts?.Hard ?? 0,
  }), [counts]);

  // Total questions in catalog across all categories
  const totalCatalogCount = counts?.total ?? 0;

  // Filtered topics list for sidebar quick-search
  const filteredTopics = useMemo(() => {
    if (!topics || !Array.isArray(topics)) return [];
    if (!topicSearch.trim()) return topics;
    const q = topicSearch.trim().toLowerCase();
    return topics.filter((t) => t.topic.toLowerCase().includes(q));
  }, [topics, topicSearch]);

  // Total problems matching current search, topic, and difficulty filters
  const totalFiltered = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;

  // Problems for the active page
  const displayedProblems = problems || [];

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
    <div className="flex-1 flex flex-col bg-[var(--kc-bg)] py-5 sm:py-7">
      <div className="kc-questions-container">
        {/* Editorial Page Header with Compact Summary Card */}
        <div className="kc-questions-hero flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
          <div>
            <div className="kc-kicker" style={{ animation: 'none' }}>
              <span className="kc-kicker-dot" />
              <span>Problem Repository</span>
              <span className="kc-kicker-sep">/</span>
              <span className="kc-kicker-ver">Active Catalog</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--kc-text-primary)] mb-1 font-display">
              Benchmark Challenges
            </h1>
            <p className="text-xs sm:text-sm text-[var(--kc-text-secondary)] max-w-2xl leading-relaxed">
              Algorithmic challenges executed in isolated runtime sandboxes. Master fundamental algorithms, time complexities, and implementation trade-offs.
            </p>
          </div>

          {/* Compact Coding-Practice Summary Card */}
          <div className="kc-summary-card" role="region" aria-label="Catalog Practice Summary">
            <button
              type="button"
              className={`kc-summary-stat kc-summary-clickable text-left ${difficulty === '' && !selectedTopic ? 'active' : ''}`}
              onClick={() => { handleDifficultyChange(''); handleTopicChange(''); }}
              title="Show all challenges"
            >
              <span className="kc-summary-label">Catalog</span>
              <span className="kc-summary-val">{totalCatalogCount}</span>
              <span className="kc-summary-sub">Total</span>
            </button>
            <div className="kc-summary-divider" />
            <button
              type="button"
              className={`kc-summary-stat kc-summary-clickable text-left ${difficulty === 'Easy' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('Easy')}
              title="Filter by Easy challenges"
            >
              <span className="kc-summary-label text-[var(--kc-success)]">Easy</span>
              <span className="kc-summary-val text-[var(--kc-success)]">{difficultyCounts.Easy}</span>
              <span className="kc-summary-sub">Beginner</span>
            </button>
            <div className="kc-summary-divider" />
            <button
              type="button"
              className={`kc-summary-stat kc-summary-clickable text-left ${difficulty === 'Medium' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('Medium')}
              title="Filter by Medium challenges"
            >
              <span className="kc-summary-label text-[var(--kc-warning)]">Medium</span>
              <span className="kc-summary-val text-[var(--kc-warning)]">{difficultyCounts.Medium}</span>
              <span className="kc-summary-sub">Intermediate</span>
            </button>
            <div className="kc-summary-divider" />
            <button
              type="button"
              className={`kc-summary-stat kc-summary-clickable text-left ${difficulty === 'Hard' ? 'active' : ''}`}
              onClick={() => handleDifficultyChange('Hard')}
              title="Filter by Hard challenges"
            >
              <span className="kc-summary-label text-[var(--kc-error)]">Hard</span>
              <span className="kc-summary-val text-[var(--kc-error)]">{difficultyCounts.Hard}</span>
              <span className="kc-summary-sub">Advanced</span>
            </button>
            <div className="kc-summary-divider" />
            <div 
              className="kc-summary-stat"
              title={`${topics?.length || 28} topic categories available`}
            >
              <span className="kc-summary-label">Topics</span>
              <span className="kc-summary-val">{topics?.length || 28}</span>
              <span className="kc-summary-sub">Categories</span>
            </div>
          </div>
        </div>

        {/* Dual-Column Layout: Table on Left + Topic Practice Sidebar on Right */}
        <div className="kc-questions-grid">
          {/* Main Problem Table Card */}
          <div className="kc-table-wrapper min-w-0">
            {/* Table Toolbar */}
            <div className="kc-table-toolbar">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="kc-diff-filters" role="tablist" aria-label="Filter problems by difficulty">
                  {[
                    { label: 'All', value: '' },
                    { label: 'Easy', value: 'Easy' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'Hard', value: 'Hard' },
                  ].map(({ label, value }) => {
                    const isActive = difficulty === value;
                    const count = value === '' ? totalCatalogCount : (difficultyCounts[value] ?? 0);
                    return (
                      <button
                        key={label}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`kc-diff-tab ${isActive ? 'active' : ''}`}
                        onClick={() => handleDifficultyChange(value)}
                      >
                        {label} <span className="opacity-60 text-[10px] ml-1 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Topic Filter Chip */}
                {selectedTopic && (
                  <div className="kc-active-topic-chip" role="status">
                    <Tag size={11} aria-hidden="true" />
                    <span>Topic: {selectedTopic}</span>
                    <button
                      type="button"
                      className="kc-active-topic-chip-clear"
                      onClick={() => handleTopicChange('')}
                      aria-label="Remove topic filter"
                    >
                      ✕
                    </button>
                  </div>
                )}
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
                  <AlertTriangle size={28} className="text-[var(--kc-error)]" />
                  <p className="text-sm font-semibold text-[var(--kc-error)]">{error}</p>
                  <p className="text-xs text-[var(--kc-text-secondary)]">Failed to retrieve challenges from the API cluster.</p>
                  <button
                    type="button"
                    onClick={() => fetchProblems(debouncedSearch, { page, limit: PAGE_SIZE, difficulty, topic: selectedTopic })}
                    className="kc-btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '12px', marginTop: '8px' }}
                  >
                    Retry Connection
                  </button>
                </div>
              ) : displayedProblems.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
                  <Search size={24} className="text-[var(--kc-text-muted)]" />
                  <p className="text-sm text-[var(--kc-text-secondary)]">
                    {search ? (
                      <>No challenges match &ldquo;<strong className="text-[var(--kc-text-primary)]">{search}</strong>&rdquo;</>
                    ) : selectedTopic ? (
                      <>No challenges found for topic &ldquo;<strong className="text-[var(--kc-text-primary)]">{selectedTopic}</strong>&rdquo;{difficulty ? ` with ${difficulty} difficulty` : ''}</>
                    ) : (
                      'No challenges found in this category'
                    )}
                  </p>
                  {(search || selectedTopic || difficulty) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSearchChange('');
                        handleDifficultyChange('');
                        handleTopicChange('');
                      }}
                      className="text-xs text-[var(--kc-accent)] hover:underline mt-1"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              ) : (
                displayedProblems.map((problem, idx) => (
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
                    <div className="kc-prob-cell-status flex items-center gap-1.5">
                      {problem.is_solved && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--kc-success)] shrink-0" title="Solved" />
                      )}
                      <span className="kc-prob-index">
                        #{problem.serial_number ? String(problem.serial_number).padStart(2, '0') : String(startIndex + idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="kc-prob-cell-title">
                      <div className="kc-prob-name">{problem.title}</div>
                      {/* Topic Tags under problem title */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {Array.isArray(problem.tags) && problem.tags.length > 0 ? (
                          <>
                            {problem.tags.slice(0, 4).map((tag) => {
                              const isTagActive = selectedTopic && selectedTopic.toLowerCase() === tag.toLowerCase();
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTopicChange(tag);
                                  }}
                                  className={`kc-topic-pill-xs ${isTagActive ? 'active' : ''}`}
                                  title={`Practice ${tag}`}
                                  aria-label={`Filter by ${tag}`}
                                >
                                  #{tag}
                                </button>
                              );
                            })}
                            {problem.tags.length > 4 && (
                              <span className="text-[10px] text-[var(--kc-text-muted)] font-mono">
                                +{problem.tags.length - 4}
                              </span>
                            )}
                          </>
                        ) : problem.short_description ? (
                          <div className="kc-prob-slug">{problem.short_description}</div>
                        ) : (
                          <div className="kc-prob-slug">slug: {problem.slug}</div>
                        )}
                      </div>
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
                  Showing {totalFiltered === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + displayedProblems.length, totalFiltered)} of {totalFiltered.toLocaleString()} challenges
                </span>

                <div className="flex items-center gap-1" role="navigation" aria-label="Pagination Navigation">
                  <button
                    type="button"
                    aria-label="First page"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsLeft size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
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
                          onClick={() => handlePageChange(p)}
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
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Last page"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronsRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Topic Practice Filter Sidebar */}
          <aside className="kc-topics-sidebar" aria-label="Topic Practice Filters">
            <div className="kc-topics-sidebar-header">
              <div className="kc-topics-sidebar-title">
                <Layers size={14} className="text-[var(--kc-accent)]" aria-hidden="true" />
                <span>Practice by Topic</span>
              </div>
              {selectedTopic && (
                <button
                  type="button"
                  onClick={() => handleTopicChange('')}
                  className="text-[11px] font-mono text-[var(--kc-accent)] hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Quick search inside topics */}
            <div className="kc-topics-search-wrap">
              <Search size={12} className="kc-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Find topic..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="kc-topics-search-input"
                aria-label="Filter topic list"
              />
              {topicSearch && (
                <button
                  type="button"
                  className="kc-search-clear"
                  onClick={() => setTopicSearch('')}
                  aria-label="Clear topic search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Scrollable Topics List */}
            <div className="kc-topics-list" role="listbox" aria-label="Topics list">
              {!topicSearch && (
                <button
                  type="button"
                  role="option"
                  aria-selected={!selectedTopic}
                  className={`kc-topic-item ${!selectedTopic ? 'active' : ''}`}
                  onClick={() => handleTopicChange('')}
                >
                  <span className="font-medium">All Topics</span>
                  <span className="kc-topic-badge">{totalCatalogCount}</span>
                </button>
              )}

              {filteredTopics.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--kc-text-muted)] font-mono">
                  No matching topics
                </div>
              ) : (
                filteredTopics.map((item) => {
                  const isSelected = selectedTopic && selectedTopic.toLowerCase() === item.topic.toLowerCase();
                  return (
                    <button
                      key={item.topic}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`kc-topic-item ${isSelected ? 'active' : ''}`}
                      onClick={() => handleTopicChange(item.topic)}
                    >
                      <span className="truncate pr-2">{item.topic}</span>
                      <span className="kc-topic-badge">{item.count}</span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
