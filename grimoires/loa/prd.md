# PRD: Construct Lifecycle — Type System, Dependency Graph, and Operational Gaps

**Cycle**: cycle-034
**Created**: 2026-02-21
**Status**: Draft
**Source Issue**: [#131](https://github.com/0xHoneyJar/loa-constructs/issues/131) (Construct Lifecycle)
**Predecessor**: cycle-033 (v2.5.0) — Verification Infrastructure (archived)
**Grounded in**:
- Codebase scan: `schema.ts` (1200+ lines), `constructs.ts` (334 lines), `packs.ts` (1965 lines), `git-sync.ts` (776 lines), `fetch-constructs.ts` (256 lines), `seed-forge-packs.ts` (172 lines)
- Issue #131 RFC body + 4 comments (lifecycle research, Gemini DX patterns, team feedback, v2.5.0 milestone)
- `_journal.json` — Drizzle migration journal at idx 2 (3 migrations behind)

---

## 1. Problem Statement

The Constructs Network supports **three construct archetypes** (skill-pack, tool-pack, codex, template) at the manifest level, but the registry has no way to distinguish them. A construct registering as `type: 'codex'` has its type silently dropped into a description string (`constructs.ts:312`). The explorer's dependency graph shows fake edges based on category matching, not real declared dependencies. The seed script silently skips repos that use `construct.yaml` instead of `manifest.json`.

**Four concrete problems:**

1. **Type is accepted but discarded.** `POST /v1/constructs/register` accepts `type: z.enum(['skill-pack', 'tool-pack', 'codex', 'template'])` at `constructs.ts:268`, but `createPack()` at `constructs.ts:310` has no `constructType` parameter — the type value becomes `description: 'A ${body.type} construct'`. The `packs` table (`schema.ts:472-548`) has no `construct_type` column.
   > Evidence: `constructs.ts:310-316` — `createPack({ name, slug, description: body.type ? 'A ${body.type} construct' : undefined, ... })`

2. **List filter uses wrong enum.** The `type` query parameter at `constructs.ts:38` accepts `['skill', 'pack', 'bundle']` — these are internal Construct interface types, not manifest archetypes. There's no way to filter by `skill-pack` vs `tool-pack` vs `codex` vs `template`.
   > Evidence: `constructs.ts:38` — `z.enum(['skill', 'pack', 'bundle'])`

3. **Explorer dependency graph is fabricated.** `computeEdges()` at `fetch-constructs.ts:236-256` matches packs to skills by `category`, not by declared `pack_dependencies` or `composes_with` from manifests. The comment at line 237 acknowledges this: `"Simplified edge computation - connects packs to skills in same category"`.
   > Evidence: `fetch-constructs.ts:244` — `const relatedSkills = skills.filter((s) => s.category === pack.category)`

4. **Seed script breaks on construct.yaml repos.** `seed-forge-packs.ts:148-154` reads `manifest.json` only. Repos using `construct.yaml` (the newer format read by git-sync at `git-sync.ts:622-660`) are silently skipped with a warning. As more repos migrate to `construct.yaml`, the seed script becomes unable to populate the registry.
   > Evidence: `seed-forge-packs.ts:152-154` — `console.warn('Skipping ${slug}: no manifest.json found'); continue;`

---

## 2. Vision

**Every construct on the network has a type, real dependency relationships, and reliable ingestion regardless of manifest format.** The registry accurately reflects the construct ecosystem's diversity (skill packs, tool packs, knowledge bases, templates) and the explorer shows real architectural relationships, not fabricated ones.

### Design Principles

| Principle | Application |
|-----------|------------|
| **Additive, not breaking** | New `construct_type` column defaults to `'skill-pack'`; existing data is valid without migration backfill |
| **Single source of truth** | Type comes from manifest (via git-sync) or explicit registration — not inferred |
| **Real over fake** | Replace category-based fake edges with actual `pack_dependencies` / `composes_with` from manifests |
| **Format agnostic** | Seed script handles both `manifest.json` and `construct.yaml` — same pack, either format |

---

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| G1: Construct type persisted | `packs.construct_type` column populated | All 5 registered packs have correct type |
| G2: Type-based filtering | `GET /v1/constructs?type=skill-pack` returns filtered results | Query returns only matching archetypes |
| G3: Real dependency graph | Explorer edges from `pack_dependencies` | Zero category-based fake edges |
| G4: API search used by explorer | Explorer `?q=` hits API relevance scoring | Client-side Fuse.js replaced |
| G5: Seed script handles construct.yaml | `construct.yaml` repos parsed correctly | All 5 construct-* repos seed successfully |
| G6: Drizzle journal synchronized | `_journal.json` matches production state | Zero out-of-band migrations |

---

## 4. Functional Requirements

### FR-1: `construct_type` Column on Packs Table

**File**: `apps/api/src/db/schema.ts:472-548`

Add a varchar column to the `packs` table:

```typescript
constructType: varchar('construct_type', { length: 20 }).default('skill-pack'),
```

**Why varchar, not enum**: The issue RFC + Gemini research (issue comment #2) suggest the type set is open — new types may emerge (e.g., `mcp-server`, `runtime-extension`). Using varchar with application-level Zod validation avoids `ALTER TYPE` migrations. This matches the `verificationTier` design decision from cycle-033 SDD §3.1.

Add index: `constructTypeIdx: index('idx_packs_construct_type').on(table.constructType)`

### FR-2: Persist Type at Registration and Sync

**File**: `apps/api/src/routes/constructs.ts:310-316`

Registration: Pass `body.type` to `createPack()` as `constructType` instead of embedding it in the description string.

**File**: `apps/api/src/routes/packs.ts` (sync transaction ~line 938-1030)

Sync: After parsing manifest, extract `type` field and write to `packs.constructType`. The manifest is already parsed by `readManifest()` in `git-sync.ts:622-660` — the `type` field is present in the JSONB but not extracted.

### FR-3: Update List Filter Enum

**File**: `apps/api/src/routes/constructs.ts:36-44`

Change the `type` filter from `z.enum(['skill', 'pack', 'bundle'])` to `z.enum(['skill-pack', 'tool-pack', 'codex', 'template'])`. Update the query logic in the list handler to filter on `packs.constructType` instead of the internal Construct type mapping.

Keep backward compatibility: also accept `'skill'`, `'pack'`, `'bundle'` as aliases that map to the old behavior (filtering by the internal type, or defaulting to `skill-pack`).

### FR-4: Real Dependency Graph in Explorer

**File**: `apps/explorer/lib/data/fetch-constructs.ts:236-256`

Replace `computeEdges()` with real dependency extraction:

1. Read `pack_dependencies` and `composes_with` from each construct's manifest (available in `APIConstruct.manifest`)
2. Match dependency slugs to nodes in the graph
3. Create edges with accurate `relationship` types: `'depends_on'` for `pack_dependencies`, `'composes_with'` for `composes_with`
4. Fall back to empty edges (not fake category edges) when no dependencies are declared

### FR-5: Wire Explorer Search to API

**File**: `apps/explorer/lib/hooks/use-search.ts`
**File**: `apps/explorer/app/(marketing)/constructs/page.tsx`

Replace client-side Fuse.js search with API `?q=` query parameter. The API already has full relevance scoring at `constructs.ts:150-241` (slug match, name match, keyword match, use-case match, TF-IDF scoring) that is currently unused by the frontend.

For the graph view, maintain the current fetch-all approach (needed for visualization). For the list/catalog page, switch to API-driven search with debounced queries.

### FR-6: Seed Script `construct.yaml` Support

**File**: `scripts/seed-forge-packs.ts:148-154`

When `manifest.json` is not found, try reading `construct.yaml` via `js-yaml` (add as dev dependency). Transform the YAML manifest to the expected `PackManifest` shape. Extract and use the `type` field for the `constructType` column.

Also: add identity directory parsing (read `identity/persona.yaml` and `identity/expertise.yaml`) to populate `construct_identities` during seeding — matching the git-sync behavior.

### FR-7: Migration File + Journal Sync

**File**: `apps/api/drizzle/0006_construct_type.sql` (new)

Create migration:
```sql
-- Add construct_type to packs table
ALTER TABLE "packs" ADD COLUMN IF NOT EXISTS "construct_type" varchar(20) DEFAULT 'skill-pack';
CREATE INDEX IF NOT EXISTS "idx_packs_construct_type" ON "packs" ("construct_type");
```

Also update `drizzle/meta/_journal.json` to add entries for migrations 0003-0005 that were applied out-of-band, plus the new 0006. This synchronizes the journal with production reality.

### FR-8: Document Webhook Configuration

**File**: `.env.example`

Document `GITHUB_WEBHOOK_SECRET` variable. Create `scripts/configure-webhooks.sh` that uses `gh api` to register/verify webhooks on all 5 construct-* repos pointing to `https://api.constructs.network/v1/webhooks/github`.

---

## 5. Technical Requirements

### TR-1: Backward Compatibility

- `construct_type` column defaults to `'skill-pack'` — all existing packs are valid
- List filter accepts both old (`skill/pack/bundle`) and new (`skill-pack/tool-pack/codex/template`) values
- Explorer handles missing `pack_dependencies` gracefully (empty edges, not errors)
- Seed script tries `manifest.json` first, falls back to `construct.yaml`

### TR-2: Performance

- `construct_type` index enables O(1) type filtering
- API search replaces O(n) client-side Fuse.js with indexed DB queries
- Dependency graph computed from already-fetched manifest data (no new API calls)

### TR-3: No New Dependencies

- `js-yaml` added to seed script only (dev dependency, not production API)
- No new npm packages for API or explorer changes

---

## 6. Scope & Prioritization

### In Scope (This Cycle)

- `construct_type` column + migration + journal sync
- Type persistence at registration and sync
- Updated list filter enum
- Real dependency graph in explorer
- Explorer search wired to API
- Seed script `construct.yaml` + identity parsing
- Webhook configuration script + env documentation

### Out of Scope (Future)

- Verifier role (non-owner POST verification) — Phase 2
- `constructs upstream` bidirectional sync — Phase 3
- mibera-codex MCP access layer — separate issue
- Hub-interface construct extraction (Easel/Mint/Cartograph) — separate repos
- Version pinning / lock files — Phase 3
- Explorer search full UX redesign — Phase 4
- `construct-network-tools` skill implementations — separate issue

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Drizzle journal sync causes duplicate table creation | Medium | High | All statements use `IF NOT EXISTS`. Test with `drizzle-kit push --dry-run` first. |
| Changing list filter breaks existing API consumers | Low | Medium | Accept both old and new enum values. Deprecate old values in response headers. |
| Real dependency graph has broken edges (slug mismatches) | Medium | Low | Graceful fallback — skip unresolvable slugs, log warning. |
| `construct.yaml` parsing misses fields that `manifest.json` had | Low | Low | Validate parsed output against same `PackManifest` shape. Log discrepancies. |

---

## 8. Proposed Sprint Sequence

| Sprint | Label | Deliverables | FR Coverage |
|--------|-------|-------------|-------------|
| Sprint 1 | Type System Foundation | `construct_type` column, migration 0006, journal sync, persist at register + sync | FR-1, FR-2, FR-3, FR-7 |
| Sprint 2 | Explorer Reality | Real dependency graph, API search wiring, construct type display | FR-4, FR-5 |
| Sprint 3 | Operational Closure | Seed script construct.yaml, webhook config script, env docs | FR-6, FR-8 |

---

## 9. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `packs.construct_type` column exists | `SELECT construct_type FROM packs LIMIT 1` succeeds |
| AC-2 | `POST /v1/constructs/register` with `type: 'codex'` persists the type | Query `packs.construct_type = 'codex'` for registered slug |
| AC-3 | `POST /v1/packs/:slug/sync` extracts type from manifest | After sync, `packs.construct_type` matches manifest `type` field |
| AC-4 | `GET /v1/constructs?type=skill-pack` filters correctly | Returns only packs with `construct_type = 'skill-pack'` |
| AC-5 | Explorer dependency graph shows real edges | `computeEdges()` reads `pack_dependencies` from manifest |
| AC-6 | Explorer search hits API `?q=` endpoint | Network tab shows `GET /v1/constructs?q=observer` on search |
| AC-7 | Seed script handles construct.yaml repos | All 5 construct-* repos seed without "Skipping" warnings |
| AC-8 | Drizzle journal has entries for 0000-0006 | `_journal.json` has 7 entries |
| AC-9 | `pnpm turbo build` passes | API + explorer build clean |
| AC-10 | Webhook config script reports success on all 5 repos | `scripts/configure-webhooks.sh` exits 0 |

---

## Next Step

`/architect` — Software Design Document for type system column design, dependency graph extraction, API search integration, and migration strategy.
