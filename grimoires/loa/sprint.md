# Sprint Plan: Construct Lifecycle — construct-network-tools Pack

**Cycle**: cycle-032
**Created**: 2026-02-20
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Sprint Count**: 3 (reduced from PRD's 5 — migration waves deferred to separate cycles)

---

## Sprint Scope Decision

The PRD proposed 5 sprints including migration waves (Sprint 4-5). This plan scopes to **3 sprints** covering the core construct-network-tools pack infrastructure. Migration of real constructs (Observer, Easel, Mint, mibera-codex) is deferred to cycle-033 because:

1. Migration requires coordination across 4 external repos (midi-interface, hub-interface, mibera-codex, construct-template)
2. Schema extension + tooling must be stable before exercising against real constructs
3. Each migration has its own acceptance criteria and review cycle

---

## Sprint 1: Schema Foundation + Linking

**Label**: Schema Extension + .construct/ + Linking
**Global ID**: sprint-25

### Tasks

#### 1.1 Add Construct Lifecycle fields to TypeScript interface

**File**: `packages/shared/src/types.ts`
**Lines**: After line 328 (after `tier`)

Add 9 new optional fields to `PackManifest`:
- `type`: `'skill-pack' | 'tool-pack' | 'codex' | 'template'`
- `runtime_requirements`: `{ runtime?, dependencies?, external_tools? }`
- `paths`: `{ state?, cache?, output? }`
- `credentials`: `Array<{ name, description, sensitive?, optional? }>`
- `access_layer`: `{ type, entrypoint?, transport? }`
- `portability_score`: `number`
- `identity`: `{ persona?, expertise? }`
- `hooks`: `{ post_install?, post_update? }`

**AC**:
- [ ] All 9 fields added as optional properties
- [ ] JSDoc comments with FR-1 reference
- [ ] No existing fields modified
- [ ] TypeScript compiles without errors

#### 1.2 Add Construct Lifecycle Zod schemas

**File**: `packages/shared/src/validation.ts`
**Lines**: Before `packManifestSchema` definition (line 261)

Add 7 new sub-schemas:
- `constructTypeSchema`
- `runtimeRequirementsSchema`
- `constructPathsSchema`
- `credentialSchema` (with `^[A-Z][A-Z0-9_]*$` pattern for name)
- `accessLayerSchema`
- `identitySchema`
- `lifecycleHooksSchema`

Extend `packManifestSchema` with new fields. Add 7 type exports.

**AC**:
- [ ] All 7 schemas defined with correct constraints
- [ ] `packManifestSchema` extended (before `.passthrough()`)
- [ ] 7 new type exports added
- [ ] `credentialSchema.name` enforces UPPER_SNAKE_CASE
- [ ] `portability_score` constrained to 0.0-1.0
- [ ] Existing validation tests still pass

#### 1.3 Add Construct Lifecycle fields to JSON Schemas

**Files**:
- `.claude/schemas/construct.schema.json`
- `.claude/schemas/pack-manifest.schema.json`

Add `type`, `runtime_requirements`, `paths`, `credentials`, `access_layer`, `portability_score` to both schemas. `identity` and `hooks` already exist in `construct.schema.json` — add them to `pack-manifest.schema.json`.

Additionally reconcile known drift (SDD §3.4):
- Add `long_description`, `repository`, `homepage`, `documentation`, `keywords`, `engines`, `claude_instructions`, `mcp_dependencies`, `schema_version`, `protocols` to `pack-manifest.schema.json`
- Add `meta_probe` and `tools[].version` to Zod
- Fix `pricing.type` enum: standardize on `one_time` (not `one-time`)

**AC**:
- [ ] Both JSON Schemas updated with new fields
- [ ] Drift items reconciled per SDD §3.4
- [ ] `pricing.type` enum uses `one_time` consistently
- [ ] Existing construct.yaml files still validate
- [ ] `validate-topology.sh` passes

#### 1.4 Add schema validation tests

**File**: `packages/shared/src/__tests__/pack-manifest.test.ts`

Add test cases for all new fields:
- Valid/invalid `type` enum
- Valid `runtime_requirements` with dependencies
- Valid `credentials` with UPPER_SNAKE_CASE name
- Invalid credentials with lowercase name
- Valid `access_layer` with all transport types
- `portability_score` edge cases (0, 1, -0.1, 1.1)
- `identity` and `hooks` drift reconciliation
- Backward compatibility: existing manifests unchanged

**AC**:
- [ ] At least 12 new test cases
- [ ] All tests pass
- [ ] Backward compatibility test included
- [ ] Edge cases covered

#### 1.5 Implement .construct/ directory structure

**File**: `.claude/scripts/constructs-lib.sh`

Add helper functions:
- `ensure_construct_dir()` — lazy initialization with gitignore
- `preserve_shadow()` — copy installed version to shadow
- `compute_merkle_hash()` — deterministic SHA-256 directory hash
- `update_state_link()` / `remove_state_link()` — state.json management
- `update_state_shadow()` — shadow metadata management

**AC**:
- [ ] `ensure_construct_dir()` creates `.construct/{shadow,links,cache/merkle,cache/tmp}`
- [ ] `state.json` initialized with `schema_version: 1`
- [ ] `.construct/` auto-added to `.gitignore` if git repo
- [ ] `compute_merkle_hash()` produces deterministic hashes cross-platform
- [ ] `state.json` permissions set to 600

#### 1.6 Implement constructs-link.sh

**File**: `.claude/scripts/constructs-link.sh` (NEW)

Subcommands: `link`, `unlink`, `list`, `status`

**AC**:
- [ ] `link <path>` creates symlink + preserves shadow
- [ ] Auto-detects slug from `construct.yaml` or `manifest.json`
- [ ] `unlink <slug>` removes symlink + restores from shadow
- [ ] `list` shows all active links with status
- [ ] `status <slug>` shows link health and drift
- [ ] Sources `constructs-lib.sh`
- [ ] Uses named exit codes
- [ ] `validate_safe_identifier()` on all slug inputs
- [ ] Source-vs-execute guard at bottom

#### 1.7 Create linking-constructs skill

**Files**:
- `.claude/skills/linking-constructs/SKILL.md` (NEW)
- `.claude/skills/linking-constructs/index.yaml` (NEW)

**AC**:
- [ ] SKILL.md follows browsing-constructs pattern (200-400 lines)
- [ ] Workflow phases with bash script invocations
- [ ] AskUserQuestion for path selection when ambiguous
- [ ] Error handling table with all exit codes
- [ ] index.yaml has capabilities stanza (danger: moderate)
- [ ] Trigger: `/construct-link`

#### 1.8 Integrate shadow preservation into constructs-install.sh

**File**: `.claude/scripts/constructs-install.sh`

After successful pack installation, call `preserve_shadow()` to save pristine copy.

**AC**:
- [ ] `preserve_shadow()` called after `do_install_pack()` succeeds
- [ ] Shadow not created for linked constructs (already symlinked)
- [ ] Existing install behavior unchanged

---

## Sprint 2: Divergence Detection + Publishing

**Label**: Diff + Publish + API Endpoints
**Global ID**: sprint-26

### Tasks

#### 2.1 Implement constructs-diff.sh

**File**: `.claude/scripts/constructs-diff.sh` (NEW)

Subcommands: `check`, `diff`, `hash`

**AC**:
- [ ] `check <slug>` returns O(1) root hash comparison (uses cached .hash)
- [ ] `diff <slug>` returns full file-level diff as JSON
- [ ] `hash <path>` computes Merkle root hash of arbitrary directory
- [ ] JSON output includes `added`, `modified`, `deleted` arrays
- [ ] `--json` flag on all subcommands
- [ ] Handles missing shadow gracefully (exit code 3)
- [ ] Cross-platform SHA-256 (sha256sum or shasum)
- [ ] `LC_ALL=C sort` for deterministic file ordering

#### 2.2 Implement constructs-publish.sh

**File**: `.claude/scripts/constructs-publish.sh` (NEW)

Subcommands: `validate`, `push`, `dry-run`, `fork`

**AC**:
- [ ] `validate` runs 10-point checklist per SDD §5.4
- [ ] `push` validates → checks permissions → prompts version → uploads
- [ ] `dry-run` shows package contents without uploading
- [ ] `fork --scope <scope>` publishes as scoped variant via POST /v1/packs/fork
- [ ] Rate limited: 10 publishes/hour
- [ ] TLS enforcement on all API calls
- [ ] API key via curl config file (not command line)
- [ ] Filters `.git/` from package

#### 2.3 Create syncing-constructs skill

**Files**:
- `.claude/skills/syncing-constructs/SKILL.md` (NEW)
- `.claude/skills/syncing-constructs/index.yaml` (NEW)

**AC**:
- [ ] SKILL.md follows browsing-constructs pattern
- [ ] Workflow: check → diff → present choices
- [ ] AskUserQuestion: upstream / maintain as variant / discard / ignore
- [ ] Trigger: `/construct-sync`
- [ ] Danger level: moderate

#### 2.4 Create publishing-constructs skill

**Files**:
- `.claude/skills/publishing-constructs/SKILL.md` (NEW)
- `.claude/skills/publishing-constructs/index.yaml` (NEW)

**AC**:
- [ ] SKILL.md follows browsing-constructs pattern
- [ ] Workflow: validate → check permissions → version bump → confirm → push
- [ ] AskUserQuestion: version bump (patch/minor/major), publish confirmation
- [ ] High danger level (writes to registry)
- [ ] Trigger: `/construct-publish`

#### 2.5 Add GET /v1/packs/:slug/hash endpoint

**File**: `apps/api/src/routes/packs.ts`

**AC**:
- [ ] Returns `{ data: { slug, version, hash }, request_id }` envelope
- [ ] Hash format: `sha256:<hex>`
- [ ] Works with `optionalAuth()` (public)
- [ ] Returns 404 for unknown pack
- [ ] Returns 404 for pack with no published version

#### 2.6 Add GET /v1/packs/:slug/permissions endpoint

**File**: `apps/api/src/routes/packs.ts`

**AC**:
- [ ] Returns `{ data: { slug, permissions: { is_owner, can_publish, can_fork } }, request_id }`
- [ ] Requires `requireAuth()`
- [ ] Returns 404 for unknown pack
- [ ] `can_fork` always true for authenticated users

#### 2.7 Add POST /v1/packs/fork endpoint

**File**: `apps/api/src/routes/packs.ts`

**AC**:
- [ ] Creates new pack with copied files from source
- [ ] Zod validation: `{ source_slug, new_slug, description? }`
- [ ] Requires email verification
- [ ] Returns 409 if new slug already taken
- [ ] Returns 404 if source pack not found
- [ ] Fork version starts at `0.1.0`

#### 2.8 Add content_hash column migration

**File**: New migration file in `apps/api/drizzle/` (or equivalent)

**AC**:
- [ ] `ALTER TABLE pack_versions ADD COLUMN content_hash TEXT`
- [ ] Index on `(pack_id, content_hash) WHERE is_latest = true`
- [ ] Migration is reversible

---

## Sprint 3: Scaffold + Upgrade + Pack Assembly

**Label**: Create + Upgrade + construct-network-tools Pack
**Global ID**: sprint-27

### Tasks

#### 3.1 Implement constructs-create.sh

**File**: `.claude/scripts/constructs-create.sh` (NEW)

Subcommands: `new`, `init`

**AC**:
- [ ] `new --name X --type Y` scaffolds complete construct directory
- [ ] Supports 3 types: skill-pack, tool-pack, codex
- [ ] Generates `construct.yaml` with type-specific fields
- [ ] Generates `.gitignore` with stealth defaults
- [ ] Creates starter skill for skill-pack and tool-pack types
- [ ] `init --type Y` initializes existing directory (no git clone)
- [ ] `--offline` flag uses embedded templates (no network)
- [ ] Git repo initialized with initial commit
- [ ] Slug derived from name (lowercase, hyphenated)

#### 3.2 Add upgrade subcommand to constructs-install.sh

**File**: `.claude/scripts/constructs-install.sh`

Add `upgrade` subcommand with 3-way merge.

**AC**:
- [ ] `upgrade <slug>` performs 3-way merge (base=shadow, local=current, remote=new)
- [ ] `--check` flag shows available updates without installing
- [ ] Auto-merge for non-conflicting changes
- [ ] Conflicts presented individually with keep-local/accept-remote/manual options
- [ ] Shadow updated to new version after successful upgrade
- [ ] Rollback on merge failure (restore from backup)

#### 3.3 Create creating-constructs skill

**Files**:
- `.claude/skills/creating-constructs/SKILL.md` (NEW)
- `.claude/skills/creating-constructs/index.yaml` (NEW)

**AC**:
- [ ] SKILL.md follows browsing-constructs pattern
- [ ] Workflow: ask type → ask name → scaffold → report
- [ ] AskUserQuestion: type wizard (skill-pack/tool-pack/codex)
- [ ] Danger level: safe
- [ ] Trigger: `/construct-create`

#### 3.4 Create upgrading-constructs skill

**Files**:
- `.claude/skills/upgrading-constructs/SKILL.md` (NEW)
- `.claude/skills/upgrading-constructs/index.yaml` (NEW)

**AC**:
- [ ] SKILL.md follows browsing-constructs pattern
- [ ] Workflow: check → preview changes → merge → report
- [ ] AskUserQuestion: conflict resolution (keep-local/accept-remote/manual)
- [ ] Danger level: moderate
- [ ] Trigger: `/construct-upgrade`

#### 3.5 Add POST /v1/constructs/register endpoint

**File**: `apps/api/src/routes/constructs.ts` (NEW)

**AC**:
- [ ] Zod validation: `{ slug, name, type? }`
- [ ] Requires authentication + email verification
- [ ] Returns 409 if slug already taken
- [ ] Rate limit: 5 registrations/24h
- [ ] Returns `{ data: { slug, status: 'reserved' }, request_id }`

#### 3.6 Add POST /v1/webhooks/configure endpoint

**File**: `apps/api/src/routes/webhooks.ts` (NEW)

**AC**:
- [ ] Returns webhook URL + secret + step-by-step instructions
- [ ] Requires authentication
- [ ] Owner-only check
- [ ] Returns 404 if pack not found
- [ ] Instructions-only (no GitHub API calls)

#### 3.7 Assemble construct-network-tools pack manifest

**File**: Pack manifest for the construct-network-tools pack (construct.yaml)

**AC**:
- [ ] Lists all 7 skills (2 existing + 5 new)
- [ ] Lists all 6 commands
- [ ] Schema version 3
- [ ] `type: skill-pack`
- [ ] `tier: L2`
- [ ] Workflow gates declared
- [ ] Domain and expertise tags

#### 3.8 Update ledger with sprint information

**File**: `grimoires/loa/ledger.json`

**AC**:
- [ ] cycle-032 has 3 sprints with global IDs sprint-25, sprint-26, sprint-27
- [ ] Sprint labels match plan
- [ ] `global_sprint_counter` updated to 27

---

## Sprint Dependencies

```
Sprint 1 ──→ Sprint 2 ──→ Sprint 3
  schema       diff          create
  .construct/  publish       upgrade
  link         API(3)        API(2)
  shadow                     pack assembly
```

Sprint 2 depends on Sprint 1 (diff uses shadow, publish uses schema).
Sprint 3 depends on Sprint 2 (upgrade uses diff, pack assembly needs all skills).

---

## Estimated Effort

| Sprint | New Files | Modified Files | Lines (est.) |
|--------|-----------|----------------|-------------|
| Sprint 1 | 4 | 6 | ~800 |
| Sprint 2 | 6 | 2 | ~1200 |
| Sprint 3 | 7 | 3 | ~1000 |
| **Total** | **17** | **11** | **~3000** |

---

## Next Step

`/run sprint-plan` — Begin autonomous implementation starting with Sprint 1.
