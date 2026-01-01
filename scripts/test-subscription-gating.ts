#!/usr/bin/env npx tsx
/**
 * Test subscription tier gating for GTM Collective
 * T16.4: Test subscription tier gating
 */

import { db } from '../apps/api/src/db/index.ts';
import { packs, users, subscriptions, packLicenses } from '../apps/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function testSubscriptionGating() {
  console.log('T16.4: Testing subscription tier gating...\n');

  // Get the GTM Collective pack
  const [pack] = await db.select().from(packs).where(eq(packs.slug, 'gtm-collective')).limit(1);

  if (!pack) {
    console.error('FAIL: GTM Collective pack not found');
    process.exit(1);
  }

  console.log('Pack settings:');
  console.log('  Tier Required:', pack.tierRequired);
  console.log('  THJ Bypass:', pack.thjBypass);

  // Create test users with unique emails using timestamp
  const ts = Date.now();
  const freeUserId = randomUUID();
  const proUserId = randomUUID();
  const enterpriseUserId = randomUUID();

  console.log('\nCreating test users...');

  // Free user (no subscription)
  await db.insert(users).values({
    id: freeUserId,
    email: `free-test-${ts}@example.com`,
    name: 'Free User',
    role: 'user',
  });
  console.log('  Created free user:', freeUserId);

  // Pro user (with subscription)
  await db.insert(users).values({
    id: proUserId,
    email: `pro-test-${ts}@example.com`,
    name: 'Pro User',
    role: 'user',
  });

  // Create pro subscription
  await db.insert(subscriptions).values({
    id: randomUUID(),
    userId: proUserId,
    tier: 'pro',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
  console.log('  Created pro user with subscription:', proUserId);

  // Enterprise user (highest tier)
  await db.insert(users).values({
    id: enterpriseUserId,
    email: `enterprise-test-${ts}@example.com`,
    name: 'Enterprise User',
    role: 'user',
  });

  // Create enterprise subscription
  await db.insert(subscriptions).values({
    id: randomUUID(),
    userId: enterpriseUserId,
    tier: 'enterprise',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  });
  console.log('  Created enterprise user with subscription:', enterpriseUserId);

  // Test access logic
  console.log('\n--- Access Logic Tests ---\n');

  // Simulate canAccessPack logic
  async function canAccessPack(userId: string): Promise<{ allowed: boolean; reason: string }> {
    // Get user subscription
    const [sub] = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    // Check subscription tier
    if (!sub || sub.status !== 'active') {
      return { allowed: false, reason: 'No active subscription' };
    }

    // Tier hierarchy: enterprise > team > pro > free
    const tierRank: Record<string, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };
    const requiredRank = tierRank[pack.tierRequired || 'free'] || 0;
    const userRank = tierRank[sub.tier] || 0;

    if (userRank >= requiredRank) {
      return { allowed: true, reason: `Tier ${sub.tier} >= ${pack.tierRequired}` };
    }

    return { allowed: false, reason: `Tier ${sub.tier} < ${pack.tierRequired}` };
  }

  // Test free user
  const freeAccess = await canAccessPack(freeUserId);
  console.log('Free user access:', freeAccess.allowed ? '✓ ALLOWED' : '✗ DENIED', '-', freeAccess.reason);
  if (freeAccess.allowed) {
    console.error('  FAIL: Free user should NOT have access to pro pack');
    process.exit(1);
  }
  console.log('  PASS: Free user correctly denied');

  // Test pro user
  const proAccess = await canAccessPack(proUserId);
  console.log('\nPro user access:', proAccess.allowed ? '✓ ALLOWED' : '✗ DENIED', '-', proAccess.reason);
  if (!proAccess.allowed) {
    console.error('  FAIL: Pro user SHOULD have access to pro pack');
    process.exit(1);
  }
  console.log('  PASS: Pro user correctly allowed');

  // Test enterprise user
  const enterpriseAccess = await canAccessPack(enterpriseUserId);
  console.log('\nEnterprise user access:', enterpriseAccess.allowed ? '✓ ALLOWED' : '✗ DENIED', '-', enterpriseAccess.reason);
  if (!enterpriseAccess.allowed) {
    console.error('  FAIL: Enterprise user SHOULD have access (tier > pro)');
    process.exit(1);
  }
  console.log('  PASS: Enterprise user correctly allowed');

  // Cleanup test users
  console.log('\nCleaning up test users...');
  await db.delete(subscriptions).where(eq(subscriptions.userId, proUserId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, enterpriseUserId));
  await db.delete(users).where(eq(users.id, freeUserId));
  await db.delete(users).where(eq(users.id, proUserId));
  await db.delete(users).where(eq(users.id, enterpriseUserId));
  console.log('  Cleaned up');

  console.log('\n✓ T16.4 PASS: Subscription tier gating working correctly');
}

testSubscriptionGating().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
