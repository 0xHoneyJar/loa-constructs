# SDD: Agent-Native Output Protocol — TOON, CTAs, Lazy-Loading Contract

**Cycle**: cycle-037
**Created**: 2026-02-28
**Status**: Draft
**PRD**: `grimoires/loa/prd.md` (Agent-Native Output Protocol)
**Grounded in**:
- `.claude/scripts/constructs-browse.sh` (`format_packs_human`, `format_packs_json`)
- `.claude/scripts/constructs-install.sh` (`show_pack_status`, `compute_pack_hash`, `update_pack_meta`)
- `.claude/scripts/constructs-lib.sh` (`compute_merkle_hash`, `get_registry_config`, print helpers)
- `.claude/scripts/golden-path.sh` (`golden_detect_construct_journeys`, `golden_menu_options`)
- `docs/integration/runtime-contract.md` (exit codes, checkpoint schema — no loading contract)
- `packages/shared/src/types.ts` (`PackManifest`, `golden_path`, `workflow`)
- `packages/shared/src/validation.ts` (Zod schemas)
- `.loa.config.yaml` (existing config surface)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Config Layer                          │
│  .loa.config.yaml                                       │
│    output_format.tabular: md|toon|json                  │
│    cta.enabled: false                                   │
└────────┬────────────────────────┬───────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌────────────────────┐
│  toon-lib.sh    │    │  constructs-lib.sh │
│  (NEW)          │    │  (MODIFIED)        │
│                 │    │                    │
│ toon_encode_    │    │ emit_cta()         │
│   tabular()     │    │ get_output_format()│
│ toon_detect_    │    │ format_tabular_    │
│   uniform()     │    │   output()         │
└────────┬────────┘    └───────┬────────────┘
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│              Integration Points                         │
│                                                         │
│  constructs-browse.sh    format_packs_human() + TOON    │
│  constructs-install.sh   show_pack_status() + TOON/CTA  │
│  constructs-install.sh   install completion + CTA       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Type & Contract Layer                       │
│                                                         │
│  types.ts          workflow_next field on PackManifest   │
│  validation.ts     Zod schema update                    │
│  runtime-contract  Skill Loading Contract section        │
│  skill-cta.md      CTA protocol specification           │
└─────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Config-gated**: All new behaviors default to OFF. Existing output is byte-identical.
2. **jq does the heavy lifting**: TOON encoder receives JSON from `jq`, never parses raw text.
3. **Additive only**: No functions removed, no signatures changed, no exit codes altered.
4. **Cross-platform**: All bash follows `.claude/protocols/cross-platform-shell.md`.

---

## 2. Component Design

### 2.1 TOON Encoder Library (`toon-lib.sh`)

**File**: `.claude/scripts/lib/toon-lib.sh` (NEW)

The encoder converts JSON arrays of uniform objects to TOON tabular format. "Uniform" means every object has the same set of keys.

#### Core Functions

```bash
# Detect if a JSON array is uniform (all objects have same keys)
# Args: $1 = JSON array string
# Returns: 0 if uniform, 1 if not
# Stdout: comma-separated key list if uniform
toon_detect_uniform() {
    local json="$1"

    # Extract keys from first object, compare against all objects
    local first_keys
    first_keys=$(echo "$json" | jq -r '
        if (type == "array" and length > 0 and (.[0] | type) == "object")
        then [.[0] | keys[]] | join(",")
        else empty
        end
    ' 2>/dev/null) || return 1

    [[ -z "$first_keys" ]] && return 1

    # Verify all objects have identical keys
    local all_same
    all_same=$(echo "$json" | jq -r --arg fk "$first_keys" '
        [.[] | [keys[]] | join(",")] | all(. == $fk)
    ' 2>/dev/null) || return 1

    [[ "$all_same" == "true" ]] || return 1
    echo "$first_keys"
    return 0
}

# Encode a JSON array to TOON tabular format
# Args:
#   $1 = label (e.g., "packs")
#   $2 = JSON array string (uniform objects)
# Stdout: TOON tabular output
# Returns: 0 on success, 1 on non-uniform/non-array input
toon_encode_tabular() {
    local label="$1"
    local json="$2"

    # Handle empty array as valid case — emit header-only
    local count
    count=$(echo "$json" | jq 'if type == "array" then length else -1 end' 2>/dev/null) || return 1
    [[ "$count" == "-1" ]] && return 1

    if [[ "$count" == "0" ]]; then
        echo "${label}[0]{}:"
        return 0
    fi

    # Detect uniformity and get keys
    local keys
    keys=$(toon_detect_uniform "$json") || {
        # Non-uniform: return empty (caller handles fallback)
        return 1
    }

    # Header: label[count]{field1,field2,...}:
    echo "${label}[${count}]{${keys}}:"

    # Value rows: CSV-style, 2-space indent
    echo "$json" | jq -r --arg keys "$keys" '
        ($keys | split(",")) as $fields |
        .[] | [.[$fields[]]] | map(tostring) | "  " + join(",")
    '
}
```

