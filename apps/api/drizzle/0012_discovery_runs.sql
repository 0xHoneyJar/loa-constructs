-- Migration: discovery_runs table + trust_level column
-- SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
-- Amendments: §14.3 (AC-A5 visibility preservation), §14.5 (trust_level evidence-only)
-- Cycle: loa-constructs-cycle-001

CREATE TABLE "discovery_runs" (
  "run_id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "status"              TEXT NOT NULL,
  "owner"               TEXT NOT NULL,
  "dry_run"             BOOLEAN NOT NULL DEFAULT false,
  "constructs_found"    INTEGER NOT NULL DEFAULT 0,
  "constructs_updated"  INTEGER NOT NULL DEFAULT 0,
  "constructs_skipped"  INTEGER NOT NULL DEFAULT 0,
  "error_message"       TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "completed_at"        TIMESTAMPTZ
);

ALTER TABLE "packs" ADD COLUMN "trust_level" VARCHAR(32);
