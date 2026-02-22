-- Migration: Measurement Honesty — Signal Outcomes, Showcases, Fork Provenance
-- Cycle: cycle-035 — R&D Synthesis
-- @see grimoires/loa/sdd.md §3.1

-- 1. Add forked_from and skill_prose to packs
ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "forked_from" uuid REFERENCES "packs"("id");
ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "skill_prose" text;

CREATE INDEX IF NOT EXISTS "idx_packs_forked_from" ON "packs" ("forked_from") WHERE "forked_from" IS NOT NULL;

-- 2. Signal Outcomes table
CREATE TABLE IF NOT EXISTS "signal_outcomes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "signal_type" text NOT NULL,
  "signal_source" text NOT NULL,
  "signal_source_url" text,
  "predicted_impact" text NOT NULL CHECK ("predicted_impact" IN ('high', 'medium', 'low')),
  "actual_impact" text CHECK ("actual_impact" IN ('high', 'medium', 'low', 'none')),
  "outcome_summary" text,
  "outcome_evidence" text,
  "recorded_by" uuid NOT NULL REFERENCES "users"("id"),
  "evaluated_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz DEFAULT now(),
  "evaluated_at" timestamptz,
  CONSTRAINT "no_self_evaluation" CHECK ("recorded_by" IS DISTINCT FROM "evaluated_by"),
  CONSTRAINT "unique_signal_evaluation" UNIQUE ("pack_id", "signal_type", "signal_source")
);

CREATE INDEX IF NOT EXISTS "idx_signal_outcomes_pack" ON "signal_outcomes" ("pack_id");
CREATE INDEX IF NOT EXISTS "idx_signal_outcomes_evaluated" ON "signal_outcomes" ("evaluated_at") WHERE "evaluated_at" IS NOT NULL;

-- 3. Construct Showcases table
CREATE TABLE IF NOT EXISTS "construct_showcases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "url" varchar(2000) NOT NULL,
  "description" varchar(500),
  "submitted_by" uuid NOT NULL REFERENCES "users"("id"),
  "approved" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_construct_showcases_pack" ON "construct_showcases" ("pack_id");
CREATE INDEX IF NOT EXISTS "idx_construct_showcases_approved" ON "construct_showcases" ("pack_id", "approved") WHERE "approved" = true;
