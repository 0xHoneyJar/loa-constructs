-- Sprint 25: Revenue Sharing Foundation (v1.1)
-- @see sdd-pack-submission.md §3.1 Database Schema
-- @see prd-pack-submission.md §4.4 Revenue Sharing

-- Add Stripe Connect fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_threshold_cents INTEGER DEFAULT 5000;

-- Create pack_download_attributions table
CREATE TABLE IF NOT EXISTS pack_download_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),

  -- Download context
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Attribution metadata
  version_id UUID REFERENCES pack_versions(id),
  action VARCHAR(20) DEFAULT 'install'
);

-- Create indexes for pack_download_attributions
CREATE INDEX IF NOT EXISTS idx_pack_downloads_month ON pack_download_attributions(month);
CREATE INDEX IF NOT EXISTS idx_pack_downloads_pack ON pack_download_attributions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_downloads_user ON pack_download_attributions(user_id);

-- Create unique constraint (one attribution per user per pack per month)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_downloads_unique
  ON pack_download_attributions(pack_id, user_id, month);

-- Create creator_payouts table
CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payout details
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Stripe Connect reference
  stripe_transfer_id VARCHAR(100),

  -- Period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Status: pending, processing, completed, failed
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Breakdown (JSONB for flexibility)
  breakdown JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for creator_payouts
CREATE INDEX IF NOT EXISTS idx_creator_payouts_user ON creator_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_period ON creator_payouts(period_start, period_end);
