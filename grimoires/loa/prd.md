# PRD: Constructs Network Distribution Layer

**Cycle**: cycle-036
**Created**: 2026-02-27
**Status**: Draft
**Source**: 4-agent R&D team (org-auditor, dx-analyst, incur-researcher, landscape-researcher)
**Linked Issues**: [#131](https://github.com/0xHoneyJar/loa-constructs/issues/131) (Construct Lifecycle RFC), [#120](https://github.com/0xHoneyJar/loa-constructs/issues/120) (Skill Discovery Breaks Post-Install), [#89](https://github.com/0xHoneyJar/loa-constructs/issues/89) (Pack Autosync), [#127](https://github.com/0xHoneyJar/loa-constructs/issues/127) (Golden Path Leveling), [#122](https://github.com/0xHoneyJar/loa-constructs/issues/122) (MoE Routing)
**Research artifacts**:
- `grimoires/bridgebuilder/incur-cli-vs-mcp-research.md` (incur architecture, TOON, CLI-vs-MCP thesis)
- `grimoires/bridgebuilder/agent-native-cli-landscape-research.md` (MCP, Skills.sh, TOON, market positioning)
- `grimoires/bridgebuilder/ARCHETYPE.md` (Bridgebuilder design philosophy)
**Grounded in**:
- Codebase scan: `scripts/seed-forge-packs.ts`, `packages/shared/src/types.ts`, `packages/shared/src/validation.ts`, `apps/api/src/routes/constructs.ts`, `apps/api/src/services/constructs.ts`, `apps/api/src/db/schema.ts`, `.claude/scripts/constructs-install.sh`, `.claude/scripts/golden-path.sh`
- Full 0xHoneyJar org audit: 50+ repos scanned, all construct-* repos inventoried
- Founder direction: CLI framework as distributable construct, surface unsurfaced constructs, cross-repo sync, structured foundation

---

## 1. Problem Statement

The Constructs Network has 80+ skills of domain expertise scattered across 10+ repos, but only 67 are installable. The distribution layer — the mechanism that turns expertise into something a builder can discover, install, and compose — has five concrete failures grounded in code:

### P1: The Seed Script Bottleneck

`scripts/seed-forge-packs.ts` is the **only** way constructs enter the registry. It has 6 hardcoded Git URLs (lines 42-67). Adding a construct requires modifying source code and running a script with `DATABASE_URL`. There is no self-service registration, no webhook sync, no CLI-driven onboarding.

The `POST /v1/constructs/register` endpoint (constructs.ts:257-339) reserves slugs but does not populate pack files. The `POST /v1/packs/:slug/versions` publishing flow exists but isn't the operational path. The DB schema has `pack_sync_events`, `github_repo_id`, and `content_hash` columns — all empty. The infrastructure is half-built.

> **Impact**: 3 constructs with valid `construct.yaml` v3 manifests (Herald/3 skills, Hardening/7 skills, Dynamic Auth/3 skills) sit in repos unable to be installed. The seed script is the single point of failure for the entire distribution story.

### P2: Manifest Data Loss

The seed script stores **7 of ~30** manifest fields. It constructs a minimal object (`schema_version, name, slug, version, description, author, license, skills`) and drops everything else: `golden_path`, `workflow`, `events`, `pack_dependencies`, `methodology`, `domain`, `expertise`, `quick_start`, `hooks.post_install`, `tier`.

Every downstream consumer — the explorer, the CLI browse output, the golden path journey bar, the workflow gate reader — already knows how to read these fields. The Zod schema validates them. The TypeScript types declare them. **The data simply never reaches the database.**

> **Impact**: `detect_state` is a dead field (declared in types.ts:303, validated by Zod, never evaluated by `golden-path.sh`). `workflow.gates` can't be read from registry data. Golden path journey bars show command names but can't show "you are here." The entire progressive disclosure system from ARCHETYPE.md Section 3 is blocked by a 20-line seed script function.

### P3: Fork Drift Invisibility

midi-interface's Observer has **29 skills** (5 unique: `correlating-temporal`, `diagramming-states`, `enriching-temporal`, `grounding-code`, `triaging-signals`). The registry Observer has 24. The `packs` table has no `forked_from` column. The `content_hash` column exists but is never populated. There is no mechanism to detect, measure, or resolve divergence between installed packs and their registry versions.

> **Impact**: The most valuable product signal in the ecosystem — Observer evolving from 6→24→29 skills through real-world usage in midi-interface — is untraceable. Skills born from actual builder friction have no path back to the canonical construct.

### P4: No Cross-Platform Degradation

The SKILL.md standard has been adopted by **37+ agent platforms** (Claude Code, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Google Antigravity). Vercel's Skills.sh publishes 147 new skills per day. Individual construct skills ARE SKILL.md-compatible, but the pack-level abstractions (`construct.yaml`, `persona.yaml`, events, capability metadata) require a construct-aware runtime.

A construct skill cannot currently be consumed outside the Loa/Claude Code ecosystem. The addressable market is artificially constrained.

> **Impact**: The construct model's unique value (expertise bundling, 4-tier progressive disclosure, capability routing, inter-construct events) is invisible to the 37-platform SKILL.md ecosystem. Builders on Cursor, Copilot, or Windsurf cannot access any of the 80+ skills.

### P5: No "What Next?" After Skill Execution

When a builder runs `/observe` or `/inscribe`, the skill produces output and... stops. There is no per-invocation call-to-action telling the agent what to do next. The `golden_path.commands` field exists in manifests but is pack-level and static. The `detect_state` field was designed for this but is never evaluated.

incur solves this with typed CTAs returned from every command execution — dynamic, context-sensitive, referencing the next command based on output state. Constructs have the manifest schema for this but zero runtime implementation.

> **Impact**: Agents guess what to do next or ask the user. This breaks flow state — the Bridgebuilder's highest-priority protection (ARCHETYPE.md: "Never pull builders out of their CLI to learn, configure, or troubleshoot").

---

## 2. Vision

**Every construct in the 0xHoneyJar ecosystem is discoverable, installable, syncable, and composable via `/constructs` — with graceful degradation to standalone SKILL.md for any of the 37+ agent platforms.**

The construct model occupies a genuinely novel position in the agent tooling landscape:

```
npm:          "Here's code. Import it."
MCP:          "Here's a tool. Call it."
Skills.sh:    "Here's how to do this task. Follow these instructions."
Constructs:   "Here's a domain expert. It knows what to do, how to do it,
               when to use which tools, what quality looks like, and how
               to coordinate with other experts."
```

This PRD does not invent a new system. It completes the existing one — connecting the half-built infrastructure (DB schema, API endpoints, manifest validation) to the half-surfaced constructs (Herald, Hardening, Dynamic Auth, The Easel, midi-interface Observer extensions) through a self-service distribution layer.

---

## 3. Goals & Success Metrics

### Business Objectives

| Objective | Target | Measurement |
|-----------|--------|-------------|
| Surface all ready constructs | 10 packs installable (from 6) | `/constructs browse` returns 10+ packs |
| Full manifest fidelity | 30/30 fields stored | Seed script stores complete validated manifest |
| Self-service registration | < 5 min to register new construct | Time from `construct.yaml` creation to registry appearance |
| Fork drift detection | 100% of installed packs have content hash | `content_hash` populated for all `pack_versions` rows |
| Cross-platform compatibility | Every skill degrades to standalone SKILL.md | Skills usable in Cursor/Copilot without construct runtime |

### Human-Connected Metrics (per ARCHETYPE.md Section 4)

| Metric | What It Captures | Baseline | Target |
|--------|-----------------|----------|--------|
| First-invocation success | Does trying a construct deliver on its description? | Unknown | > 80% of installs lead to first skill invocation |
| Construct depth | How far through a construct's golden path | 1.2 steps avg (estimated) | 3+ steps avg |
| Flow state preservation | Does the system keep builders in the zone? | No CTAs → agents ask user | CTAs guide next step without interruption |
| Friction-to-resolution | Time from "I'm stuck" to "I understand" | No measurement | < 2 min for installation friction |

---

## 4. User & Stakeholder Context

### Persona 1: Internal Builder (Primary)

Team members using constructs within 0xHoneyJar products (midi-interface, hub-interface, set-and-forgetti, score-api). They have constructs installed via Loa framework mounts. Their pain: constructs evolve in their repos but those improvements don't flow back to the registry, and new constructs from other repos aren't installable.

### Persona 2: Construct Author (Secondary)

Someone creating a new construct (e.g., Envio Indexer from #122, or a community contributor). Their pain: the only path to registry presence requires modifying the seed script and having `DATABASE_URL` access. No documentation on how to author a construct that the registry can consume.

### Persona 3: External Agent User (Tertiary — Phase 3)

Someone using Cursor, Copilot, or another SKILL.md-compatible agent. They want individual skills without the full construct runtime. Their pain: skills are locked inside the construct packaging and can't be consumed standalone.

---

## 5. Functional Requirements

### Phase 1: Fix the Plumbing (Foundation)

*Goal: Full manifest fidelity + surface ready constructs.*

#### F1.1: Full Manifest Extraction in Seed Script

**Current**: `seed-forge-packs.ts` constructs a minimal manifest (7 fields).
**Target**: Store the full `construct.yaml` parsed to JSON, validated by `packManifestSchema.safeParse()`.

Fields that will newly reach the database:
- `golden_path` (commands, detect_state, truename_map)
- `workflow` (depth, gates)
- `events` (emits, consumes)
- `pack_dependencies`
- `methodology` (references, principles, knowledge_base)
- `domain`, `expertise`
- `quick_start`
- `hooks` (post_install, pre_uninstall)
- `tier`
- `type` (pack, tool-pack, codex)

**Acceptance criteria**:
- Seed script uses Zod validation for all manifests
- All 30+ manifest fields stored in `pack_versions.manifest` JSONB
- Existing API responses (`GET /v1/constructs/:slug`) automatically surface new fields (they already destructure from manifest)
- `content_hash` (SHA-256 of manifest + skill contents) populated for every `pack_versions` row

#### F1.2: Register 3 Ready Constructs

Add Herald, Hardening, and Dynamic Auth to the seed script:

| Construct | Repo | Skills | Schema |
|-----------|------|--------|--------|
| Herald | `construct-herald` | 3 (grounding-announcements, synthesizing-voice, chronicling-changes) | v3 |
| Hardening | `construct-hardening` | 7 (postmortem, triage, blast-radius, harden, regression-check, signal-audit, correlating) | v3 |
| Dynamic Auth | `construct-dynamic-auth` | 3 (resolving-wallet-identity, enforcing-primary-wallet, backfilling-identity-links) | v3 |

**Acceptance criteria**:
- All 3 appear in `/constructs browse` output
- All 3 installable via `/constructs install <slug>`
- Total registered: 9 packs, 80 skills

#### F1.5: Extract The Easel to Standalone Construct

**Current**: The Easel (4 skills, `manifest.json` schema_version 1) lives embedded in `rektdrop-interface/.claude/constructs/packs/the-easel/`. It has 16 Taste Decision Records, a full vocabulary atlas (86 terms, 8 domains), and is actively used for cyberpunk aesthetic direction. Issue #131 incorrectly attributed it to hub-interface — it was always in rektdrop-interface. The Cartograph and The Mint (also attributed to hub-interface in #131) never existed anywhere in the org.

**Target**: Extract the **core DNA** of The Easel to a standalone `construct-the-easel` repo — the universal creative studio workflow (vocabulary grounding → visual exploration → result capture → taste decisions). All rektdrop/cyberpunk-specific content (TDRs, aesthetic-direction.md, the cyberpunk vocabulary atlas) stays in rektdrop-interface as project-level grimoire content. The extracted construct is domain-agnostic creative tooling that any project can install and populate with its own aesthetic vocabulary.

**Critical distinction**: The Easel's *process* (ground → explore → capture → record) is the construct. The rektdrop *content* (cyberpunk FUI terms, CRT emulation TDRs, Freeside Divergence aesthetics) is project state produced BY that process. The extraction ships the machine, not the output.

**Extraction steps**:

| Step | Detail | Effort |
|------|--------|--------|
| Create `construct-the-easel` repo | New repo with clean pack structure — NOT a copy of rektdrop's embedded version | Small |
| Write domain-agnostic SKILL.md files | Generalize the 4 skills: remove cyberpunk references, use context slots for vocabulary domain | Medium |
| Write `construct.yaml` v3 | Capabilities, events (`forge.easel.taste_recorded`, `forge.easel.vocabulary_grounded`), pack_dependencies (optional: Artisan for taste token handoff) | Small |
| Add `index.yaml` per skill | All `model_tier: sonnet`, `danger_level: safe`, `effort_hint: medium` | Small |
| Context slots for grimoire paths | `{{grimoire_path}}` instead of hardcoded `grimoires/the-easel/` | Small |
| Ship empty templates only | `tdr-template.md` (blank), `vocabulary-template.md` (empty 8-domain structure), `quality-gates.md` (generic phase gates) | Small |
| Add `identity/` directory | `persona.yaml` (creative studio voice — domain-agnostic) and `expertise.yaml` (design vocabulary, visual direction, taste documentation) | Small |
| Register in seed script | Add to GIT_CONFIGS + PACK_ICONS | Trivial |
| Update rektdrop-interface | Install construct from registry, keep existing `grimoires/the-easel/` content (TDRs, atlas, aesthetic-direction) as project state | Small |

**What ships with the construct** (domain-agnostic):
- 4 skill SKILL.md files with context slots
- `tdr-template.md` — empty Taste Decision Record template
- `vocabulary-template.md` — empty vocabulary atlas structure (8 domains, no terms)
- `quality-gates.md` — generic Ground → Visualize → Tokenize → Implement phase gates

**What stays in rektdrop** (project-specific):
- 16 Taste Decision Records (TDR-001 through TDR-016)
- `vocabulary/atlas.md` — 86 cyberpunk terms across 8 domains
- `aesthetic-direction.md` — Freeside Divergence visual language
- All exploration session artifacts, prompts, reviews

**Skills** (generalized):
- `grounding-creative` — Reviews project vocabulary and TDRs for a design area, identifies tensions and gaps
- `exploring-visuals` — Generates prompts for image generation tools grounded in project vocabulary
- `capturing-results` — Annotates generation results with vocabulary terms and TDR criteria
- `recording-taste` — Taste Decision Record CRUD operations

**Acceptance criteria**:
- `construct-the-easel` repo exists with `construct.yaml` v3
- All 4 skills are domain-agnostic — zero cyberpunk/rektdrop references in the construct
- Skills use context slots for vocabulary paths, grimoire paths, and generation tool names
- Installing on a fresh project produces empty templates ready to populate with any aesthetic vocabulary
- rektdrop-interface installs from registry and its existing `grimoires/the-easel/` TDRs/atlas continue working
- Registered on constructs.network, installable via `/constructs install the-easel`
- Total registered after this + F1.2: **10 packs, 84 skills**

#### F1.3: Activate detect_state in Golden Path

**Current**: `golden-path.sh`'s `golden_detect_construct_journeys()` reads `golden_path.commands` but never evaluates `detect_state`.
**Target**: If a pack declares `golden_path.detect_state` (a script path), execute it and use the returned state to highlight the current position in the journey bar.

**Acceptance criteria**:
- `/loa` shows "you are here" indicator per installed construct
- detect_state scripts execute in the construct's directory context
- Fallback: if no detect_state declared, show command names without position indicator (current behavior)

#### F1.4: Post-Install Hook Execution

**Current**: `hooks.post_install` is declared in manifests and validated by Zod but never executed by `constructs-install.sh`.
**Target**: After pack extraction, execute `hooks.post_install` if declared.

**Acceptance criteria**:
- Post-install scripts run after file extraction
- Scripts execute in the pack's installation directory
- Failures are non-blocking (warn, don't abort install)
- Security: scripts must be within the pack directory (no path traversal)

### Phase 2: Self-Service Distribution

*Goal: Construct authors can register, sync, and publish without modifying source code.*

#### F2.1: Self-Service Registration API

**Endpoint**: `POST /v1/constructs/register` (extend existing)

Add `git_url` and `git_ref` fields to the registration schema. On registration:
1. Validate caller identity (JWT auth)
2. Clone the repo, read `construct.yaml`
3. Validate manifest with Zod
4. Create pack row with `source_type='git'`, populate `git_url`, `github_repo_id`
5. Create first `pack_version` with full validated manifest
6. Populate `construct_identities` from `identity/` directory

**Acceptance criteria**:
- `POST /v1/constructs/register { slug, git_url }` creates a fully populated registry entry
- No seed script modification required
- Response includes the construct's registry page URL

#### F2.2: Sync Endpoint

**Endpoint**: `POST /v1/packs/:slug/sync`

Trigger re-sync from the registered `git_url`:
1. Validate caller is pack owner
2. Clone repo at latest `git_ref`
3. Compare `content_hash` — skip if unchanged
4. Parse manifest, validate with Zod
5. Create new `pack_version` if version bumped, or update current if content changed
6. Log to `pack_sync_events` (existing table, currently empty)

**Acceptance criteria**:
- Sync detects content changes via hash comparison
- Sync is idempotent (running twice with no changes produces no new versions)
- `pack_sync_events` table populated for audit trail
- Rate limited per existing DB index

#### F2.3: CLI Registration Commands

Extend the `browsing-constructs` skill and install scripts:

- `/constructs register <slug> --git-url <url>` — calls `POST /v1/constructs/register`
- `/constructs sync <slug>` — calls `POST /v1/packs/:slug/sync`
- `/constructs status <slug>` — shows installed version vs registry version + content hash comparison

**Acceptance criteria**:
- All three commands work from CLI within a Claude Code session
- `constructs status` shows divergence indicator when hashes differ

#### F2.4: GitHub Webhook Receiver

**Endpoint**: `POST /v1/webhooks/github`

Automated sync on push:
1. Validate GitHub webhook signature (HMAC-SHA256)
2. Match `github_repo_id` to a registered pack
3. Trigger the same sync logic as F2.2
4. Rate limit via `pack_sync_events`

**Acceptance criteria**:
- Webhook fires on push to default branch
- Sync completes within 60 seconds of push
- Failed syncs logged but don't break the webhook response

### Phase 3: Cross-Platform Compatibility & Agent Navigation

*Goal: Skills work standalone on 37+ platforms. Agents always know what to do next.*

#### F3.1: Graceful SKILL.md Degradation

Every skill within a construct must function as a standalone SKILL.md when consumed outside the construct runtime. This means:

- Skill SKILL.md files must be self-contained (no hard references to construct.yaml, persona.yaml, or other pack-level files)
- Context slots (`{{project_name}}`, etc.) should have sensible defaults or degrade to placeholders
- The construct layer (identity, events, capability routing) is enrichment, not a dependency

**Acceptance criteria**:
- Any skill file copied to `~/.claude/commands/` or another SKILL.md-compatible agent works without the construct runtime
- Skill audit script validates standalone compatibility

#### F3.2: Per-Invocation Call-to-Actions

After each skill execution, the runtime emits a `## Next Steps` section with context-sensitive suggestions based on the construct's `golden_path.commands` and the current `detect_state` output.

**Example**: After running `/observe` (Observer's listening skill):
```
Next:
/see — Synthesize what you've captured (5 canvases ready)
/shape — Shape patterns into journey definitions (if 3+ canvases share themes)
/loa — Check your full journey status
```

**Acceptance criteria**:
- CTAs appear after skill execution for packs that declare `golden_path`
- CTAs are dynamic (reference current state, not static command lists)
- CTAs are optional — packs without golden_path show no CTAs
- CTA format is a simple markdown `## Next Steps` section appended to skill output

#### F3.3: Content-Hash Staleness Detection

Extend `constructs-install.sh` and `constructs-loader.sh`:

- On install: compute SHA-256 of manifest + all skill file contents, store in `.constructs-meta.json`
- On `check-updates`: compare installed hash against registry hash
- Surface drift: `/constructs status` shows `[SYNCED]`, `[BEHIND]`, or `[DIVERGED]` per pack

**Acceptance criteria**:
- Every installed pack has a `content_hash` in `.constructs-meta.json`
- `check-updates` catches changes even without version bumps
- Divergence detection feeds into the proposed Merkle-tree system from RFC #131

---

## 6. Technical & Non-Functional Requirements

### Architecture Principles

1. **Construct/Runtime Boundary preserved**: Skills define expertise. Runtime executes. No skill may assume a specific runtime.
2. **Hand-authored SKILL.md**: Skills are expertise documents, not API references. Do NOT auto-generate from schemas (per incur research finding).
3. **Per-repo installation**: Constructs install to `.claude/constructs/packs/` (gitignored, project-scoped). No global installation.
4. **MCP stays external**: MCP servers are for external integrations (GitHub, Linear). Skills are the primary agent-expertise channel.
5. **4-tier progressive disclosure preserved**: Pack manifest → skill metadata → skill instructions → resources.

### Performance

- Seed script sync: < 30 seconds per construct
- API sync endpoint: < 60 seconds per construct
- Install + post-install hooks: < 90 seconds
- detect_state script execution: < 5 seconds
- CTA generation: < 1 second (reads cached state)

### Security

- Post-install hooks: sandboxed to pack directory, no network access, timeout after 30 seconds
- Webhook signature validation: HMAC-SHA256 with per-pack secret
- Registration: requires authenticated JWT (construct author)
- Path traversal prevention: maintained from existing `constructs-install.sh` validation

### Compatibility

- construct.yaml (YAML) and manifest.json (JSON) both supported for input
- All manifests stored as validated JSON in `pack_versions.manifest`
- Zod schema is the single source of truth for validation
- Skills must degrade to standalone SKILL.md (F3.1)

---

## 7. Scope & Prioritization

### MVP (Phase 1 — Foundation)

| Item | Priority | Effort |
|------|----------|--------|
| F1.1 Full manifest extraction | P0 | Small — ~50 lines of seed script |
| F1.2 Register 3 ready constructs | P0 | Small — add to GIT_CONFIGS + icons |
| F1.5 Extract The Easel | P0 | Medium — extract from rektdrop, upgrade v1→v3, register |
| F1.3 Activate detect_state | P1 | Medium — golden-path.sh extension |
| F1.4 Post-install hook execution | P1 | Small — constructs-install.sh extension |

### Phase 2 — Self-Service

| Item | Priority | Effort |
|------|----------|--------|
| F2.1 Self-service registration API | P1 | Medium — ~200 lines API route |
| F2.2 Sync endpoint | P1 | Medium — ~150 lines API route |
| F2.3 CLI registration commands | P2 | Small — ~150 lines shell script |
| F2.4 GitHub webhook receiver | P2 | Medium — ~300 lines API route |

### Phase 3 — Cross-Platform & Navigation

| Item | Priority | Effort |
|------|----------|--------|
| F3.1 SKILL.md graceful degradation | P1 | Medium — audit + fix across 80 skills |
| F3.2 Per-invocation CTAs | P2 | Medium — runtime extension + protocol |
| F3.3 Content-hash staleness | P2 | Small — hash computation + comparison |

### Explicitly Out of Scope

- **TOON output format**: Valuable (39.6% token savings) but additive optimization, not structural. Deferred.
- **Dynamic cross-pack discovery**: Needed at 500+ skills. Current 80 skills are manageable. Deferred.
- **Billing / pricing tiers**: L1/L2/L3 tiers are metadata only, not pricing. Deferred.
- **MCP bridge for constructs**: Constructs should not be served via MCP. Skills are the channel.
- **Auto-generated SKILL.md**: Conflicts with hand-authored expertise model. Rejected.
- **Global skill installation**: Per-repo is architecturally correct. Rejected.
- **Supply-chain security scanning**: Important at scale but premature for 9 first-party packs. Deferred to Phase 4.

---

## 8. Risks & Dependencies

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Seed script Zod validation rejects existing manifests | Medium | High — breaks current packs | Run validation in dry-run mode first, fix manifests before switching |
| detect_state scripts have side effects | Low | Medium | Sandbox execution, read-only filesystem access, 5s timeout |
| Post-install hooks fail on different OSes | Medium | Low | Non-blocking, warn-only. Document OS requirements in manifest. |
| Webhook sync creates version spam | Low | Medium | Rate limiting via `pack_sync_events` index. Deduplicate on content_hash. |

### External Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| GitHub API (for webhook configuration) | Stable | Low |
| Supabase DB (for new rows/queries) | Active | Low |
| construct-* repos (Herald, Hardening, Dynamic Auth) | Exist, valid manifests | Low — need icon assets |
| rektdrop-interface (The Easel source) | Active, 16 TDRs produced | Low — extraction is pure copy + upgrade |
| Railway API service | Deployed | Low |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Construct authors don't adopt self-service | Internal team uses it first for all 9+ packs, proving the flow before external promotion |
| Cross-platform degradation reduces construct value prop | Frame as expansion, not dilution — standalone skills are the on-ramp, full constructs are the graduation |
| Fork drift resolution creates merge conflicts | Hash detection is informational first — surface drift, don't auto-merge |

---

## 9. Construct Inventory (Current State)

### Registered (6 packs, 67 skills)

| Pack | Skills | Version | Status |
|------|--------|---------|--------|
| Observer | 24 | 2.0.0 | Active |
| Artisan | 14 | 1.0.0 | Active |
| Protocol | 10 | 1.0.0 | Active |
| GTM Collective | 8 | 1.0.0 | Active |
| Beacon | 6 | 2.0.0 | Active |
| Crucible | 5 | 1.0.0 | Active |

### Ready to Register (3 packs, 13 skills)

| Pack | Skills | Repo | Schema | Readiness |
|------|--------|------|--------|-----------|
| Hardening | 7 | construct-hardening | v3 | HIGH — complete construct.yaml, identity, 7 domain skills |
| Herald | 3 | construct-herald | v3 | HIGH — complete construct.yaml, identity, 3 skills |
| Dynamic Auth | 3 | construct-dynamic-auth | v3 | HIGH — complete construct.yaml, identity, knowledge, 3 skills |

### Needs Migration (2 packs, ~17 domain skills)

| Pack | Domain Skills | Repo | Format | Issue |
|------|--------------|------|--------|-------|
| Rune/Sigil | ~15 | rune | manifest.json v4 | Old schema + Loa workflow skill contamination |
| Ruggy Security | ~2 | ruggy-security | manifest.json v1.2 | Old schema + mostly Loa workflow clones |

### Embedded — Extraction Target (1 pack, 4 skills)

| Pack | Skills | Location | Issue | Extraction |
|------|--------|----------|-------|------------|
| The Easel | 4 | rektdrop-interface/.claude/constructs/packs/ | Not standalone repo | F1.5 — extract to `construct-the-easel`, upgrade manifest v1→v3 |

### Fork Drift (1 case)

| Source | Registry | Fork Location | Delta |
|--------|----------|---------------|-------|
| Observer (24) | construct-observer | midi-interface | +5 unique skills (correlating-temporal, diagramming-states, enriching-temporal, grounding-code, triaging-signals) |

### Not Found

- The Cartograph — referenced in issue #131 as hub-interface construct, not found in any repo
- The Mint — referenced in issue #131 as hub-interface construct, not found in any repo

---

## 10. Market Positioning Context

### The Agent Tooling Stack (Feb 2026)

```
EXPERTISE LAYER  ← Constructs (packs + identity + events + quality gates)
   contains
SKILL LAYER      ← SKILL.md / Skills.sh (behavioral instructions, 37+ platforms)
   invokes
TOOL LAYER       ← MCP servers / CLI tools / APIs (executable capabilities)
```

### Key Market Data

- **MCP**: 97M monthly SDK downloads, 5,500+ servers. Suffers context pollution (50+ tools = 55-134K tokens before reasoning). Anthropic's Tool Search reduces by 85%.
- **Skills.sh**: Launched Jan 20, 2026. 147 new skills/day. npm as transport. Snyk security scanning. ClawHavoc incident: 341 malicious skills.
- **TOON**: 39.6% fewer tokens than JSON, 4.2 percentage points higher accuracy. TypeScript SDK available.
- **incur (wevm)**: CLI-as-skills framework. Auto-registration via `skills add`. Type-safe with Zod. TOON output. 3x cheaper than MCP per session.

### What Constructs Do That Nothing Else Does

1. **Expertise bundling**: Persona + skills + events + capability routing + quality gates in a distributable unit
2. **4-tier progressive disclosure**: Pack manifest → skill metadata → instructions → resources (most granular in the landscape)
3. **Capability-aware routing**: `model_tier`, `danger_level`, `effort_hint` enable intelligent dispatch
4. **Inter-construct events**: `emits`/`consumes` for loose coupling between domains
5. **Quality gates as structural concern**: Implement → review → audit with circuit breaker

### What Constructs Should NOT Do

1. Auto-generate SKILL.md from code — hand-authored expertise is the differentiator
2. Serve constructs via MCP — skills are the primary channel, MCP is for external integrations
3. Install globally — per-repo installation enables project-scoped topology
4. Compete with Skills.sh — instead, ensure every skill degrades to a standalone SKILL.md that can be published there

---

## 11. Implementation Sequence

```
Phase 1: Foundation (fix seed → register 3 + extract Easel → activate detect_state → post-install hooks)
    ↓
Phase 2: Self-Service (register API → sync endpoint → CLI commands → webhook)
    ↓
Phase 3: Reach (SKILL.md degradation → CTAs → content-hash staleness)
```

Each phase is independently shippable. Phase 1 is the highest-impact, lowest-effort change — it unblocks everything downstream by getting full manifest data into the database and 3 new constructs into the registry.

---

*"The best network doesn't add features. It removes the barriers between what exists and what's possible."*
