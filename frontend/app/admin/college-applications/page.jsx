'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../../lib/adminApi';
import { useAuth } from '../../../hooks/useAuth';
import {
  Building2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  User,
  Briefcase,
  FileText,
} from 'lucide-react';

export default function CollegeApplicationsPage() {
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ pending_count: 0, approved_count: 0, rejected_count: 0, total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'all'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Modals
  const [selectedApp, setSelectedApp] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getCollegeApplications({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search.trim() || undefined,
        limit: 50,
        offset: page * 50,
      });
      setApplications(res.applications || []);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      setError(err.message || 'Failed to load college applications');
      showToast('error', err.message || 'Failed to load college applications');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleOpenDetail = (app) => {
    setSelectedApp(app);
    setIsDetailModalOpen(true);
  };

  const handleOpenApprove = (app) => {
    setSelectedApp(app);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedApp) return;
    try {
      setApproving(true);
      await adminApi.approveCollegeApplication(selectedApp.id);
      showToast('success', `Application for "${selectedApp.college_name}" has been APPROVED. Institution provisioned.`);
      setIsApproveModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      showToast('error', err.message || 'Failed to approve application');
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReject = (app) => {
    setSelectedApp(app);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedApp) return;
    if (!rejectionReason.trim()) {
      showToast('error', 'A rejection reason is required to notify the applicant.');
      return;
    }
    try {
      setRejecting(true);
      await adminApi.rejectCollegeApplication(selectedApp.id, rejectionReason.trim());
      showToast('success', `Application for "${selectedApp.college_name}" has been REJECTED.`);
      setIsRejectModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      showToast('error', err.message || 'Failed to reject application');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-default)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--kc-accent)]/10 text-[var(--kc-accent)] border border-[var(--kc-accent)]/20 mb-2">
            <ShieldCheck size={14} />
            Platform Verification Queue
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            College Onboarding Applications
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review, verify, and approve public college onboarding applications to establish institutional tenant domains and college administrator accounts.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/40'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-amber-500 text-xs font-bold uppercase">
            <span>Pending Review</span>
            <Clock size={16} />
          </div>
          <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {stats.pending_count}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/40'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-500 text-xs font-bold uppercase">
            <span>Approved</span>
            <CheckCircle2 size={16} />
          </div>
          <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {stats.approved_count}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/40'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-rose-500 text-xs font-bold uppercase">
            <span>Rejected</span>
            <XCircle size={16} />
          </div>
          <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {stats.rejected_count}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'bg-[var(--kc-accent)]/10 border-[var(--kc-accent)]/40 ring-1 ring-[var(--kc-accent)]/40'
              : 'bg-[var(--bg-secondary)] border-[var(--border-default)] hover:border-[var(--kc-accent)]/30'
          }`}
        >
          <div className="flex items-center justify-between text-[var(--kc-accent)] text-xs font-bold uppercase">
            <span>All Submissions</span>
            <Building2 size={16} />
          </div>
          <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-2">
            {stats.total_count}
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by college name, applicant email, domain..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-[var(--text-muted)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
          >
            <option value="PENDING">Pending Review Only</option>
            <option value="APPROVED">Approved Institutions</option>
            <option value="REJECTED">Rejected Submissions</option>
            <option value="all">All Applications</option>
          </select>
        </div>
      </div>

      {/* Applications Table / Cards */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-[var(--text-muted)] text-sm">
            <div className="w-8 h-8 border-2 border-[var(--kc-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Loading college applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-2">
            <ShieldCheck size={36} className="mx-auto text-[var(--text-muted)] opacity-50" />
            <p className="text-base font-semibold text-[var(--text-primary)]">No Applications Found</p>
            <p className="text-xs">
              {statusFilter === 'PENDING'
                ? 'All college onboarding applications have been reviewed. Queue is clean!'
                : 'No applications match the current search or status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-default)] text-[var(--text-muted)] uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">College & Institution</th>
                  <th className="px-5 py-3">Applicant Administrator</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Submission Date</th>
                  <th className="px-5 py-3">Decision Metadata</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {applications.map((app) => {
                  const statusColors = {
                    PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                    APPROVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                    REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                  };

                  return (
                    <tr key={app.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="px-5 py-4 space-y-1">
                        <div className="font-bold text-sm text-[var(--text-primary)]">
                          {app.college_name}
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                          <span className="capitalize">{app.institution_type}</span>
                          {app.domain && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-[var(--kc-accent)]">@{app.domain}</span>
                            </>
                          )}
                          {app.city && (
                            <>
                              <span>•</span>
                              <span>{app.city}, {app.state}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 space-y-1">
                        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
                          <span>{app.applicant_name}</span>
                          {app.applicant_username && (
                            <span className="text-[11px] font-mono text-[var(--kc-accent)] bg-[var(--kc-accent)]/10 px-1.5 py-0.5 rounded border border-[var(--kc-accent)]/20">
                              @{app.applicant_username}
                            </span>
                          )}
                        </div>
                        <div className="text-[var(--text-muted)]">{app.applicant_designation}</div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">{app.applicant_email}</div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusColors[app.status] || ''}`}>
                          {app.status === 'PENDING' && <Clock size={12} />}
                          {app.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {app.status === 'REJECTED' && <XCircle size={12} />}
                          <span>{app.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(app.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-4 text-[var(--text-muted)]">
                        {app.status === 'APPROVED' && (
                          <div className="space-y-0.5">
                            <span className="text-emerald-500 font-semibold">Approved</span>
                            {app.reviewer_display_name && (
                              <div className="text-[11px]">by {app.reviewer_display_name}</div>
                            )}
                            {app.organization_code && (
                              <div className="text-[11px] font-mono text-[var(--kc-accent)]">Code: {app.organization_code}</div>
                            )}
                          </div>
                        )}
                        {app.status === 'REJECTED' && (
                          <div className="space-y-0.5 max-w-xs">
                            <span className="text-rose-500 font-semibold">Rejected</span>
                            {app.rejection_reason && (
                              <div className="text-[11px] text-[var(--text-muted)] truncate" title={app.rejection_reason}>
                                "{app.rejection_reason}"
                              </div>
                            )}
                          </div>
                        )}
                        {app.status === 'PENDING' && (
                          <span className="text-amber-500 font-medium">Awaiting Action</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(app)}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-default)] text-[var(--text-primary)] transition-colors inline-flex items-center gap-1"
                          title="View Application Details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleOpenApprove(app)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors inline-flex items-center gap-1"
                              title="Approve College and Provision Admin Account"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleOpenReject(app)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors inline-flex items-center gap-1"
                              title="Reject Application"
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Application Verification Details
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Submitted on {new Date(selectedApp.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Institution Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-[var(--kc-accent)]" />
                <span>Institution Information</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-default)]">
                <div>
                  <span className="text-[var(--text-muted)] block">College Name:</span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">{selectedApp.college_name}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Type:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedApp.institution_type}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Official Email:</span>
                  <span className="font-mono text-[var(--text-primary)]">{selectedApp.contact_email}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Website:</span>
                  {selectedApp.website ? (
                    <a href={selectedApp.website} target="_blank" rel="noreferrer" className="text-[var(--kc-accent)] underline">
                      {selectedApp.website}
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)]">Not provided</span>
                  )}
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Domain:</span>
                  <span className="font-mono text-[var(--kc-accent)]">{selectedApp.domain || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Location:</span>
                  <span>{selectedApp.city || 'N/A'}, {selectedApp.state || 'N/A'}, {selectedApp.country}</span>
                </div>
                {selectedApp.address && (
                  <div className="col-span-2">
                    <span className="text-[var(--text-muted)] block">Address:</span>
                    <span>{selectedApp.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Applicant Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <User size={14} className="text-purple-500" />
                <span>Administrator Candidate</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-default)]">
                <div>
                  <span className="text-[var(--text-muted)] block">Applicant Name:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedApp.applicant_name}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Login Username:</span>
                  <span className="font-mono font-bold text-[var(--kc-accent)]">
                    {selectedApp.applicant_username ? `@${selectedApp.applicant_username}` : 'Auto-generated'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Designation:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedApp.applicant_designation}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Institutional Email:</span>
                  <span className="font-mono text-[var(--text-primary)]">{selectedApp.applicant_email}</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Phone Number:</span>
                  <span>{selectedApp.applicant_phone || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Accreditation / Verification Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-amber-500" />
                <span>Accreditation & Supporting Information</span>
              </h4>
              <div className="text-xs bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border-default)] space-y-2">
                <div>
                  <span className="text-[var(--text-muted)] block">Accreditation ID:</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {selectedApp.verification_info?.accreditationId || 'Not provided'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Supporting Notes:</span>
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                    {selectedApp.verification_info?.notes || 'No extra notes provided.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Review Metadata */}
            {selectedApp.status !== 'PENDING' && (
              <div className="p-4 rounded-xl border text-xs space-y-1 bg-[var(--bg-tertiary)] border-[var(--border-default)]">
                <div className="font-bold text-sm">
                  Review Decision: <span className={selectedApp.status === 'APPROVED' ? 'text-emerald-500' : 'text-rose-500'}>{selectedApp.status}</span>
                </div>
                <div>Reviewed by: {selectedApp.reviewer_display_name || selectedApp.reviewer_username || 'Super Admin'}</div>
                <div>Date: {selectedApp.reviewed_at ? new Date(selectedApp.reviewed_at).toLocaleString() : 'N/A'}</div>
                {selectedApp.rejection_reason && (
                  <div className="mt-2 text-rose-500">
                    <span className="font-semibold">Recorded Rejection Reason:</span>
                    <p className="text-[var(--text-muted)] mt-0.5 font-normal">"{selectedApp.rejection_reason}"</p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)]">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-xs font-semibold hover:bg-[var(--border-default)] transition-colors"
              >
                Close
              </button>

              {selectedApp.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenReject(selectedApp);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                  >
                    Reject Application
                  </button>

                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenApprove(selectedApp);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    Approve & Provision College
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVE CONFIRMATION MODAL */}
      {isApproveModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-500">
              <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Confirm Approval
              </h3>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Are you sure you want to approve the application for <strong className="text-[var(--text-primary)]">{selectedApp.college_name}</strong>?
            </p>

            <div className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl p-3 text-xs space-y-1.5 text-[var(--text-muted)]">
              <div>• An Organization record will be created for <strong>{selectedApp.college_name}</strong>.</div>
              <div>• Account <strong>@{selectedApp.applicant_username || 'admin'}</strong> (<strong>{selectedApp.applicant_email}</strong>) will be provisioned with <strong>college_admin</strong> role.</div>
              <div>• An approval notification email with login instructions will be sent to <strong>{selectedApp.applicant_email}</strong>.</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                disabled={approving}
                className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-xs font-semibold hover:bg-[var(--border-default)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={approving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approving ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {isRejectModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <XCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Reject College Application
              </h3>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Record a mandatory rejection reason for <strong className="text-[var(--text-primary)]">{selectedApp.college_name}</strong>. This feedback will be recorded in the audit trail and emailed to the applicant.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Institutional domain could not be verified; accreditation document mismatch."
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-rose-500 resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-default)]">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                disabled={rejecting}
                className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-xs font-semibold hover:bg-[var(--border-default)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
