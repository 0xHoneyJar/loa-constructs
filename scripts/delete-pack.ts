#!/usr/bin/env npx tsx
/**
 * Delete Pack Script
 * Deletes a pack by slug (cascade deletes versions and files)
 */

import { db } from '../apps/api/src/db/index.ts';
import { packs } from '../apps/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';

const slug = process.argv[2];

if (!slug) {
  console.log('Usage: npx tsx scripts/delete-pack.ts <slug>');
  process.exit(1);
}

async function deletePack() {
  const [pack] = await db.select().from(packs).where(eq(packs.slug, slug)).limit(1);
  if (!pack) {
    console.log(`Pack "${slug}" not found`);
    return;
  }

  console.log(`Found pack: ${pack.name} (${pack.id})`);

  // Delete pack (cascade will delete versions and files)
  await db.delete(packs).where(eq(packs.id, pack.id));
  console.log('Pack deleted successfully');
}

deletePack().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
