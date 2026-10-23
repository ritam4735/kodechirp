'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Globe,
  Mail,
  Phone,
  MapPin,
  Lock,
  User,
  Briefcase,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export default function RegisterCollegePage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    collegeName: '',
    institutionType: 'University',
    website: '',
    domain: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    contactEmail: '',
    contactPhone: '',
    applicantName: '',
    applicantUsername: '',
    applicantEmail: '',
    applicantDesignation: '',
    applicantPhone: '',
    password: '',
    confirmPassword: '',
    accreditationId: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!formData.collegeName.trim()) {
      setError('Please provide the official college or institution name.');
      return;
    }
    if (!formData.contactEmail.trim()) {
      setError('Official institutional contact email is required.');
      return;
    }
    if (!formData.applicantName.trim()) {
      setError('Applicant administrator full name is required.');
      return;
    }
    if (!formData.applicantUsername.trim()) {
      setError('Please specify a username for the administrator account.');
      return;
    }
    const cleanUsername = formData.applicantUsername.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      setError('Administrator username must be between 3 and 50 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, underscores, and hyphens.');
      return;
    }
    if (!formData.applicantEmail.trim()) {
      setError('Applicant administrator official email is required.');
      return;
    }
    if (!formData.applicantDesignation.trim()) {
      setError('Your designation at the institution is required.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerCollege({
        collegeName: formData.collegeName,
        institutionType: formData.institutionType,
        website: formData.website || undefined,
        domain: formData.domain || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        applicantName: formData.applicantName,
        applicantUsername: cleanUsername,
        applicantEmail: formData.applicantEmail,
        applicantDesignation: formData.applicantDesignation,
        applicantPhone: formData.applicantPhone || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        verificationInfo: {
          accreditationId: formData.accreditationId || null,
          notes: formData.notes || null,
        },
      });

      setSubmittedData({
        collegeName: formData.collegeName,
        applicantEmail: formData.applicantEmail,
        applicantUsername: cleanUsername,
        applicantName: formData.applicantName,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit college registration.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Application Submitted Successfully
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Thank you, <span className="font-semibold text-[var(--text-primary)]">{submittedData?.applicantName}</span>. Your onboarding application for <span className="font-semibold text-[var(--text-primary)]">{submittedData?.collegeName}</span> is now awaiting verification.
            </p>
          </div>

          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-xl p-4 text-left text-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-500 font-semibold">
              <ShieldCheck size={16} />
              <span>Status: PENDING SUPER ADMIN VERIFICATION</span>
            </div>
            <p className="text-[var(--text-muted)] leading-relaxed">
              To preserve academic integrity and institutional tenant security, all college administrator accounts are verified by our platform administrators prior to granting privileged access.
            </p>
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-default)] space-y-1">
              <div className="text-[var(--text-secondary)] font-semibold text-xs">Your Login Identity (Once Approved):</div>
              <div className="text-xs">• Username: <span className="font-mono text-[var(--kc-accent)] font-bold">@{submittedData?.applicantUsername}</span></div>
              <div className="text-xs">• Email: <span className="font-mono text-[var(--text-primary)]">{submittedData?.applicantEmail}</span></div>
            </div>
            <p className="text-[var(--text-muted)]">
              We have sent a verification confirmation to <span className="text-[var(--kc-accent)] font-mono">{submittedData?.applicantEmail}</span>. Once verified and approved, you can log in directly with your chosen username or email.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-semibold hover:bg-[var(--border-default)] transition-colors"
            >
              Return to Homepage
            </Link>
            <Link
              href="/auth"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--kc-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--kc-accent)]/10 text-[var(--kc-accent)] border border-[var(--kc-accent)]/20">
            <GraduationCap size={14} />
            Institutional Onboarding
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight sm:text-4xl">
            Register Your College
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-xl mx-auto">
            Empower your students with automated coding assessments, aptitude test generation, cohort analytics, and private campus placement drives.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-500 flex items-start gap-3 text-sm">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Submission Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: College / Institution Details */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-default)]">
              <div className="p-2.5 rounded-xl bg-[var(--kc-accent)]/10 text-[var(--kc-accent)]">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  1. College & Institution Profile
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Official information regarding your academic institution.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Official Institution Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  placeholder="e.g. National Institute of Technology, Trichy"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Institution Type <span className="text-rose-500">*</span>
                </label>
                <select
                  name="institutionType"
                  value={formData.institutionType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                >
                  <option value="University">University</option>
                  <option value="Autonomous Engineering College">Autonomous Engineering College</option>
                  <option value="Affiliated Engineering College">Affiliated Engineering College</option>
                  <option value="Technical Institute">Technical Institute</option>
                  <option value="Polytechnic / Diploma College">Polytechnic / Diploma College</option>
                  <option value="Other">Other Higher Education Institution</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Official Website
                </label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://www.college.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Institution Email Domain
                </label>
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  placeholder="e.g. nitt.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Official Contact Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="contact@college.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Campus Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Campus address, street, landmark"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Tiruchirappalli"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">State / Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Tamil Nadu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Applicant Administrator Account */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-default)]">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                <User size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  2. Administrator Identity & Credentials
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  The primary college administrator account to manage student rosters and assessments once approved.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Administrator Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="applicantName"
                  value={formData.applicantName}
                  onChange={handleChange}
                  placeholder="Prof. Ramesh Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Administrator Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="applicantUsername"
                    value={formData.applicantUsername}
                    onChange={handleChange}
                    placeholder="e.g. prof_ramesh or nitt_dean"
                    autoComplete="username"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                    required
                  />
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Used with your password to log in once your institution is approved.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Designation / Role at Institution <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    name="applicantDesignation"
                    value={formData.applicantDesignation}
                    onChange={handleChange}
                    placeholder="Head of Placements / Dean / HOD"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Official Institutional Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    name="applicantEmail"
                    value={formData.applicantEmail}
                    onChange={handleChange}
                    placeholder="ramesh@nitt.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    name="applicantPhone"
                    value={formData.applicantPhone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Verification Information */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-default)]">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  3. Verification & Accreditation Details
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Information to expedite the Super Admin verification and authorization workflow.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Accreditation / Affiliation ID (e.g. AICTE, UGC, NAAC, NBA)
                </label>
                <input
                  type="text"
                  name="accreditationId"
                  value={formData.accreditationId}
                  onChange={handleChange}
                  placeholder="e.g. AICTE-1-12345678 / UGC Code"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Additional Verification Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Provide any institutional website profile links, faculty directory URLs, or additional verification details."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--kc-accent)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-[var(--text-muted)] text-center sm:text-left">
              Already have an account?{' '}
              <Link href="/auth" className="text-[var(--kc-accent)] font-semibold hover:underline">
                Sign In here
              </Link>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--kc-accent)] text-white text-sm font-bold shadow-lg hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <span>Submit College Application</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
