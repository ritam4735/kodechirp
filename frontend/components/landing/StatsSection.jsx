'use client';

export default function StatsSection() {
  return (
    <section className="stats-section animate-in" id="statsSection">
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number" data-count="1200">0</span>
          <div className="stat-label">Problems to Solve</div>
        </div>
        <div className="stat-item">
          <span className="stat-number" data-count="48000">0</span>
          <div className="stat-label">Developers Chirping</div>
        </div>
        <div className="stat-item">
          <span className="stat-number" data-count="3600">0</span>
          <div className="stat-label">Solutions Shared</div>
        </div>
        <div className="stat-item">
          <span className="stat-number" data-count="92">0</span>
          <div className="stat-label">% Satisfaction Rate</div>
        </div>
      </div>
    </section>
  );
}
