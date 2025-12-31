import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  inet,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

/**
 * Database Schema
 * @see sdd.md §3.2 Schema Design
 */

// --- Enums ---

export const teamRoleEnum = pgEnum('team_role', ['owner', 'admin', 'member']);

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'pro',
  'team',
  'enterprise',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'canceled',
  'trialing',
]);

export const skillCategoryEnum = pgEnum('skill_category', [
  'development',
  'devops',
  'marketing',
  'sales',
  'support',
  'analytics',
  'security',
  'other',
]);

export const ownerTypeEnum = pgEnum('owner_type', ['user', 'team']);

export const usageActionEnum = pgEnum('usage_action', [
  'install',
  'update',
  'load',
  'uninstall',
]);

export const packStatusEnum = pgEnum('pack_status', [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'deprecated',
]);

export const packPricingTypeEnum = pgEnum('pack_pricing_type', [
  'free',
  'one_time',
  'subscription',
]);

export const packInstallActionEnum = pgEnum('pack_install_action', [
  'install',
  'update',
  'uninstall',
]);

// --- Tables ---

/**
 * Users table
 * @see sdd.md §3.2 Entity: Users
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    emailVerified: boolean('email_verified').default(false),
    oauthProvider: varchar('oauth_provider', { length: 50 }),
    oauthId: varchar('oauth_id', { length: 255 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
    isAdmin: boolean('is_admin').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    stripeCustomerIdx: index('idx_users_stripe_customer').on(table.stripeCustomerId),
    oauthIdx: uniqueIndex('idx_users_oauth').on(table.oauthProvider, table.oauthId),
  })
);

/**
 * Teams table
 * @see sdd.md §3.2 Entity: Teams
 */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    avatarUrl: text('avatar_url'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugIdx: index('idx_teams_slug').on(table.slug),
    ownerIdx: index('idx_teams_owner').on(table.ownerId),
  })
);

/**
 * Team Members table
 * @see sdd.md §3.2 Entity: Team Members
 */
export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: teamRoleEnum('role').notNull().default('member'),
    invitedBy: uuid('invited_by').references(() => users.id),
    invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow(),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
  },
  (table) => ({
    teamIdx: index('idx_team_members_team').on(table.teamId),
    userIdx: index('idx_team_members_user').on(table.userId),
    uniqueMember: uniqueIndex('idx_team_members_unique').on(table.teamId, table.userId),
  })
);

/**
 * Subscriptions table
 * @see sdd.md §3.2 Entity: Subscriptions
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    tier: subscriptionTierEnum('tier').notNull().default('free'),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    seats: integer('seats').default(1),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_subscriptions_user').on(table.userId),
    teamIdx: index('idx_subscriptions_team').on(table.teamId),
    stripeIdx: index('idx_subscriptions_stripe').on(table.stripeSubscriptionId),
  })
);

/**
 * API Keys table
 * @see sdd.md §3.2 Entity: API Keys
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    scopes: text('scopes').array().default(['read:skills', 'write:installs']),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revoked: boolean('revoked').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_api_keys_user').on(table.userId),
    prefixIdx: index('idx_api_keys_prefix').on(table.keyPrefix),
  })
);

/**
 * Skills table
 * @see sdd.md §3.2 Entity: Skills
 */
export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    description: text('description'),
    longDescription: text('long_description'),
    category: skillCategoryEnum('category').default('other'),
    tags: text('tags').array().default([]),
    ownerId: uuid('owner_id').notNull(),
    ownerType: ownerTypeEnum('owner_type').notNull().default('user'),
    tierRequired: subscriptionTierEnum('tier_required').notNull().default('free'),
    isPublic: boolean('is_public').default(true),
    isDeprecated: boolean('is_deprecated').default(false),
    repositoryUrl: text('repository_url'),
    documentationUrl: text('documentation_url'),
    downloads: integer('downloads').default(0),
    ratingSum: integer('rating_sum').default(0),
    ratingCount: integer('rating_count').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugIdx: index('idx_skills_slug').on(table.slug),
    ownerIdx: index('idx_skills_owner').on(table.ownerId, table.ownerType),
    categoryIdx: index('idx_skills_category').on(table.category),
    tierIdx: index('idx_skills_tier').on(table.tierRequired),
  })
);

/**
 * Skill Versions table
 * @see sdd.md §3.2 Entity: Skill Versions
 */
export const skillVersions = pgTable(
  'skill_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    changelog: text('changelog'),
    minLoaVersion: varchar('min_loa_version', { length: 50 }),
    isLatest: boolean('is_latest').default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    skillIdx: index('idx_skill_versions_skill').on(table.skillId),
    uniqueVersion: uniqueIndex('idx_skill_versions_unique').on(table.skillId, table.version),
    latestIdx: index('idx_skill_versions_latest')
      .on(table.skillId)
      .where(sql`is_latest = true`),
  })
);

