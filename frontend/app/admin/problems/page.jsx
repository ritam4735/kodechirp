'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const PAGE_SIZE = 30;

export default function AdminProblems() {
  const searchParams = useSearchParams();
  const [problems, setProblems] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getProblems({
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search, difficulty, status, sortBy, sortOrder,
      });
      setProblems(res.data);
      setMeta(res.meta);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, difficulty, status, sortBy, sortOrder]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === problems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(problems.map(p => p.id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selected.size === 0) return;
    const confirmMsg = action === 'delete'
      ? `Delete ${selected.size} problems? This cannot be undone.`
      : `${action === 'publish' ? 'Publish' : 'Unpublish'} ${selected.size} problems?`;
    if (!confirm(confirmMsg)) return;
    try {
      await adminApi.bulkAction([...selected], action);
      fetchProblems();
    } catch (err) {
      alert('Bulk action failed: ' + err.message);
    }
  };

  const handleToggle = async (id, isPublished) => {
    try {
      await adminApi.toggleProblemStatus(id, isPublished ? 'Draft' : 'Published');
      fetchProblems();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this problem permanently?')) return;
    try {
      await adminApi.deleteProblem(id);
      fetchProblems();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const totalPages = Math.ceil(meta.total / PAGE_SIZE);

  if (error) return <div style={{ color: '#f85149', padding: '40px' }}>Error: {error}</div>;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Problem Management</h1>
          <p className="admin-page-subtitle">{meta.total.toLocaleString()} problems total</p>
        </div>
        <Link href="/admin/problems/new" className="admin-btn admin-btn-primary">+ New Problem</Link>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search problems..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
        />
        <select className="admin-select" value={difficulty} onChange={e => { setDifficulty(e.target.value); setPage(0); }}>
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>
        <select className="admin-select" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Review">Review</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" className="admin-checkbox"
                  checked={problems.length > 0 && selected.size === problems.length}
                  onChange={toggleSelectAll} />
              </th>
              <th className={sortBy === 'title' ? 'sorted' : ''} onClick={() => handleSort('title')}>
                Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className={sortBy === 'difficulty' ? 'sorted' : ''} onClick={() => handleSort('difficulty')}>
                Difficulty {sortBy === 'difficulty' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Status</th>
              <th>Tests</th>
              <th>Source</th>
              <th className={sortBy === 'total_submissions' ? 'sorted' : ''} onClick={() => handleSort('total_submissions')}>
                Subs {sortBy === 'total_submissions' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8"><div className="admin-loading"><div className="admin-spinner"></div>Loading...</div></td></tr>
            ) : problems.length === 0 ? (
              <tr><td colSpan="8"><div className="admin-empty"><div className="admin-empty-icon">📭</div><div className="admin-empty-text">No problems found</div></div></td></tr>
            ) : problems.map(p => (
              <tr key={p.id}>
                <td><input type="checkbox" className="admin-checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td className="title-cell">{p.title}</td>
                <td>
                  <span className={`admin-badge badge-${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
                </td>
                <td>
                  <span className={`admin-badge ${
                    p.status === 'Published' ? 'badge-published' :
                    p.status === 'Review' ? 'badge-review' :
                    p.status === 'Archived' ? 'badge-archived' : 'badge-draft'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: p.test_count > 0 ? '#4ade80' : '#f85149',
                  }}>
                    {p.test_count || 0}
                  </span>
                  {p.test_count > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      ({p.public_tests}p/{p.private_tests}h)
                    </span>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{p.source || 'kodechirp'}</td>
                <td style={{ fontSize: '12px' }}>{p.total_submissions || 0}</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <Link href={`/admin/problems/${p.id}/edit`} className="admin-btn admin-btn-ghost admin-btn-sm">Edit</Link>
                    <button onClick={() => handleToggle(p.id, p.status === 'Published')} className={`admin-btn admin-btn-sm ${p.status === 'Published' ? 'admin-btn-ghost' : 'admin-btn-success'}`}>
                      {p.status === 'Published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link href={`/admin/problems/${p.id}/test-cases`} className="admin-btn admin-btn-ghost admin-btn-sm">Tests</Link>
                    <button onClick={() => handleDelete(p.id)} className="admin-btn admin-btn-danger admin-btn-sm">Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <div className="admin-pagination-info">
            Page {page + 1} of {totalPages} · Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, meta.total)} of {meta.total}
          </div>
          <div className="admin-pagination-btns">
            <button className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span className="admin-bulk-count">{selected.size} selected</span>
          <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => handleBulkAction('publish')}>Bulk Publish</button>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => handleBulkAction('unpublish')}>Bulk Unpublish</button>
          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleBulkAction('delete')}>Bulk Delete</button>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
    </div>
  );
}
