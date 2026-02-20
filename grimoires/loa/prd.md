# PRD: Bridgebuilder Cycle A — Make the Workshop Work

**Cycle**: cycle-030
**Created**: 2026-02-19
**Status**: Draft
**Grounded in**: ARCHETYPE.md, STRATEGIC-GAP.md, 7 primary issues + 14 related, codebase audit (7 surfaces)
**Archetype**: The Bridgebuilder (grimoires/bridgebuilder/ARCHETYPE.md)

---

## 1. Problem Statement

The Constructs Network has 5 packs (39 skills) distributed across standalone repos, with 2 active deployments: midi-interface (Observer) and hub-interface (Artisan). The team building these products IS the network's only user base.

Three categories of friction compound daily:

**1. Pipeline friction (#129)**: Every change — including a 26-line UI tweak — is forced through the full PRD → SDD → Sprint → Implement → Review → Audit pipeline. Constructs already operate as self-contained expertise packages with their own workflows, but the framework doesn't formally recognize this. The Loa upstream (cycle-029) just merged "Construct-Aware Constraint Yielding" — the runtime can now yield to construct-declared gates. But no manifest declares gates yet. The infrastructure exists. The declaration doesn't.

> Evidence: #129 documents a FE/UI change where ~40% of session time was process overhead. Observer has 11 skills with its own workflow. Artisan has 14. Neither goes through PRD/SDD.
> Source: `packages/shared/src/types.ts:219-271` — no `workflow` or `gates` field in PackManifest

**2. Schema bottleneck (#119, #118, #128)**: The manifest has 20 fields but none of the ones the open issues need: `domain`, `expertise`, `golden_path`, `workflow`, `methodology`, `tier`. Every forward-looking feature — MoE routing, progressive leveling, workflow gates, third-party constructs — is blocked on these fields existing. The Zod schema uses `.passthrough()` (`validation.ts:271`), so extensions are non-breaking. But the TypeScript types and Zod validators don't include them, which means no type safety, no validation, and no documentation.

> Evidence: 6 of 7 primary issues (#119, #127, #129, #118, #122, #128) are blocked on manifest fields that don't exist
> Source: `packages/shared/src/validation.ts:216-271`, `packages/shared/src/types.ts:219-271`

**3. Post-install dead end (#127)**: After installing a construct, the browsing-constructs skill shows a flat command list and ends. The `quick_start` field exists in the schema (`types.ts:267-270`, `validation.ts:269-270`) but the install flow doesn't reference it. There's no "start here," no workflow progression, no "you are here" indicator. Every time a construct is installed, the builder has to remember the workflow themselves.

> Evidence: #127 feedback after 31 canvases and 8 journey definitions: "after running any command, there's no 'you are here' indicator or 'try this next' recommendation"
> Source: `.claude/skills/browsing-constructs/SKILL.md` — Phase 6 (post-install report) ignores `quick_start`

**Additionally (surfaced during grounding):**

**4. TS/Zod schema drift**: TypeScript says `dependencies.skills: string[]` (`types.ts:234`), Zod says `dependencies.skills: z.record(z.string())` (`validation.ts:178`). TypeScript is missing fields that Zod has (`long_description`, `repository`, `homepage`, `documentation`, `keywords`, `engines`). These types are the shared contract between API, explorer, and CLI — drift means silent bugs.

> Source: `packages/shared/src/types.ts:232-236` vs `packages/shared/src/validation.ts:176-180`

**5. Construct distribution cobweb**: Installing constructs across repos requires manual pointing at the most mature version. Observer has been cloned and evolved on midi-interface but never synced back to construct-observer or the registry. Learnings don't flow upstream. Updates don't flow downstream. The construct-template repo just got created. The extraction infrastructure (PR #121 — git-sync, webhooks, register-repo) exists but isn't fully exercised.

> Source: User testimony, cycle-016 PRD (archived), construct-template repo existence

---

## 2. Product Vision

**Make the workshop work before opening the marketplace.**

The Constructs Network's value isn't in its explorer page or its download counts. It's in what midi-interface and hub-interface accomplish with constructs installed. Today, the team building these products is the network's only user, maintainer, and quality signal. The workshop needs to be frictionless for this team before it can serve anyone else.

This cycle lays the structural foundation that everything else builds on:
- Constructs can declare their workflow depth → the framework respects it → pipeline friction drops
- The manifest schema supports the fields every forward-looking issue needs → downstream work is unblocked
- Post-install flow uses existing data → builders know what to do next
- The shared type contract is accurate → silent bugs stop

The Bridgebuilder philosophy applies here: **orient before acting, teach the pattern not just the fix, match disclosure to readiness.** But the audience for this cycle is the team, not the world.

> Source: ARCHETYPE.md §1 Thesis, STRATEGIC-GAP.md "The Compounding Effect"

---

## 3. Goals & Success Metrics

### Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G1 | Constructs declare workflow gates | All 5 pack manifests include `workflow.gates` section. Loa runtime reads them. FE/UI changes no longer trigger full pipeline. |
| G2 | Manifest schema extended | `domain`, `expertise`, `golden_path`, `workflow`, `methodology`, `tier` fields exist in TypeScript types + Zod validation. Non-breaking. |
| G3 | Post-install shows "start here" | After `constructs install <pack>`, the install report includes the `quick_start` command and description from the manifest. |
| G4 | TS/Zod types synchronized | TypeScript `PackManifest` interface matches Zod `packManifestSchema` — same fields, same types. |
| G5 | Schema version bumped to 4 | New fields use `schema_version: 4`. Validation accepts both v3 and v4 manifests. |

### Success Criteria

- `workflow.gates.implement: required` is the only required gate for Observer and Artisan packs
- A FE/UI change in a construct-owning project skips PRD/SDD when the construct's manifest declares `gates.prd: skip`
- `pnpm --filter shared test` passes with new schema fields
- Running `constructs install observer` shows "Start here: /listen" (or equivalent) in the install report
- CI topology validation (`scripts/validate-topology.sh --strict`) passes with updated manifests

### Non-Goals (Explicit)

| Item | Why Not Now |
|------|------------|
| Explorer frontend fixes (A1-A3) | Nobody uses the explorer. Pre-positioning, not user-facing. Defer to Cycle B. |
| MoE intent routing | Needs manifests to declare `domain` first (this cycle enables it, Cycle C builds it) |
| Human-centered metrics table | No traffic to measure. Meaningful after constructs are used more broadly. |
| Methodology ingestion pipeline | Architecture gap, not a workflow friction. Defer to Cycle C. |
| Construct distribution/sync flow | Cobweb that needs untangling, but it's a separate PRD. This cycle makes the schema ready; distribution is cycle-030.5 or cycle-031. |
| Verification / Echelon integration | Zero third-party constructs exist. Schema supports `tier` field (G2), but verification is Cycle C+. |

---

## 4. User & Stakeholder Context

### Primary Persona: The Maintainer-Builder

**Who**: The team member who both maintains construct repos AND uses those constructs on product repos (midi-interface, hub-interface).

**Workflow today**:
1. Installs construct on product repo (manual, pointing at mature version)
2. Uses construct skills in daily development
3. Hits pipeline friction when construct work touches app zone
4. Discovers improvements or friction while using construct
5. Has no natural path to push learnings upstream

**What they need from this cycle**:
- Workflow gates: FE/UI work doesn't trigger full pipeline
- Post-install guidance: "Start here" after every install
- Schema that supports what they want to declare in manifests

### Secondary Persona: The Internal User (Future)

**Who**: Other org functions who use constructs but don't maintain them.

**Not served by this cycle** — this cycle makes the maintainer-builder workflow natural. The internal user benefits transitively (constructs work better = products work better).

> Source: User grounding interviews, #129 comment 1 ("Constructs live outside the Loa pipeline but on top of the Loa runtime")

---

## 5. Functional Requirements

### FR-1: Manifest Schema Extension (G2, G5)

**Priority**: P0 — everything else depends on this

Add the following optional fields to `PackManifest` in `packages/shared/src/types.ts` and `packManifestSchema` in `packages/shared/src/validation.ts`:

```typescript
// Domain declaration for routing (#119)
domain?: string[];
expertise?: string[];

// Golden path porcelain (#119, #127)
golden_path?: {
  commands: Array<{
    name: string;
    description: string;
    truename_map?: Record<string, string>;
  }>;
  detect_state?: string;
};

// Workflow depth declaration (#129)
workflow?: {
  depth: 'light' | 'standard' | 'deep';
  gates: {
    prd?: 'skip' | 'condense' | 'full';
    sdd?: 'skip' | 'condense' | 'full';
    sprint?: 'skip' | 'condense' | 'full';
    implement?: 'required';
    review?: 'visual' | 'textual' | 'both' | 'skip';
    audit?: 'skip' | 'lightweight' | 'full';
  };
};

// Methodology layer (#118)
methodology?: {
  references?: string[];
  principles?: string[];
  knowledge_base?: string;
};

// Capability tier (#128)
tier?: 'L1' | 'L2' | 'L3';
```

**Acceptance criteria**:
- All fields optional (zero barrier for existing manifests)
- Zod schema and TypeScript types match exactly
- `.passthrough()` preserved for forward-compat
- `schema_version` accepts 1-4, defaults to 1 for existing manifests
- Validation tests cover all new fields with valid and invalid inputs
- JSON Schema (`construct.schema.json` if it exists) updated in sync

> Source: ARCHETYPE.md §5.1, #119 proposal, #129 proposal, #118 proposal, #128 proposal

### FR-2: TS/Zod Synchronization (G4)

**Priority**: P0 — prerequisite for FR-1 being trustworthy

Reconcile the TypeScript `PackManifest` interface with the Zod `packManifestSchema`:

| Field | TypeScript (types.ts) | Zod (validation.ts) | Resolution |
|-------|----------------------|---------------------|------------|
| `dependencies.skills` | `string[]` | `z.record(z.string())` | **Adopt Zod** — `Record<string, string>` is richer (slug → version range) |
| `dependencies.packs` | `string[]` | `z.record(z.string())` | **Adopt Zod** — same reason |
| `dependencies.loa_version` | `string` | field named `loa` | **Align naming** — pick one |
| `long_description` | Missing | `z.string().max(10000)` | **Add to TS** |
| `repository` | Missing | `z.string().url()` | **Add to TS** |
| `homepage` | Missing | `z.string().url()` | **Add to TS** |
| `documentation` | Missing | `z.string().url()` | **Add to TS** |
| `keywords` | Missing | `z.array(z.string())` | **Add to TS** |
| `engines` | Missing | `z.object({ loa, node })` | **Add to TS** |
| `author` | `{ name, email?, url? }` | `z.union([string, object])` | **Adopt Zod** — allow string shorthand |

**Acceptance criteria**:
- Every field in Zod has a corresponding field in TypeScript with matching types
- Every field in TypeScript has a corresponding field in Zod
- API route formatters and explorer types still compile
- No runtime behavior changes for existing manifests

> Source: Codebase audit, `types.ts:219-271` vs `validation.ts:216-271`

### FR-3: Workflow Gates in Pack Manifests (G1)

**Priority**: P0 — the daily friction reducer

Add `workflow` section to all 5 pack manifests in their standalone repos (`construct-observer`, `construct-artisan`, `construct-crucible`, `construct-beacon`, `construct-gtm-collective`).

**Proposed gates per domain**:

| Pack | Domain | prd | sdd | sprint | implement | review | audit |
|------|--------|-----|-----|--------|-----------|--------|-------|
| Observer | Research/Analysis | skip | skip | condense | required | textual | lightweight |
| Artisan | Design/UI | skip | skip | condense | required | visual | skip |
| Crucible | Build/Test | condense | condense | full | required | both | full |
| Beacon | Deploy/Ship | condense | skip | condense | required | textual | lightweight |
| GTM-Collective | Marketing/Growth | skip | skip | skip | required | textual | skip |

**Acceptance criteria**:
- Each manifest includes `workflow.gates` section
- Each manifest includes `workflow.depth` ('light' | 'standard' | 'deep')
- Manifests pass updated schema validation
- Loa runtime (cycle-029 constraint yielding) reads these gates and adjusts enforcement

**Note**: This FR requires changes in 5 external repos. The schema (FR-1) ships in loa-constructs. The manifest declarations ship in each construct-* repo. The runtime reading (cycle-029) is already merged upstream.

> Source: #129 domain examples table, #129 comment 2 ("composes the pipeline at chosen depth")

### FR-4: Post-Install Quick Start (G3)

**Priority**: P1 — improves every install

Modify the `browsing-constructs` skill's post-install report (Phase 6) to include the `quick_start` field from the installed pack's manifest.

**Current behavior** (`.claude/skills/browsing-constructs/SKILL.md`):
```
Observer installed. 6 skills ready.
Commands: /observe, /daily-synthesis, /follow-up, /shape, /speak, /grow
```

**Target behavior**:
```
Observer installed. 6 skills ready.

Start here: /listen
  "Capture your first user insight. Everything else builds on this."

Commands: /observe, /daily-synthesis, /follow-up, /shape, /speak, /grow
```

**Acceptance criteria**:
- If manifest has `quick_start`, show it prominently before command list
- If manifest has `golden_path.commands`, show the first command as "Start here"
- If neither exists, show current behavior (flat command list)
- All 5 pack manifests have `quick_start` populated

**Implementation note**: This requires updating a SKILL.md file in the Loa System Zone. This is a framework-level skill, so the change propagates to all projects on next `/update-loa`. Alternatively, could be a construct-level override — decision for SDD.

> Source: #127 feedback, ARCHETYPE.md §5.4 CLI Onboarding, Hormozi: "< 2 minutes to first valuable output"

### FR-5: Schema Version Migration (G5)

**Priority**: P1 — housekeeping that prevents future pain

- Bump manifest schema version to 4
- Validation accepts v1, v2, v3, and v4 manifests
- New fields are only validated when `schema_version >= 4`
- Default for `schema_version` remains 1 (backward compat)
- CI topology validation updated for v4

**Acceptance criteria**:
- Existing v3 manifests pass validation unchanged
- v4 manifests with new fields pass validation
- v4 manifests with invalid new field values fail validation
- `validate-topology.sh` checks updated

> Source: Memory — "All 5 pack manifests at schema_version 3"

---

## 6. Technical & Non-Functional Requirements

### NF-1: Non-Breaking Extension

All schema changes MUST be non-breaking. Existing manifests MUST continue to validate without modification. The `.passthrough()` on the Zod schema already enables this — new fields are validated when present but not required.

### NF-2: Three-Layer Sync

Changes touch three schema layers that must stay in sync:
1. **TypeScript types** (`packages/shared/src/types.ts`)
2. **Zod validation** (`packages/shared/src/validation.ts`)
3. **JSON Schema** (`construct.schema.json` or equivalent, if it exists)

CI MUST validate all three layers agree.

### NF-3: Cross-Repo Coordination

FR-3 (workflow gates in manifests) requires changes in 5 external repos. These changes depend on FR-1 (schema extension) being published first. The coordination sequence:
1. Ship FR-1 + FR-2 in `loa-constructs` (shared package)
2. Publish shared package (or reference via git)
3. Update manifest in each `construct-*` repo
4. Sync updated manifests to registry

### NF-4: Runtime Compatibility

The Loa upstream (cycle-029) already supports reading `workflow.gates` from manifests. FR-3 manifests MUST produce gate declarations that the runtime can consume without changes to the runtime itself. If the runtime expects a specific format, manifests MUST match it.

---

## 7. Scope & Prioritization

### In Scope (Cycle A)

| Priority | Item | FR |
|----------|------|----|
| P0 | Manifest schema extension (6 new field groups) | FR-1 |
| P0 | TS/Zod synchronization | FR-2 |
| P0 | Workflow gates in 5 pack manifests | FR-3 |
| P1 | Post-install quick_start | FR-4 |
| P1 | Schema version bump to v4 | FR-5 |

### Out of Scope (Deferred)

| Item | Deferred To | Why |
|------|-------------|-----|
| Explorer frontend fixes | Cycle B | Nobody uses the explorer |
| Golden path per construct (journey bars) | Cycle B | Needs manifests with `golden_path` first (this cycle) |
| `/loa` aggregating construct status | Cycle B | Needs state detection scripts |
| MoE intent routing | Cycle C | Needs `domain` + `expertise` populated in manifests |
| Human-centered metrics | Cycle C | No traffic to measure |
| Construct distribution/sync UX | Cycle A.5 or B | Separate cobweb to untangle, separate PRD |
| Envio construct | Cycle C | Proof-of-concept for third-party, needs schema first |
| Verification / Echelon | Cycle C+ | Zero third-party constructs |

---

## 8. Risks & Dependencies

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema changes break existing manifests | Low | High | `.passthrough()` + all new fields optional + CI validation |
| Cycle-029 runtime expects different gate format than we declare | Medium | Medium | Read cycle-029 implementation before writing FR-3 manifests |
| Cross-repo coordination delays (5 repos need manifest updates) | Medium | Medium | FR-1/FR-2 can ship independently. FR-3 manifests ship in parallel across repos. |
| `browsing-constructs` SKILL.md is System Zone | Low | Low | Either framework PR or construct-level override |

### Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| Loa cycle-029 (Constraint Yielding) | Runtime | **Merged** — just pulled via `/update-loa` this session |
| `construct-template` repo | Template | **Created** — exists but may need schema v4 updates |
| 5 `construct-*` repos | Manifest hosts | **Exist** — need manifest updates for FR-3 |
| Shared package publishing | Coordination | Needed for cross-repo type sync |

### Open Questions

| # | Question | Decision Needed By |
|---|----------|-------------------|
| Q1 | Does cycle-029 runtime read `workflow.gates` from manifest JSON directly, or from a derived config? | Before FR-3 implementation |
| Q2 | Should `browsing-constructs` changes go through Loa upstream PR, or as a construct-level override? | Before FR-4 implementation |
| Q3 | How do construct-* repos reference the updated shared types? Git dependency? Published package? Copy? | Before FR-3 implementation |

---

## 9. Issue Disposition

After Cycle A ships:

| Issue | Status | What Changed |
|-------|--------|-------------|
| #119 | **Schema unblocked** | `domain`, `expertise`, `golden_path` fields exist in types + Zod |
| #127 | **First step shipped** | `quick_start` used post-install. Golden path commands declarable in manifest. |
| #128 | **Schema unblocked** | `tier` field exists. Verification deferred. |
| #129 | **Fully addressed** | Manifest declares gates. Runtime yields. Pipeline friction eliminated for constructs. |
| #118 | **Schema unblocked** | `methodology` field exists. Ingestion pipeline deferred. |
| #116 | **Not addressed** | Network-level friction points deferred to Cycle B. Observer-specific fixes in construct-observer repo. |
| #122 | **Schema ready** | Envio construct can now declare `domain` + `methodology`. Implementation deferred to Cycle C. |

**Related issues advanced:**
- #49 (WORKFLOW.md per pack) → Subsumed by `golden_path` + `workflow` in manifest
- #89 (pack autosync/graduation) → Schema v4 supports graduation metadata
- #103 (domain-specific DX) → `domain` field enables future MoE routing
- #117 (schema migration tooling) → Non-breaking extension via `.passthrough()` avoids need for migration tooling

---

*"The best bridge is the one that carries the weight of its builders before it carries the world."*
