# Sprint Plan: Construct Composability Infrastructure

**Cycle**: cycle-051
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Created**: 2026-03-13

---

## Sprint 1: Schema + API + Audit (The Data Foundation)

**Goal**: Every construct has declared composition_paths and governance. The API surfaces them. Islands drop from 15 to ≤5.

### T1.1 — Zod Schema: Add Composability Fields

**File**: `packages/shared/src/validation.ts`

**Work**:
1. Add `compositionPathsSchema` with `writes` and `reads` arrays
2. Add `governs` and `governed_by` fields to `packManifestSchema`
3. Export `CompositionPaths` type

**AC**:
- [ ] `compositionPathsSchema` validates `{ writes?: string[], reads?: string[] }`
- [ ] `packManifestSchema` accepts `composition_paths`, `governs`, `governed_by` as optional fields
- [ ] Existing manifests without these fields pass validation unchanged
- [ ] `CompositionPaths` type exported from `packages/shared/src/validation.ts`
- [ ] `governs` and `governed_by` use `slugSchema` for each element

---

### T1.2 — Seed Normalization: paths.writes/reads to composition_paths

**File**: `scripts/seed-forge-packs.ts`

**Work**:
1. In `normalizeForValidation()`, detect when `paths` contains `writes`/`reads` arrays (composition intent vs runtime paths)
2. Move those to `composition_paths` and preserve any runtime path fields (`state`, `cache`, `output`)
3. Enhance `--dry-run` output to log composition_paths and governance counts

**AC**:
- [ ] A construct.yaml with `paths: { writes: [...], reads: [...] }` is normalized to `composition_paths: { writes: [...], reads: [...] }`
- [ ] A construct.yaml with `paths: { state: ".ck/", writes: [...] }` preserves `state` in `paths` and moves `writes` to `composition_paths`
- [ ] A construct.yaml with `composition_paths: { writes: [...] }` passes through unmodified
- [ ] `--dry-run` output shows `→ composition_paths: writes=N, reads=N` and `→ governs: [slugs]  governed_by: [slugs]` per construct
- [ ] Seed completes successfully with both old and new manifest formats

---

### T1.3 — API Formatters: Surface Composability in Response

**File**: `apps/api/src/routes/constructs.ts`

**Work**:
1. Add `composition_paths`, `governs`, `governed_by` to `formatConstruct()` (list endpoint)
2. Add same fields to `formatConstructDetail()` (detail endpoint)
3. Extract from `c.manifest` JSONB — no service layer changes needed

**AC**:
- [ ] `GET /v1/constructs` response includes `composition_paths`, `governs`, `governed_by` per construct (null when absent)
- [ ] `GET /v1/constructs/:slug` response includes same fields
- [ ] Constructs without composability data return `null` for all three fields (not missing keys)
- [ ] Existing API tests pass without modification

---

### T1.4 — Explorer Types: Extend Graph and Detail Types

**Files**:
- `apps/explorer/lib/types/graph.ts`
- `apps/explorer/lib/data/fetch-constructs.ts`

**Work**:
1. Add `'connected_via'` and `'governs'` to `EdgeRelationship` type
2. Extend `ConstructDetail` with `compositionPaths`, `governs`, `governedBy`, `connectedVia`
3. Extend `APIConstruct` interface with `composition_paths`, `governs`, `governed_by` fields in manifest

**AC**:
- [ ] `EdgeRelationship` includes `'connected_via' | 'governs'`
- [ ] `ConstructDetail` has `compositionPaths: { writes?: string[]; reads?: string[] } | null`
- [ ] `ConstructDetail` has `governs: string[]` and `governedBy: string[]`
- [ ] `ConstructDetail` has `connectedVia: Array<{ slug: string; path: string; direction: 'reads' | 'writes' }>`
- [ ] `APIConstruct.manifest` shape includes `composition_paths`, `governs`, `governed_by`
- [ ] `fetchConstruct()` maps API response to new `ConstructDetail` fields
- [ ] TypeScript compiles with no errors

---

### T1.5 — Construct Audit: Populate composition_paths for All 23 Constructs

**Scope**: All construct repos in `0xHoneyJar/construct-*`

