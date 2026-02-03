/**
 * Seed API Keys for Initial Users
 *
 * Creates users and generates API keys for CLI access.
 * Run: pnpm tsx scripts/seed-api-keys.ts
 *
 * IMPORTANT: Keys are only shown ONCE. Save them securely.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// --- Schema (inline to avoid import issues) ---

import { pgTable, uuid, varchar, boolean, timestamp, text, index } from 'drizzle-orm/pg-core';

const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  scopes: text('scopes').array().default(['read:skills', 'write:installs']),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revoked: boolean('revoked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- Config ---

const BCRYPT_COST = 10;

const USERS_TO_CREATE = [
  { name: 'zerker', email: 'zerker@honeyjar.xyz' },
  { name: 'zergucci', email: 'zergucci@honeyjar.xyz' },
  { name: 'jani', email: 'jani@honeyjar.xyz' },
];

// --- Helpers ---

function generateApiKey(): { key: string; prefix: string } {
  const prefix = process.env.NODE_ENV === 'production' ? 'sk_live_' : 'sk_test_';
  const random = crypto.randomUUID().replace(/-/g, '');
  const key = `${prefix}${random}`;
  return { key, prefix: key.substring(0, 12) };
}

async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_COST);
}

// --- Main ---

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  const results: { name: string; email: string; apiKey: string }[] = [];

  for (const userData of USERS_TO_CREATE) {
    console.log(`\n👤 Processing ${userData.name}...`);

    // Check if user exists
    let [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (!user) {
      // Create user
      console.log(`   Creating user...`);
      [user] = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          emailVerified: true, // Pre-verified for internal users
        })
        .returning({ id: users.id, email: users.email });
      console.log(`   ✅ User created: ${user.id}`);
    } else {
      console.log(`   User already exists: ${user.id}`);
    }

    // Generate API key
    const { key, prefix } = generateApiKey();
    const keyHash = await hashApiKey(key);

    // Store API key
    await db.insert(apiKeys).values({
      userId: user.id,
      keyPrefix: prefix,
      keyHash,
      name: `${userData.name}-cli`,
      scopes: ['read:skills', 'write:installs', 'read:packs'],
    });

    console.log(`   ✅ API key generated`);
    results.push({ name: userData.name, email: userData.email, apiKey: key });
  }

  // Output keys
  console.log('\n' + '='.repeat(60));
  console.log('🔑 API KEYS (SAVE THESE - SHOWN ONLY ONCE)');
  console.log('='.repeat(60) + '\n');

  for (const result of results) {
    console.log(`${result.name} (${result.email}):`);
    console.log(`   ${result.apiKey}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('\n📋 To use in Loa CLI:');
  console.log('   export LOA_CONSTRUCTS_API_KEY="sk_live_..."');
  console.log('   # or add to .env file\n');

  await client.end();
  console.log('✅ Done');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
