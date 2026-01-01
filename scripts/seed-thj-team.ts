#!/usr/bin/env npx tsx
/**
 * Seed THJ Team Users
 * @see sprint.md T17.5: Seed production database with THJ team
 *
 * Creates THJ team member accounts with pro subscriptions for soft launch.
 * Users are created with pre-verified emails and randomly generated passwords.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/seed-thj-team.ts
 *
 * Output:
 *   Creates users and prints credentials to save securely.
 */

import { db } from '../apps/api/src/db/index.ts';
import { users, subscriptions } from '../apps/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { randomUUID, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// THJ Team members to seed (update as needed)
const THJ_TEAM = [
  { email: 'admin@thehoneyjar.xyz', name: 'THJ Admin', tier: 'enterprise' as const },
  // Add more team members here:
  // { email: 'member1@thehoneyjar.xyz', name: 'Team Member 1', tier: 'pro' as const },
  // { email: 'member2@thehoneyjar.xyz', name: 'Team Member 2', tier: 'pro' as const },
];

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

interface CreatedUser {
  email: string;
  name: string;
  password: string;
  tier: string;
  userId: string;
}

async function seedThjTeam(): Promise<void> {
  console.log(`\nSeed THJ Team Script`);
  console.log(`===================\n`);

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const createdUsers: CreatedUser[] = [];
  const existingUsers: string[] = [];

  for (const member of THJ_TEAM) {
    console.log(`Processing: ${member.email}`);

    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, member.email.toLowerCase()))
      .limit(1);

    if (existing) {
      console.log(`  ⟳ User already exists (ID: ${existing.id})`);
      existingUsers.push(member.email);

      // Check/update subscription
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, existing.id))
        .limit(1);

      if (!existingSub || existingSub.tier !== member.tier) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

        if (existingSub) {
          await db
            .update(subscriptions)
            .set({
              tier: member.tier,
              status: 'active',
              currentPeriodEnd: oneYearFromNow,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, existingSub.id));
          console.log(`  ✓ Updated subscription to ${member.tier}`);
        } else {
          await db.insert(subscriptions).values({
            id: randomUUID(),
            userId: existing.id,
            tier: member.tier,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: oneYearFromNow,
            seats: 1,
          });
          console.log(`  ✓ Created ${member.tier} subscription`);
        }
      } else {
        console.log(`  ✓ Subscription already at ${member.tier}`);
      }

      continue;
    }

    // Generate password
    const password = randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: member.email.toLowerCase(),
        name: member.name,
        passwordHash: passwordHash,
        emailVerified: true,
        role: member.tier === 'enterprise' ? 'admin' : 'user',
      })
      .returning();

    console.log(`  ✓ User created (ID: ${newUser.id})`);

    // Create subscription
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await db.insert(subscriptions).values({
      id: randomUUID(),
      userId: newUser.id,
      tier: member.tier,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYearFromNow,
      seats: member.tier === 'team' ? 5 : 1,
    });

    console.log(`  ✓ ${member.tier} subscription created`);

    createdUsers.push({
      email: member.email,
      name: member.name,
      password: password,
      tier: member.tier,
      userId: newUser.id,
    });
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(60)}\n`);

  if (existingUsers.length > 0) {
    console.log(`Existing users (checked/updated): ${existingUsers.length}`);
    existingUsers.forEach((email) => console.log(`  - ${email}`));
    console.log('');
  }

  if (createdUsers.length > 0) {
    console.log(`New users created: ${createdUsers.length}`);
    console.log('');
    console.log('============================================================');
    console.log('CREDENTIALS - SAVE THESE SECURELY');
    console.log('============================================================');
    console.log('');

    for (const user of createdUsers) {
      console.log(`User: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Tier: ${user.tier}`);
      console.log(`  User ID: ${user.userId}`);
      console.log('');
    }

    console.log('IMPORTANT: These passwords will not be shown again!');
    console.log('Share credentials securely with team members.');
  } else {
    console.log('No new users created.');
  }

  console.log('');
}

seedThjTeam()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
