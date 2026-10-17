import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export const ChirpInput = ({ problemId, onChirpPosted }) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const { user, isAuthenticated } = useAuth();

  const handleSubmit = async () => {
    if (!content.trim() || !isAuthenticated || isPosting) return;
    
    setIsPosting(true);
    setPostError('');
    try {
      const newChirp = await api.postChirp(problemId, content, user?.name || 'Anonymous');
      setContent('');
      onChirpPosted(newChirp);
    } catch (error) {
      console.error('Failed to post chirp', error);
      setPostError(error.message || 'Failed to post chirp. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] rounded-lg p-3 text-center text-xs text-[var(--kc-text-secondary)] mb-4">
        Log in to share your algorithmic deconstruction with other engineers.
      </div>
    );
  }

  return (
    <div className="mb-4">
      {postError && (
        <div className="mb-2 p-2 bg-[var(--kc-error-subtle)] border border-[var(--kc-error-border)] rounded-md text-xs text-[var(--kc-error)]">
          {postError}
        </div>
      )}
      <div className="relative">
        <textarea
          value={content}
          disabled={isPosting}
          onChange={(e) => {
            setContent(e.target.value);
            if (postError) setPostError('');
          }}
          placeholder="Share your reasoning, complexity analysis, or implementation caveats..."
          className="w-full bg-[var(--kc-surface)] border border-[var(--kc-border)] text-xs sm:text-sm text-[var(--kc-text-primary)] placeholder:text-[var(--kc-text-muted)] rounded-lg p-3 pr-10 focus:outline-none focus:border-[var(--kc-accent)] transition-colors resize-none h-20 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={isPosting || !content.trim()}
          className="absolute right-2.5 bottom-3 text-[var(--kc-accent)] hover:text-[var(--kc-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Post chirp"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};
