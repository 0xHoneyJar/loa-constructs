# Observer Manifest Audit — Verification Metadata Formalization

> **Date**: 2026-02-20
> **Status**: Complete
> **Source**: loa#379 addendum, loa-constructs#131 lifecycle RFC, registry Observer v1.0.0
> **Purpose**: Document the gap between Observer's registry manifest and what its midi-interface deployment actually requires, then define the target manifest with formalized verification metadata.

---

## 1. Current Observer Manifest (Registry v1.0.0)

Source: `.claude/constructs/packs/observer/construct.yaml`

```yaml
schema_version: 3
name: Observer
slug: observer
version: 1.0.0
description: User truth capture skills for hypothesis-first research
author: 0xHoneyJar
license: MIT
skills:
  - slug: observing-users
    path: skills/observing-users
  - slug: shaping-journeys
    path: skills/shaping-journeys
  - slug: level-3-diagnostic
    path: skills/level-3-diagnostic
  - slug: analyzing-gaps
    path: skills/analyzing-gaps
  - slug: filing-gaps
    path: skills/filing-gaps
  - slug: importing-research
    path: skills/importing-research
repository:
  url: https://github.com/0xHoneyJar/construct-observer.git
  homepage: https://constructs.network/constructs/observer
events:
  emits:
    - type: forge.observer.canvas_created
    - type: forge.observer.journey_shaped
    - type: forge.observer.gap_filed
  consumes:
    - event: forge.crucible.journey_validated
pack_dependencies:
  - slug: crucible
  - slug: artisan
identity:
  persona: identity/persona.yaml
  expertise: identity/expertise.yaml
hooks:
  post_install: scripts/install.sh
quick_start:
  command: /observe
  description: capture user feedback as hypothesis-first research
```

### What this manifest declares

| Field | Present | Value |
|-------|---------|-------|
| `schema_version` | Yes | 3 |
| `type` | **No** | — |
| `tier` | **No** | — |
| `domain` | **No** | — |
| `expertise` | **No** | — |
| `workflow` | **No** | — |
| `capabilities` (pack-level) | **No** | — |
| `credentials` | **No** | — |
| `methodology` | **No** | — |
| `portability_score` | **No** | — |
| `paths` | **No** | — |
| `golden_path` | **No** | — |
| `identity` | Yes | persona + expertise paths |
| `events` | Yes | 3 emits, 1 consumes |
| `pack_dependencies` | Yes | crucible, artisan |
| `hooks` | Yes | post_install |
| `quick_start` | Yes | /observe |

### Skill-level capabilities (existing per index.yaml)

| Skill | model_tier | danger_level | effort_hint | execution_hint |
|-------|-----------|-------------|------------|---------------|
| observing-users | sonnet | moderate | medium | sequential |
| level-3-diagnostic | sonnet | safe | small | sequential |
| shaping-journeys | — | — | — | — |
| analyzing-gaps | — | — | — | — |
| filing-gaps | — | — | — | — |
| importing-research | — | — | — | — |

---

## 2. midi-interface Reality (23 Skills, Provenance System)

From issue #131 research and loa#379 addendum, Observer in midi-interface has evolved far beyond the registry version:

### Skill Inventory

| # | Category | Skill | On Registry? | Notes |
|---|----------|-------|-------------|-------|
| 1 | Core 6 | observing-users | Yes | Same as registry |
| 2 | Core 6 | shaping-journeys | Yes | Same as registry |
| 3 | Core 6 | level-3-diagnostic | Yes | Same as registry |
| 4 | Core 6 | analyzing-gaps | Yes | Same as registry |
| 5 | Core 6 | filing-gaps | Yes | Same as registry |
| 6 | Core 6 | importing-research | Yes | Same as registry |
| 7-23 | Added | 17 cognition-layer skills | **No** | Provenance, RLM, Score API, Canvas enrichment |

### Systems Not Captured in Registry Manifest

1. **Provenance Chain** — `scripts/provenance/query.sh --verify-chain` tracks block lineage for all skills
2. **Source Fidelity Gate** — Category (d) block count measures source-grounded vs hallucinated output
3. **RLM (Reinforcement Learning from Memory)** — Per-user learning isolation, zero cross-user contamination
4. **Canvas Enrichment** — Score API snapshot freshness, partial coverage (16/28 skills)
5. **Score API** — External service dependency, requires API key
6. **Supabase URL** — Database dependency for provenance storage

---

## 3. Target Observer Manifest (Per loa#379 Addendum)

