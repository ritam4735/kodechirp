'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  Code2, 
  Layers, 
  ExternalLink,
  ChevronDown,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { ChirpCard } from '../../components/chirps/ChirpCard';
import { ChirpInput } from '../../components/chirps/ChirpInput';
import { useAuth } from '../../hooks/useAuth';

export default function ChirpsCommunityPage() {
  const { user, isAuthenticated } = useAuth();

  const [chirps, setChirps] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters and sorting
  const [sort, setSort] = useState('popular'); // 'popular' | 'newest' | 'replies'
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Catalog problems for filter dropdown and composer selector
  const [problems, setProblems] = useState([]);

  // Popular tags from backend
  const [popularTags, setPopularTags] = useState([]);

  // Composer visibility
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Load catalog problems for problem filter and composer
  useEffect(() => {
    async function loadProblems() {
      try {
        const res = await api.getProblems('', { limit: 100 });
        if (res && res.problems) {
          setProblems(res.problems);
        }
      } catch (err) {
        console.error('Failed to load problems catalog for chirps:', err);
      }
    }
    loadProblems();
  }, []);

  // Load tags
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await api.getChirpTags();
        if (tags && Array.isArray(tags)) {
          setPopularTags(tags);
        }
      } catch (err) {
        console.error('Failed to load popular tags:', err);
      }
    }
    loadTags();
  }, []);

  // Fetch chirps feed
  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getChirpsFeed({
        sort,
        tag: selectedTag || undefined,
        problem_id: selectedProblemId || undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });

      if (res && res.data) {
        setChirps(res.data);
        setTotalCount(res.total || res.data.length);
      } else {
        setChirps([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch community chirps:', err);
      setError('Unable to load community Chirps. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  }, [sort, selectedTag, selectedProblemId, searchQuery]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleChirpPosted = (newChirp) => {
    setChirps([newChirp, ...chirps]);
    setTotalCount((prev) => prev + 1);
    setIsComposerOpen(false);
  };

  const handleChirpUpdated = (updatedChirp) => {
    setChirps(chirps.map((c) => (c.id === updatedChirp.id ? updatedChirp : c)));
  };

  const handleChirpDeleted = (deletedId) => {
    setChirps(chirps.filter((c) => c.id !== deletedId));
    setTotalCount((prev) => Math.max(0, prev - 1));
  };

  const handleClearFilters = () => {
    setSelectedTag('');
    setSelectedProblemId('');
    setSearchQuery('');
    setSort('popular');
  };

  const hasActiveFilters = Boolean(selectedTag || selectedProblemId || searchQuery.trim() || sort !== 'popular');

  return (
    <div className="min-h-screen bg-[var(--kc-bg)] py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* ── 1. Hero Header & Overview ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--kc-border)]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--kc-accent-subtle)] border border-[var(--kc-accent-border)] text-[var(--kc-accent-text)] text-xs font-mono font-medium mb-3">
            <MessageSquare size={13} />
            <span>KodeChirp Peer Explanations</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[var(--kc-text-primary)]">
            Community Chirps
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[var(--kc-text-secondary)] max-w-2xl leading-relaxed">
            Where developers deconstruct algorithmic problems, debate mental models, compare space-time complexity trade-offs, and learn together.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/questions"
            className="px-3.5 py-2 rounded-lg bg-[var(--kc-surface)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] text-xs font-mono text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] transition-colors inline-flex items-center gap-1.5"
          >
            <Layers size={13} className="text-[var(--kc-accent)]" />
            <span>Problem Catalog</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsComposerOpen(!isComposerOpen)}
            className="px-4 py-2 rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] text-xs font-mono font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            {isComposerOpen ? (
              <>
                <X size={14} />
                <span>Close Composer</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Post a Chirp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 2. Expandable Global Chirp Composer ── */}
      {isComposerOpen && (
        <div className="my-6 p-4 sm:p-5 rounded-2xl bg-[var(--kc-surface)] border border-[var(--kc-accent-border)] shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--kc-border)]">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--kc-accent)]" />
              <h2 className="text-sm font-bold font-display text-[var(--kc-text-primary)]">
                Create a Community Chirp
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsComposerOpen(false)}
              className="text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] p-1 rounded"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          <ChirpInput
            showProblemSelector={true}
            problemsList={problems}
            onChirpPosted={handleChirpPosted}
            placeholder="Break down your intuition (e.g. why monotonic queue beats binary search), write proof invariants, or share complexity analysis..."
          />
        </div>
      )}

      {/* ── 3. Filters, Problem Selector, Search & Sorting Bar ── */}
      <div className="my-6 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kc-text-muted)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chirps by content, author, problem, or topic..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg text-xs text-[var(--kc-text-primary)] placeholder:text-[var(--kc-text-muted)] focus:outline-none focus:border-[var(--kc-accent)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Problem Selector Dropdown Filter */}
          <div className="relative min-w-[220px]">
            <select
              value={selectedProblemId}
              onChange={(e) => setSelectedProblemId(e.target.value)}
              className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg px-3 py-2 text-xs text-[var(--kc-text-primary)] focus:outline-none focus:border-[var(--kc-accent)] appearance-none cursor-pointer pr-8 truncate font-mono"
            >
              <option value="">All Challenges</option>
              {problems.map((prob) => (
                <option key={prob.id} value={prob.id}>
                  #{String(prob.serial_number || 1).padStart(2, '0')} {prob.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--kc-text-muted)] pointer-events-none"
            />
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg p-0.5 text-xs font-mono shrink-0">
            <button
              type="button"
              onClick={() => setSort('popular')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sort === 'popular'
                  ? 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
              }`}
            >
              Popular
            </button>
            <button
              type="button"
              onClick={() => setSort('newest')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sort === 'newest'
                  ? 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => setSort('replies')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                sort === 'replies'
                  ? 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
              }`}
            >
              Most Discussed
            </button>
          </div>

          <button
            type="button"
            onClick={fetchFeed}
            className="p-2 bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:border-[var(--kc-border-hover)] transition-colors shrink-0"
            title="Reload feed"
            aria-label="Reload feed"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Approach Tag Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-mono text-[var(--kc-text-muted)] flex items-center gap-1 mr-1 shrink-0">
            <Filter size={11} /> Topic:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag('')}
            className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
              !selectedTag
                ? 'bg-[var(--kc-accent)] text-white border-[var(--kc-accent)] font-semibold'
                : 'bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] border-[var(--kc-border)] hover:border-[var(--kc-border-hover)]'
            }`}
          >
            All Topics
          </button>

          {popularTags.map(({ approach_tag, count }) => (
            <button
              key={approach_tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === approach_tag ? '' : approach_tag)}
              className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                selectedTag === approach_tag
                  ? 'bg-[var(--kc-accent)] text-white border-[var(--kc-accent)] font-semibold'
                  : 'bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] border-[var(--kc-border)] hover:border-[var(--kc-border-hover)]'
              }`}
            >
              <span>{approach_tag}</span>
              <span className="text-[9px] opacity-70">({count})</span>
            </button>
          ))}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] font-mono text-[var(--kc-error-text)] hover:underline ml-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Main Chirps Feed ── */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-[var(--kc-text-muted)] uppercase tracking-wider">
              Fetching community Chirps…
            </span>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl border border-[var(--kc-error-border)] bg-[var(--kc-error-subtle)] text-center space-y-3">
            <AlertCircle size={28} className="text-[var(--kc-error)] mx-auto" />
            <h3 className="text-sm font-semibold text-[var(--kc-error-text)]">{error}</h3>
            <button
              type="button"
              onClick={fetchFeed}
              className="px-4 py-1.5 rounded-lg bg-[var(--kc-surface)] border border-[var(--kc-border)] text-xs font-mono text-[var(--kc-text-primary)] hover:border-[var(--kc-border-hover)] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : chirps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--kc-border)] bg-[var(--kc-surface)] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] flex items-center justify-center mx-auto text-[var(--kc-accent)]">
              <Sparkles size={20} />
            </div>
            <h3 className="text-base font-semibold font-display text-[var(--kc-text-primary)]">
              No Chirps Found
            </h3>
            <p className="text-xs text-[var(--kc-text-muted)] max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'No community explanations matched your active filters or search terms. Try clearing your filters.'
                : 'No Chirps have been posted yet. Be the first engineer to share your intuition and solution breakdown!'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 px-4 py-2 bg-[var(--kc-surface-subtle)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] rounded-lg text-xs font-mono text-[var(--kc-text-primary)] transition-colors"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="mt-2 px-4 py-2 bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-white rounded-lg text-xs font-mono font-semibold transition-colors"
              >
                Post the First Chirp
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--kc-text-muted)] px-1">
              <span>Showing {chirps.length} of {totalCount} discussions</span>
              {selectedTag && <span>Filtered by: #{selectedTag}</span>}
            </div>

            {chirps.map((chirp) => (
              <ChirpCard
                key={chirp.id}
                chirp={chirp}
                showProblemBadge={true}
                onChirpUpdated={handleChirpUpdated}
                onChirpDeleted={handleChirpDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
