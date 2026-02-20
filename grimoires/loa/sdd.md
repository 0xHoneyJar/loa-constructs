# SDD: Construct Lifecycle — construct-network-tools Pack

**Cycle**: cycle-032
**Created**: 2026-02-20
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Research**: `grimoires/bridgebuilder/construct-lifecycle-design.md`
**Grounded in**: Codebase audit of `packages/shared/src/types.ts`, `packages/shared/src/validation.ts`, `.claude/schemas/construct.schema.json`, `.claude/schemas/pack-manifest.schema.json`, `apps/api/src/routes/packs.ts`, `.claude/scripts/constructs-*.sh`, `.claude/skills/browsing-constructs/`

---

## 1. Executive Summary

The Construct Lifecycle project adds bidirectional construct management to the Constructs Network. This SDD covers 6 workstreams across 3 codebases (packages/shared, apps/api, .claude/scripts+skills):

1. **Schema Extension** — 7 new fields + 3 drift reconciliations across TypeScript, Zod, JSON Schema
2. **Shadow Directory** — `.construct/` gitignored state management for links, shadows, cache
3. **Shell Scripts** — 4 new scripts following existing `constructs-*.sh` patterns
4. **API Endpoints** — 5 new routes in `apps/api/src/routes/packs.ts`
5. **Lifecycle Skills** — 5 new skills following `browsing-constructs` patterns
6. **Pack Assembly** — construct-network-tools pack manifest and structure

**Change surface**: ~15 files modified, ~12 files created. No database migrations — all new API endpoints use existing tables except `pack_hashes` (1 new table, 2 columns).

---

## 2. System Architecture

### 2.1 Four-Layer Stack

```
Layer 4: Natural Language     User → "link my local observer"
         │
Layer 3: Skills               linking-constructs SKILL.md routes to script
         │
Layer 2: Shell Scripts         constructs-link.sh --link /path/to/observer
         │
Layer 1: API + State           POST /v1/packs/fork, .construct/state.json
```

Each layer has a single responsibility:
- **Skills** translate intent into script invocations via AskUserQuestion interactions
- **Scripts** handle OS-level operations (symlinks, file hashing, git operations)
- **API** handles registry operations (publish, fork, permissions)
- **State** (`.construct/`) persists local-only metadata

### 2.2 Data Flow Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           .construct/ (local)            │
                    │  ┌──────────┐ ┌────────┐ ┌───────────┐  │
                    │  │state.json│ │shadow/ │ │  links/   │  │
                    │  └──────────┘ └────────┘ └───────────┘  │
                    └───────┬──────────┬──────────┬───────────┘
                            │          │          │
    ┌───────────────────────┼──────────┼──────────┼────────────┐
    │      Shell Scripts    │          │          │             │
    │  ┌──────────────────┐ │  ┌───────┴───────┐ │             │
    │  │constructs-link.sh├─┤  │constructs-    │ │             │
    │  └──────────────────┘ │  │diff.sh        │ │             │
    │  ┌──────────────────┐ │  └───────────────┘ │             │
    │  │constructs-       │ │  ┌───────────────┐ │             │
    │  │publish.sh        ├─┼──┤constructs-    ├─┘             │
    │  └──────────────────┘ │  │create.sh      │               │
    └───────────────────────┼──┴───────────────┘───────────────┘
                            │
                    ┌───────┴──────────────────────────────────┐
                    │          Registry API                     │
                    │  GET /hash  POST /fork  GET /permissions  │
                    │  POST /register  POST /webhooks/configure │
                    └──────────────────────────────────────────┘
```

### 2.3 Existing Integration Points

| Component | File | Integration |
|-----------|------|-------------|
| Pack manifest validation | `packages/shared/src/validation.ts:261-324` | Add new schema fields |
| Pack manifest TS type | `packages/shared/src/types.ts:219-329` | Add new interface fields |
| API pack routes | `apps/api/src/routes/packs.ts` (1565 lines) | Add 5 new route handlers |
| Construct JSON Schema | `.claude/schemas/construct.schema.json` | Add new fields + reconcile drift |
| Pack manifest JSON Schema | `.claude/schemas/pack-manifest.schema.json` | Add new fields to match |
| Shared lib | `.claude/scripts/constructs-lib.sh` | Consumed by all new scripts |
| Install script | `.claude/scripts/constructs-install.sh` | Extend with upgrade subcommand |
| Topology validator | `scripts/validate-topology.sh` | Must validate new fields |

---

## 3. Schema Extension (FR-1)

### 3.1 New Fields — TypeScript Interface

Add to `packages/shared/src/types.ts` after line 328 (after `tier`):

```typescript
// === Construct Lifecycle fields (FR-1, cycle-032) ===

/** Construct archetype declaration */
type?: 'skill-pack' | 'tool-pack' | 'codex' | 'template';

/** OS/system dependencies for tool packs and codex */
runtime_requirements?: {
  runtime?: string;                    // e.g., "python>=3.10"
  dependencies?: string[];             // e.g., ["pip:openai>=1.0"]
  external_tools?: string[];           // e.g., ["ffmpeg", "blender"]
};

/** Logical path aliases for construct state */
paths?: {
  state?: string;                      // Default: ".construct/state"
  cache?: string;                      // Default: ".construct/cache"
  output?: string;                     // Default: "output/"
};

/** Declared credentials (never stored in manifest) */
credentials?: Array<{
  name: string;                        // Env var name, e.g., "OPENAI_API_KEY"
  description: string;                 // Human-readable purpose
  sensitive?: boolean;                 // Default: true
  optional?: boolean;                  // Default: false
}>;

/** Access layer for codex-type constructs */
access_layer?: {
  type: 'mcp' | 'filesystem' | 'api';
  entrypoint?: string;                 // e.g., "server.py"
  transport?: 'stdio' | 'sse' | 'streamable-http';
};

/** Reusability indicator (0.0-1.0, author-declared) */
portability_score?: number;

