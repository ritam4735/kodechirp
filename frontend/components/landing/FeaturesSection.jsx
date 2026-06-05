'use client';

export default function FeaturesSection() {
  return (
    <section className="features-section" id="features">
      <div className="features-grid">
        <div className="feature-card card-problems" style={{'--card-delay': '0.05s'}}>
          <div className="feature-icon-wrap icon-problems">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <polyline points="16,18 22,12 16,6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="8,6 2,12 8,18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="feature-title">Solve Problems</div>
          <div className="feature-desc">Sharpen your skills with curated challenges designed to level you up.</div>
        </div>
        <div className="feature-card card-chirps" style={{'--card-delay': '0.10s'}}>
          <div className="feature-icon-wrap icon-chirps">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="feature-title">Share Chirps</div>
          <div className="feature-desc">Post your thoughts, solutions &amp; ideas for the entire flock to see.</div>
        </div>
        <div className="feature-card card-flights" style={{'--card-delay': '0.15s'}}>
          <div className="feature-icon-wrap icon-flights">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2" />
              <polygon points="10,8 16,12 10,16 10,8" fill="currentColor" />
            </svg>
          </div>
          <div className="feature-title">Watch Flights</div>
          <div className="feature-desc">Learn visually with short, powerful coding videos from top developers.</div>
        </div>
        <div className="feature-card card-flocks" style={{'--card-delay': '0.20s'}}>
          <div className="feature-icon-wrap icon-flocks">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2.2" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="feature-title">Join Flocks</div>
          <div className="feature-desc">Be part of specialized communities that build and learn together.</div>
        </div>
        <div className="feature-card card-nest" style={{'--card-delay': '0.25s'}}>
          <div className="feature-icon-wrap icon-nest">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="feature-title">Save in Nest</div>
          <div className="feature-desc">Bookmark your favorite content &amp; revisit them later in your Nest.</div>
        </div>
      </div>
    </section>
  );
}
