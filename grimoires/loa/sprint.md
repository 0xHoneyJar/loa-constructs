# Sprint Plan: Constructs Network Distribution Layer — Phase 1

**Cycle**: cycle-036
**Created**: 2026-02-27
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Scope**: Phase 1 Foundation — F1.1, F1.2, F1.5, F1.3, F1.4

---

## Dependency Graph

```
F1.1 (Full manifest extraction)
  ↓ unblocks
F1.2 (Register 3 constructs) ─── can run in parallel with F1.5
F1.5 (Extract The Easel)     ─── can run in parallel with F1.2
  ↓ both unblock
F1.3 (Activate detect_state) ─── can run in parallel with F1.4
F1.4 (Post-install hooks)    ─── can run in parallel with F1.3
```

F1.1 must land first — it's the seed script change that everything else builds on. F1.2 and F1.5 are independent of each other (different repos). F1.3 and F1.4 are independent CLI-side changes.

---

## Sprint 1: Seed Script Foundation + Dry-Run Validation

*Goal: Full manifest extraction with Zod validation, content hash, dry-run mode. Zero new registrations yet — validate first.*

### Tasks

| ID | Task | File | AC |
|----|------|------|----|
| T1.1 | Import `packManifestSchema` from shared package | `seed-forge-packs.ts` | Import compiles, no runtime errors |
| T1.2 | Replace `PackManifest` interface with `DiscoveredPack` carrying `fullManifest` | `seed-forge-packs.ts` | Type-safe with `ValidatedPackManifest \| null` |
| T1.3 | Replace manual field extraction (lines 168-184) with `packManifestSchema.safeParse()` + fallback | `seed-forge-packs.ts` | Validated manifests pass through complete; invalid manifests fall back to 7-field |
| T1.4 | Replace 7-field manifest construction (lines 358-367) with `pack.fullManifest ?? minimal` | `seed-forge-packs.ts` | `pack_versions.manifest` stores full JSONB when validation passes |
| T1.5 | Add content hash computation after file collection | `seed-forge-packs.ts` | `content_hash` column populated (SHA-256 of manifest + sorted file hashes) |
| T1.6 | Add `--dry-run` flag that validates all manifests without DB writes | `seed-forge-packs.ts` | `pnpm tsx scripts/seed-forge-packs.ts --dry-run` reports validation results |
| T1.7 | Run dry-run against all 6 existing construct repos | Manual | All 6 pass Zod validation, or issues documented and fixed in upstream repos |

### Acceptance Criteria
- `seed-forge-packs.ts --dry-run` validates all 6 existing manifests
- Full manifest stored in `pack_versions.manifest` for all 6 packs
- `content_hash` populated for all `pack_versions` rows
- Fallback path works for any manifest that fails Zod (no regressions)
- No API changes needed — `GET /v1/constructs/:slug` automatically returns new fields

---

## Sprint 2: Register 4 New Constructs + The Easel Extraction

*Goal: Herald, Hardening, Dynamic Auth registered. The Easel extracted as domain-agnostic construct. Total: 10 packs, 84 skills.*

### Tasks

| ID | Task | File | AC |
|----|------|------|----|
| T2.1 | Add Herald, Hardening, Dynamic Auth to `GIT_CONFIGS` and `PACK_ICONS` | `seed-forge-packs.ts` | 3 entries in each map |
| T2.2 | Dry-run validate all 3 new construct repos | Manual | All 3 pass `packManifestSchema.safeParse()` |
| T2.3 | Create `construct-the-easel` repo with structure from SDD §2.3.1 | New repo | Repo exists with `construct.yaml`, `identity/`, `skills/`, `contexts/` |
| T2.4 | Write `construct.yaml` v3 manifest for The Easel | `construct-the-easel/construct.yaml` | Passes Zod validation, includes golden_path, events, pack_dependencies, workflow |
| T2.5 | Write `identity/persona.yaml` — creative studio voice, domain-agnostic | `construct-the-easel/identity/persona.yaml` | Zero cyberpunk/rektdrop references |
| T2.6 | Write `identity/expertise.yaml` — design vocabulary, visual direction, taste | `construct-the-easel/identity/expertise.yaml` | Domain-agnostic expertise descriptors |
| T2.7 | Write `grounding-creative` SKILL.md — generalized with context slots | `construct-the-easel/skills/grounding-creative/` | SKILL.md + index.yaml, uses `{{grimoire_path}}` and `{{vocabulary_path}}` |
| T2.8 | Write `exploring-visuals` SKILL.md — generalized with `{{generation_tool}}` | `construct-the-easel/skills/exploring-visuals/` | SKILL.md + index.yaml, no tool-specific references |
| T2.9 | Write `capturing-results` SKILL.md — generalized result annotation | `construct-the-easel/skills/capturing-results/` | SKILL.md + index.yaml |
| T2.10 | Write `recording-taste` SKILL.md — generalized TDR CRUD | `construct-the-easel/skills/recording-taste/` | SKILL.md + index.yaml |
| T2.11 | Write empty templates: `vocabulary-template.md`, `tdr-template.md`, `quality-gates.md` | `construct-the-easel/contexts/` | 8-domain vocabulary structure with no terms, blank TDR, generic phase gates |
| T2.12 | Add The Easel to `GIT_CONFIGS` and `PACK_ICONS` in seed script | `seed-forge-packs.ts` | Entry in each map with 🖼️ icon |
| T2.13 | Run seed script against production DB with all 10 constructs | Manual | `/constructs browse` returns 10 packs, 84 skills total |
| T2.14 | Verify all 10 constructs appear on constructs.network explorer | Manual | Explorer shows Herald, Hardening, Dynamic Auth, The Easel with full metadata |

