-- Rollback Migration: Remove pack_submissions table
-- Date: 2026-01-04
-- Description: Rollback script for pack_submissions migration

-- Drop indexes
DROP INDEX IF EXISTS idx_pack_submissions_pack;
DROP INDEX IF EXISTS idx_pack_submissions_status;
DROP INDEX IF EXISTS idx_pack_submissions_submitted;

-- Drop table
DROP TABLE IF EXISTS pack_submissions;

-- Drop enum type
DROP TYPE IF EXISTS pack_submission_status;