// === Drift reconciliation (pre-existing in construct.schema.json) ===

/** Construct identity persona */
identity?: {
  persona?: string;                    // Path to persona file
  expertise?: string;                  // Path to expertise file
};

/** Lifecycle hooks (relative script paths) */
hooks?: {
  post_install?: string;
  post_update?: string;
};
```

> Note: `pack_dependencies` already exists in Zod as `dependencies.packs` (Record form). The construct.schema.json uses array form. We reconcile by supporting both shapes in Zod with `z.union()`. See §3.2.

### 3.2 New Fields — Zod Schema

Add to `packages/shared/src/validation.ts` before `packManifestSchema`:

```typescript
// ── Construct Lifecycle schemas (cycle-032, FR-1) ──────────────

export const constructTypeSchema = z.enum([
  'skill-pack', 'tool-pack', 'codex', 'template',
]);

export const runtimeRequirementsSchema = z.object({
  runtime: z.string().max(100).optional(),
  dependencies: z.array(z.string().max(200)).max(50).optional(),
  external_tools: z.array(z.string().max(100)).max(20).optional(),
});

export const constructPathsSchema = z.object({
  state: z.string().max(200).optional(),
  cache: z.string().max(200).optional(),
  output: z.string().max(200).optional(),
});

export const credentialSchema = z.object({
  name: z.string().min(1).max(100)
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Credential name must be UPPER_SNAKE_CASE'),
  description: z.string().min(1).max(500),
  sensitive: z.boolean().default(true),
  optional: z.boolean().default(false),
});

export const accessLayerSchema = z.object({
  type: z.enum(['mcp', 'filesystem', 'api']),
  entrypoint: z.string().max(200).optional(),
  transport: z.enum(['stdio', 'sse', 'streamable-http']).optional(),
});

export const identitySchema = z.object({
  persona: z.string().max(500).optional(),
  expertise: z.string().max(500).optional(),
});

export const lifecycleHooksSchema = z.object({
  post_install: z.string().max(300).optional(),
  post_update: z.string().max(300).optional(),
});
```

Add to `packManifestSchema` body (before `.passthrough()`):

```typescript
  // Construct Lifecycle fields (cycle-032, FR-1)
  type: constructTypeSchema.optional(),
  runtime_requirements: runtimeRequirementsSchema.optional(),
  paths: constructPathsSchema.optional(),
  credentials: z.array(credentialSchema).max(20).optional(),
  access_layer: accessLayerSchema.optional(),
  portability_score: z.number().min(0).max(1).optional(),

  // Drift reconciliation
  identity: identitySchema.optional(),
  hooks: lifecycleHooksSchema.optional(),
```

Add type exports:

```typescript
// Construct Lifecycle types (cycle-032)
export type ConstructType = z.infer<typeof constructTypeSchema>;
export type RuntimeRequirements = z.infer<typeof runtimeRequirementsSchema>;
export type ConstructPaths = z.infer<typeof constructPathsSchema>;
export type Credential = z.infer<typeof credentialSchema>;
export type AccessLayer = z.infer<typeof accessLayerSchema>;
export type Identity = z.infer<typeof identitySchema>;
export type LifecycleHooks = z.infer<typeof lifecycleHooksSchema>;
```

### 3.3 JSON Schema Updates

**`.claude/schemas/construct.schema.json`** — Already has `identity` and `hooks`. Add:

```json
"type": {
  "type": "string",
  "enum": ["skill-pack", "tool-pack", "codex", "template"],
  "description": "Construct archetype declaration"
},
"runtime_requirements": {
  "type": "object",
  "properties": {
    "runtime": { "type": "string", "maxLength": 100 },
    "dependencies": { "type": "array", "items": { "type": "string", "maxLength": 200 }, "maxItems": 50 },
    "external_tools": { "type": "array", "items": { "type": "string", "maxLength": 100 }, "maxItems": 20 }
  },
  "additionalProperties": false
},
"paths": {
  "type": "object",
  "properties": {
    "state": { "type": "string", "maxLength": 200 },
    "cache": { "type": "string", "maxLength": 200 },
    "output": { "type": "string", "maxLength": 200 }
  },
  "additionalProperties": false
},
"credentials": {
  "type": "array",
  "maxItems": 20,
  "items": {
    "type": "object",
    "required": ["name", "description"],
    "properties": {
      "name": { "type": "string", "minLength": 1, "maxLength": 100, "pattern": "^[A-Z][A-Z0-9_]*$" },
      "description": { "type": "string", "minLength": 1, "maxLength": 500 },
      "sensitive": { "type": "boolean", "default": true },
      "optional": { "type": "boolean", "default": false }
    },
    "additionalProperties": false
  }
},
"access_layer": {
  "type": "object",
  "required": ["type"],
  "properties": {
    "type": { "type": "string", "enum": ["mcp", "filesystem", "api"] },
    "entrypoint": { "type": "string", "maxLength": 200 },
    "transport": { "type": "string", "enum": ["stdio", "sse", "streamable-http"] }
  },
  "additionalProperties": false
},
"portability_score": {
  "type": "number",
  "minimum": 0,
  "maximum": 1,
  "description": "Reusability indicator (0.0=highly specific, 1.0=universal)"
}
```

**`.claude/schemas/pack-manifest.schema.json`** — Mirror the same additions.

### 3.4 Known Drift to Reconcile

| Drift | Location | Resolution |
|-------|----------|-----------|
| `identity`, `hooks` missing from TS/Zod | `construct.schema.json:151-180` → TS/Zod | Add to both (§3.1, §3.2) |
| `pack_dependencies` shape mismatch | construct.schema.json uses array, Zod uses Record | Keep both — construct.yaml uses array, manifest.json uses Record. Document the difference. |
| `long_description`, `repository`, `homepage`, `documentation`, `keywords`, `engines`, `claude_instructions`, `mcp_dependencies`, `schema_version`, `protocols` in Zod but missing from `.claude/schemas/pack-manifest.schema.json` | Zod vs JSON Schema | Add to JSON Schema in this cycle |
| `meta_probe`, `tools[].version` in JSON Schema but missing from Zod | JSON Schema vs Zod | Add to Zod in this cycle |
| `pricing.type` enum: `one-time` (JSON Schema) vs `one_time` (Zod) | Both files | Standardize on `one_time` (matches Zod and TS), update JSON Schema |
| `docs/schemas/pack-manifest.json` uses camelCase | Legacy docs schema | Mark as deprecated, do not update |
| `apps/api/src/schemas/construct-manifest.json` missing Bridgebuilder fields | API server schema | Defer — API uses AJV + its own narrow schema, not blocking lifecycle work |

### 3.5 Validation Pipeline (Unchanged)

```
Construct repos:  construct.yaml → .claude/schemas/construct.schema.json (AJV)
                                  → validate-topology.sh (8 CI checks)

