'use client';

import Link from 'next/link';

/**
 * CtaSection
 * Clean, inviting invitation to start solving problems or create an account.
 */
export default function CtaSection() {
  return (
    <section className="kc-cta-section">
      <div className="kc-container">
        <div className="kc-cta-card">
          <div className="kc-cta-content">
            <div className="kc-cta-badge">
              <span className="kc-kicker-dot" />
              <span>START PRACTICING TODAY</span>
            </div>

            <h2 className="kc-cta-title">
              Ready to Strengthen Your Problem-Solving Skills?
            </h2>

            <p className="kc-cta-desc">
              Explore curated coding challenges, write solutions in your favorite programming language, and test edge cases with instant automated feedback.
            </p>

            <div className="kc-cta-actions">
              <Link href="/questions" className="kc-btn-primary">
                <span>Browse All Problems</span>
                <span className="kc-btn-arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="/auth" className="kc-btn-secondary">
                <span>Create Free Account</span>
              </Link>
            </div>

            <div className="kc-cta-perks">
              <span className="kc-cta-perk">✓ 5 Programming Languages</span>
              <span className="kc-cta-perk">✓ Instant Test Feedback</span>
              <span className="kc-cta-perk">✓ Community Chirps &amp; Discussions</span>
              <span className="kc-cta-perk">✓ No Setup Required</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
