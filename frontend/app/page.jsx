'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import AlgorithmicHeroVisual from '../components/landing/AlgorithmicHeroVisual';
import WorkflowSection from '../components/landing/WorkflowSection';
import InteractiveFeatures from '../components/landing/InteractiveFeatures';

/* ──────────────────────────────────────────────
   HERO SECTION
   Split layout: Editorial high-signal copy on left,
   tactile algorithmic execution visual on right.
   ────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="kc-hero" id="home">
      <div className="kc-container kc-hero-container">
        {/* Left Column: Mission & Core Value */}
        <div className="kc-hero-content">
          <div className="kc-kicker">
            <span className="kc-kicker-dot" />
            <span>Open-Source Developer Platform</span>
            <span className="kc-kicker-sep">/</span>
            <span className="kc-kicker-ver">Kernel v2.4</span>
          </div>

          <h1 className="kc-headline">
            Deep algorithmic <br className="kc-headline-br" />
            <span className="kc-headline-gradient">understanding.</span><br />
            Built for engineers.
          </h1>

          <p className="kc-subtext">
            Transform raw intuition into verified technical instinct. Zero-overhead sandboxed
            execution across 5 runtimes, real-time telemetry, and peer-driven problem deconstruction.
          </p>

          <div className="kc-actions">
            <Link href="/questions" className="kc-btn-primary">
              <span>Start Solving</span>
              <span className="kc-btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="#how-it-works" className="kc-btn-secondary">
              <span>System Workflow</span>
              <span className="kc-btn-down" aria-hidden="true">↓</span>
            </Link>
          </div>

          {/* Engineering Specs Row */}
          <div className="kc-hero-specs">
            <div className="kc-spec-item">
              <span className="kc-spec-label">RUNTIMES</span>
              <span className="kc-spec-val">Python • C++ • JS • Java • C</span>
            </div>
            <div className="kc-spec-item">
              <span className="kc-spec-label">ISOLATION</span>
              <span className="kc-spec-val">Seccomp + PID Throttling</span>
            </div>
            <div className="kc-spec-item">
              <span className="kc-spec-label">LATENCY</span>
              <span className="kc-spec-val">&lt; 85ms Hot Sandboxes</span>
            </div>
          </div>
        </div>

        {/* Right Column: Distinctive Algorithmic Hero Visual */}
        <div className="kc-hero-visual-col">
          <AlgorithmicHeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   ACTIVE CHALLENGES SECTION
   Enhanced problem table with search, difficulty filters,
   acceptance formatting, and a featured daily spotlight sidebar.
   ────────────────────────────────────────────── */