Shared package:   PackManifest    → packManifestSchema (Zod, .passthrough())

API upload:       manifest.json   → apps/api/src/schemas/construct-manifest.json (AJV)
```

All new fields are optional — zero breaking changes to any validation pipeline.

---

## 4. Shadow Directory (FR-2)

### 4.1 Directory Structure

```
.construct/                        # ALWAYS gitignored
├── state.json                     # Links, shadow metadata, timestamps
├── shadow/                        # Pristine registry copies for diffing
│   └── <slug>/
│       ├── .hash                  # Merkle root hash (sha256)
│       └── skills/                # Full extracted copy of registry version
│           ├── <skill-slug>/
│           │   ├── SKILL.md
│           │   └── index.yaml
│           └── ...
├── links/                         # Symlinks to local dev repos
│   └── <slug> -> /absolute/path/to/local/repo
└── cache/                         # Computed data (safe to delete)
    ├── merkle/                    # Per-file hash cache
    │   └── <slug>.json
    └── tmp/                       # Temporary files during operations
```

### 4.2 state.json Schema

```typescript
interface ConstructState {
  schema_version: 1;
  links: Record<string, {
    path: string;            // Absolute path to local repo
    linked_at: string;       // ISO 8601
    last_checked: string;    // ISO 8601
    construct_type?: string; // skill-pack | tool-pack | codex
  }>;
  shadow: Record<string, {
    version: string;         // Semver of installed version
    root_hash: string;       // sha256:<hex>
    file_count: number;
    installed_at: string;    // ISO 8601
    source: 'registry' | 'git';
  }>;
  last_updated: string;      // ISO 8601
}
```

### 4.3 Initialization

The `.construct/` directory is created lazily — only when a lifecycle script needs it. `constructs-lib.sh` gets a new function:

```bash
ensure_construct_dir() {
  local construct_dir=".construct"
  if [[ ! -d "$construct_dir" ]]; then
    mkdir -p "$construct_dir"/{shadow,links,cache/merkle,cache/tmp}
    echo '{"schema_version":1,"links":{},"shadow":{},"last_updated":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' \
      > "$construct_dir/state.json"
    chmod 600 "$construct_dir/state.json"
  fi

  # Ensure gitignored
  if [[ -d ".git" ]] && ! git check-ignore -q ".construct" 2>/dev/null; then
    echo -e "\n# Construct lifecycle state\n.construct/" >> .gitignore
  fi
}
```

### 4.4 Shadow Copy Management

When a construct is installed via `constructs-install.sh`, a shadow copy is preserved:

```bash
preserve_shadow() {
  local slug="$1" version="$2" source_dir="$3"
  ensure_construct_dir

  local shadow_dir=".construct/shadow/$slug"
  rm -rf "$shadow_dir"
  mkdir -p "$shadow_dir/skills"

  # Copy all skill files as pristine reference
  cp -r "$source_dir/skills/"* "$shadow_dir/skills/" 2>/dev/null || true

  # Compute and store Merkle root hash
  compute_merkle_hash "$shadow_dir" > "$shadow_dir/.hash"

  # Update state.json
  local root_hash
  root_hash=$(cat "$shadow_dir/.hash")
  local file_count
  file_count=$(find "$shadow_dir" -type f | wc -l | tr -d ' ')

  update_state_shadow "$slug" "$version" "$root_hash" "$file_count" "$4"
}
```

---

## 5. Shell Scripts (FR-3)

### 5.1 Common Patterns (all 4 scripts)

Every new script follows the established pattern from `constructs-install.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/constructs-lib.sh" || { echo "ERROR: constructs-lib.sh not found" >&2; exit 6; }

# Named exit codes
EXIT_SUCCESS=0
EXIT_VALIDATION_ERROR=1
EXIT_EXISTS=2
EXIT_NOT_FOUND=3
EXIT_AUTH_ERROR=4
EXIT_NETWORK_ERROR=5
EXIT_ERROR=6

main() {
  local cmd="${1:-help}"
  shift || true
  case "$cmd" in
    <subcommands>)  cmd_$cmd "$@" ;;
    help|--help|-h) show_help ;;
    *)              print_error "Unknown command: $cmd"; show_help >&2; exit $EXIT_ERROR ;;
  esac
}

