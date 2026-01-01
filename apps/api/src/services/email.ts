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

const FROM_EMAIL = 'Loa Skills Registry <noreply@loaskills.dev>';

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
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Skills Registry</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="margin-top: 0;">Welcome, ${escapeHtml(name)}!</h2>

    <p>Thank you for signing up for Loa Skills Registry. Please verify your email address to complete your registration.</p>

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
    <h1 style="color: white; margin: 0; font-size: 24px;">Loa Skills Registry</h1>
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
    ? 'https://loaskills.dev'
    : 'http://localhost:3001';

  const verificationUrl = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: 'Verify your email - Loa Skills Registry',
    html: generateVerificationEmail(name, verificationUrl),
    text: `Welcome to Loa Skills Registry, ${name}! Please verify your email by visiting: ${verificationUrl}`,
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
    ? 'https://loaskills.dev'
    : 'http://localhost:3001';

  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: email,
    subject: 'Reset your password - Loa Skills Registry',
    html: generatePasswordResetEmail(name, resetUrl),
    text: `Hi ${name}, reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
  });
}