#### Design Decisions

- **jq dependency**: Required. Already used by every constructs script. No new dependency.
- **No escaping in MVP**: Field values containing commas are not escaped. PRD defers escaping rules to a follow-up cycle. MVP data (pack slugs, names, versions, status) contains no commas.
- **Return code convention**: `toon_encode_tabular` returns 1 on non-uniform data. Callers fall back to their current format.
- **Label convention**: The label describes the collection (e.g., `packs`, `skills`, `tasks`).

---

### 2.2 Output Format Routing (`constructs-lib.sh`)

**File**: `.claude/scripts/constructs-lib.sh` (MODIFIED — add 3 functions)

```bash
# Read output_format.tabular from config
# Returns: "md" (default), "toon", or "json"
get_output_format() {
    local config_file=".loa.config.yaml"
    local default="md"

    if [[ ! -f "$config_file" ]] || ! command -v yq &>/dev/null; then
        echo "$default"
        return 0
    fi

    local value
    value=$(yq eval '.output_format.tabular // "md"' "$config_file" 2>/dev/null) || {
        echo "$default"
        return 0
    }

    # Validate enum
    case "$value" in
        md|toon|json) echo "$value" ;;
        *) echo "$default" ;;
    esac
}

# Route tabular output through the configured format
# Args:
#   $1 = label (e.g., "packs")
#   $2 = JSON array of uniform objects (TOON-shaped: flat keys, uniform)
#   $3 = original payload (passed to fallback_fn unchanged — preserves input contract)
#   $4 = fallback function name (called when format is "md" or TOON fails)
# Stdin: not used
# Stdout: formatted output
#
# IMPORTANT: The $2 (tabular JSON) and $3 (original payload) are distinct.
# TOON encodes from $2 (flat, uniform). Fallback calls $4 with $3 (original shape).
# This ensures TOON failure never passes incompatible data to markdown formatters.
format_tabular_output() {
    local label="$1"
    local tabular_json="$2"
    local original_payload="$3"
    local fallback_fn="$4"

    local fmt
    fmt=$(get_output_format)

    case "$fmt" in
        toon)
            # Source toon-lib if not already loaded
            local script_dir
            script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
            if [[ -f "$script_dir/lib/toon-lib.sh" ]]; then
                # shellcheck source=lib/toon-lib.sh
                source "$script_dir/lib/toon-lib.sh"
                toon_encode_tabular "$label" "$tabular_json" && return 0
            fi
            # Fallback: TOON failed or lib missing — use original payload
            "$fallback_fn" "$original_payload"
            ;;
        json)
            echo "$tabular_json" | jq '.'
            ;;
        md|*)
            "$fallback_fn" "$original_payload"
            ;;
    esac
}
```

---

### 2.3 CTA Emission (`constructs-lib.sh`)

**File**: `.claude/scripts/constructs-lib.sh` (MODIFIED — add 2 functions)

