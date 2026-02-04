/**
 * Seed script to publish all existing packs
 *
 * This fixes the issue where packs exist but have status='draft' instead of 'published',
 * causing them to not appear in the public /v1/constructs API.
 *
 * Root cause: createPack() defaults status to 'draft', and there's no automatic
 * publish mechanism. Packs must be manually published via admin API or this script.
 *
 * Related issues:
 * - #72: Registry API returning only 1 construct instead of expected 4
 * - #57: Database migrations not running automatically on Fly.io
 *
 * Usage: npx tsx src/db/seed-publish-packs.ts
 */

import { db, packs } from './index.js';
import { ne } from 'drizzle-orm';

async function seedPublishPacks() {
  console.log('Publishing all packs...\n');

  // First, show current status of all packs
  const allPacks = await db
    .select({
      slug: packs.slug,
      name: packs.name,
      status: packs.status,
      icon: packs.icon,
    })
    .from(packs);

  console.log('Current pack statuses:');
  for (const pack of allPacks) {
    const emoji = pack.status === 'published' ? '✓' : '✗';
    console.log(`  ${emoji} ${pack.slug}: ${pack.status} ${pack.icon || ''}`);
  }
  console.log('');

  // Publish all unpublished packs in a single query
  const unpublishedCount = allPacks.filter((p) => p.status !== 'published').length;
  if (unpublishedCount === 0) {
    console.log('All packs are already published!');
  } else {
    console.log(`Publishing ${unpublishedCount} pack(s)...`);

    const updated = await db
      .update(packs)
      .set({
        status: 'published',
        updatedAt: new Date(),
      })
      .where(ne(packs.status, 'published'))
      .returning({ slug: packs.slug, name: packs.name });

    for (const pack of updated) {
      console.log(`  ✓ Published: ${pack.slug} (${pack.name})`);
    }
  }

  // Show final status
  console.log('\nFinal pack statuses:');
  const finalPacks = await db
    .select({
      slug: packs.slug,
      status: packs.status,
      icon: packs.icon,
    })
    .from(packs);

  for (const pack of finalPacks) {
    const emoji = pack.status === 'published' ? '✓' : '✗';
    console.log(`  ${emoji} ${pack.slug}: ${pack.status} ${pack.icon || ''}`);
  }

  console.log('\nDone!');
}

seedPublishPacks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to publish packs:', error);
    process.exit(1);
  });
