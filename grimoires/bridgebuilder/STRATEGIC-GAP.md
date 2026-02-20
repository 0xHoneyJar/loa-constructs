# Bridgebuilder Strategic Gap Analysis

> *"Before you build the bridge, you have to see both shores clearly."*

**Date**: 2026-02-19
**Purpose**: Map the gap between the current state of the Constructs Network and what the open issues demand, then chart the strategic path across.
**Grounded in**: Codebase audit (7 surfaces, file:line references), 7 primary issues + 14 related open issues.

---

## The Two Shores

### Shore A: Where We Are (Codebase Reality)

| Surface | Current State | Health |
|---------|--------------|--------|
| **Manifest schema** | 20 fields. No domain, expertise, golden_path, workflow, methodology, or tier. Uses `.passthrough()` (non-breaking extensions possible). TS/Zod sync issue on `dependencies`. | Functional but incomplete |
| **Construct identities** | DB table exists (`schema.ts:1133`). Stores cognitiveFrame, expertiseDomains, voiceConfig, modelPreferences. Populated via git-sync. | Data exists, unused downstream |
| **API response** | `formatConstructDetail()` (`constructs.ts:80`) returns identity, owner, long_description, maturity. | Serving data nobody consumes |
| **Explorer frontend** | Doesn't consume identity, rating, owner, long_description. Field mismatch: reads `graduation_level` but API emits `maturity` — **all constructs display as 'stable'**. | Broken signal |
| **Golden path** | Rich 9-state machine (`golden-path.sh:421`), journey bar visualization. **Framework-level only.** Zero construct awareness. | Excellent foundation, not extended |
| **Post-install flow** | Shows flat command list. `quick_start` exists in schema but `browsing-constructs` SKILL.md doesn't use it. No "what next?" guidance. | Dead end |
| **Analytics** | Skill-level only (installs, loads, ratings). No pack-level endpoint. `aggregateDailyUsage()` exists but never persists. No human-centered metrics. | Vanity-only surface |

### Shore B: Where We Need To Be (Issue Demands)

| Cluster | Issues | What They Demand |
|---------|--------|-----------------|
| **Golden Path + Routing** | #119, #127, #129, #108, #79, #49 | Constructs with porcelain commands, "you are here" indicators, MoE intent routing, progressive leveling, workflow-depth-aware gates |
| **Topology + Knowledge** | #118, #116, #122, #117, #120 | Clean separation of structure vs expertise, reference ingestion pipeline, field-tested friction resolution, domain-specific constructs, schema migration tooling |
| **Composability** | #128, #104, #109, #103 | L1→L2→L3 construct tiers, cross-construct event bus, unified feedback routing, domain-specific DX |

---

## The Gap Map

For each issue, the gap between what exists and what's needed:

### #119 — Construct golden path + domain declaration for MoE routing
**Status**: OPEN | **Last updated**: 2026-02-13

| Proposed | Exists Today | Gap |
|----------|-------------|-----|
| `domain: string[]` in manifest | Not in schema | **Full gap** — field doesn't exist |
| `expertise: string[]` for routing | Not in schema | **Full gap** |
| `golden_path.commands[]` with truename_map | Not in schema | **Full gap** |
| `golden_path.detect_state` script | Not in any pack | **Full gap** |
| Single porcelain entry point per construct | No construct has one | **Full gap** |

**Dependencies**: Manifest schema extension (blocking)
**Unblocks**: #127, #129, #103

### #127 — Progressive leveling for packs (golden-path-style)
**Status**: OPEN | **Last updated**: 2026-02-17

| Proposed | Exists Today | Gap |
|----------|-------------|-----|
| Construct-level "you are here" | Framework-level only (`golden-path.sh`) | **Pattern exists**, needs extension |
| "Try this next" recommendations | `quick_start` in schema, unused by install flow | **Half gap** — data exists, flow ignores it |
| Level progression per construct | Nothing | **Full gap** |

**Dependencies**: #119 (golden_path in manifest)
**Unblocks**: #108 (progressive expertise), #79 (personalized onboarding)

### #129 — Construct-owned workflow depth
**Status**: OPEN | **Last updated**: 2026-02-19

