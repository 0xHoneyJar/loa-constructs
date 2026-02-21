-- Migration: Add construct_type to packs table
-- Cycle: cycle-034 — Construct Lifecycle Type System
-- @see grimoires/loa/sdd.md §2.1

ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "construct_type" varchar(20) DEFAULT 'skill-pack';
CREATE INDEX IF NOT EXISTS "idx_packs_construct_type" ON "packs" ("construct_type");

-- Backfill: Set all existing packs to 'skill-pack' (they all are)
UPDATE "packs" SET "construct_type" = 'skill-pack' WHERE "construct_type" IS NULL;
