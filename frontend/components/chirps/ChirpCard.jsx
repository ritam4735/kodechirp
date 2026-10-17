import { formatDate } from '../../lib/helpers';

export const ChirpCard = ({ chirp }) => {
  return (
    <div className="bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] rounded-lg p-3.5 mb-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-xs text-[var(--kc-text-primary)] font-mono">@{chirp.author}</span>
        <span className="text-[11px] text-[var(--kc-text-muted)] font-mono">{formatDate(chirp.createdAt)}</span>
      </div>
      <p className="text-xs sm:text-sm text-[var(--kc-text-secondary)] leading-relaxed whitespace-pre-wrap">{chirp.content}</p>
    </div>
  );
};
