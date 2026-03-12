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
// Setting to empty ensures tests never hit real Redis
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
