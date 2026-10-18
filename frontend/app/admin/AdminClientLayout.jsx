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
  Award
} from 'lucide-react';

const ADMIN_NAV = [
  { section: 'Overview', items: [
    { label: 'Dashboard',   href: '/admin',              icon: LayoutDashboard },
    { label: 'Analytics',   href: '/admin/analytics',    icon: BarChart3 },
  ]},
  { section: 'Assessment Engine', items: [
    { label: 'Question Bank', href: '/admin/question-bank', icon: HelpCircle },
    { label: 'Assessments',   href: '/admin/assessments',   icon: Award },
  ]},
  { section: 'Content', items: [
    { label: 'Problems',    href: '/admin/problems',     icon: FileCode2 },
    { label: 'Normalize',   href: '/admin/normalize',    icon: SlidersHorizontal },
  ]},
  { section: 'Platform', items: [
    { label: 'Users',       href: '/admin/users',        icon: Users },
    { label: 'Submissions', href: '/admin/submissions',  icon: CheckSquare },
  ]},
];

export default function AdminClientLayout({ children }) {
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
        <span>Verifying administrative authorization…</span>
      </div>
    );
  }

  const isActive = (href) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin Navigation">
        <div className="admin-sidebar-header">
          <Logo size="sm" variant="full" badge="Admin" asLink href="/admin" />
          <div className="admin-sidebar-subtitle">Kernel Platform v2.4</div>
        </div>

        {ADMIN_NAV.map((section) => (
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
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
