import { Logo } from '../ui/Logo';

export default function HeroSection({ onOrbClick }) {
  return (
    <section className="hero" id="home">
      {/* Official KodeChirp Brand Logo */}
      <div className="bird-mascot flex items-center justify-center py-6" aria-hidden="true">
        <Logo size="xl" variant="symbol" />
      </div>

      <div className="hero-badge">
        <span className="hero-badge-icon">◈</span>
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
