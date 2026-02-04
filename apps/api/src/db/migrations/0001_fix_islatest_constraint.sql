-- ============================================================
-- Migration: Fix isLatest data integrity and add constraint
-- Issue: #86
-- Date: 2026-02-03
--
-- PRE-FLIGHT: Run these validation queries first to check for
-- non-standard version strings that may fail semver parsing:
--
-- SELECT version FROM pack_versions
-- WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';
--
-- SELECT version FROM skill_versions
-- WHERE version !~ '^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$';
--
-- If rows are returned, handle them manually before running this migration.
-- ============================================================

-- STEP 1: Fix pack_versions - keep only highest semver as isLatest
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
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- STEP 2: Fix skill_versions - same pattern
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
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- STEP 3: Add partial unique constraints
-- These prevent future data corruption by ensuring only one isLatest=true per pack/skill
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_versions_single_latest
ON pack_versions (pack_id) WHERE is_latest = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_versions_single_latest
ON skill_versions (skill_id) WHERE is_latest = true;

-- STEP 4: Verification queries (run after migration to confirm success)
-- These should return 0 rows:
--
-- SELECT pack_id, COUNT(*) as cnt
-- FROM pack_versions
-- WHERE is_latest = true
-- GROUP BY pack_id
-- HAVING COUNT(*) > 1;
--
-- SELECT skill_id, COUNT(*) as cnt
-- FROM skill_versions
-- WHERE is_latest = true
-- GROUP BY skill_id
-- HAVING COUNT(*) > 1;