```bash
# Check if CTAs are enabled in config
# Returns: 0 if enabled, 1 if disabled
is_cta_enabled() {
    local config_file=".loa.config.yaml"

    if [[ ! -f "$config_file" ]] || ! command -v yq &>/dev/null; then
        return 1
    fi

    local enabled
    enabled=$(yq eval '.cta.enabled // false' "$config_file" 2>/dev/null) || return 1

    [[ "$enabled" == "true" ]]
}

# Emit context-sensitive CTA block after command output
# Args:
#   $1 = current command context (e.g., "browse", "status", "install")
#   $2 = pack slug (optional — for pack-specific CTAs)
# Stdout: Next: block with up to 3 CTAs
emit_cta() {
    is_cta_enabled || return 0

    local context="$1"
    local pack_slug="${2:-}"

    echo ""
    echo "Next:"

    case "$context" in
        browse)
            echo "/constructs install <slug> — Install a construct pack"
            echo "/constructs status — Check installed pack versions"
            echo "/loa — View workflow status"
            ;;
        status)
            echo "/constructs browse — Browse available packs"
            echo "/constructs install <slug> — Install or update a pack"
            echo "/loa — View workflow status"
            ;;
        install)
            # Post-install: suggest the pack's quick_start if available
            if [[ -n "$pack_slug" ]]; then
                local pack_dir
                pack_dir="$(get_registry_install_dir)/$pack_slug"
                local quick_cmd=""
                if [[ -f "$pack_dir/construct.yaml" ]] && command -v yq &>/dev/null; then
                    quick_cmd=$(yq eval '.quick_start.command // ""' "$pack_dir/construct.yaml" 2>/dev/null)
                fi
                if [[ -n "$quick_cmd" ]]; then
                    echo "$quick_cmd — Get started with $pack_slug"
                fi
            fi
            echo "/constructs status — Verify installation"
            echo "/loa — View workflow status"
            ;;
    esac
}
```

#### CTA Design Decisions

- **Static mapping in MVP**: CTAs are hardcoded per command context. Dynamic lookup from `golden_path.commands` + `truename_map` is deferred — the existing `detect_state` infrastructure would need to be extended to support per-invocation state, which is out of scope.
- **Truenames only**: CTAs use `/constructs install`, not `/build` or golden path aliases.
- **Max 3**: Each case emits exactly 2-3 CTAs.
- **No-op when disabled**: `emit_cta` returns immediately when `cta.enabled: false`.

---

### 2.4 CTA Protocol Specification

**File**: `.claude/protocols/skill-cta.md` (NEW)

Content defines the output protocol:

```markdown
# Skill CTA Protocol

## Format

After primary command output, CTA-enabled commands append:

    Next:
    <command-1> — <description>
    <command-2> — <description>

## Rules

1. Maximum 3 CTAs per invocation
2. CTAs appear after main output, before any grimoire writes
3. Use truenames (e.g., `/implement`) not golden path aliases (e.g., `/build`)
4. Command-context-based: each CTA-enabled command has a static mapping of
   relevant next steps (cycle-037 MVP). Dynamic workflow-state-derived CTAs
   using `golden_path.commands` + `truename_map` are future scope.
5. Gated by `cta.enabled: true` in `.loa.config.yaml`

## Enabled Commands (cycle-037 MVP)

- `constructs browse`
- `constructs status`
- `constructs install`
```

---

### 2.5 Config Surface

**File**: `.loa.config.yaml` (MODIFIED)

Add two new top-level sections after existing config:

```yaml
# Output format for tabular CLI data (cycle-037)
# Values: md (default), toon, json
output_format:
  tabular: md

# Per-invocation call-to-action navigation (cycle-037)
# When enabled, CLI commands append a "Next:" block with suggested next steps
cta:
  enabled: false
```

**Config validation**: Enum validation for `output_format.tabular` happens in `get_output_format()` (returns default on invalid value). Boolean validation for `cta.enabled` happens in `is_cta_enabled()`.

---

### 2.6 Lazy-Loading Contract

**File**: `docs/integration/runtime-contract.md` (MODIFIED)

Add new section `## Skill Loading Contract` after the existing Checkpoint Schema section:

