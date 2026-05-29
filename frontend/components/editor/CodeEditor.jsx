import Editor from '@monaco-editor/react';
import { useEditor } from '../../hooks/useEditor';

export const CodeEditor = () => {
  const { code, language, setCode } = useEditor();

  return (
    <div className="flex-1 min-h-0 relative group bg-[#0d1117]">
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        onChange={(value) => setCode(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 15,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
          padding: { top: 24, bottom: 24 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          fontLigatures: true,
          renderLineHighlight: 'all',
          lineHeight: 1.6,
        }}
        loading={
          <div className="flex flex-col items-center justify-center h-full w-full bg-[#0d1117] gap-3">
            <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#8b949e] font-medium text-sm animate-pulse">Warming up the nest...</span>
          </div>
        }
      />
    </div>
  );
};
