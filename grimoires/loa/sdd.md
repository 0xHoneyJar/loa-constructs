# SDD: Bridgebuilder Cycle B — Wire the Workshop Through

**Cycle**: cycle-031
**Created**: 2026-02-20
**Status**: Ready for Implementation
**PRD**: `grimoires/loa/prd.md`
**Depends on**: Cycle A (PR #130) — schema foundation complete
**Grounded in**: Codebase audit of `fetch-constructs.ts`, `graph.ts`, `constructs/[slug]/page.tsx`, `constructs.ts` (API), `construct-workflow-read.sh`, `golden-path.sh`, `yq-safe.sh`

---

## 1. Executive Summary

Cycle A built the 4-layer schema foundation. Cycle B wires the data through — the API already serves enrichment data (`rating`, `long_description`, `owner`, `identity`, `repository_url`, `homepage_url`, `documentation_url`) via `formatConstructDetail()`, but the explorer frontend ignores all of it. The golden-path.sh script has the journey bar infrastructure but zero construct awareness. The workflow reader uses `jq` on YAML files and silently fails.

**Change surface**: 5 files modified (3 frontend, 2 shell scripts). No API changes — the API already serves everything we need.

---

## 2. System Architecture

### 2.1 Explorer Data Pipeline (Current State — Broken)

```
API: formatConstructDetail() → serves 15+ enrichment fields
         │
         ▼
fetch-constructs.ts: APIConstruct (20 fields) → drops maturity, rating, owner, identity, etc.
         │
         ▼
graph.ts: ConstructNode (12 fields), ConstructDetail (6 extra) → skeletal
         │
         ▼
page.tsx: Renders what it has → hardcoded 'stable', no owner/rating/links
```

### 2.2 Explorer Data Pipeline (After Cycle B)

```
API: formatConstructDetail() → serves 15+ enrichment fields (NO CHANGES)
         │
         ▼
fetch-constructs.ts: APIConstruct (30+ fields) → consumes all enrichment
         │
         ▼
graph.ts: ConstructNode (+rating), ConstructDetail (+8 fields) → rich
         │
         ▼
page.tsx: Renders everything → real maturity, owner, rating, links, identity badge
```

### 2.3 Shell Script Data Flow (Current State — Broken)

```
construct.yaml (YAML)
    │
    ▼
construct-workflow-read.sh → jq on YAML → parse error → exit 1 → "no workflow"
```

### 2.4 Shell Script Data Flow (After Cycle B)

```
construct.yaml (YAML)
    │
    ├─ .yaml/.yml extension detected
    ▼
yq-safe.sh: safe_yq_to_json() → JSON
    │
    ▼
construct-workflow-read.sh → jq on JSON → valid parse → workflow gates
```

---

## 3. Component Design

### 3.1 FR-1: Fix maturity field mismatch

**File**: `apps/explorer/lib/data/fetch-constructs.ts`

**Current** (line 17): `graduation_level?: string`
**Target**: `maturity?: string`

**Current** (line 61): `parseGraduationLevel(construct.graduation_level)`
**Target**: `parseGraduationLevel(construct.maturity)`

Two-character rename. After this change, `parseGraduationLevel()` receives the API's actual `maturity` value instead of `undefined`.

### 3.2 FR-2: Extend APIConstruct + types

**File**: `apps/explorer/lib/data/fetch-constructs.ts` (lines 6-26)

Add to `APIConstruct` interface (matching `formatConstructDetail()` response at `constructs.ts:80-117`):

```typescript
rating?: number | null;
long_description?: string | null;
owner?: {
  name: string;
  type: 'user' | 'team';
  avatar_url: string | null;
} | null;
has_identity?: boolean;
identity?: {
  cognitive_frame: unknown;
  expertise_domains: unknown;
  voice_config: unknown;
  model_preferences: unknown;
} | null;
repository_url?: string | null;
homepage_url?: string | null;
documentation_url?: string | null;
icon?: string | null;
```

**File**: `apps/explorer/lib/types/graph.ts`

Add to `ConstructNode` (line 36, before closing brace):
```typescript
rating?: number | null;
```

Add to `ConstructDetail` (line 64, before closing brace):
```typescript
longDescription?: string | null;
owner?: { name: string; type: 'user' | 'team'; avatarUrl: string | null } | null;
hasIdentity?: boolean;
repositoryUrl?: string | null;
homepageUrl?: string | null;
documentationUrl?: string | null;
```

**Transform updates**:

`transformToNode` (line 46-68) — add: `rating: construct.rating ?? null`

`transformToDetail` (lines 70-99) — add mappings:
```typescript
longDescription: construct.long_description ?? null,
owner: construct.owner ? {
  name: construct.owner.name,
  type: construct.owner.type,
  avatarUrl: construct.owner.avatar_url ?? null,
} : null,
hasIdentity: construct.has_identity ?? false,
repositoryUrl: construct.repository_url ?? null,
homepageUrl: construct.homepage_url ?? null,
documentationUrl: construct.documentation_url ?? null,
```

### 3.3 FR-3: Render enrichment on detail page

**File**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`

Following existing design patterns discovered in codebase audit:

**Owner badge** (after version + type badges, line 73):
```tsx
{construct.owner && (
  <span className="border border-white/20 px-2 py-0.5 text-[10px] font-mono text-white/60">
    by {construct.owner.name}
  </span>
)}
```

**Rating in info grid** (add 5th cell after Level, line 95):
```tsx
{construct.rating != null && (
  <div className="border border-white/10 p-3">
    <p className="text-white/40 mb-1">Rating</p>
    <p className="text-white">{construct.rating.toFixed(1)}</p>
  </div>
)}
```

**Long description** (after short description, line 76):
```tsx
{construct.longDescription && (
  <p className="text-sm font-mono text-white/60 mt-2">{construct.longDescription}</p>
)}
```

**Identity badge** (near type label, line 73):
```tsx
{construct.hasIdentity && (
  <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
    Expert Identity
  </span>
)}
```

**Links** (add to Links section, lines 156-179, following existing GitHub pattern):
```tsx
{construct.repositoryUrl && (
  <a href={construct.repositoryUrl} target="_blank" rel="noopener noreferrer"
     className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors">
    Repository
  </a>
)}
{construct.homepageUrl && (
  <a href={construct.homepageUrl} target="_blank" rel="noopener noreferrer"
     className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors">
    Homepage
  </a>
)}
{construct.documentationUrl && (
  <a href={construct.documentationUrl} target="_blank" rel="noopener noreferrer"
     className="border border-white/20 px-4 py-2 text-white/60 hover:bg-white/10 transition-colors">
    Documentation
  </a>
)}
```

### 3.4 FR-4: Fix construct-workflow-read.sh YAML parsing

**File**: `.claude/scripts/construct-workflow-read.sh`

**Changes to `main()` function** (line 142-168):

1. Source `yq-safe.sh` at top (after line 13):
```bash
source "${SCRIPT_DIR}/yq-safe.sh"
```

2. In `main()`, before `jq` parsing (line 148): detect file extension and convert YAML to JSON:
```bash
local manifest="$1"
local json_manifest="$manifest"

# If YAML, convert to JSON via temp file
case "$manifest" in
  *.yaml|*.yml)
    local tmp_json
    tmp_json=$(mktemp)
    trap "rm -f '$tmp_json'" EXIT
    if ! safe_yq_to_json "$manifest" > "$tmp_json"; then
      exit 1  # Fail-closed: YAML parse error → full pipeline
    fi
    json_manifest="$tmp_json"
    ;;
