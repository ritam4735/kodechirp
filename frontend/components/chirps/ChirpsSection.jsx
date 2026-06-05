import { useState, useEffect } from 'react';
import { ChirpCard } from './ChirpCard';
import { ChirpInput } from './ChirpInput';
import { api } from '../../lib/api';
import { MessageCircle } from 'lucide-react';

export const ChirpsSection = ({ problemId }) => {
  const [chirps, setChirps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChirps = async () => {
      setIsLoading(true);
      try {
        const data = await api.getChirps(problemId);
        setChirps(data);
      } catch (error) {
        console.error('Failed to fetch chirps', error);
      } finally {
        setIsLoading(false);
      }
    };

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
        <div className="text-sm text-[#8b949e] text-center py-4">Loading chirps...</div>
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
