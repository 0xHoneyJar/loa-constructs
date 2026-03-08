-- Migration: Public/Private Network Separation
-- Cycle: cycle-038
-- @see grimoires/loa/prd.md §FR-1 Visibility Enum
-- @see grimoires/loa/sdd.md §2.1–2.4

-- 1. Create visibility enum
DO $$ BEGIN
  CREATE TYPE "construct_visibility" AS ENUM ('public', 'internal', 'unlisted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create submission source enum
DO $$ BEGIN
  CREATE TYPE "pack_submission_source" AS ENUM ('org_sync', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add visibility and submission_source to packs
ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "visibility" construct_visibility DEFAULT 'internal';
ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "submission_source" pack_submission_source DEFAULT 'org_sync';

CREATE INDEX IF NOT EXISTS "idx_packs_visibility" ON "packs" ("visibility", "status");

-- 4. Add GitHub org membership columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_username" varchar(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_user_id" bigint;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_org_member" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_org_checked_at" timestamptz;

CREATE INDEX IF NOT EXISTS "idx_users_github_org" ON "users" ("github_org_member");

-- 5. Set existing org-synced packs to 'public'
-- All packs currently in the DB were org-synced (seeded from 0xHoneyJar repos).
-- The 'internal' default is for future external submissions pending review.
UPDATE "packs" SET "visibility" = 'public' WHERE "visibility" = 'internal';