**Work**:
1. For each construct, read SKILL.md files to identify grimoire paths actually read/written
2. Add `composition_paths` to `construct.yaml` with discovered paths
3. Update `composes_with` based on actual relationships found during audit
4. Submit PRs to each construct repo

**AC**:
- [ ] All 23 constructs have `composition_paths` in `construct.yaml`
- [ ] `writes` arrays contain only paths the construct actually creates files in
- [ ] `reads` arrays contain only paths the construct actually reads from
- [ ] `composes_with` reflects actual relationships (not aspirational)
- [ ] Islands reduced from 15 to ≤5 (measured by constructs with zero edges in graph)
- [ ] Each construct repo has a PR with changes

**Known relationships to declare** (from diagnostic):
| Construct | Writes | Reads |
|-----------|--------|-------|
| observer | `grimoires/laboratory/canvases/`, `grimoires/laboratory/synthesis/` | — |
| artisan | `grimoires/laboratory/taste/` | `grimoires/laboratory/canvases/` |
| crucible | `grimoires/laboratory/journeys/` | `grimoires/laboratory/canvases/` |
| the-easel | `grimoires/laboratory/tdr/` | `grimoires/laboratory/taste/` |
| herald | `grimoires/comms/releases/` | `grimoires/laboratory/synthesis/` |
| gecko | `grimoires/gecko/observations.jsonl` | `grimoires/laboratory/canvases/` |
| social-oracle | `grimoires/comms/social/` | `grimoires/comms/releases/` |
| k-hole | `grimoires/research/digs/` | — |
| vocabulary-bank | `grimoires/vocabulary/` | — |
| protocol | — | `grimoires/laboratory/canvases/` |

---

### T1.6 — Governance Audit: Declare Governance Relationships

**Scope**: Cross-cutting constructs only

**Work**:
1. Identify constructs that constrain other constructs (grammars, not dependencies)
2. Add `governs` to governing constructs and `governed_by` to governed constructs
3. Submit PRs alongside T1.5

**AC**:
- [ ] vocabulary-bank declares `governs: [artisan, the-easel, herald]` (vocabulary governance)
- [ ] artisan declares `governs: [the-easel, webreel, showcase]` (taste token governance)
- [ ] Governed constructs declare corresponding `governed_by` arrays
- [ ] ≥5 governance relationships declared across the network
- [ ] Governance is bidirectional-consistent: if A governs B, B lists A in governed_by

---

### T1.7 — Placeholder Cleanup: Remove consumes: ['?']

**Scope**: 8 constructs with placeholder data

**Work**:
1. For each construct with `consumes: ['?']`, determine actual consumed events or remove the field
2. Update construct.yaml files

**AC**:
- [ ] Zero constructs have `consumes: ['?']` in their manifest
- [ ] Constructs that genuinely consume events have real event names listed
- [ ] Constructs that don't consume events have the field removed entirely

---

### T1.8 — Seed + Verify: End-to-End Data Path

**Work**:
1. Run `seed-forge-packs.ts --dry-run` to validate all manifests
2. Run seed against staging/production
3. Query API to verify composition data in responses

**AC**:
- [ ] `--dry-run` passes with 0 validation failures
- [ ] Production API `GET /v1/constructs` returns `composition_paths` for ≥15 constructs
- [ ] Production API `GET /v1/constructs/observer` returns correct `composition_paths.writes` and `governs`/`governed_by`
- [ ] Cache invalidation confirmed (Redis keys expired or busted)

---

## Sprint 2: Validation + Explorer (The Visible Payoff)

**Goal**: Users see composition in the explorer. Authors get validation feedback. Graph shows real relationships.

### T2.1 — Validation Script: Composition Health Check

**File**: `scripts/validate-composition.ts` (new)

**Work**:
1. Read all construct.yaml files from `.cache/construct-repos/`
2. Check ghost wires (reads with no matching writer)
3. Check orphan outputs (writes with no matching reader)
4. Check governance consistency (bidirectional declaration)
5. Check placeholder cleanup (no remaining `consumes: ['?']`)

**AC**:
- [ ] Script runs with `bun tsx scripts/validate-composition.ts`
- [ ] Reports ghost wires with construct slug and path
- [ ] Reports orphan outputs with construct slug and path
- [ ] Reports governance mismatches (A governs B but B missing governed_by A)
- [ ] Exit code 0 if only warnings/info, exit code 1 if errors
- [ ] Human-readable output with summary line