| Proposed | Exists Today | Gap |
|----------|-------------|-----|
| `workflow.gates` in manifest | Not in schema | **Full gap** |
| Constraint enforcement reads gates | Constraints are hardcoded in `CLAUDE.loa.md` | **Full gap** — but cycle-029 added "Construct-Aware Constraint Yielding" to Loa upstream (just merged!) |
| Domain-specific review types (visual, textual) | One-size-fits-all | **Full gap** |

**Dependencies**: Manifest schema extension
**Unblocks**: Friction reduction for FE/UI/lore work

**Critical note**: The Loa framework update we just merged (cycle-029) is literally "Construct-Aware Constraint Yielding" — the upstream framework now supports `workflow.gates` semantics. The manifest just needs to declare them.

### #118 — Topology vs methodology separation
**Status**: OPEN | **Last updated**: 2026-02-18

| Proposed | Exists Today | Gap |
|----------|-------------|-----|
| `methodology` field in manifest | Not in schema | **Full gap** |
| Reference ingestion pipeline | No mechanism to import external principles | **Full gap** |
| Clean structure/knowledge separation | Identity table has `expertise_yaml` (raw YAML) — this IS methodology data, just not named as such | **Partial** — data exists in DB, no manifest equivalent |

**Dependencies**: Manifest schema extension
**Unblocks**: #122 (Envio construct needs methodology for query syntax expertise)

### #116 — Observer field report (7-day deployment friction)
**Status**: OPEN | **Last updated**: 2026-02-11

