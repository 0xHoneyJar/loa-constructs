/**
 * Seed script to update existing packs with their correct icons
 * Run after migration 0002_aromatic_meggan.sql
 *
 * Usage: npx tsx src/db/seed-pack-icons.ts
 */

import { db, packs } from './index.js';
import { eq } from 'drizzle-orm';

const PACK_ICONS: Record<string, string> = {
  observer: '👁️',
  crucible: '🧪',
  artisan: '🎨',
  'gtm-collective': '🚀',
  sigil: '🔷',
  beacon: '🔔',
};

async function seedPackIcons() {
  console.log('Updating pack icons...');

  let hadError = false;
  for (const [slug, icon] of Object.entries(PACK_ICONS)) {
    try {
      const result = await db
        .update(packs)
        .set({ icon })
        .where(eq(packs.slug, slug))
        .returning({ slug: packs.slug, icon: packs.icon });

      if (result.length > 0) {
        console.log(`  ✓ ${slug}: ${icon}`);
      } else {
        console.log(`  - ${slug}: not found (skipped)`);
      }
    } catch (error) {
      hadError = true;
      console.error(`  ✗ ${slug}: ${error}`);
    }
  }

  if (hadError) {
    throw new Error('One or more pack icon updates failed');
  }

  console.log('Done!');
}

seedPackIcons()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed pack icons:', error);
    process.exit(1);
  });
