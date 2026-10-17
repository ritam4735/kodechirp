'use client';

import Editor, { loader } from '@monaco-editor/react';
import { useEditor } from '../../hooks/useEditor';

// Configure Monaco loader to use local assets from /public/monaco/vs
// to ensure offline reliability and prevent failures from blocked external CDNs
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: '/monaco/vs',
    },
  });
}

export const CodeEditor = () => {
  const { code, language, setCode, editorPath } = useEditor();

  return (
    <div className="flex-1 min-h-0 relative group bg-[var(--kc-surface)]">
      <Editor
        height="100%"
        language={language}
        path={editorPath}
        value={code}
        theme="vs-dark"
        onChange={(value) => setCode(value || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
          padding: { top: 20, bottom: 20 },
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
          <div className="flex flex-col items-center justify-center h-full w-full bg-[var(--kc-surface)] gap-3">
            <div className="w-7 h-7 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--kc-text-muted)] font-mono text-xs uppercase tracking-wider animate-pulse">Initializing editor…</span>
          </div>
        }
      />
    </div>
  );
};
