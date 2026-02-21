# Sprint Plan: Construct Lifecycle — Type System, Dependency Graph, and Operational Gaps

**Cycle**: cycle-034
**Created**: 2026-02-21
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Sprints**: 3 (global IDs: sprint-31, sprint-32, sprint-33)

---

## Sprint 1: Type System Foundation (sprint-31)

**Goal**: Add `construct_type` column to packs table and wire it through registration, sync, and list filter.

### Tasks

| ID | Task | Files | AC |
|----|------|-------|-----|
| T1.1 | Add `constructType` column to packs schema | `schema.ts:529` | Column exists with default `'skill-pack'`, index created |
| T1.2 | Create migration 0006 | `drizzle/0006_construct_type.sql` (new) | SQL file with `IF NOT EXISTS`, backfill UPDATE |
| T1.3 | Sync Drizzle journal entries 0003-0006 | `drizzle/meta/_journal.json` | Journal has 7 entries (idx 0-6) |
| T1.4 | Add `constructType` to CreatePackInput + createPack | `services/packs.ts:28-43, 91-109` | `constructType` included in insert values |
| T1.5 | Persist type at registration | `routes/constructs.ts:310-316` | `createPack()` called with `constructType: body.type` |
| T1.6 | Extract type during sync | `routes/packs.ts:1001-1010` | Manifest `type` field written to `packs.constructType` on sync |
| T1.7 | Update list filter enum | `routes/constructs.ts:36-44` | Zod accepts both old and new type values |
| T1.8 | Add archetype filter to listConstructs | `services/constructs.ts:422-518, 837-920` | `?type=skill-pack` filters by `constructType` column |
| T1.9 | Add `constructType` to Construct interface + response | `services/constructs.ts:37-78, 333-413`, `routes/constructs.ts:48-74` | API response includes `construct_type` field |
| T1.10 | Build verification | Run `pnpm turbo build` | API builds clean, no type errors |

### Sprint 1 Acceptance Criteria

1. `pnpm turbo build` passes for `apps/api`
2. `packs` table has `construct_type` column (verify in schema.ts)
3. Migration 0006 SQL file exists and is syntactically valid
4. `_journal.json` has entries for migrations 0000-0006
5. `POST /v1/constructs/register` with `type: 'codex'` would persist to `constructType`
6. Sync flow extracts `type` from manifest and writes to `packs.constructType`
7. `GET /v1/constructs?type=skill-pack` routes to archetype filter
8. API response includes `construct_type` field

---

## Sprint 2: Explorer Reality (sprint-32)

**Goal**: Replace fake dependency graph with real manifest-based edges and wire search to API.

### Tasks

| ID | Task | Files | AC |
|----|------|-------|-----|
| T2.1 | Replace computeEdges() with real deps | `fetch-constructs.ts:236-256` | Edges from `pack_dependencies` + `composes_with`, not category |
| T2.2 | Add `construct_type` to APIConstruct | `fetch-constructs.ts:6-45` | `construct_type?: string` in interface |
| T2.3 | Add `constructType` to graph types | `lib/types/graph.ts` | `constructType` on ConstructNode and ConstructDetail |
| T2.4 | Transform construct_type in fetch layer | `fetch-constructs.ts` transform functions | `constructType` mapped from API response |
| T2.5 | Create useAPISearch hook | `lib/hooks/use-api-search.ts` (new) | Debounced fetch to `/v1/constructs?q=` with loading state |
| T2.6 | Wire catalog page to API search | `app/(marketing)/constructs/page.tsx` | Search input triggers API call, not client-side filter |
| T2.7 | Show construct type on detail page | `app/(marketing)/constructs/[slug]/page.tsx` | Archetype label displayed (e.g., "Skill Pack", "Knowledge Base") |
| T2.8 | Build verification | Run `pnpm turbo build` | Explorer builds clean |

### Sprint 2 Acceptance Criteria

1. `pnpm turbo build` passes for `apps/explorer`
2. `computeEdges()` reads `pack_dependencies` and `composes_with` from manifest data
3. No category-based fake edges in dependency graph
4. `useAPISearch` hook exists with debounced API calls
5. Construct detail page shows archetype label
6. No regressions in graph view (still uses existing Fuse.js for visualization search)

---

## Sprint 3: Operational Closure (sprint-33)

**Goal**: Fix seed script, configure webhooks, document env vars.

### Tasks

| ID | Task | Files | AC |
|----|------|-------|-----|
| T3.1 | Add js-yaml dependency | `package.json` | `js-yaml` in devDependencies |
| T3.2 | Implement construct.yaml parsing in seed | `scripts/seed-forge-packs.ts:148-154` | YAML parsed and transformed to PackManifest shape |
| T3.3 | Add identity parsing to seed | `scripts/seed-forge-packs.ts` | `identity/persona.yaml` and `identity/expertise.yaml` read if present |
| T3.4 | Add constructType to seed upsert | `scripts/seed-forge-packs.ts` | `construct_type` populated from manifest `type` field |
| T3.5 | Create webhook config script | `scripts/configure-webhooks.sh` (new) | Script creates/updates webhooks on all 5 construct-* repos |
| T3.6 | Document GITHUB_WEBHOOK_SECRET | `.env.example` | Variable documented with description |
| T3.7 | Build + lint verification | Run `pnpm turbo build` | All apps build clean |

### Sprint 3 Acceptance Criteria

1. Seed script processes repos with only `construct.yaml` (no "Skipping" warnings)
2. Seed script reads identity YAML files when present
3. `scripts/configure-webhooks.sh` exists and is executable
4. `.env.example` documents `GITHUB_WEBHOOK_SECRET`
5. `pnpm turbo build` passes for all apps

---

## Dependencies

```
Sprint 1 ──blocks──→ Sprint 2 (explorer needs API construct_type field)
Sprint 1 ──blocks──→ Sprint 3 (seed script needs constructType column)
Sprint 2 ────────────── independent of ──→ Sprint 3
```

Sprint 2 and Sprint 3 can run in parallel after Sprint 1 completes.

---

## Risk Mitigations

| Risk | Sprint | Mitigation |
|------|--------|-----------|
| Drizzle journal conflict | 1 | `IF NOT EXISTS` everywhere; dry-run before production |
| Breaking existing API consumers | 1 | Accept both old and new enum values; backward compatible |
| Empty dependency graph | 2 | Graceful: zero edges > fake edges; log unresolvable slugs |
| Seed script YAML parsing errors | 3 | Safe YAML load; validate against PackManifest; skip malformed |