/**
 * Skill Files table
 * @see sdd.md §3.2 Entity: Skill Files
 */
export const skillFiles = pgTable(
  'skill_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => skillVersions.id, { onDelete: 'cascade' }),
    path: varchar('path', { length: 500 }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).default('text/plain'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    versionIdx: index('idx_skill_files_version').on(table.versionId),
    uniquePath: uniqueIndex('idx_skill_files_unique_path').on(table.versionId, table.path),
  })
);

/**
 * Skill Usage table
 * @see sdd.md §3.2 Entity: Skill Usage
 */
export const skillUsage = pgTable(
  'skill_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    versionId: uuid('version_id').references(() => skillVersions.id),
    action: usageActionEnum('action').notNull(),
    metadata: jsonb('metadata').default({}),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    skillIdx: index('idx_skill_usage_skill').on(table.skillId),
    userIdx: index('idx_skill_usage_user').on(table.userId),
    createdIdx: index('idx_skill_usage_created').on(table.createdAt),
  })
);

/**
 * Licenses table
 * @see sdd.md §3.2 Entity: Licenses
 */
export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id),
    watermark: varchar('watermark', { length: 100 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked: boolean('revoked').default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokeReason: text('revoke_reason'),
  },
  (table) => ({
    userIdx: index('idx_licenses_user').on(table.userId),
    skillIdx: index('idx_licenses_skill').on(table.skillId),
    watermarkIdx: index('idx_licenses_watermark').on(table.watermark),
  })
);

/**
 * Audit Logs table
 * @see sdd.md §3.2 Entity: Audit Logs
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: uuid('resource_id'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: index('idx_audit_logs_user').on(table.userId),
    teamIdx: index('idx_audit_logs_team').on(table.teamId),
    actionIdx: index('idx_audit_logs_action').on(table.action),
    createdIdx: index('idx_audit_logs_created').on(table.createdAt),
  })
);

/**
 * Team Invitations table
 * @see sprint.md T9.3: Invitation Flow
 */
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const teamInvitations = pgTable(
  'team_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: teamRoleEnum('role').notNull().default('member'),
    token: varchar('token', { length: 64 }).unique().notNull(),
    status: invitationStatusEnum('status').notNull().default('pending'),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  },
  (table) => ({
    teamIdx: index('idx_team_invitations_team').on(table.teamId),
    emailIdx: index('idx_team_invitations_email').on(table.email),
    tokenIdx: uniqueIndex('idx_team_invitations_token').on(table.token),
    statusIdx: index('idx_team_invitations_status').on(table.status),
  })
);

/**
 * Packs table
 * @see sdd-v2.md §3.1 Entity: Packs
 */
export const packs = pgTable(
  'packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    description: text('description'),
    longDescription: text('long_description'),
    ownerId: uuid('owner_id').notNull(),
    ownerType: ownerTypeEnum('owner_type').notNull().default('user'),

    // Pricing
    pricingType: packPricingTypeEnum('pricing_type').default('free'),
    tierRequired: subscriptionTierEnum('tier_required').default('free'),
    stripeProductId: varchar('stripe_product_id', { length: 255 }),
    stripeMonthlyPriceId: varchar('stripe_monthly_price_id', { length: 255 }),
    stripeAnnualPriceId: varchar('stripe_annual_price_id', { length: 255 }),

    // Status
    status: packStatusEnum('status').notNull().default('draft'),
    reviewNotes: text('review_notes'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    // Metadata
    repositoryUrl: text('repository_url'),
    homepageUrl: text('homepage_url'),
    documentationUrl: text('documentation_url'),
    isFeatured: boolean('is_featured').default(false),
    thjBypass: boolean('thj_bypass').default(false),

    // Stats
    downloads: integer('downloads').default(0),
    ratingSum: integer('rating_sum').default(0),
    ratingCount: integer('rating_count').default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    slugIdx: index('idx_packs_slug').on(table.slug),
    ownerIdx: index('idx_packs_owner').on(table.ownerId, table.ownerType),
    statusIdx: index('idx_packs_status').on(table.status),
    featuredIdx: index('idx_packs_featured')
      .on(table.isFeatured)
      .where(sql`is_featured = true`),
  })
);

/**
 * Pack Versions table
 * @see sdd-v2.md §3.1 Entity: Pack Versions
 */
