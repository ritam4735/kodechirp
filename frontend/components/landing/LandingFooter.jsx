import Link from 'next/link';
import { Logo } from '../ui/Logo';

export default function LandingFooter() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-inner">
        <div>
          <div className="mb-3">
            <Logo size="sm" variant="full" />
          </div>
          <p className="footer-brand-desc">The developer platform where learning flies. Chirp your code, inspire the world, grow through real conversations.</p>
          <div className="footer-social" aria-label="Social media links">
            <a className="social-btn" title="GitHub Repository" aria-label="GitHub Repository" href="https://github.com/ritam4735/kodechirp" target="_blank" rel="noopener noreferrer">⌥</a>
            <a className="social-btn" title="Twitter/X" aria-label="Twitter/X" href="https://github.com/ritam4735" target="_blank" rel="noopener noreferrer">𝕏</a>
            <a className="social-btn" title="Issues" aria-label="GitHub Issues" href="https://github.com/ritam4735/kodechirp/issues" target="_blank" rel="noopener noreferrer">◈</a>
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
          <div className="footer-col-title">Project</div>
          <div className="footer-links">
            <a href="https://github.com/ritam4735/kodechirp#readme" target="_blank" rel="noopener noreferrer" className="footer-link">About & Docs</a>
            <Link href="/contact" className="footer-link">Contact</Link>
            <a href="https://github.com/ritam4735/kodechirp" target="_blank" rel="noopener noreferrer" className="footer-link">Source Code</a>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Legal & Support</div>
          <div className="footer-links">
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/terms" className="footer-link">Terms of Service</Link>
            <Link href="/contact" className="footer-link">Support & Issues</Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('kc-reopen-cookie-banner'));
                }
              }}
              className="footer-link text-left"
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
            >
              Cookie Preferences
            </button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">© 2026 KodeChirp · support@kodechirp.com · Open-source for developers.</span>
        <div className="footer-bottom-links">
          <Link href="/privacy" className="footer-bottom-link">Privacy</Link>
          <Link href="/terms" className="footer-bottom-link">Terms</Link>
          <Link href="/contact" className="footer-bottom-link">Contact</Link>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('kc-reopen-cookie-banner'));
              }
            }}
            className="footer-bottom-link"
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
          >
            Cookies
          </button>
        </div>
      </div>
    </footer>
  );
}
