# Sprint Plan: Network Cohesion — Construct DX at Platform Scale

**Cycle**: cycle-041
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Sprints**: 3
**Total tasks**: 16

---

## Sprint 1: Category Pipeline — Migration → Shared → API → Explorer

**Label**: Category Derivation Pipeline
**Global ID**: sprint-45
**FR**: FR-1, FR-2, FR-3
**Goal**: Every construct returns a real category from the API. Delete the frontend hack. One source of truth.

### Tasks

#### 1.1 — Create shared category constants

**File**: `packages/shared/src/categories.ts` (new)
**Action**: Create file with `CATEGORY_SLUGS`, `CATEGORIES`, `LEGACY_SLUG_MAPPINGS`, `normalizeCategory()`, `isValidCategory()`, `CategorySlug` type, `CategoryDefinition` interface.
**AC**:
- [ ] `CATEGORY_SLUGS` is a const array of 8 slugs
- [ ] `CategorySlug` is a union type derived from the array
- [ ] `normalizeCategory('gtm')` returns `'marketing'`
- [ ] `isValidCategory('design')` returns `true`
- [ ] File exports only pure functions, constants, and types (no side effects)

#### 1.2 — Export categories from shared barrel

**File**: `packages/shared/src/index.ts`
**Action**: Add `export * from './categories.js';`
**AC**:
- [ ] `import { normalizeCategory, CATEGORIES } from '@loa-constructs/shared'` works

#### 1.3 — Add `category` column to packs table (schema)

**File**: `apps/api/src/db/schema.ts`
**Action**: Add `category: varchar('category', { length: 50 })` to packs table after `constructType` (line ~576). Add `categoryIdx: index('idx_packs_category').on(table.category)` to indexes.
**AC**:
- [ ] `category` field exists on packs table definition
- [ ] Index defined in table config

#### 1.4 — Create migration SQL

**File**: `apps/api/src/db/migrations/0011_packs_category.sql` (new)
**Action**: `ALTER TABLE packs ADD COLUMN category VARCHAR(50)`. `CREATE INDEX idx_packs_category ON packs(category)`. Backfill from `search_use_cases[1]` with legacy mapping CASE statement. Default to `'development'`.
**AC**:
- [ ] Migration wrapped in BEGIN/COMMIT
- [ ] Backfill handles NULL `search_use_cases`
- [ ] Legacy slugs normalized in CASE (gtm→marketing, devops→operations, etc.)

#### 1.5 — API returns real category for packs

**File**: `apps/api/src/services/constructs.ts:393`
**Action**: Change `category: null` to `category: pack.category || null`.
**AC**:
- [ ] `GET /v1/constructs` returns non-null `category` for all published packs
- [ ] Zero lines reference `category: null` for pack responses

#### 1.6 — Category service imports from shared, counts packs

**File**: `apps/api/src/services/category.ts`
**Action**: Delete local `LEGACY_SLUG_MAPPINGS`, `normalizeCategory()`, and `DEFAULT_CATEGORIES`. Import from `@loa-constructs/shared`. Add pack count query in `listCategories()` alongside existing skill count. Merge into `countMap`.
**AC**:
- [ ] Zero local category constant definitions remain
- [ ] `listCategories()` returns counts reflecting both skills and packs per category
- [ ] Fallback still works (shared `CATEGORIES` as default)

#### 1.7 — Explorer deletes SLUG_CATEGORY_MAP, uses shared

**File**: `apps/explorer/lib/data/fetch-constructs.ts`
**Action**: Delete `SLUG_CATEGORY_MAP` (lines 74-91). Simplify line 99 to `normalizeCategory(construct.category || 'development')`. Import `normalizeCategory` from shared (via fetch-categories re-export).
**AC**:
- [ ] Zero hardcoded slug→category mappings in explorer
- [ ] `transformToNode` still produces valid category for all constructs

#### 1.8 — Explorer categories file imports from shared

**File**: `apps/explorer/lib/data/fetch-categories.ts`
**Action**: Delete local `DEFAULT_CATEGORIES` array, `LEGACY_SLUG_MAPPINGS`, and `normalizeCategory` function. Import from `@loa-constructs/shared`. Build `DEFAULT_CATEGORIES` from shared `CATEGORIES`.
**AC**:
- [ ] Zero local category definitions in fetch-categories.ts
- [ ] `fetchCategories()` fallback uses shared constants
- [ ] `normalizeCategory` re-exported for use by fetch-constructs.ts

#### 1.9 — Seed script derives category from domain[0]

**File**: `scripts/seed-forge-packs.ts`
**Action**: Import `normalizeCategory` from shared. After extracting `searchUseCases` (~line 578), derive `category` from `domain[0]` via `normalizeCategory()`, default `'development'`. Add `category` to INSERT column list and ON CONFLICT UPDATE SET.
**AC**:
- [ ] `category` column populated for all 15 packs after seed
- [ ] Packs with `domain` in manifest get correct derived category
- [ ] Packs without `domain` get `'development'`

#### 1.10 — Apply migration and re-seed production

**Action**: Run migration via `bun -e` with postgres driver against production Supabase. Re-run `bun seed:forge` to populate category from existing domain fields.
**AC**:
- [ ] `SELECT slug, category FROM packs` returns non-null for all 15 rows
- [ ] `GET /v1/constructs` on production returns real categories
- [ ] Explorer graph shows constructs distributed across categories (not single-color blob)

---

## Sprint 2: Scaffold + Publish + Skill-Add

**Label**: Author DX — Scaffold, Publish, Skill-Add
**Global ID**: sprint-46
**FR**: FR-4, FR-5, FR-6
**Goal**: Two-phase construct authoring works end-to-end: create → skill-add → publish.

### Tasks