This is what Observer's `construct.yaml` SHOULD declare to accurately represent the midi-interface deployment. All new fields are optional in the schema and backward-compatible.

```yaml
schema_version: 3
name: Observer
slug: observer
version: 1.1.0
type: skill-pack
tier: L2
description: User truth capture skills for hypothesis-first research with provenance-verified cognition layer

author: 0xHoneyJar
license: MIT

skills:
  # --- Core 6 (registry-canonical) ---
  - slug: observing-users
    path: skills/observing-users
  - slug: shaping-journeys
    path: skills/shaping-journeys
  - slug: level-3-diagnostic
    path: skills/level-3-diagnostic
  - slug: analyzing-gaps
    path: skills/analyzing-gaps
  - slug: filing-gaps
    path: skills/filing-gaps
  - slug: importing-research
    path: skills/importing-research
  # --- Cognition Layer (17 added in midi-interface) ---
  # These would be enumerated here once upstreamed.
  # Until then, they exist as a variant fork.

repository:
  url: https://github.com/0xHoneyJar/construct-observer.git
  homepage: https://constructs.network/constructs/observer

domain:
  - user-research
  - hypothesis-testing
  - gap-analysis
  - journey-shaping
  - provenance-verification

expertise:
  - hypothesis-first observation from user quotes
  - Level 3 diagnostic (user goals, not tasks)
  - User Truth Canvas creation and maintenance
  - journey shaping from canvas patterns
  - expectation vs reality gap analysis
  - provenance chain verification
  - source fidelity measurement

methodology:
  principles:
    - "Hypothesis before conclusion"
    - "Level 3 diagnostic depth (goals, not tasks)"
    - "Source-grounded output (category d fidelity)"
    - "Provenance chain integrity"
  references:
    - "The Mom Test — Rob Fitzpatrick"
    - "JTBD Framework — Clayton Christensen"
  knowledge_base: identity/expertise.yaml

workflow:
  depth: light
  app_zone_access: false
  gates:
    prd: skip
    sdd: skip
    sprint: skip
    implement: required
    review: skip
    audit: skip
  verification:
    method: manual

credentials:
  - name: SCORE_API_KEY
    description: API key for Score API — canvas enrichment and snapshot freshness
    sensitive: true
    optional: true
  - name: SUPABASE_URL
    description: Supabase connection URL for provenance storage
    sensitive: true
    optional: true

events:
  emits:
    - type: forge.observer.canvas_created
      description: Emitted when a new user truth canvas is created
      data_schema:
        user_id: string
        canvas_path: string
    - type: forge.observer.journey_shaped
      description: Emitted when a user journey is shaped from canvases
      data_schema:
        journey_id: string
        journey_path: string
    - type: forge.observer.gap_filed
      description: Emitted when a gap analysis issue is filed
      data_schema:
        gap_id: string
        issue_url: string
    - type: forge.observer.provenance_verified
      description: Emitted when a provenance chain verification completes
      data_schema:
        chain_id: string
        block_count: integer
        integrity: boolean
    - type: forge.observer.canvas_enriched
      description: Emitted when a canvas is enriched with Score API data
      data_schema:
        canvas_path: string
        score_snapshot_at: string
  consumes:
    - event: forge.crucible.journey_validated

pack_dependencies:
  - slug: crucible
  - slug: artisan

identity:
  persona: identity/persona.yaml
  expertise: identity/expertise.yaml

hooks:
  post_install: scripts/install.sh

quick_start:
  command: /observe
  description: capture user feedback as hypothesis-first research

paths:
  state: .observer/state
  cache: .observer/cache
  output: grimoires/observer

portability_score: 0.7
  # 0.7: Core 6 skills are fully portable (no external deps).
  # Cognition layer requires Score API + Supabase, reducing portability.
  # Without credentials, degrades gracefully to core functionality.
```

---

## 4. Gap Analysis — Current vs Target

### Missing Manifest Fields

| Field | Current | Target | Gap Type | Priority |
|-------|---------|--------|----------|----------|
| `type` | absent | `skill-pack` | **Schema declaration** | High — required for archetype routing |
| `tier` | absent | `L2` | **Capability tier** | Medium — MoE routing signal |
| `domain` | absent | 5 entries | **MoE routing** | High — enables construct discovery |
| `expertise` | absent | 7 entries | **Intent matching** | High — enables smart routing |
| `methodology` | absent | principles + references | **Knowledge layer** | Medium — optional but valuable |
| `workflow` | absent | light + gates + verification | **Process compliance** | **Critical** — unlocks loa#379 |
| `credentials` | absent | SCORE_API_KEY, SUPABASE_URL | **Dependency declaration** | High — Tobias needs this |
| `paths` | absent | state/cache/output | **Portability** | Medium — organizational clarity |
| `portability_score` | absent | 0.7 | **Reusability signal** | Low — informational |
| New events | 3 emits | 5 emits (+2) | **Contract expansion** | Medium — provenance + enrichment |

