'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Code2, Tag, Lock, Loader2, Sparkles, X, ChevronDown } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const POPULAR_APPROACH_TAGS = [
  'hash-map',
  'two-pointers',
  'dynamic-programming',
  'binary-search',
  'stack',
  'sliding-window',
  'greedy',
  'tree',
  'graph',
  'dfs-bfs',
  'math',
  'bit-manipulation',
];

export const ChirpInput = ({
  problemId = null,
  onChirpPosted,
  showProblemSelector = false,
  problemsList = [],
  placeholder = 'Share your intuition, why this approach works, complexity analysis (Time/Space), or edge cases...',
}) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [content, setContent] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [approachTag, setApproachTag] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState(problemId || '');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!content.trim() || isPosting) return;

    setIsPosting(true);
    setPostError('');

    try {
      const payload = {
        problem_id: showProblemSelector ? (selectedProblemId || null) : problemId,
        content: content.trim(),
        code_snippet: showCodeInput && codeSnippet.trim() ? codeSnippet.trim() : null,
        approach_tag: approachTag.trim() ? approachTag.trim().toLowerCase() : null,
      };

      const newChirp = await api.postChirp(payload);

      // Reset form
      setContent('');
      setCodeSnippet('');
      setShowCodeInput(false);
      setApproachTag('');
      setShowCustomTagInput(false);

      if (onChirpPosted) {
        onChirpPosted(newChirp);
      }
    } catch (error) {
      console.error('Failed to post chirp:', error);
      setPostError(error.message || 'Failed to post chirp. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  // If user is unauthenticated, show an engaging sign-in prompt card
  if (!isAuthenticated) {
    return (
      <div className="bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] rounded-xl p-4 sm:p-5 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--kc-accent-subtle)] rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-2.5 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-full bg-[var(--kc-accent-subtle)] border border-[var(--kc-accent-border)] flex items-center justify-center text-[var(--kc-accent-text)]">
            <Lock size={18} />
          </div>
          <div>
            <h4 className="text-sm font-semibold font-display text-[var(--kc-text-primary)]">
              Join the Chirps Community
            </h4>
            <p className="text-xs text-[var(--kc-text-muted)] mt-1 leading-relaxed">
              Sign in to share your algorithmic intuition, post complexity breakdowns, and discuss solutions with fellow engineers.
            </p>
          </div>
          <Link
            href="/auth"
            className="mt-1 px-4 py-2 bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] text-xs font-semibold rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <span>Sign In to Post Chirps</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] rounded-xl p-3.5 sm:p-4 shadow-sm transition-colors focus-within:border-[var(--kc-accent)]">
      <form onSubmit={handleSubmit} className="space-y-3">
        {postError && (
          <div className="p-2.5 bg-[var(--kc-error-subtle)] border border-[var(--kc-error-border)] rounded-lg text-xs text-[var(--kc-error-text)]">
            {postError}
          </div>
        )}

        {/* Problem selector (when used on global community feed) */}
        {showProblemSelector && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-[var(--kc-text-muted)] shrink-0">
              Target Challenge:
            </label>
            <div className="relative flex-1">
              <select
                value={selectedProblemId}
                onChange={(e) => setSelectedProblemId(e.target.value)}
                className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--kc-text-primary)] focus:outline-none focus:border-[var(--kc-accent)] appearance-none cursor-pointer"
              >
                <option value="">General Community Discussion (No specific challenge)</option>
                {problemsList.map((prob) => (
                  <option key={prob.id} value={prob.id}>
                    #{String(prob.serial_number || 1).padStart(2, '0')} {prob.title} ({prob.difficulty})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--kc-text-muted)] pointer-events-none"
              />
            </div>
          </div>
        )}

        {/* Main Content Input */}
        <div>
          <textarea
            value={content}
            disabled={isPosting}
            onChange={(e) => {
              setContent(e.target.value);
              if (postError) setPostError('');
            }}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] text-xs sm:text-sm text-[var(--kc-text-primary)] placeholder:text-[var(--kc-text-muted)] rounded-lg p-3 focus:outline-none focus:border-[var(--kc-accent)] transition-colors resize-none disabled:opacity-50"
          />
        </div>

        {/* Optional Code Snippet Area */}
        {showCodeInput && (
          <div className="rounded-lg border border-[var(--kc-border)] bg-[#0B0F17] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#111722] border-b border-[#1E2838] text-[11px] font-mono text-[var(--kc-text-muted)]">
              <div className="flex items-center gap-1.5">
                <Code2 size={13} className="text-[var(--kc-accent)]" />
                <span>Code Snippet (Python, JS, C++, Java, etc.)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCodeInput(false);
                  setCodeSnippet('');
                }}
                className="text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] transition-colors"
                title="Remove code snippet"
              >
                <X size={13} />
              </button>
            </div>
            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="// Paste your formatted code or pseudo-code algorithm here..."
              rows={4}
              className="w-full bg-transparent p-3 font-mono text-xs text-[#E2E8F0] placeholder:text-[#64748B] focus:outline-none resize-y leading-relaxed"
            />
          </div>
        )}

        {/* Approach Tag Pills & Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-[var(--kc-text-muted)] flex items-center gap-1 mr-1 shrink-0">
            <Tag size={11} />
            <span>Tag:</span>
          </span>

          {POPULAR_APPROACH_TAGS.slice(0, 6).map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setApproachTag(approachTag === tag ? '' : tag);
                setShowCustomTagInput(false);
              }}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                approachTag === tag
                  ? 'bg-[var(--kc-accent)] text-white border-[var(--kc-accent)]'
                  : 'bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] border-[var(--kc-border)] hover:border-[var(--kc-border-hover)]'
              }`}
            >
              {tag}
            </button>
          ))}

          {showCustomTagInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={approachTag}
                onChange={(e) => setApproachTag(e.target.value.toLowerCase())}
                placeholder="tag-name"
                className="bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded px-2 py-0.5 text-[11px] font-mono text-[var(--kc-text-primary)] focus:outline-none focus:border-[var(--kc-accent)] w-24"
              />
              <button
                type="button"
                onClick={() => setShowCustomTagInput(false)}
                className="text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] text-xs"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomTagInput(true)}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-dashed border-[var(--kc-border)] text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:border-[var(--kc-border-hover)] transition-colors"
            >
              + custom
            </button>
          )}
        </div>

        {/* Bottom Toolbar: Toggle Code Snippet + Submit Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--kc-border-subtle)]">
          <div>
            {!showCodeInput && (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] border border-[var(--kc-border-subtle)] transition-colors"
              >
                <Code2 size={13} className="text-[var(--kc-accent)]" />
                <span>Add Code Snippet</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPosting || !content.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] font-semibold text-xs font-mono transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPosting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Chirping…</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Post Chirp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