# Source-vs-execute guard
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
```

Security patterns inherited from `constructs-lib.sh`:
- TLS enforcement: `--proto =https --tlsv1.2` on all curl calls
- API key via curl config file (not command line)
- `validate_safe_identifier()` on all slug inputs
- `validate_url()` on all URL inputs
- `secure_write_file()` for credential-adjacent files
- `check_rate_limit()` for API operations

### 5.2 constructs-link.sh

**Purpose**: Symlink a local construct repo for live development. Preserves shadow copy.

**Subcommands**:

| Command | Args | Description |
|---------|------|-------------|
| `link` | `<path> [--slug <slug>]` | Create symlink, preserve shadow |
| `unlink` | `<slug>` | Remove symlink, restore from shadow |
| `list` | — | Show all active links |
| `status` | `[slug]` | Show link health and drift status |

**Key function — `cmd_link()`**:

```bash
cmd_link() {
  local target_path="$1"
  local slug="${2:-}"

  # Validate target path exists and contains construct.yaml
  [[ -d "$target_path" ]] || { print_error "Directory not found: $target_path"; return $EXIT_NOT_FOUND; }
  target_path="$(cd "$target_path" && pwd)"  # Resolve to absolute

  # Auto-detect slug from construct.yaml if not provided
  if [[ -z "$slug" ]]; then
    local manifest
    for f in "$target_path/construct.yaml" "$target_path/manifest.json"; do
      [[ -f "$f" ]] && manifest="$f" && break
    done
    [[ -z "${manifest:-}" ]] && { print_error "No construct.yaml or manifest.json in $target_path"; return $EXIT_VALIDATION_ERROR; }

    if [[ "$manifest" == *.yaml ]]; then
      slug=$(yq eval '.slug' "$manifest" 2>/dev/null) || true
    else
      slug=$(jq -r '.slug' "$manifest" 2>/dev/null) || true
    fi
    [[ -z "$slug" || "$slug" == "null" ]] && { print_error "Cannot determine slug from manifest"; return $EXIT_VALIDATION_ERROR; }
  fi

  validate_safe_identifier "$slug" || { print_error "Invalid slug: $slug"; return $EXIT_VALIDATION_ERROR; }
  ensure_construct_dir

  # Check if already linked
  if [[ -L ".construct/links/$slug" ]]; then
    print_warning "Already linked: $slug -> $(readlink .construct/links/$slug)"
    return $EXIT_EXISTS
  fi

  # Preserve shadow of currently installed version (if exists)
  local installed_dir
  installed_dir="$(get_packs_dir)/$slug"
  if [[ -d "$installed_dir" ]] && [[ ! -L "$installed_dir" ]]; then
    local version
    version=$(jq -r '.version // "unknown"' "$installed_dir/manifest.json" 2>/dev/null || echo "unknown")
    preserve_shadow "$slug" "$version" "$installed_dir" "registry"
    print_status "$icon_valid" "Shadow preserved: $slug@$version"
  fi

  # Create symlink
  ln -sfn "$target_path" ".construct/links/$slug"

  # Create symlink in packs dir (so skills are discoverable)
  ln -sfn "$target_path" "$installed_dir"

  # Update state.json
  update_state_link "$slug" "$target_path"

  print_success "Linked: $slug -> $target_path"
}
```

**Key function — `cmd_unlink()`**:

```bash
cmd_unlink() {
  local slug="$1"
  validate_safe_identifier "$slug" || return $EXIT_VALIDATION_ERROR

  local link_path=".construct/links/$slug"
  [[ -L "$link_path" ]] || { print_error "Not linked: $slug"; return $EXIT_NOT_FOUND; }

  rm "$link_path"

  # Restore from shadow if available
  local shadow_dir=".construct/shadow/$slug"
  local installed_dir
  installed_dir="$(get_packs_dir)/$slug"

  if [[ -d "$shadow_dir/skills" ]]; then
    rm -rf "$installed_dir"
    mkdir -p "$installed_dir"
    cp -r "$shadow_dir/skills/"* "$installed_dir/skills/" 2>/dev/null || true
    # Reconstruct manifest from shadow metadata
    print_status "$icon_valid" "Restored from shadow: $slug"
  else
    rm -f "$installed_dir"  # Remove dangling symlink
    print_warning "No shadow available — construct uninstalled"
  fi

  remove_state_link "$slug"
  print_success "Unlinked: $slug"
}
```

### 5.3 constructs-diff.sh

**Purpose**: Merkle hash divergence detection between local construct and shadow.

**Subcommands**:

| Command | Args | Description |
|---------|------|-------------|
| `check` | `<slug>` | O(1) root hash comparison |
| `diff` | `<slug>` | Full file-level diff |
| `hash` | `<path>` | Compute Merkle root hash of a directory |

**Merkle Hash Algorithm**:

```bash
compute_merkle_hash() {
  local dir="$1"
  local hash_tool

  # Cross-platform SHA256
  if command -v sha256sum &>/dev/null; then
    hash_tool="sha256sum"
  elif command -v shasum &>/dev/null; then
    hash_tool="shasum -a 256"
  else
    print_error "No SHA256 tool found"; return $EXIT_ERROR
  fi

  # Sort all files deterministically, hash each, then hash the concatenation
  local file_hashes=""
  while IFS= read -r file; do
    local rel_path="${file#$dir/}"
    local file_hash
    file_hash=$($hash_tool "$file" | cut -d' ' -f1)
    file_hashes+="$rel_path:$file_hash\n"
  done < <(find "$dir" -type f -not -name '.hash' | LC_ALL=C sort)

  # Root hash = hash of sorted "path:hash" pairs
  echo -e "$file_hashes" | $hash_tool | cut -d' ' -f1
}
```

**O(1) Check**:

```bash
cmd_check() {
  local slug="$1"
  local shadow_hash_file=".construct/shadow/$slug/.hash"

  [[ -f "$shadow_hash_file" ]] || { print_error "No shadow for $slug"; return $EXIT_NOT_FOUND; }

  local shadow_hash
  shadow_hash=$(cat "$shadow_hash_file")

  local installed_dir
  installed_dir="$(get_packs_dir)/$slug"
  [[ -d "$installed_dir" ]] || { print_error "Not installed: $slug"; return $EXIT_NOT_FOUND; }

  local current_hash
  current_hash=$(compute_merkle_hash "$installed_dir")

  if [[ "$shadow_hash" == "$current_hash" ]]; then
    echo '{"status":"identical","slug":"'"$slug"'"}'
    return $EXIT_SUCCESS
  else
    echo '{"status":"diverged","slug":"'"$slug"'","shadow_hash":"'"$shadow_hash"'","current_hash":"'"$current_hash"'"}'
    return 1  # Diverged
  fi
}
```

**Full Diff Output** (JSON for script consumption):

```json
{
  "slug": "observer",
  "status": "diverged",
  "shadow_version": "1.0.2",
  "summary": {
    "added": 17,
    "modified": 2,
    "deleted": 0
  },
  "files": {
    "added": ["skills/skill-17/SKILL.md", "skills/skill-17/index.yaml", ...],
    "modified": ["skills/observing-users/SKILL.md", ...],
    "deleted": []
  }
}
```

### 5.4 constructs-publish.sh

**Purpose**: Validate and publish a construct to the registry.

**Subcommands**:

| Command | Args | Description |
|---------|------|-------------|
| `validate` | `[path]` | Validate manifest, capabilities, event schemas |
| `push` | `[path]` | Package and publish to registry API |
| `dry-run` | `[path]` | Show what would be published |
| `fork` | `[path] --scope <scope>` | Publish as scoped variant |

**Validation Checklist** (`cmd_validate()`):

1. `construct.yaml` or `manifest.json` exists and parses
2. Required fields present: `name`, `slug`, `version`, `description`, `skills`
3. Every declared skill has `SKILL.md` + `index.yaml`
4. Every `index.yaml` has required fields (name, version, description, triggers)
5. Every skill has `capabilities` stanza
6. If `events.emits` declared, data schema files exist
7. If `type: tool-pack`, `runtime_requirements` should be declared
8. If `type: codex`, `access_layer` should be declared
9. Slug matches pattern `^[a-z0-9][a-z0-9-]*[a-z0-9]$`
10. Version is valid semver

**Push Flow**:

```
cmd_push()
  ├── Run cmd_validate() — abort on failure
  ├── Check authentication (get_api_key)
  ├── GET /v1/packs/{slug}/permissions — check if maintainer
  │   ├── maintainer=true → proceed with upstream push
  │   └── maintainer=false → offer fork (AskUserQuestion)
  ├── Prompt for version bump (patch/minor/major)
  ├── Package files (base64 encode, filter .git/)
  ├── POST /v1/packs/{slug}/versions — upload
  └── Print success summary
