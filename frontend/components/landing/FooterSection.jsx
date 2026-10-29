'use client';

import Link from 'next/link';
import Logo from '../ui/Logo';

export default function FooterSection() {
  return (
    <footer className="kc-footer">
      <div className="kc-container">
        <div className="kc-footer-inner">
          <div>
            <div className="mb-3">
              <Logo asLink href="/" size="sm" variant="full" />
            </div>
            <p className="kc-footer-desc">
              A modern coding practice platform for mastering data structures and algorithms, solving problems across multiple languages, and learning together.
            </p>
          </div>

          <div>
            <div className="kc-footer-heading">Practice</div>
            <Link href="/questions" className="kc-footer-link">Problem Catalog</Link>
            <Link href="/submissions" className="kc-footer-link">Submissions</Link>
            <Link href="/progress" className="kc-footer-link">My Progress</Link>
            <Link href="/compete" className="kc-footer-link">Compete &amp; Contests</Link>
          </div>

          <div>
            <div className="kc-footer-heading">Community &amp; Support</div>
            <Link href="/contact" className="kc-footer-link">Contact &amp; Help</Link>
            <a
              href="https://github.com/ritam4735/kodechirp/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-footer-link"
            >
              Issue Tracker
            </a>
            <a
              href="https://github.com/ritam4735/kodechirp"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-footer-link"
            >
              GitHub Repository
            </a>
          </div>

          <div>
            <div className="kc-footer-heading">Legal</div>
            <Link href="/privacy" className="kc-footer-link">Privacy Policy</Link>
            <Link href="/terms" className="kc-footer-link">Terms of Service</Link>
          </div>
        </div>

        <div className="kc-footer-bottom">
          <div>© 2026 KodeChirp. Built for developers and students.</div>
          <div className="kc-footer-bottom-links">
            <Link href="/privacy" className="kc-footer-link" style={{ margin: 0 }}>Privacy</Link>
            <Link href="/terms" className="kc-footer-link" style={{ margin: 0 }}>Terms</Link>
            <Link href="/contact" className="kc-footer-link" style={{ margin: 0 }}>Contact</Link>
            <a
              href="https://github.com/ritam4735/kodechirp"
              target="_blank"
              rel="noopener noreferrer"
              className="kc-footer-link"
              style={{ margin: 0 }}
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
