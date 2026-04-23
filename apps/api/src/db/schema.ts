import { sqliteTable, text, integer, index, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

/**
 * constructs-api libSQL Schema (cycle-012)
 * @see sdd.md §2 Data model (libSQL schema)
 * @see prd.md §5 Functional requirements
 * @see grimoires/loa-constructs-seed-2026-04-21/cycle-012-SEED-constructs-api-libsql-migration.md §1.3 scope-lock
 *
 * 5 tables, ~300 lines. Postgres-era schema (30 tables) deleted per
 * [[tool-absence-as-enforcement]] — dormant surface removed outright
 * rather than migrated. Data loss accepted (pre-launch state).
 */

// ---------------------------------------------------------------------------
// packs — registry core + stats counters (SDD §2.1)
// ---------------------------------------------------------------------------

export const packs = sqliteTable(
  'packs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    namespace: text('namespace').notNull(),
    version: text('version').notNull(),
    visibility: text('visibility').notNull().default('public'),
    category: text('category'),
    maturity: text('maturity').default('experimental'),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    repo_url: text('repo_url').notNull(),
    manifest: text('manifest', { mode: 'json' }),
    readme: text('readme'),
    owner_id: text('owner_id'),
    owner_type: text('owner_type'),
    source_type: text('source_type').default('github'),
    construct_type: text('construct_type'),
    view_count: integer('view_count').notNull().default(0),
    download_count: integer('download_count').notNull().default(0),
    created_at: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updated_at: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    slugIdx: index('idx_packs_slug').on(table.slug),
    categoryIdx: index('idx_packs_category').on(table.category),
    visibilityIdx: index('idx_packs_visibility').on(table.visibility),
    downloadsIdx: index('idx_packs_downloads').on(table.download_count),
    viewsIdx: index('idx_packs_views').on(table.view_count),
    featuredIdx: index('idx_packs_featured').on(table.featured, table.maturity),
    // CHECK constraints replacing pgEnum (SDD §5.1)
    visibilityCheck: check(
      'chk_packs_visibility',
      sql`${table.visibility} IN ('public', 'internal', 'unlisted')`
    ),
    maturityCheck: check(
      'chk_packs_maturity',
      sql`${table.maturity} IN ('experimental', 'beta', 'stable', 'deprecated')`
    ),
    ownerTypeCheck: check(
      'chk_packs_owner_type',
      sql`${table.owner_type} IS NULL OR ${table.owner_type} IN ('user', 'org')`
    ),
    sourceTypeCheck: check(
      'chk_packs_source_type',
      sql`${table.source_type} IS NULL OR ${table.source_type} IN ('github', 'registry', 'external')`
    ),
  })
);

export type Pack = typeof packs.$inferSelect;
export type NewPack = typeof packs.$inferInsert;

// ---------------------------------------------------------------------------
// skills — sub-units of packs (SDD §2.2)
// ---------------------------------------------------------------------------

export const skills = sqliteTable(
  'skills',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    pack_id: text('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    slug: text('slug').notNull(),
    path: text('path'),
    created_at: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    packIdx: index('idx_skills_pack_id').on(table.pack_id),
    slugIdx: index('idx_skills_slug').on(table.slug),
    uniquePackSlug: uniqueIndex('uniq_skills_pack_slug').on(table.pack_id, table.slug),
  })
);

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

// ---------------------------------------------------------------------------
// categories — navigation (SDD §2.3)
// ---------------------------------------------------------------------------

export const categories = sqliteTable('categories', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sort_order: integer('sort_order').default(0),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// ---------------------------------------------------------------------------
// discovery_runs — admin/discover observability + audit (SDD §2.4, §6.1.1)
// ---------------------------------------------------------------------------

export const discoveryRuns = sqliteTable(
  'discovery_runs',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    owner: text('owner').notNull(),
    started_at: integer('started_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    completed_at: integer('completed_at', { mode: 'timestamp' }),
    dry_run: integer('dry_run', { mode: 'boolean' }).notNull().default(false),
    constructs_found: integer('constructs_found').notNull().default(0),
    constructs_updated: integer('constructs_updated').notNull().default(0),
    constructs_created: integer('constructs_created').notNull().default(0),
    errors: text('errors', { mode: 'json' }),
    // Audit columns (Flatline SKP-002: admin-action audit)
    triggered_by: text('triggered_by').default('operational-token'),
    triggered_by_fingerprint: text('triggered_by_fingerprint'),
    triggered_by_ip: text('triggered_by_ip'),
    triggered_by_user_agent: text('triggered_by_user_agent'),
  },
  (table) => ({
    startedAtIdx: index('idx_discovery_runs_started').on(table.started_at),
    fingerprintIdx: index('idx_discovery_runs_fingerprint').on(table.triggered_by_fingerprint),
  })
);

export type DiscoveryRun = typeof discoveryRuns.$inferSelect;
export type NewDiscoveryRun = typeof discoveryRuns.$inferInsert;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const packsRelations = relations(packs, ({ many }) => ({
  skills: many(skills),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  pack: one(packs, {
    fields: [skills.pack_id],
    references: [packs.id],
  }),
}));
