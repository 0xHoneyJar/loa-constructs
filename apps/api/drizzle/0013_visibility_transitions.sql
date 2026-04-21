-- Migration: visibility_transitions audit table
-- SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
-- Amendments: §14.7 (visibility guard one-directional), §14.15
-- Cycle: loa-constructs-cycle-001

CREATE TABLE "visibility_transitions" (
  "transition_id"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pack_id"             UUID NOT NULL REFERENCES "packs"("id"),
  "from_visibility"     TEXT NOT NULL,
  "to_visibility"       TEXT NOT NULL,
  "source"              TEXT NOT NULL,
  "github_delivery_id"  TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);
