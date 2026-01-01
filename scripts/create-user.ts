#!/usr/bin/env npx tsx
/**
 * Create User Script
 * @see sprint.md T17.1: Support script for user creation
 *
 * Creates a user account without requiring email verification.
 * Used for soft launch to create accounts for THJ team members.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/create-user.ts <email> <name> [password]
 *
 * Examples:
 *   npx tsx scripts/create-user.ts user@thehoneyjar.xyz "John Doe"
 *   npx tsx scripts/create-user.ts user@thehoneyjar.xyz "John Doe" "secure-password"
 */

import { db } from '../apps/api/src/db/index.ts';
import { users } from '../apps/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { randomUUID, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function createUser(email: string, name: string, password?: string): Promise<void> {
  console.log(`\nCreate User Script`);
  console.log(`==================\n`);

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Check if user already exists
  console.log(`Checking for existing user: ${email}`);
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    console.log(`\nUser already exists:`);
    console.log(`  ID: ${existing.id}`);
    console.log(`  Name: ${existing.name}`);
    console.log(`  Email: ${existing.email}`);
    console.log(`\nNo changes made. Use grant-subscription.ts to update their subscription.`);
    return;
  }

  // Generate password if not provided
  const userPassword = password || randomBytes(16).toString('hex');
  const passwordHash = await hashPassword(userPassword);

  // Create user
  console.log(`Creating user: ${name} <${email}>`);

  const [newUser] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      email: email.toLowerCase(),
      name: name,
      passwordHash: passwordHash,
      emailVerified: true, // Pre-verify for soft launch
      role: 'user',
    })
    .returning();

  console.log(`\n✓ User created successfully`);
  console.log(`\nUser Details:`);
  console.log(`  ID: ${newUser.id}`);
  console.log(`  Name: ${newUser.name}`);
  console.log(`  Email: ${newUser.email}`);
  console.log(`  Email Verified: true`);

  if (!password) {
    console.log(`\nGenerated Password: ${userPassword}`);
    console.log(`(Save this - it won't be shown again)`);
  }

  console.log(`\nNext: Grant them a subscription with:`);
  console.log(`  npx tsx scripts/grant-subscription.ts ${email} pro`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx tsx scripts/create-user.ts <email> <name> [password]');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/create-user.ts user@thehoneyjar.xyz "John Doe"');
  console.log('  npx tsx scripts/create-user.ts user@thehoneyjar.xyz "John Doe" "my-password"');
  process.exit(1);
}

const email = args[0];
const name = args[1];
const password = args[2];

// Validate email format
if (!email.includes('@')) {
  console.error('Error: Invalid email format');
  process.exit(1);
}

createUser(email, name, password).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
