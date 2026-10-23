import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ProblemDescription = ({ problem }) => {
  if (!problem) return null;

  return (
    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed font-body text-[var(--kc-text-primary)] prose-p:text-[var(--kc-text-secondary)] prose-p:leading-relaxed prose-p:my-3 prose-headings:text-[var(--kc-text-primary)] prose-headings:font-display prose-headings:font-semibold prose-strong:text-[var(--kc-text-primary)] prose-strong:font-semibold prose-code:text-[var(--kc-accent)] dark:prose-code:text-[var(--kc-text-primary)] prose-code:bg-[var(--kc-surface-subtle)] prose-code:border prose-code:border-[var(--kc-border)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[12.5px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[var(--kc-surface-subtle)] prose-pre:border prose-pre:border-[var(--kc-border)] prose-pre:text-[var(--kc-text-primary)] prose-pre:p-3 prose-pre:rounded-lg prose-li:text-[var(--kc-text-secondary)] prose-li:my-1 prose-a:text-[var(--kc-accent)] dark:prose-a:text-[#60A5FA] prose-a:no-underline hover:prose-a:underline prose-hr:border-[var(--kc-border)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {problem.description}
      </ReactMarkdown>
    </div>
  );
};