---

### T2.2 — Path Connections: computePathConnections()

**File**: `apps/explorer/lib/data/fetch-constructs.ts`

**Work**:
1. Implement `computePathConnections()` that cross-references writes/reads across all constructs
2. Build writer index (path → slugs that write to it)
3. For each reader, find matching writers and create PathConnection objects

**AC**:
- [ ] Function returns `PathConnection[]` with `sourceSlug`, `targetSlug`, `sharedPath`
- [ ] Self-references excluded (construct reading its own writes)
- [ ] Duplicate connections deduplicated
- [ ] Works with empty/null composition_paths gracefully

---

### T2.3 — Detail Panel: "Connected Via" Section

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

**Work**:
1. Add "Connected via" section between "Composes with" and "Commands" in Tier 2
2. Show shared grimoire paths with direction indicators (reads from / writes to)
3. Show governance relationships (governs / governed by)
4. Link construct names to their detail pages

**AC**:
- [ ] "Connected via" section renders when construct has path connections or governance
- [ ] Each shared path shows direction and linked construct slug
- [ ] "Governs" shows as distinct subsection with linked slugs
- [ ] "Governed by" shows as distinct subsection with linked slugs
- [ ] Section hidden when construct has no composition data
- [ ] Links navigate to correct construct detail page
- [ ] Follows existing Tier 2 visual language (font-mono, void-border, bone-ghost)

---

### T2.4 — Graph Edges: connected_via and governs

**File**: `apps/explorer/lib/data/fetch-constructs.ts`

**Work**:
1. Integrate `computePathConnections()` into `computeEdges()`
2. Add governance edges from `governs` manifest field
3. Assign edge IDs with prefixes: `${sourceId}-via-${targetId}`, `${sourceId}-gov-${targetId}`

**AC**:
- [ ] `computeEdges()` returns edges with `relationship: 'connected_via'` for path connections
- [ ] `computeEdges()` returns edges with `relationship: 'governs'` for governance
- [ ] Edge IDs unique and prefixed by type
- [ ] No duplicate edges (dedup by source+target+relationship)
- [ ] Graph renders without errors with new edge types

---

### T2.5 — Graph Styling: Distinct Visuals for New Edge Types

**File**: `apps/explorer/components/graph/network-graph.tsx`

**Work**:
1. Map edge relationship types to colors and opacity
2. `connected_via` edges: amber (#ffd93d), opacity 0.3
3. `governs` edges: coral (#ff6b6b), opacity 0.5
4. Consider dashed line rendering for governance edges (Three.js LineDashedMaterial)

**AC**:
- [ ] `connected_via` edges visually distinct from `composes_with` and `depends_on`
- [ ] `governs` edges visually distinct from all other types
- [ ] Edge colors match SDD specification
- [ ] Edge visibility controlled — users can toggle edge types (if existing filter UI supports it)
- [ ] Performance acceptable with additional edge count (test with ≥50 edges)

---

### T2.6 — Edge Type Legend

**File**: `apps/explorer/components/graph/` (existing legend component or new)

**Work**:
1. Add legend items for `connected_via` and `governs` edge types
2. Use matching colors from T2.5

**AC**:
- [ ] Legend shows all edge types: depends_on, composes_with, connected_via, governs
- [ ] Legend colors match edge colors in graph
- [ ] Legend visible without obstructing graph interaction

---

### T2.7 — Integration Test: End-to-End Verification

**Work**:
1. Seed with composition data
2. Hit API list and detail endpoints
3. Load explorer detail page and verify "Connected via" renders
4. Load explorer graph and verify new edges appear
5. Run validate-composition.ts and confirm clean output

**AC**:
- [ ] API list response contains `composition_paths` for ≥15 constructs
- [ ] API detail response for `observer` shows `composition_paths.writes` with ≥2 paths
- [ ] Explorer detail page for `observer` shows "Connected via" with ≥1 connected construct
- [ ] Explorer graph shows ≥10 path-based edges and ≥3 governance edges
- [ ] `validate-composition.ts` reports 0 errors, ≤3 warnings
- [ ] Islands count ≤5 (measured by constructs with zero edges in graph)
