'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * WorkflowSection
 * Upgrades the old plain-text "How it works" rows into an interactive,
 * high-hierarchy 3-stage engineering pipeline:
 *  01. Deconstruct Invariants
 *  02. Sandboxed Isolated Execution
 *  03. Peer Reasoning & Mental Models
 */

export default function WorkflowSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      tag: 'DECONSTRUCT',
      title: 'Understand before you code.',
      subtitle: 'Break down constraints and formulate state invariants.',
      desc: 'Elite algorithmic problem-solving starts before the first line of syntax. Map boundary conditions, determine time-complexity ceilings from input bounds, and prove correctness with loop invariants.',
      terminalTitle: 'invariant_analyzer.sh',
      previewType: 'invariants',
    },
    {
      num: '02',
      tag: 'EXECUTE',
      title: 'Turn intuition into verified structure.',
      subtitle: 'Sub-100ms isolated micro-containers with multi-language runtimes.',
      desc: 'Verify edge cases across Python, JavaScript, C, C++, and Java. Every submission runs in strict non-root containers with seccomp filtering, PID limits, and real-time memory & execution profiling.',
      terminalTitle: 'docker_sandbox_daemon.log',
      previewType: 'sandbox',
    },
    {
      num: '03',
      tag: 'REASON',
      title: 'Every attempt sharpens technical instinct.',
      subtitle: 'Publish and absorb peer reasoning models on every problem.',
      desc: 'Code is only the implementation. On KodeChirp, developers post and debate core mental models — why a monotonic queue beats binary search, or where space complexity trade-offs emerge.',
      terminalTitle: 'peer_chirps_thread.json',
      previewType: 'chirps',
    },
  ];

  return (
    <section className="kc-workflow-section" id="how-it-works">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            ENGINEERING WORKFLOW
          </div>
          <h2 className="kc-section-title">
            Algorithmic instinct <br className="kc-title-br" />by deliberate design.
          </h2>
          <p className="kc-section-desc">
            Ditch rote memorization. Master how world-class software engineers dismantle complex
            state spaces, execute verifiable logic, and synthesize repeatable patterns.
          </p>
        </div>

        {/* Interactive 3-Stage Pipeline */}
        <div className="kc-workflow-grid">
          {/* Step Selector Column */}
          <div className="kc-workflow-nav" role="tablist" aria-label="Workflow Steps">
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
                <p className="kc-wf-desc">{step.subtitle}</p>

                {/* Progress bar on active card */}
                {activeStep === idx && <div className="kc-wf-active-bar" />}
              </div>
            ))}
          </div>

          {/* Dynamic Technical Inspector Pane */}
          <div className="kc-workflow-inspector">
            <div className="kc-inspector-window">
              <div className="kc-inspector-bar">
                <div className="kc-console-dots" aria-hidden="true">
                  <span className="kc-dot kc-dot-red" />
                  <span className="kc-dot kc-dot-amber" />
                  <span className="kc-dot kc-dot-green" />
                </div>
                <div className="kc-inspector-title">
                  {steps[activeStep].terminalTitle}
                </div>
                <div className="kc-inspector-status">
                  <span className="kc-mini-pulse" />
                  <span>SYNCED</span>
                </div>
              </div>

              <div className="kc-inspector-content">
                {activeStep === 0 && <InvariantsInspector />}
                {activeStep === 1 && <SandboxInspector />}
                {activeStep === 2 && <ChirpsInspector />}
              </div>

              {/* Bottom detail row */}
              <div className="kc-inspector-footer">
                <p className="kc-inspector-desc">{steps[activeStep].desc}</p>
                <Link href="/questions" className="kc-inspector-cta">
                  Test This In Sandbox <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   Technical Inspector: Invariant Deduction Matrix
   ───────────────────────────────────────────────────────────── */

