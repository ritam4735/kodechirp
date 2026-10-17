'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import Link from 'next/link';
import { 
  Users, 
  FileCode2, 
  CheckSquare, 
  BarChart3, 
  Activity, 
  Zap, 
  Clock, 
  User 
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getStats()
      .then(res => setStats(res.data))
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return <div style={{ color: '#EF4444', padding: '40px' }}>Failed to load dashboard statistics: {error}</div>;
  }

  if (!stats) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <span>Loading platform telemetry…</span>
      </div>
    );
  }

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
