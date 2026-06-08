'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const ADMIN_NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard',   href: '/admin',              icon: '📊' },
    { label: 'Analytics',   href: '/admin/analytics',    icon: '📈' },
  ]},
  { section: 'Content', items: [
    { label: 'Problems',    href: '/admin/problems',     icon: '📝' },
  ]},
  { section: 'Platform', items: [
    { label: 'Users',       href: '/admin/users',        icon: '👥' },
    { label: 'Submissions', href: '/admin/submissions',  icon: '🔍' },
  ]},
];

export default function AdminLayout({ children }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        router.push('/auth');
      } else if (user?.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, isAuthenticated, router, mounted]);

  if (!mounted || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        Checking permissions...
      </div>
    );
  }

  const isActive = (href) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">Admin Console</div>
          <div className="admin-sidebar-subtitle">KodeChirp Platform</div>
        </div>

        {ADMIN_NAV.map((section) => (
          <div className="admin-nav-section" key={section.section}>
            <div className="admin-nav-label">{section.section}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive(item.href) ? 'active' : ''}`}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
