'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * InteractiveFeatures
 * Replaces the previous static text rows with an interactive, tactile
 * engineering Bento grid featuring:
 *  1. Multi-Language Code Runner with language tabs and live execution simulation
 *  2. Problem Domain Spectrum with category chips and deliberate practice paths
 *  3. Peer Chirp Reasoning Engine with interactive upvoting and mental model preview
 */

export default function InteractiveFeatures() {
  const router = useRouter();

  // Multi-Language Editor State
  const [selectedLang, setSelectedLang] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  // Upvote interaction on chirp card
  const [upvotes, setUpvotes] = useState(238);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState('all');

  const codeSnippets = {
    python: {
      lang: 'Python 3.11',
      code: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        lookup = {}
        for idx, val in enumerate(nums):
            diff = target - val
            if diff in lookup:
                return [lookup[diff], idx]
            lookup[val] = idx
        return []`,
      runtime: '32ms',
      memory: '15.4MB',
    },
    cpp: {
      lang: 'C++20 (GCC 13)',
      code: `class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        std::unordered_map<int, int> lookup;
        for (int i = 0; i < (int)nums.size(); ++i) {
            int complement = target - nums[i];
            if (lookup.count(complement)) return {lookup[complement], i};
            lookup[nums[i]] = i;
        }
        return {};
    }
};`,
      runtime: '4ms',
      memory: '10.8MB',
    },
    javascript: {
      lang: 'Node.js 20',
      code: `function twoSum(nums, target) {
  const lookup = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (lookup.has(diff)) {
      return [lookup.get(diff), i];
    }
    lookup.set(nums[i], i);
  }
  return [];
}`,
      runtime: '48ms',
      memory: '44.1MB',
    },
    java: {
      lang: 'OpenJDK 17',
      code: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) return new int[] { map.get(comp), i };
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,
      runtime: '2ms',
      memory: '42.6MB',
    },
    c: {
      lang: 'C17 (Clang)',
      code: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    *returnSize = 2;
    int* res = (int*)malloc(2 * sizeof(int));
    // Fast O(N) Hash Table or Two-Pointer scan
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                res[0] = i; res[1] = j; return res;
            }
        }
    }
    return res;
}`,
      runtime: '1ms',
      memory: '6.2MB',
    },
  };

  const handleSimulateRun = () => {
    setIsRunning(true);
    setRunResult(null);

    setTimeout(() => {
      setIsRunning(false);
      setRunResult({
        status: 'ACCEPTED',
        passed: '48/48 Test Cases Passed',
        runtime: codeSnippets[selectedLang].runtime,
        memory: codeSnippets[selectedLang].memory,
      });
    }, 700);
  };

  const handleUpvote = () => {
    if (hasUpvoted) {
      setUpvotes((prev) => prev - 1);
      setHasUpvoted(false);
    } else {
      setUpvotes((prev) => prev + 1);
      setHasUpvoted(true);
    }
  };

  const problemCategories = [
    { id: 'all', label: 'All Domains', count: 54 },
    { id: 'dp', label: 'Dynamic Programming', count: 18 },
    { id: 'graphs', label: 'Graph Theory & Trees', count: 14 },
    { id: 'pointers', label: 'Two Pointers & Sliding Window', count: 12 },
    { id: 'structures', label: 'Monotonic Stacks & Heaps', count: 10 },
  ];

  return (
    <section className="kc-features-section" id="features">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            CORE CAPABILITIES
          </div>
          <h2 className="kc-section-title">
            Engineered for deliberate practice.
          </h2>
          <p className="kc-section-desc">
            A developer platform focused strictly on deep comprehension, sandboxed reliability,
            and shared algorithmic mastery. Zero fluff, zero advertising.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="kc-bento-grid">
          {/* Card 1: Multi-Language Isolated Runner (Large Card) */}
          <div className="kc-bento-card kc-bento-runner">
            <div className="kc-bento-header">
              <div>
                <div className="kc-bento-tag">SANDBOX ENGINE</div>
                <h3 className="kc-bento-title">Multi-Language Sandbox Editor</h3>
              </div>
              <span className="kc-bento-badge">v2.4 Kernel</span>
            </div>

            <p className="kc-bento-desc">
              Execute against isolated Linux micro-containers with non-root security, memory profiling,
              and immediate stderr/stdout telemetry.
            </p>

            {/* Language Tabs */}
            <div className="kc-lang-tabs" role="tablist" aria-label="Editor Languages">
              {Object.keys(codeSnippets).map((langKey) => (
                <button
                  key={langKey}
                  type="button"
                  role="tab"
                  aria-selected={selectedLang === langKey}
                  className={`kc-lang-tab ${selectedLang === langKey ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedLang(langKey);
                    setRunResult(null);
                  }}
                >
                  {langKey.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div className="kc-runner-box">
              <div className="kc-runner-titlebar">
                <span className="kc-runner-file">solution.{selectedLang === 'python' ? 'py' : selectedLang === 'cpp' ? 'cpp' : selectedLang === 'javascript' ? 'js' : selectedLang === 'java' ? 'java' : 'c'}</span>
                <span className="kc-runner-target">{codeSnippets[selectedLang].lang}</span>
              </div>
              <pre className="kc-runner-code">
                <code>{codeSnippets[selectedLang].code}</code>
              </pre>

              {/* Execution Action & Verdict Bar */}
              <div className="kc-runner-bar">
                <button
                  type="button"
                  className="kc-btn-run"
                  onClick={handleSimulateRun}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <span className="kc-spinner" aria-hidden="true" />
                      <span>Executing in Sandbox...</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">▶</span>
                      <span>Run Test Cases</span>
                    </>
                  )}
                </button>

                {runResult && (
                  <div className="kc-run-verdict animate-fade-in">
                    <span className="kc-verdict-pill">✔ {runResult.status}</span>
                    <span className="kc-verdict-stat">{runResult.passed}</span>
                    <span className="kc-verdict-stat">Time: {runResult.runtime}</span>
                    <span className="kc-verdict-stat">Mem: {runResult.memory}</span>
                  </div>
                )}

                <Link href="/questions" className="kc-runner-link">
                  Open Full Editor <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Hand-Crafted Problem Library */}
          <div className="kc-bento-card kc-bento-library">
            <div className="kc-bento-header">
              <div>
                <div className="kc-bento-tag">CURATED DOMAINS</div>
                <h3 className="kc-bento-title">Deliberate Problem Taxonomy</h3>
              </div>
            </div>

            <p className="kc-bento-desc">
              Every challenge is structured around universal algorithmic invariants rather than
              arbitrary trick questions.
            </p>

            <div className="kc-domain-pills">
              {problemCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`kc-domain-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span>{cat.label}</span>
                  <span className="kc-pill-count">{cat.count}</span>
                </button>
              ))}
            </div>

            <div className="kc-domain-preview">
              <div className="kc-domain-row" onClick={() => router.push('/problems/two-sum')} role="button" tabIndex={0}>
                <span className="kc-prob-tag easy">Easy</span>
                <span className="kc-prob-title-preview">Two Sum</span>
                <span className="kc-prob-subtext">Hash Invariant • O(N)</span>
                <span className="kc-prob-arrow">→</span>
              </div>
              <div className="kc-domain-row" onClick={() => router.push('/problems/valid-parentheses')} role="button" tabIndex={0}>
                <span className="kc-prob-tag easy">Easy</span>
                <span className="kc-prob-title-preview">Valid Parentheses</span>
                <span className="kc-prob-subtext">LIFO Stack • O(N)</span>
                <span className="kc-prob-arrow">→</span>
              </div>
              <div className="kc-domain-row" onClick={() => router.push('/problems/climbing-stairs')} role="button" tabIndex={0}>
                <span className="kc-prob-tag medium">Med</span>
                <span className="kc-prob-title-preview">Climbing Stairs</span>
                <span className="kc-prob-subtext">State Transitions • O(N)</span>
                <span className="kc-prob-arrow">→</span>
              </div>
            </div>

            <Link href="/questions" className="kc-card-bottom-cta">
              Explore All Challenges <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Card 3: Peer Chirp Reasoning Engine */}
          <div className="kc-bento-card kc-bento-chirps">
            <div className="kc-bento-header">
              <div>
                <div className="kc-bento-tag">COLLECTIVE INTELLIGENCE</div>
                <h3 className="kc-bento-title">Community Chirps</h3>
              </div>
            </div>

            <p className="kc-bento-desc">
              Post your conceptual breakthroughs, alternate complexity trade-offs, and mental models
              directly on problem threads.
            </p>

            {/* Interactive Chirp Card */}
            <div className="kc-sample-chirp">
              <div className="kc-chirp-meta-bar">
                <div className="kc-chirp-author">
                  <div className="kc-chirp-badge-avatar">MV</div>
                  <div>
                    <div className="kc-chirp-author-name">marcus_v</div>
                    <div className="kc-chirp-subline">Discussing: Reverse Linked List</div>
                  </div>
                </div>

                <button
                  type="button"
                  className={`kc-interactive-upvote ${hasUpvoted ? 'voted' : ''}`}
                  onClick={handleUpvote}
                  aria-label={`Upvote chirp, current upvotes: ${upvotes}`}
                >
                  <span className="kc-upvote-icon">▲</span>
                  <span className="kc-upvote-num">{upvotes}</span>
                </button>
              </div>

              <div className="kc-chirp-text">
                &ldquo;Before touching pointers, visualize the 3 invariants:
                <code className="kc-inline-code">prev</code> holds the reversed tail,
                <code className="kc-inline-code">curr</code> is the pivot node, and
                <code className="kc-inline-code">next_tmp</code> preserves the forward frontier.
                Zero pointer loss guaranteed.&rdquo;
              </div>

              <div className="kc-chirp-tags">
                <span className="kc-mini-tag">#Pointers</span>
                <span className="kc-mini-tag">#Invariants</span>
                <span className="kc-mini-tag">#MentalModel</span>
              </div>
            </div>

            <Link href="/questions" className="kc-card-bottom-cta">
              Browse Problem Discussions <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
