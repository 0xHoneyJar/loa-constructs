#!/usr/bin/env tsx
/**
 * Backfill Published Packs Script
 * @see prd-infrastructure-migration.md §3.1.3 Fix Issue #72
 * @see sprint-infrastructure-migration.md T22.4
 *
 * Publishes draft packs that have at least one version.
 * This fixes packs that were created before the auto-publish feature.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-published-packs.ts --dry-run
 *   pnpm tsx scripts/backfill-published-packs.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, isNull, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// Import schema directly to avoid circular dependencies
import { packs, packVersions } from '../apps/api/src/db/schema.js';

// --- Configuration ---

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

// --- Database Connection ---

const client = postgres(DATABASE_URL, {
  prepare: false,
  max: 5,
});
const db = drizzle(client, { schema: { packs, packVersions } });

// --- Types ---

interface AffectedPack {
  id: string;
  slug: string;
  name: string;
  status: string;
  versionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AuditLogEntry {
  timestamp: string;
  action: 'backfill_publish';
  packId: string;
  packSlug: string;
  previousStatus: string;
  newStatus: 'published';
  versionCount: number;
  dryRun: boolean;
}

// --- Main Logic ---

async function findDraftPacksWithVersions(): Promise<AffectedPack[]> {
  // Find packs that are:
  // 1. status = 'draft'
  // 2. Have at least one version
  // 3. Not soft-deleted (deletedAt IS NULL)
  const results = await db
    .select({
      id: packs.id,
      slug: packs.slug,
      name: packs.name,
      status: packs.status,
      createdAt: packs.createdAt,
      updatedAt: packs.updatedAt,
      versionCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM pack_versions
        WHERE pack_versions.pack_id = ${packs.id}
      )`,
    })
    .from(packs)
    .where(
      and(
        eq(packs.status, 'draft'),
        isNull(packs.deletedAt)
      )
    );

  // Filter to only packs with versions
  return results.filter((p) => p.versionCount > 0);
}

async function publishPack(packId: string): Promise<void> {
  await db
    .update(packs)
    .set({
      status: 'published',
      updatedAt: new Date(),
    })
    .where(eq(packs.id, packId));
}

async function writeAuditLog(entries: AuditLogEntry[]): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backfill-audit-${timestamp}.json`;
  const filepath = path.join(process.cwd(), 'scripts', filename);

  await fs.promises.writeFile(filepath, JSON.stringify(entries, null, 2));
  return filepath;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Backfill Published Packs Script');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log('');

  // Find affected packs
  console.log('Finding draft packs with versions...');
  const affectedPacks = await findDraftPacksWithVersions();

  if (affectedPacks.length === 0) {
    console.log('No draft packs with versions found. Nothing to do.');
    await client.end();
    return;
  }

  console.log(`Found ${affectedPacks.length} pack(s) to publish:\n`);

  // Display affected packs
  const auditLog: AuditLogEntry[] = [];

  for (const pack of affectedPacks) {
    console.log(`  - ${pack.slug} (${pack.name})`);
    console.log(`    ID: ${pack.id}`);
    console.log(`    Versions: ${pack.versionCount}`);
    console.log(`    Created: ${pack.createdAt.toISOString()}`);
    console.log('');

    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'backfill_publish',
      packId: pack.id,
      packSlug: pack.slug,
      previousStatus: pack.status,
      newStatus: 'published',
      versionCount: pack.versionCount,
      dryRun: isDryRun,
    });
  }

  // Execute updates if not dry run
  if (!isDryRun) {
    console.log('Publishing packs...');
    for (const pack of affectedPacks) {
      await publishPack(pack.id);
      console.log(`  ✓ Published: ${pack.slug}`);
    }
    console.log('');
  }

  // Write audit log
  const auditPath = await writeAuditLog(auditLog);
  console.log(`Audit log written to: ${auditPath}`);

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total packs affected: ${affectedPacks.length}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);

  if (isDryRun) {
    console.log('');
    console.log('To apply changes, run without --dry-run flag:');
    console.log('  pnpm tsx scripts/backfill-published-packs.ts');
  }

  await client.end();
}

// Run
main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
