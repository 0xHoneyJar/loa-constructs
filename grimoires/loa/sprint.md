# Sprint Plan: Bridgebuilder Cycle A — Make the Workshop Work

**Cycle**: cycle-030
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-02-20
**Status**: Ready for Implementation
**Archetype**: grimoires/bridgebuilder/ARCHETYPE.md

---

## Overview

| Aspect | Value |
|--------|-------|
| Total sprints | 2 |
| Team size | 1 (AI agent) |
| Sprint duration | 1 sprint = 1 `/run` cycle |
| Total tasks | 14 |
| Goal | Extend manifest schema (4 layers), sync TS/Zod, add workflow gate declarations to 5 construct manifests, wire quick_start into post-install |

### Sprint Summary

| Sprint | Focus | Tasks | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | Schema Foundation (P0) | 9 | All 4 schema layers extended with Bridgebuilder fields, TS/Zod in sync, tests passing |
| 2 | Wiring + Manifests (P0/P1) | 5 | Post-install quick_start, 5 construct manifest templates, integration verification |

### Archetype Alignment

Each sprint is evaluated against the Bridgebuilder Archetype (`grimoires/bridgebuilder/ARCHETYPE.md`):

| Principle | How This Sprint Embodies It |
|-----------|-----------------------------|
| Fun First, System Second | `quick_start` gets builders to their first artifact, not a tutorial |
| Progressive Disclosure via State | `workflow.gates` reduce pipeline friction based on construct depth, not elapsed time |
| Flow State is Sacred | Constructs skip irrelevant gates — no PRD for a UI tweak |
| Open Beats Closed | Schema extension is additive. No existing behavior changes. Zero barrier entry. |
| Metrics That Measure Depth | `tier` field enables depth-based marketplace signals (Cycle B) |

---

## Sprint 1: Schema Foundation

**Focus**: Set up test infrastructure, synchronize TS/Zod, extend all 4 schema layers with Bridgebuilder fields.
**Priority**: All P0
**Acceptance criteria**: `pnpm --filter shared test` passes, `pnpm --filter shared build` passes, `pnpm --filter api build` passes.

### Task 1.1: Set up vitest for packages/shared

**File**: `packages/shared/vitest.config.ts` (new), `packages/shared/package.json` (edit devDependencies)
**What**: Create vitest config for shared package. Add vitest as devDependency.
**Acceptance**:
- `pnpm --filter shared test` runs (even with zero tests)
- Config inherits from workspace root if one exists, otherwise standalone

### Task 1.2: FR-2 — Synchronize TS types with Zod (baseline alignment)

**Files**: `packages/shared/src/types.ts`
**What**: Add 6 missing fields to `PackManifest` interface that Zod already has:
- `long_description?: string`
- `repository?: string`
- `homepage?: string`
- `documentation?: string`
- `keywords?: string[]`
- `engines?: { loa?: string; node?: string }`

Fix `author` type to accept `string | object` (matching Zod union).
**Acceptance**: TS types match Zod for all existing fields.

### Task 1.3: FR-2 — Resolve dependencies divergence

**Files**: `packages/shared/src/types.ts`, `packages/shared/src/validation.ts`
**What**:
- Change TS `dependencies.skills` from `string[]` to `Record<string, string>`
- Rename Zod `loa` to `loa_version` in `packDependenciesSchema`
- Update JSON Schema `pack-manifest.schema.json` dependencies.skills to `oneOf: [array, object]` (migration compatibility per Flatline IMP-001)
**Acceptance**: All 3 layers agree on `loa_version` naming. TS and Zod agree on `Record<string, string>`. JSON Schema accepts both forms.

### Task 1.4: FR-1 — Add Bridgebuilder fields to TypeScript types

**File**: `packages/shared/src/types.ts`
**What**: Add 6 new field groups to `PackManifest`:
- `domain?: string[]`
- `expertise?: string[]`
- `golden_path?: { commands: Array<{name, description, truename_map?}>; detect_state?: string }`
- `workflow?: { depth, app_zone_access?, gates: {...}, verification?: {...} }`
- `methodology?: { references?, principles?, knowledge_base? }`
- `tier?: 'L1' | 'L2' | 'L3'`
**Acceptance**: TypeScript compiles. All new fields optional.

### Task 1.5: FR-1 — Add Bridgebuilder fields to Zod validation

**File**: `packages/shared/src/validation.ts`
**What**: Add new Zod helper schemas and integrate into `packManifestSchema`:
- `goldenPathCommandSchema`, `goldenPathSchema`
- `workflowGatesSchema`, `workflowVerificationSchema`, `workflowSchema`
- `methodologySchema`, `tierSchema`
- New type exports: `GoldenPathCommand`, `GoldenPath`, `WorkflowGates`, `Workflow`, `Methodology`, `Tier`
**Acceptance**: Zod validates all new field structures. `.passthrough()` preserved.

