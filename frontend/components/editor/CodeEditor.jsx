'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useEditor } from '../../hooks/useEditor';
import { getActiveTheme } from '../../lib/theme';

// Configure Monaco loader to use local assets from /public/monaco/vs
// to ensure offline reliability and prevent failures from blocked external CDNs
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: '/monaco/vs',
    },
  });
}

function defineMonacoThemes(monaco) {
  // Dark Theme: Matches --kc-surface (#141417) and KodeChirp dark aesthetics
  monaco.editor.defineTheme('kodechirp-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8A8A93', fontStyle: 'italic' },
      { token: 'keyword', foreground: '60A5FA', fontStyle: 'bold' },
      { token: 'string', foreground: '34D399' },
      { token: 'number', foreground: 'FBBF24' },
      { token: 'type', foreground: 'A78BFA' },
      { token: 'function', foreground: '93C5FD' },
      { token: 'variable', foreground: 'E8E6E3' },
      { token: 'delimiter', foreground: 'A8A8B2' },
      { token: 'operator', foreground: '93C5FD' },
    ],
    colors: {
      'editor.background': '#141417',
      'editor.foreground': '#E8E6E3',
      'editor.lineHighlightBackground': '#1A1A1E',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#3B82F633',
      'editor.inactiveSelectionBackground': '#3B82F618',
      'editorLineNumber.foreground': '#8A8A93',
      'editorLineNumber.activeForeground': '#E8E6E3',
      'editorGutter.background': '#141417',
      'editorCursor.foreground': '#60A5FA',
      'editorIndentGuide.background': '#222228',
      'editorIndentGuide.activeBackground': '#3B82F6',
      'editorWhitespace.foreground': '#222228',
      'scrollbarSlider.background': '#22222880',
      'scrollbarSlider.hoverBackground': '#8A8A9380',
      'scrollbarSlider.activeBackground': '#3B82F680',
    },
  });

  // Light Theme: Matches --kc-surface (#FFFFFF) and KodeChirp light aesthetics with high-contrast text
  monaco.editor.defineTheme('kodechirp-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6E6E73', fontStyle: 'italic' },
      { token: 'keyword', foreground: '1D4ED8', fontStyle: 'bold' },
      { token: 'string', foreground: '047857' },
      { token: 'number', foreground: 'B45309' },
      { token: 'type', foreground: '7C3AED' },
      { token: 'function', foreground: '2563EB' },
      { token: 'variable', foreground: '1A1A1A' },
      { token: 'delimiter', foreground: '4A4A4D' },
      { token: 'operator', foreground: '2563EB' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1A1A',
      'editor.lineHighlightBackground': '#F5F5F3',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#2563EB25',
      'editor.inactiveSelectionBackground': '#2563EB12',
      'editorLineNumber.foreground': '#8E8E93',
      'editorLineNumber.activeForeground': '#1A1A1A',
      'editorGutter.background': '#FFFFFF',
      'editorCursor.foreground': '#2563EB',
      'editorIndentGuide.background': '#E5E5E3',
      'editorIndentGuide.activeBackground': '#2563EB',
      'editorWhitespace.foreground': '#E5E5E3',
      'scrollbarSlider.background': '#E5E5E380',
      'scrollbarSlider.hoverBackground': '#6E6E7380',
      'scrollbarSlider.activeBackground': '#2563EB80',
    },
  });
}

export const CodeEditor = ({ problemId }) => {
  const { code, language, setCode, editorPath } = useEditor();
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const resolveCurrentTheme = useCallback(() => {
    if (typeof window === 'undefined') return 'kodechirp-dark';
    const active = document.documentElement.getAttribute('data-theme') || getActiveTheme();
    return active === 'light' ? 'kodechirp-light' : 'kodechirp-dark';
  }, []);

  const [editorTheme, setEditorTheme] = useState('kodechirp-dark');

  // Sync theme initially on client mount and on system/manual theme toggle
  useEffect(() => {
    const currentTheme = resolveCurrentTheme();
    setEditorTheme(currentTheme);

    const handleThemeChange = (e) => {
      const active = e.detail?.active || resolveCurrentTheme();
      const nextTheme = active === 'light' || active === 'kodechirp-light' ? 'kodechirp-light' : 'kodechirp-dark';
      setEditorTheme(nextTheme);
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(nextTheme);
      }
    };

    window.addEventListener('kc-theme-change', handleThemeChange);

    // MutationObserver to watch data-theme attribute on <html>
    const observer = new MutationObserver(() => {
      const active = document.documentElement.getAttribute('data-theme');
      const nextTheme = active === 'light' ? 'kodechirp-light' : 'kodechirp-dark';
      setEditorTheme(nextTheme);
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(nextTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      window.removeEventListener('kc-theme-change', handleThemeChange);
      observer.disconnect();
    };
  }, [resolveCurrentTheme]);

  // Clean up editor reference on unmount
  useEffect(() => {
    return () => {
      editorRef.current = null;
    };
  }, []);

  // Recalculate layout when problemId changes (e.g. question navigation)
  useEffect(() => {
    if (editorRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        editorRef.current.layout({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    }
  }, [problemId]);

  // Handle container resizing smoothly and deterministically with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && editorRef.current) {
          editorRef.current.layout({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleEditorWillMount = (monaco) => {
    monacoRef.current = monaco;
    defineMonacoThemes(monaco);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Apply active theme immediately
    const currentTheme = resolveCurrentTheme();
    monaco.editor.setTheme(currentTheme);

    // Initial layout calculation from actual container dimensions
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        editor.layout({ width: clientWidth, height: clientHeight });
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex-1 min-h-0 min-w-0 relative group bg-[var(--kc-surface)] overflow-hidden"
    >
      <Editor
        width="100%"
        height="100%"
        language={language}
        path={editorPath}
        value={code}
        theme={editorTheme}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        onChange={(value) => setCode(value || '')}
        options={{
          automaticLayout: false,
          fixedOverflowWidgets: true,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          fontLigatures: true,
          renderLineHighlight: 'all',
          lineHeight: 1.6,
          tabSize: 4,
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
