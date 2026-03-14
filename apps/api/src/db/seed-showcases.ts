/**
 * Seed construct showcases — real products that used each construct.
 *
 * Usage: npx tsx src/db/seed-showcases.ts
 *
 * Inserts pre-approved showcase rows. Idempotent — skips existing entries
 * by matching (pack slug + url).
 */

import { db, packs, constructShowcases, users } from './index.js';
import { eq, and } from 'drizzle-orm';

interface ShowcaseEntry {
  constructSlug: string;
  title: string;
  url: string;
  description: string;
}

// Grounded in ecosystem survey — only claims we can back with evidence
const SHOWCASES: ShowcaseEntry[] = [
  {
    constructSlug: 'observer',
    title: 'Mibera Dimensions',
    url: 'https://mibera.honeycomb.fyi',
    description: '25 user research canvases, daily synthesis reports, 8 user journeys',
  },
  {
    constructSlug: 'observer',
    title: 'Set and Forgetti',
    url: 'https://setandforgetti.honeycomb.fyi',
    description: 'AI classifier routing user feedback to Linear with confidence scoring',
  },
  {
    constructSlug: 'artisan',
    title: 'MCV Interface',
    url: 'https://moneycombvaults.honeycomb.fyi',
    description: 'Geological material system — OKLCH palette, motion language, generative pipeline',
  },
  {
    constructSlug: 'artisan',
    title: 'Mibera Dimensions',
    url: 'https://mibera.honeycomb.fyi',
    description: 'Shared visual DNA — OKLCH chromatic engine and typography system',
  },
  {
    constructSlug: 'k-hole',
    title: 'MCV Interface',
    url: 'https://moneycombvaults.honeycomb.fyi',
    description: 'Depth research for design decisions and architectural direction',
  },
];

async function seedShowcases() {
  console.log('Seeding construct showcases...\n');

  // Get the first admin user to use as submitter
  const [adminUser] = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);

  if (!adminUser) {
    console.error('No users found in database. Run the main seed first.');
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  for (const entry of SHOWCASES) {
    // Look up pack by slug
    const [pack] = await db
      .select({ id: packs.id })
      .from(packs)
      .where(eq(packs.slug, entry.constructSlug))
      .limit(1);

    if (!pack) {
      console.log(`  - ${entry.constructSlug}: pack not found (skipped)`);
      skipped++;
      continue;
    }

    // Check if this showcase already exists (idempotent)
    const [existing] = await db
      .select({ id: constructShowcases.id })
      .from(constructShowcases)
      .where(
        and(
          eq(constructShowcases.packId, pack.id),
          eq(constructShowcases.url, entry.url),
        )
      )
      .limit(1);

    if (existing) {
      console.log(`  ~ ${entry.constructSlug} → ${entry.title}: already exists`);
      skipped++;
      continue;
    }

    // Insert as pre-approved
    await db.insert(constructShowcases).values({
      packId: pack.id,
      title: entry.title,
      url: entry.url,
      description: entry.description,
      submittedBy: adminUser.id,
      approved: true,
    });

    console.log(`  ✓ ${entry.constructSlug} → ${entry.title}`);
    inserted++;
  }

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

seedShowcases().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
