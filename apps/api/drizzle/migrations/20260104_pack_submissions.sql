-- Migration: Add pack_submissions table
-- Date: 2026-01-04
-- Description: Add pack_submissions table for tracking submission history and review workflow
-- @see sdd-pack-submission.md §3.1

-- Create pack_submission_status enum
DO $$ BEGIN
  CREATE TYPE pack_submission_status AS ENUM ('submitted', 'approved', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create pack_submissions table
CREATE TABLE IF NOT EXISTS pack_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,

  -- Submission metadata
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  submission_notes TEXT,

  -- Review metadata
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  rejection_reason VARCHAR(50),

  -- Status
  status pack_submission_status NOT NULL DEFAULT 'submitted',

  -- Version at time of submission (for historical reference)
  version_id UUID REFERENCES pack_versions(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pack_submissions_pack ON pack_submissions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_submissions_status ON pack_submissions(status);
CREATE INDEX IF NOT EXISTS idx_pack_submissions_submitted ON pack_submissions(submitted_at DESC);

-- Add comments
COMMENT ON TABLE pack_submissions IS 'Tracks pack submission history for audit trail and review workflow';
COMMENT ON COLUMN pack_submissions.status IS 'Submission lifecycle: submitted -> approved/rejected/withdrawn';
COMMENT ON COLUMN pack_submissions.rejection_reason IS 'Categorized reason for rejection: quality_standards, incomplete_content, duplicate_functionality, policy_violation, security_concern, other';
