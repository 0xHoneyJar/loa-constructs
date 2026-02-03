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
