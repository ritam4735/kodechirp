'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminApi, downloadAdminFile } from '../../../lib/adminApi';
import { useAuth } from '../../../hooks/useAuth';
import {
  GraduationCap,
  Upload,
  Download,
  History,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCw,
  X,
  AlertCircle,
  FileText,
  Info,
} from 'lucide-react';

const PAGE_SIZE = 25;

export default function StudentRosterPage() {
  const { user: currentUser } = useAuth();
  const fileInputRef = useRef(null);

  // Roster Directory State
  const [roster, setRoster] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  // Available filter options extracted from roster
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    const timer = setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  // Import Wizard Modal State
  const [importModal, setImportModal] = useState({
    open: false,
    step: 1, // 1: Select File, 2: Preview & Validation, 3: Success Summary
    file: null,
    fileName: '',
    previewData: null,
    deactivationPolicy: 'mark_inactive',
    uploading: false,
    confirming: false,
    resultSummary: null,
  });

  // History Drawer State
  const [historyModal, setHistoryModal] = useState({
    open: false,
    loading: false,
    imports: [],
  });

  // Fetch Roster Students
  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRoster({
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        department: deptFilter || undefined,
        academicYear: yearFilter || undefined,
        status: statusFilter || undefined,
      });
      const studentsList = res.students || res.data || [];
      setRoster(studentsList);
      setMeta(res.meta || { total: res.total || studentsList.length });

      // Extract unique depts and years
      if (studentsList.length) {
        setDepartments(prev => Array.from(new Set([...prev, ...studentsList.map(r => r.department).filter(Boolean)])));
        setAcademicYears(prev => Array.from(new Set([...prev, ...studentsList.map(r => r.academic_year).filter(Boolean)])));
      }
    } catch (err) {
      showToast('error', `Failed to load roster: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, yearFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Download Sample Roster Template
  const handleDownloadTemplate = async () => {
    try {
      showToast('info', 'Generating official roster spreadsheet template…');
      await downloadAdminFile('/roster/template', 'kodechirp_student_roster_template.xlsx');
      showToast('success', 'Roster template downloaded.');
    } catch (err) {
      showToast('error', `Failed to download template: ${err.message}`);
    }
  };

  // Step 1: Handle File Selection & Preview
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.xlsx', '.xls', '.csv'];
    const isAllowed = allowed.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAllowed) {
      showToast('error', 'Only .xlsx and .csv files are supported.');
      return;
    }

    setImportModal(prev => ({
      ...prev,
      open: true,
      step: 2,
      file,
      fileName: file.name,
      uploading: true,
      previewData: null,
      resultSummary: null,
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const previewRes = await adminApi.previewRosterImport(formData);
      setImportModal(prev => ({
        ...prev,
        uploading: false,
        previewData: previewRes,
      }));
    } catch (err) {
      showToast('error', `File validation error: ${err.message}`);
      setImportModal(prev => ({ ...prev, uploading: false, open: false, step: 1 }));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Step 2: Confirm Roster Import
  const handleConfirmImport = async () => {
    if (!importModal.previewData) return;

    setImportModal(prev => ({ ...prev, confirming: true }));
    try {
      const payload = {
        batchId: importModal.previewData.batchId || 'batch-session',
        fileName: importModal.fileName,
        rows: importModal.previewData.validRows || [],
        validNew: importModal.previewData.validNew || [],
        validUpdated: importModal.previewData.validUpdated || [],
        unchanged: importModal.previewData.unchanged || [],
        invalid: importModal.previewData.invalidRows || importModal.previewData.invalid || [],
        conflicts: importModal.previewData.conflicts || [],
        missingRecords: importModal.previewData.missingRecords || [],
        deactivationPolicy: importModal.deactivationPolicy,
      };

      const result = await adminApi.confirmRosterImport(payload);
      setImportModal(prev => ({
        ...prev,
        step: 3,
        confirming: false,
        resultSummary: result.summary,
      }));
      showToast('success', 'Student roster synchronized successfully.');
      fetchRoster();
    } catch (err) {
      showToast('error', `Import execution failed: ${err.message}`);
      setImportModal(prev => ({ ...prev, confirming: false }));
    }
  };

  // Open Import History Modal
  const handleOpenHistory = async () => {
    setHistoryModal({ open: true, loading: true, imports: [] });
    try {
      const res = await adminApi.getRosterImportHistory();
      setHistoryModal({ open: true, loading: false, imports: res.data || [] });
    } catch (err) {
      showToast('error', `Failed to load import history: ${err.message}`);
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Toggle student eligibility
  const handleToggleEligibility = async (student) => {
    const isCurrentlyActive = student.is_active && (student.enrollment_status === 'active' || !student.enrollment_status);
    const newActive = !isCurrentlyActive;
    const newStatus = newActive ? 'active' : 'inactive';
    try {
      await adminApi.updateStudentEligibility(student.id, { 
        is_active: newActive,
        enrollment_status: newStatus,
      });
      showToast('success', `${student.student_name} (${student.student_id_number || student.student_id || student.college_email}) marked as ${newActive ? 'Active' : 'Inactive'}.`);
      setRoster(prev => prev.map(s => s.id === student.id ? { ...s, is_active: newActive, enrollment_status: newStatus } : s));
    } catch (err) {
      showToast('error', `Failed to update status: ${err.message}`);
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

      {/* Hidden file input for roster upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx, .xls, .csv"
        onChange={handleFileChange}
      />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={24} style={{ color: 'var(--kc-accent)' }} />
            Student Roster & Eligibility
          </h1>
          <p className="admin-page-description">
            Organization student registry. Import institution rosters via .xlsx or .csv, verify eligibility, and control assessment authorization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleDownloadTemplate}
            title="Download formatted .xlsx roster template"
          >
            <Download size={15} />
            Download Template
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleOpenHistory}
            title="View sync logs & history"
          >
            <History size={15} />
            Import History
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} />
            Import Roster (.xlsx / .csv)
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Enrolled Students</div>
          <div className="admin-stat-value">{meta.total || 0}</div>
          <div className="admin-stat-sub">Official institutional roster</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Eligible / Active</div>
          <div className="admin-stat-value" style={{ color: '#4ade80' }}>
            {meta.activeCount !== undefined ? meta.activeCount : roster.filter(s => s.is_active && (s.enrollment_status === 'active' || !s.enrollment_status)).length}
          </div>
          <div className="admin-stat-sub">Permitted to take assigned assessments</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Registered Accounts</div>
          <div className="admin-stat-value" style={{ color: 'var(--kc-accent)' }}>
            {meta.registeredCount !== undefined ? meta.registeredCount : roster.filter(s => s.user_id || s.matched_user_id || s.has_account || s.user_account_id).length}
          </div>
          <div className="admin-stat-sub">Synced with authenticated user profile</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div className="admin-search-wrap" style={{ flex: 2, minWidth: '220px' }}>
          <Search className="admin-search-icon" size={15} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by student ID, name, or institutional email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <select
          className="admin-select"
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setPage(0);
          }}
          style={{ minWidth: '160px' }}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          className="admin-select"
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(0);
          }}
          style={{ minWidth: '150px' }}
        >
          <option value="">All Academic Years</option>
          {academicYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          style={{ minWidth: '140px' }}
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Roster Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>College Email</th>
              <th>Department</th>
              <th>Year</th>
              <th>Account Sync</th>
              <th>Eligibility</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !roster.length ? (
              <tr>
                <td colSpan="8">
                  <div className="admin-loading">
                    <div className="admin-spinner"></div>
                    Loading student roster...
                  </div>
                </td>
              </tr>
            ) : roster.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="admin-empty">
                    <div className="admin-empty-icon">
                      <GraduationCap size={24} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="admin-empty-text">No students in roster</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Upload an .xlsx or .csv roster spreadsheet to enroll students.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              roster.map(student => {
                const isStudentActive = student.is_active && (student.enrollment_status === 'active' || !student.enrollment_status);
                const hasAccount = Boolean(student.user_id || student.matched_user_id || student.has_account || student.user_account_id);
                const studentIdDisplay = student.student_id_number || student.student_id || '—';
                const statusLabel = student.enrollment_status === 'suspended' ? 'Suspended' :
                                    student.enrollment_status === 'graduated' ? 'Graduated' :
                                    isStudentActive ? 'Eligible' : 'Deactivated';
                const badgeClass = isStudentActive ? 'badge-active' :
                                   student.enrollment_status === 'suspended' ? 'badge-suspended' : 'badge-inactive';

                return (
                  <tr key={student.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--kc-accent)' }}>
                      {studentIdDisplay}
                    </td>
                    <td className="title-cell">
                      <div style={{ fontWeight: 600 }}>{student.student_name}</div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {student.college_email}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {student.department || '—'}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {student.academic_year || '—'}
                    </td>
                    <td>
                      {hasAccount ? (
                        <span className="admin-badge badge-active" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={12} />
                          Mapped
                        </span>
                      ) : (
                        <span className="admin-badge" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          Unregistered
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-btn admin-btn-sm ${isStudentActive ? 'admin-btn-warning' : 'admin-btn-success'}`}
                        onClick={() => handleToggleEligibility(student)}
                        title={isStudentActive ? 'Revoke assessment eligibility' : 'Restore assessment eligibility'}
                      >
                        {isStudentActive ? <UserX size={13} /> : <UserCheck size={13} />}
                        {isStudentActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })
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

      {/* Modal: Roster Import Wizard (Preview & Validation) */}
      {importModal.open && (
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
              maxWidth: '750px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--kc-text-primary)' }}>
                  {importModal.step === 2 ? 'Roster Validation & Preview' : 'Import Confirmation'}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  File: <strong>{importModal.fileName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 2: Preview & Validation results */}
            {importModal.step === 2 && (
              <div>
                {importModal.uploading ? (
                  <div className="admin-loading" style={{ padding: '40px 0' }}>
                    <div className="admin-spinner"></div>
                    Parsing workbook and validating records...
                  </div>
                ) : (
                  <div>
                    {/* Validation breakdown cards */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '10px',
                        marginBottom: '16px',
                      }}
                    >
                      <div className="admin-stat-card" style={{ padding: '12px' }}>
                        <div className="admin-stat-label">Total Rows</div>
                        <div className="admin-stat-value" style={{ fontSize: '20px' }}>
                          {importModal.previewData?.summary?.totalRows ?? 0}
                        </div>
                      </div>
                      <div className="admin-stat-card" style={{ padding: '12px' }}>
                        <div className="admin-stat-label">New Students</div>
                        <div className="admin-stat-value" style={{ fontSize: '20px', color: '#4ade80' }}>
                          {importModal.previewData?.summary?.newRecords ?? 0}
                        </div>
                      </div>
                      <div className="admin-stat-card" style={{ padding: '12px' }}>
                        <div className="admin-stat-label">Updated</div>
                        <div className="admin-stat-value" style={{ fontSize: '20px', color: 'var(--kc-accent)' }}>
                          {importModal.previewData?.summary?.updatedRecords ?? 0}
                        </div>
                      </div>
                      <div className="admin-stat-card" style={{ padding: '12px' }}>
                        <div className="admin-stat-label">Unchanged</div>
                        <div className="admin-stat-value" style={{ fontSize: '20px', color: 'var(--text-muted)' }}>
                          {importModal.previewData?.summary?.unchangedRecords ?? 0}
                        </div>
                      </div>
                      <div className="admin-stat-card" style={{ padding: '12px' }}>
                        <div className="admin-stat-label">Invalid / Errors</div>
                        <div className="admin-stat-value" style={{ fontSize: '20px', color: '#f87171' }}>
                          {importModal.previewData?.summary?.invalidRecords ?? 0}
                        </div>
                      </div>
                    </div>

                    {/* Invalid Rows Warning & Details */}
                    {importModal.previewData?.invalidRows?.length > 0 && (
                      <div
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          marginBottom: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                          <AlertTriangle size={16} />
                          {importModal.previewData.invalidRows.length} invalid rows detected (will be skipped)
                        </div>
                        <div style={{ marginTop: '8px', maxHeight: '120px', overflowY: 'auto', fontSize: '12px' }}>
                          {importModal.previewData.invalidRows.map((err, idx) => (
                            <div key={idx} style={{ color: 'var(--kc-text-secondary)', marginBottom: '4px' }}>
                              <strong>Row {err.rowNumber}</strong> ({err.studentId || 'No ID'}): {err.errors?.join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview Table of Sample Valid Rows */}
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                        Sample Valid Records Preview ({importModal.previewData?.validRows?.length ?? 0} ready to import)
                      </h3>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--kc-border)', borderRadius: '6px' }}>
                        <table className="admin-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Dept</th>
                              <th>Year</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importModal.previewData?.validRows?.slice(0, 15).map((row, idx) => (
                              <tr key={idx}>
                                <td style={{ fontFamily: 'monospace' }}>{row.studentId}</td>
                                <td>{row.studentName}</td>
                                <td>{row.collegeEmail}</td>
                                <td>{row.department || '—'}</td>
                                <td>{row.academicYear || '—'}</td>
                                <td>
                                  <span
                                    className="admin-badge"
                                    style={{
                                      fontSize: '10px',
                                      background: row.previewStatus === 'new' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                      color: row.previewStatus === 'new' ? '#4ade80' : 'var(--kc-accent)',
                                    }}
                                  >
                                    {row.previewStatus === 'new' ? 'New' : 'Update'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Deactivation Policy Selection */}
                    <div
                      style={{
                        backgroundColor: 'var(--kc-surface-subtle)',
                        border: '1px solid var(--kc-border)',
                        borderRadius: '8px',
                        padding: '14px',
                        marginBottom: '20px',
                      }}
                    >
                      <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={15} style={{ color: 'var(--kc-accent)' }} />
                        Missing Students Policy
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        Choose how to handle existing active students not listed in this new roster:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="deactivationPolicy"
                            value="mark_inactive"
                            checked={importModal.deactivationPolicy === 'mark_inactive'}
                            onChange={(e) => setImportModal(prev => ({ ...prev, deactivationPolicy: e.target.value }))}
                          />
                          <span>
                            <strong>Deactivate missing students</strong> (recommended for authoritative term rosters; past attempts and accounts are safely preserved)
                          </span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="deactivationPolicy"
                            value="ignore"
                            checked={importModal.deactivationPolicy === 'ignore'}
                            onChange={(e) => setImportModal(prev => ({ ...prev, deactivationPolicy: e.target.value }))}
                          />
                          <span>
                            <strong>Keep missing students active</strong> (append or update only)
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        onClick={() => setImportModal(prev => ({ ...prev, open: false }))}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        onClick={handleConfirmImport}
                        disabled={importModal.confirming || !importModal.previewData?.validRows?.length}
                      >
                        {importModal.confirming ? 'Applying Changes…' : `Confirm & Apply (${importModal.previewData?.validRows?.length || 0} Records)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Success Summary */}
            {importModal.step === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(74, 222, 128, 0.15)',
                    color: '#4ade80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <CheckCircle size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                  Roster Import Applied Successfully!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  Student eligibility and roster records have been updated in PostgreSQL.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '10px',
                    maxWidth: '500px',
                    margin: '0 auto 24px',
                  }}
                >
                  <div className="admin-stat-card" style={{ padding: '10px' }}>
                    <div className="admin-stat-label">Created</div>
                    <div className="admin-stat-value" style={{ fontSize: '18px', color: '#4ade80' }}>
                      {importModal.resultSummary?.created ?? 0}
                    </div>
                  </div>
                  <div className="admin-stat-card" style={{ padding: '10px' }}>
                    <div className="admin-stat-label">Updated</div>
                    <div className="admin-stat-value" style={{ fontSize: '18px', color: 'var(--kc-accent)' }}>
                      {importModal.resultSummary?.updated ?? 0}
                    </div>
                  </div>
                  <div className="admin-stat-card" style={{ padding: '10px' }}>
                    <div className="admin-stat-label">Unchanged</div>
                    <div className="admin-stat-value" style={{ fontSize: '18px' }}>
                      {importModal.resultSummary?.unchanged ?? 0}
                    </div>
                  </div>
                  <div className="admin-stat-card" style={{ padding: '10px' }}>
                    <div className="admin-stat-label">Deactivated</div>
                    <div className="admin-stat-value" style={{ fontSize: '18px', color: '#f87171' }}>
                      {importModal.resultSummary?.deactivated ?? 0}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => setImportModal(prev => ({ ...prev, open: false }))}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Import History */}
      {historyModal.open && (
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
              maxWidth: '850px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--kc-text-primary)' }}>
                  Roster Import & Sync History
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Audit log of spreadsheet roster uploads and eligibility synchronizations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {historyModal.loading ? (
              <div className="admin-loading" style={{ padding: '30px' }}>
                <div className="admin-spinner"></div>
                Loading synchronization history...
              </div>
            ) : historyModal.imports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No past roster imports recorded.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>File Name</th>
                      <th>Admin</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Deactivated</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyModal.imports.map(item => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--text-muted)' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.file_name}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.created_by_username || item.created_by_email || 'Admin'}
                        </td>
                        <td>
                          <span className={`admin-badge ${item.status === 'completed' ? 'badge-active' : 'badge-suspended'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ color: '#4ade80' }}>+{item.records_created}</td>
                        <td style={{ color: 'var(--kc-accent)' }}>~{item.records_updated}</td>
                        <td style={{ color: '#f87171' }}>-{item.records_deactivated}</td>
                        <td>
                          {item.records_rejected > 0 ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-btn-sm"
                              style={{ color: '#f87171', fontSize: '11px' }}
                              onClick={() => downloadAdminFile(`/roster/history/${item.id}/errors`, `import_errors_${item.id}.xlsx`)}
                              title="Download spreadsheet of invalid rows"
                            >
                              <Download size={12} />
                              {item.records_rejected} Errors
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => setHistoryModal(prev => ({ ...prev, open: false }))}
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
