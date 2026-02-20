# Construct Lifecycle Design — Synthesized Research

> **Status**: Team research complete. Ready for `/plan-and-analyze`.
> **Date**: 2026-02-20
> **Source**: Issue #131 + 4-agent parallel research + Gemini Deep Research
> **Agents**: schema-architect, skill-designer, infra-planner, migration-planner

---

## 1. Manifest v2 Schema — 7 New Fields

All optional, zero breaking changes, no schema_version bump needed.

| Field | Type | Purpose | Archetype |
|-------|------|---------|-----------|
| `type` | `'skill-pack' \| 'tool-pack' \| 'codex' \| 'template'` | Archetype declaration | All |
| `runtime_requirements` | `{ runtime, dependencies, external_tools }` | OS/system deps | tool-pack, codex |
| `paths` | `{ state, cache, output }` | Logical path aliases (`@state/`, `@cache/`) | All |
| `credentials` | `Array<{ name, description, sensitive, optional }>` | Declare-don't-store | tool-pack |
| `access_layer` | `{ type, entrypoint, transport }` | MCP/filesystem/API access | codex |
| `portability_score` | `number (0.0-1.0)` | Reusability indicator | All |
| `identity` / `hooks` / `pack_dependencies` | Various | Reconciled from construct.schema.json | All |

**Pre-existing drift discovered**: `identity`, `hooks`, `pack_dependencies` exist in construct.schema.json and live YAMLs but missing from TypeScript/Zod. The `.passthrough()` has been silently accepting them.

**Field naming**: `runtime_requirements` (not `capabilities`) to avoid collision with per-skill capabilities stanza (model_tier, danger_level).

---

## 2. Five Lifecycle Skills

| Skill | Danger | Key Pattern | Scripts |
|-------|--------|-------------|---------|
| `linking-constructs` | moderate | Symlink + shadow preservation | `constructs-link.sh` |
| `syncing-constructs` | moderate | Merkle hash comparison → upstream/variant/discard/ignore | `constructs-diff.sh` |
| `publishing-constructs` | **high** | Validate → permission → version bump → confirm → push | `constructs-publish.sh` |
| `creating-constructs` | safe | Template scaffold + type wizard + stealth gitignore | `constructs-create.sh` |
| `upgrading-constructs` | moderate | 3-way merge (base + local + remote) with conflict resolution | `constructs-install.sh upgrade` |

All follow browsing-constructs pattern: SKILL.md + index.yaml, AskUserQuestion interactions, Three-Zone compliance, error handling tables.

---

## 3. Infrastructure Layer

### Shell Scripts (4 new)
- `constructs-link.sh` — Link/unlink/list/status with shadow preservation
- `constructs-diff.sh` — Merkle hash divergence detection (O(1) for unchanged, O(n) for changed)
- `constructs-publish.sh` — Validate/push/dry-run/fork with permission-aware upstream
- `constructs-create.sh` — Scaffold from construct-template with type-specific structure

### API Endpoints (5 new/extended)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/packs/:slug/hash` | GET | Merkle root hash for O(1) divergence check |
| `/v1/packs/fork` | POST | Create scoped fork (@scope/name) |
| `/v1/constructs/register` | POST | Reserve construct slug on registry |
| `/v1/webhooks/configure` | POST | Return webhook URL + setup instructions |
| `/v1/packs/:slug/permissions` | GET | Check if user is maintainer |

### .construct/ Directory
```
.construct/                    # ALWAYS gitignored
├── state.json                 # Links, shadow metadata, timestamps
├── shadow/                    # Pristine registry copies for diffing
│   └── <slug>/
│       ├── .hash              # Merkle root hash
│       └── skills/...         # Full extracted copy
├── links/                     # Symlinks to local dev repos
│   └── <slug> -> /abs/path/
└── cache/                     # Computed data (safe to delete)
    ├── merkle/
    └── tmp/
```

---

## 4. Migration Plan — 4 Constructs

### Phase 1: Immediate (no schema v2 blockers)
| Construct | Type | Skills | Effort | Action |
|-----------|------|--------|--------|--------|
| Observer (midi-interface) | skill-pack variant | 23 (17 added) | Small | Register @thj/observer, add 7 missing index.yaml |
| The Easel (hub-interface) | skill-pack | 4 | Small | Extract to construct-the-easel repo |

