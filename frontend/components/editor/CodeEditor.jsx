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
  // Dark Theme: Wine Red (#7F011F) + Light Sand (#F5EBD0) on Charcoal Burgundy (#21181C)
  monaco.editor.defineTheme('kodechirp-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9E8D93', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'E25272', fontStyle: 'bold' },
      { token: 'string', foreground: 'E8C587' },
      { token: 'number', foreground: 'F59E0B' },
      { token: 'type', foreground: 'D8B4E2' },
      { token: 'function', foreground: 'F5A3B3' },
      { token: 'variable', foreground: 'F5EBD0' },
      { token: 'delimiter', foreground: 'DFD3B8' },
      { token: 'operator', foreground: 'E25272' },
    ],
    colors: {
      'editor.background': '#21181C',
      'editor.foreground': '#F5EBD0',
      'editor.lineHighlightBackground': '#2B1E23',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#7F011F50',
      'editor.inactiveSelectionBackground': '#7F011F25',
      'editorLineNumber.foreground': '#9E8D93',
      'editorLineNumber.activeForeground': '#F5EBD0',
      'editorGutter.background': '#21181C',
      'editorCursor.foreground': '#F5EBD0',
      'editorIndentGuide.background': '#38252C',
      'editorIndentGuide.activeBackground': '#7F011F',
      'editorWhitespace.foreground': '#38252C',
      'scrollbarSlider.background': '#38252C80',
      'scrollbarSlider.hoverBackground': '#9E8D9380',
      'scrollbarSlider.activeBackground': '#7F011F90',
    },
  });

  // Light Theme: Royal Blue (#014BAA) + Slate (#202735) on Clean Surface (#FFFFFF)
  monaco.editor.defineTheme('kodechirp-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '626B78', fontStyle: 'italic' },
      { token: 'keyword', foreground: '014BAA', fontStyle: 'bold' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'D97706' },
      { token: 'type', foreground: '7C3AED' },
      { token: 'function', foreground: '0284C7' },
      { token: 'variable', foreground: '202735' },
      { token: 'delimiter', foreground: '495366' },
      { token: 'operator', foreground: '014BAA' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#202735',
      'editor.lineHighlightBackground': '#F8F3F0',
      'editor.lineHighlightBorder': '#00000000',
      'editor.selectionBackground': '#014BAA26',
      'editor.inactiveSelectionBackground': '#014BAA12',
      'editorLineNumber.foreground': '#8B95A5',
      'editorLineNumber.activeForeground': '#202735',
      'editorGutter.background': '#FFFFFF',
      'editorCursor.foreground': '#014BAA',
      'editorIndentGuide.background': '#E8E5E1',
      'editorIndentGuide.activeBackground': '#014BAA',
      'editorWhitespace.foreground': '#E8E5E1',
      'scrollbarSlider.background': '#E8E5E180',
      'scrollbarSlider.hoverBackground': '#8B95A580',
      'scrollbarSlider.activeBackground': '#014BAA80',
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
