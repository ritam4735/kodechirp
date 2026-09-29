'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../hooks/useAuth';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import ThemeSwitcher from './ThemeSwitcher';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Questions', href: '/questions' },
  { label: 'Chirps', href: '/coming-soon/chirps' },
  { label: 'Flights', href: '/coming-soon/flights' },
  { label: 'Flocks', href: '/coming-soon/flocks' },
  { label: 'Nest', href: '/coming-soon/nest' },
];

export const Navbar = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);
  const mobileNavRef = useRef(null);

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
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target)) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  const onLogout = () => {
    setMenuOpen(false);
    setMobileNavOpen(false);
    handleLogout();
  };

  return (
    <>
      <nav className="navbar" id="navbar" aria-label="Main Navigation">
        <Link href="/" className="nav-logo" aria-label="KodeChirp Home">
          <div className="nav-logo-icon" aria-hidden="true">&lt;/&gt;</div>
          <span className="nav-logo-text">Kode<span>Chirp</span></span>
        </Link>

        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? 'active' : ''} ${item.label === 'Admin' ? 'nav-link-admin' : ''}`}
            >
              {item.label === 'Admin' && <span style={{ fontSize: '12px' }} aria-hidden="true">⚙️</span>}
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-spacer"></div>

        <div className="nav-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeSwitcher />

          {mounted ? (
          isAuthenticated ? (
            <div className="nav-user-container" ref={menuRef} style={{ position: 'relative' }}>
              <div
                className="nav-user"
                id="navUser"
                role="button"
                tabIndex={0}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                onClick={() => setMenuOpen(!menuOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setMenuOpen(!menuOpen);
                  }
                }}
                title="Account menu"
              >
                <div className="nav-avatar">
                  {user?.avatar_url ? (
                    <Image 
                      src={user.avatar_url} 
                      alt={user?.display_name ? `${user.display_name}'s avatar` : user?.username ? `${user.username}'s avatar` : 'User profile avatar'} 
                      width={36}
                      height={36}
                      unoptimized={user.avatar_url.startsWith('data:')}
                      className="w-full h-full object-cover rounded-full"
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <span aria-hidden="true">🦅</span>
                  )}
                </div>
                <div className="nav-user-info">
                  <div className="nav-user-name">
                    {user?.display_name || user?.username || 'Profile'}
                    {isAdmin && <span className="nav-admin-badge" style={{ marginLeft: '6px' }}>Admin</span>}
                  </div>
                  <div className="nav-user-tag">{isAdmin ? 'Administrator' : 'Keep Chirping!'}</div>
                </div>
                <span className="nav-chevron" aria-hidden="true" style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
              </div>

              {menuOpen && (
                <div className="nav-dropdown" role="menu" aria-label="Account options">
                  <div className="nav-dropdown-header">
                    <div className="nav-dropdown-username">{user?.display_name || user?.username}</div>
                    <div className="nav-dropdown-email">{user?.email || ''}</div>
                  </div>
                  <div className="nav-dropdown-divider"></div>
                  <Link href="/profile" className="nav-dropdown-item" role="menuitem">
                    <span aria-hidden="true">👤</span> Profile
                  </Link>
                  <Link href="/settings" className="nav-dropdown-item" role="menuitem">
                    <span aria-hidden="true">⚙️</span> Settings
                  </Link>
                  <Link href="/submissions" className="nav-dropdown-item" role="menuitem">
                    <span aria-hidden="true">📨</span> My Submissions
                  </Link>
                  <Link href="/progress" className="nav-dropdown-item" role="menuitem">
                    <span aria-hidden="true">📊</span> My Progress
                  </Link>
                  {isAdmin && (
                    <>
                      <div className="nav-dropdown-divider"></div>
                      <Link href="/admin" className="nav-dropdown-item" role="menuitem">
                        <span aria-hidden="true">🛡️</span> Admin Console
                      </Link>
                    </>
                  )}
                  <div className="nav-dropdown-divider"></div>
                  <button className="nav-dropdown-item nav-dropdown-logout" onClick={onLogout} role="menuitem">
                    <span aria-hidden="true">🚪</span> Sign Out
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

        <button
          type="button"
          className="nav-mobile-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="nav-mobile-drawer"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {mobileNavOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </>
            )}
          </svg>
        </button>
        </div>
      </nav>

      {mobileNavOpen && (
        <div id="nav-mobile-drawer" className="nav-mobile-drawer" ref={mobileNavRef} role="dialog" aria-label="Mobile Navigation Menu">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`nav-mobile-link ${isActive(item.href) ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                {item.label === 'Admin' ? (
                  <span aria-hidden="true">⚙️</span>
                ) : (
                  <span className="nav-mobile-chevron" aria-hidden="true">›</span>
                )}
              </Link>
            ))}
          </div>

          {!isAuthenticated && mounted && (
            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-glass)', marginTop: '8px' }}>
              <Link
                href="/auth"
                onClick={() => setMobileNavOpen(false)}
                className="btn btn-primary"
                style={{ display: 'block', textAlign: 'center', width: '100%', padding: '10px' }}
              >
                Join Flock
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
};
