'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';
import { 
  Users, 
  FileCode2, 
  CheckSquare, 
  BarChart3, 
  Activity, 
  Zap, 
  Clock, 
  User,
  GraduationCap,
  Award,
  Building2,
  FileSpreadsheet,
  TrendingUp,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [pendingApps, setPendingApps] = useState(0);

  useEffect(() => {
    adminApi.getStats()
      .then(res => setStats(res.data))
      .catch(err => setError(err.message));

    if (user?.role === 'super_admin' || user?.role === 'admin') {
      adminApi.getCollegeApplications({ status: 'PENDING', limit: 1 })
        .then(res => {
          if (res.stats && typeof res.stats.pending_count === 'number') {
            setPendingApps(res.stats.pending_count);
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  if (error) {
    return <div style={{ color: '#EF4444', padding: '40px' }}>Failed to load dashboard statistics: {error}</div>;
  }

  if (!stats) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <span>Loading telemetry…</span>
      </div>
    );
  }

  // ── College Admin Institutional Dashboard ──────────────────────────────────
  if (stats.isCollegeAdmin) {
    const org = stats.organization || {};
    return (
      <div className="space-y-6">
        {/* Institutional Campus Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-[var(--kc-text-primary)]">
                    {org.name || 'Campus Portal'}
                  </h1>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                    {org.code || org.slug || 'INSTITUTION'}
                  </span>
                </div>
                <p className="text-sm text-[var(--kc-text-muted)] mt-0.5">
                  Academic institution dashboard · Student roster, assessments, and analytics
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/roster"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileSpreadsheet size={14} /> Import Roster
            </Link>
            <Link
              href="/admin/assessments"
              className="admin-btn admin-btn-primary admin-btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              + Create Assessment
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="admin-stats-grid">
          <Link href="/admin/roster" className="admin-stat-card">
            <div className="admin-stat-icon">
              <GraduationCap size={16} />
            </div>
            <div className="admin-stat-value">{(stats.totalStudents || 0).toLocaleString()}</div>
            <div className="admin-stat-label">Enrolled Students</div>
            <div className="admin-stat-sub">
              {stats.activeStudents || 0} active · {stats.registeredStudents || 0} registered accounts
            </div>
          </Link>

          <Link href="/admin/assessments" className="admin-stat-card">
            <div className="admin-stat-icon">
              <Award size={16} />
            </div>
            <div className="admin-stat-value">{(stats.totalAssessments || 0).toLocaleString()}</div>
            <div className="admin-stat-label">Campus Assessments</div>
            <div className="admin-stat-sub">
              {stats.publishedAssessments || 0} published · {stats.draftAssessments || 0} drafts
            </div>
          </Link>

          <Link href="/admin/assessments" className="admin-stat-card">
            <div className="admin-stat-icon">
              <CheckSquare size={16} />
            </div>
            <div className="admin-stat-value">{(stats.totalAttempts || 0).toLocaleString()}</div>
            <div className="admin-stat-label">Student Test Attempts</div>
            <div className="admin-stat-sub">
              {stats.completedAttempts || 0} completed submissions
            </div>
          </Link>

          <Link href="/admin/analytics" className="admin-stat-card">
            <div className="admin-stat-icon">
              <TrendingUp size={16} className="text-[#10B981]" />
            </div>
            <div className="admin-stat-value">{stats.averageScore || 0}%</div>
            <div className="admin-stat-label">Average Campus Score</div>
            <div className="admin-stat-sub">Across all student submissions</div>
          </Link>
        </div>

        {/* 3 Columns: Department Distribution + Quick Actions + Campus Overview */}
        <div className="admin-grid-3" style={{ marginBottom: '24px' }}>
          {/* Department Breakdown */}
          <div className="admin-section-card">
            <div className="admin-section-title">
              <BarChart3 size={14} className="text-[var(--kc-accent)]" />
              <span>Department Enrollment</span>
            </div>
            {(!stats.departmentBreakdown || stats.departmentBreakdown.length === 0) ? (
              <div className="admin-empty" style={{ padding: '24px 0' }}>
                <div className="admin-empty-text">No roster departments registered yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.departmentBreakdown.map((d, i) => {
                  const pct = stats.totalStudents > 0 ? (d.count / stats.totalStudents) * 100 : 0;
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={d.department || i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11.5px' }}>
                        <span style={{ color: 'var(--kc-text-secondary)' }}>{d.department || 'General'}</span>
                        <span style={{ color, fontWeight: 600 }}>{d.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--kc-surface-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="admin-section-card">
            <div className="admin-section-title">
              <Zap size={14} className="text-[var(--kc-accent)]" />
              <span>Campus Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/admin/assessments" className="admin-btn admin-btn-primary" style={{ justifyContent: 'center' }}>
                + Create New Assessment
              </Link>
              <Link href="/admin/roster" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
                Manage Student Roster ({stats.totalStudents || 0})
              </Link>
              <Link href="/admin/question-bank" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
                Question Bank
              </Link>
              <Link href="/admin/analytics" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
                Institutional Analytics
              </Link>
            </div>
          </div>

          {/* Campus Metrics */}
          <div className="admin-section-card">
            <div className="admin-section-title">
              <Activity size={14} className="text-[#10B981]" />
              <span>Institutional Overview</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
                <span>Active Roster Status</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>
                  {stats.totalStudents > 0 ? ((stats.activeStudents / stats.totalStudents) * 100).toFixed(0) : 0}% Active
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
                <span>Account Onboarding</span>
                <span style={{ color: 'var(--kc-text-primary)', fontWeight: 600 }}>
                  {stats.registeredStudents || 0} / {stats.totalStudents || 0} students
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
                <span>Published Assessments</span>
                <span style={{ color: 'var(--kc-accent)', fontWeight: 600 }}>
                  {stats.publishedAssessments || 0} Tests
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
                <span>Attempt Completion Rate</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>
                  {stats.totalAttempts > 0 ? ((stats.completedAttempts / stats.totalAttempts) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
                <span>Average Student Score</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>{stats.averageScore || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Bottom Cards: Recent Enrolled Students & Recent Campus Assessments */}
        <div className="admin-grid-2">
          {/* Recent Students */}
          <div className="admin-section-card">
            <div className="flex items-center justify-between mb-3">
              <div className="admin-section-title" style={{ margin: 0 }}>
                <GraduationCap size={14} className="text-[var(--kc-accent)]" />
                <span>Recently Enrolled Students</span>
              </div>
              <Link href="/admin/roster" className="text-xs text-[var(--kc-accent)] hover:underline">
                View Roster →
              </Link>
            </div>
            {(!stats.recentStudents || stats.recentStudents.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No student records imported yet</div></div>
            ) : (
              stats.recentStudents.map((s, i) => (
                <div key={s.id || i} className="admin-activity-item">
                  <div className="admin-activity-dot" style={{ background: s.is_active ? '#10B981' : '#f59e0b' }}></div>
                  <div className="admin-activity-text">
                    <strong style={{ color: 'var(--kc-text-primary)' }}>{s.student_name}</strong>
                    <span style={{ color: 'var(--kc-text-muted)', marginLeft: '6px', fontSize: '11px' }}>
                      ({s.student_id_number || s.college_email})
                    </span>
                    {s.department && (
                      <span className="admin-badge" style={{ marginLeft: '6px', fontSize: '10px' }}>
                        {s.department}
                      </span>
                    )}
                  </div>
                  <div className="admin-activity-time font-mono">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Assessments */}
          <div className="admin-section-card">
            <div className="flex items-center justify-between mb-3">
              <div className="admin-section-title" style={{ margin: 0 }}>
                <Award size={14} className="text-[var(--kc-accent)]" />
                <span>Recent Campus Assessments</span>
              </div>
              <Link href="/admin/assessments" className="text-xs text-[var(--kc-accent)] hover:underline">
                View All →
              </Link>
            </div>
            {(!stats.recentAssessments || stats.recentAssessments.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No campus assessments created yet</div></div>
            ) : (
              stats.recentAssessments.map((a, i) => (
                <div key={a.id || i} className="admin-activity-item">
                  <div className="admin-activity-dot" style={{
                    background: a.status === 'Published' ? '#10B981' : '#6b7280'
                  }}></div>
                  <div className="admin-activity-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Link href={`/admin/assessments/${a.id}`} className="hover:underline font-semibold" style={{ color: 'var(--kc-text-primary)' }}>
                      {a.title}
                    </Link>
                    <span style={{ color: 'var(--kc-text-muted)', marginLeft: '6px', fontSize: '11px' }}>
                      {a.category} · {a.duration_minutes}m
                    </span>
                  </div>
                  <span className={`admin-badge ${a.status === 'Published' ? 'badge-published' : 'badge-draft'}`} style={{ fontSize: '10px' }}>
                    {a.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Platform Super Admin Dashboard ─────────────────────────────────────────
  const difficultyMap = {};
  (stats.problemsByDifficulty || []).forEach(d => { difficultyMap[d.difficulty] = d.count; });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Platform Dashboard</h1>
          <p className="admin-page-subtitle">Telemetry, cluster health, and administrative controls</p>
        </div>
      </div>

      {pendingApps > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          background: 'rgba(245, 158, 11, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#f59e0b',
              display: 'flex'
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--kc-text-primary)' }}>
                {pendingApps} College Onboarding Application{pendingApps > 1 ? 's' : ''} Pending Verification
              </div>
              <div style={{ fontSize: '12px', color: 'var(--kc-text-muted)' }}>
                New academic institutions and administrator candidates are awaiting review and tenant provisioning.
              </div>
            </div>
          </div>
          <Link
            href="/admin/college-applications"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#f59e0b',
              color: '#000',
              fontSize: '12px',
              fontWeight: '700',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
            }}
          >
            Review Applications →
          </Link>
        </div>
      )}

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <Link href="/admin/users" className="admin-stat-card">
          <div className="admin-stat-icon">
            <Users size={16} />
          </div>
          <div className="admin-stat-value">{stats.totalUsers.toLocaleString()}</div>
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-sub">+{stats.newUsersThisWeek} this week · +{stats.newUsersThisMonth} this month</div>
        </Link>

        <Link href="/admin/problems" className="admin-stat-card">
          <div className="admin-stat-icon">
            <FileCode2 size={16} />
          </div>
          <div className="admin-stat-value">{stats.totalProblems.toLocaleString()}</div>
          <div className="admin-stat-label">Total Challenges</div>
          <div className="admin-stat-sub">{stats.publishedProblems} published · {stats.totalProblems - stats.publishedProblems} drafts</div>
        </Link>

        <Link href="/admin/submissions" className="admin-stat-card">
          <div className="admin-stat-icon">
            <CheckSquare size={16} />
          </div>
          <div className="admin-stat-value">{stats.totalSubmissions.toLocaleString()}</div>
          <div className="admin-stat-label">Submissions</div>
          <div className="admin-stat-sub">{stats.acceptedSubmissions} verified accepted</div>
        </Link>

        <Link href="/admin/analytics" className="admin-stat-card">
          <div className="admin-stat-icon">
            <BarChart3 size={16} className="text-[#10B981]" />
          </div>
          <div className="admin-stat-value">{stats.successRate}%</div>
          <div className="admin-stat-label">Acceptance Rate</div>
          <div className="admin-stat-sub">Across all runtime sandboxes</div>
        </Link>
      </div>

      {/* Quick Stats Row */}
      <div className="admin-grid-3" style={{ marginBottom: '24px' }}>
        {/* Problems by Difficulty */}
        <div className="admin-section-card">
          <div className="admin-section-title">
            <BarChart3 size={14} className="text-[var(--kc-accent)]" />
            <span>Problems by Difficulty</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <DifficultyBar label="Easy" count={difficultyMap['Easy'] || 0} total={stats.totalProblems} color="#10B981" />
            <DifficultyBar label="Medium" count={difficultyMap['Medium'] || 0} total={stats.totalProblems} color="#F59E0B" />
            <DifficultyBar label="Hard" count={difficultyMap['Hard'] || 0} total={stats.totalProblems} color="#EF4444" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-section-card">
          <div className="admin-section-title">
            <Zap size={14} className="text-[var(--kc-accent)]" />
            <span>Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/admin/problems/new" className="admin-btn admin-btn-primary" style={{ justifyContent: 'center' }}>
              + Create New Problem
            </Link>
            <Link href="/admin/problems?status=Draft" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
              Review Drafts ({stats.totalProblems - stats.publishedProblems})
            </Link>
            <Link href="/admin/users" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
              Manage Users
            </Link>
            <Link href="/admin/submissions" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
              Monitor Submissions
            </Link>
          </div>
        </div>

        {/* Platform Health */}
        <div className="admin-section-card">
          <div className="admin-section-title">
            <Activity size={14} className="text-[#10B981]" />
            <span>Platform Metrics</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
              <span>Published Problems</span>
              <span style={{ color: '#10B981', fontWeight: 600, fontFamily: 'var(--kc-font-code)' }}>{stats.publishedProblems}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
              <span>Draft Problems</span>
              <span style={{ color: 'var(--kc-text-muted)', fontWeight: 600, fontFamily: 'var(--kc-font-code)' }}>{stats.totalProblems - stats.publishedProblems}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
              <span>New Users (7d)</span>
              <span style={{ color: 'var(--kc-text-primary)', fontWeight: 600, fontFamily: 'var(--kc-font-code)' }}>{stats.newUsersThisWeek}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
              <span>New Users (30d)</span>
              <span style={{ color: 'var(--kc-text-primary)', fontWeight: 600, fontFamily: 'var(--kc-font-code)' }}>{stats.newUsersThisMonth}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--kc-text-secondary)' }}>
              <span>Acceptance Rate</span>
              <span style={{ color: '#10B981', fontWeight: 600, fontFamily: 'var(--kc-font-code)' }}>{stats.successRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-grid-2">
        <div className="admin-section-card">
          <div className="admin-section-title">
            <User size={14} className="text-[var(--kc-accent)]" />
            <span>Recent Users</span>
          </div>
          {stats.recentActivity.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No recent user registrations</div></div>
          ) : (
            stats.recentActivity.map((u, i) => (
              <div key={i} className="admin-activity-item">
                <div className="admin-activity-dot" style={{ background: u.role === 'admin' ? 'var(--kc-accent)' : 'var(--kc-text-muted)' }}></div>
                <div className="admin-activity-text">
                  <strong style={{ color: 'var(--kc-text-primary)' }}>{u.username}</strong>
                  <span className="admin-badge" style={{ marginLeft: '6px', fontSize: '10px',
                    ...(u.role === 'admin' 
                      ? { background: 'var(--kc-accent-subtle)', color: 'var(--kc-accent-hover)', border: '1px solid rgba(59,130,246,0.25)' } 
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--kc-text-secondary)', border: '1px solid var(--kc-border)' })
                  }}>{u.role}</span>
                </div>
                <div className="admin-activity-time font-mono">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">
            <Clock size={14} className="text-[var(--kc-accent)]" />
            <span>Recent Submissions</span>
          </div>
          {stats.recentSubmissions.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No recent submissions evaluated</div></div>
          ) : (
            stats.recentSubmissions.map((sub, i) => (
              <div key={i} className="admin-activity-item">
                <div className="admin-activity-dot" style={{
                  background: sub.status === 'Accepted' ? '#10B981' :
                    sub.status === 'Wrong Answer' ? '#EF4444' : '#F59E0B'
                }}></div>
                <div className="admin-activity-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: 'var(--kc-text-primary)' }}>{sub.title || 'Unknown'}</strong>
                  <span style={{ color: 'var(--kc-text-muted)', marginLeft: '6px' }}>by {sub.username || '?'}</span>
                </div>
                <span className={`admin-badge ${
                  sub.status === 'Accepted' ? 'badge-accepted' :
                  sub.status === 'Wrong Answer' ? 'badge-wrong' : 'badge-queued'
                }`} style={{ fontSize: '10px' }}>{sub.status}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DifficultyBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11.5px', fontFamily: 'var(--kc-font-code)' }}>
        <span style={{ color: 'var(--kc-text-secondary)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: '4px', background: 'var(--kc-surface-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '2px',
          transition: 'width 0.6s ease',
        }}></div>
      </div>
    </div>
  );
}
