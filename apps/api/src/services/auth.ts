/**
 * Authentication Service
 * @see sdd.md §1.9 Security Architecture
 * @see sprint.md T2.1: Auth Service
 */

import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '../config/env.js';

// --- Constants ---

const BCRYPT_COST_FACTOR = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '30d';
const VERIFICATION_TOKEN_EXPIRY = '24h';
const RESET_TOKEN_EXPIRY = '1h';

// --- Types ---

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // user ID
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // user ID
  jti: string; // unique token ID for revocation
  type: 'refresh';
}

export interface VerificationTokenPayload extends JWTPayload {
  sub: string; // user ID
  email: string;
  type: 'verification';
}

export interface ResetTokenPayload extends JWTPayload {
  sub: string; // user ID
  type: 'reset';
}

// --- Password Hashing ---

/**
 * Hash a password using bcrypt with cost factor 12
 * @see sdd.md: "Passwords hashed with bcrypt (cost factor 12)"
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- JWT Token Generation ---

/**
 * Get the secret key for JWT signing
 * Uses a simple HMAC approach with HS256 for simplicity
 * Note: For production, consider RS256 with key pair
 */
function getSecretKey(): Uint8Array {
  const secret = env.JWT_SECRET || 'development-secret-at-least-32-chars';
  return new TextEncoder().encode(secret);
}

/**
 * Generate access and refresh token pair
 * @see sprint.md: "JWT expires in 15 minutes", "Refresh token works for 30 days"
 */
export async function generateTokens(userId: string, email: string): Promise<TokenPair> {
  const secretKey = getSecretKey();
  const now = Math.floor(Date.now() / 1000);
  const refreshTokenId = crypto.randomUUID();

  // Access token - 15 minutes
  const accessToken = await new SignJWT({
    sub: userId,
    email,
    type: 'access',
  } satisfies Omit<AccessTokenPayload, 'iat' | 'exp' | 'iss'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secretKey);

  // Refresh token - 30 days
  const refreshToken = await new SignJWT({
    sub: userId,
    jti: refreshTokenId,
    type: 'refresh',
  } satisfies Omit<RefreshTokenPayload, 'iat' | 'exp' | 'iss'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secretKey);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Verify and decode an access token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const secretKey = getSecretKey();

  const { payload } = await jwtVerify(token, secretKey, {
    issuer: env.JWT_ISSUER,
  });

  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return payload as AccessTokenPayload;
}

/**
 * Verify and decode a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const secretKey = getSecretKey();

  const { payload } = await jwtVerify(token, secretKey, {
    issuer: env.JWT_ISSUER,
  });

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return payload as RefreshTokenPayload;
}

// --- Email Verification Token ---

/**
 * Generate email verification token (24 hours)
 */
export async function generateVerificationToken(userId: string, email: string): Promise<string> {
  const secretKey = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: userId,
    email,
    type: 'verification',
  } satisfies Omit<VerificationTokenPayload, 'iat' | 'exp' | 'iss'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setExpirationTime(VERIFICATION_TOKEN_EXPIRY)
    .sign(secretKey);
}

/**
 * Verify email verification token
 */
export async function verifyVerificationToken(token: string): Promise<VerificationTokenPayload> {
  const secretKey = getSecretKey();

  const { payload } = await jwtVerify(token, secretKey, {
    issuer: env.JWT_ISSUER,
  });

  if (payload.type !== 'verification') {
    throw new Error('Invalid token type');
  }

  return payload as VerificationTokenPayload;
}

// --- Password Reset Token ---

/**
 * Generate password reset token (1 hour)
 */
export async function generateResetToken(userId: string): Promise<string> {
  const secretKey = getSecretKey();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: userId,
    type: 'reset',
  } satisfies Omit<ResetTokenPayload, 'iat' | 'exp' | 'iss'>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setIssuer(env.JWT_ISSUER)
    .setExpirationTime(RESET_TOKEN_EXPIRY)
    .sign(secretKey);
}

/**
 * Verify password reset token
 */
export async function verifyResetToken(token: string): Promise<ResetTokenPayload> {
  const secretKey = getSecretKey();

  const { payload } = await jwtVerify(token, secretKey, {
    issuer: env.JWT_ISSUER,
  });

  if (payload.type !== 'reset') {
    throw new Error('Invalid token type');
  }

  return payload as ResetTokenPayload;
}

// --- Refresh Token Hash ---

/**
 * Hash a refresh token for database storage
 * Uses SHA-256 for fast lookup (security comes from token randomness)
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- API Key Generation ---

/**
 * Generate a new API key
 * Format: sk_live_{random} or sk_test_{random}
 */
export function generateApiKey(): { key: string; prefix: string } {
  const prefix = env.NODE_ENV === 'production' ? 'sk_live_' : 'sk_test_';
  const random = crypto.randomUUID().replace(/-/g, '');
  const key = `${prefix}${random}`;
  return { key, prefix: key.substring(0, 12) };
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_COST_FACTOR);
}

/**
 * Verify an API key against a hash
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}
