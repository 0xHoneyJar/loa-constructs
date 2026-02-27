# SDD: Constructs Network Distribution Layer — Phase 1 Foundation

**Cycle**: cycle-036
**Created**: 2026-02-27
**Status**: Draft
**PRD**: `grimoires/loa/prd.md` (Constructs Network Distribution Layer)
**Scope**: Phase 1 only — F1.1, F1.2, F1.5, F1.3, F1.4

---

## 1. Overview

Phase 1 fixes the plumbing between construct repos and the registry database. Five changes, all in existing files:

| ID | Change | Files | Lines |
|----|--------|-------|-------|
| F1.1 | Full manifest extraction | `scripts/seed-forge-packs.ts` | ~30 changed |
| F1.2 | Register 3 constructs | `scripts/seed-forge-packs.ts` | ~20 added |
| F1.5 | Extract The Easel | New repo `construct-the-easel` + seed entry | New repo + ~10 lines |
| F1.3 | Activate detect_state | `.claude/scripts/golden-path.sh` | ~40 added |
| F1.4 | Post-install hooks | `.claude/scripts/constructs-install.sh` | ~30 added |

No new tables. No new API routes. No new packages. The downstream consumers (explorer, CLI browse, golden path, workflow gate reader) already know how to read these fields — they just need the data.

---

## 2. Detailed Design

### 2.1 F1.1: Full Manifest Extraction in Seed Script

**File**: `scripts/seed-forge-packs.ts`

**Current problem** (lines 358-367):
```typescript
const manifest = {
  schema_version: pack.schema_version || 1,
  name: pack.name,
  slug: pack.slug,
  version: pack.version,
  description: pack.description,
  author: pack.author || '0xHoneyJar',
  license: pack.license || 'MIT',
  skills: pack.skillSlugs.map((s) => ({ slug: s, path: `skills/${s}` })),
};
```

This constructs a 7-field object and discards everything else from construct.yaml.

**Solution**: Parse the full YAML, validate with Zod, store the validated result.

#### 2.1.1 Changes to `discoverPacks()` (lines 148-227)

Replace the manual field extraction at lines 168-184 with full YAML parsing + Zod validation:

```typescript
// In the construct.yaml branch (line 166):
} else if (existsSync(constructYamlPath)) {
  const content = await readFile(constructYamlPath, 'utf-8');
  const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;

  // Validate with Zod — the shared schema is the single source of truth
  const validation = packManifestSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn(`   ⚠ ${slug}: manifest validation failed:`);
    for (const issue of validation.error.issues) {
      console.warn(`     - ${issue.path.join('.')}: ${issue.message}`);
    }
    // Fall back to partial manifest for backwards compatibility
    fullManifest = null;
    manifest = {
      schema_version: (parsed.schema_version as number) || 1,
      name: (parsed.name as string) || slug,
      slug: (parsed.slug as string) || slug,
      version: (parsed.version as string) || '1.0.0',
      description: (parsed.description as string) || '',
      author: parsed.author as string | undefined,
      license: parsed.license as string | undefined,
    };
  } else {
    fullManifest = validation.data;
    manifest = validation.data;
  }
}
```

**Import addition** (top of file):
```typescript
import { packManifestSchema } from '../packages/shared/src/validation.js';
```

#### 2.1.2 Changes to `DiscoveredPack` interface

Replace the minimal `PackManifest` interface (lines 69-79) with:

```typescript
import type { ValidatedPackManifest } from '../packages/shared/src/validation.js';

// DiscoveredPack now carries the full validated manifest when available
interface DiscoveredPack {
  // Core fields (always present)
  name: string;
  slug: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  schema_version: number;
  type?: string;
  // Full validated manifest (null if Zod validation failed — legacy format)
  fullManifest: ValidatedPackManifest | null;
  // Derived fields
  icon: string;
  skillSlugs: string[];
  packPath: string;
  constructType: string;
  identity?: IdentityData;
}
```

#### 2.1.3 Changes to manifest storage (lines 358-367)

