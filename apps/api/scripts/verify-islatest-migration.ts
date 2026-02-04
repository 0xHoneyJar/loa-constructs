/**
 * isLatest Migration Verification Script
 *
 * Runs pre-flight validation and optionally applies the migration.
 *
 * Usage:
 *   pnpm tsx scripts/verify-islatest-migration.ts              # Pre-flight only
 *   pnpm tsx scripts/verify-islatest-migration.ts --apply      # Apply migration
 *   pnpm tsx scripts/verify-islatest-migration.ts --verify     # Post-migration check
 *
 * @see grimoires/loa/prd.md §5.2 Database Migration
 * @see apps/api/src/db/migrations/0001_fix_islatest_constraint.sql
 */

import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const mode = process.argv[2] || '--preflight';

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);

  try {
    if (mode === '--preflight') {
      await runPreflight(sql);
    } else if (mode === '--apply') {
      await applyMigration(sql);
    } else if (mode === '--verify') {
      await verifyMigration(sql);
    } else {
      console.log('Usage:');
      console.log('  --preflight  Check for non-standard versions (default)');
      console.log('  --apply      Apply migration (fix data + add constraint)');
      console.log('  --verify     Verify migration success');
    }
  } finally {
    await sql.end();
  }
}

async function runPreflight(sql: postgres.Sql) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRE-FLIGHT VALIDATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check for non-standard versions in pack_versions
  const packVersions = await sql`
    SELECT id, pack_id, version
    FROM pack_versions
    WHERE version !~ '^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9.]+)?(\\+[a-zA-Z0-9.]+)?$'
  `;

  if (packVersions.length > 0) {
    console.log('⚠️  Non-standard versions in pack_versions:');
    packVersions.forEach((v) => console.log(`   - ${v.version} (pack_id: ${v.pack_id})`));
    console.log('');
  } else {
    console.log('✓ All pack_versions have valid semver format');
  }

  // Check for non-standard versions in skill_versions
  const skillVersions = await sql`
    SELECT id, skill_id, version
    FROM skill_versions
    WHERE version !~ '^[0-9]+\\.[0-9]+\\.[0-9]+(-[a-zA-Z0-9.]+)?(\\+[a-zA-Z0-9.]+)?$'
  `;

  if (skillVersions.length > 0) {
    console.log('⚠️  Non-standard versions in skill_versions:');
    skillVersions.forEach((v) => console.log(`   - ${v.version} (skill_id: ${v.skill_id})`));
    console.log('');
  } else {
    console.log('✓ All skill_versions have valid semver format');
  }

  // Check for duplicate isLatest in pack_versions
  const duplicatePackLatest = await sql`
    SELECT pack_id, COUNT(*) as cnt
    FROM pack_versions
    WHERE is_latest = true
    GROUP BY pack_id
    HAVING COUNT(*) > 1
  `;

  if (duplicatePackLatest.length > 0) {
    console.log('\n⚠️  Duplicate isLatest=true in pack_versions:');
    duplicatePackLatest.forEach((d) => console.log(`   - pack_id: ${d.pack_id} (${d.cnt} versions)`));
  } else {
    console.log('✓ No duplicate isLatest in pack_versions');
  }

  // Check for duplicate isLatest in skill_versions
  const duplicateSkillLatest = await sql`
    SELECT skill_id, COUNT(*) as cnt
    FROM skill_versions
    WHERE is_latest = true
    GROUP BY skill_id
    HAVING COUNT(*) > 1
  `;

  if (duplicateSkillLatest.length > 0) {
    console.log('\n⚠️  Duplicate isLatest=true in skill_versions:');
    duplicateSkillLatest.forEach((d) => console.log(`   - skill_id: ${d.skill_id} (${d.cnt} versions)`));
  } else {
    console.log('✓ No duplicate isLatest in skill_versions');
  }

  // Summary
  const hasIssues =
    packVersions.length > 0 ||
    skillVersions.length > 0 ||
    duplicatePackLatest.length > 0 ||
    duplicateSkillLatest.length > 0;

  console.log('\n═══════════════════════════════════════════════════════════');
  if (hasIssues) {
    console.log('  RESULT: Issues found - review before applying migration');
  } else {
    console.log('  RESULT: All checks passed - safe to apply migration');
    console.log('\n  Run: pnpm tsx scripts/verify-islatest-migration.ts --apply');
  }
  console.log('═══════════════════════════════════════════════════════════');
}

