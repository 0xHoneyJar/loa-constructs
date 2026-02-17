# PRD: Construct Extraction — 5 Expert Repos

**Cycle**: cycle-016
**Created**: 2026-02-16
**Status**: Draft

---

## 1. Problem Statement

The Constructs Network has 5 packs (39 skills, 14 commands) stored as subfolders inside `apps/sandbox/packs/` in the monorepo. The git-based distribution infrastructure is fully built (PR #121) — git-sync service, register-repo/sync endpoints, webhook auto-sync, install script with git fallback, identity schema, and DB columns — but all 5 packs still live in the monorepo as file bundles rather than standalone repositories.

This creates concrete problems:

1. **Coupled releases** — Pack updates require a monorepo commit. A typo fix in a single SKILL.md triggers the full CI pipeline and requires a repo-level version bump
2. **No independent versioning** — All 5 packs share the monorepo's version history. Observer can't ship v1.2.0 independently of Artisan's v1.5.0
3. **No identity** — The identity system (`persona.yaml` + `expertise.yaml`) exists in schema and code but is empty for all 5 packs. Constructs are file collections, not experts
4. **No CLAUDE.md** — When a construct is installed, there's no automatic injection of the expert's operating instructions into the project's Claude Code context. The construct is passive — it adds skills/commands but doesn't teach Claude who the expert is
5. **No template** — External authors have no canonical example of what a construct repo looks like. The only reference is 5 subfolders with `manifest.json` files
6. **Dead infrastructure** — PR #121's git-sync, webhooks, and identity parsing are deployed but only exercised by a single test entry (`gtm-collective` in `GIT_CONFIGS`). The seed script still reads from `apps/sandbox/packs/` for 4 out of 5 packs

> Source: construct-as-repo-architecture.md, construct-extraction-plan.md, SYNC_ARCHITECTURE_PLAN.md

## 2. Product Vision

**A construct is an expert, not a file bundle.** Each construct is a standalone GitHub repo that embodies a single domain expert — with the vocabulary, workflows, deep knowledge, and cognitive identity of that field. When someone installs a construct, they're hiring an expert. When they `@`-import its CLAUDE.md, the expert is on. Unix philosophy: one tool, one job, mastery.

The template repo is how anyone creates a new construct — limitless potential.

> Source: construct-extraction-plan.md, user direction: "separate repos would give ability for limitless potential"

## 3. Goals & Success Metrics

### Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G1 | All 5 constructs live in standalone repos | 5 repos at `0xHoneyJar/construct-{slug}` with valid `construct.yaml` |
| G2 | Each construct has identity | `identity/persona.yaml` + `identity/expertise.yaml` authored for all 5 |
| G3 | Each construct has CLAUDE.md | Expert operating instructions auto-injected on install |
| G4 | Template repo exists | `0xHoneyJar/construct-template` as a GitHub template repo |
| G5 | Sandbox packs deleted | `apps/sandbox/packs/{observer,crucible,artisan,beacon,gtm-collective}` removed after verified migration |
| G6 | Webhooks active | Push to any construct repo triggers auto-sync to registry |
| G7 | Seed script migrated | All 5 entries in `GIT_CONFIGS`, sandbox no longer source of truth |

### Success Criteria

- `gh repo view 0xHoneyJar/construct-{slug}` returns valid repo for all 5 constructs
- `construct.yaml` passes schema validation against `construct.schema.json` for all 5
- API `POST /v1/packs/{slug}/sync` succeeds and returns identity data for all 5
- Install via `constructs-install.sh install {slug}` clones from git, creates symlinks, and injects CLAUDE.md
- Push a commit to any construct repo → webhook fires → registry auto-updates
- `pnpm --filter api build` succeeds after sandbox packs deleted
- Validate-topology CI passes with updated paths

### Non-Goals

- Marketplace features (reviews, ratings, enhanced discovery) — separate future cycle
- Third-party publishing flow (self-service repo registration UI) — separate future cycle
- Identity & reputation system (reputation scores, trust signals) — separate future cycle
- Public launch preparation (API key rotation, security audit) — separate future cycle
- On-chain integration (dNFT, Henlo token) — separate future cycle
- Payment integration (NowPayments) — separate future cycle

## 4. User Personas

### P1: Maintainer (Primary)

**Who**: Repository maintainer who manages the Constructs Network
**Current state**: Edits pack files inside monorepo, runs seed script to sync to DB, manages version bumps across 5 packs simultaneously
**After extraction**: Pushes to individual construct repos, webhook auto-syncs to registry, independent versioning per construct
**Key workflow**: Edit SKILL.md → commit → push → webhook fires → registry updated

### P2: Future Construct Author (Secondary — Template Consumer)

**Who**: External developer who wants to create a new construct
**Current state**: No reference implementation, no template, no guide
**After extraction**: Forks `construct-template`, fills in identity + skills, registers with API
**Key workflow**: Fork template → author persona.yaml + expertise.yaml + CLAUDE.md → add skills → register-repo → publish

### P3: Construct Consumer (Unchanged)

**Who**: Developer who installs and uses constructs
**Current state**: Installs via `constructs-install.sh`, gets skills + commands symlinked
**After extraction**: Same install flow, but now also gets CLAUDE.md auto-injected into project context. The construct becomes an active expert, not a passive tool collection
**Key workflow**: Install construct → `@`-import activates expert → use skills with full expert context

## 5. Functional Requirements

### FR-1: Template Repo (`construct-template`)

Create the canonical construct structure as a GitHub template repo.

| ID | Requirement | Detail |
|----|------------|--------|
| FR-1.1 | Scaffolded `construct.yaml` | All fields from `construct.schema.json` with inline comments explaining each. Required: `schema_version` (3+), `name`, `slug`, `version`. Optional: `description`, `author`, `license`, `skills`, `commands`, `identity`, `repository`, `events`, `pack_dependencies`, `hooks`, `quick_start` |
| FR-1.2 | Example `identity/persona.yaml` | Documented fields: `archetype`, `disposition`, `thinking_style`, `decision_making`, `voice` (nested), `model_preferences` (nested) |
| FR-1.3 | Example `identity/expertise.yaml` | Documented fields: `domains` array with `name`, `depth` (1-5), `boundaries` |
| FR-1.4 | Example skill directory | `skills/example-skill/index.yaml` + `SKILL.md` with capabilities stanza and documented fields |
| FR-1.5 | `CLAUDE.md` template | Structured template: Who I Am, What I Know, Available Skills, Workflow, Boundaries |
| FR-1.6 | `.github/workflows/validate.yml` | CI: validate construct.yaml against schema, check skill structure (every skill has `index.yaml` + `SKILL.md`), check capabilities stanza present, shell lint for `scripts/` |
| FR-1.7 | `CONTRIBUTING.md` | Construct authoring guide: how to write persona/expertise, how to structure skills, how to test locally |
| FR-1.8 | `scripts/install.sh` | Example post-install hook |
| FR-1.9 | `README.md` | What this construct does, install instructions (git + registry), quick start |
| FR-1.10 | GitHub template flag | Repo created with `--template` flag so users can "Use this template" |

**Schema reference**: `.claude/schemas/construct.schema.json` (schema_version >=3, slug pattern `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, semver pattern, additionalProperties: false)

### FR-2: Per-Construct Extraction

For each of the 5 constructs, create a standalone GitHub repo. All steps repeat per construct.

| ID | Requirement | Detail |
|----|------------|--------|
| FR-2.0 | License & provenance audit | Before making repo public: verify all copied files (skills, contexts, templates, scripts) are MIT-compatible. Check for third-party text, copied schemas, brand assets. Confirm `LICENSE` file and attributions are correct. If any construct cannot be public immediately, create as `--private` with a follow-up task to remediate |
| FR-2.1 | Create GitHub repo | `gh repo create 0xHoneyJar/construct-{slug} --public --template 0xHoneyJar/construct-template` (or `--private` if FR-2.0 flags issues) |
| FR-2.2 | Generate `construct.yaml` | Transform `manifest.json` → `construct.yaml` using the field mapping table below. Add `repository.url`, `identity.persona`, `identity.expertise`. Schema is `additionalProperties: false` — only mapped fields are allowed |
| FR-2.3 | Copy skills directory | All skill directories with `index.yaml` + `SKILL.md` + supporting files |
| FR-2.4 | Copy commands directory | `.md` command files (GTM Collective: 14 commands) |
| FR-2.5 | Copy contexts directory | Domain knowledge files (Observer: `base/` + `overlays/`, Crucible: `schemas/` + `overlays/`, Beacon: `schemas/` + `overlays/`) |
| FR-2.6 | Copy templates directory | Document templates (Observer: canvas + journey, Crucible: gap + reality) |
| FR-2.7 | Copy scripts directory | Install hooks, context composition (Observer: `compose-context.sh`) |
| FR-2.8 | Author `identity/persona.yaml` (skeleton) | Ship schema-valid skeleton with archetype, disposition, and placeholder voice. Mark as `status: draft` in file header. Full character refinement is a **separate follow-up task** — do NOT block extraction on identity quality |
| FR-2.9 | Author `identity/expertise.yaml` (skeleton) | Ship schema-valid skeleton with domain names, depth levels (estimated), and placeholder boundaries. Mark as `status: draft`. Refinement is a separate follow-up |
| FR-2.10 | Author `CLAUDE.md` (skeleton) | Ship functional CLAUDE.md with skill table, basic workflow, and boundaries. Identity sections (Who I Am, What I Know) use skeleton data. Mark as `status: draft`. Full expert voice refinement is a separate follow-up |
| FR-2.11 | Set up CI | `validate.yml` from template (schema validation, skill structure checks) |
| FR-2.12 | Register with API | `POST /v1/packs/{slug}/register-repo` with git URL + ref |
| FR-2.13 | Trigger initial sync | `POST /v1/packs/{slug}/sync` — verifies files, identity, and manifest |
| FR-2.14 | Configure webhook | GitHub webhook on repo → `api.constructs.network/v1/webhooks/github` (push + tag events, HMAC SHA256) |

#### Construct Inventory

| Construct | Slug | Skills | Commands | Contexts | Templates | Dependencies | Version |
|-----------|------|--------|----------|----------|-----------|--------------|---------|
| Observer | `observer` | 6 | 0 | `base/crypto-base.md`, `overlays/berachain-overlay.md`, `overlays/defi-overlay.md` | canvas, journey | Soft: crucible, artisan | 1.1.0 |
| Crucible | `crucible` | 5 | 0 | `schemas/`, `overlays/` | gap, reality | **Required**: observer (change to optional) | 1.1.0 |
| Artisan | `artisan` | 14 | 0 | `taste/` | None | Independent | 1.4.0 |
| Beacon | `beacon` | 6 | 0 | `schemas/`, `overlays/` | None | Independent | 1.1.0 |
| GTM Collective | `gtm-collective` | 8 | 14 | None | None | Independent | 1.1.0 |

#### manifest.json → construct.yaml Field Mapping

| manifest.json Field | construct.yaml Field | Action |
|---------------------|---------------------|--------|
| `schema_version` | `schema_version` | Direct map (keep value 3) |
| `name` | `name` | Direct map |
| `slug` | `slug` | Direct map |
| `version` | `version` | Direct map |
| `description` | `description` | Direct map |
| `author` | `author` | Direct map (string or object) |
| `license` | `license` | Direct map |
| `skills[]` | `skills[]` | Direct map (array of `{slug, path}`) |
| `commands[]` | `commands[]` | Direct map (array of `{name, path}`) |
| `events.emits[]` | `events.emits[]` | Direct map |
| `events.consumes[]` | `events.consumes[]` | Direct map |
| `pack_dependencies[]` | `pack_dependencies[]` | Direct map; change Crucible's Observer from `required: true` → omit (defaults to optional) |
| `hooks` | `hooks` | Direct map (`post_install`, `post_update` paths) |
| `quick_start` | `quick_start` | Direct map (`command`, `description`) |
| N/A | `repository` | **NEW**: Add `{url: "https://github.com/0xHoneyJar/construct-{slug}.git"}` |
| N/A | `identity` | **NEW**: Add `{persona: "identity/persona.yaml", expertise: "identity/expertise.yaml"}` |
| `tools` | — | **DROP**: Not in construct schema. Tool dependencies are documented in skill `index.yaml` capabilities |
| `mcp_dependencies` | — | **DROP**: MCP servers are network-level, not pack-level (already removed from schema) |

The construct schema enforces `additionalProperties: false` — any unmapped field will cause validation failure. All dropped fields (`tools`, `mcp_dependencies`) are either documented elsewhere (skill capabilities) or architecturally removed.

#### Identity Archetypes (Skeleton — User Refines)

| Construct | Archetype | Core Trait | 1-Line Identity |
|-----------|-----------|------------|-----------------|
| Observer | Researcher | Hypothesis-first, empathetic | "I hear what users mean, not what they say." |
| Crucible | Validator | Rigorous, evidence-based | "I don't trust your journey until I've walked it myself." |
| Artisan | Craftsman | Detail-obsessed, aesthetic | "I see the pixel you missed and the motion you haven't imagined." |
| Beacon | Signal Engineer | Standards-focused, methodical | "I make your content discoverable by machines that pay for knowledge." |
| GTM Collective | Strategist | Market-aware, decisive | "I turn products into positions and positions into launches." |

#### Git Ref Strategy

For this internal milestone cycle, all constructs are registered to the `main` branch (not tags):

- **Register**: `POST /v1/packs/{slug}/register-repo` with `git_ref: "main"`
- **Webhook behavior**: Pushes to `main` trigger auto-sync (default branch detection in webhook handler). Tag events also trigger sync for future semver releases
- **Seed script**: `GIT_CONFIGS` entries use `gitRef: 'main'` during extraction. After stabilization, switch to immutable semver tags (e.g., `v1.2.0`) for production installs
- **Verification**: After each push, confirm `POST /v1/packs/{slug}/sync` returns the new commit SHA and `constructs-install.sh install {slug}` pulls that SHA

This means during extraction, every push to `main` auto-updates the registry. Future cycles can adopt tag-based releases with `gitRef` pointing to specific versions.

#### Extraction Order

1. **GTM Collective** (independent, most commands, good stress test)
2. **Artisan** (independent, largest at 14 skills)
3. **Beacon** (independent, has context schemas)
4. **Observer** (soft dependencies, richest context layer)
5. **Crucible** (requires Observer — change to optional, last to extract)

#### Dependency Resolution

**Install order**: Independent constructs first, then dependent. The extraction order (GTM→Artisan→Beacon→Observer→Crucible) respects this. The install script does NOT enforce install order — each construct must be functional standalone.

**Degraded mode when dependencies are missing**:
- If a construct declares `pack_dependencies` with `required: false` (or omitted), it MUST function without the dependency. Missing dependency means: events it consumes are never delivered, but no errors.
- If a construct declares `pack_dependencies` with `required: true`, the install script warns but does NOT block installation. The construct's CLAUDE.md should document what features are unavailable without the dependency.

**Runtime event wiring**: Events are declarations, not imports. Each repo declares what it emits/consumes in `construct.yaml`. The runtime (Claude Code) wires them if both constructs are installed in the same project. If a consumer is installed without its producer, consumed events simply never fire — no errors, no crashes, just reduced functionality.

**Version constraints**: Not enforced for this internal milestone. All constructs are on `main` branch. Future cycles may add semver range constraints to `pack_dependencies`.

**Compatibility testing**: Observer and Crucible must each be tested in 3 configurations:
1. Installed alone (no counterpart) — verify no errors, degraded features documented
2. Installed together — verify bidirectional events work
3. Installed with all 5 constructs — verify no conflicts

#### Circular Dependency Resolution

Observer ↔ Crucible have bidirectional event coupling:
- Observer emits `forge.observer.journey_shaped` → Crucible consumes
- Crucible emits `forge.crucible.journey_validated` → Observer consumes
- Crucible currently marks Observer as `required: true`

**Resolution**: Events are declarations, not imports. Each repo declares what it emits/consumes. The runtime wires them if both constructs are installed. Change Crucible's Observer dependency to `required: false` — Crucible can operate standalone, it just won't receive auto-generated journeys from Observer.

### FR-3: CLAUDE.md Auto-Inject

When a construct is installed, its CLAUDE.md should be automatically imported into the project's Claude Code context.

| ID | Requirement | Detail |
|----|------------|--------|
| FR-3.1 | `inject_construct_claude_md()` function | New function in `constructs-install.sh`. After symlink creation, checks if construct has `CLAUDE.md` at `.claude/constructs/packs/{slug}/CLAUDE.md` |
| FR-3.2 | Handle missing root CLAUDE.md | If project's root `CLAUDE.md` does not exist: create it with the Loa import line (if Loa is installed, i.e. `.claude/loa/CLAUDE.loa.md` exists) followed by the construct imports block. If CLAUDE.md is a symlink or not writable: fail with actionable error message and do NOT partially modify |
| FR-3.3 | Managed sentinel block | All construct imports live inside a clearly delimited block: `<!-- constructs:begin -->` / `<!-- constructs:end -->`. Only mutate within this block. Block is placed BELOW the Loa framework import (`@.claude/loa/CLAUDE.loa.md`). If the block doesn't exist, create it |
| FR-3.4 | Append `@` import within block | Adds `@.claude/constructs/packs/{slug}/CLAUDE.md` inside the sentinel block |
| FR-3.5 | Multiple constructs | Handle multiple `@` imports (one per installed construct). Each on its own line within the sentinel block |
| FR-3.6 | Idempotent | Don't duplicate the import if already present within the block |
| FR-3.7 | Uninstall removal | On construct uninstall, remove the corresponding `@` import line from within the sentinel block. Also record injected imports in `.constructs-meta.json` so uninstall is deterministic even if CLAUDE.md is manually edited |
| FR-3.8 | Atomic writes | Write to temp file + `mv` to prevent partial writes on failure |
| FR-3.9 | No conflict with Loa | Must not modify or remove the existing `@.claude/loa/CLAUDE.loa.md` import or any content outside the sentinel block |
| FR-3.10 | Concurrency safety | If two construct installs run simultaneously, use a lockfile (`.constructs-inject.lock`) to serialize CLAUDE.md mutations. Fail with retry message if lock is held >10s |
| FR-3.11 | Malformed sentinel recovery | If sentinel block markers are present but malformed (partial, duplicated, or nested), fail with actionable error identifying the problem. Do NOT attempt repair — prompt user to manually fix |
| FR-3.12 | Line ending normalization | Normalize CLAUDE.md to LF before mutation. Preserve original line endings on write if file was CRLF |
| FR-3.13 | Managed file fallback | If sentinel block injection fails for any reason (malformed block, unwritable file, symlink, concurrent lock timeout), fall back to generating `.claude/constructs/CLAUDE.constructs.md` containing all construct `@` imports. Print a message instructing the user to add `@.claude/constructs/CLAUDE.constructs.md` to their root CLAUDE.md. This ensures construct activation even when auto-injection cannot safely proceed |

#### CLAUDE.md Structure Per Construct

```markdown
# {Construct Name}
> {One-line identity from persona.yaml}

## Who I Am
{Archetype, thinking style, voice — synthesized from persona.yaml}

## What I Know
{Domains with depth levels — from expertise.yaml}
{Explicit boundaries — what I do NOT know}

## Available Skills
| Command | Purpose |
|---------|---------|
{Table of all skills with trigger descriptions}

## Workflow
{The construct's natural sequence of operations}

## Boundaries
{What this expert does NOT do — prevents scope creep}
```

### FR-4: Monorepo Cleanup

After all 5 constructs are verified working from standalone repos.

| ID | Requirement | Detail |
|----|------------|--------|
| FR-4.1 | Update seed script | Add all 5 repos to `GIT_CONFIGS` in `scripts/seed-forge-packs.ts` (currently only `gtm-collective` at L36-44) |
| FR-4.2 | Delete sandbox packs | Remove `apps/sandbox/packs/{observer,crucible,artisan,beacon,gtm-collective}` |
| FR-4.3 | Update sandbox README | Point `apps/sandbox/packs/README.md` to standalone repos |
| FR-4.4 | Update CI | Remove `apps/sandbox/packs/` from `validate-topology.yml` scan paths |
| FR-4.5 | Clean SYNC_ARCHITECTURE_PLAN.md | Archive or update to reflect completed state |
| FR-4.6 | Explorer frontend | Link to GitHub repo on construct detail pages when `sourceType === 'git'` |

## 6. Technical Architecture

### Infrastructure (Already Built — PR #121)

| Component | File | Status |
|-----------|------|--------|
| Git-sync service | `apps/api/src/services/git-sync.ts` | Deployed |
| Register-repo endpoint | `apps/api/src/routes/packs.ts:L764` | Deployed |
| Sync endpoint | `apps/api/src/routes/packs.ts:L879` | Deployed |
| GitHub webhook handler | `apps/api/src/routes/webhooks.ts:L376` | Deployed |
| Install script (git path) | `.claude/scripts/constructs-install.sh:L745` | Deployed |
| Construct schema | `.claude/schemas/construct.schema.json` | In repo |
| Identity DB table | `constructIdentities` in `apps/api/src/db/schema.ts` | Migrated |

### Prerequisite Code Changes

Two changes to `apps/api/src/services/git-sync.ts:collectFiles()` are required **before** extraction begins:

**1. Add `templates` to allowed directories**

The git-sync service allows only: `skills`, `commands`, `contexts`, `identity`, `scripts`. The `templates/` directory is **not** in the allowlist, but Observer and Crucible have `templates/` with canvas, journey, gap, and reality templates. Without this change, sync will silently drop template files, producing incomplete installs.

**2. Add `CLAUDE.md` to allowed root files**

The allowed root files are: `construct.yaml`, `manifest.json`, `README.md`, `LICENSE`. `CLAUDE.md` is **not** in this list. The entire FR-3 feature depends on CLAUDE.md being present in the synced construct directory. The git clone install path gets all files, but the API sync endpoint (and base64 fallback) use `collectFiles()` which would skip CLAUDE.md — a silent failure that breaks the core "expert not file bundle" vision.

**Verification**: After both changes, run `POST /v1/packs/{slug}/sync` and confirm the response includes files from `templates/` and the root `CLAUDE.md`.

### Git-Sync Security Model

| Protection | Implementation |
|------------|---------------|
| HTTPS only | `validateGitUrl()` rejects HTTP, SSH, `git://` |
| DNS pinning (TOCTOU-safe) | Local CONNECT proxy pins resolved IP; prevents DNS rebinding between validation and clone |
| SSRF prevention | Private IP ranges blocked (10.x, 172.16-31.x, 192.168.x, 127.x, etc.) |
| No symlinks | `lstat()` check on every file in cloned tree |
| No path traversal | Rejects `..` segments, absolute paths, paths >255 chars |
| Shallow clone | `--depth 1 --single-branch`, 30s timeout |
| No interactive prompts | `GIT_TERMINAL_PROMPT=0` |
| Webhook signature | HMAC SHA256 with `timingSafeEqual`, replay protection via delivery ID tracking |
| Rate limiting | 10 syncs per pack per hour |

### File Collection Limits

| Limit | Value |
|-------|-------|
| Max files per sync | 100 |
| Max file size | 256 KB |
| Max total payload | 5 MB |
| Allowed directories | `skills`, `commands`, `contexts`, `identity`, `scripts`, `templates` (prerequisite change) |
| Allowed root files | `construct.yaml`, `manifest.json`, `README.md`, `LICENSE`, `CLAUDE.md` (prerequisite change) |

### Identity Parsing Flow

```
construct repo
  └── identity/
      ├── persona.yaml → parsed by git-sync.ts:parseIdentity()
      └── expertise.yaml → parsed by git-sync.ts:parseIdentity()
                │
                ▼
        IdentityData {
          archetype, disposition, thinking_style, decision_making,
          voice, model_preferences, expertise_domains
        }
                │
                ▼
        constructIdentities table (upserted on sync/webhook)
                │
                ▼
        GET /v1/packs/:slug → identity data in response
                │
                ▼
        Explorer construct detail page → identity card
```

### Install Flow (After Extraction)

```
constructs-install.sh install {slug}
  │
  ├─ GET /v1/packs/{slug}/download
  │    → response includes source_type: "git", git_url, git_ref
  │
  ├─ git clone --depth 1 --branch {git_ref} {git_url}
  │    → .claude/constructs/packs/{slug}/
  │    → remove .git/ directory
  │    → validate tree (no symlinks, no traversal)
  │    → fallback to base64 download on clone failure
  │
  ├─ symlink_pack_skills()
  │    → .claude/skills/{skill-name} → ../constructs/packs/{slug}/skills/{skill-name}
  │
  ├─ symlink_pack_commands()
  │    → .claude/commands/{cmd}.md → ../constructs/packs/{slug}/commands/{cmd}.md
  │
  ├─ inject_construct_claude_md()      ← NEW
  │    → append @.claude/constructs/packs/{slug}/CLAUDE.md to project CLAUDE.md
  │
  └─ update_pack_meta()
       → .constructs-meta.json with source_type, git_url, git_commit
```

### Seed Script Migration

```typescript
// scripts/seed-forge-packs.ts — current (L36-44)
const GIT_CONFIGS: Record<string, { gitUrl: string; gitRef: string }> = {
  'gtm-collective': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-gtm-collective.git',
    gitRef: 'v1.1.0',
  },
};

// After extraction — all 5 repos (main branch for internal milestone)
const GIT_CONFIGS: Record<string, { gitUrl: string; gitRef: string }> = {
  'gtm-collective': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-gtm-collective.git',
    gitRef: 'main',
  },
  'artisan': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-artisan.git',
    gitRef: 'main',
  },
  'beacon': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-beacon.git',
    gitRef: 'main',
  },
  'observer': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-observer.git',
    gitRef: 'main',
  },
  'crucible': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-crucible.git',
    gitRef: 'main',
  },
};
// NOTE: Switch to semver tags (e.g., 'v1.2.0') after stabilization
```

## 7. Scope & Prioritization

### Sprint Structure

| Sprint | Focus | Tasks |
|--------|-------|-------|
| Sprint 1 | Template + First Extraction | FR-1 (template repo), FR-2 for GTM Collective |
| Sprint 2 | Independent Constructs | FR-2 for Artisan + Beacon |
| Sprint 3 | Dependent Constructs | FR-2 for Observer + Crucible (circular dep resolution) |
| Sprint 4 | Integration | FR-3 (CLAUDE.md inject), FR-4 (monorepo cleanup), verification |

### In Scope

- Template repo creation (`construct-template`)
- 5 construct repos with `construct.yaml`, skills, commands, contexts, scripts
- Identity authoring (persona.yaml + expertise.yaml) for all 5
- CLAUDE.md authoring for all 5
- CLAUDE.md auto-inject in install script
- CI validation per repo
- API registration + webhook setup per repo
- Seed script migration to all-git
- Sandbox pack deletion (verified clean migration)

### Out of Scope

| Item | Why Deferred |
|------|-------------|
| Reviews & ratings UI | Marketplace features — separate cycle |
| Author profiles | Marketplace features — separate cycle |
| Enhanced discovery (sort, filter, badges) | Marketplace features — separate cycle |
| Reputation system | Identity & reputation — separate cycle |
| On-chain signals (dNFT, Henlo) | Requires Loa Fin infrastructure |
| Self-service repo registration UI | Marketplace features — third-party publishing cycle |
| Payment integration (NowPayments) | Not active, separate cycle |
| API key rotation / security audit | Public launch preparation — separate cycle |

## 8. Risks & Dependencies

| Risk | Severity | Mitigation |
|------|----------|------------|
| Webhook signature secret must be configured on each new repo | Medium | Document in runbook; verify per-repo during FR-2.14 |
| Identity authoring is collaborative and requires user iteration | Medium | Define archetype skeletons first; user refines asynchronously. Don't block extraction on identity perfection |
| Crucible's `required: true` dependency on Observer may break existing installs | High | Change to `required: false` in construct.yaml. Test Crucible standalone install works without Observer |
| Seed script still reads from sandbox for non-git packs | Low | Migration is atomic: add all 5 to GIT_CONFIGS, then delete sandbox packs |
| CLAUDE.md injection could conflict with Loa framework imports | Medium | FR-3.7 explicitly protects Loa imports. Test with Loa installed |
| 100-file limit in git-sync could be tight for Artisan (14 skills) | Low | Each skill is ~2-3 files. Artisan total: ~42 files + contexts + scripts ≈ 50 files. Well within 100 limit |
| Construct repos are public — pack contents become fully visible | Low | Already MIT-licensed. No secrets in skill files. This is intentional for the open ecosystem |

### Rollback Strategy

If extraction causes production install failures, the following rollback procedure applies:

1. **Pre-deletion archive**: Before FR-4.2 (sandbox pack deletion), create a tagged archive branch `archive/sandbox-packs-pre-extraction` containing the full `apps/sandbox/packs/` tree. This branch persists for 30 days minimum
2. **Health gate before deletion**: FR-4.2 must NOT execute until all 5 construct repos pass a health check: `POST /v1/packs/{slug}/sync` returns 200 with correct file count AND `constructs-install.sh install {slug}` succeeds end-to-end for each
3. **Soak period**: After all 5 repos are registered and synced, maintain a 48-hour soak period where both sandbox packs AND standalone repos are active. Monitor webhook delivery rates, sync error logs, and install success rates
4. **Revert procedure**: If any construct repo becomes unavailable (GitHub outage, accidental deletion, webhook misconfiguration), revert by restoring sandbox packs from the archive branch and updating `GIT_CONFIGS` to remove the affected entry. The base64 fallback path still works as long as the API has synced data
5. **Base64 fallback verification**: Before FR-4.2, explicitly test the base64 download fallback by temporarily blocking git clone for one construct and verifying the install script falls back successfully

### Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| Git-sync service (PR #121) | Deployed | None — fully operational |
| Register-repo endpoint | Deployed | None |
| Webhook handler | Deployed | None |
| Install script git path | Deployed | None |
| `construct.schema.json` | In repo | None |
| GitHub org (`0xHoneyJar`) | Active | Need repo creation permissions |
| Webhook secret | Configured on API | Must be added to each new repo's webhook settings |

## 9. Critical Files

| File | Role | Action |
|------|------|--------|
| `apps/sandbox/packs/{slug}/manifest.json` | Source data for each pack | Transform to construct.yaml, then delete |
| `.claude/schemas/construct.schema.json` | Validates construct.yaml | Copy to template repo for CI |
| `apps/api/src/services/git-sync.ts` | Clone + parse + validate | No changes needed |
| `apps/api/src/routes/packs.ts` (L764, L879) | register-repo + sync endpoints | No changes needed |
| `apps/api/src/routes/webhooks.ts` (L376) | Webhook auto-sync handler | No changes needed |
| `.claude/scripts/constructs-install.sh` (L745) | Install with git fallback | Add `inject_construct_claude_md()` (FR-3) |
| `scripts/seed-forge-packs.ts` (L36-44) | GIT_CONFIGS map | Add all 5 repo entries (FR-4.1) |
| `apps/sandbox/packs/crucible/manifest.json` | Crucible pack_dependencies | Change Observer `required: true` → `false` |

## 10. Verification

### Per-Construct (After Each FR-2)

1. `gh repo view 0xHoneyJar/construct-{slug}` — repo exists with correct structure
2. `construct.yaml` passes schema validation against `construct.schema.json`
3. CI (`validate.yml`) passes on the repo
4. API `POST /v1/packs/{slug}/register-repo` succeeds
5. API `POST /v1/packs/{slug}/sync` succeeds — returns files, identity data
6. Push a commit → webhook fires → auto-sync updates registry
7. `constructs-install.sh install {slug}` clones from git, creates symlinks

### CLAUDE.md Injection (After FR-3)

1. **No CLAUDE.md exists**: Install a construct in a project with no root `CLAUDE.md` — verify file is created with Loa import (if Loa installed) + sentinel block + construct import
2. **Existing CLAUDE.md**: Install a construct — verify `@.claude/constructs/packs/{slug}/CLAUDE.md` appears inside `<!-- constructs:begin -->` / `<!-- constructs:end -->` sentinel block
3. **Import ordering**: Verify sentinel block is below Loa framework import
4. **Multiple constructs**: Install a second construct — verify both imports present within sentinel block, no duplicates
5. **Idempotent**: Re-install same construct — verify no duplicate import line
6. **Uninstall**: Uninstall first construct — verify its import removed from sentinel block, second remains
7. **Loa safety**: Verify Loa framework import and all content outside sentinel block untouched throughout
8. **Metadata**: Verify `.constructs-meta.json` records injected CLAUDE.md imports
9. **Symlink/unwritable**: Attempt install when CLAUDE.md is a symlink — verify actionable error, no partial modification
10. **After push**: Push a commit to construct repo, confirm sync returns new SHA, re-install pulls updated content

### Final Acceptance (After FR-4)

1. All 5 construct repos exist and pass CI
2. All 5 have identity files (persona.yaml + expertise.yaml)
3. All 5 have CLAUDE.md with expert operating instructions
4. Seed script uses `GIT_CONFIGS` for all 5 packs
5. `apps/sandbox/packs/` contains only README.md (no pack subdirectories)
6. `pnpm --filter api build` succeeds
7. Validate-topology CI passes
8. Explorer shows GitHub repo link on construct detail pages for `sourceType === 'git'`
