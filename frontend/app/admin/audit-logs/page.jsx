'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import { useAuth } from '../../../hooks/useAuth';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertTriangle,
} from 'lucide-react';

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [targetFilter, setTargetFilter] = useState('');
  const [page, setPage] = useState(0);

  // Selected Log Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        action: actionFilter || undefined,
        targetType: targetFilter || undefined,
      });
      setLogs(res.data || []);
      setMeta(res.meta || { total: 0 });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const totalPages = Math.ceil((meta.total || 0) / PAGE_SIZE);

  const formatActionBadge = (action) => {
    if (action.includes('create') || action.includes('add') || action.includes('assign')) {
      return <span className="admin-badge kc-badge-success">{action}</span>;
    }
    if (action.includes('delete') || action.includes('revoke') || action.includes('suspend') || action.includes('deactivate')) {
      return <span className="admin-badge kc-badge-error">{action}</span>;
    }
    if (action.includes('export')) {
      return <span className="admin-badge kc-badge-info">{action}</span>;
    }
    return <span className="admin-badge" style={{ background: 'var(--kc-accent-subtle)', color: 'var(--kc-accent-text)', border: '1px solid var(--kc-accent-border)' }}>{action}</span>;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={24} style={{ color: 'var(--kc-accent)' }} />
            Administrative Audit History
          </h1>
          <p className="admin-page-description">
            Immutable log of role modifications, roster synchronizations, cohort assignments, and export operations.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select
          className="admin-select"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          style={{ minWidth: '180px' }}
        >
          <option value="">All Actions</option>
          <option value="role_change">Role Changes</option>
          <option value="organization_change">Organization Changes</option>
          <option value="admin_assignment">Admin Assignments</option>
          <option value="roster_import">Roster Imports</option>
          <option value="eligibility_change">Eligibility Changes</option>
          <option value="assessment_publication">Assessment Publication</option>
          <option value="cohort_assignment">Cohort Assignments</option>
          <option value="results_export">Results Export</option>
        </select>

        <select
          className="admin-select"
          value={targetFilter}
          onChange={(e) => {
            setTargetFilter(e.target.value);
            setPage(0);
          }}
          style={{ minWidth: '160px' }}
        >
          <option value="">All Target Types</option>
          <option value="user">Users</option>
          <option value="organization">Organizations</option>
          <option value="roster">Roster</option>
          <option value="assessment">Assessments</option>
          <option value="assignment">Assignments</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Target Type</th>
              <th>Administrator</th>
              <th>Organization</th>
              <th>IP Address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && !logs.length ? (
              <tr>
                <td colSpan="7">
                  <div className="admin-loading">
                    <div className="admin-spinner"></div>
                    Loading audit records...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="admin-empty">
                    <div className="admin-empty-icon">
                      <Shield size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="admin-empty-text">No audit log records found</div>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    {formatActionBadge(log.action)}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>
                      {log.target_type || '—'}
                    </span>
                  </td>
                  <td className="title-cell">
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>
                      {log.actor_username || log.actor_email || 'System'}
                    </div>
                    {log.actor_email && log.actor_username && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.actor_email}</div>
                    )}
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {log.organization_name ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={13} style={{ color: 'var(--kc-accent)' }} />
                        {log.organization_name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Platform</span>
                    )}
                  </td>
                  <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {log.ip_address || '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => setSelectedLog(log)}
                      title="Inspect log details"
                    >
                      <Eye size={13} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-pagination-btn"
            disabled={page === 0}
            onClick={() => setPage(p => Math.max(0, p - 1))}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="admin-pagination-info">
            Page {page + 1} of {totalPages} ({meta.total} total)
          </span>
          <button
            type="button"
            className="admin-pagination-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--kc-surface, #1e293b)',
              border: '1px solid var(--kc-border, rgba(255,255,255,0.1))',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} style={{ color: 'var(--kc-accent)' }} />
                <h2 style={{ fontSize: '17px', fontWeight: 600 }}>Audit Event Details</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Action: </span>
                <strong>{selectedLog.action}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp: </span>
                <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Administrator: </span>
                <span>{selectedLog.actor_username || selectedLog.actor_email}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target: </span>
                <span>{selectedLog.target_type} ({selectedLog.target_id || 'N/A'})</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>IP Address: </span>
                <span style={{ fontFamily: 'monospace' }}>{selectedLog.ip_address || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Metadata Payload:</span>
                <pre
                  style={{
                    backgroundColor: 'var(--kc-bg, #0f172a)',
                    border: '1px solid var(--kc-border)',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    maxHeight: '200px',
                  }}
                >
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