```

**Rate limit**: 10 publishes per hour (`check_rate_limit "publish" 10`).

### 5.5 constructs-create.sh

**Purpose**: Scaffold a new construct from the construct-template repo.

**Subcommands**:

| Command | Args | Description |
|---------|------|-------------|
| `new` | `--name X --type Y` | Scaffold in new directory |
| `init` | `--type Y` | Initialize in existing directory |

**Scaffold Flow**:

```
cmd_new()
  ├── Validate name → slug conversion
  ├── Check directory doesn't exist
  ├── git clone --depth 1 construct-template
  ├── Remove .git, reinitialize
  ├── Generate construct.yaml with type-specific fields
  │   ├── skill-pack: minimal manifest
  │   ├── tool-pack: manifest + runtime_requirements + credentials
  │   └── codex: manifest + access_layer
  ├── Create starter skill (if skill-pack or tool-pack)
  │   ├── skills/<slug>-starter/SKILL.md (template)
  │   └── skills/<slug>-starter/index.yaml (template)
  ├── Generate .gitignore with stealth defaults
  │   └── .construct/, .ck/, .beads/, .run/
  ├── git init + initial commit
  └── Print next steps
```

**Template source**: `https://github.com/0xHoneyJar/construct-template.git`

No network calls if `--offline` flag is set (uses embedded templates instead of git clone).

---

## 6. API Endpoints (FR-4)

### 6.1 Route Registration

Add to `apps/api/src/routes/packs.ts` at the end of the route definitions:

```typescript
// --- Construct Lifecycle Endpoints (cycle-032) ---

// GET /v1/packs/:slug/hash — Merkle root hash for O(1) divergence check
packsRouter.get('/:slug/hash', optionalAuth(), async (c) => { ... });

// GET /v1/packs/:slug/permissions — Check maintainer status
packsRouter.get('/:slug/permissions', requireAuth(), async (c) => { ... });

// POST /v1/packs/fork — Create scoped fork
packsRouter.post('/fork', requireAuth(), async (c) => { ... });

// POST /v1/constructs/register — Reserve construct slug
// Note: This goes on a separate router since it's /v1/constructs/, not /v1/packs/
// Add to apps/api/src/routes/constructs.ts (new file)

// POST /v1/webhooks/configure — Webhook setup instructions
// Add to apps/api/src/routes/webhooks.ts (new file)
```

### 6.2 GET /v1/packs/:slug/hash

**Purpose**: Return Merkle root hash for O(1) divergence check.

**Implementation**:

```typescript
packsRouter.get('/:slug/hash', optionalAuth(), async (c) => {
  const slug = c.req.param('slug');
  const requestId = c.get('requestId') ?? randomUUID();

  const pack = await getPackBySlug(slug);
  if (!pack) throw Errors.NotFound('Pack not found');

  // Get latest version with computed hash
  const [latestVersion] = await db.select({
    version: packVersions.version,
    hash: packVersions.contentHash,
  })
    .from(packVersions)
    .where(and(
      eq(packVersions.packId, pack.id),
      eq(packVersions.isLatest, true),
    ))
    .limit(1);

  if (!latestVersion) throw Errors.NotFound('No published version');

  // If hash not pre-computed, compute on-the-fly from files
  let hash = latestVersion.hash;
  if (!hash) {
    const files = await getPackVersionFiles(pack.id, latestVersion.version);
    hash = computeContentHash(files);
  }

  return c.json({
    data: {
      slug,
      version: latestVersion.version,
      hash: `sha256:${hash}`,
    },
    request_id: requestId,
  });
});
```

**Database change**: Add `content_hash TEXT` column to `pack_versions` table. Computed on version upload, stored for O(1) retrieval.

### 6.3 GET /v1/packs/:slug/permissions

**Purpose**: Check if authenticated user is a maintainer of the pack.

