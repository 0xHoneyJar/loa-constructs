CREATE TABLE `categories` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `discovery_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`dry_run` integer DEFAULT false NOT NULL,
	`constructs_found` integer DEFAULT 0 NOT NULL,
	`constructs_updated` integer DEFAULT 0 NOT NULL,
	`constructs_created` integer DEFAULT 0 NOT NULL,
	`errors` text,
	`triggered_by` text DEFAULT 'operational-token',
	`triggered_by_fingerprint` text,
	`triggered_by_ip` text,
	`triggered_by_user_agent` text
);
--> statement-breakpoint
CREATE INDEX `idx_discovery_runs_started` ON `discovery_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_discovery_runs_fingerprint` ON `discovery_runs` (`triggered_by_fingerprint`);--> statement-breakpoint
CREATE TABLE `packs` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`namespace` text NOT NULL,
	`version` text NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`category` text,
	`maturity` text DEFAULT 'experimental',
	`featured` integer DEFAULT false NOT NULL,
	`repo_url` text NOT NULL,
	`manifest` text,
	`readme` text,
	`owner_id` text,
	`owner_type` text,
	`source_type` text DEFAULT 'github',
	`construct_type` text,
	`view_count` integer DEFAULT 0 NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "chk_packs_visibility" CHECK("packs"."visibility" IN ('public', 'internal', 'unlisted')),
	CONSTRAINT "chk_packs_maturity" CHECK("packs"."maturity" IN ('experimental', 'beta', 'stable', 'deprecated')),
	CONSTRAINT "chk_packs_owner_type" CHECK("packs"."owner_type" IS NULL OR "packs"."owner_type" IN ('user', 'org')),
	CONSTRAINT "chk_packs_source_type" CHECK("packs"."source_type" IS NULL OR "packs"."source_type" IN ('github', 'registry', 'external'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `packs_slug_unique` ON `packs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_packs_slug` ON `packs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_packs_category` ON `packs` (`category`);--> statement-breakpoint
CREATE INDEX `idx_packs_visibility` ON `packs` (`visibility`);--> statement-breakpoint
CREATE INDEX `idx_packs_downloads` ON `packs` (`download_count`);--> statement-breakpoint
CREATE INDEX `idx_packs_views` ON `packs` (`view_count`);--> statement-breakpoint
CREATE INDEX `idx_packs_featured` ON `packs` (`featured`,`maturity`);--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY NOT NULL,
	`pack_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`slug` text NOT NULL,
	`path` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_skills_pack_id` ON `skills` (`pack_id`);--> statement-breakpoint
CREATE INDEX `idx_skills_slug` ON `skills` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_skills_pack_slug` ON `skills` (`pack_id`,`slug`);