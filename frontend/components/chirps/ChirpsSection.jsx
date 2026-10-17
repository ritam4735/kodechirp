import { useState, useEffect, useCallback } from 'react';
import { ChirpCard } from './ChirpCard';
import { ChirpInput } from './ChirpInput';
import { api } from '../../lib/api';
import { MessageCircle } from 'lucide-react';

export const ChirpsSection = ({ problemId }) => {
  const [chirps, setChirps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChirps = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getChirps(problemId);
      setChirps(data || []);
    } catch (err) {
      console.error('Failed to fetch chirps', err);
      setError('Unable to load community chirps.');
    } finally {
      setIsLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    if (problemId) {
      fetchChirps();
    }
  }, [problemId, fetchChirps]);

  const handleChirpPosted = (newChirp) => {
    setChirps([newChirp, ...chirps]);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={15} className="text-[var(--kc-accent)]" />
        <h3 className="text-sm font-bold font-display text-[var(--kc-text-primary)]">Community Discussions</h3>
        <span className="bg-[var(--kc-accent-subtle)] text-[var(--kc-accent)] border border-[rgba(59,130,246,0.2)] text-[10px] font-mono px-2 py-0.5 rounded-full ml-1.5">
          {chirps.length}
        </span>
      </div>

      <ChirpInput problemId={problemId} onChirpPosted={handleChirpPosted} />

      {isLoading ? (
        <div className="text-xs font-mono text-[var(--kc-text-muted)] text-center py-6 flex items-center justify-center gap-2">
          <div className="w-3.5 h-3.5 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
          <span>Loading discussions…</span>
        </div>
      ) : error ? (
        <div className="text-xs text-[#EF4444] text-center py-4 border border-[rgba(239,68,68,0.2)] rounded-lg bg-[rgba(239,68,68,0.05)] mt-3">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchChirps}
            className="mt-1 text-xs text-[var(--kc-accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : chirps.length === 0 ? (
        <div className="text-xs font-mono text-[var(--kc-text-muted)] text-center py-6 border border-dashed border-[var(--kc-border)] rounded-lg bg-[var(--kc-surface-subtle)] mt-3">
          No commentary posted yet. Share your algorithmic breakdown with the community.
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {chirps.map((chirp) => (
            <ChirpCard key={chirp.id} chirp={chirp} />
          ))}
        </div>
      )}
    </div>
  );
};