```typescript
packsRouter.get('/:slug/permissions', requireAuth(), async (c) => {
  const slug = c.req.param('slug');
  const userId = c.get('userId');
  const requestId = c.get('requestId') ?? randomUUID();

  const pack = await getPackBySlug(slug);
  if (!pack) throw Errors.NotFound('Pack not found');

  const isOwner = await isPackOwner(pack.id, userId);

  return c.json({
    data: {
      slug,
      permissions: {
        is_owner: isOwner,
        can_publish: isOwner,
        can_fork: true,  // Anyone can fork
      },
    },
    request_id: requestId,
  });
});
```

### 6.4 POST /v1/packs/fork

**Purpose**: Create a scoped fork of an existing pack.

```typescript
const forkSchema = z.object({
  source_slug: slugSchema,
  new_slug: slugSchema,  // e.g., "thj-observer"
  description: z.string().max(500).optional(),
});

packsRouter.post('/fork', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const user = c.get('user');
  const requestId = c.get('requestId') ?? randomUUID();

  if (!user.emailVerified) throw Errors.Forbidden('Email verification required');

  const body = forkSchema.parse(await c.req.json());

  // Rate limit: 5 forks per 24h
  // (handled by submissionRateLimiter at router level)

  // Verify source exists
  const source = await getPackBySlug(body.source_slug);
  if (!source) throw Errors.NotFound('Source pack not found');

  // Verify new slug is available
  const existing = await getPackBySlug(body.new_slug);
  if (existing) throw Errors.Conflict('Slug already taken');

  // Create fork (copy latest version's files)
  const fork = await createPack({
    name: `${source.name} (Fork)`,
    slug: body.new_slug,
    description: body.description ?? source.description,
    userId,
  });

  // Copy latest version files
  const latestVersion = await getLatestPackVersion(source.id);
  if (latestVersion) {
    const files = await getPackVersionFiles(source.id, latestVersion.version);
    await createPackVersion({
      packId: fork.id,
      version: '0.1.0',
      manifest: { ...latestVersion.manifest, slug: body.new_slug, version: '0.1.0' },
      files,
    });
  }

  return c.json({
    data: { slug: body.new_slug, forked_from: body.source_slug },
    request_id: requestId,
  }, 201);
});
```

### 6.5 POST /v1/constructs/register

**Purpose**: Reserve a construct slug before first publish.

New file: `apps/api/src/routes/constructs.ts`

```typescript
const registerSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(255),
  type: z.enum(['skill-pack', 'tool-pack', 'codex', 'template']).optional(),
});

constructsRouter.post('/register', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const user = c.get('user');
  const requestId = c.get('requestId') ?? randomUUID();

  if (!user.emailVerified) throw Errors.Forbidden('Email verification required');

  const body = registerSchema.parse(await c.req.json());

  // Rate limit: 5 registrations per 24h
  const existing = await getPackBySlug(body.slug);
  if (existing) throw Errors.Conflict('Slug already registered');

  const pack = await createPack({
    name: body.name,
    slug: body.slug,
    userId,
    status: 'reserved',
  });

  return c.json({
    data: { slug: body.slug, status: 'reserved' },
    request_id: requestId,
  }, 201);
});
```

### 6.6 POST /v1/webhooks/configure

**Purpose**: Return webhook URL and setup instructions (instructions-only, no auto-config).

New file: `apps/api/src/routes/webhooks.ts`

```typescript
const configureSchema = z.object({
  slug: slugSchema,
  provider: z.enum(['github']).default('github'),
});

webhooksRouter.post('/configure', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const requestId = c.get('requestId') ?? randomUUID();

  const body = configureSchema.parse(await c.req.json());

  const pack = await getPackBySlug(body.slug);
  if (!pack) throw Errors.NotFound('Pack not found');

  const isOwner = await isPackOwner(pack.id, userId);
  if (!isOwner) throw Errors.Forbidden('Only pack owners can configure webhooks');

  // Generate webhook secret
  const webhookSecret = randomUUID();
  // Store secret hash (not plaintext)
  // TODO: Add webhook_secret_hash column to packs table

  return c.json({
    data: {
      webhook_url: `https://api.constructs.network/v1/webhooks/github/${body.slug}`,
      secret: webhookSecret,
      instructions: {
        step_1: 'Go to your GitHub repo → Settings → Webhooks → Add webhook',
        step_2: `Payload URL: https://api.constructs.network/v1/webhooks/github/${body.slug}`,
        step_3: 'Content type: application/json',
        step_4: `Secret: ${webhookSecret}`,
        step_5: 'Events: Just the push event',
        step_6: 'Active: checked',
      },
    },
    request_id: requestId,
  });
});
```

### 6.7 Database Changes

One migration required:

```sql
-- Add content_hash to pack_versions for O(1) divergence check
ALTER TABLE pack_versions ADD COLUMN content_hash TEXT;

-- Index for fast hash lookups
CREATE INDEX idx_pack_versions_content_hash ON pack_versions(pack_id, content_hash)
  WHERE is_latest = true;
```

No new tables needed. The `fork` operation reuses existing `packs` and `pack_versions` tables.

---

## 7. Lifecycle Skills (FR-5)

### 7.1 Skill Structure Pattern

Each skill follows the `browsing-constructs` template:

```
skills/<skill-slug>/
├── SKILL.md       # Execution specification (200-400 lines)
└── index.yaml     # Routing and discovery metadata
```

### 7.2 index.yaml Template

```yaml
name: <skill-slug>
version: "1.0.0"
description: |
  <1-2 sentence description>
model: sonnet
color: blue
triggers:
  - pattern: "/<command>"
    description: "<what it does>"
dependencies: []
inputs:
  - name: action
    type: string
    description: "Subcommand"
    required: false
    default: "<default>"
outputs:
  - name: result
    type: object
    description: "Operation result"
zones:
  system: read
  state: write
  app: none
capabilities:
  model_tier: sonnet
  danger_level: <safe|moderate|high>
  effort_hint: <small|medium>
  downgrade_allowed: true
  execution_hint: sequential
  requires:
    native_runtime: false
    tool_calling: true
    thinking_traces: false
    vision: false
