# Sprint Plan: Construct Extraction — 5 Expert Repos

**Cycle**: cycle-016
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-02-17
**Status**: Ready for Implementation

---

## Overview

| Aspect | Value |
|--------|-------|
| Total sprints | 5 (Sprint 0-4) |
| Team size | 1 (AI agent) |
| Sprint duration | 1 sprint = 1 `/run` cycle |
| Total tasks | 36 |
| Goal | Extract 5 constructs to standalone repos, wire identity + CLAUDE.md injection, clean up monorepo |

### Sprint Summary

| Sprint | Focus | Tasks | Key Deliverable |
|--------|-------|-------|-----------------|
| 0 | Prerequisites | 4 | API code changes deployed (ALLOWED_DIRS + ALLOWED_ROOT_FILES) + webhook secret decision |
| 1 | Template + First Extraction + Injection | 12 | Template repo, extraction script, GTM Collective extracted, minimal injection working |
| 2 | Independent Constructs | 6 | Artisan + Beacon extracted and registered |
| 3 | Dependent Constructs | 7 | Observer + Crucible extracted, dependency matrix tested |
| 4 | Hardening + Cleanup | 7 | Injection edge cases, seed migration, sandbox deletion, soak verification |

### Open Questions to Resolve During Sprints

These were flagged by Flatline SDD review and overridden — resolve as they arise:

| Question | Resolve By | Default If Unresolved |
|----------|-----------|----------------------|
| Webhook secret: shared vs per-repo? | Sprint 0 (T0.0) | **Resolved in Sprint 0** — mandatory decision task added |
| License audit: all packs MIT-compatible? | Sprint 1 | Use `--private` flag, switch to public after audit |
| Identity skeletons: quality bar? | Sprint 1 | Schema-valid draft, non-trivial cognitiveFrame values |

---

## Sprint 0: Prerequisites

**Goal**: Deploy API changes required before any extraction begins.
**Verification**: `POST /v1/packs/gtm-collective/sync` returns files from `templates/` and `CLAUDE.md` at root.

### Tasks

#### T0.0: Resolve webhook secret strategy

- **File(s)**: Decision document (update SDD §10 Open Questions)
- **Description**: Decide shared vs per-repo webhook secrets before any extraction begins. If shared: document blast radius (one compromised repo = all repos compromised), add to §9 Known Risks. If per-repo: design secret storage/lookup in webhook handler, update extraction script to generate unique secrets per repo, document rotation procedure. Update SDD §1.8 and §10 accordingly.
- **Acceptance Criteria**:
  - Decision documented in SDD §10 (status changed from "Open" to "Resolved")
  - If shared: risk documented in §9 with accepted rationale
  - If per-repo: extraction script updated to use `--webhook-secret` per slug
  - Webhook HMAC verification code unchanged (already uses `timingSafeEqual`)
- **Effort**: S
- **Dependencies**: None

#### T0.1: Add `templates` to `ALLOWED_DIRS` in `collectFiles()`

- **File(s)**: `apps/api/src/services/git-sync.ts`
- **Description**: Add `'templates'` to the `ALLOWED_DIRS` array in `collectFiles()`. Observer and Crucible have `templates/` directories with canvas, journey, gap, and reality templates that would be silently dropped without this change.
- **Acceptance Criteria**:
  - `ALLOWED_DIRS` array contains `'templates'`
  - Existing sync behavior for other directories unchanged
  - `pnpm --filter api build` succeeds
- **Effort**: XS (1 line)
- **Dependencies**: None

#### T0.2: Add `CLAUDE.md` to `ALLOWED_ROOT_FILES` in `collectFiles()`

- **File(s)**: `apps/api/src/services/git-sync.ts`
- **Description**: Add `'CLAUDE.md'` to the `ALLOWED_ROOT_FILES` array in `collectFiles()`. FR-3 depends on CLAUDE.md being present in the synced construct directory. Without this, the API sync endpoint and base64 fallback skip CLAUDE.md.
- **Acceptance Criteria**:
  - `ALLOWED_ROOT_FILES` array contains `'CLAUDE.md'`
  - Existing sync behavior for other root files unchanged
  - `pnpm --filter api build` succeeds
- **Effort**: XS (1 line)
- **Dependencies**: None

#### T0.3: Deploy API changes and verify with test repo

