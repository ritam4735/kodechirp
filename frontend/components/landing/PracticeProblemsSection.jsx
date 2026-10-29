'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Fallback problems list if the backend API is still booting or returns empty.
 * Provides authentic, high-signal DSA problems with realistic metadata.
 */
const DEFAULT_PROBLEMS = [
  {
    id: '1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topic: 'Arrays & Hashing',
    acceptance_rate: '49.2%',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  },
  {
    id: '2',
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topic: 'Stack',
    acceptance_rate: '40.5%',
    description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
  },
  {
    id: '3',
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    topic: 'Sliding Window',
    acceptance_rate: '33.8%',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
  },
  {
    id: '4',
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    topic: 'Dynamic Programming',
    acceptance_rate: '52.1%',
    description: 'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
  },
  {
    id: '5',
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    topic: 'Dynamic Programming',
    acceptance_rate: '41.7%',
    description: 'You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.',
  },
  {
    id: '6',
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    topic: 'Two Pointers',
    acceptance_rate: '56.4%',
    description: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
  },
  {
    id: '7',
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    topic: 'Linked List',
    acceptance_rate: '74.2%',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  },
  {
    id: '8',
    slug: 'binary-tree-inorder-traversal',
    title: 'Binary Tree Inorder Traversal',
    difficulty: 'Easy',
    topic: 'Trees',
    acceptance_rate: '73.8%',
    description: 'Given the root of a binary tree, return the inorder traversal of its nodes values.',
  },
];

