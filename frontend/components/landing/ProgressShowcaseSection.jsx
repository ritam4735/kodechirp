'use client';

import Link from 'next/link';

/**
 * ProgressShowcaseSection
 * Highlights KodeChirp's progress tracking features:
 *  - Solved problem counts by difficulty (Easy, Medium, Hard)
 *  - Submission history and verdict logging
 *  - Consistent practice and topic coverage
 */
export default function ProgressShowcaseSection() {
  const sampleSubmissions = [
    { problem: 'Two Sum', lang: 'Python 3.11', status: 'Accepted', time: '32 ms', date: 'Today' },
    { problem: 'Valid Parentheses', lang: 'C++20', status: 'Accepted', time: '4 ms', date: 'Yesterday' },
    { problem: 'Longest Substring Without Repeating', lang: 'Python 3.11', status: 'Accepted', time: '48 ms', date: '2 days ago' },
    { problem: 'Climbing Stairs', lang: 'Java 17', status: 'Accepted', time: '2 ms', date: '3 days ago' },
  ];

  return (
    <section className="kc-progress-showcase-section" id="progress">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            TRACK YOUR PROGRESS
          </div>
          <h2 className="kc-section-title">
            Measure Your Growth and Build Consistency
          </h2>
          <p className="kc-section-desc">
            KodeChirp keeps track of every problem you solve, logs your submission history, and helps you identify which algorithmic patterns need more practice.
          </p>
        </div>

        {/* 3-Card Progress Dashboard Preview */}
        <div className="kc-progress-cards-grid">
          {/* Card 1: Problems Solved by Difficulty */}
          <div className="kc-progress-card">
            <div className="kc-progress-card-head">
              <span className="kc-progress-icon" aria-hidden="true">🏆</span>
              <div>
                <h3 className="kc-progress-card-title">Solved Problems</h3>
                <span className="kc-progress-card-sub">Categorized by difficulty</span>
              </div>
            </div>

            <div className="kc-progress-stats-summary">
              <div className="kc-stat-big-number">
                <span className="kc-big-count">24</span>
                <span className="kc-big-label">Problems Solved</span>
              </div>
              <div className="kc-stat-acceptance">
                <span className="kc-acc-rate">68.5%</span>
                <span className="kc-acc-label">Acceptance Rate</span>
              </div>
            </div>

            <div className="kc-progress-bars-list">
              <div className="kc-bar-group">
                <div className="kc-bar-info">
                  <span className="kc-bar-diff easy">Easy</span>
                  <span className="kc-bar-counts">14 / 20</span>
                </div>
                <div className="kc-progress-track">
                  <div className="kc-progress-fill" style={{ width: '70%', backgroundColor: '#10B981' }} />
                </div>
              </div>

              <div className="kc-bar-group">
                <div className="kc-bar-info">
                  <span className="kc-bar-diff medium">Medium</span>
                  <span className="kc-bar-counts">8 / 22</span>
                </div>
                <div className="kc-progress-track">
                  <div className="kc-progress-fill" style={{ width: '36%', backgroundColor: '#F59E0B' }} />
                </div>
              </div>

              <div className="kc-bar-group">
                <div className="kc-bar-info">
                  <span className="kc-bar-diff hard">Hard</span>
                  <span className="kc-bar-counts">2 / 12</span>
                </div>
                <div className="kc-progress-track">
                  <div className="kc-progress-fill" style={{ width: '16%', backgroundColor: '#EF4444' }} />
                </div>
              </div>
            </div>

            <Link href="/progress" className="kc-progress-card-link">
              <span>View Progress Dashboard</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Card 2: Submission History */}
          <div className="kc-progress-card">
            <div className="kc-progress-card-head">
              <span className="kc-progress-icon" aria-hidden="true">📜</span>
              <div>
                <h3 className="kc-progress-card-title">Submission History</h3>
                <span className="kc-progress-card-sub">Recent solution attempts</span>
              </div>
            </div>

            <div className="kc-submissions-mini-list">
              {sampleSubmissions.map((sub, i) => (
                <div key={i} className="kc-submission-mini-item">
                  <div className="kc-sub-item-top">
                    <span className="kc-sub-item-name">{sub.problem}</span>
                    <span className="kc-sub-item-badge accepted">✔ {sub.status}</span>
                  </div>
                  <div className="kc-sub-item-meta">
                    <span>{sub.lang}</span>
                    <span>•</span>
                    <span>{sub.time}</span>
                    <span>•</span>
                    <span className="kc-sub-item-date">{sub.date}</span>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/submissions" className="kc-progress-card-link">
              <span>Inspect All Submissions</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Card 3: Topic Mastery & Practice Habits */}
          <div className="kc-progress-card">
            <div className="kc-progress-card-head">
              <span className="kc-progress-icon" aria-hidden="true">📈</span>
              <div>
                <h3 className="kc-progress-card-title">Practice Consistency</h3>
                <span className="kc-progress-card-sub">Habits and topic distribution</span>
              </div>
            </div>

            <div className="kc-habit-highlight-box">
              <div className="kc-habit-streak">
                <span className="kc-streak-flame" aria-hidden="true">🔥</span>
                <div>
                  <div className="kc-streak-days">12 Days Active</div>
                  <div className="kc-streak-desc">Continuous problem solving streak</div>
                </div>
              </div>
            </div>

            <div className="kc-topic-tags-coverage">
              <div className="kc-coverage-title">Topics Practiced:</div>
              <div className="kc-coverage-chips">
                <span className="kc-topic-chip active">Arrays (8)</span>
                <span className="kc-topic-chip active">Hashing (6)</span>
                <span className="kc-topic-chip active">Two Pointers (4)</span>
                <span className="kc-topic-chip active">Stack (3)</span>
                <span className="kc-topic-chip pending">Dynamic Prog (2)</span>
                <span className="kc-topic-chip pending">Trees (1)</span>
              </div>
            </div>

            <div className="kc-progress-tip-box">
              <span className="kc-tip-icon" aria-hidden="true">💡</span>
              <span className="kc-tip-text">
                Tip: Solving 1–2 problems daily builds stronger long-term retention than weekend marathons.
              </span>
            </div>

            <Link href="/questions" className="kc-progress-card-link">
              <span>Continue Daily Practice</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