- **File(s)**: Railway deployment + test verification
- **Description**: Deploy the updated API to Railway. Create a temporary test branch on the existing `construct-gtm-collective` repo (or a throwaway test repo) containing a `templates/test.md` file and a root `CLAUDE.md` file. Run `POST /v1/packs/gtm-collective/sync` and verify the response includes files from both `templates/` and root `CLAUDE.md`. This catches ALLOWED_DIRS/ALLOWED_ROOT_FILES errors before Sprint 1.
- **Acceptance Criteria**:
  - Railway deployment succeeds
  - `pnpm --filter api build` passes in CI
  - Sync response JSON includes a file with path matching `templates/*`
  - Sync response JSON includes a file with path `CLAUDE.md`
  - Clean up: remove test branch/files after verification
- **Effort**: S
- **Dependencies**: T0.1, T0.2

### Rollback

If API deployment breaks existing sync: revert Railway deployment to previous version. Trigger: any existing pack sync returns non-200 after deploy.

---

## Sprint 1: Template + First Extraction + Minimal Injection

**Goal**: FR-1 (template repo), FR-2 for GTM Collective, FR-3 minimal injection. Establish the extraction pipeline end-to-end.
**Verification**: `constructs-install.sh install gtm-collective` clones from git, creates symlinks, injects CLAUDE.md.

### Tasks

#### T1.0: Establish schema validation toolchain

- **File(s)**: `.claude/schemas/construct.schema.json`, template repo `schemas/construct.schema.json`
- **Description**: Define the schema provisioning strategy: the canonical `construct.schema.json` lives at `.claude/schemas/construct.schema.json` in the monorepo (SDD Appendix J). The extraction script copies it into each construct repo at `schemas/construct.schema.json`. The template repo includes the same copy. Add a standard validation command (`npx ajv validate`) to the template's `validate.yml` CI and to the extraction script's `--dry-run` mode. This ensures all tasks referencing "schema validation passes" have a concrete, reproducible command.
- **Acceptance Criteria**:
  - Canonical schema exists at `.claude/schemas/construct.schema.json`
  - `npx ajv-cli validate -s .claude/schemas/construct.schema.json -d <test>.yaml --spec=draft2020 -c ajv-formats` works locally
  - Extraction script copies schema to `schemas/construct.schema.json` in output
  - `--dry-run` mode validates output `construct.yaml` against the copied schema
  - Template repo `validate.yml` references `schemas/construct.schema.json` for validation
- **Effort**: S
- **Dependencies**: None

#### T1.1: Create `construct-template` repo

- **File(s)**: GitHub repo `0xHoneyJar/construct-template`
- **Description**: Create the canonical construct structure as a GitHub template repo per FR-1. Include scaffolded `construct.yaml` with inline comments, example identity files (`persona.yaml`, `expertise.yaml`), example skill directory, `CLAUDE.md` template, CI workflow (`validate.yml`), `CONTRIBUTING.md`, `README.md`, `scripts/install.sh` example hook.
- **Acceptance Criteria**:
  - Repo exists at `0xHoneyJar/construct-template` with template flag enabled
  - `construct.yaml` passes schema validation against `construct.schema.json`
  - `validate.yml` CI workflow runs and passes on the template itself
  - All FR-1.1 through FR-1.10 requirements met
  - "Use this template" button visible on GitHub repo page
- **Effort**: M
- **Dependencies**: None

#### T1.2: Write extraction script (`extract-construct.sh`)

