// gateway/src/services/collegeOnboardingService.js
// ─────────────────────────────────────────────────────────────────────────────
// College Onboarding & Verification Service
// Handles Public College Self-Registration, Approval Lifecycle, and Tenant Provisioning
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');
const { ROLES } = require('../utils/constants');
const { logAdminAction } = require('../middleware/rbac');
const emailService = require('./emailService');

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function generateCode(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
  }
  return (name || 'ORG').substring(0, 4).toUpperCase();
}

/**
 * Validate applicant password policy:
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 digit.
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasUpper && hasLower && hasDigit;
}

/**
 * Validate email format.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/**
 * Submit a public college registration application (status: PENDING).
 * Never grants administrative or super admin privileges directly.
 */
async function submitApplication({
  collegeName,
  institutionType = 'University',
  website,
  domain,
  address,
  city,
  state,
  country = 'India',
  contactEmail,
  contactPhone,
  applicantName,
  applicantUsername,
  applicantEmail,
  applicantDesignation,
  applicantPhone,
  password,
  confirmPassword,
  verificationInfo = {},
}) {
  // Input validations
  if (!collegeName || !collegeName.trim()) {
    const err = new Error('Official college name is required');
    err.status = 400;
    throw err;
  }

  if (!contactEmail || !isValidEmail(contactEmail)) {
    const err = new Error('A valid official college contact email is required');
    err.status = 400;
    throw err;
  }

  if (!applicantName || !applicantName.trim()) {
    const err = new Error('Applicant full name is required');
    err.status = 400;
    throw err;
  }

  if (!applicantEmail || !isValidEmail(applicantEmail)) {
    const err = new Error('A valid applicant institutional email is required');
    err.status = 400;
    throw err;
  }

  if (!applicantDesignation || !applicantDesignation.trim()) {
    const err = new Error('Applicant designation / role at the institution is required');
    err.status = 400;
    throw err;
  }

  if (!password || !validatePassword(password)) {
    const err = new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
    err.status = 400;
    throw err;
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    const err = new Error('Password and password confirmation do not match');
    err.status = 400;
    throw err;
  }

  const cleanCollegeName = collegeName.trim();
  const cleanApplicantEmail = applicantEmail.trim().toLowerCase();
  const cleanContactEmail = contactEmail.trim().toLowerCase();

  // Validate or generate username
  let cleanUsername = null;
  if (applicantUsername && applicantUsername.trim()) {
    cleanUsername = applicantUsername.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      const err = new Error('Administrator username must be between 3 and 50 characters');
      err.status = 400;
      throw err;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      const err = new Error('Administrator username can only contain letters, numbers, underscores, and hyphens');
      err.status = 400;
      throw err;
    }
  } else {
    cleanUsername = slugify(applicantName) || cleanApplicantEmail.split('@')[0];
  }
  
  // Extract or clean domain
  let cleanDomain = domain ? domain.trim().toLowerCase() : null;
  if (!cleanDomain && cleanApplicantEmail.includes('@')) {
    const parts = cleanApplicantEmail.split('@');
    cleanDomain = parts[1] || null;
  }

  // Security Check 1: Prevent applicants from associating themselves with an already approved college without authorization
  const collegeSlug = slugify(cleanCollegeName);
  const existingOrg = await db.query(
    `SELECT id, name, slug FROM organizations 
     WHERE slug = $1 OR (domain IS NOT NULL AND domain = $2)
     LIMIT 1;`,
    [collegeSlug, cleanDomain]
  );

  if (existingOrg.rowCount > 0) {
    const err = new Error(
      `An approved organization already exists for "${existingOrg.rows[0].name}". Please contact the institution's existing administrator or platform support for access.`
    );
    err.status = 409;
    throw err;
  }

  // Security Check 2: Check if applicant already has a pending application
  const existingApp = await db.query(
    `SELECT id, status, created_at FROM college_applications 
     WHERE applicant_email = $1 OR contact_email = $2
     ORDER BY created_at DESC LIMIT 1;`,
    [cleanApplicantEmail, cleanContactEmail]
  );

  if (existingApp.rowCount > 0 && existingApp.rows[0].status === 'PENDING') {
    const err = new Error(
      'A college registration application is already pending verification for this email address. Our team will review your application shortly.'
    );
    err.status = 409;
    throw err;
  }

  // Security Check 3: Check if username is already taken by existing user
  const existingUserWithUsername = await db.query(
    `SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;`,
    [cleanUsername]
  );
  if (existingUserWithUsername.rowCount > 0) {
    const err = new Error(`Username "${cleanUsername}" is already taken. Please choose another username.`);
    err.status = 409;
    throw err;
  }

  // Security Check 4: Check if username is in another pending application
  const pendingUsernameApp = await db.query(
    `SELECT id FROM college_applications WHERE LOWER(applicant_username) = LOWER($1) AND status = 'PENDING' LIMIT 1;`,
    [cleanUsername]
  );
  if (pendingUsernameApp.rowCount > 0) {
    const err = new Error(`An application with username "${cleanUsername}" is already pending review. Please choose another username.`);
    err.status = 409;
    throw err;
  }

  // Hash password securely
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const insertSql = `
    INSERT INTO college_applications (
      college_name, institution_type, website, domain, address, city, state, country,
      contact_email, contact_phone, applicant_name, applicant_username, applicant_email, applicant_designation,
      applicant_phone, password_hash, verification_info, status,
      verification_token_hash, verification_expires_at, email_verified
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14,
      $15, $16, $17, 'PENDING',
      $18, $19, FALSE
    ) RETURNING id, college_name, applicant_name, applicant_username, applicant_email, status, created_at;
  `;

  const result = await db.query(insertSql, [
    cleanCollegeName,
    institutionType.trim(),
    website ? website.trim() : null,
    cleanDomain,
    address ? address.trim() : null,
    city ? city.trim() : null,
    state ? state.trim() : null,
    country ? country.trim() : 'India',
    cleanContactEmail,
    contactPhone ? contactPhone.trim() : null,
    applicantName.trim(),
    cleanUsername,
    cleanApplicantEmail,
    applicantDesignation.trim(),
    applicantPhone ? applicantPhone.trim() : null,
    passwordHash,
    JSON.stringify(verificationInfo || {}),
    tokenHash,
    expiresAt,
  ]);

  const createdApp = result.rows[0];

  // Send verification email
  try {
    await emailService.sendVerificationEmail(cleanApplicantEmail, verificationToken);
  } catch (emailErr) {
    logger.warn({ err: emailErr, email: cleanApplicantEmail }, '[CollegeOnboarding] Verification email could not be sent (logged)');
  }

  logger.info(
    { applicationId: createdApp.id, collegeName: cleanCollegeName, applicantEmail: cleanApplicantEmail, username: cleanUsername },
    '[CollegeOnboarding] New college application submitted (PENDING)'
  );

  return {
    success: true,
    message: 'College registration application submitted successfully and is awaiting Super Admin verification.',
    application: createdApp,
  };
}