### Phase 2: After schema v2
| Construct | Type | Skills | Effort | Action |
|-----------|------|--------|--------|--------|
| The Mint (hub-interface) | tool-pack | 4 + Python CLI | Medium | Extract, declare runtime/credentials |
| Observer upstream | skill-pack | 8 generic → upstream | Medium | PR 8 skills to construct-observer v1.1.0 |

### Phase 3: After MCP patterns defined
| Construct | Type | Files | Effort | Action |
|-----------|------|-------|--------|--------|
| mibera-codex | codex | 12,872 | Large | Build MCP server (18 tools), register as first codex |

### Key Discovery: The Cartograph
- 4 skills (mostly stubs), requires Blender 4.x
- **Do NOT migrate yet** — wait until it matures beyond stubs

---

## 5. Pack Structure (construct-network-tools)

```
construct-network-tools/
├── construct.yaml              # Pack manifest (schema_version 3)
├── skills/
│   ├── browsing-constructs/    # MOVE from Loa core
│   ├── finding-constructs/     # EXISTS in loa-constructs
│   ├── linking-constructs/     # NEW
│   ├── syncing-constructs/     # NEW
│   ├── publishing-constructs/  # NEW
│   ├── creating-constructs/    # NEW
│   └── upgrading-constructs/   # NEW
├── commands/
│   ├── constructs.md
│   ├── construct-link.md
│   ├── construct-sync.md
│   ├── construct-publish.md
│   ├── construct-create.md
│   └── construct-upgrade.md
└── scripts/
    ├── constructs-lib.sh       # Shared library (EXISTS)
    ├── constructs-browse.sh    # EXISTS
    ├── constructs-install.sh   # EXISTS
    ├── constructs-loader.sh    # EXISTS
    ├── constructs-auth.sh      # EXISTS
    ├── constructs-link.sh      # NEW
    ├── constructs-diff.sh      # NEW
    ├── constructs-publish.sh   # NEW
    └── constructs-create.sh    # NEW
```

### Bootstrap Strategy
Core `browsing-constructs` stays in Loa as bootstrap seed. `construct-network-tools` pack is installable via `/constructs install construct-network-tools`. This is the `pip install pip` pattern.

---

## 6. Sprint Decomposition (Proposed)

### Sprint 1: Schema + .construct/ Foundation
- Add 7 manifest v2 fields to TypeScript + Zod + JSON Schema
- Reconcile identity/hooks/pack_dependencies drift
- Create .construct/ directory structure + state.json schema
- Implement constructs-link.sh
- Create linking-constructs SKILL.md + index.yaml
- Estimated: ~120 TS, ~80 Zod, ~150 JSON Schema, ~200 shell script lines

### Sprint 2: Divergence Detection + Publishing
- Implement constructs-diff.sh (Merkle hash comparison)
- Implement constructs-publish.sh (validate/push/fork)
- Add 3 API endpoints: GET /hash, POST /fork, GET /permissions
- Create syncing-constructs + publishing-constructs skills
- Estimated: ~400 shell script, ~150 API route lines

### Sprint 3: Scaffold + Upgrade
- Implement constructs-create.sh (template scaffold)
- Extend constructs-install.sh with upgrade + 3-way merge
- Add 2 API endpoints: POST /register, POST /webhooks/configure
- Create creating-constructs + upgrading-constructs skills
- Estimated: ~350 shell script, ~100 API route lines

### Sprint 4: Migration Wave 1
- Register @thj/observer variant
- Extract The Easel to construct-the-easel
- Add 7 missing index.yaml to midi-interface Observer
- Parameterize Easel grimoire paths with @state/ aliases
- Estimated: mostly config/manifest work

### Sprint 5: Migration Wave 2
- Extract The Mint to construct-the-mint (first tool-pack)
- Upstream 8 generic Observer skills to construct-observer
- Begin mibera-codex MCP server design
- Estimated: Python packaging + PR review cycle

---

## 7. Open Questions for PRD

1. **Scoped naming**: Should the registry support `@scope/name` format natively, or use flat slugs like `thj-observer`?
2. **Webhook auto-configuration**: Should `constructs-create.sh` call the GitHub API directly to set up webhooks, or just provide instructions?
3. **MCP server hosting**: For codex-type constructs, does the MCP server run locally (stdio) or remotely (sse/streamable-http)?
4. **Portability score**: Author-declared or auto-computed from manifest fields?
5. **Variant lifecycle**: When @thj/observer upstreams skills to construct-observer, how does the variant track that its contributions have been accepted?