esac

# Existing jq logic uses $json_manifest instead of $manifest
workflow=$(jq -e '.workflow // empty' "$json_manifest" 2>/dev/null) || exit 1
```

3. All downstream `$manifest` references in `main()` replaced with `$json_manifest`.

**Design decision**: Temp file approach because `jq` expects a file argument, not stdin, in the existing code. The `trap` ensures cleanup even on error exit.

### 3.5 FR-5: Construct journey discovery in golden-path.sh

**File**: `.claude/scripts/golden-path.sh`

**New source** (after line 26):
```bash
source "${SCRIPT_DIR}/yq-safe.sh"
```

**New function** `golden_detect_construct_journeys()` (insert after `golden_format_bug_journey`, ~line 380):
```bash
golden_detect_construct_journeys() {
    local packs_dir=".claude/constructs/packs"
    [[ -d "$packs_dir" ]] || return 0

    local manifest commands_json pack_name output=""
    for manifest in "$packs_dir"/*/construct.yaml; do
        [[ -f "$manifest" ]] || continue

        # Extract golden_path.commands via yq
        commands_json=$(safe_yq_to_json "$manifest" 2>/dev/null | jq -c '.golden_path.commands // empty' 2>/dev/null) || continue
        [[ -z "$commands_json" || "$commands_json" == "null" ]] && continue

        pack_name=$(safe_yq '.name' "$manifest" 2>/dev/null) || continue
        [[ -z "$pack_name" ]] && continue

        # Build journey bar from command names
        local bar="" first=true
        while IFS= read -r cmd_name; do
            [[ -z "$cmd_name" ]] && continue
            if $first; then
                bar="/$cmd_name"
                first=false
            else
                bar="$bar ━━━━━ /$cmd_name"
            fi
        done < <(echo "$commands_json" | jq -r '.[].name' 2>/dev/null)

        [[ -n "$bar" ]] && output="${output}${pack_name}: ${bar}\n"
    done

    [[ -n "$output" ]] && printf "%b" "$output"
}
```

**Modify `golden_format_journey()`** (line 309, after the echo):
```bash
# After the framework bar, append construct journey bars
local construct_bars
construct_bars=$(golden_detect_construct_journeys 2>/dev/null)
[[ -n "$construct_bars" ]] && echo "$construct_bars"
```

---

## 4. Testing Strategy

### 4.1 Explorer build verification
- `pnpm --filter explorer build` — validates all type changes compile
- No runtime tests for the frontend (no test infrastructure exists for explorer)

### 4.2 Shell script verification
- `bash -n .claude/scripts/construct-workflow-read.sh` — syntax check
- `bash -n .claude/scripts/golden-path.sh` — syntax check
- Manual: `construct-workflow-read.sh` with a YAML manifest containing workflow section

### 4.3 Regression
- Existing golden-path framework bar rendering unchanged when no packs have golden_path
- `construct-workflow-read.sh` still works with JSON manifests (backward compat)

---

## 5. Security

- All new frontend fields are optional with null-safe rendering (`?? null`, conditional rendering)
- Links use `target="_blank" rel="noopener noreferrer"`
- No user-generated content rendered as HTML (all text content via React JSX)
- Shell scripts use `safe_yq_to_json()` which validates input length and sanitizes metacharacters
- Temp files cleaned up via `trap` on exit

---

## 6. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `safe_yq_to_json()` 10KB limit | Large manifests silently fail | Manifests are typically <5KB. Fail-closed to full pipeline. |
| No packs have golden_path yet | FR-5 returns empty | By design — graceful no-op. Ready when packs adopt. |
| Explorer build sensitivity | Type changes could cascade | All new fields optional. Incremental changes with build check. |
| yq not installed | FR-4 YAML conversion fails | `_yq_check()` returns 1, `safe_yq_to_json` fails, exit 1 → full pipeline (fail-closed). |

---

## 7. Sprint Breakdown

**Sprint 1** (Explorer Wiring — FR-1, FR-2, FR-3):
- Fix maturity mismatch
- Extend APIConstruct + graph types
- Update transform functions
- Render enrichment on detail page
- Build verification

**Sprint 2** (Shell Wiring — FR-4, FR-5):
- Add YAML parsing to construct-workflow-read.sh
- Add construct journey discovery to golden-path.sh
- Syntax verification

---

*"The API is already speaking. The frontend just needs to listen."*
