'use client';

import { useState, useEffect } from 'react';

/**
 * AlgorithmicHeroVisual
 * A distinctive, tactile algorithmic visualization console for the KodeChirp hero section.
 * Features 3 interactive algorithmic models:
 *   1. Graph Traversal (Dijkstra / Shortest Path Wave)
 *   2. Two-Pointer Invariant (Convergence on Monotonic Array)
 *   3. Sliding Window (Dynamic Invariant Stream)
 *
 * Implements clean geometric vector styling, subtle motion, real telemetry,
 * and dark-mode first blue-accent engineering aesthetic.
 */

export default function AlgorithmicHeroVisual() {
  const [activeAlgo, setActiveAlgo] = useState('graph'); // 'graph' | 'twoPointer' | 'slidingWindow'
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-advance step for the active algorithm
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 6);
    }, 1800);

    return () => clearInterval(interval);
  }, [isPlaying, activeAlgo]);

  // Reset step on algorithm switch
  const handleSelectAlgo = (algo) => {
    setActiveAlgo(algo);
    setCurrentStep(0);
  };

  return (
    <div className="kc-hero-visual-card" aria-label="Algorithmic Execution Visualization">
      {/* ── Console Header ── */}
      <div className="kc-console-header">
        <div className="kc-console-dots" aria-hidden="true">
          <span className="kc-dot kc-dot-red" />
          <span className="kc-dot kc-dot-amber" />
          <span className="kc-dot kc-dot-green" />
        </div>

        <div className="kc-console-title">
          <span className="kc-console-env">sandbox://kernel-x86_64</span>
          <span className="kc-console-divider">/</span>
          <span className="kc-console-file">
            {activeAlgo === 'graph' && 'dijkstra_traversal.rs'}
            {activeAlgo === 'twoPointer' && 'two_pointer_invariant.py'}
            {activeAlgo === 'slidingWindow' && 'monotonic_window.cpp'}
          </span>
        </div>

        <div className="kc-console-badge">
          <span className="kc-pulse-dot" />
          <span>RUNNING</span>
        </div>
      </div>

      {/* ── Algorithm Mode Tabs ── */}
      <div className="kc-visual-tabs" role="tablist" aria-label="Algorithm Models">
        <button
          type="button"
          role="tab"
          aria-selected={activeAlgo === 'graph'}
          className={`kc-tab-btn ${activeAlgo === 'graph' ? 'active' : ''}`}
          onClick={() => handleSelectAlgo('graph')}
        >
          <span className="kc-tab-num">01</span>
          <span>Shortest Path</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeAlgo === 'twoPointer'}
          className={`kc-tab-btn ${activeAlgo === 'twoPointer' ? 'active' : ''}`}
          onClick={() => handleSelectAlgo('twoPointer')}
        >
          <span className="kc-tab-num">02</span>
          <span>Two-Pointer</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeAlgo === 'slidingWindow'}
          className={`kc-tab-btn ${activeAlgo === 'slidingWindow' ? 'active' : ''}`}
          onClick={() => handleSelectAlgo('slidingWindow')}
        >
          <span className="kc-tab-num">03</span>
          <span>Sliding Window</span>
        </button>
      </div>

      {/* ── Interactive Canvas Viewport ── */}
      <div className="kc-visual-viewport">
        {/* Subtle coordinate grid overlay */}
        <div className="kc-grid-pattern" aria-hidden="true" />

        {activeAlgo === 'graph' && <GraphVisual step={currentStep} />}
        {activeAlgo === 'twoPointer' && <TwoPointerVisual step={currentStep} />}
        {activeAlgo === 'slidingWindow' && <SlidingWindowVisual step={currentStep} />}

        {/* Telemetry telemetry HUD */}
        <div className="kc-telemetry-hud">
          <div className="kc-hud-item">
            <span className="kc-hud-label">COMPLEXITY</span>
            <span className="kc-hud-val">
              {activeAlgo === 'graph' && 'O((V + E) log V)'}
              {activeAlgo === 'twoPointer' && 'O(N) time • O(1) space'}
              {activeAlgo === 'slidingWindow' && 'O(N) amortized'}
            </span>
          </div>

          <div className="kc-hud-item">
            <span className="kc-hud-label">STEP</span>
            <span className="kc-hud-val">0{currentStep + 1} / 06</span>
          </div>

          <div className="kc-hud-item">
            <span className="kc-hud-label">VERDICT</span>
            <span className="kc-hud-val kc-hud-pass">ACCEPTED • 42ms</span>
          </div>
        </div>
      </div>

      {/* ── Step Explanation & Manual Step Controls ── */}
      <div className="kc-console-footer">
        <div className="kc-step-caption">
          <span className="kc-caption-indicator">›</span>
          <span className="kc-caption-text">
            {activeAlgo === 'graph' && [
              'Initialize priority queue with source node S (dist=0).',
              'Pop node S: relax outgoing edges to A (weight 2) and B (weight 5).',
              'Pop node A (dist=2): examine neighbor C (weight 1) -> dist[C] = 3.',
              'Relax edge from C to D (weight 3) -> dist[D] = 6.',
              'Relax edge from D to Target T (weight 2) -> dist[T] = 8.',
              'Shortest path verified: S -> A -> C -> D -> T (Cost: 8). Optimal state locked.',
            ][currentStep]}

            {activeAlgo === 'twoPointer' && [
              'Place Left pointer at index 0, Right pointer at index 11. Initial volume = 0.',
              'height[L] = 1 < height[R] = 2. Update max_left = 1, advance L pointer.',
              'Trapped puddle calculated: max_left - height[L] = 1 unit. Advance L.',
              'L meets height 2: update max_left = 2. Advance L into depression.',
              'Right pointer decrements past valley: trapped water accumulates to 6 units.',
              'Pointers converge at apex (index 7). Final invariant verified: O(1) extra memory.',
            ][currentStep]}

            {activeAlgo === 'slidingWindow' && [
              'Window [0..0]: expand Right pointer. Frequency table initialized.',
              'Window [0..2]: subarray sum = 12. Constraint target (>= 15) not yet satisfied.',
              'Window [0..3]: Right includes element 7. Sum = 19 >= 15. Invariant satisfied!',
              'Contract Left: window becomes [1..3], length = 3. Invariant holds (Sum = 18).',
              'Contract Left: window becomes [2..3], length = 2. Sum = 11 < 15. Invariant broken.',
              'Minimum valid window recorded: length = 2. Optimal boundary confirmed.',
            ][currentStep]}
          </span>
        </div>

        <div className="kc-playback-controls">
          <button
            type="button"
            className="kc-control-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
            aria-label={isPlaying ? 'Pause simulation' : 'Resume simulation'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            className="kc-control-btn"
            onClick={() => setCurrentStep((prev) => (prev + 1) % 6)}
            title="Next step"
            aria-label="Next step"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODE 1: Graph Traversal (Dijkstra Shortest Path Wave)
   ───────────────────────────────────────────────────────────── */

function GraphVisual({ step }) {
  // Graph Nodes Definition
  const nodes = [
    { id: 'S', x: 45, y: 130, label: 'Src', activeAt: 0, dist: '0' },
    { id: 'A', x: 140, y: 65, label: 'A', activeAt: 1, dist: step >= 1 ? '2' : '∞' },
    { id: 'B', x: 140, y: 195, label: 'B', activeAt: 1, dist: step >= 1 ? '5' : '∞' },
    { id: 'C', x: 250, y: 70, label: 'C', activeAt: 2, dist: step >= 2 ? '3' : '∞' },
    { id: 'D', x: 260, y: 195, label: 'D', activeAt: 3, dist: step >= 3 ? '6' : '∞' },
    { id: 'T', x: 355, y: 130, label: 'Dst', activeAt: 4, dist: step >= 4 ? '8' : '∞' },
  ];

  // Edges Definition
  const edges = [
    { from: 'S', to: 'A', weight: '2', activeAt: 1, pathAt: 5 },
    { from: 'S', to: 'B', weight: '5', activeAt: 1 },
    { from: 'A', to: 'C', weight: '1', activeAt: 2, pathAt: 5 },
    { from: 'A', to: 'D', weight: '6', activeAt: 2 },
    { from: 'B', to: 'D', weight: '4', activeAt: 3 },
    { from: 'C', to: 'D', weight: '3', activeAt: 3, pathAt: 5 },
    { from: 'C', to: 'T', weight: '7', activeAt: 4 },
    { from: 'D', to: 'T', weight: '2', activeAt: 4, pathAt: 5 },
  ];

  const getNode = (id) => nodes.find((n) => n.id === id);

  return (
    <div className="kc-graph-wrapper">
      <svg viewBox="0 0 400 250" className="kc-graph-svg" aria-label="Graph shortest path network">
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.8" />
          </linearGradient>
          <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#3B82F6" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Directed Edges */}
        {edges.map((edge, idx) => {
          const u = getNode(edge.from);
          const v = getNode(edge.to);
          const isTraversed = step >= edge.activeAt;
          const isOptimal = step >= (edge.pathAt || 99);
          const midX = (u.x + v.x) / 2;
          const midY = (u.y + v.y) / 2;

          return (
            <g key={idx} className="kc-edge-group">
              <line
                x1={u.x}
                y1={u.y}
                x2={v.x}
                y2={v.y}
                className={`kc-edge-line ${isOptimal ? 'optimal' : isTraversed ? 'active' : ''}`}
              />
              {/* Animated pulse dot along the active edge */}
              {isTraversed && (
                <circle r="3" fill="#60A5FA" className="kc-edge-pulse-dot">
                  <animateMotion
                    path={`M ${u.x} ${u.y} L ${v.x} ${v.y}`}
                    dur="1.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* Edge Weight Pill */}
              <rect
                x={midX - 9}
                y={midY - 8}
                width="18"
                height="14"
                rx="3"
                className="kc-edge-bg"
              />
              <text x={midX} y={midY + 3} className="kc-edge-text">
                {edge.weight}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isCurrent = step === node.activeAt;
          const isVisited = step >= node.activeAt;
          const isFinal = step >= 5;

          return (
            <g key={node.id} className="kc-node-group">
              {/* Outer ring on visited */}
              {isVisited && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="22"
                  className={`kc-node-ring ${isCurrent ? 'pulsing' : ''}`}
                />
              )}

              {/* Core Node Circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r="16"
                className={`kc-node-core ${isFinal ? 'optimal' : isVisited ? 'visited' : ''} ${isCurrent ? 'current' : ''}`}
                filter={isCurrent || isFinal ? 'url(#nodeGlow)' : undefined}
              />

              {/* Node Label */}
              <text x={node.x} y={node.y + 4} className="kc-node-label">
                {node.label}
              </text>

              {/* Dist Metric Badge */}
              <text x={node.x} y={node.y - 20} className="kc-node-dist">
                dist:{node.dist}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODE 2: Two-Pointer Convergence (Histogram Invariant)
   ───────────────────────────────────────────────────────────── */

function TwoPointerVisual({ step }) {
  // Height profile representing elevation map
  const heights = [1, 3, 1, 4, 2, 1, 3, 5, 2, 3, 1, 2];

  // Pointer positions per step (0 to 5)
  const pointerStates = [
    { l: 0, r: 11, water: 0, maxL: 1, maxR: 2 },
    { l: 1, r: 11, water: 1, maxL: 3, maxR: 2 },
    { l: 1, r: 9, water: 2, maxL: 3, maxR: 3 },
    { l: 3, r: 9, water: 4, maxL: 4, maxR: 3 },
    { l: 3, r: 7, water: 6, maxL: 4, maxR: 5 },
    { l: 7, r: 7, water: 6, maxL: 5, maxR: 5 },
  ];

  const current = pointerStates[Math.min(step, pointerStates.length - 1)];

  return (
    <div className="kc-histogram-wrapper">
      <div className="kc-histogram-bars">
        {heights.map((h, idx) => {
          const isL = idx === current.l;
          const isR = idx === current.r;
          const isInside = idx >= current.l && idx <= current.r;
          const hasWater = idx > 1 && idx < 7 && step >= 2;

          return (
            <div key={idx} className="kc-bar-col">
              {/* Pointer indicator tags */}
              <div className="kc-pointer-slot">
                {isL && <span className="kc-pointer-tag kc-ptr-l">L</span>}
                {isR && !isL && <span className="kc-pointer-tag kc-ptr-r">R</span>}
                {isL && isR && <span className="kc-pointer-tag kc-ptr-both">L=R</span>}
              </div>

              {/* Water trapped layer */}
              <div
                className={`kc-water-block ${hasWater ? 'active' : ''}`}
                style={{ height: hasWater ? `${(4 - h) * 14}px` : '0px' }}
              />

              {/* Solid bar */}
              <div
                className={`kc-histo-bar ${isInside ? 'in-range' : 'dimmed'}`}
                style={{ height: `${h * 24}px` }}
              >
                <span className="kc-bar-val">{h}</span>
              </div>

              <span className="kc-bar-idx">[{idx}]</span>
            </div>
          );
        })}
      </div>

      <div className="kc-invariant-strip">
        <span className="kc-inv-badge">INVARIANT: min(max_l, max_r) - height[i]</span>
        <span className="kc-inv-metric">
          Accumulated Water = <strong>{current.water} units</strong>
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODE 3: Sliding Window Stream
   ───────────────────────────────────────────────────────────── */

function SlidingWindowVisual({ step }) {
  const stream = [2, 3, 1, 2, 4, 3, 5, 2, 1, 6];

  // Window bounds per step [L, R]
  const windowStates = [
    { l: 0, r: 0, sum: 2, valid: false },
    { l: 0, r: 2, sum: 6, valid: false },
    { l: 0, r: 4, sum: 12, valid: false },
    { l: 0, r: 5, sum: 15, valid: true },
    { l: 2, r: 5, sum: 10, valid: false },
    { l: 3, r: 6, sum: 14, valid: true },
  ];

  const current = windowStates[Math.min(step, windowStates.length - 1)];

  return (
    <div className="kc-stream-wrapper">
      <div className="kc-stream-meta">
        <div className="kc-stream-goal">
          <span>Target Condition:</span>
          <code>Subarray Sum ≥ 14</code>
        </div>
        <div className="kc-stream-status">
          <span>Window Sum: <strong>{current.sum}</strong></span>
          <span className={`kc-valid-pill ${current.valid ? 'valid' : 'invalid'}`}>
            {current.valid ? 'VALID SUBARRAY' : 'SEARCHING'}
          </span>
        </div>
      </div>

      <div className="kc-stream-cells">
        {stream.map((val, idx) => {
          const inWindow = idx >= current.l && idx <= current.r;
          const isL = idx === current.l;
          const isR = idx === current.r;

          return (
            <div
              key={idx}
              className={`kc-stream-cell ${inWindow ? 'in-window' : ''} ${isL ? 'left-edge' : ''} ${isR ? 'right-edge' : ''}`}
            >
              <div className="kc-cell-val">{val}</div>
              <div className="kc-cell-idx">idx {idx}</div>
              {isL && <div className="kc-window-bracket-l" />}
              {isR && <div className="kc-window-bracket-r" />}
            </div>
          );
        })}
      </div>

      <div className="kc-window-bracket-bar">
        <div
          className="kc-bracket-highlight"
          style={{
            left: `${current.l * 10}%`,
            width: `${(current.r - current.l + 1) * 10}%`,
          }}
        >
          <span className="kc-bracket-caption">
            Length: {current.r - current.l + 1} elements
          </span>
        </div>
      </div>
    </div>
  );
}