Replace the 7-field construction with:

```typescript
// Store full manifest if validation passed, otherwise build minimal
const manifest = pack.fullManifest ?? {
  schema_version: pack.schema_version || 1,
  name: pack.name,
  slug: pack.slug,
  version: pack.version,
  description: pack.description,
  author: pack.author || '0xHoneyJar',
  license: pack.license || 'MIT',
  skills: pack.skillSlugs.map((s) => ({ slug: s, path: `skills/${s}` })),
};
```

The manifest stored in `pack_versions.manifest` JSONB becomes the full construct.yaml content when Zod-validated. All downstream consumers (`GET /v1/constructs/:slug`, explorer detail page, workflow gate reader) already destructure from this JSONB column.

#### 2.1.4 Content Hash Computation

Add after file collection (line 402):

```typescript
// Compute content hash: SHA-256 of manifest JSON + sorted file hashes
const manifestJson = JSON.stringify(manifest, null, 0);
const fileHashConcat = files.map(f => f.contentHash).sort().join('');
const contentHash = createHash('sha256')
  .update(manifestJson)
  .update(fileHashConcat)
  .digest('hex');
```

Store it in `pack_versions` (add to the INSERT at line 379):

```sql
content_hash = ${contentHash}
```

The `content_hash` column already exists in the schema (schema.ts line 592) — it's just never been populated.

#### 2.1.5 Dry-Run Mode

Add a `--dry-run` flag that validates all manifests against Zod without writing to the database:

```typescript
const DRY_RUN = process.argv.includes('--dry-run');
```

This allows testing manifest validation before switching to the full extraction. Critical for the migration — if any of the 6 existing manifests fail Zod validation, we need to fix them before deploying.

---

### 2.2 F1.2: Register 3 Ready Constructs

**File**: `scripts/seed-forge-packs.ts`

Add to `GIT_CONFIGS` (line 42):

```typescript
herald: {
  gitUrl: 'https://github.com/0xHoneyJar/construct-herald.git',
  gitRef: 'main',
},
hardening: {
  gitUrl: 'https://github.com/0xHoneyJar/construct-hardening.git',
  gitRef: 'main',
},
'dynamic-auth': {
  gitUrl: 'https://github.com/0xHoneyJar/construct-dynamic-auth.git',
  gitRef: 'main',
},
```

Add to `PACK_ICONS` (line 31):

```typescript
herald: '📢',
hardening: '🛡️',
'dynamic-auth': '🔐',
```

No other changes needed. The `discoverPacks()` function already handles cloning and manifest parsing generically.

**Pre-check**: Verify all 3 repos have `construct.yaml` at root level (confirmed by org-auditor). Verify manifests pass `packManifestSchema.safeParse()` via dry-run.

---

### 2.3 F1.5: Extract The Easel to Standalone Construct

**New repo**: `0xHoneyJar/construct-the-easel`

#### 2.3.1 Repo Structure

```
construct-the-easel/
├── construct.yaml          # v3 manifest
├── identity/
│   ├── persona.yaml        # Creative studio voice (domain-agnostic)
│   └── expertise.yaml      # Design vocabulary, visual direction, taste documentation
├── skills/
│   ├── grounding-creative/
│   │   ├── SKILL.md        # Generalized: reviews vocabulary + TDRs for any design area
│   │   └── index.yaml      # model_tier: sonnet, danger_level: safe
│   ├── exploring-visuals/
│   │   ├── SKILL.md        # Generalized: generates prompts grounded in project vocabulary
│   │   └── index.yaml
│   ├── capturing-results/
│   │   ├── SKILL.md        # Generalized: annotates results with vocabulary + TDR criteria
│   │   └── index.yaml
│   └── recording-taste/
│       ├── SKILL.md        # Generalized: TDR CRUD operations
│       └── index.yaml
├── contexts/
│   ├── vocabulary-template.md   # Empty 8-domain structure (no terms)
│   ├── tdr-template.md          # Blank Taste Decision Record template
│   └── quality-gates.md         # Generic Ground → Visualize → Tokenize → Implement gates
└── README.md
```

