'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import ParticleCanvas from '../components/landing/ParticleCanvas';
import ParticleDebugPanel from '../components/landing/ParticleDebugPanel';

/**
 * RevealText
 * Splits text into words and characters with scroll-driven reveal.
 * Characters smoothly transition from muted to sharp and fully visible.
 */
function RevealText({ text, scrollProgress }) {
  const words = text.split(' ');
  let charIndexCounter = 0;
  const totalChars = text.replace(/\s/g, '').length;

  return (
    <span className="kc-reveal-text">
      {words.map((word, wIdx) => {
        const chars = word.split('');
        return (
          <span key={wIdx} className="kc-reveal-word">
            {chars.map((char, cIdx) => {
              const myIdx = charIndexCounter++;
              // As user scrolls from 0 to 0.15, characters progressively activate
              // Even at 0 scroll, reveal progress activates initial characters
              const charRatio = myIdx / Math.max(totalChars, 1);
              const isRevealed = scrollProgress * 5 >= charRatio || scrollProgress < 0.01;

              return (
                <span
                  key={cIdx}
                  className={`kc-reveal-char ${isRevealed ? 'active' : 'muted'}`}
                  style={{
                    transitionDelay: `${(myIdx % 10) * 20}ms`,
                  }}
                >
                  {char}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

function HeroSection({ scrollProgress }) {
  return (
    <section className="kc-hero" id="home">
      <div className="kc-kicker">
        <span className="kc-kicker-dot" />
        00 / SYSTEM CORE
      </div>

      <h1 className="kc-headline">
        <RevealText text="Turn problems into progress." scrollProgress={scrollProgress} />
      </h1>

      <p className="kc-subtext">
        KodeChirp is an engineering-first platform designed for deep algorithmic understanding,
        peer-driven reasoning, and building technical instinct.
      </p>

      <div className="kc-actions">
        <Link href="/questions" className="kc-btn-primary">
          Start Solving <span className="kc-btn-arrow" aria-hidden="true">→</span>
        </Link>
        <Link href="#story" className="kc-btn-secondary">
          Explore System
        </Link>
      </div>

      <div className="kc-scroll-hint" aria-hidden="true">
        <span className="kc-scroll-hint-bar" />
        Scroll to observe computational progression
      </div>
    </section>
  );
}

function StorySection() {
  const [inViewSteps, setInViewSteps] = useState({ 0: true, 1: false, 2: false });
  const containerRef = useRef(null);

  const steps = [
    {
      num: '01',
      tag: 'FORMATION: THINK',
      title: 'Understand before you code.',
      desc: 'Before writing syntax, explore the topology of the problem. Break down constraints, map invariants, and analyze branching decision paths.',
      meta: 'TOPOLOGY: DECISION_TREE // COMPLEXITY: O(log N) // CONSTRAINTS: EVALUATED',
    },
    {
      num: '02',
      tag: 'FORMATION: CODE',
      title: 'Turn intuition into structure.',
      desc: 'Syntax is merely the formal expression of structured thought. Transform conceptual logic into clean, verifiable primitives.',
      meta: 'TOPOLOGY: ABSTRACT_SYNTAX // INVARIANTS: VERIFIED // REDUCTION: COMPLETE',
    },
    {
      num: '03',
      tag: 'FORMATION: IMPROVE',
      title: 'Every attempt sharpens your instinct.',
      desc: 'Mastery is not binary. With each submission, you refine patterns, eliminate edge-case vulnerabilities, and internalize core algorithmic strategies.',
      meta: 'TOPOLOGY: CONVERGENCE // FEEDBACK: IMMEDIATE // REINFORCEMENT: ACTIVE',
    },
  ];

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === 'undefined') {
      setInViewSteps({ 0: true, 1: true, 2: true });
      return;
    }

    const stepElements = containerRef.current.querySelectorAll('.kc-story-step');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = entry.target.getAttribute('data-step-idx');
            if (idx !== null) {
              setInViewSteps((prev) => ({ ...prev, [idx]: true }));
            }
          }
        });
      },
      { threshold: 0.25, rootMargin: '0px 0px -50px 0px' }
    );

    stepElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="kc-story-section" id="story" ref={containerRef}>
      <div className="kc-container">
        {steps.map((step, idx) => (
          <div
            key={step.num}
            data-step-idx={idx}
            className={`kc-story-step ${inViewSteps[idx] ? 'in-view' : ''}`}
          >
            <div className="kc-story-index-col">
              <span className="kc-story-index">{step.num} / PROCESS</span>
              <span className="kc-story-badge">{step.tag}</span>
            </div>

            <div className="kc-story-content">
              <h2 className="kc-story-title">{step.title}</h2>
              <p className="kc-story-desc">{step.desc}</p>
              <div className="kc-story-meta">
                <code>{step.meta}</code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const router = useRouter();

  const features = [
    {
      num: '01',
      title: 'Curated Challenges',
      desc: 'Hand-crafted algorithmic challenges across data structures, graph theory, and dynamic programming.',
      href: '/questions',
    },
    {
      num: '02',
      title: 'Peer Chirps',
      desc: 'Post conceptual breakdowns, mental models, and alternative solutions for the developer flock.',
      href: '/coming-soon/chirps',
    },
    {
      num: '03',
      title: 'Video Flights',
      desc: 'High-density visual walkthroughs showing elite problem solvers thinking through complex algorithms.',
      href: '/coming-soon/flights',
    },
    {
      num: '04',
      title: 'Focused Flocks',
      desc: 'Small specialized cohorts that build, discuss, and tackle shared technical roadmaps.',
      href: '/coming-soon/flocks',
    },
    {
      num: '05',
      title: 'The Nest',
      desc: 'Bookmark core problem patterns and revisit your mental catalog for technical interviews.',
      href: '/coming-soon/nest',
    },
  ];

  return (
    <section className="kc-features-section" id="features">
      <div className="kc-container">
        <div className="kc-section-header">
          <h2 className="kc-section-title">The Platform</h2>
          <p className="kc-section-desc">
            A minimalist workspace engineered for deliberate practice, deep comprehension, and peer collaboration.
          </p>
        </div>

        <div className="kc-features-list">
          {features.map((feat) => (
            <div
              key={feat.num}
              className="kc-feature-row"
              onClick={() => router.push(feat.href)}
              role="button"
              tabIndex={0}
              aria-label={`Explore feature: ${feat.title}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(feat.href);
                }
              }}
            >
              <div className="kc-feature-num" aria-hidden="true">{feat.num}</div>
              <div className="kc-feature-title">{feat.title}</div>
              <div className="kc-feature-desc">{feat.desc}</div>
              <div className="kc-feature-arrow" aria-hidden="true">→</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemsSection({ problems }) {
  const router = useRouter();
  const [metricsInView, setMetricsInView] = useState(false);
  const metricsCardRef = useRef(null);

  useEffect(() => {
    if (!metricsCardRef.current || typeof IntersectionObserver === 'undefined') {
      setMetricsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMetricsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(metricsCardRef.current);
    return () => observer.disconnect();
  }, []);

  const renderDifficulty = (diff) => {
    if (diff === 'Easy') return <span className="kc-diff-badge kc-diff-easy">Easy</span>;
    if (diff === 'Hard') return <span className="kc-diff-badge kc-diff-hard">Hard</span>;
    return <span className="kc-diff-badge kc-diff-medium">Medium</span>;
  };

  return (
    <section className="kc-problems-section" id="problems">
      <div className="kc-container">
        <div className="kc-section-header">
          <h2 className="kc-section-title">Active Challenges</h2>
          <p className="kc-section-desc">
            Curated problem set from algorithmic fundamentals to advanced computational theory.
          </p>
        </div>

        <div className="kc-problems-grid">
          <div className="kc-problems-table">
            {problems.map((prob) => (
              <div
                className="kc-prob-row"
                key={prob.id}
                onClick={() => router.push(`/problems/${prob.slug}`)}
                role="button"
                tabIndex={0}
                aria-label={`View problem challenge: ${prob.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/problems/${prob.slug}`);
                  }
                }}
              >
                <div className="kc-prob-dot" aria-hidden="true" />
                <div className="kc-prob-name">{prob.title}</div>
                <div>{renderDifficulty(prob.difficulty)}</div>
                <div className="kc-prob-rate">
                  {prob.acceptance_rate ? parseFloat(prob.acceptance_rate).toFixed(1) : '0'}%
                </div>
              </div>
            ))}

            {problems.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--kc-text-muted)' }}>
                Loading algorithmic challenges...
              </div>
            )}
          </div>

          <div className="kc-sidebar">
            <div className="kc-card" ref={metricsCardRef}>
              <div className="kc-card-title">Practice Metrics</div>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span style={{ color: '#10B981' }}>Easy</span>
                  <span>42 / 120</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: metricsInView ? '35%' : '0%',
                      backgroundColor: '#10B981',
                    }}
                  />
                </div>
              </div>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span style={{ color: '#F59E0B' }}>Medium</span>
                  <span>18 / 340</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: metricsInView ? '5.3%' : '0%',
                      backgroundColor: '#F59E0B',
                    }}
                  />
                </div>
              </div>

              <div className="kc-metric-row">
                <div className="kc-metric-label">
                  <span style={{ color: '#EF4444' }}>Hard</span>
                  <span>3 / 180</span>
                </div>
                <div className="kc-bar-track">
                  <div
                    className="kc-bar-fill"
                    style={{
                      width: metricsInView ? '1.7%' : '0%',
                      backgroundColor: '#EF4444',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="kc-card">
              <div className="kc-card-title">Daily Challenge</div>
              <div style={{ fontSize: '13.5px', color: 'var(--kc-text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                Minimum Window Substring — <strong style={{ color: '#EF4444' }}>Hard</strong>
              </div>
              <Link
                href="/questions"
                className="kc-btn-primary"
                style={{ width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}
              >
                Attempt Challenge <span className="kc-btn-arrow">🎯</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="kc-footer">
      <div className="kc-container">
        <div className="kc-footer-inner">
          <div>
            <div className="kc-footer-brand">KodeChirp</div>
            <p className="kc-footer-desc">
              An engineering-focused platform for deep algorithmic practice and collaborative problem solving.
            </p>
          </div>

          <div>
            <div className="kc-footer-heading">Platform</div>
            <Link href="/questions" className="kc-footer-link">Problems</Link>
            <Link href="/coming-soon/chirps" className="kc-footer-link">Chirps</Link>
            <Link href="/coming-soon/flights" className="kc-footer-link">Flights</Link>
            <Link href="/coming-soon/flocks" className="kc-footer-link">Flocks</Link>
          </div>

          <div>
            <div className="kc-footer-heading">Support</div>
            <Link href="/contact" className="kc-footer-link">Contact & Help</Link>
            <a href="https://github.com/ritam4735/kodechirp/issues" target="_blank" rel="noopener noreferrer" className="kc-footer-link">Issue Tracker</a>
            <a href="https://github.com/ritam4735/kodechirp" target="_blank" rel="noopener noreferrer" className="kc-footer-link">GitHub Repository</a>
          </div>

          <div>
            <div className="kc-footer-heading">Legal</div>
            <Link href="/privacy" className="kc-footer-link">Privacy Policy</Link>
            <Link href="/terms" className="kc-footer-link">Terms of Service</Link>
          </div>
        </div>

        <div className="kc-footer-bottom">
          <div>© 2026 KodeChirp. Open-source and designed for engineering precision.</div>
          <div style={{ display: 'flex', gap: '18px' }}>
            <Link href="/privacy" className="kc-footer-link" style={{ margin: 0 }}>Privacy</Link>
            <Link href="/terms" className="kc-footer-link" style={{ margin: 0 }}>Terms</Link>
            <Link href="/contact" className="kc-footer-link" style={{ margin: 0 }}>Contact</Link>
            <a href="https://github.com/ritam4735/kodechirp" target="_blank" rel="noopener noreferrer" className="kc-footer-link" style={{ margin: 0 }}>GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const [problems, setProblems] = useState([]);
  const [scrollProgress, setScrollProgress] = useState(0);
  const engineRef = useRef(null);

  useEffect(() => {
    // Fetch problems
    api.getProblems()
      .then((data) => {
        if (data && data.problems) {
          setProblems(data.problems.slice(0, 8));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch problems:', err);
      });

    // Track scroll progress for typography and narrative
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="kc-landing">
      {/* ── Fixed Particle Canvas ── */}
      <ParticleCanvas engineRef={engineRef} />

      {/* ── Interactive Debug / Formation Tester ── */}
      <ParticleDebugPanel engineRef={engineRef} />

      {/* ── Editorial Homepage Sections ── */}
      <HeroSection scrollProgress={scrollProgress} />
      <StorySection />
      <FeaturesSection />
      <ProblemsSection problems={problems} />
      <FooterSection />

      {/* ── Sticky Mobile CTA: visible on mobile when scrolled past hero ── */}
      {scrollProgress > 0.08 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden pointer-events-auto transition-all duration-300">
          <div className="flex items-center justify-between p-2.5 pl-4 bg-[#0d1117]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight">Ready to code?</span>
              <span className="text-[10px] text-[#8b949e]">Explore the challenges</span>
            </div>
            <Link
              href="/questions"
              className="px-4 py-2 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] hover:from-[#1d4ed8] hover:to-[#2563eb] text-white text-xs font-semibold rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-1.5 transition-all"
            >
              Start Solving <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
