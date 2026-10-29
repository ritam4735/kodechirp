'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * CommunitySection
 * Highlights KodeChirp's real "Chirps" feature:
 *  - Problem-specific community discussions
 *  - Clear explanations of intuition and time/space complexity trade-offs
 *  - Interactive upvoting to highlight the most helpful explanations
 */
export default function CommunitySection() {
  const [upvotes, setUpvotes] = useState({ 1: 48, 2: 36, 3: 54 });
  const [voted, setVoted] = useState({});

  const handleToggleVote = (id) => {
    setVoted((prev) => {
      const isCurrentlyVoted = !!prev[id];
      setUpvotes((counts) => ({
        ...counts,
        [id]: isCurrentlyVoted ? counts[id] - 1 : counts[id] + 1,
      }));
      return { ...prev, [id]: !isCurrentlyVoted };
    });
  };

  const communityDiscussions = [
    {
      id: 1,
      author: 'Elena Rostova',
      initials: 'ER',
      role: 'Software Engineer',
      problem: 'Two Sum',
      time: 'O(N) Time • O(N) Space',
      text: 'Before jumping straight to sorting or nested loops, consider a hash map. As you visit each number, check if target - current exists in the map. If it does, you have your pair in a single pass with O(1) average lookup time.',
      tags: ['#HashMap', '#TimeComplexity', '#Array'],
    },
    {
      id: 2,
      author: 'David Kim',
      initials: 'DK',
      role: 'CS Student',
      problem: 'Valid Parentheses',
      time: 'O(N) Time • O(N) Space',
      text: 'A LIFO stack matches nested brackets naturally. The critical edge cases to watch: strings that start with a closing bracket, and strings where unclosed brackets remain. Checking whether the stack is empty at the end handles both cleanly.',
      tags: ['#Stack', '#EdgeCases', '#String'],
    },
    {
      id: 3,
      author: 'Priya Sharma',
      initials: 'PS',
      role: 'Frontend Engineer',
      problem: 'Climbing Stairs',
      time: 'O(N) Time • O(1) Space',
      text: 'Because each step only depends on the previous two (ways[n] = ways[n-1] + ways[n-2]), you do not need an entire DP array. Maintaining just two variables optimizes your space complexity from O(N) down to O(1).',
      tags: ['#DynamicProgramming', '#SpaceOptimization'],
    },
  ];

  return (
    <section className="kc-community-section" id="community">
      <div className="kc-container">
        {/* Section Header */}
        <div className="kc-section-header">
          <div className="kc-section-kicker">
            <span className="kc-kicker-dot" />
            COMMUNITY &amp; DISCUSSIONS
          </div>
          <h2 className="kc-section-title">
            Learn How Other Developers Think
          </h2>
          <p className="kc-section-desc">
            Writing code is only part of problem solving. Explore alternative approaches, learn why certain data structures are chosen, and join discussions on every problem.
          </p>
        </div>

        {/* 3 Community Chirp Cards Grid */}
        <div className="kc-community-grid">
          {communityDiscussions.map((item) => (
            <div key={item.id} className="kc-community-card">
              <div className="kc-comm-header">
                <div className="kc-comm-avatar" aria-hidden="true">
                  {item.initials}
                </div>
                <div className="kc-comm-author-box">
                  <div className="kc-comm-author-name">{item.author}</div>
                  <div className="kc-comm-problem-link">
                    Problem: <strong>{item.problem}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className={`kc-comm-upvote-btn ${voted[item.id] ? 'active' : ''}`}
                  onClick={() => handleToggleVote(item.id)}
                  aria-label={`Upvote explanation by ${item.author}, currently ${upvotes[item.id]} votes`}
                >
                  <span className="kc-upvote-arrow" aria-hidden="true">▲</span>
                  <span className="kc-upvote-count">{upvotes[item.id]}</span>
                </button>
              </div>

              <div className="kc-comm-metric-strip">
                <span className="kc-comm-time-badge">{item.time}</span>
              </div>

              <p className="kc-comm-text">&ldquo;{item.text}&rdquo;</p>

              <div className="kc-comm-tags-row">
                {item.tags.map((tag) => (
                  <span key={tag} className="kc-comm-tag">{tag}</span>
                ))}
              </div>

              <div className="kc-comm-footer">
                <Link href="/questions" className="kc-comm-link">
                  <span>View Problem Discussions</span>
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
