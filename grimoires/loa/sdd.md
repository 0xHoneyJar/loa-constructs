# SDD: Network Cohesion — Construct DX at Platform Scale

**Cycle**: cycle-041
**Created**: 2026-03-11
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Context**: `grimoires/loa/context/construct-network-cohesion.md`
**Research**: `grimoires/bridgebuilder/ecosystem-lifecycle-research.md`, `grimoires/bridgebuilder/stripe-dx-patterns.md`

---

## 1. Executive Summary

Cycle-041 fixes the broken wiring between what a construct author writes and what the network renders. The category system gets a real database column and shared constants, eliminating a 16-entry client-side hack. The scaffold shrinks from ~40 YAML fields to <10. The publish stub becomes a real git-sync boundary. `/skill-add` enables two-phase construct growth. Auto-sync replaces hardcoded `GIT_CONFIGS`. QMD re-enables with expanded collections.

**Scope**: 1 new package file, 1 new GitHub Action, 1 new skill, 1 migration, ~12 modified files. No breaking API changes. No explorer UI changes beyond category cleanup.

**Governing principle**: The filesystem IS the configuration. The manifest is for exceptions. The network handles everything after the author writes skills.

---

## 2. System Architecture

### 2.1 Category Derivation Pipeline

The core data flow that replaces 4 disconnected category definitions with one pipeline:

```
construct.yaml                    (Author declares domain: [analytics, research])
       │
       ▼
seed-forge-packs.ts               (Reads domain[0] from fullManifest)
       │
       ▼
normalizeCategory()               (Shared: packages/shared/src/categories.ts)
       │                           Handles legacy slugs: gtm→marketing, devops→operations
       ▼
packs.category column             (New: VARCHAR(50), indexed)
       │
       ▼
GET /v1/constructs                (Returns pack.category instead of null)
       │
       ▼
Explorer transformToNode()        (Trusts API. SLUG_CATEGORY_MAP deleted.)
       │
       ▼
3D Graph                          (Nodes colored by real category)
```

### 2.2 Construct Lifecycle (Target State)

```
LOCAL ──────► REGISTERED ──────► SYNCED ──────► PUBLISHED
  │              │                  │               │
  │              │                  │               ▼
construct      auto-discover     git push      INSTALLED
create         or register       + sync        (/constructs install)
```

All distribution methods (git-sync, auto-discover, manual seed) feed the same state machine. The construct object absorbs the branching.

### 2.3 Package Dependency Graph

```
packages/shared/src/categories.ts     ◄── NEW: single source of truth
       │
       ├── apps/api/src/services/category.ts      (imports normalizeCategory, CATEGORIES)
       ├── apps/api/src/services/constructs.ts     (imports normalizeCategory for pack responses)
       ├── apps/explorer/lib/data/fetch-categories.ts  (imports normalizeCategory, CATEGORIES as fallback)
       ├── apps/explorer/lib/data/fetch-constructs.ts  (imports normalizeCategory — SLUG_CATEGORY_MAP deleted)
       └── scripts/seed-forge-packs.ts             (imports normalizeCategory for category derivation)
```

---

## 3. Data Architecture

### 3.1 Migration: `0011_packs_category.sql`

**Naming rationale**: `0001` and `0010` exist in `apps/api/src/db/migrations/`. Next available: `0011`.

```sql
-- Migration: Add category column to packs table
-- Cycle: 041
-- Depends on: categories table (seeded), packs table

BEGIN;

-- 1. Add category column
ALTER TABLE packs ADD COLUMN category VARCHAR(50);

-- 2. Index for category filtering and counting
CREATE INDEX idx_packs_category ON packs(category);

-- 3. Backfill existing packs from search_use_cases[1] (which holds domain[0])
-- Uses the same mapping logic as normalizeCategory()
UPDATE packs SET category = CASE
  WHEN search_use_cases[1] IS NOT NULL THEN
    CASE search_use_cases[1]
      WHEN 'gtm' THEN 'marketing'
      WHEN 'dev' THEN 'development'
      WHEN 'docs' THEN 'documentation'
      WHEN 'ops' THEN 'operations'
      WHEN 'data' THEN 'analytics'
      WHEN 'devops' THEN 'operations'
      WHEN 'infra' THEN 'infrastructure'
      ELSE search_use_cases[1]
    END
  ELSE 'development'  -- fallback for packs with no domain
END;

COMMIT;
```

