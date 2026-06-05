'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Home',      href: '/' },
  { label: 'Questions', href: '/questions' },
  { label: 'Chirps',    href: '/coming-soon/chirps' },
  { label: 'Flights',   href: '/coming-soon/flights' },
  { label: 'Flocks',    href: '/coming-soon/flocks' },
  { label: 'Nest',      href: '/coming-soon/nest' },
];

export const Navbar = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="navbar" id="navbar">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">&lt;/&gt;</div>
        <span className="nav-logo-text">Kode<span>Chirp</span></span>
        <span className="nav-logo-leaf">🌿</span>
      </Link>

      <div className="nav-links">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="nav-spacer"></div>

      {isAuthenticated ? (
        <div className="nav-user" id="navUser" onClick={handleLogout} title="Click to Sign out">
          <div className="nav-avatar">🦅</div>
          <div className="nav-user-info">
            <div className="nav-user-name">{user?.username || user?.name || 'Profile'}</div>
            <div className="nav-user-tag">Keep Chirping!</div>
          </div>
          <span className="nav-chevron">▾</span>
        </div>
      ) : (
        <Link href="/auth" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          Join Flock
        </Link>
      )}
    </nav>
  );
};
