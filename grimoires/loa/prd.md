# PRD: Construct Lifecycle — construct-network-tools Pack

**Cycle**: cycle-032
**Created**: 2026-02-20
**Status**: Draft
**Source Issue**: [#131](https://github.com/0xHoneyJar/loa-constructs/issues/131) — Construct Lifecycle RFC
**Grounded in**: Issue #131 (5-agent research), Gemini Deep Research, team feedback, Bridgebuilder archetype
**Research artifacts**:
- `grimoires/bridgebuilder/construct-lifecycle-design.md` — Synthesized 4-agent team research
- `grimoires/bridgebuilder/gemini-construct-lifecycle-research.md` — Cross-platform DX patterns
- `grimoires/bridgebuilder/ARCHETYPE.md` — Design philosophy

---

## 1. Problem Statement

The construct lifecycle is one-directional today: author → seed/sync → DB → explorer → install. Once installed, constructs are frozen. There is no way to:

1. **Develop locally** with live-reload against a construct repo (no `npm link` equivalent)
2. **Detect divergence** between installed constructs and registry versions
3. **Push customizations** back upstream or publish as variants
4. **Scaffold new constructs** from templates with proper structure
5. **Upgrade safely** when local modifications exist (no 3-way merge)

This creates a dead end for construct authors and consumers alike. The canonical case: midi-interface evolved Observer from 6 skills (registry v1.0.2) to 23 skills locally. A registry update would destroy the 17 local additions. There is no mechanism to detect, diff, upstream, or merge.

Additionally, the manifest schema only supports one construct archetype (code packs). Two other archetypes exist in the wild:
- **Tool Packs** (The Mint, The Cartograph) — skills + Python tools + external API dependencies
- **Knowledge Bases** (mibera-codex) — 10K+ markdown files with structured ontology

Neither can be represented on the network today.

> Evidence: Issue #131 RFC with 4 research comments
> Evidence: midi-interface Observer fork (6→23 skills, no manifest.json)
> Evidence: hub-interface contains 3 unregistered constructs (The Easel, The Mint, The Cartograph)
> Evidence: mibera-codex has 12,872 files with no construct type for knowledge bases

---

## 2. Vision

**Every construct lifecycle operation happens through natural language.** "Link my local Observer" triggers a skill. The skill calls shell scripts. Scripts call the API. The user just talks.

The construct-network-tools pack ships via the network itself — installable through the existing `/constructs` bootstrap. It transforms the Constructs Network from a download-only marketplace into a full bidirectional development platform.

### Design Principles (from Bridgebuilder archetype)

| Principle | Application |
|-----------|------------|
| **Fun First, System Second** | First `construct create` produces a working construct in <2 minutes |
| **Progressive Disclosure** | Start with link/sync, discover publish/create as you grow |
| **Flow State is Sacred** | All operations inline in CLI — never leave the terminal |
| **Open Beats Closed** | Multi-runtime, no gatekeepers, portable constructs |
| **Zero-Friction Bar** | Install <10s, first use <2min, update = one command |

---

## 3. Goals & Success Metrics

### Primary Goals

| Goal | Metric | Target |
|------|--------|--------|
| G1: Enable local construct development | Time from "I want to edit Observer" to live-linked dev | < 30 seconds |
| G2: Enable divergence detection | Can detect 17-skill fork drift in Observer | 100% accuracy |
| G3: Enable publishing from CLI | Time from "publish my construct" to live on registry | < 2 minutes |
| G4: Support all 3 archetypes | skill-pack, tool-pack, codex all representable | Schema + examples |
| G5: Enable construct scaffolding | Time from "create a new construct" to git repo with manifest | < 1 minute |
| G6: Enable safe upgrades | 3-way merge preserves local modifications | Zero data loss |

### Secondary Goals

| Goal | Metric | Target |
|------|--------|--------|
| G7: Onboard 4 unregistered constructs | Observer variant, The Easel, The Mint, mibera-codex | 4 on network |
| G8: Reconcile schema drift | TypeScript, Zod, JSON Schema, live YAMLs all in sync | 0 drift |
| G9: Stealth-mode .construct/ | Tooling state invisible by default | Always gitignored |

---

## 4. User Stories

### US-1: Local Development (Linking)

**As a** construct author,
**I want to** link my local construct repo for live development,
**So that** changes I make are immediately available without reinstalling.

**Acceptance Criteria**:
- [ ] `constructs-link.sh <path>` creates symlink and preserves shadow copy
- [ ] Registry version preserved in `.construct/shadow/<slug>/`
- [ ] `constructs-link.sh --unlink <slug>` restores registry version
- [ ] `.construct/state.json` tracks all link metadata
- [ ] Linked construct skills are immediately discoverable by runtime

### US-2: Divergence Detection (Syncing)

**As a** construct consumer who has customized an installed construct,
**I want to** see what's different between my local version and the registry,
**So that** I can decide whether to upstream, fork, or merge.

**Acceptance Criteria**:
- [ ] `constructs-diff.sh <slug>` compares local vs shadow via Merkle hashing
- [ ] Root hash comparison is O(1) for unchanged constructs
- [ ] File-level diff shows added/modified/deleted with skill-level summary
- [ ] User presented with choices: upstream, maintain as variant, discard, ignore
- [ ] JSON output mode (`--json`) for script consumption

### US-3: Publishing

**As a** construct author,
**I want to** publish my construct to the registry,
**So that** others can install and use it.

**Acceptance Criteria**:
- [ ] `constructs-publish.sh --validate` checks manifest, capabilities, event schemas
- [ ] `constructs-publish.sh --push` packages and publishes to registry API
- [ ] Permission check: maintainers can upstream directly, others offered fork
- [ ] Fork publishing creates scoped variant (`@scope/name`)
- [ ] Version bump prompt (patch/minor/major) with confirmation
- [ ] `--dry-run` flag shows what would be published without pushing

### US-4: Scaffolding (Creating)

**As a** new construct author,
**I want to** scaffold a construct from a template,
**So that** I start with the correct structure and stealth-mode defaults.

**Acceptance Criteria**:
- [ ] `constructs-create.sh --name X --type Y` scaffolds complete construct
- [ ] Supports 3 types: skill-pack, tool-pack, codex
- [ ] Generates `construct.yaml` manifest with correct type-specific fields
- [ ] `.gitignore` includes stealth-mode defaults (`.construct/`, `.ck/`, `.beads/`)
- [ ] Optional starter skill with index.yaml + SKILL.md templates
- [ ] Git repo initialized with initial commit
- [ ] `--init` mode for adding construct to existing directory

### US-5: Safe Upgrades

**As a** construct consumer with local modifications,
**I want to** upgrade to the latest registry version without losing my changes,
**So that** I get improvements while keeping my customizations.

**Acceptance Criteria**:
- [ ] `constructs-install.sh upgrade <slug>` performs 3-way merge
- [ ] Base = shadow (what was installed), Local = current, Remote = new version
- [ ] Auto-merge for non-conflicting changes (only-local, only-remote, both-compatible)
- [ ] Conflicts presented individually with keep-local/accept-remote/manual options
- [ ] Shadow copy updated to new version after successful upgrade
- [ ] `--check` flag shows available updates without installing

### US-6: Multi-Archetype Schema

**As a** construct author building a tool pack or knowledge base,
**I want to** declare my construct's type, runtime requirements, and access layer,
**So that** the registry and runtime handle my construct correctly.

**Acceptance Criteria**:
- [ ] `type` field: `'skill-pack' | 'tool-pack' | 'codex' | 'template'`
- [ ] `runtime_requirements` field: runtime version, pip/npm deps, external tools
- [ ] `credentials` field: declare required env vars without storing values
- [ ] `access_layer` field: MCP server config for codex-type constructs
- [ ] `paths` field: logical aliases (`@state/`, `@cache/`, `@output/`)
- [ ] `portability_score` field: 0.0-1.0 reusability indicator
- [ ] All new fields optional — existing manifests unchanged

---

## 5. Functional Requirements

### FR-1: Manifest v2 Schema Extension

Add 7 new optional fields to PackManifest across 3 schema layers (TypeScript, Zod, JSON Schema):

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `type` | enum | `'skill-pack'` | Archetype declaration |
| `runtime_requirements` | object | — | OS/system dependencies |
| `paths` | object | — | Logical path aliases |
| `credentials` | array | — | Declare-don't-store env vars |
| `access_layer` | object | — | MCP/filesystem/API access for codex |
| `portability_score` | number | — | 0.0-1.0 reusability |
| `identity` / `hooks` / `pack_dependencies` | various | — | Reconcile existing drift |

**Naming rationale**: `runtime_requirements` (not `capabilities`) avoids collision with per-skill capabilities stanza (model_tier, danger_level).

**Schema version strategy**: Do NOT bump `schema_version` to 4. All additions are optional and additive. Bump only for breaking changes.

> Source: schema-architect research, packages/shared/src/types.ts:219, packages/shared/src/validation.ts:261

### FR-2: .construct/ Shadow Directory

Every project using constructs gets a `.construct/` directory (always gitignored):

```
.construct/
├── state.json              # Links, shadow metadata, timestamps
├── shadow/                 # Pristine registry copies for diffing
│   └── <slug>/
│       ├── .hash           # Merkle root hash
│       └── skills/...      # Full extracted copy
├── links/                  # Symlinks to local dev repos
│   └── <slug> -> /abs/path/
└── cache/                  # Computed data (safe to delete)
```

**state.json schema**:
```json
{
  "schema_version": 1,
  "links": {
    "<slug>": { "path": "/abs/path", "linked_at": "...", "last_checked": "..." }
  },
  "shadow": {
    "<slug>": { "version": "1.0.2", "root_hash": "sha256:...", "file_count": 42 }
  },
  "last_updated": "..."
}
```

> Source: infra-planner research, Gemini research (Roblox PackageLink, Vercel .vercel/)

### FR-3: Shell Scripts (4 new)

| Script | Purpose | Exit Codes |
|--------|---------|-----------|
| `constructs-link.sh` | Link/unlink/list/status | 0=ok, 1=validation, 2=exists, 3=not-found |
| `constructs-diff.sh` | Merkle hash divergence detection | 0=same, 1=diverged, 2=not-found, 3=no-shadow |
| `constructs-publish.sh` | Validate/push/dry-run/fork | 0=ok, 1=validation, 2=auth, 3=permission, 4=network, 5=conflict |
| `constructs-create.sh` | Scaffold from template | 0=ok, 1=validation, 2=template-fail, 3=dir-exists |

All scripts source `constructs-lib.sh` for security (path traversal protection, input validation, TLS enforcement).

> Source: infra-planner research, existing constructs-install.sh patterns

### FR-4: API Endpoints (5 new)

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/v1/packs/:slug/hash` | GET | Merkle root hash for O(1) divergence check | Optional |
| `/v1/packs/fork` | POST | Create scoped fork | Required |
| `/v1/constructs/register` | POST | Reserve construct slug | Required |
| `/v1/webhooks/configure` | POST | Webhook setup instructions | Required |
| `/v1/packs/:slug/permissions` | GET | Check maintainer status | Required |

> Source: infra-planner research, apps/api/src/routes/packs.ts

### FR-5: Lifecycle Skills (5 new)

| Skill | Danger Level | Pattern |
|-------|-------------|---------|
| `linking-constructs` | moderate | Symlink + shadow preservation |
| `syncing-constructs` | moderate | Merkle hash → upstream/variant/discard/ignore |
| `publishing-constructs` | **high** | Validate → permission → version → confirm → push |
| `creating-constructs` | safe | Template scaffold + type wizard |
| `upgrading-constructs` | moderate | 3-way merge with conflict resolution |

Each skill has SKILL.md (200-400 lines) + index.yaml with capabilities stanza. All follow the browsing-constructs pattern: AskUserQuestion interactions, error handling tables, Three-Zone compliance.

> Source: skill-designer research, .claude/skills/browsing-constructs/

### FR-6: Pack Structure

```
construct-network-tools/
├── construct.yaml              # Pack manifest
├── skills/
│   ├── browsing-constructs/    # MOVE from Loa core
│   ├── finding-constructs/     # EXISTS in loa-constructs
│   ├── linking-constructs/     # NEW
│   ├── syncing-constructs/     # NEW
│   ├── publishing-constructs/  # NEW
│   ├── creating-constructs/    # NEW
│   └── upgrading-constructs/   # NEW
├── commands/                   # Slash command routing
└── scripts/                    # Shell scripts (existing + 4 new)
```

**Bootstrap strategy**: Core `browsing-constructs` stays in Loa as bootstrap seed. Full `construct-network-tools` pack is installable via `/constructs install construct-network-tools`.

---

## 6. Technical Requirements

### TR-1: Schema Layers Must Stay In Sync

Three layers must be updated atomically:
1. TypeScript interface (`packages/shared/src/types.ts`)
2. Zod schema (`packages/shared/src/validation.ts`)
3. JSON Schema (`schemas/pack-manifest.schema.json`, `schemas/construct.schema.json`)

CI validation (`scripts/validate-topology.sh`) must verify sync.

### TR-2: Backward Compatibility

- All new manifest fields optional
- No `schema_version` bump
- Existing manifests pass validation without modification
- `.passthrough()` on Zod already handles unknown fields

### TR-3: Security

- All scripts source `constructs-lib.sh` (path traversal, TLS, input validation)
- `.construct/` always gitignored (prevents credential/state leaks)
- Publishing requires authentication (`requireAuth()` middleware)
- Rate limiting: publish 10/hour, register 5/24h
- Fork creation requires email verification
- No post-install script execution (Deno-style consent model)

### TR-4: Performance

- Merkle root hash comparison: O(1) for unchanged constructs
- Full file diff: O(n) for changed constructs (n = file count)
- Shadow copy enables offline diffing (no network needed for local comparison)
- Scaffold creation: <5 seconds (local template, no network)

---

## 7. Scope

### In Scope (MVP)

- Manifest v2 schema extension (7 new fields)
- Schema drift reconciliation (identity, hooks, pack_dependencies)
- `.construct/` directory structure + state.json
- 4 new shell scripts (link, diff, publish, create)
- 5 new API endpoints (hash, fork, register, webhooks/configure, permissions)
- 5 new lifecycle skills (link, sync, publish, create, upgrade)
- construct-network-tools pack structure
- Migration plan for 4 unregistered constructs

### Out of Scope (Future)

- Explorer UI changes for multi-archetype display
- MCP server implementation for mibera-codex (design only this cycle)
- Automated portability score computation
- Cross-construct event bus runtime
- Webhook auto-configuration via GitHub API (provide instructions only)
- Version pinning / lock files
- Construct dependency resolution (beyond manifest declaration)
- Vendoring mode (committed tarballs for offline use)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Schema drift re-introduced by future cycles | Medium | High | CI validation check, 3-layer sync test |
| Symlink behavior differs across OS (macOS vs Linux) | Low | Medium | Test on both, document OS-specific behavior |
| 3-way merge produces incorrect results | Medium | High | Conservative: only auto-merge when safe, prompt user for all ambiguous cases |
| Merkle hash nondeterminism (encoding, line endings) | Low | Medium | Normalize files before hashing, document encoding requirements |
| Bootstrap chicken-and-egg (construct-network-tools installs itself) | Low | Low | `browsing-constructs` stays in Loa core as seed |
| Fork name squatting | Medium | Low | Rate limiting (5 registrations/24h), email verification required |

---

## 9. Dependencies

### Internal Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| Cycle A/B schema foundation (PR #130) | Merged | Bridgebuilder fields already in schema |
| `constructs-lib.sh` security helpers | Exists | Shared library for all new scripts |
| `constructs-install.sh` existing patterns | Exists | Extend with `upgrade` subcommand |
| `constructs-browse.sh` / `constructs-auth.sh` | Exists | Reused by new skills |
| `validate-topology.sh` CI check | Exists | Must validate new schema fields |

### External Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| `construct-template` repo | Exists (GitHub) | Clone target for `constructs-create.sh` |
| `yq` v4+ (YAML processing) | Required on dev machines | Used by publish validation |
| `jq` (JSON processing) | Required on dev machines | Used by all new scripts |
| `shasum` (hash computation) | Available on macOS/Linux | Used by Merkle hash computation |

---

## 10. Migration Plan (4 Constructs)

### Phase 1: Immediate (no schema v2 blockers)

| Construct | Archetype | Skills | Effort | Key Action |
|-----------|-----------|--------|--------|-----------|
| Observer (midi-interface) | skill-pack variant | 23 | Small | Register @thj/observer, add 7 missing index.yaml |
| The Easel (hub-interface) | skill-pack | 4 | Small | Extract to construct-the-easel repo |

### Phase 2: After schema v2 lands

| Construct | Archetype | Skills | Effort | Key Action |
|-----------|-----------|--------|--------|-----------|
| The Mint (hub-interface) | tool-pack | 4 + Python | Medium | First tool-pack, declare runtime/credentials |
| Observer upstream | skill-pack | 8 generic | Medium | PR 8 skills to construct-observer v1.1.0 |

### Phase 3: After MCP patterns defined

| Construct | Archetype | Files | Effort | Key Action |
|-----------|-----------|-------|--------|-----------|
| mibera-codex | codex | 12,872 | Large | Build MCP server (18 tools), first codex |

### Deferred: The Cartograph
4 skills (mostly stubs), requires Blender 4.x. Not ready for migration.

> Source: migration-planner research across midi-interface, hub-interface, mibera-codex repos

---

## 11. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| OQ-1 | Scoped naming format? | `@scope/name` vs flat `scope-name` | Flat slugs (`thj-observer`) for MVP — avoids registry complexity. Scoped display in UI. |
| OQ-2 | Webhook auto-configuration? | Direct GitHub API calls vs instructions-only | Instructions-only for MVP — provide URL + secret, user configures manually. |
| OQ-3 | MCP server hosting model? | Local stdio vs remote sse | Local stdio for MVP — simplest, no infra needed. Remote sse as future option. |
| OQ-4 | Portability score source? | Author-declared vs auto-computed | Author-declared with auto-computed suggestion. Override always wins. |
| OQ-5 | Variant lifecycle tracking? | `variant_of` manifest field vs registry metadata | Registry metadata (DB-level) — manifest shouldn't reference other manifests. |

---

## 12. Proposed Sprint Sequence

| Sprint | Label | Deliverables |
|--------|-------|-------------|
| Sprint 1 | Schema + .construct/ Foundation | Manifest v2 fields (TS + Zod + JSON Schema), schema drift reconciliation, .construct/ directory + state.json, constructs-link.sh, linking-constructs skill |
| Sprint 2 | Divergence Detection + Publishing | constructs-diff.sh, constructs-publish.sh, 3 API endpoints (hash, fork, permissions), syncing-constructs + publishing-constructs skills |
| Sprint 3 | Scaffold + Upgrade | constructs-create.sh, constructs-install.sh upgrade, 2 API endpoints (register, webhooks/configure), creating-constructs + upgrading-constructs skills |
| Sprint 4 | Migration Wave 1 | @thj/observer variant registration, construct-the-easel extraction, construct-network-tools pack manifest |
| Sprint 5 | Migration Wave 2 | construct-the-mint extraction (first tool-pack), Observer generic skill upstream, mibera-codex MCP server design |

---

## Next Step

`/architect` — Software Design Document covering manifest schema v2, .construct/ directory, shell scripts, API endpoints, skill-to-script wiring, Merkle-tree divergence detection.