export const packVersions = pgTable(
  'pack_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    version: varchar('version', { length: 50 }).notNull(),
    changelog: text('changelog'),
    manifest: jsonb('manifest').notNull(),

    // Compatibility
    minLoaVersion: varchar('min_loa_version', { length: 50 }),
    maxLoaVersion: varchar('max_loa_version', { length: 50 }),

    // Status
    isLatest: boolean('is_latest').default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    // Size tracking
    totalSizeBytes: integer('total_size_bytes').default(0),
    fileCount: integer('file_count').default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    packIdx: index('idx_pack_versions_pack').on(table.packId),
    uniqueVersion: uniqueIndex('idx_pack_versions_unique').on(table.packId, table.version),
    latestIdx: index('idx_pack_versions_latest')
      .on(table.packId)
      .where(sql`is_latest = true`),
  })
);

/**
 * Pack Files table
 * @see sdd-v2.md §3.1 Entity: Pack Files
 */
export const packFiles = pgTable(
  'pack_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => packVersions.id, { onDelete: 'cascade' }),
    path: varchar('path', { length: 500 }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    mimeType: varchar('mime_type', { length: 100 }).default('text/plain'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    versionIdx: index('idx_pack_files_version').on(table.versionId),
    uniquePath: uniqueIndex('idx_pack_files_unique_path').on(table.versionId, table.path),
  })
);

/**
 * Pack Subscriptions table (join table)
 * @see sdd-v2.md §3.1 Entity: Pack Subscriptions
 */
export const packSubscriptions = pgTable(
  'pack_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    subIdx: index('idx_pack_subscriptions_sub').on(table.subscriptionId),
    packIdx: index('idx_pack_subscriptions_pack').on(table.packId),
    uniquePackSub: uniqueIndex('idx_pack_subscriptions_unique').on(
      table.subscriptionId,
      table.packId
    ),
  })
);

/**
 * Pack Installations table (usage tracking)
 * @see sdd-v2.md §3.1 Entity: Pack Installations
 */
export const packInstallations = pgTable(
  'pack_installations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    versionId: uuid('version_id')
      .notNull()
      .references(() => packVersions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),
    action: packInstallActionEnum('action').notNull(),
    metadata: jsonb('metadata').default({}),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    packIdx: index('idx_pack_installations_pack').on(table.packId),
    userIdx: index('idx_pack_installations_user').on(table.userId),
    createdIdx: index('idx_pack_installations_created').on(table.createdAt),
  })
);

// --- Relations ---

export const usersRelations = relations(users, ({ many }) => ({
  teamMemberships: many(teamMembers),
  ownedTeams: many(teams),
  subscriptions: many(subscriptions),
  apiKeys: many(apiKeys),
  licenses: many(licenses),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  subscriptions: many(subscriptions),
  invitations: many(teamInvitations),
}));

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  team: one(teams, {
    fields: [teamInvitations.teamId],
    references: [teams.id],
  }),
  invitedByUser: one(users, {
    fields: [teamInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [teamMembers.invitedBy],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [subscriptions.teamId],
    references: [teams.id],
  }),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  versions: many(skillVersions),
  usage: many(skillUsage),
  licenses: many(licenses),
}));

export const skillVersionsRelations = relations(skillVersions, ({ one, many }) => ({
  skill: one(skills, {
    fields: [skillVersions.skillId],
    references: [skills.id],
  }),
  files: many(skillFiles),
}));

export const skillFilesRelations = relations(skillFiles, ({ one }) => ({
  version: one(skillVersions, {
    fields: [skillFiles.versionId],
    references: [skillVersions.id],
  }),
}));

// --- Pack Relations ---

export const packsRelations = relations(packs, ({ many }) => ({
  versions: many(packVersions),
  subscriptions: many(packSubscriptions),
  installations: many(packInstallations),
}));

export const packVersionsRelations = relations(packVersions, ({ one, many }) => ({
  pack: one(packs, {
    fields: [packVersions.packId],
    references: [packs.id],
  }),
  files: many(packFiles),
  installations: many(packInstallations),
}));

export const packFilesRelations = relations(packFiles, ({ one }) => ({
  version: one(packVersions, {
    fields: [packFiles.versionId],
    references: [packVersions.id],
  }),
}));

export const packSubscriptionsRelations = relations(packSubscriptions, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [packSubscriptions.subscriptionId],
    references: [subscriptions.id],
  }),
  pack: one(packs, {
    fields: [packSubscriptions.packId],
    references: [packs.id],
  }),
}));

export const packInstallationsRelations = relations(packInstallations, ({ one }) => ({
  pack: one(packs, {
    fields: [packInstallations.packId],
    references: [packs.id],
  }),
  version: one(packVersions, {
    fields: [packInstallations.versionId],
    references: [packVersions.id],
  }),
  user: one(users, {
    fields: [packInstallations.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [packInstallations.teamId],
    references: [teams.id],
  }),
}));