function ProblemsSection({ problems }) {
  const router = useRouter();
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Format acceptance rate correctly: handle both decimal (0.72) and percent (72.0)
  const formatAcceptanceRate = (rate) => {
    if (rate === null || rate === undefined || rate === '') return '0.0%';
    const num = parseFloat(rate);
    if (isNaN(num)) return '0.0%';
    const percent = num <= 1.0 ? num * 100 : num;
    return `${percent.toFixed(1)}%`;
  };

  const renderDifficultyBadge = (diff) => {
    if (diff === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
    if (diff === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
    return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
  };

  // Filter problems by difficulty and search query
  const filteredProblems = useMemo(() => {
    return problems.filter((prob) => {
      const matchesDiff = filterDifficulty === 'ALL' || prob.difficulty?.toUpperCase() === filterDifficulty;
      const matchesSearch = searchQuery.trim() === '' || prob.title?.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesDiff && matchesSearch;
    });
  }, [problems, filterDifficulty, searchQuery]);

  // Derive counts for difficulty stats
  const difficultyCounts = useMemo(() => {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    problems.forEach((p) => {
      if (counts[p.difficulty] !== undefined) {
        counts[p.difficulty]++;
      }
    });
    return counts;
  }, [problems]);

  // Spotlight Problem: Select first Hard or Medium challenge, or first problem
  const spotlightProblem = useMemo(() => {
    if (!problems.length) return null;
    return problems.find((p) => p.difficulty === 'Hard') || problems.find((p) => p.difficulty === 'Medium') || problems[0];
  }, [problems]);

  return (
    <section className="kc-problems-section" id="problems">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            BENCHMARK PROBLEMS
          </div>
          <h2 className="kc-section-title">Active Challenges</h2>
          <p className="kc-section-desc">
            Direct access to production-grade algorithmic problems. 5 language runtimes,
            sandboxed execution, instant test suite verification.
          </p>
        </div>

        {/* Dual-Column Layout: Table + Spotlight Sidebar */}
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
                    {diff === 'ALL' ? `All (${problems.length})` : diff}
                  </button>
                ))}
              </div>

              <div className="kc-search-box">
                <span className="kc-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  placeholder="Filter challenges..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="kc-search-input"
                  aria-label="Filter challenges by title"
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
            <div className="kc-problems-table" role="table" aria-label="Active Challenges List">
              <div className="kc-table-head" role="row">
                <span role="columnheader">STATUS</span>
                <span role="columnheader">CHALLENGE TITLE</span>
                <span role="columnheader">DIFFICULTY</span>
                <span role="columnheader">ACCEPTANCE</span>
                <span role="columnheader" className="kc-head-action">ACTION</span>
              </div>

              {filteredProblems.map((prob, idx) => (
                <div
                  className="kc-prob-row"
                  key={prob.id || prob.slug}
                  onClick={() => router.push(`/problems/${prob.slug}`)}
                  role="row"
                  tabIndex={0}
                  aria-label={`Solve challenge: ${prob.title}, difficulty ${prob.difficulty}`}
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
                    <div className="kc-prob-slug">slug: {prob.slug}</div>
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
                  {problems.length === 0 ? (
                    <div className="kc-loading-pulse">
                      <span className="kc-spinner" aria-hidden="true" />
                      <span>Loading active challenges from cluster...</span>
                    </div>
                  ) : (
                    <div>No challenges matched your filter criteria.</div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="kc-table-bottom">
              <Link href="/questions" className="kc-btn-primary">
                View All 50+ Challenges <span aria-hidden="true">→</span>
              </Link>
              <span className="kc-table-meta-text">
                Showing {filteredProblems.length} of {problems.length} loaded challenges
              </span>
            </div>
          </div>

          {/* Right Sidebar: Spotlight Challenge & Distribution Stats */}
          <div className="kc-problems-sidebar">
            {/* Daily Spotlight Challenge Card */}
            {spotlightProblem && (
              <div className="kc-sidebar-card kc-spotlight-card">
                <div className="kc-spotlight-top">
                  <span className="kc-spotlight-kicker">🎯 DAILY SPOTLIGHT</span>
                  {renderDifficultyBadge(spotlightProblem.difficulty)}
                </div>

                <h3 className="kc-spotlight-title">{spotlightProblem.title}</h3>

                <p className="kc-spotlight-desc">
                  {spotlightProblem.description
                    ? spotlightProblem.description.replace(/```[\s\S]*?```/g, '').replace(/#+\s/g, '').slice(0, 140) + '...'
                    : 'A core algorithmic challenge testing optimal invariant formulation and edge-case resilience.'}
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
                  <span>Launch Sandbox</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}

            {/* Platform Difficulty Breakdown Card */}
            <div className="kc-sidebar-card kc-stats-card">
              <h4 className="kc-sidebar-title">Difficulty Spectrum</h4>
              <p className="kc-sidebar-subtext">Balanced for deliberate skill progression.</p>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span className="kc-metric-name">Easy (Foundational)</span>
                  <span className="kc-metric-count">{difficultyCounts.Easy} problems</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: problems.length ? `${(difficultyCounts.Easy / problems.length) * 100}%` : '33%',
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
                      width: problems.length ? `${(difficultyCounts.Medium / problems.length) * 100}%` : '45%',
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
                      width: problems.length ? `${(difficultyCounts.Hard / problems.length) * 100}%` : '22%',
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

/* ──────────────────────────────────────────────
   PLANNED & UPCOMING — Attractive roadmap cards
   with unambiguous unavailability indicators.
   ────────────────────────────────────────────── */

function PlannedSection() {
  const planned = [
    {
      title: 'Video Flights',
      tag: 'IN DESIGN',
      tagType: 'design',
      badge: 'Roadmap Preview • Not Yet Available',
      desc: 'Short-form visual breakdowns by elite problem solvers thinking through complex dynamic programming, trees, and graph invariants.',
      previewMockup: 'video',
      href: '/coming-soon/flights',
    },
    {
      title: 'Focused Flocks',
      tag: 'PLANNED',
      tagType: 'planned',
      badge: 'Architecture Phase • Not Yet Available',
      desc: 'Small, curated cohorts of software engineers tackling shared technical interview roadmaps and running mock whiteboard sessions together.',
      previewMockup: 'flocks',
      href: '/coming-soon/flocks',
    },
    {
      title: 'The Nest',
      tag: 'PLANNED',
      tagType: 'planned',
      badge: 'Personal Catalog • In Development',
      desc: 'Your persistent knowledge vault. Bookmark problem invariants, annotate subtle edge cases, and export personalized revision cheat sheets.',
      previewMockup: 'nest',
      href: '/coming-soon/nest',
    },
    {
      title: 'Progress Dashboard',
      tag: 'BETA TESTING',
      tagType: 'progress',
      badge: 'Beta Roadmap • Expanded Telemetry Soon',
      desc: 'Deep velocity metrics, difficulty breakdown, topic mastery heatmaps, streak tracking, and automated recommendations for weak patterns.',
      previewMockup: 'dashboard',
      href: '/progress',
    },
  ];

  return (
    <section className="kc-planned-section" id="roadmap">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            PLATFORM ROADMAP
          </div>
          <h2 className="kc-section-title">Planned &amp; Upcoming</h2>
          <p className="kc-section-desc">
            What the core engineering team is architecting next. The features below are currently
            in design or development and are not yet released for general practice.
          </p>
        </div>

        {/* 2x2 Attractive Grid */}
        <div className="kc-planned-grid">
          {planned.map((item) => (
            <div key={item.title} className="kc-planned-card">
              {/* Header Status & Locked Indicator */}
              <div className="kc-planned-card-header">
                <div className="kc-planned-status-pill">
                  <span className={`kc-planned-status-tag ${item.tagType}`}>{item.tag}</span>
                  <span className="kc-unavail-badge">
                    <span className="kc-lock-icon" aria-hidden="true">🔒</span>
                    {item.badge}
                  </span>
                </div>
              </div>

              <h3 className="kc-planned-title">{item.title}</h3>
              <p className="kc-planned-desc">{item.desc}</p>

              {/* Attractive Technical Mockup */}
              <div className="kc-planned-mockup">
                {item.previewMockup === 'video' && (
                  <div className="kc-mockup-video">
                    <div className="kc-video-play-btn" aria-hidden="true">▶</div>
                    <div className="kc-waveform">
                      <span style={{ height: '40%' }} />
                      <span style={{ height: '70%' }} />
                      <span style={{ height: '100%' }} />
                      <span style={{ height: '55%' }} />
                      <span style={{ height: '85%' }} />
                      <span style={{ height: '35%' }} />
                      <span style={{ height: '60%' }} />
                    </div>
                    <span className="kc-video-time">04:18 • State Tree Analysis</span>
                  </div>
                )}

                {item.previewMockup === 'flocks' && (
                  <div className="kc-mockup-cohort">
                    <div className="kc-cohort-avatars">
                      <span className="kc-cohort-dot">AL</span>
                      <span className="kc-cohort-dot">TK</span>
                      <span className="kc-cohort-dot">JR</span>
                      <span className="kc-cohort-more">+5</span>
                    </div>
                    <span className="kc-cohort-track">Graph &amp; Tree Cohort • Sprint 02</span>
                  </div>
                )}

                {item.previewMockup === 'nest' && (
                  <div className="kc-mockup-nest">
                    <span className="kc-nest-tag">#MonotonicStack</span>
                    <span className="kc-nest-tag">#TwoPointers</span>
                    <span className="kc-nest-tag">#Invariants</span>
                    <span className="kc-nest-count">24 Bookmarks</span>
                  </div>
                )}

                {item.previewMockup === 'dashboard' && (
                  <div className="kc-mockup-stats">
                    <div className="kc-stats-mini-bar">
                      <span style={{ width: '65%' }} />
                    </div>
                    <span className="kc-stats-streak">🔥 14-Day Streak • 42 Solved</span>
                  </div>
                )}
              </div>

              {/* Clear CTA to the designated roadmap or beta page */}
              <div className="kc-planned-footer">
                <Link href={item.href} className="kc-planned-link">
                  <span>Explore Feature Specification</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   FOOTER — Utilitarian, clean, engineering-first
   ────────────────────────────────────────────── */

function FooterSection() {
  return (
    <footer className="kc-footer">
      <div className="kc-container">
        <div className="kc-footer-inner">
          <div>
            <div className="kc-footer-brand">
              <span className="kc-footer-brand-icon" aria-hidden="true">&lt;/&gt;</span>
              <span>KodeChirp</span>
            </div>
            <p className="kc-footer-desc">
              An engineering-first developer platform designed for deep algorithmic practice,
              sandboxed verification, and peer-driven problem reasoning.
            </p>
          </div>

          <div>
            <div className="kc-footer-heading">Platform</div>
            <Link href="/questions" className="kc-footer-link">Problems</Link>
            <Link href="/submissions" className="kc-footer-link">Submissions</Link>
            <Link href="/progress" className="kc-footer-link">Progress</Link>
          </div>

          <div>
            <div className="kc-footer-heading">Support &amp; Community</div>
            <Link href="/contact" className="kc-footer-link">Contact &amp; Help</Link>
            <a
              href="https://github.com/ritam4735/kodechirp/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-footer-link"
            >
              Issue Tracker
            </a>
            <a
              href="https://github.com/ritam4735/kodechirp"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-footer-link"
            >
              GitHub Repository
            </a>
          </div>

          <div>
            <div className="kc-footer-heading">Legal</div>
            <Link href="/privacy" className="kc-footer-link">Privacy Policy</Link>
            <Link href="/terms" className="kc-footer-link">Terms of Service</Link>
          </div>
        </div>

        <div className="kc-footer-bottom">
          <div>© 2026 KodeChirp. Open-source and built for engineers.</div>
          <div className="kc-footer-bottom-links">
            <Link href="/privacy" className="kc-footer-link" style={{ margin: 0 }}>Privacy</Link>
            <Link href="/terms" className="kc-footer-link" style={{ margin: 0 }}>Terms</Link>
            <Link href="/contact" className="kc-footer-link" style={{ margin: 0 }}>Contact</Link>
            <a
              href="https://github.com/ritam4735/kodechirp"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-footer-link"
              style={{ margin: 0 }}
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────
   HOME PAGE — Root Composition
   ────────────────────────────────────────────── */

export default function HomePage() {
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    api.getProblems()
      .then((data) => {
        if (data && data.problems) {
          setProblems(data.problems.slice(0, 8));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch problems:', err);
      });
  }, []);

  return (
    <div className="kc-landing">
      <HeroSection />
      <WorkflowSection />
      <InteractiveFeatures />
      <ProblemsSection problems={problems} />
      <PlannedSection />
      <FooterSection />
    </div>
  );
}
