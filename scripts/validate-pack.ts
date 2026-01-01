#!/usr/bin/env npx tsx
/**
 * Validate GTM Collective pack in database
 * T16.3: Validate pack in API
 */

import { db } from '../apps/api/src/db/index.ts';
import { packs, packVersions, packFiles } from '../apps/api/src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function validatePack() {
  console.log('T16.3: Validating GTM Collective pack in database...\n');

  // Check pack exists
  const [pack] = await db.select().from(packs).where(eq(packs.slug, 'gtm-collective')).limit(1);

  if (!pack) {
    console.error('FAIL: Pack not found');
    process.exit(1);
  }

  console.log('Pack record:');
  console.log('  ID:', pack.id);
  console.log('  Name:', pack.name);
  console.log('  Slug:', pack.slug);
  console.log('  Status:', pack.status);
  console.log('  Pricing Type:', pack.pricingType);
  console.log('  Tier Required:', pack.tierRequired);
  console.log('  THJ Bypass:', pack.thjBypass);
  console.log('  Is Featured:', pack.isFeatured);

  // Check version
  const [version] = await db.select().from(packVersions).where(eq(packVersions.packId, pack.id)).limit(1);

  if (!version) {
    console.error('FAIL: Version not found');
    process.exit(1);
  }

  console.log('\nVersion record:');
  console.log('  ID:', version.id);
  console.log('  Version:', version.version);
  console.log('  Is Latest:', version.isLatest);
  console.log('  Min Loa Version:', version.minLoaVersion);
  console.log('  File Count:', version.fileCount);
  console.log('  Total Size:', version.totalSizeBytes, 'bytes');

  // Check files
  const files = await db.select().from(packFiles).where(eq(packFiles.versionId, version.id));

  console.log('\nFiles:', files.length, 'records');

  // Group by type
  const skills = files.filter(f => f.path.startsWith('skills/'));
  const commands = files.filter(f => f.path.startsWith('commands/'));

  console.log('  Skills files:', skills.length);
  console.log('  Command files:', commands.length);

  // List some files
  console.log('\nSample files:');
  files.slice(0, 5).forEach(f => {
    console.log('  -', f.path, '(' + f.sizeBytes + ' bytes)');
  });

  // Validate manifest
  const manifest = version.manifest as Record<string, unknown>;
  console.log('\nManifest validation:');
  console.log('  Skills in manifest:', (manifest.skills as unknown[])?.length || 0);
  console.log('  Commands in manifest:', (manifest.commands as unknown[])?.length || 0);
  console.log('  Tags:', (manifest.tags as string[])?.join(', ') || 'none');

  console.log('\n✓ T16.3 PASS: Pack validated successfully');
}

validatePack().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
