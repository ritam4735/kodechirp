'use client';

export default function QuoteSection() {
  return (
    <section className="quote-section animate-in" id="about">
      <div className="quote-banner">
        <span className="quote-icon">&ldquo;</span>
        <div className="quote-content">
          <p className="quote-text">Code is not just written,<br />{"it's shared, discussed, and elevated together."}</p>
          <p className="quote-author">— The KodeChirp Philosophy</p>
        </div>
        <a href="#about" className="quote-cta">
          🐦 About KodeChirp
          <span>→</span>
        </a>
      </div>
    </section>
  );
}
