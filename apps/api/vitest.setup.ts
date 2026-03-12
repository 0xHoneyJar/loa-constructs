/**
 * Vitest Setup File
 *
 * Configures test environment variables before tests run.
 * This ensures tests have all required env vars without needing CI secrets.
 */

// Set test environment variables if not already set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only-32chars!';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Prevent Redis.fromEnv() from reading real credentials in tests
// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// Only set to empty when undefined — don't clobber intentional test values
if (process.env.UPSTASH_REDIS_REST_URL === undefined) {
  process.env.UPSTASH_REDIS_REST_URL = '';
}
if (process.env.UPSTASH_REDIS_REST_TOKEN === undefined) {
  process.env.UPSTASH_REDIS_REST_TOKEN = '';
}
