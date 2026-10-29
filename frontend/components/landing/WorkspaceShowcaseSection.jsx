'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * WorkspaceShowcaseSection
 * Demonstrates the actual KodeChirp coding environment:
 *  - Problem statement & constraints
 *  - Multi-language selector & editor
 *  - Test cases execution with instant verdict
 *  - Clear runtime & memory performance metrics
 */
export default function WorkspaceShowcaseSection() {
  const [selectedLang, setSelectedLang] = useState('python');
  const [consoleTab, setConsoleTab] = useState('tests'); // 'tests' | 'output'
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(true);

  const codeSnippets = {
    python: {
      lang: 'Python 3.11',
      extension: '.py',
      code: `class Solution:
    def isValid(self, s: str) -> bool:
        bracket_map = {')': '(', '}': '{', ']': '['}
        stack = []
        for char in s:
            if char in bracket_map:
                top_element = stack.pop() if stack else '#'
                if bracket_map[char] != top_element:
                    return False
            else:
                stack.append(char)
        return not stack`,
      runtime: '28 ms',
      memory: '15.1 MB',
    },
    cpp: {
      lang: 'C++20 (GCC 13)',
      extension: '.cpp',
      code: `class Solution {
public:
    bool isValid(std::string s) {
        std::stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                char top = st.top(); st.pop();
                if ((c == ')' && top != '(') ||
                    (c == '}' && top != '{') ||
                    (c == ']' && top != '[')) return false;
            }
        }
        return st.empty();
    }
};`,
      runtime: '3 ms',
      memory: '7.8 MB',
    },
    java: {
      lang: 'OpenJDK 17',
      extension: '.java',
      code: `class Solution {
    public boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`,
      runtime: '1 ms',
      memory: '41.2 MB',
    },
    javascript: {
      lang: 'Node.js 20',
      extension: '.js',
      code: `function isValid(s) {
  const map = { ')': '(', '}': '{', ']': '[' };
  const stack = [];
  for (const char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else {
      stack.push(char);
    }
  }
  return stack.length === 0;
}`,
      runtime: '42 ms',
      memory: '43.8 MB',
    },
    c: {
      lang: 'C17 (Clang)',
      extension: '.c',
      code: `bool isValid(char* s) {
    int len = strlen(s);
    if (len % 2 != 0) return false;
    char stack[len + 1];
    int top = -1;
    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top == -1) return false;
            char prev = stack[top--];
            if (c == ')' && prev != '(') return false;
            if (c == '}' && prev != '{') return false;
            if (c == ']' && prev != '[') return false;
        }
    }
    return top == -1;
}`,
      runtime: '1 ms',
      memory: '5.9 MB',
    },
  };

  const sampleCases = [
    { id: 1, input: 's = "()"', expected: 'true', output: 'true', passed: true },
    { id: 2, input: 's = "()[]{}"', expected: 'true', output: 'true', passed: true },
    { id: 3, input: 's = "(]"', expected: 'false', output: 'false', passed: true },
  ];

  const handleSimulateRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 400);
  };

  return (
    <section className="kc-features-section" id="workspace">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            IN-BROWSER WORKSPACE
          </div>
          <h2 className="kc-section-title">
            A Distraction-Free Coding Environment
          </h2>
          <p className="kc-section-desc">
            Practice algorithms directly in your browser. Write solutions across 5 major programming languages, test your code against real test cases, and receive immediate feedback.
          </p>
        </div>

        {/* Realistic Split-Pane Workspace Simulation */}
        <div className="kc-workspace-demo-card">
          {/* Workspace Chrome Bar */}
          <div className="kc-ws-topbar">
            <div className="kc-ws-left-meta">
              <div className="kc-console-dots" aria-hidden="true">
                <span className="kc-dot kc-dot-red" />
                <span className="kc-dot kc-dot-amber" />
                <span className="kc-dot kc-dot-green" />
              </div>
              <span className="kc-ws-problem-badge">Problem 20</span>
              <span className="kc-ws-problem-name">Valid Parentheses</span>
              <span className="kc-diff-badge kc-diff-easy">Easy</span>
            </div>

            <div className="kc-ws-right-actions">
              <Link href="/problems/valid-parentheses" className="kc-btn-open-full">
                <span>Open in Practice IDE</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>

          {/* Workspace Split Layout */}
          <div className="kc-ws-body">
            {/* Left Panel: Problem Statement */}
            <div className="kc-ws-problem-pane">
              <div className="kc-ws-pane-header">
                <span>Problem Description</span>
              </div>
              <div className="kc-ws-pane-content">
                <h3 className="kc-ws-title">Valid Parentheses</h3>
                <p className="kc-ws-text">
                  Given a string <code className="kc-code-inline">s</code> containing just the characters{' '}
                  <code className="kc-code-inline">&apos;(&apos;</code>,{' '}
                  <code className="kc-code-inline">&apos;)&apos;</code>,{' '}
                  <code className="kc-code-inline">&apos;{'{'}&apos;</code>,{' '}
                  <code className="kc-code-inline">&apos;{'}'}&apos;</code>,{' '}
                  <code className="kc-code-inline">&apos;[&apos;</code> and{' '}
                  <code className="kc-code-inline">&apos;]&apos;</code>, determine if the input string is valid.
                </p>

                <p className="kc-ws-text">
                  An input string is valid if:
                </p>
                <ol className="kc-ws-list">
                  <li>Open brackets must be closed by the same type of brackets.</li>
                  <li>Open brackets must be closed in the correct order.</li>
                  <li>Every close bracket has a corresponding open bracket of the same type.</li>
                </ol>

                <div className="kc-ws-example-box">
                  <div className="kc-ws-example-title">Example 1:</div>
                  <div className="kc-ws-example-line"><code>Input: s = &quot;()&quot;</code></div>
                  <div className="kc-ws-example-line"><code>Output: true</code></div>
                </div>

                <div className="kc-ws-example-box">
                  <div className="kc-ws-example-title">Example 2:</div>
                  <div className="kc-ws-example-line"><code>Input: s = &quot;()[]{}&quot;</code></div>
                  <div className="kc-ws-example-line"><code>Output: true</code></div>
                </div>

                <div className="kc-ws-constraints-box">
                  <div className="kc-ws-constraints-title">Constraints:</div>
                  <ul className="kc-ws-constraints-list">
                    <li><code>1 &lt;= s.length &lt;= 10<sup>4</sup></code></li>
                    <li><code>s</code> consists of parentheses only <code>&apos;()[]{}&apos;</code>.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Panel: Code Editor & Execution Results */}
            <div className="kc-ws-editor-pane">
              {/* Language Selector Bar */}
              <div className="kc-ws-editor-header">
                <div className="kc-lang-tabs" role="tablist" aria-label="Editor Languages">
                  {Object.keys(codeSnippets).map((langKey) => (
                    <button
                      key={langKey}
                      type="button"
                      role="tab"
                      aria-selected={selectedLang === langKey}
                      className={`kc-lang-tab ${selectedLang === langKey ? 'active' : ''}`}
                      onClick={() => setSelectedLang(langKey)}
                    >
                      {langKey === 'cpp' ? 'C++' : langKey === 'javascript' ? 'JS' : langKey.toUpperCase()}
                    </button>
                  ))}
                </div>

                <span className="kc-ws-lang-indicator">
                  {codeSnippets[selectedLang].lang}
                </span>
              </div>

              {/* Editor Code Area */}
              <div className="kc-ws-code-container">
                <pre className="kc-ws-code">
                  <code>{codeSnippets[selectedLang].code}</code>
                </pre>
              </div>

              {/* Console & Test Results Panel */}
              <div className="kc-ws-console-panel">
                <div className="kc-ws-console-header">
                  <div className="kc-ws-console-tabs">
                    <button
                      type="button"
                      className={`kc-ws-console-tab ${consoleTab === 'tests' ? 'active' : ''}`}
                      onClick={() => setConsoleTab('tests')}
                    >
                      <span>Test Results (3)</span>
                    </button>
                    <button
                      type="button"
                      className={`kc-ws-console-tab ${consoleTab === 'output' ? 'active' : ''}`}
                      onClick={() => setConsoleTab('output')}
                    >
                      <span>Console Logs</span>
                    </button>
                  </div>

                  {hasRun && (
                    <div className="kc-ws-verdict-summary">
                      <span className="kc-badge-accepted">✔ Accepted</span>
                      <span className="kc-metric-pill">Time: {codeSnippets[selectedLang].runtime}</span>
                      <span className="kc-metric-pill">Mem: {codeSnippets[selectedLang].memory}</span>
                    </div>
                  )}
                </div>

                <div className="kc-ws-console-body">
                  {consoleTab === 'tests' && (
                    <div className="kc-ws-test-cases-grid">
                      {sampleCases.map((tc) => (
                        <div key={tc.id} className="kc-ws-test-pill">
                          <span className="kc-ws-test-status">✓</span>
                          <span className="kc-ws-test-label">Case {tc.id}:</span>
                          <code className="kc-ws-test-expr">{tc.input}</code>
                          <span className="kc-ws-test-tag">Passed</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {consoleTab === 'output' && (
                    <div className="kc-ws-log-output">
                      <p className="kc-log-line">Running 3 sample test cases against {codeSnippets[selectedLang].lang}...</p>
                      <p className="kc-log-line text-emerald-400">All test cases passed cleanly with exit code 0.</p>
                      <p className="kc-log-line text-slate-400">Memory footprint: {codeSnippets[selectedLang].memory} | Execution duration: {codeSnippets[selectedLang].runtime}</p>
                    </div>
                  )}
                </div>

                {/* Execution Action Bar */}
                <div className="kc-ws-action-bar">
                  <button
                    type="button"
                    className="kc-btn-run"
                    onClick={handleSimulateRun}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <>
                        <span className="kc-spinner" aria-hidden="true" />
                        <span>Running Tests...</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">▶</span>
                        <span>Run Code</span>
                      </>
                    )}
                  </button>

                  <Link href="/problems/valid-parentheses" className="kc-btn-submit-action">
                    <span>Submit Solution</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Value Cards */}
        <div className="kc-workspace-features-grid">
          <div className="kc-ws-feature-card">
            <div className="kc-feature-icon-box">💻</div>
            <h4 className="kc-feature-title">5 Major Languages</h4>
            <p className="kc-feature-desc">
              Write and test code in Python 3.11, C++20, Java 17, Node.js 20, and C17 with zero local setup.
            </p>
          </div>

          <div className="kc-ws-feature-card">
            <div className="kc-feature-icon-box">⚡</div>
            <h4 className="kc-feature-title">Automated Test Runner</h4>
            <p className="kc-feature-desc">
              Validate your logic against sample test cases and custom edge cases with immediate execution feedback.
            </p>
          </div>

          <div className="kc-ws-feature-card">
            <div className="kc-feature-icon-box">📊</div>
            <h4 className="kc-feature-title">Runtime &amp; Memory Metrics</h4>
            <p className="kc-feature-desc">
              Evaluate execution time and memory consumption on every submission to measure algorithmic efficiency.
            </p>
          </div>

          <div className="kc-ws-feature-card">
            <div className="kc-feature-icon-box">🎯</div>
            <h4 className="kc-feature-title">Standard Starter Templates</h4>
            <p className="kc-feature-desc">
              Every challenge arrives with pre-configured method signatures and type hints ready for problem-solving.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