#### 2.3.2 construct.yaml

```yaml
schema_version: 3
name: "The Easel"
slug: "the-easel"
version: "1.0.0"
description: "Creative studio for aesthetic direction — vocabulary grounding, visual exploration, result capture, and taste decisions. Domain-agnostic: install and populate with your project's aesthetic vocabulary."
author: "0xHoneyJar"
license: "MIT"
type: "skill-pack"

skills:
  - slug: grounding-creative
    path: skills/grounding-creative
  - slug: exploring-visuals
    path: skills/exploring-visuals
  - slug: capturing-results
    path: skills/capturing-results
  - slug: recording-taste
    path: skills/recording-taste

identity:
  persona: identity/persona.yaml
  expertise: identity/expertise.yaml

domain:
  - design
  - aesthetics
  - visual-direction

expertise:
  - vocabulary-driven design
  - taste decision records
  - visual exploration
  - aesthetic direction

golden_path:
  commands:
    - name: ground
      description: "Review vocabulary and TDRs for a design area"
      truename_map:
        no_vocabulary: /grounding-creative
        vocabulary_ready: /grounding-creative
    - name: explore
      description: "Generate visual prompts grounded in vocabulary"
      truename_map:
        grounded: /exploring-visuals
    - name: capture
      description: "Annotate generation results with vocabulary terms"
      truename_map:
        explored: /capturing-results
    - name: record
      description: "Create or update a Taste Decision Record"
      truename_map:
        captured: /recording-taste

events:
  emits:
    - name: forge.easel.vocabulary_grounded
      description: "Vocabulary atlas reviewed and gaps identified"
    - name: forge.easel.taste_recorded
      description: "New TDR created or updated"
  consumes:
    - name: forge.artisan.taste_inscribed
      description: "Can ground visual exploration in Artisan taste tokens"

pack_dependencies:
  optional:
    - slug: artisan
      reason: "Taste token handoff — Easel TDRs can inform Artisan inscribed tokens"

workflow:
  depth: light
  gates:
    prd: skip
    sdd: skip
    sprint: skip
    implement: required
    review: visual
    audit: skip
```

#### 2.3.3 Skill Generalization Principles

Each SKILL.md must:

1. **Use context slots** for project-specific paths:
   - `{{grimoire_path}}` → defaults to `grimoires/the-easel/` if not set
   - `{{vocabulary_path}}` → defaults to `{{grimoire_path}}/vocabulary/atlas.md`
   - `{{tdr_path}}` → defaults to `{{grimoire_path}}/tdr/`
   - `{{generation_tool}}` → defaults to "your preferred image generation tool"

2. **Zero domain-specific references**: No cyberpunk, no FUI, no rektdrop, no Freeside Divergence. The skills describe the *process*, not any specific aesthetic.

3. **Ship empty templates**: `vocabulary-template.md` has the 8-domain structure with no terms. `tdr-template.md` is a blank TDR scaffold. Projects fill these in through the skills.

#### 2.3.4 Registry Wiring

Add to `seed-forge-packs.ts`:

```typescript
// GIT_CONFIGS
'the-easel': {
  gitUrl: 'https://github.com/0xHoneyJar/construct-the-easel.git',
  gitRef: 'main',
},

// PACK_ICONS
'the-easel': '🖼️',
```

#### 2.3.5 rektdrop-interface Update

After extraction:
1. Install The Easel from registry: `/constructs install the-easel`
2. Keep existing `grimoires/the-easel/` (16 TDRs, atlas, aesthetic-direction) — this is project state
3. Remove the embedded `.claude/constructs/packs/the-easel/` directory
4. Skills now load from the installed pack but read/write to the existing grimoire paths

---

### 2.4 F1.3: Activate detect_state in Golden Path

**File**: `.claude/scripts/golden-path.sh`