#### 2.1 — Verify scaffold produces minimal output

**File**: `.claude/scripts/constructs-create.sh`
**Action**: Verify current state matches SDD §7. The scaffold was already revised in this session. Run `constructs-create.sh new --name test-construct --type skill-pack` and confirm output structure.
**AC**:
- [ ] `construct.yaml` has exactly 7 lines (name, slug, version, type, description, license, schema_version)
- [ ] `skills/<slug>/` directory (not `skills/example/`)
- [ ] `commands/<slug>.md` with routing frontmatter (agent, agent_path, context_files)
- [ ] No `identity/`, `contexts/`, `capabilities`, `domain`, `paths` generated

#### 2.2 — Create `/skill-add` truename

**Files**: `.claude/skills/adding-skills/index.yaml` (new), `.claude/skills/adding-skills/SKILL.md` (new), `.claude/commands/skill-add.md` (new)
**Action**: Create skill that takes `<name>` argument, detects construct root, reads existing skills for context, creates `skills/<name>/{index.yaml, SKILL.md}` and `commands/<name>.md`.
**AC**:
- [ ] `/skill-add research` creates `skills/research/index.yaml` with name, triggers, entry
- [ ] `/skill-add research` creates `skills/research/SKILL.md` with workflow stub
- [ ] `/skill-add research` creates `commands/research.md` with routing frontmatter
- [ ] Errors clearly if not in a construct directory (no `construct.yaml`)
- [ ] Errors if `skills/<name>/` already exists

#### 2.3 — Replace publish stub with git-sync

**File**: `.claude/scripts/constructs-publish.sh`
**Action**: Replace lines 316-317 (`print_warning "Publish upload not yet implemented"`) with `git push origin HEAD --tags` + `curl POST /v1/packs/:slug/sync`. Add version-bump support in the agent skill.
**AC**:
- [ ] `constructs-publish.sh push <path>` no longer prints "not yet implemented"
- [ ] Successful push triggers git push + sync API call
- [ ] Sync success/failure reported to user

#### 2.4 — Update `/construct-publish` skill for full flow

**File**: `.claude/skills/publishing-constructs/SKILL.md`
**Action**: Update to implement full publish flow: filesystem discovery, Tier 2 field prompting, domain suggestion, validation, version bump (patch|minor|major), call publish script.
**AC**:
- [ ] `/construct-publish patch` bumps version, commits, tags, pushes, syncs
- [ ] Missing `description` (still "TODO") prompts user
- [ ] Missing `domain` prompts with suggestion
- [ ] Validation errors show file + field + suggestion (errors are navigation)

---

## Sprint 3: Auto-Sync + QMD + Domain Backfill

**Label**: Network Automation — Auto-Sync, QMD, Backfill
**Global ID**: sprint-47
**FR**: FR-7, FR-8, FR-3 (operational)
**Goal**: New construct repos auto-enter the network. QMD operational. All 15 constructs have correct domain.

### Tasks

#### 3.1 — Complete `--register` flag in discover-constructs.ts

**File**: `scripts/discover-constructs.ts`
**Action**: Replace stub at lines 237-240 with implementation that reports discovered repos for sync. The actual registration happens through `seed-forge-packs.ts` with `AUTO_DISCOVER=true`.
**AC**:
- [ ] `--register` outputs actionable report of missing constructs
- [ ] Report includes git URL and suggested next step
- [ ] Script returns JSON when combined with `--json`

#### 3.2 — Create auto-sync GitHub Action

**File**: `.github/workflows/construct-sync.yml` (new)
**Action**: Daily cron at 6 AM UTC. Checkout, setup bun, install deps, run discover with `--register --json`, then run seed with `AUTO_DISCOVER=true`.
**AC**:
- [ ] Action triggers on schedule (daily) and workflow_dispatch
- [ ] Uses `GH_TOKEN` and `DATABASE_URL` secrets
- [ ] New `construct-*` repos discovered and synced within 24h

#### 3.3 — Verify QMD re-enablement

**Action**: Run QMD sync against expanded collections. Verify failure count stays at 0. Test query against `constructs` collection.
**AC**:
- [ ] `.loa.config.yaml` has `memory.qmd.enabled: true`
- [ ] `.loa/qmd/.failure_count` = 0 after sync
- [ ] `constructs` collection indexes SKILL.md files from installed packs
- [ ] `grimoires-all` collection indexes grimoire markdown

#### 3.4 — Domain backfill across 15 construct repos

**Action**: For each construct repo under `0xHoneyJar`, add/verify `domain:` field in `construct.yaml` with assignments from PRD §FR-3.2. Use `gh` CLI to batch.
**AC**:
- [ ] All 15 repos have `domain: [<primary>, ...]` in construct.yaml
- [ ] Assignments match: artisan→design, observer→analytics, protocol→development, etc.
- [ ] Re-run `bun seed:forge` populates correct category for all 15

---

## Risk Mitigation

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Migration fails on production | 1 | Run via `bun -e` in transaction. Test backfill logic locally first. |
| Shared package breaks explorer build | 1 | Pure functions + constants only. No Node.js imports. CI catches. |
| Domain backfill requires 15 repo touches | 3 | Batch with `gh` CLI. Direct push where team has write access. |
| QMD failures recur | 3 | Three-tier fallback. QMD is never a gate. |
| Git-sync endpoint returns error during publish | 2 | Warn and suggest manual `bun seed:forge`. Don't block the git push. |

---

## Dependencies

```
Sprint 1 ──► Sprint 2 (publish needs category in API)
Sprint 1 ──► Sprint 3 (domain backfill needs category column)
Sprint 2 is independent of Sprint 3 (can parallelize)
```

Sprint 1 is the critical path. Sprints 2 and 3 can proceed in parallel after Sprint 1 completes.