```

### 7.3 Skill-to-Script Wiring

Each skill's SKILL.md contains a workflow section that maps user intent to Bash tool calls:

```markdown
## Workflow

### Phase 1: Validate Input
- Parse user request for slug, path, or action
- If ambiguous, use AskUserQuestion to clarify

### Phase 2: Execute
```bash
.claude/scripts/constructs-<script>.sh <subcommand> <args>
```

### Phase 3: Present Results
- Parse script stdout (JSON)
- Format for user display
- If choices needed, use AskUserQuestion
```

### 7.4 Five Skills Summary

| Skill | Trigger | Script | Danger | Key Interaction |
|-------|---------|--------|--------|-----------------|
| `linking-constructs` | `/construct-link` | `constructs-link.sh` | moderate | AskUserQuestion: path selection |
| `syncing-constructs` | `/construct-sync` | `constructs-diff.sh` | moderate | AskUserQuestion: upstream/variant/discard/ignore |
| `publishing-constructs` | `/construct-publish` | `constructs-publish.sh` | **high** | AskUserQuestion: version bump, confirm push |
| `creating-constructs` | `/construct-create` | `constructs-create.sh` | safe | AskUserQuestion: type wizard |
| `upgrading-constructs` | `/construct-upgrade` | `constructs-install.sh upgrade` | moderate | AskUserQuestion: conflict resolution |

### 7.5 Error Handling (All Skills)

Each SKILL.md includes a standard error table:

| Exit Code | Meaning | User Action |
|-----------|---------|-------------|
| 0 | Success | Show result |
| 1 | Validation error | Show specific error, suggest fix |
| 2 | Already exists / conflict | Offer alternative (unlink first, use different slug) |
| 3 | Not found | Suggest install or check slug |
| 4 | Auth error | Run `/construct-auth setup` |
| 5 | Network error | Check connectivity, retry |
| 6 | Internal error | Report issue |

---

## 8. Merkle-Tree Divergence Detection (Detail)

### 8.1 Algorithm

```
Input: directory D
Output: sha256 root hash

1. files ← SORT(find D -type f, excluding .hash)     # LC_ALL=C sort for determinism
2. pairs ← []
3. for each file f in files:
     rel ← f relative to D
     h ← sha256(content of f)
     pairs.append("rel:h")
4. concatenated ← JOIN(pairs, "\n")
5. root ← sha256(concatenated)
6. return root
```

### 8.2 Normalization

To prevent nondeterminism:
- File paths normalized with forward slashes
- Files sorted with `LC_ALL=C` (byte order, not locale)
- `.hash` file excluded from computation (self-reference)
- `.DS_Store`, `__pycache__/`, `*.pyc` excluded
- No line ending normalization (hash exact bytes)

### 8.3 Performance Characteristics

| Scenario | Time Complexity | I/O |
|----------|----------------|-----|
| Root hash match (unchanged) | O(n) first time, O(1) cached | Read `.hash` file only |
| Root hash mismatch (diverged) | O(n) | Hash all files |
| No shadow exists | O(1) | Check for directory |

Cache invalidation: Cache is stored in `.construct/cache/merkle/<slug>.json` and invalidated when any file in the construct directory has `mtime` newer than the cache file.

---

## 9. Pack Assembly (FR-6)

### 9.1 construct-network-tools Pack Manifest

```yaml
schema_version: 3
name: Construct Network Tools
slug: construct-network-tools
version: "1.0.0"
description: "Full construct lifecycle management — link, sync, publish, create, upgrade"
type: skill-pack

author:
  name: "0xHoneyJar"
  url: "https://github.com/0xHoneyJar"

license: MIT
repository: "https://github.com/0xHoneyJar/construct-network-tools"

skills:
  - slug: browsing-constructs
    path: skills/browsing-constructs
  - slug: finding-constructs
    path: skills/finding-constructs
  - slug: linking-constructs
    path: skills/linking-constructs
  - slug: syncing-constructs
    path: skills/syncing-constructs
  - slug: publishing-constructs
    path: skills/publishing-constructs
  - slug: creating-constructs
    path: skills/creating-constructs
  - slug: upgrading-constructs
    path: skills/upgrading-constructs

commands:
  - name: constructs
    path: commands/constructs.md
  - name: construct-link
    path: commands/construct-link.md
  - name: construct-sync
    path: commands/construct-sync.md
  - name: construct-publish
    path: commands/construct-publish.md
  - name: construct-create
    path: commands/construct-create.md
  - name: construct-upgrade
    path: commands/construct-upgrade.md

domain:
  - construct-management
  - developer-tooling
  - package-management

expertise:
  - construct lifecycle management
  - bidirectional construct sync
  - construct publishing and forking
  - construct scaffolding
  - safe upgrade with 3-way merge

tier: L2

workflow:
  depth: standard
  gates:
    implement: required
    review: textual
    audit: lightweight

quick_start:
  command: "/constructs"
  description: "Browse and install constructs from the registry"

dependencies:
  packs: {}
  skills: {}

tags:
  - lifecycle
  - constructs
  - publishing
  - development
```

### 9.2 Bootstrap Strategy

```
Loa core has:
  .claude/skills/browsing-constructs/    # Bootstrap seed (always available)
  .claude/scripts/constructs-*.sh        # Shell scripts (always available)

construct-network-tools pack adds:
  5 new lifecycle skills                  # Installed via /constructs install
  6 new slash commands                    # Routing to lifecycle skills
