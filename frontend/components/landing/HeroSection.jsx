'use client';

export default function HeroSection({ onOrbClick }) {
  return (
    <section className="hero" id="home">
      {/* Bird Mascot SVG */}
      <div className="bird-mascot" aria-hidden="true">
        <svg viewBox="0 0 280 320" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="bodyGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </radialGradient>
            <radialGradient id="wingGrad" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="40%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99,102,241,0.6)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0)" />
            </radialGradient>
            <filter id="birdGlow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <ellipse cx="140" cy="160" rx="100" ry="80" fill="url(#glowGrad)" opacity="0.5" />
          <path d="M140,140 Q80,80 20,110 Q60,130 80,155 Q110,145 140,155 Z" fill="url(#wingGrad)" opacity="0.85" />
          <path d="M155,130 Q200,60 260,40 Q240,90 230,120 Q210,135 200,150 Q180,145 165,155 Z" fill="url(#wingGrad)" opacity="0.9" />
          <path d="M130,195 Q110,230 90,255 Q120,240 140,225 Q155,240 175,258 Q158,230 155,200 Z" fill="url(#wingGrad)" opacity="0.7" />
          <ellipse cx="148" cy="165" rx="38" ry="46" fill="url(#bodyGrad)" filter="url(#birdGlow)" />
          <ellipse cx="145" cy="178" rx="22" ry="26" fill="rgba(220,210,255,0.15)" />
          <circle cx="150" cy="120" r="30" fill="url(#bodyGrad)" />
          <circle cx="158" cy="116" r="7" fill="#1e1b4b" />
          <circle cx="158" cy="116" r="4" fill="#ffffff" />
          <circle cx="160" cy="114" r="2" fill="#1e1b4b" />
          <circle cx="162" cy="112" r="1" fill="rgba(255,255,255,0.8)" />
          <path d="M168,124 L185,130 L168,136 Z" fill="#fbbf24" />
          <path d="M168,124 L185,130 L176,130 Z" fill="#f59e0b" />
          <path d="M142,92 Q148,72 155,85 Q150,78 145,90 Z" fill="url(#wingGrad)" opacity="0.8" />
          <path d="M148,88 Q155,68 162,82 Q157,74 151,86 Z" fill="url(#wingGrad)" opacity="0.7" />
          <circle cx="148" cy="230" r="22" fill="none" stroke="rgba(147,197,253,0.4)" strokeWidth="1.5" />
          <circle cx="148" cy="230" r="16" fill="rgba(30,27,75,0.6)" />
          <circle cx="148" cy="230" r="10" fill="rgba(99,102,241,0.4)" />
          <circle cx="143" cy="225" r="4" fill="rgba(255,255,255,0.25)" />
          <g opacity="0.8">
            <circle cx="55" cy="95" r="2" fill="#a78bfa" />
            <circle cx="240" cy="75" r="2.5" fill="#7dd3fc" />
            <circle cx="250" cy="170" r="1.5" fill="#c4b5fd" />
            <circle cx="38" cy="155" r="1.5" fill="#93c5fd" />
            <path d="M70,70 L72,66 L74,70 L78,72 L74,74 L72,78 L70,74 L66,72 Z" fill="#e0e7ff" opacity="0.6" />
            <path d="M230,100 L232,96 L234,100 L238,102 L234,104 L232,108 L230,104 L226,102 Z" fill="#bfdbfe" opacity="0.5" />
          </g>
        </svg>
      </div>

      <div className="hero-badge">
        <span className="hero-badge-icon">🌿</span>
        Learn. Share. Grow.
      </div>

      <h1 className="hero-headline">
        <span className="word-chirp">Chirp</span> your code.<br />
        <span className="word-inspire">Inspire</span> the world.
      </h1>

      <p className="hero-subtext">
        KodeChirp is where developers learn together, share knowledge,
        and grow through real conversations.
      </p>

      <div className="hero-cta-row">
        <a href="#questions" className="btn btn-primary">🚀 Start Solving</a>
        <a href="#about" className="btn btn-ghost">{"About KodeChirp →"}</a>
      </div>

      <div className="hero-orb-container" id="heroOrb">
        <div className="orb-glow-ring"></div>
        <div className="orb-glow-ring"></div>
        <div className="orb-glow-ring"></div>
        <div className="hero-orb" id="exploreOrb" onClick={onOrbClick}>
          <span className="hero-orb-text">Explore<br />Problems</span>
          <span className="hero-orb-arrow">→</span>
        </div>
      </div>

      <div className="hero-ground-glow"></div>
    </section>
  );
}
