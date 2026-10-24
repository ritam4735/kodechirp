'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '../../components/ui/Logo';
import { 
  LayoutDashboard, 
  BarChart3, 
  FileCode2, 
  SlidersHorizontal, 
  Users, 
  CheckSquare,
  ShieldAlert,
  HelpCircle,
  Award,
  Building2,
  GraduationCap,
  History,
  LogOut,
} from 'lucide-react';

export default function AdminClientLayout({ children }) {
  const { user, isAuthenticated, initAuth, handleLogout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [pendingAppCount, setPendingAppCount] = useState(0);

  useEffect(() => {
    initAuth?.();
    setMounted(true);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isCollegeAdmin = user?.role === 'college_admin';
  const hasAdminAccess = isSuperAdmin || isCollegeAdmin;

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated) {
        router.push('/auth');
      } else if (!hasAdminAccess) {
        router.push('/');
      }
    }
  }, [user, isAuthenticated, hasAdminAccess, router, mounted]);

  // Fetch pending applications count for super admin badge
  useEffect(() => {
    if (mounted && isAuthenticated && isSuperAdmin) {
      import('../../lib/adminApi')
        .then(({ adminApi }) => {
          adminApi.getCollegeApplications({ status: 'PENDING', limit: 1 })
            .then((res) => {
              if (res.stats && typeof res.stats.pending_count === 'number') {
                setPendingAppCount(res.stats.pending_count);
              }
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [mounted, isAuthenticated, isSuperAdmin, pathname]);

  if (!mounted || !isAuthenticated || !hasAdminAccess) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <span>Verifying administrative authorization…</span>
      </div>
    );
  }

  const navSections = [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { label: 'Audit History', href: '/admin/audit-logs', icon: History },
      ],
    },
    {
      section: 'Institution',
      items: [
        ...(isSuperAdmin
          ? [
              { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
              { 
                label: 'College Applications', 
                href: '/admin/college-applications', 
                icon: ShieldAlert,
                badge: pendingAppCount > 0 ? pendingAppCount : null,
              },
            ]
          : []),
        { label: 'Student Roster', href: '/admin/roster', icon: GraduationCap },
      ],
    },
    {
      section: 'Assessment Engine',
      items: [
        { label: 'Question Bank', href: '/admin/question-bank', icon: HelpCircle },
        { label: 'Assessments', href: '/admin/assessments', icon: Award },
      ],
    },
    ...(isSuperAdmin
      ? [
          {
            section: 'Content',
            items: [
              { label: 'Problems', href: '/admin/problems', icon: FileCode2 },
              { label: 'Normalize', href: '/admin/normalize', icon: SlidersHorizontal },
            ],
          },
          {
            section: 'Platform',
            items: [
              { label: 'Users', href: '/admin/users', icon: Users },
              { label: 'Submissions', href: '/admin/submissions', icon: CheckSquare },
            ],
          },
        ]
      : []),
  ];

  const isActive = (href) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin Navigation">
        <div className="admin-sidebar-header">
          <Logo size="sm" variant="full" badge={isSuperAdmin ? 'Super Admin' : 'College Admin'} asLink href="/admin" />
          <div className="admin-sidebar-subtitle">
            {isCollegeAdmin && user?.organization?.organization_name
              ? user.organization.organization_name
              : 'Kernel Platform v2.4'}
          </div>
        </div>

        {navSections.map((section) => (
          <div className="admin-nav-section" key={section.section}>
            <div className="admin-nav-label">{section.section}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item ${active ? 'active' : ''}`}
                >
                  <Icon size={14} className="admin-nav-icon" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && (
                    <span 
                      style={{
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '700',
                        background: '#f59e0b',
                        color: '#000',
                        lineHeight: '1.2'
                      }}
                      title={`${item.badge} pending application(s)`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--kc-border-subtle, rgba(255,255,255,0.08))', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="admin-nav-item"
            style={{ width: '100%', color: 'var(--kc-danger, #ef4444)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <LogOut size={14} className="admin-nav-icon text-[#ef4444]" aria-hidden="true" />
            <span className="flex-1">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