**Decision: `VARCHAR(50)` not `ENUM`**. The existing `skillCategoryEnum` is a PostgreSQL enum with 8 legacy values (`development`, `devops`, `marketing`, `sales`, `support`, `analytics`, `security`, `other`). ALTER TYPE on enums is complex and risky (requires adding values, renaming, dropping unused). Using `VARCHAR(50)` for packs avoids coupling to the enum lifecycle. Application-layer validation via the shared `CATEGORIES` constant is sufficient. The skill enum remains unchanged for now — aligning it is a separate, lower-priority migration.

**Why not a FK to `categories` table?** The `categories` table exists for display metadata (label, color, sortOrder). The `packs.category` column stores a slug for filtering. A FK would require the category to exist before the pack, which breaks auto-sync (new categories can't arrive before the category table is seeded). The slug is validated at the application layer.

### 3.2 Schema Change: `apps/api/src/db/schema.ts`

Add to the `packs` table definition (after `constructType`):

```typescript
// Category derived from construct.yaml domain[0] at sync/seed time
// @see prd.md §FR-1 Category Derivation Pipeline (cycle-041)
category: varchar('category', { length: 50 }),
```

Add to table indexes:

```typescript
categoryIdx: index('idx_packs_category').on(table.category),
```

### 3.3 Shared Constants: `packages/shared/src/categories.ts`

New file — the single source of truth for the 8-category taxonomy.

```typescript
/**
 * Construct Category Taxonomy
 * Single source of truth — imported by API, explorer, and seed scripts.
 * @see prd.md §FR-2 Shared Category Constants (cycle-041)
 */

/** The 8 canonical category slugs */
export const CATEGORY_SLUGS = [
  'marketing',
  'development',
  'security',
  'analytics',
  'documentation',
  'operations',
  'design',
  'infrastructure',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export interface CategoryDefinition {
  slug: CategorySlug;
  label: string;
  color: string;
  description: string;
  sortOrder: number;
}

/** Canonical category definitions with display metadata */
export const CATEGORIES: CategoryDefinition[] = [
  { slug: 'marketing', label: 'Marketing', color: '#FF44FF', description: 'GTM, campaigns, content, social media', sortOrder: 1 },
  { slug: 'development', label: 'Development', color: '#44FF88', description: 'Coding, testing, debugging, refactoring', sortOrder: 2 },
  { slug: 'security', label: 'Security', color: '#FF8844', description: 'Auditing, scanning, compliance, secrets', sortOrder: 3 },
  { slug: 'analytics', label: 'Analytics', color: '#FFDD44', description: 'Data, metrics, reporting, insights', sortOrder: 4 },
  { slug: 'documentation', label: 'Documentation', color: '#44DDFF', description: 'Docs, guides, READMEs, knowledge bases', sortOrder: 5 },
  { slug: 'operations', label: 'Operations', color: '#4488FF', description: 'DevOps, deployment, monitoring, CI/CD', sortOrder: 6 },
  { slug: 'design', label: 'Design', color: '#FF7B9C', description: 'UI/UX, prototyping, design systems', sortOrder: 7 },
  { slug: 'infrastructure', label: 'Infrastructure', color: '#9B7EDE', description: 'Cloud, networking, IaC, containers', sortOrder: 8 },
];

/** Legacy slug → canonical slug mappings */
export const LEGACY_SLUG_MAPPINGS: Record<string, CategorySlug> = {
  gtm: 'marketing',
  dev: 'development',
  docs: 'documentation',
  ops: 'operations',
  data: 'analytics',
  devops: 'operations',
  infra: 'infrastructure',
};

/**
 * Normalize a category slug, handling legacy mappings.
 * Returns the input lowercased if no mapping exists — caller is responsible
 * for validating against CATEGORY_SLUGS if strict validation is needed.
 */
export function normalizeCategory(slug: string): string {
  const normalized = slug.toLowerCase().trim();
  return LEGACY_SLUG_MAPPINGS[normalized] || normalized;
}

/**
 * Check if a string is a valid canonical category slug.
 */
export function isValidCategory(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug.toLowerCase().trim());
}
```

**Export from barrel**: Add `export * from './categories.js';` to `packages/shared/src/index.ts`.

---

## 4. API Changes

### 4.1 Construct Response: `category` Field

**File**: `apps/api/src/services/constructs.ts:393`

**Current**:
```typescript
category: null, // Packs don't have category
```

**Target**:
```typescript
category: pack.category || null,
```

No new endpoints. No breaking changes. The `category` field already exists in the API response shape (type `string | null`). Consumers that handled `null` will now receive a real value.

### 4.2 Category Counts: `listCategories()`

**File**: `apps/api/src/services/category.ts:152-160`

**Current**: Counts only `skills.category`. The `constructCount` field misrepresents — it counts skills, not constructs.

**Target**: Count both skills and packs, then sum:

```typescript
// Get skill counts per category (existing)
const skillCounts = await db
  .select({ category: skills.category, count: sql<number>`count(*)::int` })
  .from(skills)
  .where(eq(skills.isPublic, true))
  .groupBy(skills.category);

// Get pack counts per category (NEW)
const packCounts = await db
  .select({ category: packs.category, count: sql<number>`count(*)::int` })
  .from(packs)
  .where(eq(packs.status, 'published'))
  .groupBy(packs.category);

// Merge counts
const countMap = new Map<string, number>();
for (const sc of skillCounts) {
  if (sc.category) {
    const normalized = normalizeCategory(sc.category);
    countMap.set(normalized, (countMap.get(normalized) || 0) + sc.count);
  }
}
for (const pc of packCounts) {
  if (pc.category) {
    const normalized = normalizeCategory(pc.category);
    countMap.set(normalized, (countMap.get(normalized) || 0) + pc.count);
  }
}
```

**Import change**: `category.ts` imports `normalizeCategory` from `@loa-constructs/shared` instead of defining its own. The local `DEFAULT_CATEGORIES`, `LEGACY_SLUG_MAPPINGS`, and `normalizeCategory()` are deleted and replaced by shared imports.

### 4.3 Category Service Import Refactor

**File**: `apps/api/src/services/category.ts`

Replace:
```typescript
const LEGACY_SLUG_MAPPINGS: Record<string, string> = { ... };
export function normalizeCategory(slug: string): string { ... }
export const DEFAULT_CATEGORIES: Omit<CategoryWithoutCount, 'id'>[] = [ ... ];
```

With:
```typescript
import { normalizeCategory, CATEGORIES, type CategoryDefinition } from '@loa-constructs/shared';
```

The `DEFAULT_CATEGORIES` fallback in `listCategories()` becomes:
```typescript
return CATEGORIES.map((cat, index) => ({
  id: `default-${index}`,
  slug: cat.slug,
  label: cat.label,
  color: cat.color,
  description: cat.description,
  sortOrder: cat.sortOrder,
  constructCount: 0,
}));
```

---

## 5. Explorer Changes

### 5.1 Delete `SLUG_CATEGORY_MAP`

**File**: `apps/explorer/lib/data/fetch-constructs.ts:74-91`

Delete the entire `SLUG_CATEGORY_MAP` object and the comment above it. Change line 99 from:

```typescript
const category = normalizeCategory(construct.category || SLUG_CATEGORY_MAP[construct.slug] || 'development');
```

To:

```typescript
const category = normalizeCategory(construct.category || 'development');
```

### 5.2 Refactor `fetch-categories.ts`

**File**: `apps/explorer/lib/data/fetch-categories.ts`

Delete the local `DEFAULT_CATEGORIES` array (lines 16-81) and `LEGACY_SLUG_MAPPINGS` (lines 87-95) and `normalizeCategory` function (lines 100-103). Replace with shared imports:

```typescript
import { normalizeCategory, CATEGORIES } from '@loa-constructs/shared';

const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((cat, index) => ({
  id: `default-${index}`,
  slug: cat.slug,
  label: cat.label,
  color: cat.color,
  description: cat.description ?? null,
  constructCount: 0,
}));

export { normalizeCategory };
```

### 5.3 Shared Package Compatibility

`packages/shared` must work in both Node.js (API) and Next.js browser/server contexts. The new `categories.ts` exports only:
- Pure functions (`normalizeCategory`, `isValidCategory`)
- Constants (`CATEGORIES`, `CATEGORY_SLUGS`, `LEGACY_SLUG_MAPPINGS`)
- Types (`CategorySlug`, `CategoryDefinition`)

No Node.js-specific imports, no side effects, no runtime dependencies. This is safe for both contexts.

---

## 6. Seed Script Changes

### 6.1 Category Derivation in `seed-forge-packs.ts`

**File**: `scripts/seed-forge-packs.ts`

**Current** (line 578):
```typescript
const searchUseCases = pack.fullManifest?.domain ?? [];
```

**Add** (after line 578):
```typescript
import { normalizeCategory } from '@loa-constructs/shared';

// Derive category from domain[0]
const rawCategory = pack.fullManifest?.domain?.[0] ?? null;
const category = rawCategory ? normalizeCategory(rawCategory) : 'development';
```

**Modify** the INSERT column list (line 586-593) to include `category`:

```sql
INSERT INTO packs (
  id, name, slug, description, long_description, icon, owner_id, owner_type,
  status, tier_required, pricing_type, thj_bypass,
  construct_type, category,
  visibility, submission_source,
  repository_url, homepage_url, documentation_url,
  search_keywords, search_use_cases,
  created_at, updated_at
)
```

**Modify** the ON CONFLICT UPDATE SET (line 618-631) to include:

```sql
category = EXCLUDED.category,
```

### 6.2 Domain Backfill Script

A one-time script is NOT needed in this repo. The domain field already exists in `construct.yaml` across repos — some have it, some don't. The backfill is:

1. For each of the 15 construct repos, add/verify `domain:` in `construct.yaml`
2. Re-run `bun seed:forge` to populate `packs.category` from the new domain values

**Domain assignments** (from PRD §FR-3.2):

| Construct | domain[0] | Current `search_use_cases` state |
|-----------|-----------|----------------------------------|
| artisan | design | May already have domain |
| the-easel | design | May already have domain |
| webgl-particles | design | Manifest is `manifest.json` (schema v1) |
| webreel | design | — |
| observer | analytics | Has domain from prior work |
| k-hole | analytics | Has domain from cycle-038 |
| crucible | security | — |
| hardening | security | — |
| dynamic-auth | security | — |
| protocol | development | Has domain from prior work |
| beacon | operations | — |
| herald | operations | — |
| gtm-collective | marketing | — |
| social-oracle | marketing | — |
| growthpages | marketing | — |
| mibera-codex | documentation | — |

The backfill uses `gh` CLI to batch PRs or direct-push across repos. This is an operational task, not a code change.

---

## 7. Scaffold Design

### 7.1 Minimal Scaffold Output (skill-pack)

`construct create my-tool` produces exactly 5 files:

```
my-tool/
├── construct.yaml       # 7 lines (identity tier only)
├── skills/
│   └── my-tool/
│       ├── index.yaml   # 6 lines (dispatch-critical only)
│       └── SKILL.md     # Workflow stub
├── commands/
│   └── my-tool.md       # Routing frontmatter
├── README.md
└── .gitignore
```

### 7.2 `construct.yaml` at Create Time

```yaml
# Construct Manifest
name: "my-tool"
slug: "my-tool"
version: "0.1.0"
type: "skill-pack"
description: "TODO: Add description"
license: "MIT"
schema_version: 3
```

**Not generated at create time**: `domain`, `capabilities`, `paths`, `identity`, `pack_dependencies`, `skills` array, `commands` array. These are either inferred at publish time (skills, commands, capabilities) or prompted at publish time (domain, description refinement).

### 7.3 `index.yaml` at Create Time

```yaml
name: my-tool
version: "0.1.0"
description: "Use this skill when you need to run my-tool"
triggers:
  - pattern: "/my-tool"
    description: "Run the my-tool skill"
entry: skills/my-tool/SKILL.md
```

**Not generated**: `capabilities`, `domain_hints`, `zones`, `examples`. These are enrichment — either inferred or added via `/skill-add`.

### 7.4 `commands/my-tool.md` at Create Time

```markdown
---
agent: skill
agent_path: skills/my-tool/SKILL.md
context_files:
  - construct.yaml
---

# /my-tool

Run the my-tool construct.
```

**Why commands/ is in the scaffold**: Without routing frontmatter, the runtime cannot dispatch to the skill. This is the minimum for invocation — like `src/main.rs` is the minimum for `cargo run`.

### 7.5 Implementation

The scaffold script (`.claude/scripts/constructs-create.sh`) is already updated to this minimal structure. The `generate_manifest()` function for `skill-pack` type produces only identity-tier fields. The `generate_starter_skill()` creates `skills/<slug>/` (named after slug, not "example"). The `generate_command_entry()` creates `commands/<slug>.md` with valid routing frontmatter.

No further code changes needed — the scaffold was already revised.

---

## 8. Publish Boundary Design

### 8.1 Flow

`/construct-publish <patch|minor|major>` performs:

```
1. Detect construct root (find construct.yaml walking up)
2. Read filesystem:
   ├── skills from skills/*/index.yaml
   ├── commands from commands/*.md
   ├── identity from identity/persona.yaml existence
   └── README.md for description fallback
3. Prompt for Tier 2 fields if missing:
   ├── version (already present from create)
   ├── description (if still "TODO")
   └── license (already present from create)
4. Suggest Tier 3 fields:
   ├── domain (agent proposes based on skill content)
   └── keywords (agent proposes based on skill names + description)
5. Run validation (existing 10-point checklist + new checks)
6. Version ceremony:
   ├── Bump version in construct.yaml (patch|minor|major)
   ├── git add construct.yaml
   ├── git commit -m "release: v<new-version>"
   └── git tag v<new-version>
7. Push: git push origin <branch> --tags
8. Trigger sync: POST /v1/packs/:slug/sync
9. Report: URL, sync status, warnings
```

### 8.2 Filesystem Discovery

At publish time, the skill agent (not the bash script) discovers the construct's actual structure:

```typescript
// Pseudocode for filesystem inference
const skills = glob('skills/*/index.yaml').map(parseYaml);
const commands = glob('commands/*.md').map(parseFrontmatter);
const hasIdentity = exists('identity/persona.yaml');
const readme = read('README.md');
const manifest = parseYaml('construct.yaml');

// Inferred metadata
const inferredSkills = skills.map(s => ({ slug: s.name, path: dirname(s._path) }));
const inferredCommands = commands.map(c => ({ name: basename(c._path, '.md'), ...c.frontmatter }));
const inferredDescription = manifest.description === 'TODO: Add description'
  ? readme.split('\n\n')[1]  // First paragraph after title
  : manifest.description;
```

### 8.3 Validation Additions

The existing 10-point checklist in `constructs-publish.sh:do_validate()` is supplemented at the skill level:

| # | Check | Severity | Source |
|---|-------|----------|--------|
| 11 | Routing frontmatter present in all `commands/*.md` | FAIL | New |
| 12 | All skills have `triggers` with at least one pattern | FAIL | New |
| 13 | `domain` field present in `construct.yaml` | WARN | New (prompted if missing) |
| 14 | Inferred skills count matches manifest skills array (if declared) | WARN | New |

### 8.4 Publish Script Changes

**File**: `.claude/scripts/constructs-publish.sh`

The `do_push()` function (lines 247-319) currently validates, checks permissions, then prints a warning stub. Replace the stub with:

```bash
# Replace lines 316-317 (the stub) with:
print_status "Pushing to origin..."
git add construct.yaml
git commit -m "release: ${slug}@${version}"
git tag "v${version}"
git push origin HEAD --tags

# Trigger sync
print_status "Triggering sync..."
local sync_code
sync_code=$(curl --silent --proto '=https' --tlsv1.2 \
    -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $api_key" \
    "${registry_url}/packs/${slug}/sync")

if [[ "$sync_code" == "200" ]] || [[ "$sync_code" == "202" ]]; then
    print_success "Published ${slug}@${version} — sync triggered"
else
    print_warning "Published to git but sync returned HTTP $sync_code"
    print_warning "Run 'bun seed:forge' to sync manually"
fi
```

**Version bump** is handled by the `/construct-publish` skill (the SKILL.md agent), not the bash script. The agent reads the current version from `construct.yaml`, computes the new version based on the argument (patch/minor/major), writes it back, then calls `do_push`.

### 8.5 The `/construct-publish` Skill

**New file**: `.claude/skills/publishing-constructs/SKILL.md`

This wraps the bash script with agent intelligence:

1. **Filesystem discovery** — read skills/, commands/, identity/, README
2. **Prompt for missing fields** — description, domain
3. **Domain suggestion** — if QMD available, query for content similarity; otherwise propose based on construct type
4. **Validate** — call `constructs-publish.sh validate <path>`
5. **Version bump** — compute new version, write to construct.yaml
6. **Publish** — call `constructs-publish.sh push <path>`

The existing `publishing-constructs` skill directory already exists (`.claude/skills/publishing-constructs/`). The SKILL.md needs to be updated to implement this flow.

---

## 9. `/skill-add` Truename Design

### 9.1 Flow

```
/skill-add <name>
  │
  ├── 1. Detect construct root (construct.yaml)
  ├── 2. Read existing skills/ for context
  ├── 3. Create skills/<name>/index.yaml
  │      ├── name, description (context-aware)
  │      ├── triggers (pattern: /<name>)
  │      └── entry: skills/<name>/SKILL.md
  ├── 4. Create skills/<name>/SKILL.md
  │      └── Workflow stub with construct-aware sections
  ├── 5. Create commands/<name>.md (if not exists)
  │      └── Routing frontmatter pointing to new skill
  └── 6. Report: files created, next steps
```

### 9.2 Implementation

**New skill**: `.claude/skills/adding-skills/SKILL.md`

The agent:
- Reads `construct.yaml` for name, type, description context
- Lists existing skills via `ls skills/` to understand naming patterns
- Reads 1-2 existing SKILL.md files to match style
- Generates new skill files with populated content (not just TODOs)
- Creates the command entry point with correct routing

### 9.3 Guard Rails

- Errors clearly if `construct.yaml` not found (not in a construct directory)
- Errors if `skills/<name>/` already exists (no silent overwrite)
- Skill name validated: lowercase, alphanumeric + hyphens, no reserved words

---

## 10. Auto-Sync Design

### 10.1 GitHub Action: `.github/workflows/construct-sync.yml`

```yaml
name: Construct Auto-Sync
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch: {}    # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install

      # Discover new construct-* repos
      - name: Discover constructs
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          CONSTRUCTS_ORG: 0xHoneyJar
        run: bun tsx scripts/discover-constructs.ts --register --json > discovery.json

      # Seed/sync all known constructs
      - name: Sync constructs
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AUTO_DISCOVER: true
        run: bun tsx scripts/seed-forge-packs.ts
```

### 10.2 Complete `--register` Flag

**File**: `scripts/discover-constructs.ts:237-240`

Replace the stub with:

```typescript
if (REGISTER && missing.length > 0) {
  console.log(`\n  Registering ${missing.length} constructs...`);
  for (const m of missing) {
    const gitUrl = `https://github.com/${ORG}/construct-${m.slug}.git`;
    // Add to seed-forge-packs GIT_CONFIGS dynamically
    // The seed script's discoverFromOrg() already handles this when AUTO_DISCOVER=true
    console.log(`  ✓ ${m.slug} queued for sync (${gitUrl})`);
  }
  console.log(`\n  Run 'bun seed:forge' with AUTO_DISCOVER=true to complete registration.`);
}
```

**Key insight**: The `seed-forge-packs.ts` already has `discoverFromOrg()` (line 330) that queries `gh repo list` and builds GIT_CONFIGS dynamically when `AUTO_DISCOVER=true`. The `--register` flag in discover-constructs becomes a diagnostic + trigger, not a separate registration path. The real registration happens through the existing seed flow.

### 10.3 Staleness Detection

The seed script already tracks `last_sync_commit` and `last_synced_at` on packs. Auto-sync compares:

```typescript
// In seed-forge-packs.ts, during the sync loop:
const headCommit = getRepoHeadCommit(gitUrl, gitRef);
if (pack.lastSyncCommit === headCommit) {
  console.log(`  ⏭ ${slug}: up to date (${headCommit.slice(0, 7)})`);
  continue;
}
// Proceed with sync...
```

This is not new code — the field exists. The missing piece is the GitHub Action that runs it on a schedule.

---

## 11. QMD Re-enablement

### 11.1 Configuration Changes

**File**: `.loa.config.yaml`

Already applied:
- `memory.qmd.enabled: true` (was `false`)
- `.loa/qmd/.failure_count` reset to 0

### 11.2 Expanded Collections

```yaml
collections:
  - path: grimoires/loa
    name: loa-state
    include: ["*.md"]
    exclude: ["archive/**", "a2a/trajectory/**"]
  - path: grimoires/loa/reality
    name: loa-reality
    include: ["*.md"]
  - path: .claude/constructs/packs        # NEW
    name: constructs
    include: ["**/SKILL.md", "**/index.yaml", "**/persona.yaml", "**/CLAUDE.md"]
  - path: grimoires                       # NEW
    name: grimoires-all
    include: ["**/*.md"]
    exclude: ["loa/archive/**"]
