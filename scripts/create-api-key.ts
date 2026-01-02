#!/usr/bin/env npx tsx
/**
 * Create API Key Script
 * @see sdd.md §3.2 Entity: API Keys
 *
 * Creates an API key for a user to access the loa-registry CLI.
 * The key is displayed once and cannot be retrieved again.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/create-api-key.ts <email> [name]
 *
 * Examples:
 *   npx tsx scripts/create-api-key.ts user@thehoneyjar.xyz
 *   npx tsx scripts/create-api-key.ts user@thehoneyjar.xyz "CLI Access Key"
 */

import { db } from '../apps/api/src/db/index.ts';
import { users, apiKeys } from '../apps/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

const BCRYPT_COST_FACTOR = 12;

/**
 * Generate a new API key
 * Format: sk_live_{random} or sk_test_{random}
 */
function generateApiKey(): { key: string; prefix: string } {
  const isProduction = process.env.NODE_ENV === 'production';
  const prefix = isProduction ? 'sk_live_' : 'sk_test_';
  const random = randomUUID().replace(/-/g, '');
  const key = `${prefix}${random}`;
  return { key, prefix: key.substring(0, 12) };
}

/**
 * Hash an API key for storage
 */
async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_COST_FACTOR);
}

async function createApiKey(email: string, keyName: string): Promise<void> {
  console.log(`\nCreate API Key Script`);
  console.log(`=====================\n`);

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Find user by email
  console.log(`Looking up user: ${email}`);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    console.error(`Error: User not found with email: ${email}`);
    console.log('\nTo create a user first, run:');
    console.log(`  npx tsx scripts/create-user.ts ${email} "User Name"`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  // Generate API key
  console.log(`\nGenerating API key...`);
  const { key, prefix } = generateApiKey();
  const keyHash = await hashApiKey(key);

  // Store in database
  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId: user.id,
      keyPrefix: prefix,
      keyHash: keyHash,
      name: keyName,
      scopes: ['read:skills', 'write:installs', 'read:packs', 'write:packs'],
    })
    .returning();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`API KEY CREATED SUCCESSFULLY`);
  console.log(`${'='.repeat(60)}\n`);

  console.log(`User: ${user.name} <${user.email}>`);
  console.log(`Key Name: ${keyName}`);
  console.log(`Key ID: ${newKey.id}`);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`\n  API KEY: ${key}\n`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`\n⚠️  IMPORTANT: Save this key now - it cannot be retrieved again!\n`);

  console.log(`\nUsage with loa-registry CLI:`);
  console.log(`  loa login --api-key ${key}`);
  console.log(`\nOr set as environment variable:`);
  console.log(`  export LOA_API_KEY="${key}"`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: npx tsx scripts/create-api-key.ts <email> [name]');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/create-api-key.ts user@thehoneyjar.xyz');
  console.log('  npx tsx scripts/create-api-key.ts user@thehoneyjar.xyz "CLI Access Key"');
  process.exit(1);
}

const email = args[0];
const keyName = args[1] || 'CLI API Key';

// Validate email format
if (!email.includes('@')) {
  console.error('Error: Invalid email format');
  process.exit(1);
}

createApiKey(email, keyName).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
