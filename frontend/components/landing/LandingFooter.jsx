'use client';

export default function LandingFooter() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand-title">🌿 KodeChirp</div>
          <p className="footer-brand-desc">The developer platform where learning flies. Chirp your code, inspire the world, grow through real conversations.</p>
          <div className="footer-social">
            <a className="social-btn" title="Twitter/X" href="#">𝕏</a>
            <a className="social-btn" title="GitHub" href="#">⌥</a>
            <a className="social-btn" title="Discord" href="#">◈</a>
            <a className="social-btn" title="YouTube" href="#">▶</a>
            <a className="social-btn" title="LinkedIn" href="#">in</a>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Platform</div>
          <div className="footer-links">
            <a href="#questions" className="footer-link">Problems</a>
            <a href="#" className="footer-link">Contests</a>
            <a href="#" className="footer-link">Discuss</a>
            <a href="#" className="footer-link">Explore</a>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Company</div>
          <div className="footer-links">
            <a href="#" className="footer-link">About</a>
            <a href="#" className="footer-link">Blog</a>
            <a href="#" className="footer-link">Careers</a>
            <a href="#" className="footer-link">Press</a>
          </div>
        </div>
        <div>
          <div className="footer-col-title">Support</div>
          <div className="footer-links">
            <a href="#" className="footer-link">Help Center</a>
            <a href="#" className="footer-link">Contact</a>
            <a href="#" className="footer-link">Status</a>
            <a href="#" className="footer-link">Community</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">© 2025 KodeChirp. All rights reserved.</span>
        <div className="footer-bottom-links">
          <a href="#" className="footer-bottom-link">Privacy</a>
          <a href="#" className="footer-bottom-link">Terms</a>
          <a href="#" className="footer-bottom-link">Cookies</a>
        </div>
      </div>
    </footer>
  );
}