### Acceptance Criteria
- 10 packs visible in `/constructs browse` and on constructs.network
- Herald (3), Hardening (7), Dynamic Auth (3), The Easel (4) all installable
- The Easel skills contain zero cyberpunk/rektdrop-specific content
- The Easel ships with empty vocabulary template — installing on a fresh project gives blank slate
- Total: 10 packs, 84 skills

---

## Sprint 3: CLI-Side — detect_state + Post-Install Hooks

*Goal: `/loa` shows "you are here" for installed constructs. Post-install hooks execute on installation.*

### Tasks

| ID | Task | File | AC |
|----|------|------|----|
| T3.1 | Modify `golden_detect_construct_journeys()` to execute `detect_state` scripts | `golden-path.sh` | Function reads `golden_path.detect_state` from manifest, executes if present |
| T3.2 | Implement `●` position marker based on detect_state output + truename_map matching | `golden-path.sh` | Journey bar shows `●` at the correct command position |
| T3.3 | Add 5-second timeout and silent fallback for detect_state execution | `golden-path.sh` | Slow/missing scripts don't block `/loa` output |
| T3.4 | Add `execute_post_install_hook()` function to constructs-install.sh | `constructs-install.sh` | Function extracts `hooks.post_install` from manifest, executes if present |
| T3.5 | Add path traversal prevention for post-install hooks via `realpath` comparison | `constructs-install.sh` | Scripts outside pack directory are blocked |
| T3.6 | Add 30-second timeout and non-blocking failure handling for hooks | `constructs-install.sh` | Hook failure = warning, not installation failure |
| T3.7 | Wire `execute_post_install_hook()` call after pack extraction in install flow | `constructs-install.sh` | Hook runs after files are extracted and commands are symlinked |
| T3.8 | Test: install a pack with golden_path + detect_state, verify `/loa` output | E2E | Journey bar renders with `●` position for the installed construct |
| T3.9 | Test: install a pack with hooks.post_install, verify hook executes | E2E | Post-install script runs, output visible, failure is non-blocking |
| T3.10 | Test: install a pack with neither detect_state nor hooks, verify no regression | E2E | Current behavior preserved — journey bar shows commands without `●`, no hook attempt |

### Acceptance Criteria
- `/loa` shows construct journey bars with `●` position indicator when detect_state is declared
- Post-install hooks execute after installation with path traversal prevention
- Fallback behavior preserved for packs without detect_state or hooks
- No regressions for existing installed packs

---

## Sprint Summary

| Sprint | Focus | Tasks | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | Seed Script Foundation | 7 tasks | Full manifest in DB + content hash |
| 2 | Register 4 + Extract Easel | 14 tasks | 10 packs / 84 skills on network |
| 3 | CLI detect_state + Hooks | 10 tasks | "You are here" + post-install hooks |

**Total**: 31 tasks across 3 sprints

### Sprint Dependencies

```
Sprint 1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ↓ must complete before
Sprint 2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ↓ must complete before (packs must be installable to test detect_state)
Sprint 3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Each sprint is independently shippable — Sprint 1 alone delivers full manifest fidelity for the existing 6 packs. Sprint 2 adds 4 new constructs. Sprint 3 enables the progressive disclosure UX.

---

*"First the pipe. Then the water. Then the garden."*