```markdown
## Skill Loading Contract

### Session-Start Behavior

At session start, the runtime loads ONLY lightweight metadata:
1. `CLAUDE.loa.md` framework instructions (skill command table)
2. Pack `index.yaml` files (name, description, capabilities per skill)

Full `SKILL.md` files are NOT loaded at session start.

### On-Demand Loading Trigger

When the agent decides to invoke a skill:
1. Runtime reads the full `SKILL.md` for that skill
2. Skill body is injected into the agent's context
3. Skill executes with full instructions available

### Token Baseline

| Component | Approximate Size |
|-----------|-----------------|
| Skill entry in command table | ~40 tokens/skill |
| Full SKILL.md body | ~300-2000 tokens/skill |
| index.yaml metadata | ~50 tokens/skill |

Loading 49 skills at session start: ~2,000 tokens (index only)
Loading 49 skills eagerly: ~15,000-100,000 tokens (wasteful)

### Output Format Contract

When `output_format.tabular` is configured in `.loa.config.yaml`:
- `md` (default): Markdown tables and plain-text labels
- `toon`: TOON tabular encoding (header + CSV rows)
- `json`: Raw JSON array output

Runtimes SHOULD respect this config when rendering tabular data.

### Defer Loading (Non-Normative — Future Extension)

> **Note**: This section documents a future capability. The `defer_loading`
> config key exists but is not implemented in any runtime as of cycle-037.
> Runtimes are not expected to implement this behavior yet.

When `defer_loading: true` is set in `.loa.config.yaml`, the runtime MAY
defer even `index.yaml` loading until a skill discovery command
(`/constructs browse`, `/loa`) is invoked. This further reduces session-start
token cost at the expense of requiring an explicit discovery step.
```

---

### 2.7 Type System Extension

**File**: `packages/shared/src/types.ts` (MODIFIED)

Add `workflow_next` field to `PackManifest` after the existing `methodology` field:

```typescript
  /** Cross-construct navigation hints (cycle-037, FR-2.4) */
  workflow_next?: Array<{
    /** Slug of suggested next construct */
    construct: string;
    /** Why this construct complements the current one */
    reason: string;
    /** Workflow state that activates this suggestion (optional) */
    trigger?: string;
  }>;
```

**File**: `packages/shared/src/validation.ts` (MODIFIED)

Add corresponding Zod schema alongside existing pack manifest validation:

```typescript
const workflowNextSchema = z.array(z.object({
  construct: z.string(),
  reason: z.string(),
  trigger: z.string().optional(),
})).optional();
```

Add `workflow_next: workflowNextSchema` to the pack manifest Zod schema.

---

### 2.8 Hash Staleness Refinement

#### End-to-End Data Flow

The hash staleness feature requires content hashes at two points: **local** (computed at install time) and **registry** (fetched from API). Both paths already exist in the codebase — this section documents the full contract and adds the missing `check-updates` comparison.

```
INSTALL TIME:
  compute_pack_hash() → compute_merkle_hash() → sha256:...
      ↓
  update_pack_meta() → .constructs-meta.json { content_hash: "sha256:..." }

STATUS/CHECK-UPDATES TIME:
  LOCAL:    jq '.installed_packs["slug"].content_hash' .constructs-meta.json
  REGISTRY: curl ${registry_url}/packs/${slug}/hash → .data.hash

  COMPARE:
    both present + match     → SYNCED
    both present + mismatch  → DIVERGED
    local missing            → UNKNOWN (reinstall to compute)
    registry missing         → UNKNOWN (API unavailable)
```

**Already implemented** (cycle-036):
- `compute_pack_hash()` in `constructs-install.sh:934` — calls `compute_merkle_hash()`
- `update_pack_meta()` in `constructs-install.sh:951` — persists `content_hash` in `.constructs-meta.json`
- `show_pack_status()` in `constructs-install.sh:2047` — reads both hashes, displays SYNCED/DIVERGED/BEHIND/UNKNOWN
- `GET /packs/:slug/hash` API endpoint (API side)

**New in this cycle**:

**File**: `.claude/skills/browsing-constructs/SKILL.md` (MODIFIED)

Update the `.constructs-meta.json` documentation example to include the `content_hash` field:

```json
{
  "installed_packs": {
    "artisan": {
      "version": "1.2.0",
      "content_hash": "sha256:a3f2c1...",
      "installed_at": "2026-02-28T00:00:00Z",
      "source_type": "git"
    }
  }
}
```

**File**: `.claude/scripts/constructs-loader.sh` (MODIFIED)

In the `check-updates` subcommand, add content hash comparison after version comparison. The `check-updates` path currently only compares version strings. Add hash retrieval and comparison:

