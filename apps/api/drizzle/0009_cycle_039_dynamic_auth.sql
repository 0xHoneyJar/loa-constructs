-- cycle-039: Dynamic Labs Auth — wallet_address + dynamic_user_id columns
-- @see sdd.md §4.1 Migration: 0009_cycle_039_dynamic_auth.sql

-- Add wallet address for Dynamic Labs wallet-based auth
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" varchar(42);

-- Add Dynamic Labs user ID for identity resolution
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dynamic_user_id" varchar(100);

-- Partial unique indexes (only index non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_wallet"
  ON "users" ("wallet_address")
  WHERE "wallet_address" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_dynamic"
  ON "users" ("dynamic_user_id")
  WHERE "dynamic_user_id" IS NOT NULL;
