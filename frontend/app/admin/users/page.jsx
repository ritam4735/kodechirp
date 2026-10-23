'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import { useAuth } from '../../../hooks/useAuth';
import { 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  PauseCircle, 
  PlayCircle, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertTriangle,
  Shield,
  Building2,
} from 'lucide-react';

const PAGE_SIZE = 30;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Organizations list for college admin assignment
  const [organizations, setOrganizations] = useState([]);
  const [selectedRole, setSelectedRole] = useState('user');
  const [selectedOrgId, setSelectedOrgId] = useState('');

  // In-app modal confirmation state
  const [modal, setModal] = useState({
    open: false,
    type: '', // 'delete' | 'role' | 'suspend' | 'activate'
    user: null,
    loading: false,
  });

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    const timer = setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        offset: page * PAGE_SIZE, limit: PAGE_SIZE,
        search, role: roleFilter, status: statusFilter,
      });
      setUsers(res.data || []);
      setMeta(res.meta || { total: 0 });
    } catch (err) {
      setError(err.message);
      showToast('error', `Failed to load users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    adminApi.getOrganizations({ limit: 100 })
      .then(res => setOrganizations(res.organizations || res.data || []))
      .catch(() => {});
  }, []);

  // Action button click handlers (trigger in-app modal or self-protection toast)
  const handleActionClick = (type, targetUser) => {
    const isSelf = Boolean(currentUser?.id && currentUser.id === targetUser.id);

    if (isSelf) {
      if (type === 'delete') {
        showToast('error', 'You cannot delete your own administrator account.');
        return;
      }
      if (type === 'role') {
        showToast('error', 'You cannot modify your own administrator role.');
        return;
      }
      if (type === 'suspend') {
        showToast('error', 'You cannot suspend your own administrator account.');
        return;
      }
    }

    if (type === 'role') {
      setSelectedRole(targetUser.role || 'user');
      setSelectedOrgId(targetUser.organization_id || '');
    }

    setModal({
      open: true,
      type,
      user: targetUser,
      loading: false,
    });
  };

  // Modal confirm action
  const handleModalConfirm = async () => {
    if (!modal.user) return;
    const { type, user: targetUser } = modal;
    setModal(prev => ({ ...prev, loading: true }));

    try {
      if (type === 'delete') {
        setUsers(prev => prev.filter(u => u.id !== targetUser.id));
        await adminApi.deleteUser(targetUser.id);
        showToast('success', `User "${targetUser.username}" permanently deleted.`);
      } else if (type === 'role') {
        if (selectedRole === 'college_admin' && !selectedOrgId && !targetUser.organization_id) {
          showToast('error', 'Please select an academic institution for the College Admin.');
          setModal(prev => ({ ...prev, loading: false }));
          return;
        }
        await adminApi.updateUserRole(targetUser.id, selectedRole, selectedOrgId || undefined);
        showToast('success', `Role for "${targetUser.username}" updated to ${selectedRole.replace('_', ' ')}.`);
      } else if (type === 'suspend') {
        await adminApi.updateUserStatus(targetUser.id, false);
        showToast('success', `User "${targetUser.username}" has been suspended.`);
      } else if (type === 'activate') {
        await adminApi.updateUserStatus(targetUser.id, true);
        showToast('success', `User "${targetUser.username}" has been activated.`);
      }
      setModal({ open: false, type: '', user: null, loading: false });
      await fetchUsers();
    } catch (err) {
      showToast('error', `Action failed: ${err.message}`);
      setModal(prev => ({ ...prev, loading: false }));
      await fetchUsers();
    }
  };

  const totalPages = Math.ceil(meta.total / PAGE_SIZE);

  if (error && !users.length) {
    return <div style={{ color: '#f85149', padding: '40px' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-subtitle">{meta.total.toLocaleString()} users total</p>
        </div>
      </div>

      {/* In-app Toast Banner */}
      {toast && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 18px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontWeight: 500,
          background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.14)' :
                      toast.type === 'error' ? 'rgba(248, 81, 73, 0.14)' : 'rgba(251, 191, 36, 0.14)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34, 197, 94, 0.35)' :
                               toast.type === 'error' ? 'rgba(248, 81, 73, 0.35)' : 'rgba(251, 191, 36, 0.35)'}`,
          color: toast.type === 'success' ? '#4ade80' :
                 toast.type === 'error' ? '#f87171' : '#fbbf24',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '15px' }}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 6px',
              opacity: 0.7,
            }}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      <div className="admin-toolbar">
        <input className="admin-search" placeholder="Search users..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }} />
        <select className="admin-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select className="admin-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Submissions</th>
              <th>Accepted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !users.length ? (
              <tr><td colSpan="8"><div className="admin-loading"><div className="admin-spinner"></div>Loading users...</div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="8"><div className="admin-empty"><div className="admin-empty-icon"><Users size={22} style={{ color: 'var(--text-muted)' }} /></div><div className="admin-empty-text">No users found</div></div></td></tr>
            ) : users.map(u => {
              const isSelf = Boolean(currentUser?.id && currentUser.id === u.id);
              return (
                <tr key={u.id}>
                  <td className="title-cell">
                    {u.username}
                    {isSelf && (
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: 'var(--kc-accent)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                      }}>
                        You
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <span className={`admin-badge badge-${u.role}`}>{u.role}</span>
                    {u.role === 'college_admin' && (
                      <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '3px', fontWeight: 500 }}>
                        🏫 {u.organization_name || 'No institution assigned'}
                      </div>
                    )}
                  </td>
                  <td><span className={`admin-badge ${u.is_active ? 'badge-active' : 'badge-suspended'}`}>{u.is_active ? 'Active' : 'Suspended'}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ fontSize: '12px' }}>{u.total_submissions}</td>
                  <td style={{ fontSize: '12px', color: '#4ade80' }}>{u.total_accepted}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`admin-btn admin-btn-sm ${isSelf ? 'admin-btn-disabled' : ''}`}
                        style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--kc-accent)', border: '1px solid rgba(59, 130, 246, 0.25)' }}
                        onClick={() => handleActionClick('role', u)}
                        disabled={isSelf}
                        title={isSelf ? 'Cannot modify your own administrator role' : 'Manage role and college assignment'}
                      >
                        Change Role
                      </button>
                      {u.is_active ? (
                        <button
                          type="button"
                          className={`admin-btn admin-btn-warning admin-btn-sm ${isSelf ? 'admin-btn-disabled' : ''}`}
                          onClick={() => handleActionClick('suspend', u)}
                          title={isSelf ? 'Cannot suspend yourself' : 'Suspend user account'}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-success admin-btn-sm"
                          onClick={() => handleActionClick('activate', u)}
                          title="Activate user account"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        className={`admin-btn admin-btn-danger admin-btn-sm ${isSelf ? 'admin-btn-disabled' : ''}`}
                        onClick={() => handleActionClick('delete', u)}
                        title={isSelf ? 'Cannot delete your own account' : 'Delete user permanently'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="admin-pagination">
          <div className="admin-pagination-info">Page {page + 1} of {totalPages}</div>
          <div className="admin-pagination-btns">
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ChevronLeft size={13} /> Prev
            </button>
            <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modal.open && modal.user && (
        <div
          className="admin-modal-overlay"
          onClick={() => { if (!modal.loading) setModal({ open: false, type: '', user: null, loading: false }); }}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: '500px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {modal.type === 'delete' ? <Trash2 size={18} style={{ color: 'var(--kc-error, #f87171)' }} /> :
                 modal.type === 'suspend' ? <PauseCircle size={18} style={{ color: '#fbbf24' }} /> :
                 modal.type === 'activate' ? <PlayCircle size={18} style={{ color: '#4ade80' }} /> :
                 <Shield size={18} style={{ color: 'var(--kc-accent)' }} />}
              </span>
              <span>
                {modal.type === 'delete' ? 'Permanently Delete User' :
                 modal.type === 'suspend' ? 'Suspend User Account' :
                 modal.type === 'activate' ? 'Activate User Account' :
                 'Manage User Role & Institution'}
              </span>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Target User:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{modal.user.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Email:</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{modal.user.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Current Role:</span>
                <span className={`admin-badge badge-${modal.user.role}`}>{modal.user.role}</span>
              </div>
            </div>

            {modal.type === 'role' ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Select Assigned Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option value="user">Standard User (Regular Student)</option>
                    <option value="college_admin">College Administrator (Institution Scoped)</option>
                    <option value="admin">Platform Administrator</option>
                    <option value="super_admin">Super Administrator (Unrestricted)</option>
                  </select>
                </div>

                {selectedRole === 'college_admin' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Assign Institution / College
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={e => setSelectedOrgId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    >
                      <option value="">-- Select an academic institution --</option>
                      {organizations.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.code || o.slug})
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', display: 'block' }}>
                      College admins only have access to students, assessments, and analytics of their assigned college.
                    </span>
                  </div>
                )}

                {selectedRole === 'super_admin' && (
                  <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '12px', color: '#f87171' }}>
                    Super Admins have unrestricted platform privileges, including cluster health, problem curation, and database access.
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)', marginBottom: '24px' }}>
                {modal.type === 'delete' && (
                  <span style={{ color: '#f87171' }}>
                    <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                    This action cannot be undone. All records associated with <strong>{modal.user.username}</strong> will be permanently removed.
                  </span>
                )}
                {modal.type === 'suspend' && (
                  <span>
                    The user will be immediately suspended and cannot sign in until reactivated.
                  </span>
                )}
                {modal.type === 'activate' && (
                  <span>
                    The user account will be restored to active status and allowed to log in normally.
                  </span>
                )}
              </p>
            )}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                disabled={modal.loading}
                onClick={() => setModal({ open: false, type: '', user: null, loading: false })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-btn ${
                  modal.type === 'delete' ? 'admin-btn-danger' :
                  modal.type === 'suspend' ? 'admin-btn-warning' :
                  modal.type === 'activate' ? 'admin-btn-success' : 'admin-btn-primary'
                }`}
                disabled={modal.loading}
                onClick={handleModalConfirm}
              >
                {modal.loading && <span className="admin-spinner-sm" style={{ marginRight: '6px' }}></span>}
                {modal.loading ? 'Saving...' : (
                  modal.type === 'delete' ? 'Delete User' :
                  modal.type === 'suspend' ? 'Suspend User' :
                  modal.type === 'activate' ? 'Activate User' : 'Save Role Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