/**
 * List applications for Super Admin verification dashboard.
 */
async function getApplications({
  status,
  search,
  startDate,
  endDate,
  limit = 20,
  offset = 0,
}) {
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

  const conditions = [];
  const params = [];

  if (status && status !== 'all') {
    params.push(status.toUpperCase());
    conditions.push(`ca.status = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(ca.college_name ILIKE $${params.length} OR ca.applicant_name ILIKE $${params.length} OR ca.applicant_email ILIKE $${params.length} OR ca.domain ILIKE $${params.length})`);
  }

  if (startDate) {
    params.push(new Date(startDate));
    conditions.push(`ca.created_at >= $${params.length}`);
  }

  if (endDate) {
    params.push(new Date(endDate));
    conditions.push(`ca.created_at <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db.query(
    `SELECT count(*)::int AS total FROM college_applications ca ${whereClause};`,
    params
  );
  const total = countRes.rows[0]?.total || 0;

  // Status summaries
  const statsRes = await db.query(`
    SELECT
      count(*) FILTER (WHERE status = 'PENDING')::int AS pending_count,
      count(*) FILTER (WHERE status = 'APPROVED')::int AS approved_count,
      count(*) FILTER (WHERE status = 'REJECTED')::int AS rejected_count,
      count(*)::int AS total_count
    FROM college_applications;
  `);
  const stats = statsRes.rows[0] || { pending_count: 0, approved_count: 0, rejected_count: 0, total_count: 0 };

  const dataParams = [...params, parsedLimit, parsedOffset];
  const dataSql = `
    SELECT
      ca.id,
      ca.college_name,
      ca.institution_type,
      ca.website,
      ca.domain,
      ca.address,
      ca.city,
      ca.state,
      ca.country,
      ca.contact_email,
      ca.contact_phone,
      ca.applicant_name,
      ca.applicant_username,
      ca.applicant_email,
      ca.applicant_designation,
      ca.applicant_phone,
      ca.verification_info,
      ca.email_verified,
      ca.status,
      ca.reviewed_by,
      ca.reviewed_at,
      ca.rejection_reason,
      ca.organization_id,
      ca.user_id,
      ca.created_at,
      ca.updated_at,
      u_reviewer.username AS reviewer_username,
      u_reviewer.display_name AS reviewer_display_name,
      o.code AS organization_code,
      o.slug AS organization_slug
    FROM college_applications ca
    LEFT JOIN users u_reviewer ON u_reviewer.id = ca.reviewed_by
    LEFT JOIN organizations o ON o.id = ca.organization_id
    ${whereClause}
    ORDER BY
      CASE WHEN ca.status = 'PENDING' THEN 1 ELSE 2 END,
      ca.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;

  const dataRes = await db.query(dataSql, dataParams);

  return {
    applications: dataRes.rows,
    total,
    stats,
    limit: parsedLimit,
    offset: parsedOffset,
  };
}

/**
 * Get single application by ID with complete details.
 */
async function getApplicationById(id) {
  const result = await db.query(
    `SELECT
      ca.id,
      ca.college_name,
      ca.institution_type,
      ca.website,
      ca.domain,
      ca.address,
      ca.city,
      ca.state,
      ca.country,
      ca.contact_email,
      ca.contact_phone,
      ca.applicant_name,
      ca.applicant_username,
      ca.applicant_email,
      ca.applicant_designation,
      ca.applicant_phone,
      ca.verification_info,
      ca.email_verified,
      ca.status,
      ca.reviewed_by,
      ca.reviewed_at,
      ca.rejection_reason,
      ca.organization_id,
      ca.user_id,
      ca.created_at,
      ca.updated_at,
      u_reviewer.username AS reviewer_username,
      u_reviewer.display_name AS reviewer_display_name,
      o.name AS organization_name,
      o.code AS organization_code,
      o.slug AS organization_slug
     FROM college_applications ca
     LEFT JOIN users u_reviewer ON u_reviewer.id = ca.reviewed_by
     LEFT JOIN organizations o ON o.id = ca.organization_id
     WHERE ca.id = $1;`,
    [id]
  );

  if (result.rowCount === 0) {
    const err = new Error('College application not found');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

/**
 * Super Admin explicit approval:
 * Atomically provisions the Organization, establishes College Admin role & membership,
 * and updates application status to APPROVED.
 */
async function approveApplication(applicationId, reviewerUser, ipAddress) {
  // Use a client for transactional atomicity and row locking
  const client = db.getClient ? await db.getClient() : await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock application row FOR UPDATE to prevent race conditions or double approvals
    const appRes = await client.query(
      `SELECT * FROM college_applications WHERE id = $1 FOR UPDATE;`,
      [applicationId]
    );

    if (appRes.rowCount === 0) {
      const err = new Error('College application not found');
      err.status = 404;
      throw err;
    }

    const application = appRes.rows[0];

    if (application.status !== 'PENDING') {
      const err = new Error(`Application cannot be approved because it has already been reviewed (status: ${application.status})`);
      err.status = 400;
      throw err;
    }

    // 2. Generate slug and unique code for Organization
    let baseSlug = slugify(application.college_name) || `college-${Date.now()}`;
    let finalSlug = baseSlug;
    let baseCode = generateCode(application.college_name);
    let finalCode = baseCode;

    // Check slug collisions
    const slugCheck = await client.query(`SELECT id FROM organizations WHERE slug = $1;`, [finalSlug]);
    if (slugCheck.rowCount > 0) {
      finalSlug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
    }

    // Check code collisions
    const codeCheck = await client.query(`SELECT id FROM organizations WHERE code = $1;`, [finalCode]);
    if (codeCheck.rowCount > 0) {
      finalCode = `${baseCode}${Math.floor(Math.random() * 1000)}`;
    }

    // 3. Create Organization record
    const orgInsert = await client.query(
      `INSERT INTO organizations (
        name, slug, code, domain, description, is_active, created_by, settings
      ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7)
      RETURNING *;`,
      [
        application.college_name,
        finalSlug,
        finalCode,
        application.domain || null,
        `Official institution account for ${application.college_name}`,
        reviewerUser.id,
        JSON.stringify({
          institution_type: application.institution_type,
          city: application.city,
          state: application.state,
          country: application.country,
          website: application.website,
          contact_email: application.contact_email,
          contact_phone: application.contact_phone,
        }),
      ]
    );
    const organization = orgInsert.rows[0];

    // 4. Resolve or create Administrator User account
    let adminUserId = null;
    const userCheck = await client.query(
      `SELECT id, username, email, role FROM users WHERE email = $1;`,
      [application.applicant_email]
    );

    if (userCheck.rowCount > 0) {
      // Existing user: elevate to college_admin and ensure email is verified
      const existingUser = userCheck.rows[0];
      adminUserId = existingUser.id;

      await client.query(
        `UPDATE users
         SET role = $1, email_verified = TRUE, is_active = TRUE, updated_at = NOW()
         WHERE id = $2;`,
        [ROLES.COLLEGE_ADMIN, adminUserId]
      );
    } else {
      // Create new user account with submitted credentials
      let baseUsername = application.applicant_username || slugify(application.applicant_name) || application.applicant_email.split('@')[0];
      let finalUsername = baseUsername;
      const uCheck = await client.query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1);`, [finalUsername]);
      if (uCheck.rowCount > 0) {
        finalUsername = `${baseUsername}_${Math.floor(Math.random() * 1000)}`;
      }

      const userInsert = await client.query(
        `INSERT INTO users (
          username, email, password_hash, display_name, role, is_active, email_verified
        ) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
        RETURNING id, username;`,
        [
          finalUsername,
          application.applicant_email,
          application.password_hash,
          application.applicant_name,
          ROLES.COLLEGE_ADMIN,
        ]
      );
      adminUserId = userInsert.rows[0].id;
      finalUsername = userInsert.rows[0].username;
    }

    // 5. Establish College Admin Membership
    await client.query(
      `INSERT INTO organization_members (
        organization_id, user_id, role, department, enrollment_status
      ) VALUES ($1, $2, 'college_admin', $3, 'active')
      ON CONFLICT (organization_id, user_id)
      DO UPDATE SET role = 'college_admin', enrollment_status = 'active', updated_at = NOW();`,
      [organization.id, adminUserId, application.applicant_designation]
    );

    // 6. Update College Application record to APPROVED
    await client.query(
      `UPDATE college_applications
       SET status = 'APPROVED',
           reviewed_by = $1,
           reviewed_at = NOW(),
           organization_id = $2,
           user_id = $3,
           updated_at = NOW()
       WHERE id = $4;`,
      [reviewerUser.id, organization.id, adminUserId, applicationId]
    );

    // 7. Record administrative audit log
    await client.query(
      `INSERT INTO admin_audit_logs 
        (organization_id, actor_id, actor_email, actor_role, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        organization.id,
        reviewerUser.id,
        reviewerUser.email,
        reviewerUser.role,
        'college_application.approve',
        'college_application',
        applicationId,
        JSON.stringify({
          college_name: application.college_name,
          organization_id: organization.id,
          organization_slug: organization.slug,
          organization_code: organization.code,
          admin_email: application.applicant_email,
          admin_user_id: adminUserId,
        }),
        ipAddress,
      ]
    );

    await client.query('COMMIT');

    logger.info(
      { applicationId, organizationId: organization.id, adminUserId, reviewer: reviewerUser.id },
      '[CollegeOnboarding] Application APPROVED atomically'
    );

    // 8. Send notification email to applicant
    const loginUsername = application.applicant_username || application.applicant_email.split('@')[0];
    try {
      await emailService.sendEmail({
        to: application.applicant_email,
        subject: `Welcome to KodeChirp! Your Institution Account for ${application.college_name} is Approved`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Congratulations, ${application.applicant_name}!</h2>
            <p>Your college registration application for <strong>${application.college_name}</strong> has been officially approved by the KodeChirp platform administration.</p>
            <p>You can now log in using your registered username (<strong>${loginUsername}</strong>) or email (<strong>${application.applicant_email}</strong>) and password to access your College Administration Dashboard.</p>
            <div style="margin: 25px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/auth" style="background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Log In to College Dashboard</a>
            </div>
            <p style="color: #666; font-size: 13px;">If you have any questions, feel free to reply directly to this email.</p>
          </div>
        `,
      });
    } catch (notifErr) {
      logger.warn({ err: notifErr }, '[CollegeOnboarding] Approval notification email warning');
    }

    return {
      success: true,
      message: `Application for ${application.college_name} has been approved. Institution and College Admin provisioned.`,
      organization,
      adminUserId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Super Admin rejection:
 * Sets application status to REJECTED with recorded reason and decision metadata.
 */
async function rejectApplication(applicationId, reason, reviewerUser, ipAddress) {
  if (!reason || !reason.trim()) {
    const err = new Error('A recorded rejection reason is required');
    err.status = 400;
    throw err;
  }

  const client = db.getClient ? await db.getClient() : await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Lock row
    const appRes = await client.query(
      `SELECT * FROM college_applications WHERE id = $1 FOR UPDATE;`,
      [applicationId]
    );

    if (appRes.rowCount === 0) {
      const err = new Error('College application not found');
      err.status = 404;
      throw err;
    }

    const application = appRes.rows[0];

    if (application.status !== 'PENDING') {
      const err = new Error(`Application cannot be rejected because it is already ${application.status}`);
      err.status = 400;
      throw err;
    }

    const cleanReason = reason.trim();

    await client.query(
      `UPDATE college_applications
       SET status = 'REJECTED',
           rejection_reason = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3;`,
      [cleanReason, reviewerUser.id, applicationId]
    );

    // Audit log
    await client.query(
      `INSERT INTO admin_audit_logs 
        (organization_id, actor_id, actor_email, actor_role, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        null,
        reviewerUser.id,
        reviewerUser.email,
        reviewerUser.role,
        'college_application.reject',
        'college_application',
        applicationId,
        JSON.stringify({
          college_name: application.college_name,
          applicant_email: application.applicant_email,
          reason: cleanReason,
        }),
        ipAddress,
      ]
    );

    await client.query('COMMIT');

    logger.info(
      { applicationId, reviewer: reviewerUser.id, reason: cleanReason },
      '[CollegeOnboarding] Application REJECTED'
    );

    // Send notification email to applicant
    try {
      await emailService.sendEmail({
        to: application.applicant_email,
        subject: `Update regarding your KodeChirp college application for ${application.college_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Hello ${application.applicant_name},</h2>
            <p>Thank you for your interest in onboarding <strong>${application.college_name}</strong> to KodeChirp.</p>
            <p>After reviewing your application, our team could not verify the details provided. Here is the reason recorded:</p>
            <blockquote style="background: #f8fafc; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; color: #334155;">
              ${cleanReason}
            </blockquote>
            <p>You may submit a revised application with updated documentation or contact platform support if you believe this decision was made in error.</p>
          </div>
        `,
      });
    } catch (notifErr) {
      logger.warn({ err: notifErr }, '[CollegeOnboarding] Rejection notification email warning');
    }

    return {
      success: true,
      message: 'Application has been rejected with recorded reason.',
      id: applicationId,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Verify applicant email token.
 */
async function verifyApplicantEmail(token) {
  if (!token) {
    const err = new Error('Verification token is required');
    err.status = 400;
    throw err;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await db.query(
    `UPDATE college_applications
     SET email_verified = TRUE,
         verification_token_hash = NULL,
         updated_at = NOW()
     WHERE verification_token_hash = $1 AND verification_expires_at > NOW()
     RETURNING id, college_name, applicant_email, email_verified;`,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    const err = new Error('Invalid or expired verification token');
    err.status = 400;
    throw err;
  }

  return result.rows[0];
}

module.exports = {
  submitApplication,
  getApplications,
  getApplicationById,
  approveApplication,
  rejectApplication,
  verifyApplicantEmail,
};
