'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import Link from 'next/link';

const PAGE_SIZE = 30;
const REVIEW_STATUSES = ['imported', 'parsed', 'ai_normalized', 'review_required', 'approved', 'ready_for_publication', 'published'];
const NEEDS_PARSE_STATUSES = new Set(['imported', 'pending']);

function formatReviewStatus(status) {
  return (status || 'imported').replace(/_/g, ' ');
}

function ConfidenceMeter({ value }) {
  const pct = Math.round((value || 0) * 100);
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
  return (
    <div className="confidence-meter">
      <div className="confidence-bar">
        <div className={`confidence-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`confidence-value ${level}`}>{pct}%</span>
    </div>
  );
}

function QualityFlags({ flags }) {
  if (!flags) return <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>;
  const items = [
    { key: 'missing_constraints', label: 'Missing Constraints' },
    { key: 'malformed_examples', label: 'Malformed Examples' },
    { key: 'suspicious_formatting', label: 'Bad Formatting' },
    { key: 'needs_manual_review', label: 'Needs Review' },
  ];
  return (
    <div className="quality-flags">
      {items.map(item => {
        const isSet = flags[item.key];
        return (
          <span key={item.key} className={`quality-flag ${isSet ? 'flag-warn' : 'flag-ok'}`}>
            {isSet ? '⚠' : '✓'} {item.label}
          </span>
        );
      })}
    </div>
  );
}

export default function NormalizationQueue() {
  const [problems, setProblems] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(new Set());
  const [aiStatus, setAiStatus] = useState(null);

  const [reviewStatus, setReviewStatus] = useState('');
  const [sortBy, setSortBy] = useState('parser_confidence');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, aiRes] = await Promise.all([
        adminApi.getReviewQueue({
          offset: page * PAGE_SIZE,
          limit: PAGE_SIZE,
          review_status: reviewStatus,
          sortBy,
          sortOrder,
        }),
        adminApi.getAIStatus().catch(() => ({ data: { configured: false } })),
      ]);
      setProblems(queueRes.data);
      setMeta(queueRes.meta);
      setStats(queueRes.stats || []);
      setAiStatus(aiRes.data);
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, reviewStatus, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleParse = async (id) => {
    setProcessing(prev => new Set(prev).add(id));
    try {
      await adminApi.parseProblem(id);
      fetchData();
    } catch (err) {
      alert('Parse failed: ' + err.message);
    } finally {
      setProcessing(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleNormalize = async (id) => {
    setProcessing(prev => new Set(prev).add(id));
    try {
      await adminApi.normalizeProblem(id);
      fetchData();
    } catch (err) {
      alert('Normalize failed: ' + err.message);
    } finally {
      setProcessing(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminApi.approveParsing(id);
      fetchData();
    } catch (err) {
      alert('Approve failed: ' + err.message);
    }
  };

  const handleBatchParse = async () => {
    if (selected.size === 0) return;
    const ids = [...selected];
    setProcessing(new Set(ids));
    try {
      await adminApi.batchParse(ids);
      fetchData();
    } catch (err) {
      alert('Batch parse failed: ' + err.message);
    } finally {
      setProcessing(new Set());
    }
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

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const totalPages = Math.ceil(meta.total / PAGE_SIZE);
  const getStatCount = (status) => stats.find(s => s.review_status === status)?.count || 0;
  const totalWithStatus = stats.reduce((sum, s) => sum + (s.count || 0), 0);

  if (error) return <div style={{ color: '#f85149', padding: '40px' }}>Error: {error}</div>;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Problem Normalization</h1>
          <p className="admin-page-subtitle">
            Parse and normalize imported problems · {meta.total} in queue
            {aiStatus && (
              <span className={`ai-status-pill ${aiStatus.configured ? 'ai-active' : 'ai-inactive'}`} style={{ marginLeft: '12px' }}>
                {aiStatus.configured ? '🟢 AI Active' : '⚪ AI Offline'}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn admin-btn-ghost" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="norm-stats-row">
        <div className={`norm-stat-chip ${reviewStatus === '' ? 'active' : ''}`} onClick={() => { setReviewStatus(''); setPage(0); }}>
          <div>
            <div className="norm-stat-count">{meta.total}</div>
            <div className="norm-stat-label">All</div>
          </div>
        </div>
        {REVIEW_STATUSES.map(status => (
          <div key={status} className={`norm-stat-chip ${reviewStatus === status ? 'active' : ''}`} onClick={() => { setReviewStatus(status); setPage(0); }}>
            <div>
              <div className="norm-stat-count">{getStatCount(status)}</div>
              <div className="norm-stat-label">{formatReviewStatus(status)}</div>
            </div>
          </div>
        ))}
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
              <th>Difficulty</th>
              <th>Status</th>
              <th>Review</th>
              <th className={sortBy === 'parser_confidence' ? 'sorted' : ''} onClick={() => handleSort('parser_confidence')}>
                Confidence {sortBy === 'parser_confidence' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Quality</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8"><div className="admin-loading"><div className="admin-spinner"></div>Loading...</div></td></tr>
            ) : problems.length === 0 ? (
              <tr><td colSpan="8"><div className="admin-empty"><div className="admin-empty-icon">🔬</div><div className="admin-empty-text">No problems in queue</div></div></td></tr>
            ) : problems.map(p => {
              const isProcessing = processing.has(p.id);
              const flags = p.ai_quality_flags;
              const hasIssues = flags && (flags.missing_constraints || flags.malformed_examples || flags.suspicious_formatting || flags.needs_manual_review);

              return (
                <tr key={p.id}>
                  <td><input type="checkbox" className="admin-checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                  <td className="title-cell">
                    <Link href={`/admin/normalize/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`admin-badge badge-${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
                  </td>
                  <td>
                    <span className={`admin-badge badge-${p.status?.toLowerCase()}`}>{p.status}</span>
                  </td>
                  <td>
                    <span className={`admin-badge badge-${p.review_status || 'imported'}`}>
                      {formatReviewStatus(p.review_status)}
                    </span>
                  </td>
                  <td>
                    {p.parser_confidence != null ? (
                      <ConfidenceMeter value={p.parser_confidence} />
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Not parsed</span>
                    )}
                  </td>
                  <td>
                    {hasIssues ? (
                      <span className="quality-flag flag-warn" style={{ fontSize: '10px' }}>⚠ Issues</span>
                    ) : flags ? (
                      <span className="quality-flag flag-ok" style={{ fontSize: '10px' }}>✓ OK</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {isProcessing ? (
                        <span style={{ color: '#4d9fff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="admin-spinner" style={{ width: '12px', height: '12px' }}></span>Processing...
                        </span>
                      ) : (
                        <>
                          {(!p.review_status || NEEDS_PARSE_STATUSES.has(p.review_status)) && (
                            <button onClick={() => handleParse(p.id)} className="admin-btn admin-btn-primary admin-btn-sm">Parse</button>
                          )}
                          {p.review_status === 'parsed' && aiStatus?.configured && (
                            <button onClick={() => handleNormalize(p.id)} className="admin-btn admin-btn-warning admin-btn-sm">AI Normalize</button>
                          )}
                          {(['parsed', 'ai_normalized', 'review_required'].includes(p.review_status)) && (
                            <button onClick={() => handleApprove(p.id)} className="admin-btn admin-btn-success admin-btn-sm">Approve</button>
                          )}
                          <Link href={`/admin/normalize/${p.id}`} className="admin-btn admin-btn-ghost admin-btn-sm">Review</Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
          <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={handleBatchParse}>Batch Parse</button>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
    </div>
  );
}
