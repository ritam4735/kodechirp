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
  // Dark Theme: Charcoal Slate (#151B26) + Cobalt Accent (#2563EB) + Near-White (#F1F5F9)
  monaco.editor.defineTheme('kodechirp-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '94A3B8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '60A5FA', fontStyle: 'bold' },
      { token: 'string', foreground: '34D399' },
      { token: 'number', foreground: 'FBBF24' },
      { token: 'type', foreground: 'C084FC' },
      { token: 'function', foreground: '38BDF8' },
      { token: 'variable', foreground: 'F8FAFC' },
      { token: 'delimiter', foreground: 'CBD5E1' },
      { token: 'operator', foreground: '60A5FA' },
    ],
    colors: {
      'editor.background': '#151B26',
      'editor.foreground': '#F8FAFC',
      'editor.lineHighlightBackground': '#1C2433',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#2563EB40',
      'editor.inactiveSelectionBackground': '#2563EB20',
      'editorLineNumber.foreground': '#94A3B8',
      'editorLineNumber.activeForeground': '#F8FAFC',
      'editorGutter.background': '#151B26',
      'editorCursor.foreground': '#60A5FA',
      'editorIndentGuide.background': '#283347',
      'editorIndentGuide.activeBackground': '#3B82F6',
      'editorWhitespace.foreground': '#283347',
      'scrollbarSlider.background': '#28334780',
      'scrollbarSlider.hoverBackground': '#3E4D6880',
      'scrollbarSlider.activeBackground': '#2563EB90',
    },
  });

  // Light Theme: Clean White (#FFFFFF) + Royal Blue (#1D4ED8) + Dark Slate (#0F172A)
  monaco.editor.defineTheme('kodechirp-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '475569', fontStyle: 'italic' },
      { token: 'keyword', foreground: '1D4ED8', fontStyle: 'bold' },
      { token: 'string', foreground: '047857' },
      { token: 'number', foreground: 'B45309' },
      { token: 'type', foreground: '6D28D9' },
      { token: 'function', foreground: '0369A1' },
      { token: 'variable', foreground: '0F172A' },
      { token: 'delimiter', foreground: '334155' },
      { token: 'operator', foreground: '1D4ED8' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#0F172A',
      'editor.lineHighlightBackground': '#F1F5F9',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#2563EB25',
      'editor.inactiveSelectionBackground': '#2563EB10',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#0F172A',
      'editorGutter.background': '#FFFFFF',
      'editorCursor.foreground': '#1D4ED8',
      'editorIndentGuide.background': '#CBD5E1',
      'editorIndentGuide.activeBackground': '#1D4ED8',
      'editorWhitespace.foreground': '#E2E8F0',
      'scrollbarSlider.background': '#E2E8F080',
      'scrollbarSlider.hoverBackground': '#CBD5E180',
      'scrollbarSlider.activeBackground': '#1D4ED880',
    },
  });
}

export const CodeEditor = ({
  problemId,
  value,
  onChange,
  language: propLanguage,
  path: propPath,
  readOnly = false,
  height = '100%',
}) => {
  const editorStore = useEditor();
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const isControlled = value !== undefined;
  const activeCode = isControlled ? value : editorStore.code;
  const activeLanguage = propLanguage || editorStore.language || 'python';
  const handleCodeChange = onChange || ((val) => editorStore.setCode(val || ''));
  const ext = { javascript: 'js', python: 'py', c: 'c', cpp: 'cpp', java: 'java' }[activeLanguage] || 'txt';
  const activePath = propPath || (isControlled ? `editor_${problemId || 'default'}_${activeLanguage}.${ext}` : editorStore.editorPath);

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
        height={height}
        language={activeLanguage}
        path={activePath}
        value={activeCode}
        theme={editorTheme}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        onChange={(value) => handleCodeChange(value || '')}
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
          readOnly: Boolean(readOnly),
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