### Task 1.6: FR-1 — Add Bridgebuilder fields to pack-manifest.schema.json

**File**: `.claude/schemas/pack-manifest.schema.json`
**What**: Add `workflow`, `domain`, `expertise`, `golden_path`, `methodology`, `tier`, `quick_start` to properties. All optional (NOT added to `required`). Workflow gates use `additionalProperties: false`.
**Acceptance**: JSON Schema validates manifests with new fields. Existing manifests still valid.

### Task 1.7: FR-1 — Add Bridgebuilder fields to construct.schema.json

**File**: `.claude/schemas/construct.schema.json`
**What**: Same new properties as pack-manifest. All optional.
**Acceptance**: JSON Schema validates construct.yaml with new fields.

### Task 1.8: Write schema validation tests

**File**: `packages/shared/src/__tests__/pack-manifest.test.ts` (new)
**What**: Write comprehensive test suite:
- Schema extension tests (11 cases from SDD §4.1)
- TS/Zod sync tests (7 cases)
- Backward compatibility tests (4 cases)
- Fail-closed integration tests (4 cases from Flatline SKP-003)
- Workflow gate contract tests (4 cases)
**Acceptance**: All tests pass. `pnpm --filter shared test` green.

### Task 1.9: Build verification

**What**: Run and verify:
- `pnpm --filter shared build`
- `pnpm --filter api build`
- `pnpm --filter explorer build`
**Acceptance**: All 3 build without errors.

---

## Sprint 2: Wiring + Manifests

**Focus**: Wire quick_start into post-install flow, prepare construct manifest templates, integration verification.
**Priority**: P0 (FR-4) + P1 (FR-3, FR-5)
**Acceptance criteria**: `validate-topology.sh --strict` passes, post-install shows quick_start, manifest templates ready for construct-* repos.

### Task 2.1: FR-4 — Update browsing-constructs post-install

**File**: `.claude/skills/browsing-constructs/SKILL.md`
**What**: Update Phase 6 (Report Results) to:
1. Read `quick_start` from installed manifest
2. Display "Start here: /{command}" with description
3. Fall back to `golden_path.commands[0]` if no quick_start
4. Current behavior (flat list) if neither exists
**Acceptance**: Post-install shows quick_start when available.

### Task 2.2: FR-3 — Create manifest templates for 5 construct repos

**File**: `grimoires/loa/context/construct-manifests/` (new directory, 5 JSON files)
**What**: Create exact manifest JSON additions for each construct-* repo:
- `construct-observer/manifest-additions.json` — workflow (light, skip/skip/full), quick_start (/observe)
- `construct-artisan/manifest-additions.json` — workflow (light, app_zone_access), quick_start (/taste)
- `construct-crucible/manifest-additions.json` — workflow (deep, full pipeline), quick_start (/test-plan)
- `construct-beacon/manifest-additions.json` — workflow (standard), quick_start (/deploy-production)
- `construct-gtm-collective/manifest-additions.json` — workflow (light, minimal), quick_start (/gtm-setup)
**Acceptance**: Each JSON validates against updated pack-manifest.schema.json.

### Task 2.3: FR-5 — Document version bump strategy

**File**: `grimoires/loa/context/construct-manifests/VERSION-BUMP.md` (new)
**What**: Document that construct-* repos bump `schema_version: 4` when adopting new fields. Validation layer accepts 1-∞.
**Acceptance**: Document exists with clear instructions for each repo.

### Task 2.4: Integration verification

**What**: Run and verify:
- `scripts/validate-topology.sh --strict --verbose`
- `construct-workflow-read.sh` can parse a manifest with the new workflow format
**Acceptance**: All validation passes.

### Task 2.5: Update simstim state and ledger

**What**: Update `.run/simstim-state.json` to mark planning complete. Update `grimoires/loa/ledger.json` with sprint entries.
**Acceptance**: State reflects completed planning, ready for implementation.

---

## Risk Acknowledgments

| Risk | Sprint | Mitigation |
|------|--------|------------|
| No existing test infrastructure | 1 | Task 1.1 creates vitest config first |
| 4-layer sync discipline | 1 | Tasks 1.2-1.7 are sequential: TS → Zod → JSON × 2 |
| Cross-layer drift (Flatline SKP-002a) | Deferred | Cycle B adds automated consistency test |
| `condense` semantic footgun (Flatline IMP-002) | 1 | All manifests use only `skip`/`full` |
| Dependencies split-brain (Flatline SKP-001) | 1 | `oneOf` migration with 3-phase sunset |

---

*"The runtime is waiting. The manifests just need to declare what they want."*
