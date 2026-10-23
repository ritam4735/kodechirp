'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import { useAuth } from '../../../hooks/useAuth';
import {
  Building2,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Edit2,
  PauseCircle,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
  Users,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

const PAGE_SIZE = 20;

export default function OrganizationsPage() {
  const { user: currentUser } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Toast notification state
  const [toast, setToast] = useState(null);
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    const timer = setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Org Create / Edit Modal State
  const [orgModal, setOrgModal] = useState({
    open: false,
    mode: 'create', // 'create' | 'edit'
    id: null,
    name: '',
    slug: '',
    code: '',
    domain: '',
    loading: false,
  });

  // College Admin Management Modal State
  const [adminModal, setAdminModal] = useState({
    open: false,
    org: null,
    admins: [],
    loading: false,
    newAdminEmail: '',
    newAdminRoleTitle: 'College Administrator',
    assigning: false,
  });

  // Confirmation Modal State (Activate / Suspend)
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    org: null,
    action: '', // 'activate' | 'suspend'
    loading: false,
  });

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrganizations({
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setOrganizations(res.data || []);
      setMeta(res.meta || { total: 0 });
    } catch (err) {
      setError(err.message);
      showToast('error', `Failed to load organizations: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, showToast]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Open Create Org
  const handleOpenCreate = () => {
    setOrgModal({
      open: true,
      mode: 'create',
      id: null,
      name: '',
      slug: '',
      code: '',
      domain: '',
      loading: false,
    });
  };

  // Open Edit Org
  const handleOpenEdit = (org) => {
    setOrgModal({
      open: true,
      mode: 'edit',
      id: org.id,
      name: org.name || '',
      slug: org.slug || '',
      code: org.code || '',
      domain: org.domain || '',
      loading: false,
    });
  };

  // Save Org (Create / Edit)
  const handleSaveOrg = async (e) => {
    e.preventDefault();
    if (!orgModal.name.trim() || !orgModal.slug.trim()) {
      showToast('error', 'Name and unique Slug are required.');
      return;
    }

    setOrgModal(prev => ({ ...prev, loading: true }));
    try {
      const payload = {
        name: orgModal.name.trim(),
        slug: orgModal.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        code: orgModal.code.trim().toUpperCase() || undefined,
        domain: orgModal.domain.trim().toLowerCase() || undefined,
      };

      if (orgModal.mode === 'create') {
        await adminApi.createOrganization(payload);
        showToast('success', `Organization "${payload.name}" created successfully.`);
      } else {
        await adminApi.updateOrganization(orgModal.id, payload);
        showToast('success', `Organization "${payload.name}" updated successfully.`);
      }
      setOrgModal(prev => ({ ...prev, open: false }));
      fetchOrganizations();
    } catch (err) {
      showToast('error', err.message || 'Failed to save organization.');
    } finally {
      setOrgModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Toggle Org Status
  const handleToggleStatus = async () => {
    if (!confirmModal.org) return;
    setConfirmModal(prev => ({ ...prev, loading: true }));
    const newStatus = confirmModal.action === 'activate';
    try {
      await adminApi.toggleOrganizationStatus(confirmModal.org.id, newStatus);
      showToast(
        'success',
        `Organization "${confirmModal.org.name}" has been ${newStatus ? 'activated' : 'suspended'}.`
      );
      setConfirmModal({ open: false, org: null, action: '', loading: false });
      fetchOrganizations();
    } catch (err) {
      showToast('error', err.message || 'Status update failed.');
      setConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Open Manage College Admins Modal
  const handleOpenAdmins = async (org) => {
    setAdminModal({
      open: true,
      org,
      admins: [],
      loading: true,
      newAdminEmail: '',
      newAdminRoleTitle: 'College Administrator',
      assigning: false,
    });
    try {
      const res = await adminApi.getOrganizationAdmins(org.id);
      setAdminModal(prev => ({
        ...prev,
        admins: res.data || [],
        loading: false,
      }));
    } catch (err) {
      showToast('error', `Failed to load admins: ${err.message}`);
      setAdminModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Assign new College Admin
  const handleAssignAdmin = async (e) => {
    e.preventDefault();
    if (!adminModal.newAdminEmail.trim()) {
      showToast('error', 'Please provide an email address.');
      return;
    }
    setAdminModal(prev => ({ ...prev, assigning: true }));
    try {
      await adminApi.assignCollegeAdmin(adminModal.org.id, {
        email: adminModal.newAdminEmail.trim().toLowerCase(),
        roleTitle: adminModal.newAdminRoleTitle.trim() || 'College Administrator',
      });
      showToast('success', `Admin privileges assigned to ${adminModal.newAdminEmail}.`);
      setAdminModal(prev => ({ ...prev, newAdminEmail: '' }));
      // Refresh list
      const res = await adminApi.getOrganizationAdmins(adminModal.org.id);
      setAdminModal(prev => ({
        ...prev,
        admins: res.data || [],
        assigning: false,
      }));
      fetchOrganizations();
    } catch (err) {
      showToast('error', err.message || 'Failed to assign administrator.');
      setAdminModal(prev => ({ ...prev, assigning: false }));
    }
  };

  // Revoke College Admin
  const handleRevokeAdmin = async (userId, userEmail) => {
    if (!confirm(`Revoke College Admin privileges for ${userEmail}?`)) return;
    try {
      await adminApi.revokeCollegeAdmin(adminModal.org.id, userId);
      showToast('success', `Privileges revoked for ${userEmail}.`);
      setAdminModal(prev => ({
        ...prev,
        admins: prev.admins.filter(a => a.id !== userId),
      }));
      fetchOrganizations();
    } catch (err) {
      showToast('error', err.message || 'Failed to revoke administrator privileges.');
    }
  };

  const totalPages = Math.ceil((meta.total || 0) / PAGE_SIZE);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`admin-toast admin-toast-${toast.type}`}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toast.type === 'error' ? 'var(--kc-danger, #ef4444)' : 'var(--kc-accent, #3b82f6)',
            color: '#fff',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={24} style={{ color: 'var(--kc-accent)' }} />
            Organization & College Management
          </h1>
          <p className="admin-page-description">
            Super Admin portal to manage institution accounts, domain affiliations, and College Administrators.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={16} />
          Create Organization
        </button>
      </div>

      {/* Stats summary */}
      <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Organizations</div>
          <div className="admin-stat-value">{meta.total || 0}</div>
          <div className="admin-stat-sub">Registered partner institutions</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Active Institutions</div>
          <div className="admin-stat-value" style={{ color: '#4ade80' }}>
            {organizations.filter(o => o.is_active).length}
          </div>
          <div className="admin-stat-sub">Authorizing rosters & assessments</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Suspended Institutions</div>
          <div className="admin-stat-value" style={{ color: '#f87171' }}>
            {organizations.filter(o => !o.is_active).length}
          </div>
          <div className="admin-stat-sub">Access temporarily disabled</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-wrap" style={{ flex: 1, minWidth: '240px' }}>
          <Search className="admin-search-icon" size={15} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by college name, code, domain or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          style={{ minWidth: '150px' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
        </select>
      </div>

      {/* Organizations Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Code / Slug</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Admins</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !organizations.length ? (
              <tr>
                <td colSpan="7">
                  <div className="admin-loading">
                    <div className="admin-spinner"></div>
                    Loading organizations...
                  </div>
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="admin-empty">
                    <div className="admin-empty-icon">
                      <Building2 size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="admin-empty-text">No organizations found</div>
                  </div>
                </td>
              </tr>
            ) : (
              organizations.map(org => (
                <tr key={org.id}>
                  <td className="title-cell">
                    <div style={{ fontWeight: 600, color: 'var(--kc-text-primary)' }}>{org.name}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {org.code && (
                        <span className="admin-badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--kc-accent)' }}>
                          {org.code}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {org.slug}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {org.domain || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${org.is_active ? 'badge-active' : 'badge-suspended'}`}>
                      {org.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => handleOpenAdmins(org)}
                      style={{ gap: '6px' }}
                      title="Manage College Admins"
                    >
                      <Users size={14} />
                      <span>{org.admin_count ?? 0} Admins</span>
                    </button>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => handleOpenEdit(org)}
                        title="Edit organization profile"
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm"
                        style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--kc-accent)' }}
                        onClick={() => handleOpenAdmins(org)}
                        title="Assign or revoke College Admins"
                      >
                        <UserPlus size={13} />
                        Admins
                      </button>
                      {org.is_active ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-warning admin-btn-sm"
                          onClick={() => setConfirmModal({ open: true, org, action: 'suspend', loading: false })}
                          title="Suspend organization access"
                        >
                          <PauseCircle size={13} />
                          Suspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-success admin-btn-sm"
                          onClick={() => setConfirmModal({ open: true, org, action: 'activate', loading: false })}
                          title="Activate organization access"
                        >
                          <PlayCircle size={13} />
                          Activate
                        </button>
                      )}
                    </div>
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

      {/* Modal: Create / Edit Organization */}
      {orgModal.open && (
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
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--kc-text-primary)' }}>
                {orgModal.mode === 'create' ? 'Create New Organization' : 'Edit Organization'}
              </h2>
              <button
                type="button"
                onClick={() => setOrgModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOrg} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="admin-form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                  Institution Name *
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Indian Institute of Technology Bombay"
                  value={orgModal.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setOrgModal(prev => ({
                      ...prev,
                      name,
                      slug: prev.mode === 'create' ? slug : prev.slug,
                    }));
                  }}
                  required
                />
              </div>

              <div>
                <label className="admin-form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                  Unique URL Identifier (Slug) *
                </label>
                <input
                  type="text"
                  className="admin-input"
                  style={{ width: '100%', fontFamily: 'monospace' }}
                  placeholder="e.g. iit-bombay"
                  value={orgModal.slug}
                  onChange={(e) => setOrgModal(prev => ({ ...prev, slug: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="admin-form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                    Institutional Code
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    style={{ width: '100%', textTransform: 'uppercase' }}
                    placeholder="e.g. IITB"
                    value={orgModal.code}
                    onChange={(e) => setOrgModal(prev => ({ ...prev, code: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="admin-form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                    Email Domain
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. iitb.ac.in"
                    value={orgModal.domain}
                    onChange={(e) => setOrgModal(prev => ({ ...prev, domain: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => setOrgModal(prev => ({ ...prev, open: false }))}
                  disabled={orgModal.loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={orgModal.loading}
                >
                  {orgModal.loading ? 'Saving…' : orgModal.mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage College Administrators */}
      {adminModal.open && (
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
              maxWidth: '620px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--kc-text-primary)' }}>
                  Manage College Admins
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {adminModal.org?.name} ({adminModal.org?.code || adminModal.org?.slug})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Assign New Admin Section */}
            <form
              onSubmit={handleAssignAdmin}
              style={{
                backgroundColor: 'var(--kc-surface-subtle, rgba(255,255,255,0.03))',
                border: '1px solid var(--kc-border, rgba(255,255,255,0.07))',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--kc-accent)' }}>
                Assign New College Administrator
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="admin-form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    User Email *
                  </label>
                  <input
                    type="email"
                    className="admin-input"
                    style={{ width: '100%' }}
                    placeholder="admin@college.edu"
                    value={adminModal.newAdminEmail}
                    onChange={(e) => setAdminModal(prev => ({ ...prev, newAdminEmail: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="admin-form-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. Dean of Academics"
                    value={adminModal.newAdminRoleTitle}
                    onChange={(e) => setAdminModal(prev => ({ ...prev, newAdminRoleTitle: e.target.value }))}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="admin-btn admin-btn-primary admin-btn-sm"
                disabled={adminModal.assigning}
              >
                <UserPlus size={14} />
                {adminModal.assigning ? 'Assigning…' : 'Assign Privileges'}
              </button>
            </form>

            {/* Current Admins List */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>
                Current College Administrators ({adminModal.admins.length})
              </h3>
              {adminModal.loading ? (
                <div className="admin-loading" style={{ padding: '20px' }}>
                  <div className="admin-spinner"></div>
                  Loading administrators...
                </div>
              ) : adminModal.admins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No College Admins assigned yet. Use the form above to grant administrative access.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {adminModal.admins.map(admin => (
                    <div
                      key={admin.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        background: 'var(--kc-surface-subtle)',
                        border: '1px solid var(--kc-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{admin.username || admin.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{admin.email}</div>
                        {admin.role_title && (
                          <span style={{ fontSize: '11px', color: 'var(--kc-accent)', marginTop: '2px', display: 'inline-block' }}>
                            {admin.role_title}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => handleRevokeAdmin(admin.id, admin.email)}
                        title="Revoke College Admin privileges"
                      >
                        <UserMinus size={13} />
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setAdminModal(prev => ({ ...prev, open: false }))}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal (Activate / Suspend) */}
      {confirmModal.open && (
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
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: confirmModal.action === 'suspend' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: confirmModal.action === 'suspend' ? '#ef4444' : '#22c55e',
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h2 style={{ fontSize: '17px', fontWeight: 600 }}>
                {confirmModal.action === 'suspend' ? 'Suspend Organization?' : 'Activate Organization?'}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              {confirmModal.action === 'suspend' ? (
                <>
                  Suspending <strong>{confirmModal.org?.name}</strong> will block its College Admins and students from accessing private institutional assessments and roster features until reactivated.
                </>
              ) : (
                <>
                  Activating <strong>{confirmModal.org?.name}</strong> will immediately restore institutional access for its College Admins and eligible students.
                </>
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setConfirmModal({ open: false, org: null, action: '', loading: false })}
                disabled={confirmModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`admin-btn ${confirmModal.action === 'suspend' ? 'admin-btn-danger' : 'admin-btn-success'}`}
                onClick={handleToggleStatus}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? 'Updating…' : confirmModal.action === 'suspend' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
