CREATE TYPE "public"."construct_maturity" AS ENUM('experimental', 'beta', 'stable', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."graduation_request_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."owner_type" AS ENUM('user', 'team');--> statement-breakpoint
CREATE TYPE "public"."pack_install_action" AS ENUM('install', 'update', 'uninstall');--> statement-breakpoint
CREATE TYPE "public"."pack_pricing_type" AS ENUM('free', 'one_time', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."pack_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."pack_submission_status" AS ENUM('submitted', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('development', 'devops', 'marketing', 'sales', 'support', 'analytics', 'security', 'other');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."usage_action" AS ENUM('install', 'update', 'load', 'uninstall');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"scopes" text[] DEFAULT '{"read:skills","write:installs"}',
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" uuid,
	"ip_address" "inet",
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"stripe_transfer_id" varchar(100),
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "graduation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"construct_type" varchar(10) NOT NULL,
	"construct_id" uuid NOT NULL,
	"current_maturity" "construct_maturity" NOT NULL,
	"target_maturity" "construct_maturity" NOT NULL,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now(),
	"request_notes" text,
	"criteria_snapshot" jsonb DEFAULT '{}'::jsonb,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_notes" text,
	"rejection_reason" varchar(50),
	"status" "graduation_request_status" DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"subscription_id" uuid,
	"watermark" varchar(100) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked" boolean DEFAULT false,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pack_download_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"downloaded_at" timestamp with time zone DEFAULT now(),
	"month" timestamp with time zone NOT NULL,
	"version_id" uuid,
	"action" varchar(20) DEFAULT 'install'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pack_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"path" varchar(500) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" varchar(100) DEFAULT 'text/plain',
	"content" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pack_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"action" "pack_install_action" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pack_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submission_notes" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_notes" text,
	"rejection_reason" varchar(50),
	"status" "pack_submission_status" DEFAULT 'submitted' NOT NULL,
	"version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pack_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"pack_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pack_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"changelog" text,
	"manifest" jsonb NOT NULL,
	"min_loa_version" varchar(50),
	"max_loa_version" varchar(50),
	"is_latest" boolean DEFAULT false,
	"published_at" timestamp with time zone,
	"total_size_bytes" integer DEFAULT 0,
	"file_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"long_description" text,
	"owner_id" uuid NOT NULL,
	"owner_type" "owner_type" DEFAULT 'user' NOT NULL,
	"pricing_type" "pack_pricing_type" DEFAULT 'free',
	"tier_required" "subscription_tier" DEFAULT 'free',
	"stripe_product_id" varchar(255),
	"stripe_monthly_price_id" varchar(255),
	"stripe_annual_price_id" varchar(255),
	"status" "pack_status" DEFAULT 'draft' NOT NULL,
	"review_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"repository_url" text,
	"homepage_url" text,
	"documentation_url" text,
	"is_featured" boolean DEFAULT false,
	"thj_bypass" boolean DEFAULT false,
	"downloads" integer DEFAULT 0,
	"rating_sum" integer DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"maturity" "construct_maturity" DEFAULT 'experimental',
	"graduated_at" timestamp with time zone,
	"graduation_notes" text,
	"search_keywords" text[] DEFAULT '{}'::text[],
	"search_use_cases" text[] DEFAULT '{}'::text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "packs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"path" varchar(500) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime_type" varchar(100) DEFAULT 'text/plain',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"version_id" uuid,
	"action" "usage_action" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"changelog" text,
	"min_loa_version" varchar(50),
	"is_latest" boolean DEFAULT false,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"long_description" text,
	"category" "skill_category" DEFAULT 'other',
	"tags" text[] DEFAULT '{}',
	"owner_id" uuid NOT NULL,
	"owner_type" "owner_type" DEFAULT 'user' NOT NULL,
	"tier_required" "subscription_tier" DEFAULT 'free' NOT NULL,
	"is_public" boolean DEFAULT true,
	"is_deprecated" boolean DEFAULT false,
	"repository_url" text,
	"documentation_url" text,
	"downloads" integer DEFAULT 0,
	"rating_sum" integer DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"maturity" "construct_maturity" DEFAULT 'experimental',
	"graduated_at" timestamp with time zone,
	"graduation_notes" text,
	"search_keywords" text[] DEFAULT '{}'::text[],
	"search_use_cases" text[] DEFAULT '{}'::text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"team_id" uuid,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false,
	"seats" integer DEFAULT 1,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"token" varchar(64) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"invited_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"accepted_at" timestamp with time zone,
	CONSTRAINT "team_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"invited_at" timestamp with time zone DEFAULT now(),
	"joined_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"owner_id" uuid NOT NULL,
	"avatar_url" text,
	"stripe_customer_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug"),
	CONSTRAINT "teams_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"name" varchar(255) NOT NULL,
	"avatar_url" text,
	"email_verified" boolean DEFAULT false,
	"oauth_provider" varchar(50),
	"oauth_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"stripe_connect_account_id" varchar(100),
	"stripe_connect_onboarding_complete" boolean DEFAULT false,
	"payout_threshold_cents" integer DEFAULT 5000,
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "graduation_requests" ADD CONSTRAINT "graduation_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "graduation_requests" ADD CONSTRAINT "graduation_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_download_attributions" ADD CONSTRAINT "pack_download_attributions_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_download_attributions" ADD CONSTRAINT "pack_download_attributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_download_attributions" ADD CONSTRAINT "pack_download_attributions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_download_attributions" ADD CONSTRAINT "pack_download_attributions_version_id_pack_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."pack_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_files" ADD CONSTRAINT "pack_files_version_id_pack_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_installations" ADD CONSTRAINT "pack_installations_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_installations" ADD CONSTRAINT "pack_installations_version_id_pack_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."pack_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_installations" ADD CONSTRAINT "pack_installations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_installations" ADD CONSTRAINT "pack_installations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_submissions" ADD CONSTRAINT "pack_submissions_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_submissions" ADD CONSTRAINT "pack_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_submissions" ADD CONSTRAINT "pack_submissions_version_id_pack_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."pack_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_subscriptions" ADD CONSTRAINT "pack_subscriptions_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_subscriptions" ADD CONSTRAINT "pack_subscriptions_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pack_versions" ADD CONSTRAINT "pack_versions_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packs" ADD CONSTRAINT "packs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_files" ADD CONSTRAINT "skill_files_version_id_skill_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."skill_versions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_usage" ADD CONSTRAINT "skill_usage_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_usage" ADD CONSTRAINT "skill_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_usage" ADD CONSTRAINT "skill_usage_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_usage" ADD CONSTRAINT "skill_usage_version_id_skill_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."skill_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_user" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_team" ON "audit_logs" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creator_payouts_user" ON "creator_payouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creator_payouts_status" ON "creator_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_creator_payouts_period" ON "creator_payouts" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_graduation_requests_construct" ON "graduation_requests" USING btree ("construct_type","construct_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_graduation_requests_status" ON "graduation_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_graduation_requests_pending" ON "graduation_requests" USING btree ("status") WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_graduation_requests_pending_unique" ON "graduation_requests" USING btree ("construct_type","construct_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licenses_user" ON "licenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licenses_skill" ON "licenses" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_licenses_watermark" ON "licenses" USING btree ("watermark");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_downloads_month" ON "pack_download_attributions" USING btree ("month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_downloads_pack" ON "pack_download_attributions" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_downloads_user" ON "pack_download_attributions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pack_downloads_unique" ON "pack_download_attributions" USING btree ("pack_id","user_id","month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_files_version" ON "pack_files" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pack_files_unique_path" ON "pack_files" USING btree ("version_id","path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_installations_pack" ON "pack_installations" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_installations_user" ON "pack_installations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_installations_created" ON "pack_installations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_submissions_pack" ON "pack_submissions" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_submissions_status" ON "pack_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_submissions_submitted" ON "pack_submissions" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_subscriptions_sub" ON "pack_subscriptions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_subscriptions_pack" ON "pack_subscriptions" USING btree ("pack_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pack_subscriptions_unique" ON "pack_subscriptions" USING btree ("subscription_id","pack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_versions_pack" ON "pack_versions" USING btree ("pack_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pack_versions_unique" ON "pack_versions" USING btree ("pack_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pack_versions_latest" ON "pack_versions" USING btree ("pack_id") WHERE is_latest = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_slug" ON "packs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_owner" ON "packs" USING btree ("owner_id","owner_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_status" ON "packs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_featured" ON "packs" USING btree ("is_featured") WHERE is_featured = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_maturity" ON "packs" USING btree ("maturity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_search_keywords" ON "packs" USING gin ("search_keywords");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_packs_search_use_cases" ON "packs" USING gin ("search_use_cases");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_files_version" ON "skill_files" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_skill_files_unique_path" ON "skill_files" USING btree ("version_id","path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_usage_skill" ON "skill_usage" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_usage_user" ON "skill_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_usage_created" ON "skill_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_versions_skill" ON "skill_versions" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_skill_versions_unique" ON "skill_versions" USING btree ("skill_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skill_versions_latest" ON "skill_versions" USING btree ("skill_id") WHERE is_latest = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_slug" ON "skills" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_owner" ON "skills" USING btree ("owner_id","owner_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_category" ON "skills" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_tier" ON "skills" USING btree ("tier_required");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_maturity" ON "skills" USING btree ("maturity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_search_keywords" ON "skills" USING gin ("search_keywords");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_skills_search_use_cases" ON "skills" USING gin ("search_use_cases");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_team" ON "subscriptions" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_stripe" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_invitations_team" ON "team_invitations" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_invitations_email" ON "team_invitations" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_team_invitations_token" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_invitations_status" ON "team_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_members_team" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_team_members_user" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_team_members_unique" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_teams_slug" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_teams_owner" ON "teams" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_stripe_customer" ON "users" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_oauth" ON "users" USING btree ("oauth_provider","oauth_id");