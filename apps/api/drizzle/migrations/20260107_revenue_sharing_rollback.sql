-- Rollback Sprint 25: Revenue Sharing Foundation (v1.1)

-- Drop tables
DROP TABLE IF EXISTS creator_payouts;
DROP TABLE IF EXISTS pack_download_attributions;

-- Remove columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS payout_threshold_cents;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_connect_onboarding_complete;
ALTER TABLE users DROP COLUMN IF EXISTS stripe_connect_account_id;
