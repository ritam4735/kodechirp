'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '../lib/api';

const BirdCursor = dynamic(() => import('../components/ui/BirdCursor').then(mod => mod.BirdCursor), {
  ssr: false,
});

function HeroSection() {
  const router = useRouter();
  return (
    <section className="hero" id="home">
      <div className="bird-mascot" aria-hidden="true">
        <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bodyGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#a78bfa"/>
              <stop offset="50%" stopColor="#6366f1"/>
              <stop offset="100%" stopColor="#1e1b4b"/>
            </radialGradient>
            <radialGradient id="wingGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#7dd3fc"/>
              <stop offset="40%" stopColor="#3b82f6"/>
              <stop offset="100%" stopColor="#1e3a8a"/>
            </radialGradient>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.6)"/>
              <stop offset="100%" stopColor="rgba(99,102,241,0)"/>
            </radialGradient>
            <filter id="birdGlow">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>
          <ellipse cx="140" cy="160" rx="100" ry="80" fill="url(#glowGrad)" opacity="0.5"/>
          <path d="M140,140 Q80,80 20,110 Q60,130 80,155 Q110,145 140,155 Z" fill="url(#wingGrad)" opacity="0.85"/>
          <path d="M155,130 Q200,60 260,40 Q240,90 230,120 Q210,135 200,150 Q180,145 165,155 Z" fill="url(#wingGrad)" opacity="0.9"/>
          <path d="M130,195 Q110,230 90,255 Q120,240 140,225 Q155,240 175,258 Q158,230 155,200 Z" fill="url(#wingGrad)" opacity="0.7"/>
          <ellipse cx="148" cy="165" rx="38" ry="46" fill="url(#bodyGrad)" filter="url(#birdGlow)"/>
          <ellipse cx="145" cy="178" rx="22" ry="26" fill="rgba(220,210,255,0.15)"/>
          <circle cx="150" cy="120" r="30" fill="url(#bodyGrad)"/>
          <circle cx="158" cy="116" r="7" fill="#1e1b4b"/>
          <circle cx="158" cy="116" r="4" fill="#ffffff"/>
          <circle cx="160" cy="114" r="2" fill="#1e1b4b"/>
          <circle cx="162" cy="112" r="1" fill="rgba(255,255,255,0.8)"/>
          <path d="M168,124 L185,130 L168,136 Z" fill="#fbbf24"/>
          <path d="M168,124 L185,130 L176,130 Z" fill="#f59e0b"/>
          <path d="M142,92 Q148,72 155,85 Q150,78 145,90 Z" fill="url(#wingGrad)" opacity="0.8"/>
          <path d="M148,88 Q155,68 162,82 Q157,74 151,86 Z" fill="url(#wingGrad)" opacity="0.7"/>
          <circle cx="148" cy="230" r="22" fill="none" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5"/>
          <circle cx="148" cy="230" r="18" fill="radial-gradient(circle, rgba(99,102,241,0.6), transparent)"/>
          <circle cx="148" cy="230" r="16" fill="rgba(30,27,75,0.6)"/>
          <circle cx="148" cy="230" r="10" fill="rgba(99,102,241,0.4)"/>
          <circle cx="143" cy="225" r="4" fill="rgba(255,255,255,0.25)" style={{ rx: '50%' }}/>
          <g opacity="0.8">
            <circle cx="55" cy="95" r="2" fill="#a78bfa"/>
            <circle cx="240" cy="75" r="2.5" fill="#7dd3fc"/>
            <circle cx="250" cy="170" r="1.5" fill="#c4b5fd"/>
            <circle cx="38" cy="155" r="1.5" fill="#93c5fd"/>
            <path d="M70,70 L72,66 L74,70 L78,72 L74,74 L72,78 L70,74 L66,72 Z" fill="#e0e7ff" opacity="0.6"/>
            <path d="M230,100 L232,96 L234,100 L238,102 L234,104 L232,108 L230,104 L226,102 Z" fill="#bfdbfe" opacity="0.5"/>
          </g>
        </svg>
      </div>

      <div className="hero-badge">
        <span className="hero-badge-icon">🌿</span>
        Learn. Share. Grow.
      </div>

      <h1 className="hero-headline">
        <span className="word-chirp">Chirp</span> your code.<br/>
        <span className="word-inspire">Inspire</span> the world.
      </h1>

      <p className="hero-subtext">
        KodeChirp is where developers learn together, share knowledge,
        and grow through real conversations.
      </p>

      <div className="hero-cta-row">
        <Link href="/questions" className="btn btn-primary">
          🚀 Start Solving
        </Link>
        <Link href="#about" className="btn btn-ghost">
          About KodeChirp →
        </Link>
      </div>

      <div className="hero-orb-container" id="heroOrb">
        <div className="orb-glow-ring"></div>
        <div className="orb-glow-ring"></div>
        <div className="orb-glow-ring"></div>
        <div className="hero-orb" onClick={() => router.push('/questions')}>
          <span className="hero-orb-text">Explore<br/>Problems</span>
          <span className="hero-orb-arrow">→</span>
        </div>
      </div>

      <div className="hero-ground-glow"></div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="stats-section animate-in visible" id="statsSection">
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">1200+</span>
          <div className="stat-label">Problems to Solve</div>
        </div>
        <div className="stat-item">
          <span className="stat-number">48k</span>
          <div className="stat-label">Developers Chirping</div>
        </div>
        <div className="stat-item">
          <span className="stat-number">3600</span>
          <div className="stat-label">Solutions Shared</div>
        </div>
        <div className="stat-item">
          <span className="stat-number">92%</span>
          <div className="stat-label">Satisfaction Rate</div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const router = useRouter();
  return (
    <section className="features-section" id="features">
      <div className="features-grid">
        <div className="feature-card card-problems" style={{ '--card-delay': '0.05s' }} onClick={() => router.push('/questions')}>
          <div className="feature-icon-wrap icon-problems">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polyline points="16,18 22,12 16,6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="8,6 2,12 8,18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="feature-title">Solve Problems</div>
          <div className="feature-desc">Sharpen your skills with curated challenges designed to level you up.</div>
        </div>
        <div className="feature-card card-chirps" style={{ '--card-delay': '0.10s' }} onClick={() => router.push('/coming-soon/chirps')}>
          <div className="feature-icon-wrap icon-chirps">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="feature-title">Share Chirps</div>
          <div className="feature-desc">Post your thoughts, solutions & ideas for the entire flock to see.</div>
        </div>
        <div className="feature-card card-flights" style={{ '--card-delay': '0.15s' }} onClick={() => router.push('/coming-soon/flights')}>
          <div className="feature-icon-wrap icon-flights">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2"/>
              <polygon points="10,8 16,12 10,16 10,8" fill="currentColor"/>
            </svg>
          </div>
          <div className="feature-title">Watch Flights</div>
          <div className="feature-desc">Learn visually with short, powerful coding videos from top developers.</div>
        </div>
        <div className="feature-card card-flocks" style={{ '--card-delay': '0.20s' }} onClick={() => router.push('/coming-soon/flocks')}>
          <div className="feature-icon-wrap icon-flocks">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2.2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="feature-title">Join Flocks</div>
          <div className="feature-desc">Be part of specialized communities that build and learn together.</div>
        </div>
        <div className="feature-card card-nest" style={{ '--card-delay': '0.25s' }} onClick={() => router.push('/coming-soon/nest')}>
          <div className="feature-icon-wrap icon-nest">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="feature-title">Save in Nest</div>
          <div className="feature-desc">Bookmark your favorite content & revisit them later in your Nest.</div>
        </div>
      </div>
    </section>
  );
}