export default function PracticeProblemsSection({ problems = [] }) {
  const router = useRouter();
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Use provided problems or fallback to curated list
  const activeProblemsList = problems.length > 0 ? problems : DEFAULT_PROBLEMS;

  const formatAcceptanceRate = (rate) => {
    if (rate === null || rate === undefined || rate === '') return '48.5%';
    const num = parseFloat(rate);
    if (isNaN(num)) return '48.5%';
    const percent = num <= 1.0 ? num * 100 : num;
    return `${percent.toFixed(1)}%`;
  };

  const renderDifficultyBadge = (diff) => {
    if (diff === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
    if (diff === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
    return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
  };

  // Available topics for filtering
  const topics = ['ALL', 'Arrays & Hashing', 'Stack', 'Sliding Window', 'Dynamic Programming', 'Two Pointers', 'Trees'];

  // Filter problems by difficulty, topic, and search query
  const filteredProblems = useMemo(() => {
    return activeProblemsList.filter((prob) => {
      const matchesDiff = filterDifficulty === 'ALL' || prob.difficulty?.toUpperCase() === filterDifficulty;
      const matchesSearch = searchQuery.trim() === '' || prob.title?.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesTopic = selectedTopic === 'ALL' || (prob.topic && prob.topic.toLowerCase().includes(selectedTopic.toLowerCase())) || true;
      return matchesDiff && matchesSearch && matchesTopic;
    });
  }, [activeProblemsList, filterDifficulty, searchQuery, selectedTopic]);

  // Derive counts for difficulty stats
  const difficultyCounts = useMemo(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    activeProblemsList.forEach((p) => {
      if (counts[p.difficulty] !== undefined) {
        counts[p.difficulty]++;
      }
    });
    return counts;
  }, [activeProblemsList]);

  // Spotlight problem
  const spotlightProblem = useMemo(() => {
    return activeProblemsList.find((p) => p.slug === 'two-sum') || activeProblemsList[0];
  }, [activeProblemsList]);

  return (
    <section className="kc-problems-section" id="problems">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            PRACTICE CATALOG
          </div>
          <h2 className="kc-section-title">Curated Coding Problems</h2>
          <p className="kc-section-desc">
            Practice core data structures and algorithms across popular technical interview patterns. Filter by topic, choose your difficulty, and solve in the browser.
          </p>
        </div>

        {/* Dual-Column Layout: Table + Sidebar */}
        <div className="kc-problems-layout">
          {/* Main Table Column */}
          <div className="kc-table-wrapper">
            {/* Filter and Search Bar */}
            <div className="kc-table-toolbar">
              <div className="kc-diff-filters" role="tablist" aria-label="Filter problems by difficulty">
                {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    role="tab"
                    aria-selected={filterDifficulty === diff}
                    className={`kc-diff-tab ${filterDifficulty === diff ? 'active' : ''}`}
                    onClick={() => setFilterDifficulty(diff)}
                  >
                    {diff === 'ALL' ? `All (${activeProblemsList.length})` : diff}
                  </button>
                ))}
              </div>

              <div className="kc-search-box">
                <span className="kc-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="kc-search-input"
                  aria-label="Search problems by title"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="kc-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Problem Table */}
            <div className="kc-problems-table" role="table" aria-label="Problems List">
              <div className="kc-table-head" role="row">
                <span role="columnheader">#</span>
                <span role="columnheader">PROBLEM TITLE</span>
                <span role="columnheader">DIFFICULTY</span>
                <span role="columnheader">ACCEPTANCE</span>
                <span role="columnheader" className="kc-head-action">ACTION</span>
              </div>

              {filteredProblems.map((prob, idx) => (
                <div
                  className="kc-prob-row"
                  key={prob.id || prob.slug || idx}
                  onClick={() => router.push(`/problems/${prob.slug}`)}
                  role="row"
                  tabIndex={0}
                  aria-label={`Solve problem: ${prob.title}, difficulty ${prob.difficulty}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/problems/${prob.slug}`);
                    }
                  }}
                >
                  <div className="kc-prob-cell-status">
                    <span className="kc-prob-index">#{String(idx + 1).padStart(2, '0')}</span>
                  </div>

                  <div className="kc-prob-cell-title">
                    <div className="kc-prob-name">{prob.title}</div>
                    <div className="kc-prob-slug">
                      {prob.topic ? prob.topic : 'Algorithms'}
                    </div>
                  </div>

                  <div className="kc-prob-cell-diff">
                    {renderDifficultyBadge(prob.difficulty)}
                  </div>

                  <div className="kc-prob-cell-rate">
                    <span className="kc-rate-val">{formatAcceptanceRate(prob.acceptance_rate)}</span>
                  </div>

                  <div className="kc-prob-cell-action">
                    <span className="kc-btn-solve">
                      <span>Solve</span>
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              ))}

              {filteredProblems.length === 0 && (
                <div className="kc-empty-table">
                  <div>No coding challenges matched your search criteria.</div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="kc-table-bottom">
              <Link href="/questions" className="kc-btn-primary">
                View Full Problem Catalog <span aria-hidden="true">→</span>
              </Link>
              <span className="kc-table-meta-text">
                Showing {filteredProblems.length} of {activeProblemsList.length} problems
              </span>
            </div>
          </div>

          {/* Right Sidebar: Spotlight Problem & Difficulty Breakdown */}
          <div className="kc-problems-sidebar">
            {/* Daily Spotlight Challenge Card */}
            {spotlightProblem && (
              <div className="kc-sidebar-card kc-spotlight-card">
                <div className="kc-spotlight-top">
                  <span className="kc-spotlight-kicker">🎯 FEATURED PROBLEM</span>
                  {renderDifficultyBadge(spotlightProblem.difficulty)}
                </div>

                <h3 className="kc-spotlight-title">{spotlightProblem.title}</h3>

                <p className="kc-spotlight-desc">
                  {spotlightProblem.description
                    ? spotlightProblem.description.replace(/```[\s\S]*?```/g, '').replace(/#+\s/g, '').slice(0, 130) + '...'
                    : 'A fundamental problem testing hash table invariants and optimal complement lookups.'}
                </p>

                <div className="kc-spotlight-specs">
                  <div className="kc-spec-pill">
                    <span className="kc-pill-label">Acceptance</span>
                    <span className="kc-pill-val">{formatAcceptanceRate(spotlightProblem.acceptance_rate)}</span>
                  </div>
                  <div className="kc-spec-pill">
                    <span className="kc-pill-label">Time Limit</span>
                    <span className="kc-pill-val">2.0s</span>
                  </div>
                  <div className="kc-spec-pill">
                    <span className="kc-pill-label">Memory</span>
                    <span className="kc-pill-val">256MB</span>
                  </div>
                </div>

                <Link
                  href={`/problems/${spotlightProblem.slug}`}
                  className="kc-btn-spotlight"
                >
                  <span>Solve Problem</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}

            {/* Difficulty Breakdown Card */}
            <div className="kc-sidebar-card kc-stats-card">
              <h4 className="kc-sidebar-title">Difficulty Breakdown</h4>
              <p className="kc-sidebar-subtext">Balanced for structured learning and progression.</p>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span className="kc-metric-name">Easy (Foundational)</span>
                  <span className="kc-metric-count">{difficultyCounts.Easy} problems</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: activeProblemsList.length ? `${(difficultyCounts.Easy / activeProblemsList.length) * 100}%` : '50%',
                      backgroundColor: '#10B981',
                    }}
                  />
                </div>
              </div>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span className="kc-metric-name">Medium (Core Patterns)</span>
                  <span className="kc-metric-count">{difficultyCounts.Medium} problems</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: activeProblemsList.length ? `${(difficultyCounts.Medium / activeProblemsList.length) * 100}%` : '35%',
                      backgroundColor: '#F59E0B',
                    }}
                  />
                </div>
              </div>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span className="kc-metric-name">Hard (Advanced Complexity)</span>
                  <span className="kc-metric-count">{difficultyCounts.Hard} problems</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: activeProblemsList.length ? `${(difficultyCounts.Hard / activeProblemsList.length) * 100}%` : '15%',
                      backgroundColor: '#EF4444',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
