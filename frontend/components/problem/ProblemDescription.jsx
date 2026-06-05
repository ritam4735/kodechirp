import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ProblemDescription = ({ problem }) => {
  if (!problem) return null;

  return (
    <div className="prose prose-invert prose-p:text-[#8b949e] prose-headings:text-[#e6edf3] prose-code:text-[#58a6ff] prose-code:bg-[#161b22] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded max-w-none text-[15px] leading-relaxed font-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {problem.description}
      </ReactMarkdown>
    </div>
  );
};
