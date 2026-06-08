'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';

const PAGE_SIZE = 50;

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [problemFilter, setProblemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSubmissions({
        offset: page * PAGE_SIZE, limit: PAGE_SIZE,
        user: userFilter, problem: problemFilter,
        status: statusFilter, language: langFilter,
      });
      setSubmissions(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, userFilter, problemFilter, statusFilter, langFilter]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const totalPages = Math.ceil(meta.total / PAGE_SIZE);

  const statusBadgeClass = (s) => {
    if (s === 'Accepted') return 'badge-accepted';
    if (s === 'Wrong Answer') return 'badge-wrong';
    if (s === 'Time Limit Exceeded') return 'badge-tle';
    if (s === 'Runtime Error' || s === 'Compilation Error') return 'badge-error';
    return 'badge-queued';
  };

  if (error) return <div style={{ color: '#f85149', padding: '40px' }}>Error: {error}</div>;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Submission Monitor</h1>
          <p className="admin-page-subtitle">{meta.total.toLocaleString()} submissions total</p>
        </div>
        <button className="admin-btn admin-btn-ghost" onClick={fetchSubmissions}>↻ Refresh</button>
      </div>

      <div className="admin-toolbar">
        <input className="admin-search" style={{ maxWidth: '180px' }} placeholder="Filter by user..." value={userFilter}
          onChange={e => { setUserFilter(e.target.value); setPage(0); }} />
        <input className="admin-search" style={{ maxWidth: '180px' }} placeholder="Filter by problem..." value={problemFilter}
          onChange={e => { setProblemFilter(e.target.value); setPage(0); }} />
        <select className="admin-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All Status</option>
          <option value="Accepted">Accepted</option>
          <option value="Wrong Answer">Wrong Answer</option>
          <option value="Runtime Error">Runtime Error</option>
          <option value="Time Limit Exceeded">TLE</option>
          <option value="queued">Queued</option>
        </select>
        <select className="admin-select" value={langFilter} onChange={e => { setLangFilter(e.target.value); setPage(0); }}>
          <option value="">All Languages</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Problem</th>
              <th>Language</th>
              <th>Status</th>
              <th>Runtime</th>
              <th>Memory</th>
              <th>Tests</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8"><div className="admin-loading"><div className="admin-spinner"></div>Loading...</div></td></tr>
            ) : submissions.length === 0 ? (
              <tr><td colSpan="8"><div className="admin-empty"><div className="admin-empty-icon">🔍</div><div className="admin-empty-text">No submissions found</div></div></td></tr>
            ) : submissions.map(s => (
              <tr key={s.id}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.username || '—'}</td>
                <td className="title-cell">{s.problem_title || '—'}</td>
                <td><span className="admin-tag">{s.language}</span></td>
                <td><span className={`admin-badge ${statusBadgeClass(s.status)}`}>{s.status}</span></td>
                <td style={{ fontSize: '12px' }}>{s.runtime_ms ? `${s.runtime_ms}ms` : '—'}</td>
                <td style={{ fontSize: '12px' }}>{s.memory_kb ? `${(s.memory_kb / 1024).toFixed(1)}MB` : '—'}</td>
                <td style={{ fontSize: '12px' }}>{s.test_cases_passed ?? 0}/{s.test_cases_total ?? 0}</td>
                <td style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(s.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <div className="admin-pagination-info">Page {page + 1} of {totalPages}</div>
          <div className="admin-pagination-btns">
            <button className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
