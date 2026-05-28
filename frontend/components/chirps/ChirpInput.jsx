import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

export const ChirpInput = ({ problemId, onChirpPosted }) => {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const handleSubmit = async () => {
    if (!content.trim() || !isAuthenticated) return;
    
    setIsPosting(true);
    try {
      const newChirp = await api.postChirp(problemId, content, user?.name || 'Anonymous');
      setContent('');
      onChirpPosted(newChirp);
    } catch (error) {
      console.error('Failed to post chirp', error);
    } finally {
      setIsPosting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 text-center text-sm text-[#8b949e] mb-6">
        Please log in to post a Chirp.
      </div>
    );
  }

  return (
    <div className="mb-6 relative">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your thought process..."
        className="w-full bg-[#161b22] border border-[#21262d] text-sm text-[#e6edf3] rounded-lg p-3 pr-12 focus:outline-none focus:border-[#58a6ff] transition-colors resize-none h-24"
      />
      <button
        onClick={handleSubmit}
        disabled={isPosting || !content.trim()}
        className="absolute right-3 bottom-3 text-[#22c55e] hover:text-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send size={18} />
      </button>
    </div>
  );
};
