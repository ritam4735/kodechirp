import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ProblemDescription = ({ problem }) => {
  if (!problem) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0d1117]">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[#e6edf3]">{problem.title}</h1>
        <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
          problem.difficulty === 'Easy' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
          problem.difficulty === 'Medium' ? 'bg-[#eab308]/10 text-[#eab308]' :
          'bg-[#ef4444]/10 text-[#ef4444]'
        }`}>
          {problem.difficulty}
        </span>
      </div>
      
      <div className="prose prose-invert prose-p:text-[#8b949e] prose-headings:text-[#e6edf3] prose-code:text-[#58a6ff] prose-code:bg-[#161b22] prose-code:px-1 prose-code:py-0.5 prose-code:rounded max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {problem.description}
        </ReactMarkdown>
      </div>
    </div>
  );
};