### Missing Skills (17 Cognition Layer)

The registry Observer has 6 skills. midi-interface has 23. The 17 added skills are NOT enumerated here because they haven't been upstreamed to construct-observer. The migration plan (lifecycle design doc, Phase 2) calls for:

1. **8 generic skills** → upstream to construct-observer v1.1.0
2. **9 midi-specific skills** → remain as midi-interface variant additions
3. **Registration** as `@thj/observer` (scoped variant) or version bump to v1.1.0

### Verification Status Gap

The current manifest has **zero** verification metadata. The target needs honest status per check:

| Check | Status | Evidence |
|-------|--------|----------|
| `provenance_integrity` | `verified` | `scripts/provenance/query.sh --verify-chain` exists and runs at 100% threshold |
| `source_fidelity_gate` | `installed_but_unmeasured` | Category (d) block count system is installed but no measurement threshold defined |
| `rlm_isolation` | `architectural_guarantee` | Zero cross-user contamination by design (per-user RLM state) |
| `canvas_enrichment` | `partial` | Score API snapshot freshness covers 16/28 canvases |

---

## 5. Verification Stanza — Formalized

The `workflow.verification` field in the Zod schema currently only accepts:
```typescript
verification: { method: 'visual' | 'tsc' | 'build' | 'test' | 'manual' }
```

The loa#379 addendum proposes a richer verification stanza with per-check status. This is **NOT yet supported by the schema** — it would need a schema extension:

### Proposed Extension (requires types.ts + validation.ts changes)

```typescript
// In PackManifest.workflow.verification:
verification?: {
  method: 'visual' | 'tsc' | 'build' | 'test' | 'manual';
  checks?: Record<string, {
    script?: string;
    description?: string;
    threshold?: string;
    coverage?: string;
    status: 'verified' | 'installed_but_unmeasured' | 'architectural_guarantee' | 'partial' | 'not_implemented';
  }>;
};
```

### Observer's Verification Checks (Target)

```yaml
verification:
  method: manual
  checks:
    provenance_integrity:
      script: "scripts/provenance/query.sh --verify-chain"
      threshold: "100%"
      status: verified
    source_fidelity_gate:
      description: "Category (d) block count — measures source-grounded vs hallucinated output"
      status: installed_but_unmeasured
    rlm_isolation:
      description: "Zero cross-user contamination — per-user RLM state isolation"
      status: architectural_guarantee
    canvas_enrichment:
      description: "Score API snapshot freshness for canvas data"
      coverage: "16/28"
      status: partial
```

### Schema Impact Assessment

| Layer | File | Change Required |
|-------|------|----------------|
| TypeScript | `packages/shared/src/types.ts:306-319` | Extend `workflow.verification` with optional `checks` record |
| Zod | `packages/shared/src/validation.ts:239-241` | Extend `workflowVerificationSchema` with `checks` |
| JSON Schema | `.claude/constructs/packs/observer/schemas/construct.schema.json` | No change (not enforced at this level) |

The `.passthrough()` on `packManifestSchema` means the verification checks will be **silently accepted** even before the schema is formally extended. This is the same pattern that allowed `identity`, `hooks`, and `pack_dependencies` to exist in YAMLs before being added to TypeScript/Zod (documented in construct-lifecycle-design.md §1).

---

## 6. Echelon Integration Seam — What Tobias Needs

### Data Tobias Must Access

| Data | Location | Format | Access Pattern |
|------|----------|--------|----------------|
| Observer manifest | `construct.yaml` | YAML | Read on install/sync |
| Persona definition | `identity/persona.yaml` | YAML | Read for cognitive frame |
| Expertise domains | `identity/expertise.yaml` | YAML | Read for MoE routing |
| Verification status | `construct.yaml → workflow.verification.checks` | YAML | Read for trust signal |
| Provenance chain | `scripts/provenance/query.sh` output | JSON | Execute for verification |
| Canvas data | Score API | REST JSON | HTTP with SCORE_API_KEY |
| Construct identity (DB) | `construct_identities` table | SQL/JSON | API: `GET /v1/packs/:slug` |

