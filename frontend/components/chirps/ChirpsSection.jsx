'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChirpCard } from './ChirpCard';
import { ChirpInput } from './ChirpInput';
import { api } from '../../lib/api';
import { MessageSquare, ArrowUpDown, Filter, Sparkles, RefreshCw, Tag, AlertCircle } from 'lucide-react';

export const ChirpsSection = ({ problemId }) => {
  const [chirps, setChirps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('popular');
  const [selectedTag, setSelectedTag] = useState('');

  const fetchChirps = useCallback(async () => {
    if (!problemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getChirps({
        problem_id: problemId,
        sort,
        tag: selectedTag || undefined,
      });
      setChirps(data || []);
    } catch (err) {
      console.error('Failed to fetch chirps', err);
      setError('Unable to load Chirps for this challenge.');
    } finally {
      setIsLoading(false);
    }
  }, [problemId, sort, selectedTag]);

  useEffect(() => {
    fetchChirps();
  }, [fetchChirps]);

  const handleChirpPosted = (newChirp) => {
    setChirps([newChirp, ...chirps]);
  };

  const handleChirpUpdated = (updatedChirp) => {
    setChirps(chirps.map((c) => (c.id === updatedChirp.id ? updatedChirp : c)));
  };

  const handleChirpDeleted = (deletedId) => {
    setChirps(chirps.filter((c) => c.id !== deletedId));
  };

  // Collect distinct approach tags present in this problem's chirps
  const availableTags = Array.from(
    new Set(chirps.map((c) => c.approach_tag).filter(Boolean))
  );

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--kc-border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--kc-accent-subtle)] border border-[var(--kc-accent-border)] flex items-center justify-center text-[var(--kc-accent-text)]">
            <MessageSquare size={13} />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-display text-[var(--kc-text-primary)]">
              Chirps
            </h3>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--kc-accent-subtle)] text-[var(--kc-accent-text)] border border-[var(--kc-accent-border)]">
              {chirps.length} {chirps.length === 1 ? 'Chirp' : 'Chirps'}
            </span>
          </div>
        </div>

        {/* Sorting and Filter controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSort('popular')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
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
              className={`px-2.5 py-1 rounded-md transition-colors ${
                sort === 'newest'
                  ? 'bg-[var(--kc-surface-subtle)] text-[var(--kc-text-primary)] font-semibold shadow-xs'
                  : 'text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)]'
              }`}
            >
              Newest
            </button>
          </div>

          <button
            type="button"
            onClick={fetchChirps}
            title="Refresh discussions"
            aria-label="Refresh discussions"
            className="p-1.5 rounded-lg border border-[var(--kc-border)] bg-[var(--kc-surface)] text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:border-[var(--kc-border-hover)] transition-colors"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Subtitle / Explanatory hint ── */}
      <p className="text-xs text-[var(--kc-text-secondary)] leading-relaxed">
        Peer-crafted intuition breakdowns, complexity trade-offs, and conceptual walkthroughs for this challenge.
      </p>

      {/* ── Tag filters (if problem has tagged chirps) ── */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] font-mono text-[var(--kc-text-muted)] flex items-center gap-1">
            <Filter size={11} /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTag('')}
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
              !selectedTag
                ? 'bg-[var(--kc-accent)] text-white border-[var(--kc-accent)] font-semibold'
                : 'bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] border-[var(--kc-border)] hover:border-[var(--kc-border-hover)]'
            }`}
          >
            All
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                selectedTag === tag
                  ? 'bg-[var(--kc-accent)] text-white border-[var(--kc-accent)] font-semibold'
                  : 'bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] border-[var(--kc-border)] hover:border-[var(--kc-border-hover)]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Chirp Composer ── */}
      <ChirpInput
        problemId={problemId}
        onChirpPosted={handleChirpPosted}
        placeholder="Share your intuition (e.g. why monotonic stack beats two pointers), complexity trade-offs, or questions..."
      />

      {/* ── Chirps Feed ── */}
      {isLoading ? (
        <div className="py-8 text-center text-xs font-mono text-[var(--kc-text-muted)] flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
          <span>Loading Chirps…</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-[var(--kc-error-border)] bg-[var(--kc-error-subtle)] text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--kc-error-text)] font-semibold">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchChirps}
            className="text-xs font-mono text-[var(--kc-accent)] hover:underline"
          >
            Try reloading discussions
          </button>
        </div>
      ) : chirps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--kc-border)] bg-[var(--kc-surface-subtle)] p-6 text-center space-y-2">
          <div className="w-9 h-9 rounded-full bg-[var(--kc-surface)] border border-[var(--kc-border)] flex items-center justify-center mx-auto text-[var(--kc-accent)]">
            <Sparkles size={16} />
          </div>
          <div className="text-xs font-semibold text-[var(--kc-text-primary)]">
            No Chirps posted yet for this challenge
          </div>
          <p className="text-xs text-[var(--kc-text-muted)] max-w-sm mx-auto leading-relaxed">
            Be the first to share your algorithmic reasoning, space/time complexity trade-offs, or intuitive breakthrough with the community.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {chirps.map((chirp) => (
            <ChirpCard
              key={chirp.id}
              chirp={chirp}
              onChirpUpdated={handleChirpUpdated}
              onChirpDeleted={handleChirpDeleted}
              showProblemBadge={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
