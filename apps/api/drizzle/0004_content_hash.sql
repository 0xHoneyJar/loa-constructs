-- Migration: Add content_hash column to pack_versions for divergence detection
-- Cycle: cycle-032 — Construct Lifecycle
-- @see grimoires/loa/sdd.md §5.3 Content Hash Endpoint

ALTER TABLE "pack_versions" ADD COLUMN IF NOT EXISTS "content_hash" text;

-- Index for hash lookups on latest versions (primary access pattern for divergence detection)
CREATE INDEX IF NOT EXISTS "idx_pack_versions_content_hash"
  ON "pack_versions" ("pack_id", "content_hash")
  WHERE "is_latest" = true;

COMMENT ON COLUMN "pack_versions"."content_hash" IS 'SHA-256 hash of version content for divergence detection (cycle-032)';
