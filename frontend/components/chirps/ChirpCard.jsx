import { formatDate } from '../../lib/helpers';

export const ChirpCard = ({ chirp }) => {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-[#e6edf3]">@{chirp.author}</span>
        <span className="text-xs text-[#8b949e]">{formatDate(chirp.createdAt)}</span>
      </div>
      <p className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{chirp.content}</p>
    </div>
  );
};