- **File(s)**: `scripts/extract-construct.sh`
- **Description**: Create the automated extraction script per SDD §1.4.1 and Appendix E. Accepts `--slug`, `--dry-run`, `--skip-register`, `--skip-webhook`, `--private`, `--template-repo` flags. Transforms `manifest.json` → `construct.yaml` using jq+yq (Appendix H), copies skills/commands/contexts/templates/scripts directories, generates skeleton identity files, generates skeleton CLAUDE.md, copies `construct.schema.json`, creates CI workflow, initializes git repo, creates GitHub repo, pushes, registers with API, triggers sync.
- **Acceptance Criteria**:
  - `./scripts/extract-construct.sh --slug gtm-collective --dry-run` generates correct local output
  - `construct.yaml` output passes schema validation
  - All 5 pack manifests can be transformed without errors (test with `--dry-run`)
  - `--slug` is authoritative source for slug (not manifest.json)
  - `schema_version` validated >= 3 before transform
  - Crucible's Observer dependency mapped without `required` field
  - Script is idempotent (re-run for same slug doesn't break)
  - Script has phased checkpoints: generate → validate → create repo → push → register → webhook → sync. Each phase logs completion and partial state can be resumed with `--skip-*` flags
  - On failure, script prints which phase failed and the resume command
  - `shellcheck` passes on the script
- **Effort**: L
- **Dependencies**: T1.0 (schema toolchain), T1.1 (template repo exists)

#### T1.3: Define formal identity schemas + wire into CI

- **File(s)**: Template repo `identity/persona.schema.yaml`, `identity/expertise.schema.yaml`, template repo `.github/workflows/validate.yml`
- **Description**: Create formal schema definitions for identity files per SDD Appendix B and C. These define the contract that `parseIdentity()` in git-sync.ts expects. Include field path mapping documentation. **Also update `validate.yml`** to add an identity validation step that runs `yamllint -d relaxed identity/` and validates persona.yaml has all 4 required cognitiveFrame fields (archetype, disposition, thinking_style, decision_making) and a voice block. This ensures "CI workflow passes" criteria in extraction tasks actually enforce identity quality.
- **Acceptance Criteria**:
  - Schema matches `parseIdentity()` field paths (L741-756)
  - All 4 cognitiveFrame fields documented as REQUIRED
  - Voice fields documented as REQUIRED
  - Expertise domains array with name, depth (1-5), specializations, boundaries
  - `validate.yml` includes identity validation step: yamllint + required field check
  - A persona.yaml missing `archetype` causes CI failure (test with bad fixture)
  - Extraction script copies schema files into each repo alongside identity templates
- **Effort**: M
- **Dependencies**: T1.0 (schema toolchain established)

#### T1.4a: Create injection test harness

- **File(s)**: `scripts/test-claude-injection.sh`
- **Description**: Create a bash test harness for CLAUDE.md injection scenarios (SDD §7.2). The harness creates a temp directory simulating a project root, runs `inject_construct_claude_md()` and `remove_construct_claude_md()` in each scenario, and asserts file contents using `grep`/`diff`. Each scenario prints PASS/FAIL and the harness exits non-zero if any scenario fails.
- **Acceptance Criteria**:
  - Harness covers all 10 scenarios from SDD §7.2
  - Each scenario: setup → act → assert → cleanup (isolated temp dirs)
  - Scenario 8 (symlink): creates a symlink CLAUDE.md, verifies function refuses
  - Scenario 9 (concurrent): launches 2 installs in parallel via `&`, verifies both succeed
  - Scenario 10 (fallback): simulates injection failure, verifies managed file still usable
  - Exit code 0 = all pass, non-zero = at least one failure
  - `shellcheck` passes on the harness
- **Effort**: M
- **Dependencies**: None

#### T1.4b: Implement minimal `inject_construct_claude_md()`

- **File(s)**: `.claude/scripts/constructs-install.sh`
- **Description**: Implement the injection function per SDD Appendix F. Architecture: single managed import — sentinel block in root CLAUDE.md contains one `@` import to `.claude/constructs/CLAUDE.constructs.md`, individual construct imports go in the managed file. Include install, uninstall, idempotent behavior, sentinel block management, portable mkdir-based locking with stale PID detection.
- **Acceptance Criteria**:
  - Install adds construct import to managed file + sentinel to root CLAUDE.md (one-time)
  - Uninstall removes construct import from managed file
  - Idempotent: re-install doesn't duplicate imports
  - Lock: concurrent installs serialize via mkdir-based `.constructs-inject.lock/`
  - Symlink detection: fails with error if CLAUDE.md is symlink
  - Atomic writes: temp file + `mv`
  - Fallback: on failure, managed file still usable + prints user instructions
  - Path security: slug validation, symlink checks on all components, realpath containment
  - `scripts/test-claude-injection.sh` exits 0 (scenarios 1-7 pass)
- **Effort**: L
- **Dependencies**: T1.4a (test harness exists)

#### T1.5: Extract GTM Collective

- **File(s)**: GitHub repo `0xHoneyJar/construct-gtm-collective`
- **Description**: Run extraction script for GTM Collective (8 skills, 14 commands). First real extraction — validates the entire pipeline end-to-end.
- **Acceptance Criteria**:
  - Repo exists at `0xHoneyJar/construct-gtm-collective`
  - `construct.yaml` passes schema validation
  - All 8 skills have `index.yaml` + `SKILL.md`
  - All 14 commands present
  - CI workflow passes
  - Per-construct verification checklist (SDD §7.1) items 1-5 pass
- **Effort**: M
- **Dependencies**: T1.2 (extraction script)

#### T1.6: Author GTM Collective identity (skeleton)

- **File(s)**: `construct-gtm-collective/identity/persona.yaml`, `construct-gtm-collective/identity/expertise.yaml`
- **Description**: Author schema-valid identity skeleton. Archetype: Strategist. Disposition: Market-aware, decisive. Use PRD identity archetype table as guide. Mark as `status: draft`.
- **Acceptance Criteria**:
  - All 4 cognitiveFrame fields are non-null and non-trivial (not "TBD")
  - Voice fields populated with plausible values
  - Expertise domains cover go-to-market strategy, launch planning, positioning
  - `parseIdentity()` would extract valid IdentityData
  - Identity files pass `yamllint -d relaxed`
- **Effort**: M
- **Dependencies**: T1.5 (repo exists)

#### T1.7: Author GTM Collective CLAUDE.md (skeleton)

- **File(s)**: `construct-gtm-collective/CLAUDE.md`
- **Description**: Author skeleton CLAUDE.md per SDD Appendix D template. Include Who I Am, What I Know, Available Skills (table of all 8), Workflow, Boundaries. Mark as `status: draft`.
- **Acceptance Criteria**:
  - All 8 skills listed in Available Skills table
  - Who I Am section synthesizes persona.yaml data
  - What I Know section references expertise.yaml domains
  - Boundaries section lists explicit non-capabilities
  - File is under 256KB (sync file size limit)
- **Effort**: M
- **Dependencies**: T1.6 (identity authored)

#### T1.8: Register + sync + webhook GTM Collective

- **File(s)**: API calls + GitHub webhook configuration
- **Description**: Register GTM Collective with the API, trigger initial sync, configure webhook. Verify end-to-end: push to repo triggers auto-sync.
- **Acceptance Criteria**:
  - `POST /v1/packs/gtm-collective/register-repo` returns 200
  - `POST /v1/packs/gtm-collective/sync` returns 200 with files + identity data
  - Webhook configured on GitHub repo (push + tag events, HMAC SHA256)
  - Push a test commit → webhook fires → sync event created in DB
  - `constructIdentities` row exists with non-null `cognitive_frame`
  - Per-construct verification checklist items 6-9 pass
- **Effort**: M
- **Dependencies**: T1.5, T1.6, T1.7, T0.3 (API deployed)

#### T1.9: End-to-end install verification + fallback + smoke test

- **File(s)**: Local test
- **Description**: Verify the full install flow: `constructs-install.sh install gtm-collective` clones from git, creates symlinks, injects CLAUDE.md. Also verify base64 fallback path exists (the install script's fallback code path compiles/runs even if not triggered). Finally, smoke test that the imported CLAUDE.md is loadable by Claude Code (the `@` import resolves to a readable file with expected sections).
- **Acceptance Criteria**:
  - `constructs-install.sh install gtm-collective` completes without errors
  - `.claude/constructs/packs/gtm-collective/` directory populated
  - Skill symlinks created in `.claude/skills/`
  - Command symlinks created in `.claude/commands/`
  - CLAUDE.md sentinel block present in root CLAUDE.md
  - `.claude/constructs/CLAUDE.constructs.md` contains `@` import for gtm-collective
  - `.constructs-meta.json` shows `source_type: "git"`
  - Fallback code path: install script contains fallback logic (grep for "fallback" or "api download" in script)
  - Smoke test: `.claude/constructs/packs/gtm-collective/CLAUDE.md` exists, contains "## Available Skills", and file is readable
- **Effort**: M
- **Dependencies**: T1.4b, T1.8

### Rollback

If extraction script produces invalid output: re-run with `--dry-run` to debug, fix script, re-run with same `--slug` (idempotent). If GTM Collective repo is broken: delete repo on GitHub, re-run extraction from scratch. If injection breaks existing CLAUDE.md: restore from git (`git checkout -- CLAUDE.md`). See SDD §7.5 for full rollback runbook.

---

## Sprint 2: Independent Constructs

**Goal**: FR-2 for Artisan + Beacon. Extract both independent constructs using the pipeline established in Sprint 1.
**Verification**: Both constructs sync + install successfully.

### Tasks

#### T2.1: Extract Artisan

- **File(s)**: GitHub repo `0xHoneyJar/construct-artisan`
- **Description**: Run extraction script for Artisan (14 skills — largest construct). Has `taste/` context directory.
- **Acceptance Criteria**:
  - Repo exists at `0xHoneyJar/construct-artisan`
  - `construct.yaml` passes schema validation
  - All 14 skills have `index.yaml` + `SKILL.md`
  - `taste/` context directory present
  - CI workflow passes
  - Per-construct verification checklist items 1-5 pass
- **Effort**: M
- **Dependencies**: T1.2 (extraction script proven with GTM)

#### T2.2: Author Artisan identity + CLAUDE.md

- **File(s)**: `construct-artisan/identity/persona.yaml`, `construct-artisan/identity/expertise.yaml`, `construct-artisan/CLAUDE.md`
- **Description**: Author skeleton identity and CLAUDE.md for Artisan. Archetype: Craftsman. Disposition: Detail-obsessed, aesthetic. Domains: design systems, motion design, visual refinement, taste compounding.
- **Acceptance Criteria**:
  - All 4 cognitiveFrame fields non-null and non-trivial
  - Expertise domains cover design, motion, taste, visual quality
  - CLAUDE.md lists all 14 skills
  - All files pass `yamllint` and are under 256KB
- **Effort**: M
- **Dependencies**: T2.1

#### T2.3: Register + sync + webhook Artisan

- **File(s)**: API calls + GitHub webhook
- **Description**: Register, sync, configure webhook, verify end-to-end.
- **Acceptance Criteria**:
  - Per-construct verification checklist items 1-9 pass
  - Push triggers auto-sync
  - Install via `constructs-install.sh install artisan` works
- **Effort**: M
- **Dependencies**: T2.1, T2.2

#### T2.4: Extract Beacon

- **File(s)**: GitHub repo `0xHoneyJar/construct-beacon`
- **Description**: Run extraction script for Beacon (6 skills). Has `schemas/` and `overlays/` context directories.
- **Acceptance Criteria**:
  - Repo exists at `0xHoneyJar/construct-beacon`
  - `construct.yaml` passes schema validation
  - All 6 skills have `index.yaml` + `SKILL.md`
  - `schemas/` and `overlays/` context directories present
  - CI workflow passes
- **Effort**: M
- **Dependencies**: T1.2

#### T2.5: Author Beacon identity + CLAUDE.md

- **File(s)**: `construct-beacon/identity/persona.yaml`, `construct-beacon/identity/expertise.yaml`, `construct-beacon/CLAUDE.md`
- **Description**: Author skeleton identity and CLAUDE.md for Beacon. Archetype: Signal Engineer. Disposition: Standards-focused, methodical. Domains: SEO, structured data, content discovery, schema markup.
- **Acceptance Criteria**:
  - All 4 cognitiveFrame fields non-null and non-trivial
  - Expertise domains cover SEO, structured data, discoverability
  - CLAUDE.md lists all 6 skills
  - All files pass validation
- **Effort**: M
- **Dependencies**: T2.4

#### T2.6: Register + sync + webhook Beacon

- **File(s)**: API calls + GitHub webhook
- **Description**: Register, sync, configure webhook, verify end-to-end.
- **Acceptance Criteria**:
  - Per-construct verification checklist items 1-9 pass
  - Push triggers auto-sync
  - Install via `constructs-install.sh install beacon` works
- **Effort**: M
- **Dependencies**: T2.4, T2.5

### Rollback

If Artisan or Beacon extraction fails: re-run with same `--slug` (idempotent). If webhook misconfigured: reconfigure via `extract-construct.sh --skip-register`. If either construct breaks existing installs: unregister via API, delete GitHub repo, re-extract.

---

## Sprint 3: Dependent Constructs

**Goal**: FR-2 for Observer + Crucible. Handle circular dependency resolution (Crucible's Observer dep changed to optional).
**Verification**: Both constructs work independently AND together. Dependency compatibility matrix passes.

### Tasks

#### T3.1: Extract Observer

- **File(s)**: GitHub repo `0xHoneyJar/construct-observer`
- **Description**: Run extraction script for Observer (6 skills). Has rich context layer: `base/crypto-base.md`, `overlays/berachain-overlay.md`, `overlays/defi-overlay.md`. Has `templates/` with canvas + journey templates. Has `scripts/compose-context.sh`.
- **Acceptance Criteria**:
  - Repo exists at `0xHoneyJar/construct-observer`
  - `construct.yaml` passes schema validation
  - All 6 skills have `index.yaml` + `SKILL.md`
  - `contexts/base/` and `contexts/overlays/` present
  - `templates/` directory with canvas + journey templates
  - `scripts/compose-context.sh` present
  - Soft dependencies on crucible + artisan declared in `pack_dependencies` (no `required` field)
  - CI workflow passes
- **Effort**: M
- **Dependencies**: T1.2

#### T3.2: Author Observer identity + CLAUDE.md

- **File(s)**: `construct-observer/identity/persona.yaml`, `construct-observer/identity/expertise.yaml`, `construct-observer/CLAUDE.md`
- **Description**: Author skeleton identity and CLAUDE.md for Observer. Archetype: Researcher. Disposition: Hypothesis-first, empathetic. Domains: user research, gap analysis, journey shaping. Use SDD Appendix B/C examples as reference.
- **Acceptance Criteria**:
  - All 4 cognitiveFrame fields non-null and non-trivial
  - Expertise domains cover user research (depth 5), gap analysis (depth 4)
  - Cross-domain bridges defined (User Research → Gap Analysis)
  - CLAUDE.md lists all 6 skills with workflow
  - Boundaries section: does NOT build UI, does NOT make product decisions
- **Effort**: M
- **Dependencies**: T3.1

#### T3.3: Register + sync + webhook Observer

- **File(s)**: API calls + GitHub webhook
- **Description**: Register, sync, configure webhook, verify end-to-end.
- **Acceptance Criteria**:
  - Per-construct verification checklist items 1-9 pass
  - `templates/` files present in sync response
  - `constructIdentities` row has Observer archetype data
  - Install works independently (no Crucible needed)
- **Effort**: M
- **Dependencies**: T3.1, T3.2

#### T3.4: Extract Crucible (change Observer dep to optional)

- **File(s)**: GitHub repo `0xHoneyJar/construct-crucible`
- **Description**: Run extraction script for Crucible (5 skills). Has `schemas/` and `overlays/` context directories. Critical: Crucible's manifest has `required: true` on Observer dependency — the extraction must map this without the `required` field (omission = optional per construct schema).
- **Acceptance Criteria**:
  - Repo exists at `0xHoneyJar/construct-crucible`
  - `construct.yaml` passes schema validation
  - All 5 skills have `index.yaml` + `SKILL.md`
  - `pack_dependencies` lists Observer WITHOUT `required` field
  - CI workflow passes
- **Effort**: M
- **Dependencies**: T1.2

#### T3.5: Author Crucible identity + CLAUDE.md

- **File(s)**: `construct-crucible/identity/persona.yaml`, `construct-crucible/identity/expertise.yaml`, `construct-crucible/CLAUDE.md`
- **Description**: Author skeleton identity and CLAUDE.md for Crucible. Archetype: Validator. Disposition: Rigorous, evidence-based. Domains: journey validation, gap verification, quality assurance.
- **Acceptance Criteria**:
  - All 4 cognitiveFrame fields non-null and non-trivial
  - Expertise domains cover validation and quality assurance
  - CLAUDE.md lists all 5 skills
  - Documents degraded behavior when Observer not installed
- **Effort**: M
- **Dependencies**: T3.4

#### T3.6: Register + sync + webhook Crucible

- **File(s)**: API calls + GitHub webhook
- **Description**: Register, sync, configure webhook, verify end-to-end.
- **Acceptance Criteria**:
  - Per-construct verification checklist items 1-9 pass
  - Install works independently (no Observer needed)
- **Effort**: M
- **Dependencies**: T3.4, T3.5

#### T3.7: Test dependency compatibility matrix

- **File(s)**: Local test
- **Description**: Test Observer and Crucible in 3 configurations per SDD §7.3, plus the all-5-constructs config.
- **Acceptance Criteria**:
  - Observer alone: install succeeds, skills work, events not delivered (no consumer)
  - Crucible alone: install succeeds, no errors without Observer
  - Observer + Crucible: install both, verify bidirectional events declared
  - All 5 constructs: install all, no conflicts, all skills available
- **Effort**: M
- **Dependencies**: T3.3, T3.6, T2.3, T2.6, T1.8

### Rollback

If Observer/Crucible dependency mapping breaks: fix `pack_dependencies` in construct.yaml, re-push, re-sync. If dependency matrix test (T3.7) fails: isolate which configuration fails, fix the broken construct independently. If circular dependency surfaces: both constructs already declare deps as optional — remove the problematic dependency entry and re-test.

---

## Sprint 4: Injection Hardening + Cleanup

**Goal**: FR-3 edge cases, FR-4 monorepo cleanup. Final verification and soak.
**Verification**: All 5 constructs sync + install, sandbox deleted, CI passes.

### Tasks

#### T4.1: Harden injection edge cases

- **File(s)**: `.claude/scripts/constructs-install.sh`, `scripts/test-claude-injection.sh`
- **Description**: Handle remaining CLAUDE.md injection edge cases from SDD §7.2: concurrent lock contention, symlink CLAUDE.md detection, malformed sentinel recovery. Run full 10-scenario test matrix using the harness from T1.4a.
- **Acceptance Criteria**:
  - `scripts/test-claude-injection.sh` exits 0 (all 10 scenarios pass)
  - Scenario 8: symlink CLAUDE.md → function returns error, no modification
  - Scenario 9: concurrent installs → both succeed, no duplicate imports
  - Scenario 10: forced failure → managed file intact, user instructions printed
  - Lock stale detection works: create stale lock dir with dead PID → lock acquired
- **Effort**: M
- **Dependencies**: T1.4a, T1.4b

#### T4.2: Migrate seed script

- **File(s)**: `scripts/seed-forge-packs.ts`
- **Description**: Add all 5 constructs to `GIT_CONFIGS` with git URLs pointing to standalone repos and `gitRef: 'main'`. Remove any remaining sandbox pack references from the seed script's source-of-truth logic.
- **Acceptance Criteria**:
  - `GIT_CONFIGS` contains all 5: gtm-collective, artisan, beacon, observer, crucible
  - All entries use `https://github.com/0xHoneyJar/construct-{slug}.git`
  - All entries use `gitRef: 'main'`
  - Seed script runs without errors: `npx tsx scripts/seed-forge-packs.ts`
- **Effort**: S
- **Dependencies**: T3.6 (all 5 constructs extracted)

#### T4.3: Create archive branch

- **File(s)**: Git branch `archive/sandbox-packs-pre-extraction`
- **Description**: Create an archive branch preserving the pre-extraction state of sandbox packs for rollback capability.
- **Acceptance Criteria**:
  - Branch `archive/sandbox-packs-pre-extraction` exists
  - Branch contains current `apps/sandbox/packs/` state
  - Branch pushed to remote
- **Effort**: XS
- **Dependencies**: None

#### T4.4: Run health gate

- **File(s)**: API + install verification
- **Description**: Verify all 5 constructs sync and install successfully. This is the gate before sandbox deletion.
- **Acceptance Criteria**:
  - `POST /v1/packs/{slug}/sync` returns 200 for all 5 constructs
  - `constructs-install.sh install {slug}` succeeds for all 5 constructs
  - All webhook deliveries show 200 in GitHub webhook logs
  - No sync errors in DB for past 24 hours
- **Effort**: S
- **Dependencies**: T4.2, T4.3

#### T4.5: Delete sandbox packs + update CI

- **File(s)**: `apps/sandbox/packs/`, `apps/sandbox/packs/README.md`, `.github/workflows/validate-topology.yml`
- **Description**: Delete the 5 sandbox pack directories (FR-4.2), update sandbox README to point to standalone repos (FR-4.3), remove sandbox scan paths from CI (FR-4.4).
- **Acceptance Criteria**:
  - `apps/sandbox/packs/{observer,crucible,artisan,beacon,gtm-collective}` deleted
  - `apps/sandbox/packs/README.md` updated with links to standalone repos
  - `validate-topology.yml` no longer scans `apps/sandbox/packs/`
  - `pnpm --filter api build` succeeds
  - `validate-topology.yml` CI passes
- **Effort**: M
- **Dependencies**: T4.4 (health gate passes)

#### T4.6: Add GitHub repo link to Explorer

- **File(s)**: `apps/explorer/` (construct detail page component)
- **Description**: Display "View Source on GitHub" link on construct detail pages when `sourceType === 'git'` per SDD §4.1. Conditional render when `pack.gitUrl` exists.
- **Acceptance Criteria**:
  - Link visible on construct detail page when `sourceType === 'git'`
  - Link points to `gitUrl` (with `.git` suffix removed)
  - Opens in new tab with `rel="noopener noreferrer"`
  - `pnpm --filter explorer build` succeeds
- **Effort**: S
- **Dependencies**: None

#### T4.7: Final acceptance verification + soak

- **File(s)**: Documentation + monitoring
- **Description**: Run all acceptance criteria from PRD §3, verify 48-hour soak (no sync errors, webhook delivery rate stable), verify base64 fallback works. **Base64 fallback method**: temporarily set `gitUrl` to an invalid URL (e.g., `https://github.com/0xHoneyJar/nonexistent-repo.git`) for a single test pack via direct DB update, then run `constructs-install.sh install {slug}`. The install script should fall back to API download (base64 from DB). Verify the installed files match the git-cloned version. Restore the correct `gitUrl` after test. Observable signal: install script logs should show "git clone failed, falling back to API download" and `.constructs-meta.json` should show `source_type: "api"` (or equivalent fallback indicator).
- **Acceptance Criteria**:
  - All PRD §3 success criteria pass
  - Base64 fallback verified: invalid gitUrl → install falls back to DB content → files match expected layout
  - Install log contains fallback indicator message
  - gitUrl restored to correct value after test
  - Soak observability: run `SELECT pack_id, COUNT(*) FROM pack_sync_events WHERE created_at > NOW() - INTERVAL '48 hours' AND status != 'success' GROUP BY pack_id` — expect 0 rows
  - Webhook delivery: check GitHub webhook recent deliveries page for each repo — expect all 200s
  - No sync errors for 48 hours after sandbox deletion
  - Webhook delivery rate stable across all 5 repos
  - SDD §7.4 rollback verification checklist passes (all 4 items)
- **Effort**: M
- **Dependencies**: T4.5

### Rollback

If sandbox deletion breaks build: restore from `archive/sandbox-packs-pre-extraction` branch (`git checkout archive/sandbox-packs-pre-extraction -- apps/sandbox/packs/`). If injection hardening introduces regressions: revert injection changes, re-run test harness to identify failing scenario. **Abort criteria** (SDD §7.5): if 3+ constructs fail health gate (T4.4), abort sandbox deletion and fall back to monorepo packs.

---

## Dependency Graph

```
Sprint 0: T0.1 ──┐
           T0.2 ──┼── T0.3
                  │
Sprint 1: T1.0
           T1.1 ── T1.2 ── T1.5 ── T1.6 ── T1.7 ── T1.8 ── T1.9
           T1.3 (← T1.0)   │                              │
           T1.4a ── T1.4b ─┼──────────────────────────────┘
                            │
Sprint 2: T2.1 ── T2.2 ── T2.3
           T2.4 ── T2.5 ── T2.6
                               │
Sprint 3: T3.1 ── T3.2 ── T3.3 ──┐
           T3.4 ── T3.5 ── T3.6 ──┼── T3.7
                                   │
Sprint 4: T4.1 (← T1.4a, T1.4b)  │
           T4.2 ──────────────────┘
           T4.3 ── T4.4 ── T4.5 ── T4.7
           T4.6
```

## Risk Mitigations

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Extraction script fails for a construct | 1-3 | Script is idempotent; re-run with same `--slug`. See rollback runbook (SDD §7.5) |
| Webhook delivery fails | 1-3 | Check GitHub webhook logs, reconfigure via extraction script `--skip-register` |
| Identity skeleton too sparse | 1-3 | Formal schema ensures all required fields present; acceptance criteria require non-trivial values |
| Concurrent installs break CLAUDE.md | 4 | mkdir-based locking with stale PID detection (SDD Appendix F) |
| Sandbox deletion breaks build | 4 | Archive branch for rollback; health gate must pass before deletion |
| License concerns on public repos | 1 | Default to `--private` flag until audit clears |

## Success Metrics

| Metric | Target |
|--------|--------|
| Repos created | 6 (5 constructs + 1 template) |
| Schema validation | 5/5 pass `ajv validate` |
| Sync success rate | 5/5 return identity data |
| Install success rate | 5/5 clone + symlink + inject |
| Webhook delivery | 5/5 fire on push |
| CI passing | 5/5 green on main |
| Sandbox packs deleted | 5/5 removed |
| Seed script migrated | 5/5 in GIT_CONFIGS |

---

*Generated by Sprint Planner Agent — cycle-016*