```

`browsing-constructs` remains in Loa core. The full `construct-network-tools` pack is installable via `/constructs install construct-network-tools`. This is the "pip install pip" pattern — you need the bootstrap to install the full package.

---

## 10. Testing Strategy

### 10.1 Schema Tests

Extend `packages/shared/src/__tests__/pack-manifest.test.ts`:

```typescript
describe('Construct Lifecycle fields (cycle-032)', () => {
  it('accepts valid type field', () => { ... });
  it('rejects invalid type field', () => { ... });
  it('accepts valid runtime_requirements', () => { ... });
  it('accepts valid credentials with UPPER_SNAKE_CASE', () => { ... });
  it('rejects credentials with lowercase name', () => { ... });
  it('accepts valid access_layer', () => { ... });
  it('accepts valid portability_score in range', () => { ... });
  it('rejects portability_score out of range', () => { ... });
  it('accepts identity (drift reconciliation)', () => { ... });
  it('accepts hooks (drift reconciliation)', () => { ... });
  it('existing manifests still pass (backward compat)', () => { ... });
});
```

### 10.2 Shell Script Tests

Each script's source-vs-execute guard enables unit testing:

```bash
# Test constructs-link.sh
source .claude/scripts/constructs-link.sh

test_cmd_link_validates_path() {
  cmd_link "/nonexistent" 2>/dev/null
  assert_eq $? $EXIT_NOT_FOUND
}

test_cmd_link_creates_symlink() {
  local tmp_dir=$(mktemp -d)
  echo '{"slug":"test-pack","version":"1.0.0"}' > "$tmp_dir/manifest.json"
  cmd_link "$tmp_dir"
  assert_true "[ -L .construct/links/test-pack ]"
  rm -rf "$tmp_dir"
}
```

### 10.3 API Endpoint Tests

Follow existing patterns in `apps/api/src/__tests__/`:

```typescript
describe('GET /v1/packs/:slug/hash', () => {
  it('returns hash for published pack', async () => { ... });
  it('returns 404 for unknown pack', async () => { ... });
  it('works without authentication', async () => { ... });
});

describe('POST /v1/packs/fork', () => {
  it('creates fork with new slug', async () => { ... });
  it('rejects duplicate slug', async () => { ... });
  it('requires authentication', async () => { ... });
  it('requires email verification', async () => { ... });
});
```

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Path traversal in symlinks | `validate_symlink_target()` from `constructs-install.sh` pattern |
| Credential exposure in publish | Never send credentials — `credentials` field is declare-only |
| Fork name squatting | Rate limit: 5 registrations/24h, email verification required |
| Shadow tampering | Shadow directory has `chmod 600 state.json`, no user-facing writes |
| API key in process list | curl config file pattern from `constructs-browse.sh` |
| Merkle hash collision | SHA-256 — collision probability negligible for this use case |
| Post-install script execution | Not implemented — Deno-style consent model (hooks declared but not auto-executed) |

---

## 12. File Change Summary

### Modified Files

| File | Changes |
|------|---------|
| `packages/shared/src/types.ts` | Add 9 new optional fields to `PackManifest` interface |
| `packages/shared/src/validation.ts` | Add 7 new Zod schemas + 7 type exports, extend `packManifestSchema` |
| `.claude/schemas/construct.schema.json` | Add 6 new field definitions |
| `.claude/schemas/pack-manifest.schema.json` | Add 6 new field definitions + missing fields from Zod |
| `.claude/scripts/constructs-lib.sh` | Add `ensure_construct_dir()`, `preserve_shadow()`, `compute_merkle_hash()`, state management functions |
| `.claude/scripts/constructs-install.sh` | Add `upgrade` subcommand, call `preserve_shadow()` on install |
| `apps/api/src/routes/packs.ts` | Add 3 new route handlers (hash, permissions, fork) |
| `packages/shared/src/__tests__/pack-manifest.test.ts` | Add lifecycle field test cases |

### New Files

| File | Purpose |
|------|---------|
| `.claude/scripts/constructs-link.sh` | Link/unlink/list/status operations |
| `.claude/scripts/constructs-diff.sh` | Merkle hash divergence detection |
| `.claude/scripts/constructs-publish.sh` | Validate/push/dry-run/fork publishing |
| `.claude/scripts/constructs-create.sh` | Template scaffold for new constructs |
| `apps/api/src/routes/constructs.ts` | POST /v1/constructs/register endpoint |
| `apps/api/src/routes/webhooks.ts` | POST /v1/webhooks/configure endpoint |
| `.claude/skills/linking-constructs/SKILL.md` | Linking skill execution spec |
| `.claude/skills/linking-constructs/index.yaml` | Linking skill metadata |
| `.claude/skills/syncing-constructs/SKILL.md` | Syncing skill execution spec |
| `.claude/skills/syncing-constructs/index.yaml` | Syncing skill metadata |
| `.claude/skills/publishing-constructs/SKILL.md` | Publishing skill execution spec |
| `.claude/skills/publishing-constructs/index.yaml` | Publishing skill metadata |
| `.claude/skills/creating-constructs/SKILL.md` | Creating skill execution spec |
| `.claude/skills/creating-constructs/index.yaml` | Creating skill metadata |
| `.claude/skills/upgrading-constructs/SKILL.md` | Upgrading skill execution spec |
| `.claude/skills/upgrading-constructs/index.yaml` | Upgrading skill metadata |

---

## 13. Open Design Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| DD-1 | Scoped naming format | Flat slugs (`thj-observer`) | Avoids registry complexity. Scoped display in explorer UI only. |
| DD-2 | Webhook configuration | Instructions-only (no auto-config) | Reduces scope. User pastes URL + secret into GitHub. |
| DD-3 | MCP hosting for codex | Local stdio | Simplest deployment. Remote sse as future option declared in `access_layer.transport`. |
| DD-4 | Portability score | Author-declared | Auto-computed suggestion as future enhancement. |
| DD-5 | Variant tracking | Registry metadata (DB-level) | Manifest shouldn't reference other manifests. `forked_from` column on packs table. |
| DD-6 | Shadow copy scope | Skills directory only | Full pack copy would be wasteful. Skills are what users modify. |
| DD-7 | Hash storage | Pre-computed on upload, `content_hash` column | Avoids recomputing on every GET /hash request. |

---

## Next Step

`/sprint-plan` — Break into implementable sprints following the 5-sprint sequence from the PRD.
