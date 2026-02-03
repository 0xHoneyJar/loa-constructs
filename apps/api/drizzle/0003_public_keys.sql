-- Migration: Add public_keys table for RS256 JWT signature verification
-- Issue: #81 - License JWT uses HS256, validator expects RS256
-- @see sdd-license-jwt-rs256.md §3.1 Database Schema

CREATE TABLE IF NOT EXISTS "public_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_id" varchar(64) UNIQUE NOT NULL,
  "algorithm" varchar(16) NOT NULL DEFAULT 'RS256',
  "public_key" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "expires_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "is_current" boolean NOT NULL DEFAULT false
);

-- Index for key_id lookups (primary access pattern)
CREATE INDEX IF NOT EXISTS "idx_public_keys_key_id" ON "public_keys" ("key_id");

-- Index for finding current key
CREATE INDEX IF NOT EXISTS "idx_public_keys_is_current" ON "public_keys" ("is_current");

-- Comment on table
COMMENT ON TABLE "public_keys" IS 'RSA public keys for JWT signature verification (Issue #81)';
COMMENT ON COLUMN "public_keys"."key_id" IS 'Key identifier included in JWT kid header';
COMMENT ON COLUMN "public_keys"."is_current" IS 'Current key used for signing (only one should be true)';
