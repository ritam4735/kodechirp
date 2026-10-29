'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRelativeTime, formatDate } from '../../lib/helpers';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { 
  Heart, 
  MessageSquare, 
  Code2, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  CornerDownRight, 
  Tag, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Lock
} from 'lucide-react';

export const ChirpCard = ({
  chirp,
  onChirpUpdated,
  onChirpDeleted,
  showProblemBadge = false,
  isReply = false,
}) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [upvoted, setUpvoted] = useState(Boolean(chirp.is_upvoted));
  const [upvoteCount, setUpvoteCount] = useState(chirp.upvote_count || 0);
  const [isUpvoting, setIsUpvoting] = useState(false);

  // Threaded replies state
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replyCount, setReplyCount] = useState(chirp.reply_count || 0);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(chirp.content || '');
  const [editCodeSnippet, setEditCodeSnippet] = useState(chirp.code_snippet || '');
  const [editTag, setEditTag] = useState(chirp.approach_tag || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Code snippet toggle & copy
  const [copiedCode, setCopiedCode] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);

  const isOwner = user && (user.id === chirp.user_id || (user.username && user.username === chirp.author));
  const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator');
  const canModify = isOwner || isAdmin;

  // Toggle Upvote
  const handleToggleUpvote = async () => {
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (isUpvoting) return;

    // Optimistic UI update
    const nextUpvoted = !upvoted;
    const nextCount = nextUpvoted ? upvoteCount + 1 : Math.max(0, upvoteCount - 1);
    setUpvoted(nextUpvoted);
    setUpvoteCount(nextCount);
    setIsUpvoting(true);

    try {
      const res = await api.upvoteChirp(chirp.id);
      if (res && res.success) {
        setUpvoted(res.upvoted);
        setUpvoteCount(res.upvote_count);
      }
    } catch (err) {
      console.error('Failed to toggle upvote:', err);
      // Revert on error
      setUpvoted(!nextUpvoted);
      setUpvoteCount(upvoteCount);
    } finally {
      setIsUpvoting(false);
    }
  };

  // Toggle and load replies
  const handleToggleReplies = async () => {
    if (!showReplies && !repliesLoaded) {
      setIsLoadingReplies(true);
      try {
        const data = await api.getChirpReplies(chirp.id);
        setReplies(data || []);
        setRepliesLoaded(true);
      } catch (err) {
        console.error('Failed to load replies:', err);
      } finally {
        setIsLoadingReplies(false);
      }
    }
    setShowReplies(!showReplies);
  };

  // Submit threaded reply
  const handleSubmitReply = async (e) => {
    e?.preventDefault();
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (!replyContent.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    setReplyError('');
    try {
      const newReply = await api.postChirp({
        parent_id: chirp.id,
        problem_id: chirp.problem_id,
        content: replyContent.trim(),
      });

      setReplies([...replies, newReply]);
      setReplyCount((prev) => prev + 1);
      setReplyContent('');
      setShowReplies(true);
      setRepliesLoaded(true);
    } catch (err) {
      console.error('Failed to post reply:', err);
      setReplyError(err.message || 'Failed to submit reply. Please try again.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSavingEdit) return;

    setIsSavingEdit(true);
    setEditError('');
    try {
      const updated = await api.updateChirp(chirp.id, {
        content: editContent.trim(),
        code_snippet: editCodeSnippet.trim() || null,
        approach_tag: editTag.trim() || null,
      });

      setIsEditing(false);
      if (onChirpUpdated) {
        onChirpUpdated(updated);
      }
    } catch (err) {
      console.error('Failed to update chirp:', err);
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete chirp
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteChirp(chirp.id);
      if (onChirpDeleted) {
        onChirpDeleted(chirp.id);
      }
    } catch (err) {
      console.error('Failed to delete chirp:', err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopyCode = async () => {
    if (!chirp.code_snippet) return;
    try {
      await navigator.clipboard.writeText(chirp.code_snippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error('Failed to copy code', e);
    }
  };

  // Generate consistent avatar background and initials
  const authorInitials = (chirp.authorName || chirp.author || 'U')
    .slice(0, 2)
    .toUpperCase();

  const codeSnippetLines = chirp.code_snippet ? chirp.code_snippet.split('\n') : [];
  const isLongCode = codeSnippetLines.length > 8;

  return (
    <div
      className={`rounded-lg transition-all duration-200 border ${
        isReply
          ? 'bg-[var(--kc-surface)] border-[var(--kc-border-subtle)] p-3 text-xs'
          : 'bg-[var(--kc-surface-subtle)] border-[var(--kc-border)] hover:border-[var(--kc-border-hover)] p-4 shadow-sm'
      }`}
    >
      {/* ── Top Header: Author, Problem Badge, Timestamps, Role ── */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--kc-surface-elevated)] border border-[var(--kc-border)] flex items-center justify-center font-mono text-[11px] font-semibold text-[var(--kc-accent-text)] shrink-0 overflow-hidden shadow-inner">
            {chirp.avatar_url ? (
              <img
                src={chirp.avatar_url}
                alt={chirp.author}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{authorInitials}</span>
            )}
          </div>

          {/* User metadata */}
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-[var(--kc-text-primary)] font-display truncate">
                {chirp.authorName || chirp.author}
              </span>
              <span className="text-[11px] text-[var(--kc-text-muted)] font-mono">
                @{chirp.author}
              </span>
              {chirp.user_role && chirp.user_role !== 'user' && (
                <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-[var(--kc-accent-subtle)] text-[var(--kc-accent-text)] border border-[var(--kc-accent-border)]">
                  {chirp.user_role}
                </span>
              )}
            </div>

            <span
              className="text-[10px] text-[var(--kc-text-muted)] font-mono"
              title={chirp.createdAt ? formatDate(chirp.createdAt) : ''}
            >
              {formatRelativeTime(chirp.createdAt)}
              {chirp.updatedAt && chirp.updatedAt !== chirp.createdAt && (
                <span className="ml-1 opacity-75">(edited)</span>
              )}
            </span>
          </div>
        </div>

        {/* Right side: Associated Problem Badge or Edit/Delete Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {showProblemBadge && chirp.problem_title && (
            <Link
              href={`/problems/${chirp.problem_slug || chirp.problem_id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-[var(--kc-surface)] hover:bg-[var(--kc-surface-hover)] border border-[var(--kc-border)] text-[var(--kc-text-secondary)] hover:text-[var(--kc-accent)] transition-colors group"
            >
              <span className="text-[var(--kc-accent)] font-semibold">
                #{String(chirp.problem_serial_number || 1).padStart(2, '0')}
              </span>
              <span className="truncate max-w-[130px] sm:max-w-[200px]">
                {chirp.problem_title}
              </span>
              <ExternalLink size={10} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {chirp.approach_tag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--kc-accent-subtle)] text-[var(--kc-accent-text)] border border-[var(--kc-accent-border)]">
              <Tag size={10} aria-hidden="true" />
              <span>{chirp.approach_tag}</span>
            </span>
          )}

          {/* Edit / Delete menu for author/admin */}
          {canModify && !isEditing && (
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)] transition-colors"
                title="Edit Chirp"
                aria-label="Edit Chirp"
              >
                <Edit3 size={12} />
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-error)] hover:bg-[var(--kc-error-subtle)] transition-colors"
                title="Delete Chirp"
                aria-label="Delete Chirp"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal / Banner */}
      {showDeleteConfirm && (
        <div className="mb-3 p-2.5 rounded-lg bg-[var(--kc-error-subtle)] border border-[var(--kc-error-border)] flex items-center justify-between gap-2 text-xs">
          <span className="text-[var(--kc-error-text)] font-medium">
            Are you sure you want to delete this Chirp?
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="px-2.5 py-1 bg-[var(--kc-error)] text-white font-semibold rounded text-[11px] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 rounded text-[11px] text-[var(--kc-text-secondary)] hover:bg-[var(--kc-surface)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ── */}
      {isEditing ? (
        <div className="space-y-2.5 my-2">
          {editError && (
            <div className="p-2 rounded bg-[var(--kc-error-subtle)] border border-[var(--kc-error-border)] text-xs text-[var(--kc-error-text)]">
              {editError}
            </div>
          )}
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] focus:border-[var(--kc-accent)] rounded-lg p-2.5 text-xs sm:text-sm text-[var(--kc-text-primary)] placeholder:text-[var(--kc-text-muted)] focus:outline-none transition-colors"
            placeholder="Edit your explanation or intuition..."
          />

          <div className="flex gap-2">
            <input
              type="text"
              value={editTag}
              onChange={(e) => setEditTag(e.target.value)}
              placeholder="Approach tag (e.g. hash-map)"
              className="flex-1 bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--kc-text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
            />
          </div>

          <div>
            <textarea
              value={editCodeSnippet}
              onChange={(e) => setEditCodeSnippet(e.target.value)}
              rows={4}
              placeholder="Code snippet (optional)..."
              className="w-full bg-[#0B0F17] font-mono text-xs text-[#E2E8F0] border border-[var(--kc-border)] rounded-lg p-2.5 focus:outline-none focus:border-[var(--kc-accent)]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-xs rounded text-[var(--kc-text-muted)] hover:text-[var(--kc-text-primary)] hover:bg-[var(--kc-surface)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingEdit || !editContent.trim()}
              onClick={handleSaveEdit}
              className="px-3 py-1 text-xs font-semibold rounded bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-[var(--kc-on-primary)] transition-colors disabled:opacity-50"
            >
              {isSavingEdit ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs sm:text-sm text-[var(--kc-text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">
            {chirp.content}
          </p>

          {/* Code Snippet Box */}
          {chirp.code_snippet && (
            <div className="mt-2.5 rounded-lg border border-[var(--kc-border)] bg-[#0B0F17] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#111722] border-b border-[#1E2838] text-[11px] font-mono text-[var(--kc-text-muted)]">
                <div className="flex items-center gap-1.5">
                  <Code2 size={12} className="text-[var(--kc-accent)]" />
                  <span>Algorithm Snippet</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLongCode && (
                    <button
                      type="button"
                      onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                      className="hover:text-[var(--kc-text-primary)] transition-colors flex items-center gap-1 text-[10px]"
                    >
                      {isCodeExpanded ? (
                        <>
                          <ChevronUp size={11} /> Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown size={11} /> Expand ({codeSnippetLines.length} lines)
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="hover:text-[var(--kc-text-primary)] transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
                    title="Copy code snippet"
                  >
                    {copiedCode ? (
                      <>
                        <Check size={11} className="text-[var(--kc-success)]" />
                        <span className="text-[var(--kc-success)]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`p-3 font-mono text-xs text-[#E2E8F0] overflow-x-auto leading-relaxed custom-scrollbar ${
                  isLongCode && !isCodeExpanded ? 'max-h-44 overflow-y-hidden relative' : ''
                }`}
              >
                <pre className="m-0 font-mono">
                  <code>{chirp.code_snippet}</code>
                </pre>
                {isLongCode && !isCodeExpanded && (
                  <div
                    className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0B0F17] to-transparent cursor-pointer flex items-end justify-center pb-1 text-[11px] text-[var(--kc-accent)] font-mono hover:underline"
                    onClick={() => setIsCodeExpanded(true)}
                  >
                    Click to view full code ({codeSnippetLines.length} lines)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Engagement Footer (Upvote, Reply Count & Button) ── */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[var(--kc-border-subtle)] text-xs text-[var(--kc-text-muted)]">
        <div className="flex items-center gap-2">
          {/* Upvote Button */}
          <button
            type="button"
            onClick={handleToggleUpvote}
            disabled={isUpvoting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-all ${
              upvoted
                ? 'bg-[var(--kc-accent-subtle)] text-[var(--kc-accent-text)] border border-[var(--kc-accent-border)] font-semibold'
                : 'hover:bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] border border-transparent'
            }`}
            title={isAuthenticated ? 'Upvote this Chirp' : 'Sign in to upvote'}
            aria-label={`Upvote chirp, currently ${upvoteCount} upvotes`}
          >
            <Heart
              size={13}
              className={`transition-transform duration-200 ${
                upvoted ? 'fill-[var(--kc-accent)] text-[var(--kc-accent)] scale-110' : ''
              }`}
            />
            <span>{upvoteCount}</span>
          </button>

          {/* Reply / Thread toggle button (only on top-level chirps) */}
          {!isReply && (
            <button
              type="button"
              onClick={handleToggleReplies}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-[var(--kc-surface)] text-[var(--kc-text-secondary)] hover:text-[var(--kc-text-primary)] transition-colors font-mono text-xs"
              title="View or add replies"
              aria-label={`Threaded discussion, ${replyCount} replies`}
            >
              <MessageSquare size={13} />
              <span>{replyCount}</span>
              <span className="hidden sm:inline">
                {replyCount === 1 ? 'Reply' : 'Replies'}
              </span>
              {showReplies ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {!isReply && (
          <button
            type="button"
            onClick={() => {
              if (!showReplies) handleToggleReplies();
            }}
            className="text-[11px] font-mono text-[var(--kc-accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <CornerDownRight size={11} />
            <span>Reply</span>
          </button>
        )}
      </div>

      {/* ── Threaded Discussion Area ── */}
      {!isReply && showReplies && (
        <div className="mt-3.5 pt-3 border-t border-[var(--kc-border-subtle)] space-y-3">
          {/* Reply list */}
          {isLoadingReplies ? (
            <div className="py-3 text-center text-xs font-mono text-[var(--kc-text-muted)] flex items-center justify-center gap-2">
              <Loader2 size={13} className="animate-spin text-[var(--kc-accent)]" />
              <span>Loading thread replies…</span>
            </div>
          ) : replies.length === 0 ? (
            <div className="text-[11px] font-mono text-[var(--kc-text-muted)] italic px-2 py-1">
              No replies yet. Start the conversation below.
            </div>
          ) : (
            <div className="space-y-2.5 border-l-2 border-[var(--kc-border)] pl-3 sm:pl-4">
              {replies.map((reply) => (
                <ChirpCard
                  key={reply.id}
                  chirp={reply}
                  isReply={true}
                  onChirpDeleted={(deletedId) => {
                    setReplies(replies.filter((r) => r.id !== deletedId));
                    setReplyCount((prev) => Math.max(0, prev - 1));
                  }}
                  onChirpUpdated={(updatedReply) => {
                    setReplies(replies.map((r) => (r.id === updatedReply.id ? updatedReply : r)));
                  }}
                />
              ))}
            </div>
          )}

          {/* Inline Reply Composer */}
          <div className="border-l-2 border-[var(--kc-accent)] pl-3 sm:pl-4 mt-2">
            {!isAuthenticated ? (
              <div className="p-2.5 rounded-lg bg-[var(--kc-surface)] border border-[var(--kc-border)] text-xs text-center flex items-center justify-between gap-2">
                <span className="text-[var(--kc-text-muted)] flex items-center gap-1.5 font-mono text-[11px]">
                  <Lock size={12} className="text-[var(--kc-accent)]" />
                  Sign in to reply to this Chirp
                </span>
                <Link
                  href="/auth"
                  className="px-2.5 py-1 bg-[var(--kc-accent)] hover:bg-[var(--kc-accent-hover)] text-white text-[11px] font-semibold rounded transition-colors"
                >
                  Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmitReply} className="space-y-2">
                {replyError && (
                  <div className="p-2 bg-[var(--kc-error-subtle)] border border-[var(--kc-error-border)] rounded text-[11px] text-[var(--kc-error-text)]">
                    {replyError}
                  </div>
                )}
                <div className="relative">
                  <textarea
                    value={replyContent}
                    onChange={(e) => {
                      setReplyContent(e.target.value);
                      if (replyError) setReplyError('');
                    }}
                    placeholder={`Reply to @${chirp.author}...`}
                    disabled={isSubmittingReply}
                    rows={2}
                    className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] rounded-lg p-2.5 pr-10 text-xs text-[var(--kc-text-primary)] placeholder:text-[var(--kc-text-muted)] focus:outline-none focus:border-[var(--kc-accent)] transition-colors resize-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReply || !replyContent.trim()}
                    className="absolute right-2 bottom-2.5 p-1.5 text-[var(--kc-accent)] hover:text-[var(--kc-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Send reply"
                    aria-label="Send reply"
                  >
                    {isSubmittingReply ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
