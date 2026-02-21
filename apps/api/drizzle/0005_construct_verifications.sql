-- Migration: construct_verifications table + pending schema tables
-- Cycle: cycle-033 — Observer Verification Infrastructure
-- @see grimoires/loa/sdd.md §3.1 construct_verifications

-- 1. construct_verifications (NEW)
CREATE TABLE IF NOT EXISTS "construct_verifications" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "pack_id" uuid NOT NULL REFERENCES "packs"("id") ON DELETE CASCADE,
  "verification_tier" varchar(20) NOT NULL,
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

-- 2. Pending tables from schema.ts that may not be in production
-- These use CREATE TABLE IF NOT EXISTS for idempotency

-- construct_identities (schema.ts:1136-1155)
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

-- construct_reviews (schema.ts:1082-1107)
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

-- graduation_requests (schema.ts:1012-1060)
CREATE TABLE IF NOT EXISTS "graduation_requests" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "construct_type" varchar(10) NOT NULL,
  "construct_id" uuid NOT NULL,
  "current_maturity" "construct_maturity" NOT NULL,
  "target_maturity" "construct_maturity" NOT NULL,
  "requested_by" uuid NOT NULL REFERENCES "users"("id"),
  "requested_at" timestamptz DEFAULT now(),
  "request_notes" text,
  "criteria_snapshot" jsonb DEFAULT '{}',
  "reviewed_at" timestamptz,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "review_notes" text,
  "rejection_reason" varchar(50),
  "status" "graduation_request_status" DEFAULT 'pending',
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_graduation_requests_construct"
  ON "graduation_requests" ("construct_type", "construct_id");
CREATE INDEX IF NOT EXISTS "idx_graduation_requests_status"
  ON "graduation_requests" ("status");

-- github_webhook_deliveries (schema.ts:1115-1125)
CREATE TABLE IF NOT EXISTS "github_webhook_deliveries" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "delivery_id" varchar(100) NOT NULL,
  "received_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_github_webhook_delivery"
  ON "github_webhook_deliveries" ("delivery_id");

-- categories (schema.ts:1165-1181)
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "slug" varchar(50) UNIQUE NOT NULL,
  "label" varchar(100) NOT NULL,
  "color" varchar(7) NOT NULL,
  "description" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_slug"
  ON "categories" ("slug");
CREATE INDEX IF NOT EXISTS "idx_categories_sort_order"
  ON "categories" ("sort_order");

COMMENT ON TABLE "construct_verifications"
  IS 'Stores CalibrationCertificates from external verifiers (Echelon). Append-only audit trail.';
