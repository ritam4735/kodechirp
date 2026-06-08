'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getStats()
      .then(res => setStats(res.data))
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return <div style={{ color: '#f85149', padding: '40px' }}>Failed to load: {error}</div>;
  }

  if (!stats) {
    return <div className="admin-loading"><div className="admin-spinner"></div>Loading dashboard...</div>;
  }

  const difficultyMap = {};
  (stats.problemsByDifficulty || []).forEach(d => { difficultyMap[d.difficulty] = d.count; });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Platform overview and quick actions</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <Link href="/admin/users" className="admin-stat-card stat-users">
          <div className="admin-stat-icon">👥</div>
          <div className="admin-stat-value">{stats.totalUsers.toLocaleString()}</div>
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-sub">+{stats.newUsersThisWeek} this week · +{stats.newUsersThisMonth} this month</div>
        </Link>

        <Link href="/admin/problems" className="admin-stat-card stat-problems">
          <div className="admin-stat-icon">📝</div>
          <div className="admin-stat-value">{stats.totalProblems.toLocaleString()}</div>
          <div className="admin-stat-label">Total Problems</div>
          <div className="admin-stat-sub">{stats.publishedProblems} published · {stats.totalProblems - stats.publishedProblems} drafts</div>
        </Link>

        <Link href="/admin/submissions" className="admin-stat-card stat-submissions">
          <div className="admin-stat-icon">🔍</div>
          <div className="admin-stat-value">{stats.totalSubmissions.toLocaleString()}</div>
          <div className="admin-stat-label">Total Submissions</div>
          <div className="admin-stat-sub">{stats.acceptedSubmissions} accepted</div>
        </Link>

        <Link href="/admin/analytics" className="admin-stat-card stat-rate">
          <div className="admin-stat-icon">✅</div>
          <div className="admin-stat-value">{stats.successRate}%</div>
          <div className="admin-stat-label">Acceptance Rate</div>
        </Link>
      </div>

      {/* Quick Stats Row */}
      <div className="admin-grid-3" style={{ marginBottom: '24px' }}>
        {/* Problems by Difficulty */}
        <div className="admin-section-card">
          <div className="admin-section-title">📊 Problems by Difficulty</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <DifficultyBar label="Easy" count={difficultyMap['Easy'] || 0} total={stats.totalProblems} color="#4ade80" />
            <DifficultyBar label="Medium" count={difficultyMap['Medium'] || 0} total={stats.totalProblems} color="#fbbf24" />
            <DifficultyBar label="Hard" count={difficultyMap['Hard'] || 0} total={stats.totalProblems} color="#f87171" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-section-card">
          <div className="admin-section-title">⚡ Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link href="/admin/problems/new" className="admin-btn admin-btn-primary" style={{ justifyContent: 'center' }}>
              + Create New Problem
            </Link>
            <Link href="/admin/problems?status=unpublished" className="admin-btn admin-btn-ghost" style={{ justifyContent: 'center' }}>
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
          <div className="admin-section-title">🩺 Platform Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Published Problems</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>{stats.publishedProblems}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Draft Problems</span>
              <span style={{ color: '#8b949e', fontWeight: 600 }}>{stats.totalProblems - stats.publishedProblems}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>New Users (7d)</span>
              <span style={{ color: '#c084fc', fontWeight: 600 }}>{stats.newUsersThisWeek}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>New Users (30d)</span>
              <span style={{ color: '#c084fc', fontWeight: 600 }}>{stats.newUsersThisMonth}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Acceptance Rate</span>
              <span style={{ color: '#4ade80', fontWeight: 600 }}>{stats.successRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-grid-2">
        <div className="admin-section-card">
          <div className="admin-section-title">👤 Recent Users</div>
          {stats.recentActivity.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No recent users</div></div>
          ) : (
            stats.recentActivity.map((u, i) => (
              <div key={i} className="admin-activity-item">
                <div className="admin-activity-dot" style={{ background: u.role === 'admin' ? '#c084fc' : '#4d9fff' }}></div>
                <div className="admin-activity-text">
                  <strong style={{ color: 'var(--text-primary)' }}>{u.username}</strong>
                  <span className="admin-badge" style={{ marginLeft: '6px', fontSize: '10px' ,
                    ...(u.role === 'admin' ? { background: 'rgba(168,85,247,0.15)', color: '#c084fc' } : { background: 'rgba(77,159,255,0.12)', color: '#4d9fff' })
                  }}>{u.role}</span>
                </div>
                <div className="admin-activity-time">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">📨 Recent Submissions</div>
          {stats.recentSubmissions.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No recent submissions</div></div>
          ) : (
            stats.recentSubmissions.map((sub, i) => (
              <div key={i} className="admin-activity-item">
                <div className="admin-activity-dot" style={{
                  background: sub.status === 'Accepted' ? '#4ade80' :
                    sub.status === 'Wrong Answer' ? '#f87171' : '#fbbf24'
                }}></div>
                <div className="admin-activity-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{sub.title || 'Unknown'}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>by {sub.username || '?'}</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: '3px',
          transition: 'width 0.6s ease',
        }}></div>
      </div>
    </div>
  );
}
