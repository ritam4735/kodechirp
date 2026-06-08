'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';

const PAGE_SIZE = 30;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        offset: page * PAGE_SIZE, limit: PAGE_SIZE,
        search, role: roleFilter, status: statusFilter,
      });
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Change role to ${newRole}?`)) return;
    try {
      await adminApi.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleStatusChange = async (userId, isActive) => {
    if (!confirm(isActive ? 'Activate user?' : 'Suspend user?')) return;
    try {
      await adminApi.updateUserStatus(userId, isActive);
      fetchUsers();
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
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-subtitle">{meta.total.toLocaleString()} users total</p>
        </div>
      </div>

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
            {loading ? (
              <tr><td colSpan="8"><div className="admin-loading"><div className="admin-spinner"></div>Loading...</div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="8"><div className="admin-empty"><div className="admin-empty-icon">👤</div><div className="admin-empty-text">No users found</div></div></td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td className="title-cell">{u.username}</td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</td>
                <td><span className={`admin-badge badge-${u.role}`}>{u.role}</span></td>
                <td><span className={`admin-badge ${u.is_active ? 'badge-active' : 'badge-suspended'}`}>{u.is_active ? 'Active' : 'Suspended'}</span></td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ fontSize: '12px' }}>{u.total_submissions}</td>
                <td style={{ fontSize: '12px', color: '#4ade80' }}>{u.total_accepted}</td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {u.role !== 'admin' && (
                      <button className="admin-btn admin-btn-sm" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}
                        onClick={() => handleRoleChange(u.id, 'admin')}>Promote</button>
                    )}
                    {u.role === 'admin' && (
                      <button className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => handleRoleChange(u.id, 'user')}>Demote</button>
                    )}
                    {u.is_active ? (
                      <button className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => handleStatusChange(u.id, false)}>Suspend</button>
                    ) : (
                      <button className="admin-btn admin-btn-success admin-btn-sm"
                        onClick={() => handleStatusChange(u.id, true)}>Activate</button>
                    )}
                  </div>
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
