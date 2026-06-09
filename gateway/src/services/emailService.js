// gateway/src/services/emailService.js
// ─────────────────────────────────────────────────────────────────────────────
// Abstract Email Service for KodeChirp
// Supports multiple providers (Console/Mock by default, easily extensible for Resend/SendGrid/SMTP)
// ─────────────────────────────────────────────────────────────────────────────

const logger = require('../utils/logger');
const config = require('../config'); // Assume config has email settings if needed

// Providers
const providers = {
  console: {
    send: async ({ to, subject, html, text }) => {
      logger.info(`[EmailService:Console] Sending email to: ${to}`);
      logger.info(`[EmailService:Console] Subject: ${subject}`);
      logger.info(`[EmailService:Console] Body: \n${text || html}`);
      return true;
    }
  },
  // future providers like sendgrid, resend, smtp can be added here
};

// Default to console provider for now unless configured
const activeProvider = process.env.EMAIL_PROVIDER || 'console';
const provider = providers[activeProvider] || providers.console;

/**
 * Send an email using the active provider.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Fallback text body
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    await provider.send({ to, subject, html, text });
    logger.info(`[EmailService] Successfully sent email to ${to}`);
    return true;
  } catch (error) {
    logger.error(`[EmailService] Failed to send email to ${to}: ${error.message}`);
    throw error; // Let caller handle if needed, or fail silently
  }
}

/**
 * Send Password Reset Email
 * @param {string} email - Recipient email
 * @param {string} resetToken - The raw reset token
 */
async function sendPasswordResetEmail(email, resetToken) {
  // Use frontend URL from env or fallback
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  const subject = 'KodeChirp - Password Reset Request';
  const text = `You requested a password reset. Please go to the following link to reset your password: \n\n${resetLink}\n\nIf you did not request this, please ignore this email. This link expires in 15 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 style="color: #333; text-align: center;">KodeChirp Password Reset</h2>
      <p style="color: #555; line-height: 1.5;">Hello,</p>
      <p style="color: #555; line-height: 1.5;">You recently requested to reset your password for your KodeChirp account. Click the button below to reset it.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #58a6ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #555; line-height: 1.5;">If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next 15 minutes.</p>
      <p style="color: #777; font-size: 0.9em; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">Thanks,<br>The KodeChirp Team</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send Verification Email
 * @param {string} email - Recipient email
 * @param {string} verificationToken - The raw verification token
 */
async function sendVerificationEmail(email, verificationToken) {
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyLink = `${frontendUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
  
  const subject = 'KodeChirp - Verify your Email Address';
  const text = `Welcome to KodeChirp! Please verify your email address by visiting this link: \n\n${verifyLink}\n\nThis link expires in 24 hours.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 style="color: #333; text-align: center;">Welcome to KodeChirp!</h2>
      <p style="color: #555; line-height: 1.5;">Thank you for registering. Please confirm your email address so we know it's really you.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyLink}" style="background-color: #2ea043; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email</a>
      </div>
      <p style="color: #555; line-height: 1.5;">If you did not sign up for an account, please safely ignore this email. This link is valid for 24 hours.</p>
      <p style="color: #777; font-size: 0.9em; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">The KodeChirp Team</p>
    </div>
  `;

  return sendEmail({ to: email, subject, html, text });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
