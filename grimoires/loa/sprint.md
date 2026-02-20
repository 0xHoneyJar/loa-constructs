# Sprint Plan: Bridgebuilder Cycle B — Wire the Workshop Through

**Cycle**: cycle-031
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-02-20
**Status**: Ready for Implementation

---

## Overview

| Aspect | Value |
|--------|-------|
| Total sprints | 2 |
| Total tasks | 8 |
| Goal | Wire API enrichment data through explorer frontend, fix YAML parsing in workflow reader, add construct journey discovery to golden-path |

### Sprint Summary

| Sprint | Focus | Tasks | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | Explorer Wiring (FR-1, FR-2, FR-3) | 5 | Maturity fix, enrichment types, detail page UI, build passing |
| 2 | Shell Wiring (FR-4, FR-5) | 3 | YAML parsing bridge, construct journey discovery, syntax passing |

---

## Sprint 1: Explorer Wiring

**Focus**: Fix maturity mismatch, extend types to consume API enrichment data, render on detail page.
**Acceptance criteria**: `pnpm --filter explorer build` passes.

### Task 1.1: FR-1 — Fix maturity field mismatch

**File**: `apps/explorer/lib/data/fetch-constructs.ts`
**What**:
- Line 17: Rename `graduation_level?: string` → `maturity?: string` in `APIConstruct`
- Line 61: Change `construct.graduation_level` → `construct.maturity` in `transformToNode`
**Acceptance**: `parseGraduationLevel()` receives API's actual `maturity` value.

### Task 1.2: FR-2 — Extend APIConstruct with enrichment fields

**File**: `apps/explorer/lib/data/fetch-constructs.ts`
**What**: Add to `APIConstruct` interface (after line 25):
- `rating?: number | null`
- `long_description?: string | null`
- `owner?: { name: string; type: 'user' | 'team'; avatar_url: string | null } | null`
- `has_identity?: boolean`
- `identity?: { cognitive_frame: unknown; expertise_domains: unknown; voice_config: unknown; model_preferences: unknown } | null`
- `repository_url?: string | null`
- `homepage_url?: string | null`
- `documentation_url?: string | null`
- `icon?: string | null`
**Acceptance**: Interface matches `formatConstructDetail()` response shape.

### Task 1.3: FR-2 — Extend graph types and transforms

**Files**: `apps/explorer/lib/types/graph.ts`, `apps/explorer/lib/data/fetch-constructs.ts`
**What**:
- Add `rating?: number | null` to `ConstructNode` interface
- Add `longDescription`, `owner`, `hasIdentity`, `repositoryUrl`, `homepageUrl`, `documentationUrl` to `ConstructDetail`
- Update `transformToNode` to pass through `rating`
- Update `transformToDetail` to map snake_case API → camelCase frontend (long_description → longDescription, owner.avatar_url → owner.avatarUrl, etc.)
**Acceptance**: Types compile. All new fields optional and null-safe.

### Task 1.4: FR-3 — Render enrichment on detail page

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`
**What**:
- Owner badge after version/type badges (line 73 area)
- Identity badge with emerald color when hasIdentity is true
- Long description below short description (line 76 area)
- Rating in the info grid (after Level cell, line 95 area)
- Repository/Homepage/Documentation links in Links section (lines 156-179 area)
**Acceptance**: All sections gracefully handle null/undefined. Visual style matches existing patterns.

### Task 1.5: Build verification

**What**: Run `pnpm --filter explorer build` to verify all type changes compile.
**Acceptance**: Build succeeds with zero type errors.

---

## Sprint 2: Shell Wiring

**Focus**: Fix YAML parsing in workflow reader, add construct journey discovery to golden-path.
**Acceptance criteria**: `bash -n` passes on both scripts.

### Task 2.1: FR-4 — Add YAML parsing to construct-workflow-read.sh

**File**: `.claude/scripts/construct-workflow-read.sh`
**What**:
- Source `yq-safe.sh` at the top (after line 13)
- In `main()` (line 142+): detect `.yaml`/`.yml` extension, convert via `safe_yq_to_json()` to temp file
- Replace `$manifest` with `$json_manifest` in downstream jq calls
- Add `trap` for temp file cleanup
**Acceptance**: Script parses YAML manifests with workflow section. JSON manifests still work.

### Task 2.2: FR-5 — Add construct journey discovery to golden-path.sh

**File**: `.claude/scripts/golden-path.sh`
**What**:
- Source `yq-safe.sh` (after line 26)
- New function `golden_detect_construct_journeys()`: scan `.claude/constructs/packs/*/construct.yaml` for `golden_path.commands`, build journey bars
- Modify `golden_format_journey()` (line 309): append construct bars after framework bar
**Acceptance**: Returns empty when no packs have golden_path. Returns formatted bars when they do. Framework bar unchanged.

### Task 2.3: Syntax verification

**What**: Run `bash -n` on both modified scripts.
**Acceptance**: Zero syntax errors.

---

## Risk Acknowledgments

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Explorer build instability | 1 | All fields optional, incremental changes |
| yq not available | 2 | Fail-closed: exit 1 → full pipeline |
| No packs have golden_path | 2 | By design — graceful no-op |

---

*"The API is already speaking. The frontend just needs to listen."*