```bash
# After existing version comparison:
# 1. Read local hash from meta (already persisted by update_pack_meta)
local local_hash
local_hash=$(jq -r ".installed_packs[\"$slug\"].content_hash // \"\"" "$meta_path" 2>/dev/null)

# 2. Fetch registry hash (same endpoint used by show_pack_status)
local registry_hash=""
local hash_file
hash_file=$(mktemp)
chmod 600 "$hash_file"
local hash_code
hash_code=$(curl -s -w "%{http_code}" \
    --proto =https --tlsv1.2 --max-time 10 \
    "${registry_url}/packs/${slug}/hash" \
    -o "$hash_file" 2>/dev/null) || hash_code="000"
if [[ "$hash_code" == "200" ]]; then
    registry_hash=$(jq -r '.data.hash // ""' "$hash_file" 2>/dev/null)
fi
rm -f "$hash_file"

# 3. Compare: version match + hash divergence = DIVERGED
if [[ "$local_version" == "$registry_version" ]]; then
    if [[ -n "$local_hash" && -n "$registry_hash" && "$local_hash" != "$registry_hash" ]]; then
        status="DIVERGED"
    fi
fi
```

This surfaces fork-drift (same version, different content) which is the case study from RFC #131 (Observer in midi-interface: 23 skills forked from 6).

---

## 3. Integration Points

### 3.1 `constructs-browse.sh` — Pack Listing

**Current**: `format_packs_human()` outputs icon + name + description in plain text.

**Change**: ALL tabular output routes through `format_tabular_output()`. The existing `--json` flag takes precedence (explicit user request), otherwise the config-driven router handles `md|toon|json`:

```bash
# In cmd_list(), replace the direct format call:
if [[ "$json_output" == true ]]; then
    # Explicit --json flag always wins (backwards compat)
    format_packs_json "$packs_json"
else
    # Build flat tabular JSON for TOON/json modes
    local toon_json
    toon_json=$(echo "$packs_json" | jq '[
        .data[]? | {
            slug: .slug,
            name: .name,
            skills: (.skills_count // (.manifest.skills | length?) // 0),
            version: (.latest_version.version // .version // "1.0.0"),
            tier: (.tier_required // .tier // "free")
        }
    ]')
    # Route: toon→TOON encoder, json→raw JSON, md→format_packs_human
    # Note: $toon_json is the flat shape for TOON/json, $packs_json is the
    # original API envelope passed to format_packs_human on fallback
    format_tabular_output "packs" "$toon_json" "$packs_json" "format_packs_human"
fi

# Append CTAs
emit_cta "browse"
```

**TOON output example**:
```
packs[6]{slug,name,skills,version,tier}:
  artisan,Artisan,14,1.2.0,free
  observer,Observer,6,1.0.2,free
  crucible,Crucible,5,1.0.0,free
  beacon,Beacon,6,1.0.0,free
  gtm-collective,GTM Collective,8,1.0.0,free
  protocol,Protocol,10,1.0.0,free
```

### 3.2 `constructs-install.sh` — Pack Status

**Current**: `show_pack_status()` outputs label-value pairs as plain text per pack.

**Change**: Collect all pack status data into a JSON array first, then route through `format_tabular_output()`. The existing `show_pack_status()` function is preserved as the markdown fallback:

```bash
# In the status command handler:
# Step 1: Collect status data for ALL packs into a JSON array
local status_json="[]"
for slug in "${installed_slugs[@]}"; do
    local local_version registry_version status_label local_hash registry_hash
    # ... existing fetch logic for local + registry data ...
    # ... existing hash comparison logic (SYNCED/DIVERGED/BEHIND/UNKNOWN) ...
    status_json=$(echo "$status_json" | jq --arg s "$slug" \
        --arg v "$local_version" --arg rv "$registry_version" \
        --arg st "$status_label" \
        '. += [{"slug":$s,"local":$v,"registry":$rv,"status":$st}]')
done

# Step 2: Route through format_tabular_output
# _show_all_packs_md() iterates status_json and calls show_pack_status() per pack
# This is a new wrapper that preserves the existing per-pack output format
format_tabular_output "status" "$status_json" "$status_json" "_show_all_packs_md"

# Step 3: Append CTAs
emit_cta "status"
```

The `_show_all_packs_md()` wrapper iterates the JSON array and calls the existing `show_pack_status()` for each entry, preserving byte-identical markdown output when `output_format.tabular: md`.

