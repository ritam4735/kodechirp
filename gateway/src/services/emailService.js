// gateway/src/services/emailService.js
// ─────────────────────────────────────────────────────────────────────────────
// Transactional Email Service for KodeChirp
// Supports Resend (primary), SMTP, and Console (mock/dev)
// ─────────────────────────────────────────────────────────────────────────────

const { Resend } = require('resend');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Resolve and validate the frontend URL for outbound email action links.
 * In production, disallows localhost/127.0.0.1 to avoid broken delivery links.
 */
function getFrontendUrl() {
  const env = process.env.NODE_ENV || config.env || 'development';
  let url = process.env.FRONTEND_URL || config.frontendUrl || config.cors?.origin;

  if (env === 'production') {
    if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
      throw new Error(
        'Production configuration error: FRONTEND_URL must be configured with a valid deployed URL (localhost is not supported in production).'
      );
    }
  } else {
    url = url || 'http://localhost:3000';
  }

  return url.replace(/\/+$/, '');
}

/**
 * Determine the active email provider dynamically from environment or configuration.
 */
function getActiveProvider() {
  if (process.env.EMAIL_PROVIDER) {
    return process.env.EMAIL_PROVIDER.toLowerCase();
  }
  if (process.env.RESEND_API_KEY || config.email?.resendApiKey) {
    return 'resend';
  }
  if (process.env.SMTP_HOST) {
    return 'smtp';
  }
  return 'console';
}

// Providers collection
const providers = {
  resend: {
    send: async ({ to, subject, html, text }) => {
      const rawApiKey = process.env.RESEND_API_KEY || config.email?.resendApiKey;
      const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;
      if (!apiKey) {
        throw new Error('RESEND_API_KEY is not configured');
      }

      const resend = new Resend(apiKey);
      const rawFrom = process.env.EMAIL_FROM || config.email?.from || 'KodeChirp <onboarding@resend.dev>';
      const from = typeof rawFrom === 'string' ? rawFrom.trim() : rawFrom;
      const recipients = Array.isArray(to) ? to : [to];

      const resendRes = await resend.emails.send({
        from,
        to: recipients,
        subject,
        html,
        text,
      });
      const { data, error } = resendRes || {};

      if (error) {
        logger.error({ to, subject, err: error.message, errorName: error.name }, '[EmailService:Resend] Provider returned delivery error');
        const err = new Error(error.message || 'Resend email delivery failed');
        err.statusCode = error.statusCode;
        err.name = error.name;
        throw err;
      }

      logger.info({ to, subject, emailId: data?.id }, '[EmailService:Resend] Email dispatched successfully');
      return data || { id: 'resend-dispatched' };
    }
  },
  console: {
    send: async ({ to, subject, html, text }) => {
      if (process.env.NODE_ENV === 'production') {
        logger.info(`[EmailService:Console] Sending email to: ${to} (Subject: ${subject}) [content redacted in production]`);
      } else {
        logger.info(`[EmailService:Console] Sending email to: ${to}`);
        logger.info(`[EmailService:Console] Subject: ${subject}`);
        logger.info(`[EmailService:Console] Body: \n${text || html}`);
      }
      return { id: 'mock-console-id' };
    }
  },
  smtp: {
    send: async ({ to, subject, html, text }) => {
      try {
        let nodemailer;
        try {
          nodemailer = require('nodemailer');
        } catch (e) {
          logger.warn('[EmailService:SMTP] nodemailer not installed, falling back to console');
          return providers.console.send({ to, subject, html, text });
        }
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'localhost',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          } : undefined,
        });
        const result = await transporter.sendMail({
          from: process.env.EMAIL_FROM || config.email?.from || 'KodeChirp <onboarding@resend.dev>',
          to,
          subject,
          text,
          html,
        });
        return result;
      } catch (err) {
        logger.error({ err: err.message }, '[EmailService:SMTP] Failed to send email via SMTP, falling back to console');
        return providers.console.send({ to, subject, html, text });
      }
    }
  }
};

