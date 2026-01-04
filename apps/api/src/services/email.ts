/**
 * Email Service
 * @see sprint.md T2.4: Email Service
 * @see sdd.md §1.6: External Integrations - Resend
 */

import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

// --- Types ---

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// --- Client ---

// Initialize Resend client (use dummy key in test/dev without API key)
const resend = new Resend(env.RESEND_API_KEY || 're_dummy_key_for_testing');

const FROM_EMAIL = 'Loa Constructs <noreply@constructs.network>';

// --- Templates ---

/**
 * Generate welcome/verification email HTML
 */
export function generateVerificationEmail(name: string, verificationUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Constructs</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Welcome, ${escapeHtml(name)}!</h2>

    <p>Thank you for signing up for Loa Constructs. Please verify your email address to complete your registration.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(verificationUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Verify Email
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If you didn't create an account, you can safely ignore this email.
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      This link expires in 24 hours.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${escapeHtml(verificationUrl)}" style="color: #667eea; word-break: break-all;">${escapeHtml(verificationUrl)}</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate password reset email HTML
 */
export function generatePasswordResetEmail(name: string, resetUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Constructs</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Reset Your Password</h2>

    <p>Hi ${escapeHtml(name)},</p>

    <p>We received a request to reset your password. Click the button below to create a new password.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(resetUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Reset Password
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      This link expires in 1 hour.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:
      <br>
      <a href="${escapeHtml(resetUrl)}" style="color: #667eea; word-break: break-all;">${escapeHtml(resetUrl)}</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

// --- Helper Functions ---

/**
 * Escape HTML to prevent XSS in email templates
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

// --- Email Sending ---

/**
 * Send an email via Resend
 * @see sprint-v2.md T14.5: Email Service Production Validation (L3)
 * @see sprint.md T17.3: Soft launch graceful degradation
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    // Log warning in production but don't throw - allows soft launch without email
    // For soft launch: users created manually with emailVerified=true
    logger.warn(
      { to: options.to, subject: options.subject, env: env.NODE_ENV },
      'Email skipped - RESEND_API_KEY not configured'
    );
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      logger.error({ error, to: options.to }, 'Failed to send email');
      return { success: false, error: error.message };
    }

    logger.info({ messageId: data?.id, to: options.to }, 'Email sent successfully');
    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ error: message, to: options.to }, 'Email send error');
    return { success: false, error: message };
  }
}

/**
 * Send verification email to new user
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<EmailResult> {
  const baseUrl = env.NODE_ENV === 'production'
    ? 'https://constructs.network'
    : 'http://localhost:3001';

  const verificationUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: 'Verify your email - Loa Constructs',
    html: generateVerificationEmail(name, verificationUrl),
    text: `Welcome to Loa Constructs, ${name}! Please verify your email by visiting: ${verificationUrl}`,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<EmailResult> {
  const baseUrl = env.NODE_ENV === 'production'
    ? 'https://constructs.network'
    : 'http://localhost:3001';

  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: 'Reset your password - Loa Constructs',
    html: generatePasswordResetEmail(name, resetUrl),
    text: `Hi ${name}, reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
  });
}

// --- Pack Submission Email Templates ---
// @see sdd-pack-submission.md §5.2 Email Templates

/**
 * Generate pack submission received confirmation email
 */
export function generateSubmissionReceivedEmail(
  name: string,
  packName: string,
  packSlug: string
): string {
  const baseUrl = env.NODE_ENV === 'production'
    ? 'https://constructs.network'
    : 'http://localhost:3001';

  const dashboardUrl = `${baseUrl}/dashboard/packs/${packSlug}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pack Submission Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Constructs</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Submission Received</h2>

    <p>Hi ${escapeHtml(name)},</p>

    <p>Thank you for submitting your pack <strong>"${escapeHtml(packName)}"</strong> for review!</p>

    <p>Our team will review your submission and you'll receive an email once a decision has been made. This typically takes 1-3 business days.</p>

    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #166534;">
        <strong>What happens next?</strong><br>
        Our review team will evaluate your pack for quality standards, content completeness, and security. You can check the status at any time from your dashboard.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(dashboardUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        View Pack Status
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If you need to make changes before review, you can withdraw your submission from the dashboard.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Questions? Reply to this email or visit our <a href="https://constructs.network/docs" style="color: #667eea;">documentation</a>.
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate pack approved email
 */
export function generatePackApprovedEmail(
  name: string,
  packName: string,
  packSlug: string,
  reviewNotes?: string
): string {
  const baseUrl = env.NODE_ENV === 'production'
    ? 'https://constructs.network'
    : 'http://localhost:3001';

  const packUrl = `${baseUrl}/packs/${packSlug}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pack Approved!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Constructs</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0; color: #16a34a;">Congratulations! Your Pack is Live</h2>

    <p>Hi ${escapeHtml(name)},</p>

    <p>Great news! Your pack <strong>"${escapeHtml(packName)}"</strong> has been approved and is now published on Loa Constructs.</p>

    ${reviewNotes ? `
    <div style="background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #0369a1;">
        <strong>Review Notes:</strong><br>
        ${escapeHtml(reviewNotes)}
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(packUrl)}" style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        View Your Pack
      </a>
    </div>

    <div style="background: #faf5ff; border: 1px solid #d8b4fe; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #7c3aed;">
        <strong>Promote your pack:</strong><br>
        Share your pack with the community! Consider posting about it on social media or in relevant developer communities.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Thank you for contributing to the Loa ecosystem!
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate pack rejected email
 */
export function generatePackRejectedEmail(
  name: string,
  packName: string,
  packSlug: string,
  rejectionReason: string,
  reviewNotes: string
): string {
  const baseUrl = env.NODE_ENV === 'production'
    ? 'https://constructs.network'
    : 'http://localhost:3001';

  const dashboardUrl = `${baseUrl}/dashboard/packs/${packSlug}`;

  // Map rejection reason codes to human-readable text
  const rejectionReasonLabels: Record<string, string> = {
    quality_standards: 'Does not meet quality standards',
    incomplete_content: 'Incomplete content or missing required files',
    duplicate_functionality: 'Duplicate functionality exists in another pack',
    policy_violation: 'Violates platform policies',
    security_concern: 'Security concerns identified',
    other: 'Other reason (see notes below)',
  };

  const reasonLabel = rejectionReasonLabels[rejectionReason] || rejectionReason;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pack Submission Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Constructs</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Submission Update</h2>

    <p>Hi ${escapeHtml(name)},</p>

    <p>Thank you for submitting your pack <strong>"${escapeHtml(packName)}"</strong>. After review, we were unable to approve it at this time.</p>

    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; color: #991b1b;">
        <strong>Reason:</strong> ${escapeHtml(reasonLabel)}
      </p>
      <p style="margin: 0; color: #991b1b;">
        <strong>Reviewer Notes:</strong><br>
        ${escapeHtml(reviewNotes)}
      </p>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #166534;">
        <strong>What can you do?</strong><br>
        You can update your pack to address the feedback above and submit again. We'd love to see your improved submission!
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${escapeHtml(dashboardUrl)}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
        Update Your Pack
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Questions about the feedback? Reply to this email and we'll be happy to help.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// --- Pack Submission Email Sending Functions ---

/**
 * Send submission received confirmation email
 * @see sdd-pack-submission.md §5.2 sendSubmissionReceivedEmail
 */
export async function sendSubmissionReceivedEmail(
  email: string,
  name: string,
  packName: string,
  packSlug: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: `Pack Submitted: "${packName}" - Loa Constructs`,
    html: generateSubmissionReceivedEmail(name, packName, packSlug),
    text: `Hi ${name}, your pack "${packName}" has been submitted for review. We'll notify you once a decision is made.`,
  });
}

/**
 * Send pack approved notification email
 * @see sdd-pack-submission.md §5.2 sendPackApprovedEmail
 */
export async function sendPackApprovedEmail(
  email: string,
  name: string,
  packName: string,
  packSlug: string,
  reviewNotes?: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: `Approved: "${packName}" is now live! - Loa Constructs`,
    html: generatePackApprovedEmail(name, packName, packSlug, reviewNotes),
    text: `Congratulations ${name}! Your pack "${packName}" has been approved and is now live on Loa Constructs.`,
  });
}

/**
 * Send pack rejected notification email
 * @see sdd-pack-submission.md §5.2 sendPackRejectedEmail
 */
export async function sendPackRejectedEmail(
  email: string,
  name: string,
  packName: string,
  packSlug: string,
  rejectionReason: string,
  reviewNotes: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: `Submission Update: "${packName}" - Loa Constructs`,
    html: generatePackRejectedEmail(name, packName, packSlug, rejectionReason, reviewNotes),
    text: `Hi ${name}, your pack "${packName}" submission was not approved. Reason: ${rejectionReason}. Notes: ${reviewNotes}. You can update your pack and submit again.`,
  });
}
