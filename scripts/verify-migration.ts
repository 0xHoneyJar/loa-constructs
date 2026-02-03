#!/usr/bin/env tsx
/**
 * Migration Verification Script
 * @see sdd-infrastructure-migration.md §5.1 Verification Tests
 * @see sprint-infrastructure-migration.md T22.5
 *
 * Verifies data integrity between source (Neon) and target (Supabase) databases.
 * Run after data migration to confirm successful transfer.
 *
 * Usage:
 *   SOURCE_URL="postgresql://..." TARGET_URL="postgresql://..." pnpm tsx scripts/verify-migration.ts
 */

import postgres from 'postgres';

// --- Configuration ---

const SOURCE_URL = process.env.SOURCE_URL;
const TARGET_URL = process.env.TARGET_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error('ERROR: Both SOURCE_URL and TARGET_URL environment variables are required');
  console.error('Usage: SOURCE_URL="..." TARGET_URL="..." pnpm tsx scripts/verify-migration.ts');
  process.exit(1);
}

// --- Database Connections ---

const sourceDb = postgres(SOURCE_URL, { prepare: false, max: 3 });
const targetDb = postgres(TARGET_URL, { prepare: false, max: 3 });

// --- Types ---

interface TableCount {
  table: string;
  sourceCount: number;
  targetCount: number;
  match: boolean;
}

interface ChecksumResult {
  table: string;
  column: string;
  sourceChecksum: string | null;
  targetChecksum: string | null;
  match: boolean;
}

interface VerificationResult {
  tableCounts: TableCount[];
  checksums: ChecksumResult[];
  criticalRecords: {
    name: string;
    passed: boolean;
    details: string;
  }[];
  passed: boolean;
}

// --- Verification Functions ---

/**
 * Get row count for a table
 */
async function getTableCount(db: postgres.Sql, table: string): Promise<number> {
  const [result] = await db`SELECT COUNT(*)::int as count FROM ${db(table)}`;
  return result.count;
}

/**
 * Get MD5 checksum of a column's concatenated values
 */
async function getColumnChecksum(
  db: postgres.Sql,
  table: string,
  column: string,
  orderBy: string = 'id'
): Promise<string | null> {
  try {
    const [result] = await db`
      SELECT MD5(STRING_AGG(${db(column)}::text, ',' ORDER BY ${db(orderBy)})) as checksum
      FROM ${db(table)}
    `;
    return result.checksum;
  } catch {
    return null;
  }
}

/**
 * Verify table row counts match
 */
async function verifyTableCounts(): Promise<TableCount[]> {
  const tables = [
    'users',
    'sessions',
    'teams',
    'team_members',
    'skills',
    'skill_versions',
    'subscriptions',
    'packs',
    'pack_versions',
    'pack_files',
    'pack_installations',
    'categories',
    'construct_categories',
    'audit_events',
  ];

  const results: TableCount[] = [];

  for (const table of tables) {
    try {
      const sourceCount = await getTableCount(sourceDb, table);
      const targetCount = await getTableCount(targetDb, table);

      results.push({
        table,
        sourceCount,
        targetCount,
        match: sourceCount === targetCount,
      });
    } catch (err) {
      // Table might not exist in one of the databases
      results.push({
        table,
        sourceCount: -1,
        targetCount: -1,
        match: false,
      });
    }
  }

  return results;
}

/**
 * Verify critical column checksums
 */
async function verifyChecksums(): Promise<ChecksumResult[]> {
  const checks = [
    { table: 'users', column: 'email', orderBy: 'id' },
    { table: 'packs', column: 'slug', orderBy: 'id' },
    { table: 'skills', column: 'slug', orderBy: 'id' },
    { table: 'subscriptions', column: 'stripe_subscription_id', orderBy: 'id' },
  ];

  const results: ChecksumResult[] = [];

  for (const check of checks) {
    const sourceChecksum = await getColumnChecksum(sourceDb, check.table, check.column, check.orderBy);
    const targetChecksum = await getColumnChecksum(targetDb, check.table, check.column, check.orderBy);

    results.push({
      table: check.table,
      column: check.column,
      sourceChecksum,
      targetChecksum,
      match: sourceChecksum === targetChecksum,
    });
  }

  return results;
}

/**
 * Verify critical records exist
 */