function InvariantsInspector() {
  return (
    <div className="kc-inspector-body">
      <div className="kc-tech-row">
        <span className="kc-code-comment">{'// 1. CONSTRAINT ANALYSIS & ASYMPTOTIC CEILINGS'}</span>
      </div>

      <div className="kc-matrix-grid">
        <div className="kc-matrix-item">
          <div className="kc-matrix-label">INPUT BOUND</div>
          <div className="kc-matrix-value">N ≤ 2 × 10⁵</div>
        </div>
        <div className="kc-matrix-item">
          <div className="kc-matrix-label">TIME CEILING</div>
          <div className="kc-matrix-value">O(N log N) or O(N)</div>
        </div>
        <div className="kc-matrix-item">
          <div className="kc-matrix-label">SPACE BUDGET</div>
          <div className="kc-matrix-value">O(N) memory ceiling</div>
        </div>
        <div className="kc-matrix-item highlight">
          <div className="kc-matrix-label">DEDUCTION</div>
          <div className="kc-matrix-value">O(N²) Nested Loops will TLE</div>
        </div>
      </div>

      <div className="kc-tech-row" style={{ marginTop: '16px' }}>
        <span className="kc-code-comment">{'// 2. FORMAL INVARIANT SPECIFICATION'}</span>
      </div>

      <div className="kc-code-block">
        <div className="kc-code-line">
          <span className="kc-c-kw">assert</span>{' '}
          <span className="kc-c-fn">is_monotonic</span>(window.values) =={' '}
          <span className="kc-c-val">True</span>
        </div>
        <div className="kc-code-line">
          <span className="kc-c-cmt">{'# Invariant: Left pointer only advances when window violates constraint'}</span>
        </div>
        <div className="kc-code-line">
          <span className="kc-c-kw">while</span> window_sum &gt;= target:
        </div>
        <div className="kc-code-line" style={{ paddingLeft: '18px' }}>
          min_len = <span className="kc-c-fn">min</span>(min_len, right - left + 1)
        </div>
        <div className="kc-code-line" style={{ paddingLeft: '18px' }}>
          left += 1 <span className="kc-c-cmt"># Contraction restores boundary optimality</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Technical Inspector: Sandboxed Seccomp Micro-Terminal
   ───────────────────────────────────────────────────────────── */

function SandboxInspector() {
  return (
    <div className="kc-inspector-body">
      <div className="kc-tech-row">
        <span className="kc-code-comment">{'// DOCKER SANDBOX KERNEL TELEMETRY'}</span>
      </div>

      <div className="kc-terminal-stream">
        <div className="kc-term-line">
          <span className="kc-term-prompt">$</span> docker-socket-proxy :: dispatch_submission()
        </div>
        <div className="kc-term-line dim">
          [INIT] Container id: kc-sbx-82f1b0a9 (image: alpine:gcc-13)
        </div>
        <div className="kc-term-line dim">
          [SECURITY] --cap-drop=ALL --pids-limit=64 --read-only --network=none
        </div>
        <div className="kc-term-line">
          [COMPILE] g++ -O3 -std=c++20 solution.cpp -o solution (took 18ms)
        </div>
        <div className="kc-term-line success">
          [EXEC] Running 32 hidden test suites...
        </div>
        <div className="kc-term-line success">
          [PASS] Test 01..16: Validated (0.002s, 4.1MB)
        </div>
        <div className="kc-term-line success">
          [PASS] Test 17..32 (Max Constraint N=200,000): Validated (0.038s, 14.8MB)
        </div>
        <div className="kc-term-line highlight-green">
          ✔ VERDICT: ACCEPTED (Runtime: 38ms, Memory: 14.8MB, Exit Code: 0)
        </div>
      </div>

      <div className="kc-badges-row">
        <span className="kc-badge-chip">5 Languages Supported</span>
        <span className="kc-badge-chip">Zero Network Egress</span>
        <span className="kc-badge-chip">Resource Throttled</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Technical Inspector: Peer Chirp Reasoning Preview
   ───────────────────────────────────────────────────────────── */

function ChirpsInspector() {
  return (
    <div className="kc-inspector-body">
      <div className="kc-tech-row">
        <span className="kc-code-comment">{'// TOP REASONING CHIRP ON PROBLEM #42 (Trapping Rain Water)'}</span>
      </div>

      <div className="kc-chirp-card">
        <div className="kc-chirp-header">
          <div className="kc-chirp-avatar">EK</div>
          <div className="kc-chirp-user">
            <div className="kc-chirp-name">
              elena_k <span className="kc-author-badge">Staff Infra</span>
            </div>
            <div className="kc-chirp-meta">Two-Pointer Invariant Proof • 142 upvotes</div>
          </div>
          <div className="kc-chirp-upvote-btn">
            <span aria-hidden="true">▲</span> 142
          </div>
        </div>

        <p className="kc-chirp-body">
          &ldquo;Instead of memoizing left and right prefix maximums with O(N) arrays, observe
          that water above bar <code className="kc-inline-code">i</code> is strictly bound by
          <code className="kc-inline-code">min(max_left, max_right)</code>. Since we only move the
          pointer with the smaller boundary, we guarantee that the current smaller max is the true bottleneck.&rdquo;
        </p>

        <div className="kc-chirp-code-preview">
          <code>
            {`if height[left] < height[right]:`}
            <br />
            {`    max_left = max(max_left, height[left])`}
            <br />
            {`    trapped += max_left - height[left]  # O(1) space!`}
          </code>
        </div>
      </div>
    </div>
  );
}
