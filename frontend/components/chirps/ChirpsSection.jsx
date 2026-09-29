import { useState, useEffect } from 'react';
import { ChirpCard } from './ChirpCard';
import { ChirpInput } from './ChirpInput';
import { api } from '../../lib/api';
import { MessageCircle } from 'lucide-react';

export const ChirpsSection = ({ problemId }) => {
  const [chirps, setChirps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchChirps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getChirps(problemId);
      setChirps(data);
    } catch (err) {
      console.error('Failed to fetch chirps', err);
      setError('Unable to load chirps.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (problemId) {
      fetchChirps();
    }
  }, [problemId]);

  const handleChirpPosted = (newChirp) => {
    setChirps([newChirp, ...chirps]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle size={18} className="text-[#58a6ff]" />
        <h3 className="text-lg font-bold font-display text-[#e6edf3]">Community Chirps</h3>
        <span className="bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20 text-xs px-2 py-0.5 rounded-full ml-2">
          {chirps.length}
        </span>
      </div>

      <ChirpInput problemId={problemId} onChirpPosted={handleChirpPosted} />

      {isLoading ? (
        <div className="text-sm text-[#8b949e] text-center py-6 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
          <span>Loading chirps...</span>
        </div>
      ) : error ? (
        <div className="text-sm text-[#f87171] text-center py-6 border border-rose-500/20 rounded-xl bg-rose-500/5 mt-4">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchChirps}
            className="mt-2 text-xs text-[#58a6ff] hover:underline"
          >
            Try again
          </button>
        </div>
      ) : chirps.length === 0 ? (
        <div className="text-sm text-[#8b949e] text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5 backdrop-blur-sm mt-4">
          No chirps yet. Be the first to share your approach!
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {chirps.map(chirp => (
            <ChirpCard key={chirp.id} chirp={chirp} />
          ))}
        </div>
      )}
    </div>
  );
};
