-- Migration: trajectory_events + consumer_cursors (append-only audit stream)
-- SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §2.4.1, §4.2
-- ADR: ADR-005 (Postgres + JSONL sidecar trajectory transport)
-- FR: FR-4.3
-- Cycle: constructs-network-migration

-- Append-only event store backing the agent-to-agent trajectory transport.
-- Per ADR-005, Railway containers have ephemeral disk so the canonical store
-- is Postgres. The JSONL sidecar (apps/api/scripts/trajectory-flush.ts) uses
-- this same schema for local-dev hybrid emission via consumer_cursors.

CREATE TABLE "trajectory_events" (
  "event_id"          TEXT PRIMARY KEY,
  "aggregate_id"      TEXT NOT NULL,
  "aggregate_type"    TEXT NOT NULL CHECK ("aggregate_type" IN (
                        'agent','conversation','billing','tool','transfer','message',
                        'performance','governance','reputation','economy'
                      )),
  "type"              TEXT NOT NULL CHECK ("type" ~ '^[a-z]+\.[a-z_]+\.[a-z_]+$'),
  "payload"           JSONB NOT NULL,
  "occurred_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "actor"             TEXT NOT NULL,
  "contract_version"  TEXT NOT NULL CHECK ("contract_version" ~ '^\d+\.\d+\.\d+$'),
  "correlation_id"    TEXT,
  "causation_id"      TEXT,
  "metadata"          JSONB DEFAULT '{}'::jsonb,
  "inserted_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "trajectory_aggregate_idx"
  ON "trajectory_events" ("aggregate_id", "occurred_at" DESC);
CREATE INDEX "trajectory_type_idx"
  ON "trajectory_events" ("type", "occurred_at" DESC);
CREATE INDEX "trajectory_correlation_idx"
  ON "trajectory_events" ("correlation_id")
  WHERE "correlation_id" IS NOT NULL;

CREATE TABLE "consumer_cursors" (
  "consumer_slug"   TEXT PRIMARY KEY,
  "last_event_id"   TEXT NOT NULL REFERENCES "trajectory_events"("event_id"),
  "byte_offset"     BIGINT,
  "last_read_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only contract enforcement: only INSERT permitted on trajectory_events.
-- Cursor table allows UPDATE for read-position tracking.
CREATE OR REPLACE FUNCTION "trajectory_events_append_only"() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'trajectory_events is append-only · UPDATE/DELETE not permitted'
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trajectory_events_no_update"
  BEFORE UPDATE ON "trajectory_events"
  FOR EACH ROW EXECUTE FUNCTION "trajectory_events_append_only"();

CREATE TRIGGER "trajectory_events_no_delete"
  BEFORE DELETE ON "trajectory_events"
  FOR EACH ROW EXECUTE FUNCTION "trajectory_events_append_only"();