async function applyMigration(sql: postgres.Sql) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  APPLYING MIGRATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Fix pack_versions
  console.log('Step 1: Fixing pack_versions (keeping highest semver as isLatest)...');
  const packResult = await sql`
    WITH ranked AS (
      SELECT
        id,
        pack_id,
        version,
        ROW_NUMBER() OVER (
          PARTITION BY pack_id
          ORDER BY
            CAST(split_part(version, '.', 1) AS INTEGER) DESC,
            CAST(split_part(version, '.', 2) AS INTEGER) DESC,
            CAST(REGEXP_REPLACE(split_part(version, '.', 3), '[^0-9].*', '') AS INTEGER) DESC
        ) as rn
      FROM pack_versions
      WHERE is_latest = true
    )
    UPDATE pack_versions
    SET is_latest = false
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  `;
  console.log(`   ✓ Fixed ${packResult.length} pack_versions rows`);

  // Step 2: Fix skill_versions
  console.log('\nStep 2: Fixing skill_versions (keeping highest semver as isLatest)...');
  const skillResult = await sql`
    WITH ranked AS (
      SELECT
        id,
        skill_id,
        version,
        ROW_NUMBER() OVER (
          PARTITION BY skill_id
          ORDER BY
            CAST(split_part(version, '.', 1) AS INTEGER) DESC,
            CAST(split_part(version, '.', 2) AS INTEGER) DESC,
            CAST(REGEXP_REPLACE(split_part(version, '.', 3), '[^0-9].*', '') AS INTEGER) DESC
        ) as rn
      FROM skill_versions
      WHERE is_latest = true
    )
    UPDATE skill_versions
    SET is_latest = false
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  `;
  console.log(`   ✓ Fixed ${skillResult.length} skill_versions rows`);

  // Step 3: Add constraints
  console.log('\nStep 3: Adding partial unique constraints...');
  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_versions_single_latest
      ON pack_versions (pack_id) WHERE is_latest = true
    `;
    console.log('   ✓ Added idx_pack_versions_single_latest');
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log('   ✓ idx_pack_versions_single_latest already exists');
    } else {
      throw e;
    }
  }

  try {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_versions_single_latest
      ON skill_versions (skill_id) WHERE is_latest = true
    `;
    console.log('   ✓ Added idx_skill_versions_single_latest');
  } catch (e: any) {
    if (e.code === '42P07') {
      console.log('   ✓ idx_skill_versions_single_latest already exists');
    } else {
      throw e;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  MIGRATION COMPLETE');
  console.log('\n  Run: pnpm tsx scripts/verify-islatest-migration.ts --verify');
  console.log('═══════════════════════════════════════════════════════════');
}

async function verifyMigration(sql: postgres.Sql) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  POST-MIGRATION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check no duplicate isLatest in pack_versions
  const duplicatePackLatest = await sql`
    SELECT pack_id, COUNT(*) as cnt
    FROM pack_versions
    WHERE is_latest = true
    GROUP BY pack_id
    HAVING COUNT(*) > 1
  `;

  if (duplicatePackLatest.length > 0) {
    console.log('❌ Still have duplicate isLatest in pack_versions!');
    duplicatePackLatest.forEach((d) => console.log(`   - pack_id: ${d.pack_id} (${d.cnt})`));
  } else {
    console.log('✓ No duplicate isLatest in pack_versions');
  }

  // Check no duplicate isLatest in skill_versions
  const duplicateSkillLatest = await sql`
    SELECT skill_id, COUNT(*) as cnt
    FROM skill_versions
    WHERE is_latest = true
    GROUP BY skill_id
    HAVING COUNT(*) > 1
  `;

  if (duplicateSkillLatest.length > 0) {
    console.log('❌ Still have duplicate isLatest in skill_versions!');
    duplicateSkillLatest.forEach((d) => console.log(`   - skill_id: ${d.skill_id} (${d.cnt})`));
  } else {
    console.log('✓ No duplicate isLatest in skill_versions');
  }

  // Check constraints exist
  const packConstraint = await sql`
    SELECT indexname FROM pg_indexes
    WHERE indexname = 'idx_pack_versions_single_latest'
  `;

  if (packConstraint.length > 0) {
    console.log('✓ idx_pack_versions_single_latest constraint exists');
  } else {
    console.log('❌ idx_pack_versions_single_latest constraint missing!');
  }

  const skillConstraint = await sql`
    SELECT indexname FROM pg_indexes
    WHERE indexname = 'idx_skill_versions_single_latest'
  `;

  if (skillConstraint.length > 0) {
    console.log('✓ idx_skill_versions_single_latest constraint exists');
  } else {
    console.log('❌ idx_skill_versions_single_latest constraint missing!');
  }

  // Summary
  const success =
    duplicatePackLatest.length === 0 &&
    duplicateSkillLatest.length === 0 &&
    packConstraint.length > 0 &&
    skillConstraint.length > 0;

  console.log('\n═══════════════════════════════════════════════════════════');
  if (success) {
    console.log('  ✓ MIGRATION VERIFIED SUCCESSFULLY');
    console.log('\n  Next: Run seed script to sync Artisan pack content');
    console.log('        pnpm tsx scripts/seed-forge-packs.ts');
  } else {
    console.log('  ❌ VERIFICATION FAILED - check errors above');
  }
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