### API Surface for Echelon

The `construct_identities` table (schema.ts:1136-1155) already stores:
- `persona_yaml` — Raw persona YAML text
- `expertise_yaml` — Raw expertise YAML text
- `cognitive_frame` — Parsed JSONB
- `expertise_domains` — Parsed JSONB
- `voice_config` — Parsed JSONB
- `model_preferences` — Parsed JSONB

**Tobias can access identity data through**: `GET /v1/packs/observer` → response includes parsed identity when available.

### Credential Handoff

For Tobias to use Observer's cognition layer, he needs:
1. `SCORE_API_KEY` — Declared in `credentials` stanza, user provides at install time
2. `SUPABASE_URL` — Declared in `credentials` stanza, per-project configuration
3. Both are `optional: true` — core Observer skills work without them, cognition layer degrades gracefully

### Event Contract for Cross-Construct Communication

Tobias's Echelon constructs can subscribe to:
- `forge.observer.canvas_created` — Trigger analysis when new user data arrives
- `forge.observer.provenance_verified` — Trust signal for downstream decisions
- `forge.observer.canvas_enriched` — React to enrichment updates

---

## 7. Credential Declarations

### Current State
No credentials declared in the manifest. The midi-interface deployment passes these through environment variables without formal declaration.

### Target State

```yaml
credentials:
  - name: SCORE_API_KEY
    description: API key for Score API — canvas enrichment and snapshot freshness
    sensitive: true       # Stored securely, never logged
    optional: true        # Core 6 skills work without it
  - name: SUPABASE_URL
    description: Supabase connection URL for provenance storage
    sensitive: true
    optional: true        # Provenance degrades to local-only storage
```

### Validation
The Zod schema (`credentialSchema` at validation.ts:278-283) enforces:
- `name` must be `UPPER_SNAKE_CASE` (regex: `/^[A-Z][A-Z0-9_]*$/`)
- `description` max 500 chars
- `sensitive` defaults to `true`
- `optional` defaults to `false`

Both credential names pass validation. `optional: true` must be explicitly set since the default is `false`.

---

## 8. Event Contracts

### Current Events (Registry v1.0.0)

| Direction | Event | Data Schema |
|-----------|-------|-------------|
| Emits | `forge.observer.canvas_created` | `{ user_id: string, canvas_path: string }` |
| Emits | `forge.observer.journey_shaped` | `{ journey_id: string, journey_path: string }` |
| Emits | `forge.observer.gap_filed` | `{ gap_id: string, issue_url: string }` |
| Consumes | `forge.crucible.journey_validated` | — |

### Proposed Additional Events (Cognition Layer)

| Direction | Event | Data Schema | Purpose |
|-----------|-------|-------------|---------|
| Emits | `forge.observer.provenance_verified` | `{ chain_id: string, block_count: integer, integrity: boolean }` | Trust signal for downstream constructs |
| Emits | `forge.observer.canvas_enriched` | `{ canvas_path: string, score_snapshot_at: string }` | Score API enrichment notification |

### Cross-Construct Event Flow

```
Observer ──emit──> forge.observer.canvas_created ──> Crucible (validates journey)
Crucible ──emit──> forge.crucible.journey_validated ──> Observer (consumes)
Observer ──emit──> forge.observer.provenance_verified ──> Echelon (trust signal)
Observer ──emit──> forge.observer.canvas_enriched ──> Echelon (enrichment)
```

---

## 9. Summary — Implementation Priority

| # | Action | Effort | Blocking? |
|---|--------|--------|-----------|
| 1 | Add `type: skill-pack` to manifest | Trivial | Yes — archetype routing |
| 2 | Add `domain` + `expertise` arrays | Small | Yes — MoE discovery |
| 3 | Add `tier: L2` | Trivial | No |
| 4 | Add `workflow` stanza with gates | Small | **Yes — unlocks loa#379** |
| 5 | Add `credentials` declarations | Small | Yes — Echelon setup |
| 6 | Extend schema for `verification.checks` | Medium | No — `.passthrough()` accepts it now |
| 7 | Add new events (provenance, enrichment) | Small | No — additive |
| 8 | Add `methodology`, `paths`, `portability_score` | Small | No — informational |
| 9 | Upstream 8 generic skills to v1.1.0 | **Large** | No — separate migration |

Items 1-5 can be done in a single PR to construct-observer. Item 6 requires a schema PR to loa-constructs. Item 9 is the Phase 2 migration from the lifecycle design doc.
