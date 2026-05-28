import Editor from '@monaco-editor/react';
import { useEditor } from '../../hooks/useEditor';
import { useEffect } from 'react';
import { DEFAULT_CODE_SNIPPETS } from '../../lib/constants';

export const CodeEditor = () => {
  const { code, language, setCode } = useEditor();

  // Initialize with default snippet if empty
  useEffect(() => {
    if (!code) {
      setCode(DEFAULT_CODE_SNIPPETS[language] || '');
    }
  }, [language, code, setCode]);

  return (
    <div className="flex-1 min-h-0">
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="vs-dark"
        onChange={(value) => setCode(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
        }}
        loading={<div className="flex items-center justify-center h-full text-[#8b949e]">Loading Editor...</div>}
      />
    </div>
  );
};
