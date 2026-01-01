#!/usr/bin/env npx tsx
/**
 * Grant Subscription Script
 * @see sprint.md T17.1: Create Admin Subscription Seeding Script
 *
 * Grants a subscription tier to a user by email address.
 * Used for soft launch to give access without Stripe billing.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/grant-subscription.ts <email> [tier]
 *
 * Examples:
 *   npx tsx scripts/grant-subscription.ts user@example.com        # Grants 'pro' tier
 *   npx tsx scripts/grant-subscription.ts user@example.com pro    # Grants 'pro' tier
 *   npx tsx scripts/grant-subscription.ts user@example.com team   # Grants 'team' tier
 *   npx tsx scripts/grant-subscription.ts user@example.com enterprise
 */

import { db } from '../apps/api/src/db/index.ts';
import { users, subscriptions } from '../apps/api/src/db/schema.ts';
import { eq, and, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';

const VALID_TIERS: SubscriptionTier[] = ['free', 'pro', 'team', 'enterprise'];

async function grantSubscription(email: string, tier: SubscriptionTier): Promise<void> {
  console.log(`\nGrant Subscription Script`);
  console.log(`========================\n`);

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
    console.log('\nTo create a user, they must register via the API first.');
    console.log('Or create them manually with:');
    console.log(`  npx tsx scripts/create-user.ts ${email} "User Name"`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  // Check for existing subscription
  const [existingSub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        or(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.status, 'trialing')
        )
      )
    )
    .limit(1);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  if (existingSub) {
    // Update existing subscription
    console.log(`\nUpdating existing subscription (${existingSub.id})`);
    console.log(`  Current tier: ${existingSub.tier}`);
    console.log(`  New tier: ${tier}`);

    await db
      .update(subscriptions)
      .set({
        tier: tier,
        status: 'active',
        currentPeriodEnd: oneYearFromNow,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existingSub.id));

    console.log(`\n✓ Subscription updated successfully`);
  } else {
    // Create new subscription
    console.log(`\nCreating new subscription`);
    console.log(`  Tier: ${tier}`);

    const [newSub] = await db
      .insert(subscriptions)
      .values({
        id: randomUUID(),
        userId: user.id,
        tier: tier,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYearFromNow,
        seats: 1,
      })
      .returning();

    console.log(`\n✓ Subscription created successfully`);
    console.log(`  Subscription ID: ${newSub.id}`);
  }

  console.log(`\nSubscription Details:`);
  console.log(`  User: ${user.name} <${user.email}>`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Tier: ${tier}`);
  console.log(`  Status: active`);
  console.log(`  Expires: ${oneYearFromNow.toISOString()}`);
  console.log(`\nThe user can now access ${tier}-tier packs.`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: npx tsx scripts/grant-subscription.ts <email> [tier]');
  console.log('\nTiers: free, pro, team, enterprise (default: pro)');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/grant-subscription.ts user@example.com');
  console.log('  npx tsx scripts/grant-subscription.ts user@example.com pro');
  console.log('  npx tsx scripts/grant-subscription.ts user@example.com enterprise');
  process.exit(1);
}

const email = args[0];
const tier = (args[1] || 'pro') as SubscriptionTier;

// Validate email format
if (!email.includes('@')) {
  console.error('Error: Invalid email format');
  process.exit(1);
}

// Validate tier
if (!VALID_TIERS.includes(tier)) {
  console.error(`Error: Invalid tier "${tier}". Valid tiers: ${VALID_TIERS.join(', ')}`);
  process.exit(1);
}

grantSubscription(email, tier).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