function ProblemsSection({ problems }) {
  const router = useRouter();

  const renderDifficulty = (diff) => {
    if (diff === 'Easy') return <span className="problem-difficulty diff-easy">Easy</span>;
    if (diff === 'Hard') return <span className="problem-difficulty diff-hard">Hard</span>;
    return <span className="problem-difficulty diff-medium">Medium</span>;
  };

  return (
    <section className="problems-section" id="questions">
      <div className="section-header animate-in visible">
        <div className="section-badge">⚡ Challenge Yourself</div>
        <h2 className="section-title">Curated <span style={{ background: 'linear-gradient(90deg,var(--neon-blue),var(--neon-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Problems</span></h2>
        <p className="section-subtitle">Battle-tested challenges across algorithms, data structures, and system design.</p>
      </div>

      <div className="problems-container">
        <div className="problems-list animate-in visible">
          {problems.map((prob) => (
            <div className="problem-row" key={prob.id} onClick={() => router.push(`/problems/${prob.slug}`)}>
              <div className="problem-status"></div>
              <div className="problem-title-col">
                <div className="problem-name">{prob.title}</div>
                <div className="problem-tags">
                  <span className="problem-tag">Algorithm</span>
                </div>
              </div>
              {renderDifficulty(prob.difficulty)}
              <span className="problem-acceptance">{prob.acceptance_rate ? parseFloat(prob.acceptance_rate).toFixed(1) : 0}%</span>
            </div>
          ))}
          {problems.length === 0 && <p className="text-center text-gray-500 py-8">Loading problems...</p>}
        </div>

        {/* Sidebar */}
        <div className="problems-sidebar animate-in visible" style={{ transitionDelay: '0.15s' }}>
          <div className="sidebar-card">
            <div className="sidebar-card-title">Your Progress</div>
            <div className="progress-item">
              <div className="progress-label">
                <span style={{ color: '#4ade80' }}>Easy</span>
                <span style={{ color: '#4ade80' }}>42 / 120</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill pf-easy" style={{ width: '35%' }}></div>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-label">
                <span style={{ color: 'var(--neon-gold)' }}>Medium</span>
                <span style={{ color: 'var(--neon-gold)' }}>18 / 340</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill pf-medium" style={{ width: '5.3%' }}></div>
              </div>
            </div>
            <div className="progress-item">
              <div className="progress-label">
                <span style={{ color: '#f87171' }}>Hard</span>
                <span style={{ color: '#f87171' }}>3 / 180</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill pf-hard" style={{ width: '1.7%' }}></div>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-card-title">Daily Challenge</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
              Minimum Window Substring — <span style={{ color: '#f87171', fontWeight: 600 }}>Hard</span>
            </div>
            <Link href="/questions" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '10px' }}>
              Attempt Today's Challenge 🎯
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand-title">KodeChirp</div>
          <div className="footer-brand-desc">
            A premium peer-to-peer coding platform. Learn, share, and grow with the developer flock.
          </div>
          <div className="footer-social">
            <a href="#" className="social-btn">🐦</a>
            <a href="#" className="social-btn">🐙</a>
            <a href="#" className="social-btn">💼</a>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Platform</div>
          <div className="footer-links">
            <Link href="/questions" className="footer-link">Problems</Link>
            <Link href="/coming-soon/chirps" className="footer-link">Chirps</Link>
            <Link href="/coming-soon/flights" className="footer-link">Flights</Link>
            <Link href="/coming-soon/flocks" className="footer-link">Flocks</Link>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Resources</div>
          <div className="footer-links">
            <Link href="/about" className="footer-link">About</Link>
            <Link href="/blog" className="footer-link">Blog</Link>
            <Link href="/careers" className="footer-link">Careers</Link>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Legal</div>
          <div className="footer-links">
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/terms" className="footer-link">Terms of Service</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-copy">© 2026 KodeChirp. All rights reserved.</div>
        <div className="footer-bottom-links">
          <Link href="#" className="footer-bottom-link">Status</Link>
          <Link href="#" className="footer-bottom-link">Security</Link>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    // Fetch top 8 problems
    api.getProblems().then(data => {
      if (data && data.problems) {
        setProblems(data.problems.slice(0, 8));
      }
    }).catch(console.error);
  }, []);

  return (
    <div className="landing-page-wrapper">
      <BirdCursor />
      
      <div className="scroll-progress" id="scrollProgress"></div>
      <div className="cursor-glow" id="cursorGlow"></div>

      <div className="bg-universe">
        <div className="bg-gradient-mesh"></div>
        <div className="star-field" id="starField"></div>
        <div className="nebula nebula-1"></div>
        <div className="nebula nebula-2"></div>
        <div className="nebula nebula-3"></div>
        <svg className="mountain-silhouette" viewBox="0 0 1440 280" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,280 L0,200 L80,180 L140,150 L200,160 L280,100 L360,130 L420,80 L500,110 L560,60 L620,90 L680,50 L740,80 L800,40 L860,70 L920,30 L980,60 L1040,90 L1100,55 L1160,85 L1220,120 L1280,140 L1360,160 L1440,150 L1440,280 Z" fill="rgba(10,15,50,0.6)"/>
          <path d="M0,280 L0,230 L60,220 L120,200 L200,210 L280,170 L350,185 L420,145 L500,160 L580,130 L640,150 L720,110 L800,130 L880,105 L940,120 L1020,90 L1100,110 L1180,140 L1260,160 L1360,175 L1440,165 L1440,280 Z" fill="rgba(5,8,25,0.7)"/>
        </svg>
        <div className="water-reflection"></div>
      </div>

      <div className="bubbles-container" id="bubblesContainer"></div>

      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <ProblemsSection problems={problems} />
      <FooterSection />
    </div>
  );
}