| Friction Point | Resolution Path | Gap |
|---------------|----------------|-----|
| 1. Wrapper script wiring gap | Construct health check for all wrapper scripts | **Needs implementation** |
| 2. Skills execute in CLI, not app runtime | `external_apis` manifest field OR wrapper script convention | **Needs schema decision** |
| 3. Auto-canvas creates thin entries | Quality gate (require text note) | **Construct-level fix** (Observer pack) |
| 4. Cross-construct events underused | Event bus consumer metrics (#109) | **Needs metrics surface** |
| 5. Two truth sources anti-pattern | Canonical source declaration per field | **Architecture decision** |
| 6. Sentiment reversal not classified | `REVERSAL` signal type | **Construct-level fix** (Observer pack) |
| 7. Staleness-aware enrichment | Flag + confidence adjustment | **Construct-level fix** (Observer pack) |

**Dependencies**: Points 3,6,7 are Observer-specific (fix in construct-observer repo). Points 1,2,4 need network-level changes.
**Unblocks**: Real-world friction reduction for all constructs

### #122 — Envio Indexer construct proposal
**Status**: OPEN | **Last updated**: 2026-02-16

| Proposed | Exists Today | Gap |
|----------|-------------|-----|
| Domain-specific construct (indexer expertise) | No construct-template workflow for domain-specific packs | **Full gap** — but `construct-template` repo exists |
| Schema introspection, deploy status, backfill monitoring | Would be skills in a new pack | **Implementation work** |
| Cross-repo BUTTERFREEZONE awareness | BUTTERFREEZONE exists but per-repo, not cross-repo | **Architecture gap** |

**Dependencies**: Manifest having `domain` + `methodology` fields. construct-template being ready.
**Unblocks**: Proof that third-party domain constructs work on the network

### #128 — Verification Gradient (composability + tiers)
**Status**: OPEN | **Last updated**: 2026-02-19

| Proposed | Exists Today | Gap |
|----------|-------------|-----|
| L1/L2/L3 construct tiers | Nothing in manifest. `construct_identities` has raw data but no tier classification. | **Full gap** in manifest; **partial** in DB |
| Cross-construct composition primitives | Event bus concept exists (#109), not implemented as first-class | **Full gap** |
| Behavioral conviction as composability signal | Score API exists (external), not integrated with registry | **Integration gap** |

**Dependencies**: Manifest `tier` field, event bus maturity
**Unblocks**: The long-term vision of compound construct experiences

---

## The Strategic Sequence

### The Dependency Graph

```
                    ┌─────────────────────────────┐
                    │  MANIFEST SCHEMA EXTENSION   │
                    │  (domain, expertise,         │
                    │   golden_path, workflow,      │
                    │   methodology, tier)          │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌────────────┐   ┌──────────────┐  ┌──────────────┐
     │ GOLDEN PATH │   │  WORKFLOW    │  │  DOMAIN /    │
     │ PER PACK    │   │  GATES      │  │  MoE ROUTING │
     │ (#119,#127) │   │  (#129)     │  │  (#119,#103) │
     └──────┬─────┘   └──────┬──────┘  └──────┬──────┘
            │                │                 │
            ▼                ▼                 ▼
     ┌────────────┐   ┌──────────────┐  ┌──────────────┐
     │ POST-INSTALL│   │ FRICTION    │  │ ENVIO / 3RD  │
     │ GUIDANCE    │   │ REDUCTION   │  │ PARTY PACKS  │
     │ (#127,#49)  │   │ (#116)      │  │ (#122)       │
     └──────┬─────┘   └─────────────┘  └──────────────┘
            │
            ▼
     ┌─────────────────────────┐
     │ PROGRESSIVE DISCLOSURE  │
     │ (#108, #79)             │
     └─────────────────────────┘
```

**Parallel track** (no dependencies on manifest):
```
     ┌─────────────────────────┐        ┌────────────────────┐
     │ EXPLORER FRONTEND FIXES │        │ PACK-LEVEL         │
     │ • maturity field mismatch│        │ ANALYTICS          │
     │ • consume identity data  │        │ (#105)             │
     │ • consume owner/rating   │        └────────────────────┘
     └─────────────────────────┘
```

### The Strategic Path: Three Cycles

---

#### Cycle A: "See Both Shores" — Schema Foundation + Quick Wins
**Theme**: Lay the structural foundation and fix what's already broken.
**Effort**: ~1 sprint
**Compounds into**: Everything else.

| # | Item | Why | Resolves |
|---|------|-----|----------|
| A1 | **Fix `graduation_level`/`maturity` field mismatch** | Every construct shows as 'stable' right now. Broken signal to users. | Explorer bug |
| A2 | **Explorer consumes identity data** | API already serves cognitiveFrame, expertiseDomains, voiceConfig. Frontend ignores it. Wire it through. | #118 (partial) |
| A3 | **Explorer consumes owner, rating, long_description** | Data exists in API, frontend doesn't show it. Free depth. | Explorer completeness |
| A4 | **Manifest schema extension** | Add `domain`, `expertise`, `golden_path`, `workflow`, `methodology`, `tier` to TS types + Zod. Non-breaking (`.passthrough()`). | #119, #129, #118, #128 (schema layer) |
| A5 | **Fix TS/Zod sync on `dependencies`** | TS says `string[]`, Zod says `Record<string, string>`. Pick one. | Schema hygiene |
| A6 | **Post-install uses `quick_start`** | `browsing-constructs` SKILL.md ignores `quick_start` from manifest. One edit. | #127 (first step) |

**What this unlocks**: The schema foundation exists for all downstream work. The explorer stops lying about maturity. Identity data becomes visible. Post-install has a "start here."

---

#### Cycle B: "Build The Span" — Golden Path + Workflow Gates
**Theme**: Constructs become navigable. Workflow friction drops.
**Effort**: ~2 sprints
**Depends on**: Cycle A (schema fields exist)

| # | Item | Why | Resolves |
|---|------|-----|----------|
| B1 | **Golden path per construct** | Extend `golden-path.sh` to read `golden_path` from installed manifests. Render construct-level journey bars alongside framework bar. | #119, #127 |
| B2 | **State detection scripts** | Each of the 5 packs ships a `detect-state.sh` that returns current workflow position. | #119 (detect_state) |
| B3 | **`/loa` aggregates construct status** | When `/loa` runs, show framework journey + all installed construct journeys with "next suggested" | #127 (the "you are here") |
| B4 | **Workflow gates in constraint enforcement** | Loa cycle-029 (just merged) added construct-aware yielding. Wire manifest `workflow.gates` into the constraint system. | #129 |
| B5 | **Observer field friction points 1-2** | Health check for wrapper scripts. `external_apis` convention or manifest field for CLI-to-API bridge. | #116 (network-level fixes) |
| B6 | **Pack-level analytics endpoint** | `GET /v1/packs/:slug/analytics` — mirror skill analytics but at pack granularity. | #105 (partial) |

**What this unlocks**: Builders know where they are. Constructs own their quality process. Real friction from the Observer field report gets addressed. Analytics extends beyond skills.

---

#### Cycle C: "Open The Road" — MoE Routing + Domain Constructs + Composition
**Theme**: The network becomes intelligent. Third-party constructs are viable.
**Effort**: ~2-3 sprints
**Depends on**: Cycle B (golden path + workflow gates working)

| # | Item | Why | Resolves |
|---|------|-----|----------|
| C1 | **MoE intent routing** | Router reads `domain` + `expertise` from installed manifests. User says "I want to analyze feedback" → Observer activates. | #119 (MoE), #103 |
| C2 | **Methodology ingestion pipeline** | Constructs declare `methodology.references`. Pipeline imports external principles into construct knowledge base. | #118 |
| C3 | **Envio construct as proof-of-concept** | First domain-specific third-party construct using the new schema (domain, golden_path, methodology). Proves the model works. | #122 |
| C4 | **Construct tier classification** | `tier` field (L1/L2/L3) surfaced in explorer. Marketplace filtering by capability level. | #128 (partial) |
| C5 | **Human-centered metrics v1** | `construct_impact_signals` table. Track: friction-to-resolution, workflow depth, re-invocation rate. Anti-vanity. | Archetype §4 |
| C6 | **Explorer progressive disclosure** | Construct pairing suggestions. Depth indicators. "What this enables" section on detail page. | #79, #108 |
| C7 | **Cross-construct event bus** | First-class event routing between installed packs. Consumer fulfillment metrics. | #109, #128, #104 |

**What this unlocks**: The network routes intent to expertise. Third-party constructs work. Composition is possible. Metrics measure what matters.

---

## The Compounding Effect

Each cycle compounds into the next:

```
Cycle A: Schema exists + Explorer stops lying + Post-install has "start here"
    ↓ compounds into
Cycle B: Constructs are navigable + Workflow friction drops + Real analytics
    ↓ compounds into
Cycle C: Network is intelligent + Third parties viable + Composition works
    ↓ compounds into
The Bridgebuilder philosophy is embedded in every touchpoint
```

The key insight: **Cycle A is almost entirely wiring existing data through.** The API already serves identity. The schema already has `quick_start`. The explorer already renders construct details. Most of Cycle A is connecting pipes that already exist but aren't flowing.

---

## Issue Disposition

After all three cycles, here's where each issue lands:

| Issue | After Cycle A | After Cycle B | After Cycle C |
|-------|-------------|-------------|-------------|
| #119 (golden path + MoE) | Schema fields exist | Golden path working | MoE routing live |
| #127 (progressive leveling) | quick_start used post-install | "You are here" in `/loa` | Full progressive disclosure |
| #129 (workflow depth) | Schema fields exist | Gates enforced | — |
| #118 (topology/methodology) | Identity visible in explorer | — | Methodology ingestion working |
| #116 (Observer friction) | — | Network-level fixes (1,2,4) | Observer-level fixes (3,6,7) in construct-observer repo |
| #122 (Envio construct) | Schema ready for it | — | First 3rd-party construct live |
| #128 (Verification Gradient) | Tier field in schema | — | Tier visible in explorer, event bus for composition |

**Additional issues advanced:**
- #49 (WORKFLOW.md per pack) → Subsumed by golden_path in manifest
- #79 (personalized onboarding) → Enabled by progressive disclosure in Cycle C
- #89 (pack autosync/graduation) → Graduation fixed by maturity field fix in A1
- #103 (domain-specific DX) → Enabled by MoE routing in C1
- #104 (unified feedback schema) → Enabled by event bus in C7
- #108 (progressive expertise) → Enabled by golden path + metrics in B+C
- #109 (event bus migration) → Formalized in C7
- #117 (schema migration tooling) → Addressed by non-breaking schema extension in A4
- #120 (skill discovery post-install) → Fixed by golden path + post-install guidance in A6+B3

---

*"The bridge isn't one span. It's three arches, each bearing the weight of the next. And the first arch — seeing both shores clearly — is the one that makes all others possible."*
