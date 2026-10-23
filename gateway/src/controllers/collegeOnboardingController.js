// gateway/src/controllers/collegeOnboardingController.js
// ─────────────────────────────────────────────────────────────────────────────
// College Onboarding & Super Admin Verification Controller
// ─────────────────────────────────────────────────────────────────────────────

const collegeOnboardingService = require('../services/collegeOnboardingService');
const logger = require('../utils/logger');
const { isSuperAdmin } = require('../middleware/rbac');

function checkSuperAdmin(req, res) {
  if (!req.user || !isSuperAdmin(req.user)) {
    res.status(403).json({ success: false, error: 'Super admin privileges required' });
    return false;
  }
  return true;
}

/**
 * Public endpoint: Prospective college admin registers their institution.
 */
exports.registerCollege = async (req, res, next) => {
  try {
    const body = req.body || {};
    const collegeName = body.collegeName || body.college_name;
    const institutionType = body.institutionType || body.institution_type;
    const website = body.website || body.official_website;
    const domain = body.domain || body.official_email_domain;
    const address = body.address;
    const city = body.city;
    const state = body.state;
    const country = body.country;
    const contactEmail = body.contactEmail || body.contact_email;
    const contactPhone = body.contactPhone || body.contact_phone;
    const applicantName = body.applicantName || body.applicant_name;
    const applicantUsername = body.applicantUsername || body.username || body.applicant_username;
    const applicantEmail = body.applicantEmail || body.applicant_email;
    const applicantDesignation = body.applicantDesignation || body.designation;
    const applicantPhone = body.applicantPhone || body.applicant_phone;
    const password = body.password;
    const confirmPassword = body.confirmPassword || body.confirm_password;
    const verificationInfo = body.verificationInfo || body.verification_info;

    const result = await collegeOnboardingService.submitApplication({
      collegeName,
      institutionType,
      website,
      domain,
      address,
      city,
      state,
      country,
      contactEmail,
      contactPhone,
      applicantName,
      applicantUsername,
      applicantEmail,
      applicantDesignation,
      applicantPhone,
      password,
      confirmPassword,
      verificationInfo,
    });

    res.status(201).json(result);
  } catch (err) {
    logger.error({ err }, '[CollegeOnboarding] registerCollege failed');
    if (res.headersSent) return next(err);
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

/**
 * Public endpoint: Verify applicant's email address using token.
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const token = req.query?.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }
    const application = await collegeOnboardingService.verifyApplicantEmail(token);
    res.status(200).json({
      success: true,
      message: 'Email successfully verified. Your application remains pending Super Admin review.',
      application,
    });
  } catch (err) {
    logger.error({ err }, '[CollegeOnboarding] verifyEmail failed');
    if (res.headersSent) return next(err);
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

/**
 * Super Admin endpoint: List college registration applications.
 */
exports.getApplications = async (req, res, next) => {
  if (!checkSuperAdmin(req, res)) return;
  try {
    const { status, search, startDate, endDate, limit, offset } = req.query || {};
    const data = await collegeOnboardingService.getApplications({
      status,
      search,
      startDate,
      endDate,
      limit,
      offset,
    });
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    logger.error({ err }, '[CollegeOnboarding] getApplications failed');
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

/**
 * Super Admin endpoint: Get single application details.
 */
exports.getApplication = async (req, res, next) => {
  if (!checkSuperAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const application = await collegeOnboardingService.getApplicationById(id);
    res.status(200).json({ success: true, application });
  } catch (err) {
    logger.error({ err }, '[CollegeOnboarding] getApplication failed');
    if (res.headersSent) return next(err);
    res.status(err.status || 404).json({ success: false, error: err.message });
  }
};

/**
 * Super Admin endpoint: Approve college application.
 */
exports.approveApplication = async (req, res, next) => {
  if (!checkSuperAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const result = await collegeOnboardingService.approveApplication(id, req.user, req.ip);
    res.status(200).json(result);
  } catch (err) {
    logger.error({ err }, '[CollegeOnboarding] approveApplication failed');
    if (res.headersSent) return next(err);
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

/**
 * Super Admin endpoint: Reject college application.
 */
exports.rejectApplication = async (req, res, next) => {
  if (!checkSuperAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await collegeOnboardingService.rejectApplication(id, reason, req.user, req.ip);
    res.status(200).json(result);
  } catch (err) {
    logger.error({ err }, '[CollegeOnboarding] rejectApplication failed');
    if (res.headersSent) return next(err);
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};