**Current** (lines 322-360): `golden_detect_construct_journeys()` builds journey bars from `golden_path.commands[].name` but ignores `detect_state`.

**Change**: After extracting command names, check for `detect_state` script. If present, execute it and mark the current position.

#### 2.4.1 Modified `golden_detect_construct_journeys()`

```bash
golden_detect_construct_journeys() {
    local packs_dir="${PROJECT_ROOT}/.claude/constructs/packs"
    [[ -d "$packs_dir" ]] || return 0

    if ! type safe_yq_to_json &>/dev/null; then
        return 0
    fi

    local manifest pack_name pack_dir commands_json detect_script current_state bar output=""
    for manifest in "$packs_dir"/*/construct.yaml "$packs_dir"/*/construct.yml; do
        [[ -f "$manifest" ]] || continue
        pack_dir="$(dirname "$manifest")"

        # Extract golden_path via yq→jq
        commands_json=$(safe_yq_to_json "$manifest" 2>/dev/null \
            | jq -c '.golden_path.commands // empty' 2>/dev/null) || continue
        [[ -z "$commands_json" || "$commands_json" == "null" ]] && continue

        pack_name=$(safe_yq '.name' "$manifest" 2>/dev/null) || continue
        [[ -z "$pack_name" ]] && continue

        # NEW: Execute detect_state script if declared
        current_state=""
        detect_script=$(safe_yq '.golden_path.detect_state' "$manifest" 2>/dev/null) || true
        if [[ -n "$detect_script" && "$detect_script" != "null" ]]; then
            local script_path="${pack_dir}/${detect_script}"
            if [[ -f "$script_path" && -x "$script_path" ]]; then
                current_state=$(cd "$pack_dir" && timeout 5 "$script_path" 2>/dev/null) || true
            fi
        fi

        # Build journey bar — mark current position with ●
        bar=""
        local first=true
        while IFS= read -r cmd_name; do
            [[ -z "$cmd_name" ]] && continue
            local is_current=false
            if [[ -n "$current_state" ]]; then
                local mapped
                mapped=$(echo "$commands_json" | jq -r \
                    --arg name "$cmd_name" --arg state "$current_state" \
                    '.[] | select(.name == $name) | .truename_map[$state] // empty' \
                    2>/dev/null) || true
                [[ -n "$mapped" ]] && is_current=true
            fi

            local segment="/$cmd_name"
            $is_current && segment="/$cmd_name ●"

            if $first; then
                bar="$segment"
                first=false
            else
                bar="$bar ━━━ $segment"
            fi
        done < <(echo "$commands_json" | jq -r '.[].name' 2>/dev/null)

        [[ -n "$bar" ]] && output="${output}  ${pack_name}: ${bar}"$'\n'
    done

    [[ -n "$output" ]] && printf "%s" "$output"
}
```

#### 2.4.2 detect_state Script Contract

A `detect_state` script must:
- Be executable (`chmod +x`)
- Print a single state string to stdout (e.g., `canvases_ready`, `grounded`, `no_vocabulary`)
- Exit 0 on success, non-zero to indicate "unknown state"
- Complete within 5 seconds
- Read from the project's grimoire/state files, never write

---

### 2.5 F1.4: Post-Install Hook Execution

**File**: `.claude/scripts/constructs-install.sh`

After pack file extraction completes (where symlinks are created for commands), add:

```bash
execute_post_install_hook() {
    local pack_dir="$1"
    local manifest="${pack_dir}/construct.yaml"
    [[ -f "$manifest" ]] || return 0

    if ! type safe_yq &>/dev/null 2>&1; then return 0; fi

    local hook_script
    hook_script=$(safe_yq '.hooks.post_install' "$manifest" 2>/dev/null) || return 0
    [[ -z "$hook_script" || "$hook_script" == "null" ]] && return 0

    local script_path="${pack_dir}/${hook_script}"

    # Security: validate script is within pack directory
    local real_script real_pack
    real_script=$(realpath "$script_path" 2>/dev/null) || return 0
    real_pack=$(realpath "$pack_dir" 2>/dev/null) || return 0
    if [[ "$real_script" != "$real_pack"* ]]; then
        echo "⚠ Post-install hook path traversal blocked: $hook_script" >&2
        return 0
    fi

    if [[ -f "$script_path" && -x "$script_path" ]]; then
        echo "  Running post-install hook..."
        if ! (cd "$pack_dir" && timeout 30 "$script_path" 2>&1); then
            echo "  ⚠ Post-install hook failed (non-blocking)" >&2
        fi
    fi
}
```

