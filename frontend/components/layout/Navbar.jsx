'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Admin tab only when authenticated AND role is admin
  const isAdmin = mounted && isAuthenticated && user?.role === 'admin';

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navItems = isAdmin
    ? [...NAV_ITEMS, { label: 'Admin', href: '/admin' }]
    : NAV_ITEMS;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const onLogout = () => {
    setMenuOpen(false);
    handleLogout();
  };

  return (
    <nav className="navbar" id="navbar">
      <Link href="/" className="nav-logo">
        <div className="nav-logo-icon">&lt;/&gt;</div>
        <span className="nav-logo-text">Kode<span>Chirp</span></span>
        <span className="nav-logo-leaf">🌿</span>
      </Link>

      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`nav-link ${isActive(item.href) ? 'active' : ''} ${item.label === 'Admin' ? 'nav-link-admin' : ''}`}
          >
            {item.label === 'Admin' && <span style={{ fontSize: '12px' }}>⚙️</span>}
            {item.label}
          </Link>
        ))}
      </div>

      <div className="nav-spacer"></div>

      {mounted ? (
        isAuthenticated ? (
          <div className="nav-user-container" ref={menuRef} style={{ position: 'relative' }}>
            <div
              className="nav-user"
              id="navUser"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Account menu"
            >
              <div className="nav-avatar">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  '🦅'
                )}
              </div>
              <div className="nav-user-info">
                <div className="nav-user-name">
                  {user?.display_name || user?.username || 'Profile'}
                  {isAdmin && <span className="nav-admin-badge" style={{ marginLeft: '6px' }}>Admin</span>}
                </div>
                <div className="nav-user-tag">{isAdmin ? 'Administrator' : 'Keep Chirping!'}</div>
              </div>
              <span className="nav-chevron" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
            </div>

            {menuOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header">
                  <div className="nav-dropdown-username">{user?.display_name || user?.username}</div>
                  <div className="nav-dropdown-email">{user?.email || ''}</div>
                </div>
                <div className="nav-dropdown-divider"></div>
                <Link href="/profile" className="nav-dropdown-item">
                  <span>👤</span> Profile
                </Link>
                <Link href="/settings" className="nav-dropdown-item">
                  <span>⚙️</span> Settings
                </Link>
                <Link href="/submissions" className="nav-dropdown-item">
                  <span>📨</span> My Submissions
                </Link>
                <Link href="/progress" className="nav-dropdown-item">
                  <span>📊</span> My Progress
                </Link>
                {isAdmin && (
                  <>
                    <div className="nav-dropdown-divider"></div>
                    <Link href="/admin" className="nav-dropdown-item">
                      <span>🛡️</span> Admin Console
                    </Link>
                  </>
                )}
                <div className="nav-dropdown-divider"></div>
                <button className="nav-dropdown-item nav-dropdown-logout" onClick={onLogout}>
                  <span>🚪</span> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Join Flock
          </Link>
        )
      ) : (
        <div style={{ width: '90px', height: '36px' }}></div>
      )}
    </nav>
  );
};