```

### 11.3 QMD Role at Publish Time

When `/construct-publish` runs and the construct has no `domain` field:

1. Query QMD `constructs` collection for SKILL.md content similarity
2. Propose domain based on nearest-neighbor categories
3. Present to author for confirmation

This is an enhancement, not a gate. If QMD is unavailable, the agent falls back to keyword analysis of the SKILL.md text. If that also fails, the default is `development`.

---

## 12. File Change Summary

### 12.1 New Files

| File | Purpose | Priority |
|------|---------|----------|
| `packages/shared/src/categories.ts` | Shared category taxonomy | P0 |
| `apps/api/src/db/migrations/0011_packs_category.sql` | Add category column to packs | P0 |
| `.github/workflows/construct-sync.yml` | Daily auto-sync GitHub Action | P2 |
| `.claude/skills/adding-skills/SKILL.md` | `/skill-add` truename | P1 |
| `.claude/skills/adding-skills/index.yaml` | Skill manifest for `/skill-add` | P1 |
| `.claude/commands/skill-add.md` | Command entry point | P1 |

### 12.2 Modified Files

| File | Change | Priority |
|------|--------|----------|
| `packages/shared/src/index.ts` | Add `export * from './categories.js'` | P0 |
| `apps/api/src/db/schema.ts` | Add `category` column + index to `packs` table | P0 |
| `apps/api/src/services/constructs.ts` | Return `pack.category` instead of `null` at line 393 | P0 |
| `apps/api/src/services/category.ts` | Import from shared; count packs + skills in `listCategories()` | P0 |
| `apps/explorer/lib/data/fetch-constructs.ts` | Delete `SLUG_CATEGORY_MAP`; simplify line 99 | P0 |
| `apps/explorer/lib/data/fetch-categories.ts` | Import from shared; delete local constants | P0 |
| `scripts/seed-forge-packs.ts` | Add `category` to INSERT/UPSERT; derive from `domain[0]` | P0 |
| `.claude/scripts/constructs-publish.sh` | Replace upload stub with git push + sync trigger | P1 |
| `.claude/skills/publishing-constructs/SKILL.md` | Full publish flow with filesystem discovery | P1 |
| `scripts/discover-constructs.ts` | Complete `--register` flag implementation | P2 |

### 12.3 Deleted Code

| Location | What | Why |
|----------|------|-----|
| `fetch-constructs.ts:74-91` | `SLUG_CATEGORY_MAP` (16 entries) | API now returns real category |
| `fetch-categories.ts:16-95` | Local `DEFAULT_CATEGORIES`, `LEGACY_SLUG_MAPPINGS`, `normalizeCategory` | Moved to shared package |
| `category.ts:40-57` | Local `LEGACY_SLUG_MAPPINGS`, `normalizeCategory` | Moved to shared package |
| `category.ts:66-123` | Local `DEFAULT_CATEGORIES` | Moved to shared package |
| `constructs-publish.sh:317` | `print_warning "Publish upload not yet implemented"` | Replaced with real publish |

---

## 13. Technical Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration on production Supabase fails | Low | High | Run via `bun -e` with postgres driver (no psql locally). Wrap in transaction. Test on staging first. |
| Shared package breaks explorer build | Low | Medium | `categories.ts` has zero dependencies — pure functions + constants. CI will catch. |
| `search_use_cases[1]` is empty for some packs during migration backfill | High | Low | Default to `'development'` in CASE statement. The seed re-run after domain backfill will overwrite with correct values. |
| Auto-sync discovers repos with invalid manifests | Medium | Low | `discoverFromOrg()` already skips repos that fail manifest parse. |
| QMD failures recur after re-enable | Medium | Low | Three-tier fallback: QMD → keyword analysis → `'development'` default. QMD is never a gate. |
| Domain backfill across 15 repos is tedious | Certain | Medium | Batch with `gh` CLI. Most repos have write access. Script the YAML update. |

---

## 14. Sprint Decomposition (Suggested)

### Sprint 1: Category Pipeline (P0)

1. Create `packages/shared/src/categories.ts`
2. Export from `packages/shared/src/index.ts`
3. Migration `0011_packs_category.sql` — add column + backfill
4. Update `apps/api/src/db/schema.ts` — add column + index
5. Update `apps/api/src/services/constructs.ts:393` — return `pack.category`
6. Update `apps/api/src/services/category.ts` — import shared, count packs
7. Update `apps/explorer/lib/data/fetch-constructs.ts` — delete SLUG_CATEGORY_MAP
8. Update `apps/explorer/lib/data/fetch-categories.ts` — import shared
9. Update `scripts/seed-forge-packs.ts` — derive category from domain[0]
10. Apply migration to production, run seed

### Sprint 2: Scaffold + Publish + Skill-Add (P1)

1. Verify scaffold script produces minimal output (already done)
2. Create `/skill-add` truename (new skill + command)
3. Update publish script — replace stub with git push + sync
4. Update `/construct-publish` SKILL.md — full flow with filesystem discovery
5. Test: create → add skill → publish → verify in registry

### Sprint 3: Auto-Sync + QMD (P2)

1. Complete `--register` in `discover-constructs.ts`
2. Create `.github/workflows/construct-sync.yml`
3. Test auto-sync: add a new `construct-*` repo, verify discovery within 24h
4. Verify QMD re-enablement: run sync, check failure count stays at 0
5. Domain backfill across 15 construct repos (operational task)

---

## 15. Design Decisions Log

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| `VARCHAR(50)` for `packs.category` | PostgreSQL ENUM, FK to categories table | VARCHAR avoids complex ALTER TYPE migrations. App-layer validation is sufficient. FK creates chicken-and-egg with auto-sync. |
| Shared package for constants | Copy-paste constants, API-only with client fetch | Copy-paste is the current bug. API-only adds latency and failure modes to what should be a static lookup. |
| Derive category from `domain[0]` | Separate `category` field in manifest | KISS. The data exists. No new field for the author to maintain. `domain` is freeform (useful for search), `domain[0]` is the structural category. |
| Git-sync as only publish path | Direct upload API, dual path | One path = one state machine = fewer bugs. The direct-upload stub was never completed. Git is already the source of truth. |
| `/skill-add` as a skill (not bash script) | Bash scaffolding, CLI subcommand | The agent can read existing skills for context, match style, propose content. A bash script can only template. |
| Daily cron for auto-sync | Webhook on repo push, manual trigger only | Webhook requires per-repo configuration. Daily cron is zero-config. Good enough for 15 repos. Webhook can be added later. |
| No `skillCategoryEnum` migration this cycle | Align enum with 8-category taxonomy | Risk/reward imbalanced. The enum affects the `skills` table (hundreds of rows). The packs category is VARCHAR. Enum alignment is a separate migration. |

---

## Next Step

`/sprint-plan` to create sprint breakdown from this SDD.
