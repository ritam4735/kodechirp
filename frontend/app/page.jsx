'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import AlgorithmicHeroVisual from '../components/landing/AlgorithmicHeroVisual';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import PracticeProblemsSection from '../components/landing/PracticeProblemsSection';
import WorkspaceShowcaseSection from '../components/landing/WorkspaceShowcaseSection';
import ProgressShowcaseSection from '../components/landing/ProgressShowcaseSection';
import CommunitySection from '../components/landing/CommunitySection';
import CtaSection from '../components/landing/CtaSection';
import FooterSection from '../components/landing/FooterSection';

/* ──────────────────────────────────────────────
   HERO SECTION
   Clear, student-friendly, and professional.
   Focuses on coding practice, DSA learning,
   multiple programming languages, and test execution.
   ────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="kc-hero" id="home">
      <div className="kc-container kc-hero-container">
        {/* Left Column: Value Proposition & Clear Language */}
        <div className="kc-hero-content">
          <div className="kc-kicker">
            <span className="kc-kicker-dot" />
            <span>Coding Practice &amp; DSA Learning</span>
          </div>

          <h1 className="kc-headline">
            Master Data Structures &amp; Algorithms <br className="kc-headline-br" />
            <span className="kc-headline-accent">by Solving Real Problems.</span>
          </h1>

          <p className="kc-subtext">
            Practice curated coding challenges, write solutions in Python, C++, Java, JavaScript,
            and C, test your code against automated test cases, and learn with an active community of developers.
          </p>

          <div className="kc-actions">
            <Link href="/questions" className="kc-btn-primary">
              <span>Start Practicing</span>
              <span className="kc-btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="#how-it-works" className="kc-btn-secondary">
              <span>How It Works</span>
              <span className="kc-btn-down" aria-hidden="true">↓</span>
            </Link>
          </div>

          {/* Platform Highlights */}
          <div className="kc-hero-specs">
            <div className="kc-spec-item">
              <span className="kc-spec-label">5 LANGUAGES</span>
              <span className="kc-spec-val">Python • C++ • Java • JS • C</span>
            </div>
            <div className="kc-spec-item">
              <span className="kc-spec-label">TEST SUITES</span>
              <span className="kc-spec-val">Sample &amp; custom test verification</span>
            </div>
            <div className="kc-spec-item">
              <span className="kc-spec-label">COMMUNITY</span>
              <span className="kc-spec-val">Chirps &amp; solution discussions</span>
            </div>
          </div>
        </div>

        {/* Right Column: Original Animated Algorithmic Visualizer */}
        <div className="kc-hero-visual-col">
          <AlgorithmicHeroVisual />
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   HOME PAGE — Root Composition
   Composes all focused, professional sections:
   1. Hero (Clear value + Realistic Workspace preview)
   2. How It Works (Understand -> Write -> Run tests -> Learn)
   3. Practice Problems (Search, difficulty filters, catalog, daily problem)
   4. Coding Workspace Showcase (Editor, languages, test runner, metrics)
   5. Track Your Progress (Solved problems, submission history, consistency)
   6. Community (Chirps, sharing approaches, upvoting)
   7. Call to Action (Start practicing)
   8. Footer (Reputable, clean links)
   ────────────────────────────────────────────── */

export default function HomePage() {
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    api.getProblems()
      .then((data) => {
        if (data && data.problems && Array.isArray(data.problems)) {
          setProblems(data.problems.slice(0, 8));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch problems from API:', err);
      });
  }, []);

  return (
    <div className="kc-landing">
      <HeroSection />
      <HowItWorksSection />
      <PracticeProblemsSection problems={problems} />
      <WorkspaceShowcaseSection />
      <ProgressShowcaseSection />
      <CommunitySection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
