-- cycle-044: Add app_slug to api_keys for signal key routing
ALTER TABLE "api_keys" ADD COLUMN "app_slug" VARCHAR(100);
CREATE INDEX IF NOT EXISTS "idx_api_keys_app_slug" ON "api_keys" ("app_slug");
