'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Layers, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';

function DifficultyBadge({ difficulty }) {
  if (difficulty === 'Easy') return <span className="kc-diff-badge kc-diff-easy text-[10px] py-0.5 px-1.5">Easy</span>;
  if (difficulty === 'Hard') return <span className="kc-diff-badge kc-diff-hard text-[10px] py-0.5 px-1.5">Hard</span>;
  return <span className="kc-diff-badge kc-diff-medium text-[10px] py-0.5 px-1.5">Med</span>;
}

export function QuestionNavigatorDrawer({ 
  isOpen, 
  onClose, 
  currentProblem, 
  onSelectProblem 
}) {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const activeItemRef = useRef(null);
  const listContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch all published questions once on mount or open
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setIsLoading(true);
      try {
        const res = await api.getProblems('', { limit: 250 });
        if (isMounted && res?.problems) {
          // Sort strictly by permanent serial_number
          const sorted = [...res.problems].sort((a, b) => (a.serial_number || 0) - (b.serial_number || 0));
          setQuestions(sorted);
        }
      } catch (err) {
        console.error('Failed to load questions for navigator', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (isOpen && questions.length === 0) {
      loadCatalog();
    }
    return () => { isMounted = false; };
  }, [isOpen, questions.length]);

  // Focus search input and scroll to current question when drawer opens
  useEffect(() => {
    if (isOpen) {
      // Auto-scroll active item into view
      const timer = setTimeout(() => {
        if (activeItemRef.current) {
          activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentProblem?.slug]);

  // Escape key listener to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered list based on search and difficulty
  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (difficultyFilter) {
      result = result.filter((q) => q.difficulty === difficultyFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) => {
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchNum = String(item.serial_number || '').includes(q);
        const matchSlug = item.slug?.toLowerCase().includes(q);
        return matchTitle || matchNum || matchSlug;
      });
    }
    return result;
  }, [questions, search, difficultyFilter]);

  // Boundary checks for Prev / Next navigation
  const prevProblem = currentProblem?.prevProblem;
  const nextProblem = currentProblem?.nextProblem;

  if (!isOpen) return null;

  return (
    <div 
      className="kc-question-drawer-overlay absolute inset-0 z-40 bg-[var(--kc-surface)] flex flex-col h-full w-full overflow-hidden border-r border-[var(--kc-border)] shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Question Navigator"
    >
      {/* Drawer Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-[var(--kc-border)] bg-[var(--kc-surface)] shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--kc-accent-subtle)] border border-[var(--kc-accent-border)] flex items-center justify-center text-[var(--kc-accent)]">
              <Layers size={14} aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-[var(--kc-text-primary)] font-display flex items-center gap-1.5">
                <span>Challenge Navigator</span>
                <span className="text-[10px] font-mono font-medium text-[var(--kc-text-muted)] bg-[var(--kc-surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--kc-border-subtle)]">
                  {questions.length || '...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Quick Prev / Next Buttons */}
            <button
              type="button"
              disabled={!prevProblem}
              onClick={() => prevProblem && onSelectProblem(prevProblem)}
              className="p-1.5 rounded-md text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={prevProblem ? `Previous: #${prevProblem.serial_number} ${prevProblem.title}` : 'First question'}
              aria-label="Go to previous question"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={!nextProblem}
              onClick={() => nextProblem && onSelectProblem(nextProblem)}
              className="p-1.5 rounded-md text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={nextProblem ? `Next: #${nextProblem.serial_number} ${nextProblem.title}` : 'Last question'}
              aria-label="Go to next question"
            >
              <ChevronRight size={16} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)] transition-colors ml-1"
              aria-label="Close navigator"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative flex items-center w-full">
          <Search size={13} className="absolute left-2.5 text-[var(--kc-text-muted)] pointer-events-none" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by title or #number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--kc-surface-subtle)] border border-[var(--kc-border-subtle)] focus:border-[var(--kc-accent)] rounded-md pl-8 pr-7 py-1.5 text-xs text-[var(--kc-text-primary)] placeholder-[var(--kc-text-muted)] focus:outline-none transition-all font-sans"
            aria-label="Search questions in navigator"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] p-0.5 text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar" role="tablist" aria-label="Filter by difficulty">
          {[
            { label: 'All', value: '' },
            { label: 'Easy', value: 'Easy' },
            { label: 'Medium', value: 'Medium' },
            { label: 'Hard', value: 'Hard' },
          ].map(({ label, value }) => {
            const isActive = difficultyFilter === value;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setDifficultyFilter(value)}
                className={`py-1 px-2.5 rounded text-[11px] font-mono transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] font-semibold border border-[var(--kc-border)] shadow-xs'
                    : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface-subtle)]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Independently Scrollable Questions List */}
      <div 
        ref={listContainerRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-1"
        role="listbox"
        aria-label="Questions list in serial order"
      >
        {isLoading && questions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-5 h-5 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-mono text-[var(--kc-text-muted)]">Loading questions…</span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-[var(--kc-text-muted)] flex flex-col items-center gap-2">
            <span>No challenges match your filter.</span>
            {(search || difficultyFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setDifficultyFilter(''); }}
                className="text-xs text-[var(--kc-accent)] hover:underline font-mono"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isCurrent = currentProblem?.slug === q.slug || currentProblem?.id === q.id;
            return (
              <button
                key={q.id || q.slug}
                ref={isCurrent ? activeItemRef : null}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => onSelectProblem(q)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between gap-2.5 group cursor-pointer ${
                  isCurrent
                    ? 'bg-[var(--kc-accent-subtle)] border-[var(--kc-accent-border)] shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-[var(--kc-surface-subtle)] hover:border-[var(--kc-border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Solved Status Indicator */}
                  {q.is_solved ? (
                    <CheckCircle2 size={13} className="text-[var(--kc-success)] shrink-0" title="Solved" aria-label="Solved" />
                  ) : (
                    <Circle size={10} className="text-[var(--kc-border)] shrink-0" aria-hidden="true" />
                  )}

                  {/* Permanent Question Number */}
                  <span className={`font-mono text-xs font-bold shrink-0 ${
                    isCurrent ? 'text-[var(--kc-accent)]' : 'text-[var(--kc-text-muted)] group-hover:text-[var(--kc-text-primary)]'
                  }`}>
                    #{String(q.serial_number || '').padStart(2, '0')}
                  </span>

                  {/* Title */}
                  <span className={`text-xs truncate font-medium ${
                    isCurrent ? 'text-[var(--kc-text-primary)] font-semibold' : 'text-[var(--kc-text-secondary)] group-hover:text-[var(--kc-text-primary)]'
                  }`}>
                    {q.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isCurrent && (
                    <span className="text-[9.5px] font-mono uppercase tracking-wider text-[var(--kc-accent)] bg-[var(--kc-surface)] px-1.5 py-0.5 rounded font-semibold border border-[var(--kc-accent-border)] hidden sm:inline-block">
                      Current
                    </span>
                  )}
                  <DifficultyBadge difficulty={q.difficulty} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Drawer Footer — Link to Full Repository */}
      <div className="p-3 border-t border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] shrink-0 flex items-center justify-between text-xs">
        <span className="text-[11px] font-mono text-[var(--kc-text-muted)]">
          {filteredQuestions.length} of {questions.length} visible
        </span>
        <Link
          href="/questions"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--kc-accent)] hover:underline"
        >
          <span>All Questions</span>
          <ArrowRight size={11} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