### 3.3 `constructs-install.sh` — Install Completion

**Current**: `execute_post_install_hook()` displays quick_start suggestion.

**Change**: After existing post-install output, append CTA:

```bash
# At end of install command:
emit_cta "install" "$pack_slug"
```

---

## 4. Files Manifest

| File | Action | Description |
|------|--------|-------------|
| `.claude/scripts/lib/toon-lib.sh` | CREATE | TOON tabular encoder (2 functions) |
| `.claude/protocols/skill-cta.md` | CREATE | CTA output protocol specification |
| `.claude/scripts/constructs-lib.sh` | MODIFY | Add `get_output_format()`, `format_tabular_output()`, `is_cta_enabled()`, `emit_cta()` |
| `.claude/scripts/constructs-browse.sh` | MODIFY | Route through `format_tabular_output()` + `emit_cta()` |
| `.claude/scripts/constructs-install.sh` | MODIFY | TOON in `show_pack_status()` + CTA in install/status |
| `.claude/scripts/constructs-loader.sh` | MODIFY | Hash divergence comparison in `check-updates` |
| `docs/integration/runtime-contract.md` | MODIFY | Add Skill Loading Contract section |
| `packages/shared/src/types.ts` | MODIFY | Add `workflow_next` to `PackManifest` |
| `packages/shared/src/validation.ts` | MODIFY | Add `workflow_next` Zod schema |
| `.loa.config.yaml` | MODIFY | Add `output_format` and `cta` sections |
| `.claude/skills/browsing-constructs/SKILL.md` | MODIFY | Add `content_hash` to meta example |

**Total**: 2 new files, 9 modified files.

---

## 5. Testing Strategy

### 5.1 Unit: TOON Encoder

- Uniform JSON array → correct TOON header + CSV rows
- Non-uniform JSON array → return code 1 (fallback)
- Empty array → `label[0]{}: ` (no rows)
- Single-element array → correct output
- Nested values → `tostring` produces flat representation

### 5.2 Integration: Output Format Routing

- `output_format.tabular: md` → identical output to pre-cycle-037 (snapshot comparison)
- `output_format.tabular: toon` → TOON format for `constructs browse` and `constructs status`
- `output_format.tabular: json` → raw JSON for both targets
- Missing config → defaults to `md`
- Invalid config value → defaults to `md`

### 5.3 Integration: CTA Emission

- `cta.enabled: false` → no `Next:` block in any command output
- `cta.enabled: true` + `constructs browse` → `Next:` block with 3 CTAs
- `cta.enabled: true` + `constructs status` → `Next:` block with 3 CTAs
- `cta.enabled: true` + `constructs install <slug>` → `Next:` block with quick_start + 2 CTAs
- Missing config → no CTAs (default: false)

### 5.4 Regression: Default Output

- Capture current `constructs browse` output as snapshot
- Capture current `constructs status` output as snapshot
- After changes, verify byte-identical output with default config

### 5.5 Type System

- `workflow_next` field accepts valid array of `{construct, reason, trigger?}`
- Zod validation rejects malformed `workflow_next` entries
- Existing manifests without `workflow_next` pass validation (field is optional)

---

## 6. Risks & Mitigations

### R1: jq Availability

**Risk**: `toon-lib.sh` requires `jq`.
**Mitigation**: `jq` is already required by all constructs scripts. `constructs-lib.sh` checks for `jq` at load time. If missing, TOON encoding silently falls back to markdown.

### R2: Large Pack Listings

**Risk**: TOON output for 50+ packs could be long.
**Mitigation**: Current markdown output is longer for the same data. TOON is strictly more compact.

### R3: Config Parsing Overhead

**Risk**: `get_output_format()` reads `.loa.config.yaml` on every tabular output call.
**Mitigation**: `yq eval` is fast (~10ms). Only 2 integration points in MVP. Caching could be added later if needed.

### R4: CTA Staleness

**Risk**: Hardcoded CTA suggestions may become stale as commands change.
**Mitigation**: CTAs reference core constructs commands that are stable. The protocol spec in `skill-cta.md` documents which commands are CTA-enabled. Dynamic CTAs from `golden_path.commands` are future scope.
