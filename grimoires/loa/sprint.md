# Sprint Plan: Agent-Native Output Protocol — TOON, CTAs, Lazy-Loading Contract

**Cycle**: cycle-037
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Branch**: `feat/cycle-037-agent-native-output`

---

## Sprint 1: TOON Encoder + Output Format Routing (5 tasks)

### T1.1: Create `toon-lib.sh` encoder library
**File**: `.claude/scripts/lib/toon-lib.sh` (NEW)
**Change**: Implement `toon_detect_uniform()` and `toon_encode_tabular()` per SDD §2.1. Handle empty arrays (`label[0]{}:`), non-uniform arrays (return 1), and standard tabular encoding.
**AC**:
- `toon_detect_uniform '[]'` returns 1 (empty handled in encoder)
- `toon_detect_uniform '[{"a":1,"b":2},{"a":3,"b":4}]'` returns `a,b`
- `toon_detect_uniform '[{"a":1},{"b":2}]'` returns 1
- `toon_encode_tabular "packs" '[{"slug":"artisan","skills":14}]'` outputs `packs[1]{slug,skills}:\n  artisan,14`
- `toon_encode_tabular "test" '[]'` outputs `test[0]{}:`

### T1.2: Add `get_output_format()` to `constructs-lib.sh`
**File**: `.claude/scripts/constructs-lib.sh` (MODIFY)
**Change**: Add `get_output_format()` function per SDD §2.2. Reads `output_format.tabular` from `.loa.config.yaml`, validates enum (`md|toon|json`), defaults to `md`.
**AC**: Returns `md` when config missing, `md` when key missing, `toon` when set to `toon`, `md` when set to invalid value.

### T1.3: Add `format_tabular_output()` to `constructs-lib.sh`
**File**: `.claude/scripts/constructs-lib.sh` (MODIFY)
**Change**: Add `format_tabular_output()` router per SDD §2.2. Takes label, tabular JSON, original payload, fallback function. Routes to TOON encoder / JSON / fallback based on config.
**AC**:
- With `output_format.tabular: md` → calls fallback with original payload
- With `output_format.tabular: toon` → outputs TOON format
- With `output_format.tabular: toon` + non-uniform data → falls back to fallback with original payload
- With `output_format.tabular: json` → outputs formatted JSON

### T1.4: Integrate TOON in `constructs-browse.sh`
**File**: `.claude/scripts/constructs-browse.sh` (MODIFY)
**Change**: In `cmd_list()`, build flat tabular JSON and route through `format_tabular_output()` per SDD §3.1. Preserve `--json` flag precedence.
**AC**:
- Default config (`md`): Output byte-identical to pre-change behavior
- `output_format.tabular: toon`: Pack listing renders as TOON table
- `--json` flag: Still works regardless of config

### T1.5: Integrate TOON in `constructs-install.sh` status
**File**: `.claude/scripts/constructs-install.sh` (MODIFY)
**Change**: Refactor status command to collect pack data into JSON array, route through `format_tabular_output()` per SDD §3.2. Create `_show_all_packs_md()` wrapper for markdown fallback.
**AC**:
- Default config (`md`): Output byte-identical to pre-change behavior
- `output_format.tabular: toon`: Status renders as TOON table with slug, local, registry, status columns

---

## Sprint 2: CTA Protocol + Emission (4 tasks)

### T2.1: Create `skill-cta.md` protocol file
**File**: `.claude/protocols/skill-cta.md` (NEW)
**Change**: Write the CTA protocol specification per SDD §2.4. Document format, rules (max 3, truenames only, command-context-based), and enabled commands.
**AC**: Protocol file exists with Format, Rules, and Enabled Commands sections.

### T2.2: Add `is_cta_enabled()` and `emit_cta()` to `constructs-lib.sh`
**File**: `.claude/scripts/constructs-lib.sh` (MODIFY)
**Change**: Implement `is_cta_enabled()` (reads `cta.enabled` from config) and `emit_cta()` (static CTA mapping per command context) per SDD §2.3.
**AC**:
- `cta.enabled: false` → `emit_cta` returns immediately (no output)
- `cta.enabled: true` + context `browse` → outputs `Next:` block with 3 CTAs
- `cta.enabled: true` + context `install` + pack slug → outputs quick_start CTA if available

### T2.3: Integrate CTAs in browse, status, install
**Files**: `constructs-browse.sh`, `constructs-install.sh` (MODIFY)
**Change**: Call `emit_cta "browse"` at end of `cmd_list()`, `emit_cta "status"` at end of status command, `emit_cta "install" "$pack_slug"` at end of install command.
**AC**:
- Default config (`cta.enabled: false`): No `Next:` blocks in any output
- `cta.enabled: true`: All 3 commands append `Next:` block

### T2.4: Add config sections to `.loa.config.yaml`
**File**: `.loa.config.yaml` (MODIFY)
**Change**: Add `output_format.tabular: md` and `cta.enabled: false` sections per SDD §2.5.
**AC**: Config file has both new sections with correct defaults. Existing config unchanged.

---

## Sprint 3: Contract, Types, Hash Refinement (5 tasks)

### T3.1: Add Skill Loading Contract to `runtime-contract.md`
**File**: `docs/integration/runtime-contract.md` (MODIFY)
**Change**: Add `## Skill Loading Contract` section per SDD §2.6. Includes session-start behavior, on-demand trigger, token baseline table, output format contract, and defer_loading (marked non-normative).
**AC**: Section exists with all 5 subsections. `defer_loading` is marked as non-normative future extension.

### T3.2: Add `workflow_next` to `PackManifest` types
**File**: `packages/shared/src/types.ts` (MODIFY)
**Change**: Add `workflow_next` optional field to `PackManifest` interface per SDD §2.7.
**AC**: Field accepts `Array<{construct: string, reason: string, trigger?: string}>`. Existing manifests compile without changes.

### T3.3: Add `workflow_next` Zod schema
**File**: `packages/shared/src/validation.ts` (MODIFY)
**Change**: Add `workflowNextSchema` and include in pack manifest Zod schema per SDD §2.7.
**AC**: Zod validation accepts manifests with and without `workflow_next`. Invalid shapes rejected.

### T3.4: Hash divergence in `constructs-loader.sh` check-updates
**File**: `.claude/scripts/constructs-loader.sh` (MODIFY)
**Change**: In `check-updates`, after version comparison, add content hash fetch + comparison per SDD §2.8. Same version + different hash = `DIVERGED`.
**AC**: `check-updates` reports `DIVERGED` when versions match but content hashes differ.

### T3.5: Update SKILL.md schema documentation
**File**: `.claude/skills/browsing-constructs/SKILL.md` (MODIFY)
**Change**: Update `.constructs-meta.json` example to include `content_hash` field per SDD §2.8.
**AC**: Documentation example shows `content_hash: "sha256:a3f2c1..."` in installed_packs entry.

---

## Verification Checklist

- [ ] `output_format.tabular: md` → all commands produce byte-identical output (snapshot comparison)
- [ ] `output_format.tabular: toon` → `constructs browse` and `constructs status` produce TOON output
- [ ] `cta.enabled: false` → no `Next:` blocks anywhere
- [ ] `cta.enabled: true` → browse, status, install all have `Next:` blocks
- [ ] `workflow_next` in types.ts compiles
- [ ] `workflow_next` in validation.ts validates
- [ ] `runtime-contract.md` has Skill Loading Contract section
- [ ] `check-updates` detects hash divergence
- [ ] No `sed -i`, `readlink -f`, `grep -P`, or `timeout` in new code
