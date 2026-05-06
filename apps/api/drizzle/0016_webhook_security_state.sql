-- Migration: webhook_nonces + rate_limit_buckets + last_known_registry
-- SDD: grimoires/loa/sdd-constructs-network-migration-2026-05-05.md §4.2.5
-- ADR: ADR-007 (Postgres-backed webhook nonces + rate-limit + registry cache)
-- FR: FR-1.6.2 (replay protection) · FR-1.6.3 (rate limit) · FR-1.6.4 (integrity)
-- Cycle: constructs-network-migration

-- Closes flatline-SDD CRITICAL 850 + HIGH 760+720+705: in-memory state on
-- Railway containers is lost on restart and doesn't work cross-replica.
-- Postgres-backing makes these safe for both single-instance Hono today
-- and future horizontal scaling without code changes.

CREATE TABLE "webhook_nonces" (
  "nonce"         TEXT PRIMARY KEY,
  "received_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expires_at"    TIMESTAMPTZ NOT NULL
);
CREATE INDEX "webhook_nonces_expires_idx" ON "webhook_nonces" ("expires_at");

-- Cleanup contract (ops): a 10-minute interval worker (Hono setInterval or
-- separate cron service) runs:
--   DELETE FROM webhook_nonces WHERE expires_at < NOW();
-- 5-minute TTL is enforced by inserting expires_at = received_at + 5 min.

CREATE TABLE "rate_limit_buckets" (
  "source_ip"       TEXT PRIMARY KEY,
  "tokens"          DOUBLE PRECISION NOT NULL DEFAULT 60.0,
  "refilled_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "blocked_until"   TIMESTAMPTZ
);
CREATE INDEX "rate_limit_blocked_idx"
  ON "rate_limit_buckets" ("blocked_until")
  WHERE "blocked_until" IS NOT NULL;

-- Token-bucket math is atomic via INSERT ... ON CONFLICT DO UPDATE.
-- 60 tokens/hour = 1 token/min average refill. Blocked rows survive 1 hour
-- via blocked_until then unblock. Cleanup cron drops idle rows:
--   DELETE FROM rate_limit_buckets
--     WHERE refilled_at < NOW() - INTERVAL '24 hours' AND blocked_until IS NULL;

CREATE TABLE "last_known_registry" (
  "id"              SERIAL PRIMARY KEY,
  "commit_sha"      TEXT NOT NULL,
  "content_hash"    TEXT NOT NULL,
  "fetched_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "payload_yaml"    TEXT NOT NULL,
  "entries_count"   INTEGER NOT NULL,
  CONSTRAINT "last_known_registry_singleton" CHECK ("id" = 1)
);

-- Singleton row (id = 1 always) — UPSERT pattern:
--   INSERT INTO last_known_registry (id, commit_sha, ...) VALUES (1, ...)
--   ON CONFLICT (id) DO UPDATE SET commit_sha = EXCLUDED.commit_sha, ...;
-- Serves two purposes:
--   1. Cross-restart cache: seeds new container's in-mem cache faster than
--      fetching from gh raw (also survives gh outages)
--   2. Audit trail: what registry data was served at any past point
