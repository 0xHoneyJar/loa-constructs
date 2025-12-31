/**
 * Authentication Routes
 * @see sprint.md T2.2: Auth Routes
 * @see sdd.md §5.2 Authentication Endpoints
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, users } from '../db/index.js';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
  generateVerificationToken,
  generateResetToken,
  verifyVerificationToken,
  verifyResetToken,
  type RefreshTokenPayload,
} from '../services/auth.js';
import { blacklistService } from '../services/blacklist.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { logAuthEvent, logUserAccountEvent } from '../services/audit.js';
import { Errors } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';

// --- Schemas ---

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
  name: z.string().min(1, 'Name is required').max(255),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// --- Routes ---

const auth = new Hono();

// Apply rate limiting to all auth routes
auth.use('*', authRateLimiter());

/**
 * POST /v1/auth/register
 * Create a new user account
 */
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');
  const requestId = c.get('requestId');

  // Check if email already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw Errors.EmailAlreadyExists();
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      name,
      emailVerified: false,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

  // Generate verification token and send email
  const verificationToken = await generateVerificationToken(newUser.id, newUser.email);
  await sendVerificationEmail(newUser.email, newUser.name, verificationToken);

  // Generate auth tokens
  const tokens = await generateTokens(newUser.id, newUser.email);

  // Audit log
  await logAuthEvent('user.register', newUser.id, {
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  logger.info({ userId: newUser.id, requestId }, 'User registered');

  return c.json(
    {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        email_verified: false,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      token_type: 'Bearer',
    },
    201
  );
});

/**
 * POST /v1/auth/login
 * Authenticate with email and password
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const requestId = c.get('requestId');

  // Find user
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.passwordHash) {
    throw Errors.Unauthorized('Invalid email or password');
  }

  // Verify password
  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw Errors.Unauthorized('Invalid email or password');
  }

  // Generate tokens
  const tokens = await generateTokens(user.id, user.email);

  // Audit log
  await logAuthEvent('user.login', user.id, {
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  logger.info({ userId: user.id, requestId }, 'User logged in');

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.emailVerified,
    },
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
    token_type: 'Bearer',
  });
});

/**
 * POST /v1/auth/refresh
 * Refresh access token using refresh token
 */
auth.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refresh_token } = c.req.valid('json');
  const requestId = c.get('requestId');

  try {
    // Verify refresh token
    const payload = await verifyRefreshToken(refresh_token);

    // Get user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      throw Errors.InvalidToken();
    }

    // Generate new tokens
    const tokens = await generateTokens(user.id, user.email);

    logger.info({ userId: user.id, requestId }, 'Token refreshed');

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.emailVerified,
      },
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      token_type: 'Bearer',
    });
  } catch {
    throw Errors.InvalidToken();
  }
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /v1/auth/logout
 * Invalidate current tokens by blacklisting the refresh token
 * @see sdd-v2.md §4.1 L1: Token Blacklist Service
 */
auth.post('/logout', requireAuth(), zValidator('json', logoutSchema), async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId');
  const { refresh_token } = c.req.valid('json');

  try {
    // Verify and decode the refresh token to get its JTI
    const payload = (await verifyRefreshToken(refresh_token)) as RefreshTokenPayload;

    // Calculate remaining TTL for the token
    const now = Math.floor(Date.now() / 1000);
    const exp = payload.exp || now;
    const remainingTTL = Math.max(0, exp - now);

    // Blacklist the token if it has a JTI
    if (payload.jti && remainingTTL > 0) {
      await blacklistService.add(payload.jti, remainingTTL);
      logger.info({ userId, jti: payload.jti, requestId }, 'Refresh token blacklisted');
    }
  } catch (error) {
    // Log but don't fail - token might already be invalid/expired
    logger.warn({ userId, requestId, error }, 'Failed to blacklist refresh token');
  }

  // Audit log
  await logAuthEvent('user.logout', userId, {
    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  logger.info({ userId, requestId }, 'User logged out');

  return c.json({ message: 'Logged out successfully' });
});

/**
 * POST /v1/auth/forgot-password
 * Request password reset email
 */
auth.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json');
  const requestId = c.get('requestId');

  // Find user (don't reveal if email exists)
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (user) {
    // Generate reset token and send email
    const resetToken = await generateResetToken(user.id);
    await sendPasswordResetEmail(user.email, user.name, resetToken);
    logger.info({ userId: user.id, requestId }, 'Password reset requested');
  }

  // Always return success to prevent email enumeration
  return c.json({
    message: 'If an account exists with this email, a password reset link has been sent.',
  });
});

/**
 * POST /v1/auth/reset-password
 * Reset password using token from email
 */
auth.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { token, password } = c.req.valid('json');
  const requestId = c.get('requestId');

  try {
    // Verify reset token
    const payload = await verifyResetToken(token);

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    const result = await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.sub))
      .returning({ id: users.id });

    if (result.length === 0) {
      throw Errors.InvalidToken();
    }

    // Audit log
    await logUserAccountEvent('user.password_change', payload.sub, {
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });

    logger.info({ userId: payload.sub, requestId }, 'Password reset completed');

    return c.json({ message: 'Password has been reset successfully' });
  } catch {
    throw Errors.InvalidToken();
  }
});

/**
 * POST /v1/auth/verify
 * Verify email using token from email
 */
auth.post('/verify', zValidator('json', verifyEmailSchema), async (c) => {
  const { token } = c.req.valid('json');
  const requestId = c.get('requestId');

  try {
    // Verify verification token
    const payload = await verifyVerificationToken(token);

    // Update email verified status
    const result = await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.sub))
      .returning({ id: users.id, email: users.email });

    if (result.length === 0) {
      throw Errors.InvalidToken();
    }

    // Audit log
    await logUserAccountEvent('user.email_verified', payload.sub, {
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });

    logger.info({ userId: payload.sub, requestId }, 'Email verified');

    return c.json({ message: 'Email verified successfully' });
  } catch {
    throw Errors.InvalidToken();
  }
});

/**
 * POST /v1/auth/resend-verification
 * Resend verification email
 */
auth.post('/resend-verification', requireAuth(), async (c) => {
  const user = c.get('user');
  const requestId = c.get('requestId');

  if (user.emailVerified) {
    return c.json({ message: 'Email is already verified' });
  }

  // Generate new verification token and send
  const verificationToken = await generateVerificationToken(user.id, user.email);
  await sendVerificationEmail(user.email, user.name, verificationToken);

  logger.info({ userId: user.id, requestId }, 'Verification email resent');

  return c.json({ message: 'Verification email sent' });
});

/**
 * GET /v1/auth/me
 * Get current authenticated user
 */
auth.get('/me', requireAuth(), async (c) => {
  const user = c.get('user');

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      email_verified: user.emailVerified,
      tier: user.tier,
    },
  });
});

export { auth };
