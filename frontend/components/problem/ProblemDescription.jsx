import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ProblemDescription = ({ problem }) => {
  if (!problem) return null;

  return (
    <div className="prose prose-invert prose-p:text-[var(--kc-text-muted)] prose-headings:text-[var(--kc-text)] prose-headings:font-display prose-headings:font-semibold prose-strong:text-white prose-code:text-[var(--kc-accent)] prose-code:bg-[var(--kc-surface-subtle)] prose-code:border prose-code:border-[var(--kc-border)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[var(--kc-surface-subtle)] prose-pre:border prose-pre:border-[var(--kc-border)] max-w-none text-sm leading-relaxed font-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {problem.description}
      </ReactMarkdown>
    </div>
  );
};
