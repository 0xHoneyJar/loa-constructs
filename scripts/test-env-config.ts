#!/usr/bin/env npx tsx
/**
 * Test Environment Configuration
 * @see sprint.md T17.3: Verify API can start with minimum config
 *
 * Validates that the API can load with only required environment variables
 * and gracefully handles missing optional services.
 *
 * Usage:
 *   DATABASE_URL="..." JWT_SECRET="..." npx tsx scripts/test-env-config.ts
 */

import { env } from '../apps/api/src/config/env.ts';
import { isStripeConfigured } from '../apps/api/src/services/stripe.ts';
import { isRedisConfigured } from '../apps/api/src/services/redis.ts';

console.log(`\nEnvironment Configuration Test`);
console.log(`==============================\n`);

// Required vars
console.log('Required Environment Variables:');
console.log(`  DATABASE_URL: ${env.DATABASE_URL ? '✓ SET' : '✗ NOT SET'}`);
console.log(`  JWT_SECRET: ${env.JWT_SECRET ? `✓ SET (length: ${env.JWT_SECRET.length})` : '✗ NOT SET'}`);
console.log(`  NODE_ENV: ${env.NODE_ENV}`);

if (!env.DATABASE_URL) {
  console.log('\n✗ DATABASE_URL is required - API will not start\n');
  process.exit(1);
}

if (env.NODE_ENV === 'production' && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  console.log('\n✗ JWT_SECRET must be at least 32 characters in production\n');
  process.exit(1);
}

console.log('\nOptional Services (graceful degradation):');
console.log(`  Stripe: ${isStripeConfigured() ? '✓ Enabled' : '○ Disabled (billing routes will fail)'}`);
console.log(`  Redis: ${isRedisConfigured() ? '✓ Enabled' : '○ Disabled (rate limiting disabled)'}`);
console.log(`  R2 Storage: ${env.R2_ACCOUNT_ID ? '✓ Enabled' : '○ Disabled (DB storage fallback)'}`);
console.log(`  Email (Resend): ${env.RESEND_API_KEY ? '✓ Enabled' : '○ Disabled (emails skipped)'}`);
console.log(`  OAuth GitHub: ${env.GITHUB_CLIENT_ID ? '✓ Enabled' : '○ Disabled'}`);
console.log(`  OAuth Google: ${env.GOOGLE_CLIENT_ID ? '✓ Enabled' : '○ Disabled'}`);

console.log('\n✓ API can start with current configuration\n');

console.log('Soft Launch Capabilities:');
console.log('  - Authentication: ✓ JWT (password-based)');
console.log(`  - OAuth: ${env.GITHUB_CLIENT_ID || env.GOOGLE_CLIENT_ID ? '✓ Available' : '○ Manual user creation only'}`);
console.log(`  - Billing: ${isStripeConfigured() ? '✓ Stripe active' : '○ Manual subscription grants only'}`);
console.log(`  - Rate Limiting: ${isRedisConfigured() ? '✓ Active' : '○ Disabled'}`);
console.log(`  - Email: ${env.RESEND_API_KEY ? '✓ Active' : '○ Pre-verify users manually'}`);
console.log('');
