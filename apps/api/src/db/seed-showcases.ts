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

// Grounded in 3-agent ecosystem audit (2026-03-14) — only claims backed by grimoire artifacts
const SHOWCASES: ShowcaseEntry[] = [
  // Beehive
  {
    constructSlug: 'observer',
    title: 'Mibera Dimensions',
    url: 'https://midi.0xhoneyjar.xyz',
    description: '31 user canvases, 25 cognition profiles, 23 synthesis reports, 8 journeys',
  },
  {
    constructSlug: 'observer',
    title: 'Set and Forgetti',
    url: 'https://setandforgetti.0xhoneyjar.xyz',
    description: '11 user canvases, AI classifier routing feedback to Linear',
  },
  {
    constructSlug: 'observer',
    title: 'Moneycomb Vaults',
    url: 'https://moneycomb.0xhoneyjar.xyz',
    description: 'User canvases, vault interaction feedback, journey optimization',
  },
  {
    constructSlug: 'observer',
    title: 'RektDrop',
    url: 'https://rektdrop.0xhoneyjar.xyz',
    description: 'User journey mapping, experience flow analysis, feedback canvases',
  },
  // Artisan
  {
    constructSlug: 'artisan',
    title: 'Moneycomb Vaults',
    url: 'https://moneycomb.0xhoneyjar.xyz',
    description: 'taste.md constitution — OKLCH palette, motion laws, material tokens',
  },
  {
    constructSlug: 'artisan',
    title: 'Mibera Dimensions',
    url: 'https://midi.0xhoneyjar.xyz',
    description: 'taste.md visual identity, feedback patterns, inspiration moodboard',
  },
  {
    constructSlug: 'artisan',
    title: 'Set and Forgetti',
    url: 'https://setandforgetti.0xhoneyjar.xyz',
    description: 'taste.md design system, typography decisions, component feel',
  },
  {
    constructSlug: 'artisan',
    title: 'RektDrop',
    url: 'https://rektdrop.0xhoneyjar.xyz',
    description: '19 TDRs, taste.md, OKLCH palette, 83ms quantum, CRT material system',
  },
  // K-Hole
  {
    constructSlug: 'k-hole',
    title: 'Moneycomb Vaults',
    url: 'https://moneycomb.0xhoneyjar.xyz',
    description: '40+ deep research sessions feeding vocabulary bank and design decisions',
  },
  {
    constructSlug: 'k-hole',
    title: 'RektDrop',
    url: 'https://rektdrop.0xhoneyjar.xyz',
    description: 'Deep research sessions — Neuromancer vocabulary, tier system, Sprawl world-building',
  },
  // The Mint
  {
    constructSlug: 'the-mint',
    title: 'Moneycomb Vaults',
    url: 'https://moneycomb.0xhoneyjar.xyz',
    description: 'Generative asset pipeline — vault relics, textures, idle videos via Recraft + Kling',
  },
  {
    constructSlug: 'the-mint',
    title: 'Mibera Dimensions',
    url: 'https://midi.0xhoneyjar.xyz',
    description: 'Character generation pipeline and relic assets',
  },
  // The Easel
  {
    constructSlug: 'the-easel',
    title: 'Moneycomb Vaults',
    url: 'https://moneycomb.0xhoneyjar.xyz',
    description: '19 TDRs — full design world from typography to vault envelope model',
  },
  {
    constructSlug: 'the-easel',
    title: 'Mibera Dimensions',
    url: 'https://midi.0xhoneyjar.xyz',
    description: '11 TDRs, KAIROS persona, vocabulary atlas, design research',
  },
  {
    constructSlug: 'the-easel',
    title: 'Set and Forgetti',
    url: 'https://setandforgetti.0xhoneyjar.xyz',
    description: 'Visual direction, icon system, asset pipeline',
  },
  {
    constructSlug: 'the-easel',
    title: 'RektDrop',
    url: 'https://rektdrop.0xhoneyjar.xyz',
    description: 'Visual direction — CRT treatment, sigil particles, LED billboard spec',
  },
  // Herald
  {
    constructSlug: 'herald',
    title: 'Mibera Dimensions',
    url: 'https://midi.0xhoneyjar.xyz',
    description: '3 release announcements — v0.4, v0.5, v2.20.0',
  },
  // Mibera Codex
  {
    constructSlug: 'mibera-codex',
    title: 'Mibera Dimensions',
    url: 'https://midi.0xhoneyjar.xyz',
    description: 'Chronicle archive (2024-2026), taxonomy schema, dimension registry',
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
