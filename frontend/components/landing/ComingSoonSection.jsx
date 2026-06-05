'use client';

export default function ComingSoonSection({ onOpenModal }) {
  const cards = [
    { key: 'chirps', cls: 'cc-chirps', iconCls: 'ci-chirps', icon: '💬', title: 'Chirps', desc: 'Share your coding journey, quick solutions, and dev thoughts with the entire community.' },
    { key: 'flights', cls: 'cc-flights', iconCls: 'ci-flights', icon: '▶', title: 'Flights', desc: 'Short-form video explanations of complex algorithms from senior engineers and educators.' },
    { key: 'flocks', cls: 'cc-flocks', iconCls: 'ci-flocks', icon: '👥', title: 'Flocks', desc: 'Private developer communities organized by language, tech stack, or career stage.' },
    { key: 'nest', cls: 'cc-nest', iconCls: 'ci-nest', icon: '🌿', title: 'Nest', desc: 'Your personal knowledge vault. Save problems, chirps, flights, and code snippets for later.' },
  ];

  return (
    <section className="coming-soon-section" id="coming-soon">
      <div className="section-header animate-in">
        <div className="section-badge">✨ In Development</div>
        <h2 className="section-title">The Flock is <span style={{background:'linear-gradient(90deg,var(--neon-violet),var(--neon-pink))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Growing</span></h2>
        <p className="section-subtitle">{"We're crafting something amazing. Stay tuned for what's next."}</p>
      </div>
      <div className="coming-grid animate-in">
        {cards.map(c => (
          <div className={`coming-card ${c.cls}`} key={c.key} onClick={() => onOpenModal(c.key)}>
            <div className={`coming-icon ${c.iconCls}`}>{c.icon}</div>
            <div className="coming-soon-badge"><span className="coming-soon-dot"></span> Coming Soon</div>
            <div className="coming-title">{c.title}</div>
            <p className="coming-desc">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
