# PRD: Bridgebuilder Cycle B — Wire the Workshop Through

**Cycle**: cycle-031
**Created**: 2026-02-19
**Status**: Draft
**Grounded in**: ARCHETYPE.md, STRATEGIC-GAP.md (Cycle B), cycle-b-plan.md, codebase audit (5 surfaces)
**Archetype**: The Bridgebuilder (grimoires/bridgebuilder/ARCHETYPE.md)
**Depends on**: Cycle A (PR #130) — schema foundation complete

---

## 1. Problem Statement

Cycle A (PR #130) added Bridgebuilder fields (`domain`, `expertise`, `golden_path`, `workflow`, `methodology`, `tier`) to the 4-layer schema stack. 41 tests pass, all schemas are in sync. The foundation is laid. But the data still doesn't flow.

Two categories of broken wiring compound into a dead-end experience:

**1. Explorer frontend lies about construct state**

The explorer marketplace at `constructs.network` displays every construct as "stable" maturity regardless of actual state. The API sends `maturity` (line 73 of `constructs.ts`), but the frontend reads `graduation_level` (line 17 of `fetch-constructs.ts`) — a field the API doesn't send. The result: `parseGraduationLevel(undefined)` always returns `'stable'`.

Additionally, the API already serves identity data (`cognitiveFrame`, `expertiseDomains`, `voiceConfig`), owner information, rating, and long descriptions via `formatConstructDetail()` (lines 80-117 of `constructs.ts`). The explorer frontend consumes none of it. The `APIConstruct` interface (lines 6-26 of `fetch-constructs.ts`) has 20 fields — zero of the enrichment fields the API provides.

> Evidence: `apps/explorer/lib/data/fetch-constructs.ts:17` — `graduation_level?: string` (wrong field name)
> Evidence: `apps/explorer/lib/data/fetch-constructs.ts:61` — `parseGraduationLevel(construct.graduation_level)` → always undefined
> Evidence: `apps/api/src/routes/constructs.ts:80-117` — `formatConstructDetail` returns identity, owner, rating, long_description
> Evidence: `apps/explorer/lib/types/graph.ts:57-64` — `ConstructDetail` has no rating, owner, identity, or longDescription

**2. Golden-path script has zero construct awareness**

The golden-path.sh script (901 lines, 9-state machine) provides the `/loa`, `/plan`, `/build`, `/review`, `/ship` porcelain commands. It renders a visual journey bar. It detects workflow state. It is excellent infrastructure — but it operates exclusively at the framework level. No installed construct's `golden_path.commands` are ever read. No construct-level "you are here" exists.

The `construct-workflow-read.sh` script that reads workflow gates uses `jq` (JSON parser) directly on manifest files (line 148). All installed construct manifests are `construct.yaml` — YAML format. The script silently fails, returning exit code 1 (no workflow), even if a manifest declares `workflow.gates`.

> Evidence: `.claude/scripts/golden-path.sh` — 901 lines, zero references to construct manifests
> Evidence: `.claude/scripts/construct-workflow-read.sh:148` — `jq -e '.workflow // empty' "$manifest"` on YAML files
> Evidence: No installed pack currently has `golden_path` or `workflow` fields (schema_version 3 → 4 adoption pending)

**The compounding effect**: The schema foundation from Cycle A is inert without wiring. Builders cannot see construct state in the explorer, cannot navigate construct-level journeys in the CLI, and the workflow gate enforcement pipeline silently breaks on YAML manifests. The bridge is half-built.

> Source: STRATEGIC-GAP.md Cycle B ("Build The Span"), ARCHETYPE.md §5.0-5.2

---

## 2. Product Vision

**Wire the workshop through so the data flows.**

Cycle A built the schema. Cycle B connects the pipes. The API already serves rich data. The golden-path script already has the journey bar pattern. The workflow reader already has the validation logic. Every piece exists — they just aren't connected to each other.

After this cycle:
- The explorer shows real maturity levels, not hardcoded 'stable'
- Construct detail pages display identity, owner, rating, and descriptions
- The golden-path script discovers installed constructs' golden paths
- Workflow gates are readable from YAML manifests
- The infrastructure is ready for constructs to adopt schema_version 4

The Bridgebuilder principle applies: **orient before acting.** The explorer should orient builders about what a construct actually is (identity, expertise, maturity) before they install it. The CLI should orient them about where they are (construct journey bars) after they install it.

> Source: ARCHETYPE.md §2 Voice Principles, STRATEGIC-GAP.md "The Compounding Effect"

---

## 3. Goals & Success Metrics

### Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G1 | Explorer shows correct maturity | Constructs display their actual maturity level (experimental/beta/stable/deprecated), not hardcoded 'stable'. |
| G2 | Explorer shows identity + enrichment | Construct detail page renders owner, rating, long description, identity indicator, and repository/homepage/documentation links. |
| G3 | Golden-path discovers construct journeys | `golden_format_journey()` renders construct-level journey bars alongside the framework bar when installed packs declare `golden_path`. |
| G4 | Workflow reader handles YAML | `construct-workflow-read.sh` correctly parses `.yaml` manifests via `yq-safe.sh` bridge. |

### Success Criteria

- Visiting `/constructs/observer` on the explorer shows maturity from the API, not 'stable'
- Construct detail page renders rating, owner name, and long_description when the API provides them
- `golden_detect_construct_journeys()` returns empty array when no packs have `golden_path` (graceful degradation)
- `construct-workflow-read.sh construct.yaml` returns valid JSON when passed a YAML manifest with `workflow` section
- `pnpm --filter explorer build` passes with all new interface fields
- `bash -n` passes on all modified shell scripts

### Non-Goals (Explicit)

| Item | Why Not Now |
|------|------------|
| MoE intent routing (#119 partial) | Needs constructs to actually declare `domain` + `expertise` first. Schema exists from Cycle A, adoption is Cycle C. |
| State detection scripts per pack | Each pack needs to ship `detect-state.sh`. That's per-repo work in construct-* repos, not loa-constructs. |
| `/loa` aggregates construct status | Depends on G3 + state detection scripts. The discovery function (G3) is the prerequisite. |
| Human-centered metrics table | No traffic. Meaningful after constructs are used more broadly. |
| Pack-level analytics endpoint | Useful but independent work — doesn't block any Cycle B goal. |
| Progressive disclosure UI in explorer | The data pipeline (this cycle) must exist before the UI can progressively disclose it. |

---

## 4. User & Stakeholder Context

### Primary Persona: The Maintainer-Builder (unchanged from Cycle A)

**Who**: The team member who maintains construct repos AND uses those constructs on product repos.

**What changes for them after this cycle**:
- When they browse `constructs.network/constructs/observer`, they see actual maturity, owner, rating — not blank/default values
- When they extend `golden-path.sh` in their project, they can wire construct journey bars
- When they add `workflow` to a construct.yaml, `construct-workflow-read.sh` actually reads it

### Secondary Persona: The Explorer Visitor

**Who**: Anyone browsing `constructs.network` to evaluate whether constructs are useful.

**What changes for them**: Construct detail pages become informative instead of skeletal. Identity, owner, maturity, and links give a complete picture of what a construct is and who maintains it.

> Source: ARCHETYPE.md §5.3 Explorer Marketplace

---

## 5. Functional Requirements

### FR-1: Fix maturity field mismatch (G1)

**Priority**: P0 — this is a live bug on constructs.network

**Files**:
- `apps/explorer/lib/data/fetch-constructs.ts` — `APIConstruct` interface (line 17), `transformToNode` (line 61)

**Changes**:
1. Rename `graduation_level?: string` → `maturity?: string` in `APIConstruct` interface
2. Change `construct.graduation_level` → `construct.maturity` in `transformToNode`

**Acceptance criteria**:
- `parseGraduationLevel()` receives the API's actual `maturity` value
- Constructs with `maturity: 'experimental'` display as experimental, not stable
- No other files reference `graduation_level` (search and replace)

> Source: `apps/api/src/routes/constructs.ts:73` — API sends `maturity: c.maturity`

### FR-2: Extend explorer to consume enrichment data (G2)

**Priority**: P0 — the API serves this data today, the frontend wastes it

**Files**:
- `apps/explorer/lib/data/fetch-constructs.ts` — `APIConstruct`, `transformToNode`, `transformToDetail`
- `apps/explorer/lib/types/graph.ts` — `ConstructNode`, `ConstructDetail`

**Changes to `APIConstruct`** (add optional fields matching API response shape):
```typescript
rating?: number | null;
long_description?: string | null;
owner?: {
  name: string;
  type: 'user' | 'team';
  avatar_url: string | null;
} | null;
has_identity?: boolean;
identity?: {
  cognitive_frame: unknown;
  expertise_domains: unknown;
  voice_config: unknown;
  model_preferences: unknown;
} | null;
repository_url?: string | null;
homepage_url?: string | null;
documentation_url?: string | null;
```

**Changes to `ConstructNode`** (add rating for catalog cards):
```typescript
rating?: number | null;
```

**Changes to `ConstructDetail`** (add all enrichment fields):
```typescript
longDescription?: string | null;
owner?: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null;
hasIdentity?: boolean;
identity?: {
  cognitiveFrame: unknown;
  expertiseDomains: unknown;
  voiceConfig: unknown;
  modelPreferences: unknown;
} | null;
repositoryUrl?: string | null;
homepageUrl?: string | null;
documentationUrl?: string | null;
```

**Changes to transform functions**:
- `transformToNode`: pass through `rating`
- `transformToDetail`: map snake_case API fields → camelCase frontend fields

**Acceptance criteria**:
- All new fields are optional (null-safe)
- `transformToDetail` correctly maps `long_description` → `longDescription`, `owner.avatar_url` → `owner.avatarUrl`, etc.
- Types compile with `pnpm --filter explorer build`

> Source: `apps/api/src/routes/constructs.ts:80-117` — `formatConstructDetail` response shape

### FR-3: Render enrichment data on construct detail page (G2)

**Priority**: P1 — UI rendering of the wired data

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

**Changes** (following existing design patterns in the file):
1. **Owner**: Show owner name near the header badges (after version + type). Use existing badge pattern: `<span className="border border-white/20 px-2 py-0.5 text-[10px] font-mono text-white/60">`
2. **Rating**: Add to the 4-column info grid (line 79-96). Display as a number or star indicator alongside downloads.
3. **Long description**: Render below the short description (after line 75) if present. Same `text-sm font-mono text-white/60` style.
4. **Identity indicator**: If `hasIdentity` is true, show a small badge near the construct type (e.g., "Expert Identity" badge).
5. **Repository/Homepage/Documentation links**: Add to the Links section (lines 156-179), following the existing "View Source on GitHub" pattern (lines 163-171). Conditional rendering when URL is present.

**Acceptance criteria**:
- All new sections gracefully handle null/undefined values (don't render if absent)
- Visual style matches existing page (monospace font, white/60 secondary text, border border-white/10 cards)
- Links open in new tab with `rel="noopener noreferrer"`
- No layout breakage when all fields are null (existing behavior preserved)

### FR-4: Fix construct-workflow-read.sh YAML parsing (G4)

**Priority**: P0 — the script silently fails on all real manifests

**File**: `.claude/scripts/construct-workflow-read.sh`

**Changes**:
1. Source `yq-safe.sh` at the top (after line 13)
2. In `main()` (line 142-148): detect `.yaml`/`.yml` file extension. If YAML, use `safe_yq_to_json()` to convert to JSON, then pipe to existing `jq` logic.
3. All downstream validation (`validate_workflow`, `query_gate`) stays `jq`-based — minimal change.

**Acceptance criteria**:
- `construct-workflow-read.sh manifest.yaml` returns valid JSON when manifest has `workflow` section
- `construct-workflow-read.sh manifest.yaml --gate prd` returns gate value
- `construct-workflow-read.sh manifest.json` still works (backward compat)
- `bash -n construct-workflow-read.sh` passes

> Source: `.claude/scripts/yq-safe.sh:221` — `safe_yq_to_json()` utility

### FR-5: Add construct journey discovery to golden-path.sh (G3)

**Priority**: P1 — enables construct-level "you are here" (next cycle wires it to `/loa`)

**File**: `.claude/scripts/golden-path.sh`

**Changes**:
1. Source `yq-safe.sh` (after line 26, alongside `bootstrap.sh`)
2. New function `golden_detect_construct_journeys()`:
   - Scans `.claude/constructs/packs/*/construct.yaml` for `golden_path.commands`
   - Uses `safe_yq_to_json()` to parse YAML
   - Returns formatted journey bars: `"Observer: /listen ──── /see ──── /think ──── /shape"`
   - Returns empty when no packs have `golden_path` (graceful no-op)
3. Modify `golden_format_journey()` (line 267): after rendering the standard framework bar, append construct journey bars if any exist.
4. Extend `golden_menu_options()` to include a construct commands entry when constructs with `golden_path` are installed.

**Acceptance criteria**:
- `golden_detect_construct_journeys` returns empty string when `.claude/constructs/packs/` doesn't exist
- `golden_detect_construct_journeys` returns empty string when installed packs lack `golden_path`
- `golden_detect_construct_journeys` returns formatted bar when a pack has `golden_path.commands`
- `golden_format_journey` output includes construct bars below the framework bar (additive, not replacing)
- `bash -n golden-path.sh` passes

---

## 6. Scope & Prioritization

### In Scope (This Cycle)

| Sprint | Items | Effort |
|--------|-------|--------|
| Sprint 1 | FR-1 (maturity fix), FR-2 (APIConstruct + types), FR-3 (detail page UI) | Medium — frontend types + UI |
| Sprint 2 | FR-4 (YAML parsing fix), FR-5 (golden-path construct discovery) | Medium — shell scripting |

### Out of Scope

| Item | Why | When |
|------|-----|------|
| State detection scripts per pack | Per-repo work in construct-* repos | After Cycle B, per-pack PRs |
| `/loa` aggregates construct journeys | Depends on packs shipping golden_path + detect_state | Cycle C |
| Construct-level "next suggested" | Needs state detection + journey aggregation | Cycle C |
| Pack-level analytics endpoint | Independent work, not on critical path | Cycle C or standalone |
| Observer friction points 1-2 | Network-level changes that need separate design | Cycle C |
| MoE intent routing | Needs constructs to declare domain fields | Cycle C |

---

## 7. Risks & Dependencies

| Risk | Impact | Mitigation |
|------|--------|-----------|
| No packs at schema_version 4 yet | FR-5 construct journey discovery will find zero matches until packs adopt | By design — code is ready, data arrives when construct-* repos bump to v4. VERSION-BUMP.md documents the process. |
| API backward compatibility | Explorer changes consume more fields | All new fields are optional. API already serves them. No API changes needed. |
| `yq` availability | FR-4 depends on yq being installed | `yq-safe.sh` already handles both mikefarah/yq and Python yq variants. It's a standard dependency (sourced by `constructs-loader.sh`). |
| Pre-existing API DTS build error | `crypto` type missing in `api/app.ts:172` | Pre-existing issue, not caused by our changes. ESM build succeeds; only DTS generation fails. |
| Explorer build instability | Next.js 15 build can be sensitive to type changes | Incremental changes with build verification after each sprint. |

---

## 8. Key Files

| File | Purpose | Changes |
|------|---------|---------|
| `apps/explorer/lib/data/fetch-constructs.ts` | Data pipeline: API → frontend | Fix maturity, add enrichment fields, update transforms |
| `apps/explorer/lib/types/graph.ts` | TypeScript interfaces | Extend ConstructNode + ConstructDetail |
| `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx` | Detail page UI | Render owner, rating, long_description, identity, links |
| `.claude/scripts/construct-workflow-read.sh` | Workflow gate reader | Add YAML→JSON bridge via yq-safe.sh |
| `.claude/scripts/golden-path.sh` | Golden path state machine | Add construct journey discovery + rendering |
| `.claude/scripts/yq-safe.sh` | YAML parsing utility | Reuse existing `safe_yq_to_json()` — no changes needed |

---

## 9. Verification Plan

1. **Explorer build**: `pnpm --filter explorer build` — type-checks all frontend changes
2. **Script syntax**: `bash -n .claude/scripts/construct-workflow-read.sh` + `bash -n .claude/scripts/golden-path.sh`
3. **Manual verification**: Visit construct detail page, confirm maturity/rating/owner render correctly
4. **Regression**: Existing golden-path framework bar unchanged when no constructs have golden_path
5. **YAML parsing**: Pass a sample `construct.yaml` with workflow section to `construct-workflow-read.sh`, verify JSON output