**Security constraints**:
- Path traversal prevention via `realpath` comparison
- 30-second timeout
- Executes in pack directory context
- Non-blocking — failure is a warning, not an error

---

## 3. Data Flow

### Before (Current)

```
construct.yaml (30 fields)
  → seed-forge-packs.ts (reads YAML)
    → manual extraction (7 fields)
      → pack_versions.manifest (7-field JSON)
        → API response (7 fields)
```

### After (Phase 1)

```
construct.yaml (30 fields)
  → seed-forge-packs.ts (reads YAML)
    → Zod validation (packManifestSchema)
      → pack_versions.manifest (full JSON) + content_hash
        → API response (full fields — no API changes needed)
        → golden-path.sh reads detect_state, executes script
        → construct-workflow-read.sh reads workflow.gates (already works)
```

---

## 4. Migration Strategy

### Step 1: Dry-Run Validation
Run `seed-forge-packs.ts --dry-run` against all 10 construct repos. Fix any manifests that fail Zod validation BEFORE deploying.

### Step 2: Deploy Seed Script
Update script, add 4 new GIT_CONFIGS entries, run against production DB.

### Step 3: Deploy CLI Changes
Update golden-path.sh and constructs-install.sh.

### Step 4: Verify End-to-End
- `/constructs browse` shows 10 packs
- `/constructs install herald` succeeds
- `/constructs install the-easel` succeeds
- `/loa` shows construct journey bars with `●` position indicator
- Explorer detail page shows golden_path, workflow, events, domain, expertise fields

---

## 5. Testing Strategy

| Test | Type | Validates |
|------|------|-----------|
| Zod validation of all 10 construct.yaml files | Unit | F1.1 — no manifest regressions |
| Seed script dry-run against prod clone | Integration | F1.1 — full manifest stored |
| Content hash determinism | Unit | F1.1 — same input = same hash |
| `golden_detect_construct_journeys` with mock detect_state | Unit | F1.3 — position indicator |
| detect_state timeout handling | Unit | F1.3 — slow scripts don't block |
| Post-install hook path traversal rejection | Unit | F1.4 — security enforced |
| Post-install hook timeout handling | Unit | F1.4 — slow hooks don't block |
| The Easel skills have zero cyberpunk references | Audit | F1.5 — domain-agnostic |
| The Easel context slots have sensible defaults | Audit | F1.5 — works without config |
| Full install → `/loa` → journey bar flow | E2E | All features integrated |

---

## 6. Files Modified

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/seed-forge-packs.ts` | Modified | Full manifest extraction, 4 new GIT_CONFIGS entries, content hash, dry-run mode |
| `.claude/scripts/golden-path.sh` | Modified | detect_state activation in `golden_detect_construct_journeys()` |
| `.claude/scripts/constructs-install.sh` | Modified | Post-install hook execution after extraction |
| `construct-the-easel/` (new repo) | Created | 4 generalized skills, construct.yaml v3, identity, empty templates |

**No changes to**:
- `packages/shared/src/types.ts` — types already declare all fields
- `packages/shared/src/validation.ts` — Zod schema already validates all fields
- `apps/api/src/routes/constructs.ts` — API already destructures from manifest JSONB
- `apps/api/src/db/schema.ts` — `content_hash` column already exists
- `apps/explorer/` — explorer already renders fields when present in API response

---

*"The data was always there. The pipe was just too narrow."*
