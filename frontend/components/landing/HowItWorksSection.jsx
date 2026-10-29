'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * HowItWorksSection
 * Streamlined 4-stage learning workflow:
 *  01. Understand the problem
 *  02. Write your solution
 *  03. Run tests
 *  04. Improve and learn
 */
export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      tag: 'UNDERSTAND',
      title: 'Understand the Problem',
      summary: 'Read problem statements, review constraints, and inspect example test cases.',
      desc: 'Great problem solving begins with clarity. Every problem includes explicit input/output definitions, sample cases with explanations, and tight constraints to help you choose the right data structure before writing any code.',
      preview: {
        badge: 'Problem Definition',
        header: 'Two Sum — Constraints & Input',
        codeTitle: 'problem_specification.md',
        content: [
          { label: 'Input', value: 'nums = [2, 7, 11, 15], target = 9' },
          { label: 'Expected Output', value: '[0, 1] (indices of 2 and 7)' },
          { label: 'Constraints', value: '2 <= nums.length <= 10^4' },
          { label: 'Time Complexity Goal', value: 'O(N) with Hash Table or O(N log N) Sorting' },
        ],
      },
    },
    {
      num: '02',
      tag: 'IMPLEMENT',
      title: 'Write Your Solution',
      summary: 'Code in Python, C++, Java, JavaScript, or C with syntax highlighting.',
      desc: 'Jump straight into the in-browser editor with pre-filled method signatures and clean defaults. No local environment setup, compiler configuration, or package managers required.',
      preview: {
        badge: 'Multi-Language Editor',
        header: 'Python 3.11 • Solution',
        codeTitle: 'solution.py',
        codeSnippet: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        seen = {}
        for idx, val in enumerate(nums):
            diff = target - val
            if diff in seen:
                return [seen[diff], idx]
            seen[val] = idx
        return []`,
      },
    },
    {
      num: '03',
      tag: 'VERIFY',
      title: 'Run Tests',
      summary: 'Validate your logic with automated sample and custom test cases.',
      desc: 'Run your solution against automated test cases with a single click. Inspect stdout outputs, test pass/fail indicators, and compare expected versus actual return values to debug edge cases quickly.',
      preview: {
        badge: 'Automated Test Runner',
        header: 'Test Execution Results',
        codeTitle: 'test_runner_output.log',
        results: [
          { name: 'Case 1: nums = [2,7,11,15], target = 9', status: 'Passed', time: '32 ms' },
          { name: 'Case 2: nums = [3,2,4], target = 6', status: 'Passed', time: '28 ms' },
          { name: 'Case 3: nums = [3,3], target = 6', status: 'Passed', time: '29 ms' },
        ],
        verdict: '✓ All 3 Sample Test Cases Passed',
      },
    },
    {
      num: '04',
      tag: 'MASTER',
      title: 'Improve and Learn',
      summary: 'Analyze complexity, optimize memory, and review community approaches.',
      desc: 'Evaluate execution runtime and memory usage after every run. Visit community Chirps to see how fellow engineers solved the problem, discover alternative algorithmic patterns, and build lasting intuition.',
      preview: {
        badge: 'Community Discussions',
        header: 'Chirps & Solution Insights',
        codeTitle: 'community_discussion.json',
        chirp: {
          author: 'Priya Sharma',
          role: 'Community Solver',
          text: 'Using a hash map allows us to check for the complement in O(1) average time, reducing the brute-force O(N^2) time to O(N) linear time at the cost of O(N) space.',
          upvotes: 42,
          tags: ['#HashMap', '#TimeComplexity', '#Optimal'],
        },
      },
    },
  ];

  return (
    <section className="kc-workflow-section" id="how-it-works">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            PRACTICE WORKFLOW
          </div>
          <h2 className="kc-section-title">
            How KodeChirp Works
          </h2>
          <p className="kc-section-desc">
            A structured, distraction-free process for learning data structures and algorithms through deliberate practice and instant feedback.
          </p>
        </div>

        {/* 2-Column Interactive Workflow */}
        <div className="kc-workflow-grid">
          {/* Step Selector Column */}
          <div className="kc-workflow-nav" role="tablist" aria-label="How It Works Steps">
            {steps.map((step, idx) => (
              <div
                key={step.num}
                role="tab"
                tabIndex={0}
                aria-selected={activeStep === idx}
                className={`kc-workflow-card ${activeStep === idx ? 'active' : ''}`}
                onClick={() => setActiveStep(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveStep(idx);
                  }
                }}
              >
                <div className="kc-wf-top-row">
                  <span className="kc-wf-num">{step.num}</span>
                  <span className="kc-wf-tag">{step.tag}</span>
                  <span className="kc-wf-arrow" aria-hidden="true">→</span>
                </div>

                <h3 className="kc-wf-title">{step.title}</h3>
                <p className="kc-wf-desc">{step.summary}</p>

                {activeStep === idx && <div className="kc-wf-active-bar" />}
              </div>
            ))}
          </div>

          {/* Dynamic Inspector Pane */}
          <div className="kc-workflow-inspector">
            <div className="kc-inspector-window">
              <div className="kc-inspector-bar">
                <div className="kc-console-dots" aria-hidden="true">
                  <span className="kc-dot kc-dot-red" />
                  <span className="kc-dot kc-dot-amber" />
                  <span className="kc-dot kc-dot-green" />
                </div>
                <span className="kc-inspector-title">
                  {steps[activeStep].preview.codeTitle}
                </span>
                <span className="kc-inspector-status">
                  <span className="kc-mini-pulse" />
                  {steps[activeStep].preview.badge}
                </span>
              </div>

              <div className="kc-inspector-content">
                {/* Step 1: Understand Problem */}
                {activeStep === 0 && (
                  <div className="kc-step-preview-content">
                    <div className="kc-preview-content-title">
                      {steps[0].preview.header}
                    </div>
                    <div className="kc-matrix-grid">
                      {steps[0].preview.content.map((item, i) => (
                        <div key={i} className="kc-matrix-item">
                          <div className="kc-matrix-label">{item.label}</div>
                          <div className="kc-matrix-value">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Write Solution */}
                {activeStep === 1 && (
                  <div className="kc-step-preview-content">
                    <div className="kc-preview-content-title">
                      {steps[1].preview.header}
                    </div>
                    <pre className="kc-code-block">
                      <code>{steps[1].preview.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Step 3: Run Tests */}
                {activeStep === 2 && (
                  <div className="kc-step-preview-content">
                    <div className="kc-preview-content-title">
                      {steps[2].preview.header}
                    </div>
                    <div className="kc-results-list">
                      {steps[2].preview.results.map((res, i) => (
                        <div key={i} className="kc-result-row">
                          <span className="kc-result-status-icon">✔</span>
                          <span className="kc-result-name">{res.name}</span>
                          <span className="kc-result-time">{res.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="kc-results-verdict-pill">
                      {steps[2].preview.verdict}
                    </div>
                  </div>
                )}

                {/* Step 4: Improve and Learn */}
                {activeStep === 3 && (
                  <div className="kc-step-preview-content">
                    <div className="kc-preview-content-title">
                      {steps[3].preview.header}
                    </div>
                    <div className="kc-chirp-card">
                      <div className="kc-chirp-header">
                        <div className="kc-chirp-avatar">PS</div>
                        <div>
                          <div className="kc-chirp-name">
                            {steps[3].preview.chirp.author}
                            <span className="kc-author-badge">Community</span>
                          </div>
                          <div className="kc-chirp-meta">Discussing Two Sum</div>
                        </div>
                        <div className="kc-chirp-upvote-btn">
                          ▲ {steps[3].preview.chirp.upvotes}
                        </div>
                      </div>
                      <p className="kc-chirp-body">
                        &ldquo;{steps[3].preview.chirp.text}&rdquo;
                      </p>
                      <div className="kc-chirp-tags">
                        {steps[3].preview.chirp.tags.map((t) => (
                          <span key={t} className="kc-mini-tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Footer with Step Explanation and Action */}
              <div className="kc-inspector-footer">
                <p className="kc-inspector-desc">{steps[activeStep].desc}</p>
                <Link href="/questions" className="kc-inspector-cta">
                  <span>Start Practicing</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
