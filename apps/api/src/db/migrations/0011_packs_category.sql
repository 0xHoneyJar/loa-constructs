-- Migration: Add category column to packs table
-- Cycle: 041 — Network Cohesion
-- @see prd.md §FR-1 Category Derivation Pipeline
-- @see sdd.md §3.1 Migration

BEGIN;

-- 1. Add category column (VARCHAR not ENUM — avoids ALTER TYPE complexity)
ALTER TABLE packs ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- 2. Index for category filtering and counting
CREATE INDEX IF NOT EXISTS idx_packs_category ON packs(category);

-- 3. Backfill existing packs from search_use_cases[1] (which holds domain[0])
-- Validates against canonical 8-category taxonomy — unknown values default to 'development'
UPDATE packs SET category = CASE
  WHEN search_use_cases[1] IS NOT NULL THEN
    CASE lower(trim(search_use_cases[1]))
      WHEN 'marketing' THEN 'marketing'
      WHEN 'development' THEN 'development'
      WHEN 'security' THEN 'security'
      WHEN 'analytics' THEN 'analytics'
      WHEN 'documentation' THEN 'documentation'
      WHEN 'operations' THEN 'operations'
      WHEN 'design' THEN 'design'
      WHEN 'infrastructure' THEN 'infrastructure'
      WHEN 'gtm' THEN 'marketing'
      WHEN 'dev' THEN 'development'
      WHEN 'docs' THEN 'documentation'
      WHEN 'ops' THEN 'operations'
      WHEN 'data' THEN 'analytics'
      WHEN 'devops' THEN 'operations'
      WHEN 'infra' THEN 'infrastructure'
      ELSE 'development'
    END
  ELSE 'development'
END
WHERE category IS NULL;

COMMIT;
