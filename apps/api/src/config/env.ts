import { z } from 'zod';

/**
 * Environment configuration schema with validation
 * @see sdd.md §11.D Environment Variables
 * @see sdd-v2.md §4.1 L2: JWT Secret Production Enforcement
 */
const envSchema = z
  .object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    HOST: z.string().default('0.0.0.0'),

    // Database
    DATABASE_URL: z.string().url().optional(),

    // Redis
    REDIS_URL: z.string().url().optional(),

    // R2 Storage
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().default('loa-constructs'),

    // Stripe
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    // Railway webhook secret for dual-endpoint period during migration
    STRIPE_WEBHOOK_SECRET_RAILWAY: z.string().optional(),

    // Maintenance mode for write-freeze during migration cutover
    MAINTENANCE_MODE: z.enum(['true', 'false']).default('false'),
    STRIPE_PRO_PRICE_ID: z.string().optional(),
    STRIPE_PRO_ANNUAL_PRICE_ID: z.string().optional(),
    STRIPE_TEAM_PRICE_ID: z.string().optional(),
    STRIPE_TEAM_ANNUAL_PRICE_ID: z.string().optional(),
    STRIPE_TEAM_SEAT_PRICE_ID: z.string().optional(),

    // JWT - HS256 (legacy, deprecated)
    JWT_SECRET: z.string().optional(),
    JWT_ISSUER: z.string().default('https://api.constructs.network'),

    // JWT - RS256 (preferred)
    // @see sdd-license-jwt-rs256.md §4.1 New Environment Variables
    // Base64-encoded PEM keys for RS256 signing
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    JWT_KEY_ID: z.string().default('key-2026-02'),

    // OAuth
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Email
    RESEND_API_KEY: z.string().optional(),

    // Monitoring
    SENTRY_DSN: z.string().url().optional(),
    POSTHOG_API_KEY: z.string().optional(),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .refine(
    (data) => {
      // In production, JWT_SECRET is required and must be at least 32 characters
      if (data.NODE_ENV === 'production') {
        return data.JWT_SECRET && data.JWT_SECRET.length >= 32;
      }
      return true;
    },
    {
      message: 'JWT_SECRET is required in production and must be at least 32 characters',
      path: ['JWT_SECRET'],
    }
  );

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = parseEnv();

/**
 * Check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if we're in test
 */
export const isTest = env.NODE_ENV === 'test';

// =============================================================================
// RS256 Key Helpers
// @see sdd-license-jwt-rs256.md §4.2 Key Loading Helpers
// =============================================================================

/**
 * Get RSA private key for JWT signing
 * @returns Decoded PEM string
 * @throws Error if not configured
 */
export function getPrivateKey(): string {
  if (!env.JWT_PRIVATE_KEY) {
    throw new Error('JWT_PRIVATE_KEY not configured');
  }
  return Buffer.from(env.JWT_PRIVATE_KEY, 'base64').toString('utf-8');
}

/**
 * Get RSA public key for JWT verification
 * @returns Decoded PEM string
 * @throws Error if not configured
 */
export function getPublicKey(): string {
  if (!env.JWT_PUBLIC_KEY) {
    throw new Error('JWT_PUBLIC_KEY not configured');
  }
  return Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf-8');
}

/**
 * Get current key ID for JWT kid header
 * @returns Key identifier string
 */
export function getKeyId(): string {
  return env.JWT_KEY_ID;
}

/**
 * Check if RS256 signing is available
 * @returns true if both private and public keys are configured
 */
export function isRS256Available(): boolean {
  return !!env.JWT_PRIVATE_KEY && !!env.JWT_PUBLIC_KEY;
}

/**
 * Check if HS256 fallback is available (deprecated)
 * @returns true if JWT_SECRET is configured
 */
export function isHS256Available(): boolean {
  return !!env.JWT_SECRET;
}
