-- cycle-echelon: Add verifier role for external verification platforms (Tobias/Echelon)
-- Mirrors the is_admin pattern. Platform verifiers can submit VerificationCertificates
-- on any construct without being the pack owner.

ALTER TABLE "users" ADD COLUMN "is_verifier" boolean DEFAULT false;

-- Track who submitted each verification for audit trail
ALTER TABLE "construct_verifications" ADD COLUMN "submitted_by" uuid REFERENCES "users"("id");
