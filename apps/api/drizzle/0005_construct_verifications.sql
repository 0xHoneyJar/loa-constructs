-- Migration: construct_verifications table + pending schema tables
-- Cycle: cycle-033 — Observer Verification Infrastructure
-- @see grimoires/loa/sdd.md §3.1 construct_verifications
--
-- NOTE: graduation_requests and categories already exist in 0000/0001 migrations.
-- Only creating tables that are in schema.ts but not yet migrated.

-- 1. construct_verifications (NEW)
CREATE TABLE IF NOT EXISTS "construct_verifications" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "verification_tier" varchar(20) NOT NULL
    CHECK ("verification_tier" IN ('UNVERIFIED', 'BACKTESTED', 'PROVEN')),
  "certificate_json" jsonb NOT NULL,
  "issued_by" varchar(100) NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_construct_verifications_pack"
  ON "construct_verifications" ("pack_id");
CREATE INDEX IF NOT EXISTS "idx_construct_verifications_latest"
  ON "construct_verifications" ("pack_id", "created_at");

-- 2. construct_identities (schema.ts — not yet migrated)
CREATE TABLE IF NOT EXISTS "construct_identities" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "persona_yaml" text,
  "expertise_yaml" text,
  "cognitive_frame" jsonb,
  "expertise_domains" jsonb,
  "voice_config" jsonb,
  "model_preferences" jsonb,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_construct_identities_pack"
  ON "construct_identities" ("pack_id");

-- 3. construct_reviews (schema.ts — not yet migrated)
CREATE TABLE IF NOT EXISTS "construct_reviews" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "title" varchar(200),
  "body" text,
  "author_response" text,
  "author_responded_at" timestamptz,
  "is_hidden" boolean DEFAULT false,
  "hidden_reason" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_construct_reviews_pack"
  ON "construct_reviews" ("pack_id");
CREATE INDEX IF NOT EXISTS "idx_construct_reviews_user"
  ON "construct_reviews" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_construct_reviews_unique"
  ON "construct_reviews" ("pack_id", "user_id");

-- 4. github_webhook_deliveries (schema.ts — not yet migrated)
CREATE TABLE IF NOT EXISTS "github_webhook_deliveries" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "delivery_id" varchar(100) NOT NULL,
  "received_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_github_webhook_delivery"
  ON "github_webhook_deliveries" ("delivery_id");

COMMENT ON TABLE "construct_verifications"
  IS 'Stores VerificationCertificates from external verifiers (Echelon). Append-only audit trail.';