async function verifyCriticalRecords(): Promise<{ name: string; passed: boolean; details: string }[]> {
  const results: { name: string; passed: boolean; details: string }[] = [];

  // Check published packs exist
  try {
    const [sourcePublished] = await sourceDb`
      SELECT COUNT(*)::int as count FROM packs WHERE status = 'published'
    `;
    const [targetPublished] = await targetDb`
      SELECT COUNT(*)::int as count FROM packs WHERE status = 'published'
    `;

    results.push({
      name: 'Published packs count',
      passed: sourcePublished.count === targetPublished.count,
      details: `Source: ${sourcePublished.count}, Target: ${targetPublished.count}`,
    });
  } catch (err) {
    results.push({
      name: 'Published packs count',
      passed: false,
      details: `Error: ${err}`,
    });
  }

  // Check active subscriptions
  try {
    const [sourceActive] = await sourceDb`
      SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active'
    `;
    const [targetActive] = await targetDb`
      SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active'
    `;

    results.push({
      name: 'Active subscriptions count',
      passed: sourceActive.count === targetActive.count,
      details: `Source: ${sourceActive.count}, Target: ${targetActive.count}`,
    });
  } catch (err) {
    results.push({
      name: 'Active subscriptions count',
      passed: false,
      details: `Error: ${err}`,
    });
  }

  // Check latest pack versions marked correctly
  try {
    const [sourceLatest] = await sourceDb`
      SELECT COUNT(*)::int as count FROM pack_versions WHERE is_latest = true
    `;
    const [targetLatest] = await targetDb`
      SELECT COUNT(*)::int as count FROM pack_versions WHERE is_latest = true
    `;

    results.push({
      name: 'Latest pack versions count',
      passed: sourceLatest.count === targetLatest.count,
      details: `Source: ${sourceLatest.count}, Target: ${targetLatest.count}`,
    });
  } catch (err) {
    results.push({
      name: 'Latest pack versions count',
      passed: false,
      details: `Error: ${err}`,
    });
  }

  return results;
}

// --- Main ---

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('Migration Verification Script');
  console.log('='.repeat(70));
  console.log('');

  const result: VerificationResult = {
    tableCounts: [],
    checksums: [],
    criticalRecords: [],
    passed: true,
  };

  // 1. Verify table counts
  console.log('1. Verifying table row counts...');
  console.log('-'.repeat(70));
  result.tableCounts = await verifyTableCounts();

  for (const tc of result.tableCounts) {
    const status = tc.match ? '✓' : '✗';
    const countInfo = tc.sourceCount === -1 ? 'ERROR' : `${tc.sourceCount} → ${tc.targetCount}`;
    console.log(`  ${status} ${tc.table.padEnd(25)} ${countInfo}`);
    if (!tc.match) result.passed = false;
  }
  console.log('');

  // 2. Verify checksums
  console.log('2. Verifying column checksums...');
  console.log('-'.repeat(70));
  result.checksums = await verifyChecksums();

  for (const cs of result.checksums) {
    const status = cs.match ? '✓' : '✗';
    console.log(`  ${status} ${cs.table}.${cs.column}`);
    if (!cs.match) {
      console.log(`      Source: ${cs.sourceChecksum}`);
      console.log(`      Target: ${cs.targetChecksum}`);
      result.passed = false;
    }
  }
  console.log('');

  // 3. Verify critical records
  console.log('3. Verifying critical records...');
  console.log('-'.repeat(70));
  result.criticalRecords = await verifyCriticalRecords();

  for (const cr of result.criticalRecords) {
    const status = cr.passed ? '✓' : '✗';
    console.log(`  ${status} ${cr.name}: ${cr.details}`);
    if (!cr.passed) result.passed = false;
  }
  console.log('');

  // Summary
  console.log('='.repeat(70));
  console.log('VERIFICATION RESULT');
  console.log('='.repeat(70));

  if (result.passed) {
    console.log('');
    console.log('  ✓ ALL CHECKS PASSED');
    console.log('');
    console.log('  Migration verified successfully.');
    console.log('  Safe to proceed with cutover.');
  } else {
    console.log('');
    console.log('  ✗ VERIFICATION FAILED');
    console.log('');
    console.log('  Some checks did not pass. Review the output above.');
    console.log('  DO NOT proceed with cutover until issues are resolved.');
  }

  console.log('');

  // Cleanup
  await sourceDb.end();
  await targetDb.end();

  // Exit with appropriate code
  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
