'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/adminApi';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { alert('Failed: ' + err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="admin-loading"><div className="admin-spinner"></div>Loading analytics...</div>;
  if (!data) return <div style={{ color: '#f85149', padding: '40px' }}>Failed to load analytics</div>;

  const diffMap = {};
  (data.problemsByDifficulty || []).forEach(d => { diffMap[d.difficulty] = d.count; });
  const totalProblems = Object.values(diffMap).reduce((a, b) => a + b, 0) || 1;

  const maxDaily = Math.max(...(data.dailySubmissions || []).map(d => d.count), 1);
  const maxWeekly = Math.max(...(data.weeklySubmissions || []).map(d => d.count), 1);

  const statusMap = {};
  (data.submissionsByStatus || []).forEach(s => { statusMap[s.status] = s.count; });
  const totalStatusSubs = Object.values(statusMap).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">Platform insights and trends</p>
        </div>
      </div>

      {/* Row 1: Difficulty + Acceptance by Difficulty + Submission Status */}
      <div className="admin-grid-3" style={{ marginBottom: '24px' }}>
        <div className="admin-section-card">
          <div className="admin-section-title">📊 Problems by Difficulty</div>
          {['Easy', 'Medium', 'Hard'].map(d => {
            const count = diffMap[d] || 0;
            const pct = (count / totalProblems) * 100;
            const color = d === 'Easy' ? '#4ade80' : d === 'Medium' ? '#fbbf24' : '#f87171';
            return (
              <div key={d} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d}</span>
                  <span style={{ color, fontWeight: 600 }}>{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">🎯 Acceptance by Difficulty</div>
          {(data.acceptanceByDifficulty || []).map(d => {
            const color = d.difficulty === 'Easy' ? '#4ade80' : d.difficulty === 'Medium' ? '#fbbf24' : '#f87171';
            return (
              <div key={d.difficulty} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.difficulty}</span>
                  <span style={{ color, fontWeight: 600 }}>{d.rate}%</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>{d.accepted} accepted / {d.total} total</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">📋 Submission Status</div>
          {Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
            const pct = (count / totalStatusSubs) * 100;
            const color = status === 'Accepted' ? '#4ade80' : status === 'Wrong Answer' ? '#f87171' :
              status === 'Time Limit Exceeded' ? '#fbbf24' : '#fb923c';
            return (
              <div key={status} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
                  <span style={{ color, fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2: Daily Submissions Chart */}
      <div className="admin-grid-2" style={{ marginBottom: '24px' }}>
        <div className="admin-section-card">
          <div className="admin-section-title">📈 Daily Submissions (30 days)</div>
          {data.dailySubmissions.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No submission data</div></div>
          ) : (
            <div className="admin-bar-chart">
              {data.dailySubmissions.map((d, i) => (
                <div key={i} className="admin-bar" style={{ height: `${(d.count / maxDaily) * 100}%` }} title={`${d.date}: ${d.count} submissions`}>
                  {i % 5 === 0 && <span className="admin-bar-label">{new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">📊 Weekly Submissions (12 weeks)</div>
          {data.weeklySubmissions.length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No submission data</div></div>
          ) : (
            <div className="admin-bar-chart">
              {data.weeklySubmissions.map((d, i) => (
                <div key={i} className="admin-bar" style={{ height: `${(d.count / maxWeekly) * 100}%`, background: 'linear-gradient(to top, rgba(0,212,255,0.5), rgba(168,85,247,0.4))' }}
                  title={`Week of ${d.week}: ${d.count} submissions`}>
                  <span className="admin-bar-label">{new Date(d.week).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Most Attempted + Most Solved + Most Active Users */}
      <div className="admin-grid-3">
        <div className="admin-section-card">
          <div className="admin-section-title">🔥 Most Attempted</div>
          {(data.mostAttempted || []).map((p, i) => (
            <div key={p.id} className="admin-activity-item">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span className={`admin-badge badge-${p.difficulty?.toLowerCase()}`} style={{ fontSize: '10px' }}>{p.difficulty}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>{p.attempts}</span>
            </div>
          ))}
          {(data.mostAttempted || []).length === 0 && <div className="admin-empty"><div className="admin-empty-text">No data</div></div>}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">✅ Most Solved</div>
          {(data.mostSolved || []).map((p, i) => (
            <div key={p.id} className="admin-activity-item">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>{p.solved}</span>
            </div>
          ))}
          {(data.mostSolved || []).length === 0 && <div className="admin-empty"><div className="admin-empty-text">No data</div></div>}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">👤 Most Active Users</div>
          {(data.mostActiveUsers || []).map((u, i) => (
            <div key={u.id} className="admin-activity-item">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px' }}>{u.username}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{u.total_submissions} subs</span>
              <span style={{ color: '#4ade80', fontSize: '11px' }}>{u.accepted} acc</span>
            </div>
          ))}
          {(data.mostActiveUsers || []).length === 0 && <div className="admin-empty"><div className="admin-empty-text">No data</div></div>}
        </div>
      </div>
    </div>
  );
}
