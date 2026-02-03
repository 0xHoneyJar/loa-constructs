/**
 * Seed script to publish existing packs
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
import { eq } from 'drizzle-orm';

const PACKS_TO_PUBLISH = [
  'observer',
  'crucible',
  'artisan',
  'gtm-collective',
  'sigil',
  'beacon', // renamed from llm-ready
];

async function seedPublishPacks() {
  console.log('Publishing packs...\n');

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

  // Update packs to published
  let hadError = false;
  for (const slug of PACKS_TO_PUBLISH) {
    try {
      const result = await db
        .update(packs)
        .set({
          status: 'published',
          updatedAt: new Date(),
        })
        .where(eq(packs.slug, slug))
        .returning({ slug: packs.slug, status: packs.status, name: packs.name });

      if (result.length > 0) {
        console.log(`  ✓ Published: ${slug} (${result[0].name})`);
      } else {
        console.log(`  - ${slug}: not found (skipped)`);
      }
    } catch (error) {
      hadError = true;
      console.error(`  ✗ ${slug}: ${error}`);
    }
  }

  if (hadError) {
    throw new Error('One or more pack updates failed');
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