/**
 * Send an email using the configured provider.
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plaintext fallback body
 */
async function sendEmail({ to, subject, html, text }) {
  const active = getActiveProvider();
  const provider = providers[active] || providers.console;
  try {
    const result = await provider.send({ to, subject, html, text });
    logger.info({ to, provider: active }, '[EmailService] Dispatched email successfully');
    return result;
  } catch (error) {
    logger.error({ to, provider: active, err: error.message }, '[EmailService] Failed to send email');
    throw error;
  }
}

/**
 * Send Password Reset Email
 * @param {string} email - Recipient email
 * @param {string} resetToken - The raw reset token
 */
async function sendPasswordResetEmail(email, resetToken) {
  const frontendUrl = getFrontendUrl();
  const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const subject = 'KodeChirp - Password Reset Request';
  const text = `You requested a password reset for your KodeChirp account.\n\nPlease visit the following link to choose a new password:\n\n${resetLink}\n\nThis password reset link is valid for 15 minutes.\nIf you did not make this request, you can safely ignore this email.\n\n— The KodeChirp Team`;
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KodeChirp Password Reset</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #161b22; border-radius: 8px; border: 1px solid #30363d; margin: 40px auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <tr>
          <td style="padding: 28px 32px 20px 32px; text-align: center; border-bottom: 1px solid #21262d;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #58a6ff; letter-spacing: -0.5px;">KodeChirp</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #f0f6fc;">Password Reset Request</h2>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #8b949e;">
              You recently requested to reset your password for your KodeChirp account. Click the button below to set a new password.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
              <tr>
                <td align="center" style="border-radius: 6px; background-color: #238636;">
                  <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Reset Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 1.5; color: #8b949e;">
              If the button does not work, copy and paste this link into your browser:
            </p>
            <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.4; color: #58a6ff; word-break: break-all;">
              <a href="${resetLink}" target="_blank" style="color: #58a6ff; text-decoration: underline;">${resetLink}</a>
            </p>
            <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #6e7681; border-top: 1px solid #21262d; padding-top: 16px;">
              This link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send Verification Email
 * @param {string} email - Recipient email
 * @param {string} verificationToken - The raw verification token
 */
async function sendVerificationEmail(email, verificationToken) {
  const frontendUrl = getFrontendUrl();
  const verifyLink = `${frontendUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  const subject = 'KodeChirp - Verify your Email Address';
  const text = `Welcome to KodeChirp!\n\nPlease verify your email address by visiting the following link:\n\n${verifyLink}\n\nThis verification link is valid for 24 hours.\nIf you did not create an account on KodeChirp, you can safely ignore this email.\n\n— The KodeChirp Team`;
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your Email Address</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #e6edf3;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #161b22; border-radius: 8px; border: 1px solid #30363d; margin: 40px auto; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <tr>
          <td style="padding: 28px 32px 20px 32px; text-align: center; border-bottom: 1px solid #21262d;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #58a6ff; letter-spacing: -0.5px;">KodeChirp</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px;">
            <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #f0f6fc;">Verify your email address</h2>
            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #8b949e;">
              Thank you for registering for KodeChirp. Please confirm your email address to activate your account.
            </p>
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
              <tr>
                <td align="center" style="border-radius: 6px; background-color: #238636;">
                  <a href="${verifyLink}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                    Verify Email Address
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 24px 0 8px 0; font-size: 13px; line-height: 1.5; color: #8b949e;">
              If the button above does not work, copy and paste this link into your browser:
            </p>
            <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.4; color: #58a6ff; word-break: break-all;">
              <a href="${verifyLink}" target="_blank" style="color: #58a6ff; text-decoration: underline;">${verifyLink}</a>
            </p>
            <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #6e7681; border-top: 1px solid #21262d; padding-top: 16px;">
              This link is valid for 24 hours and can only be used once. If you did not create an account, you can safely ignore this message.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html, text });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  getFrontendUrl,
  getActiveProvider,
  providers,
};
