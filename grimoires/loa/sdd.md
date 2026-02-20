# SDD: Bridgebuilder Cycle A — Make the Workshop Work

**Cycle**: cycle-030
**Created**: 2026-02-19
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Grounded in**: Codebase audit (types.ts, validation.ts, construct.schema.json, pack-manifest.schema.json, construct-workflow-read.sh, construct-workflow-activate.sh, constructs.ts, browsing-constructs SKILL.md)

---

## 1. Executive Summary

This cycle extends the pack manifest schema with 6 new field groups (`domain`, `expertise`, `golden_path`, `workflow`, `methodology`, `tier`), synchronizes the TypeScript types with the Zod validation layer, and wires existing data through to where it matters — workflow gates for pipeline friction reduction and quick_start for post-install guidance.

The critical insight: **the runtime already supports workflow gates** (cycle-029). The constraint yielding scripts (`construct-workflow-read.sh`, `construct-workflow-activate.sh`) read `workflow.gates` from manifest JSON via `jq -e '.workflow // empty'` and enforce them through `skip_when` conditions in command pre-flight checks. The only missing piece is the manifest declaration and schema validation. This SDD connects that last wire.

**Change surface**: 2 TypeScript/Zod files, 2 JSON schemas, 1 SKILL.md, 1 new test file. External: 5 construct-* repo manifest updates (documented here, shipped separately).

---

## 2. System Architecture

### 2.1 Schema Layer Stack

Four files define the manifest contract. All four must stay in sync.

```
┌─────────────────────────────────────┐
│  TypeScript Types                    │  packages/shared/src/types.ts:219-271
│  PackManifest interface              │  → Used by API, Explorer, CLI
└──────────────┬──────────────────────┘
               │ must match
┌──────────────▼──────────────────────┐
│  Zod Validation                      │  packages/shared/src/validation.ts:216-271
│  packManifestSchema                  │  → Runtime validation in API
│  .passthrough() at end               │  → Type inference: ValidatedPackManifest
└──────────────┬──────────────────────┘
               │ must match
┌──────────────▼──────────────────────┐
│  JSON Schema: pack-manifest          │  .claude/schemas/pack-manifest.schema.json
│  additionalProperties: false         │  → CI validation of installed pack manifest.json
└──────────────┬──────────────────────┘
               │ superset of
┌──────────────▼──────────────────────┐
│  JSON Schema: construct              │  .claude/schemas/construct.schema.json
│  additionalProperties: false         │  → CI validation of construct.yaml in repos
│  Has: identity, hooks, events,       │
│       pack_dependencies, repository  │
└─────────────────────────────────────┘
```

**Key constraint**: Both JSON schemas use `additionalProperties: false`. New fields MUST be explicitly added or validation will reject them. The Zod schema uses `.passthrough()` which is more lenient, but the JSON schemas are the hard gate in CI.

### 2.2 Runtime Data Flow (Workflow Gates)

```
construct-* repo manifest.json
  └── workflow.gates declaration (FR-3, this cycle adds)
        │
        ▼  (on install, synced to .claude/constructs/packs/<slug>/manifest.json)
construct-workflow-read.sh          ← validates gates via jq
  │ Exit 0: valid | Exit 1: no workflow | Exit 2: validation error
  ▼  (on skill invocation)
construct-workflow-activate.sh      ← writes .run/construct-workflow.json
        │
        ├── audit-sprint.md   → skip_when: construct_gate: "review"
        ├── review-sprint.md  → skip_when: construct_gate: "sprint"
        └── constraints.json  → C-PROC-001/003/004/008 construct_yield
```

**No runtime script changes needed.** All gate fields are optional in schema validation. When `workflow` is declared but a specific gate is omitted, the runtime applies full-pipeline defaults (Flatline IMP-004):

| Omitted gate | Runtime behavior | Why |
|--------------|-----------------|-----|
| `prd` | Full PRD required | Fail-closed: missing gate = maximum friction |
| `sdd` | Full SDD required | Same |
| `sprint` | Full sprint required | Same |
| `implement` | `required` (always) | Cannot be omitted or skipped — `construct-workflow-read.sh:82-84` |
| `review` | `both` (visual + textual) | Fail-closed |
| `audit` | `full` | Fail-closed |

This fail-closed default is enforced at `construct-workflow-read.sh:148` — any parse error or missing field cascades to exit 1, which the activation script treats as "no workflow override → run full pipeline." Tests must verify this behavior explicitly.

The reader at `construct-workflow-read.sh:17-25` expects exactly these values:
- depth: `light | standard | deep | full`
- gates.prd/sdd/sprint: `skip | full` (see note on `condense` below)
- gates.implement: `required` (rejects `skip` at line 82-84)
- gates.review: `skip | visual | textual | both`
- gates.audit: `skip | lightweight | full`
- verification.method: `visual | tsc | build | test | manual`

**`condense` gate value** (Flatline IMP-002): The runtime accepts `condense` but treats it as `full` with an advisory warning (`construct-workflow-read.sh:67`). To avoid a semantic footgun where manifest authors rely on behavior that doesn't exist:
- **Schema**: Accept `skip | condense | full` (forward-compatible for when condense is implemented)
- **Manifests this cycle**: Use only `skip` or `full` — no construct declares `condense`
- **Documentation**: Each manifest's gate comment explains the available values and notes condense is reserved
- **Test**: Add a test asserting `condense` is accepted by validation but triggers the runtime advisory

### 2.3 Post-Install Data Flow (Quick Start)

```
constructs-install.sh pack <slug>
  └── installs manifest to .claude/constructs/packs/<slug>/manifest.json
        │
        ▼  (browsing-constructs SKILL.md Phase 6)
Read manifest.json → extract quick_start → display "Start here: /{command}"
```

---

## 3. Component Design

### 3.1 FR-1 + FR-2: Schema Extension & TS/Zod Synchronization

Combined because they touch the same two files and should be done atomically.

#### 3.1.1 TypeScript Types (`packages/shared/src/types.ts`)

**Current state**: 20 fields in `PackManifest` (lines 219-271). Missing 6 new field groups + 6 fields Zod has but TS doesn't.

**Full updated interface**:

```typescript
export interface PackManifest {
  // === Existing fields (some with type corrections from FR-2) ===
  name: string;
  slug: string;
  version: string;
  description?: string;
  long_description?: string;                    // ADD: Zod has at validation.ts:222
  author?: string | {                           // CHANGE: was object-only, Zod allows union
    name: string;
    email?: string;
    url?: string;
  };
  license?: string;
  repository?: string;                          // ADD: Zod has at validation.ts:225
  homepage?: string;                            // ADD: Zod has at validation.ts:226
  documentation?: string;                       // ADD: Zod has at validation.ts:227
  skills?: Array<{ slug: string; path: string }>;
  commands?: Array<{ name: string; path: string }>;
  protocols?: Array<{ name: string; path: string }>;
  dependencies?: {
    loa_version?: string;                       // KEEP name (Zod's `loa` renamed to match)
    skills?: Record<string, string>;            // CHANGE: from string[] to Record<string, string>
    packs?: Record<string, string>;             // CHANGE: from string[] to Record<string, string>
  };
  pricing?: {
    type: string;
    tier: string;
  };
  tags?: string[];
  keywords?: string[];                          // ADD: Zod has at validation.ts:245
  engines?: {                                   // ADD: Zod has at validation.ts:248-253
    loa?: string;
    node?: string;
  };
  claude_instructions?: string;
  schema_version?: number;
  tools?: Record<string, {
    install?: string;
    required?: boolean;
    purpose: string;
    check: string;
    docs_url?: string;
  }>;
  mcp_dependencies?: Record<string, {
    required?: boolean;
    required_scopes?: string[];
    reason: string;
    fallback?: string;
  }>;
  quick_start?: {
    command: string;
    description: string;
  };

  // === NEW: Bridgebuilder fields (FR-1, cycle-030) ===

  /** Domain tags for MoE routing (#119) */
  domain?: string[];

  /** Expertise declarations for intent matching (#119) */
  expertise?: string[];

  /** Golden path porcelain commands (#119, #127) */
  golden_path?: {
    commands: Array<{
      name: string;
      description: string;
      truename_map?: Record<string, string>;
    }>;
    detect_state?: string;
  };

  /** Workflow depth and gate declarations (#129) — consumed by construct-workflow-read.sh */
  workflow?: {
    depth: 'light' | 'standard' | 'deep' | 'full';
    app_zone_access?: boolean;
    gates: {
      prd?: 'skip' | 'condense' | 'full';
      sdd?: 'skip' | 'condense' | 'full';
      sprint?: 'skip' | 'condense' | 'full';
      implement?: 'required';
      review?: 'skip' | 'visual' | 'textual' | 'both';
      audit?: 'skip' | 'lightweight' | 'full';
    };
    verification?: {
      method: 'visual' | 'tsc' | 'build' | 'test' | 'manual';
    };
  };

  /** Methodology layer for knowledge separation (#118) */
  methodology?: {
    references?: string[];
    principles?: string[];
    knowledge_base?: string;
  };

  /** Construct capability tier (#128) */
  tier?: 'L1' | 'L2' | 'L3';
}
```

**Design decisions**:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `dependencies.loa_version` naming | Keep `loa_version`, rename Zod's `loa` | More explicit; matches pack-manifest.schema.json:118 |
| `dependencies.skills` type | `Record<string, string>` | Adopt Zod's form (slug → version range). No existing manifests populate this field. |
| `author` type | `string \| object` | Adopt Zod's union. Allows shorthand. |
| `workflow.depth` values | 4 literal values | Match `construct-workflow-read.sh:18` |
| `workflow.gates.implement` | Literal `'required'` only | Match runtime: `construct-workflow-read.sh:82-84` rejects `skip` |
| All new fields optional | Yes | Zero barrier. PRD NF-1. |

#### 3.1.2 Zod Validation (`packages/shared/src/validation.ts`)

**New helper schemas** (insert before `packManifestSchema` at line 216):

```typescript
// ── Bridgebuilder schemas (cycle-030, FR-1) ──────────────────

export const goldenPathCommandSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  truename_map: z.record(z.string().max(100)).optional(),
});

export const goldenPathSchema = z.object({
  commands: z.array(goldenPathCommandSchema).min(1),
  detect_state: z.string().max(500).optional(),
});

const planGateSchema = z.enum(['skip', 'condense', 'full']);
const reviewGateSchema = z.enum(['skip', 'visual', 'textual', 'both']);
const auditGateSchema = z.enum(['skip', 'lightweight', 'full']);

export const workflowGatesSchema = z.object({
  prd: planGateSchema.optional(),
  sdd: planGateSchema.optional(),
  sprint: planGateSchema.optional(),
  implement: z.literal('required').optional(),
  review: reviewGateSchema.optional(),
  audit: auditGateSchema.optional(),
});

export const workflowVerificationSchema = z.object({
  method: z.enum(['visual', 'tsc', 'build', 'test', 'manual']),
});

export const workflowSchema = z.object({
  depth: z.enum(['light', 'standard', 'deep', 'full']),
  app_zone_access: z.boolean().optional(),
  gates: workflowGatesSchema,
  verification: workflowVerificationSchema.optional(),
});

export const methodologySchema = z.object({
  references: z.array(z.string().max(500)).max(20).optional(),
  principles: z.array(z.string().max(200)).max(20).optional(),
  knowledge_base: z.string().max(500).optional(),
});

export const tierSchema = z.enum(['L1', 'L2', 'L3']);
```

**Additions to `packManifestSchema`** (inside the z.object before `.passthrough()`):

```typescript
  // Bridgebuilder fields (cycle-030)
  domain: z.array(z.string().max(50)).max(10).optional(),
  expertise: z.array(z.string().max(100)).max(20).optional(),
  golden_path: goldenPathSchema.optional(),
  workflow: workflowSchema.optional(),
  methodology: methodologySchema.optional(),
  tier: tierSchema.optional(),
```

**FR-2 fix** — rename `loa` to `loa_version` in `packDependenciesSchema` (line 177):

```typescript
// Before:
export const packDependenciesSchema = z.object({
  loa: z.string().optional(),
  skills: z.record(z.string()).optional(),
  packs: z.record(z.string()).optional(),
});

// After:
export const packDependenciesSchema = z.object({
  loa_version: z.string().optional(),
  skills: z.record(z.string()).optional(),
  packs: z.record(z.string()).optional(),
});
```

**New type exports** (append at bottom of file):

```typescript
export type GoldenPathCommand = z.infer<typeof goldenPathCommandSchema>;
export type GoldenPath = z.infer<typeof goldenPathSchema>;
export type WorkflowGates = z.infer<typeof workflowGatesSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Methodology = z.infer<typeof methodologySchema>;
export type Tier = z.infer<typeof tierSchema>;
```

#### 3.1.3 JSON Schema: pack-manifest (`pack-manifest.schema.json`)

**Current state**: `additionalProperties: false`, 283 lines. No workflow/domain/expertise.

**Add to `properties` object** (all optional — NOT added to `required`):

```json
"workflow": {
  "type": "object",
  "required": ["depth", "gates"],
  "properties": {
    "depth": {
      "type": "string",
      "enum": ["light", "standard", "deep", "full"]
    },
    "app_zone_access": {
      "type": "boolean"
    },
    "gates": {
      "type": "object",
      "properties": {
        "prd":       { "type": "string", "enum": ["skip", "condense", "full"] },
        "sdd":       { "type": "string", "enum": ["skip", "condense", "full"] },
        "sprint":    { "type": "string", "enum": ["skip", "condense", "full"] },
        "implement": { "type": "string", "enum": ["required"] },
        "review":    { "type": "string", "enum": ["skip", "visual", "textual", "both"] },
        "audit":     { "type": "string", "enum": ["skip", "lightweight", "full"] }
      },
      "additionalProperties": false
    },
    "verification": {
      "type": "object",
      "properties": {
        "method": { "type": "string", "enum": ["visual", "tsc", "build", "test", "manual"] }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
},
"domain": {
  "type": "array",
  "items": { "type": "string", "maxLength": 50 },
  "maxItems": 10
},
"expertise": {
  "type": "array",
  "items": { "type": "string", "maxLength": 100 },
  "maxItems": 20
},
"golden_path": {
  "type": "object",
  "required": ["commands"],
  "properties": {
    "commands": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "truename_map": {
            "type": "object",
            "additionalProperties": { "type": "string" }
          }
        },
        "additionalProperties": false
      },
      "minItems": 1
    },
    "detect_state": { "type": "string" }
  },
  "additionalProperties": false
},
"methodology": {
  "type": "object",
  "properties": {
    "references": { "type": "array", "items": { "type": "string" }, "maxItems": 20 },
    "principles": { "type": "array", "items": { "type": "string" }, "maxItems": 20 },
    "knowledge_base": { "type": "string" }
  },
  "additionalProperties": false
},
"tier": {
  "type": "string",
  "enum": ["L1", "L2", "L3"]
}
```

**Also add `quick_start` to `pack-manifest.schema.json`** (Flatline IMP-005 — already in `construct.schema.json:181` but missing from pack-manifest):

```json
"quick_start": {
  "type": "object",
  "required": ["command", "description"],
  "properties": {
    "command": { "type": "string" },
    "description": { "type": "string" }
  },
  "additionalProperties": false
}
```

Without this, any manifest declaring `quick_start` fails CI because `pack-manifest.schema.json` uses `additionalProperties: false`.

#### 3.1.4 JSON Schema: construct (`construct.schema.json`)

Same new properties added to `construct.schema.json`. All optional. Schema_version minimum stays at 3.

#### 3.1.5 Dependencies Schema Alignment (Flatline IMP-001)

Three different `dependencies` representations exist. **This cycle resolves the divergence.**

| Layer | skills (before) | skills (after) | loa field |
|-------|----------------|----------------|-----------|
| TS types | `string[]` | `Record<string, string>` | `loa_version` |
| Zod | `z.record(z.string())` | `z.record(z.string())` (unchanged) | `loa_version` |
| pack-manifest.schema.json | `array of string` | `oneOf: [array, object]` | `loa_version` |

**JSON Schema update** — update `pack-manifest.schema.json` `dependencies.skills` to accept both forms during migration:

```json
"skills": {
  "oneOf": [
    { "type": "array", "items": { "type": "string" }, "description": "DEPRECATED: skill slugs as array" },
    { "type": "object", "additionalProperties": { "type": "string" }, "description": "Skill slug → version range" }
  ]
}
```

This accepts both `["observer"]` (v3 form) and `{"observer": ">=1.0.0"}` (v4 form). Construct repos migrate to object form when bumping to `schema_version: 4`.

**Sunset schedule** (Flatline SKP-001): The array form is deprecated as of this cycle. Removal timeline:
- **Cycle A (this cycle)**: `oneOf` accepts both forms. Array form emits deprecation warning in validation output.
- **Cycle B**: All construct-* repos migrated to object form. Array form removal PR prepared.
- **Post-Cycle B**: `oneOf` replaced with object-only schema. Array form rejected by CI.

---

### 3.2 FR-3: Workflow Gates in Pack Manifests

#### 3.2.1 Runtime Integration (Already Done — No Changes)

Cycle-029 runtime reads `workflow.gates` via:
1. `construct-workflow-read.sh` — `jq -e '.workflow // empty'` from manifest
2. `construct-workflow-activate.sh` — writes `.run/construct-workflow.json`
3. Command pre-flights — `skip_when.construct_gate` in `audit-sprint.md`, `review-sprint.md`
4. `constraints.json` — `construct_yield` on C-PROC-001, C-PROC-003, C-PROC-004, C-PROC-008

The format we declare matches exactly what the runtime validates.

#### 3.2.2 Manifest Declarations (5 construct-* repos)

Each repo adds `workflow` + `quick_start` to `manifest.json`. Gate values from PRD §FR-3, aligned with runtime constants at `construct-workflow-read.sh:17-25`.

**Observer** (`construct-observer/manifest.json`):
```json
"workflow": {
  "depth": "light",
  "gates": {
    "prd": "skip", "sdd": "skip", "sprint": "full",
    "implement": "required", "review": "textual", "audit": "lightweight"
  },
  "verification": { "method": "manual" }
},
"quick_start": {
  "command": "/observe",
  "description": "Capture your first user insight. Everything else builds on this."
}
```

**Artisan** (`construct-artisan/manifest.json`):
```json
"workflow": {
  "depth": "light",
  "app_zone_access": true,
  "gates": {
    "prd": "skip", "sdd": "skip", "sprint": "full",
    "implement": "required", "review": "visual", "audit": "skip"
  },
  "verification": { "method": "visual" }
},
"quick_start": {
  "command": "/taste",
  "description": "Define the visual taste of your project. All design flows from here."
}
```

**Crucible** (`construct-crucible/manifest.json`):
```json
"workflow": {
  "depth": "deep",
  "gates": {
    "prd": "full", "sdd": "full", "sprint": "full",
    "implement": "required", "review": "both", "audit": "full"
  },
  "verification": { "method": "test" }
},
"quick_start": {
  "command": "/test-plan",
  "description": "Map your first quality gate. Validation starts with knowing what to test."
}
```

**Beacon** (`construct-beacon/manifest.json`):
```json
"workflow": {
  "depth": "standard",
  "gates": {
    "prd": "full", "sdd": "skip", "sprint": "full",
    "implement": "required", "review": "textual", "audit": "lightweight"
  },
  "verification": { "method": "build" }
},
"quick_start": {
  "command": "/deploy-production",
  "description": "Set up your production infrastructure. Ship with confidence."
}
```

**GTM-Collective** (`construct-gtm-collective/manifest.json`):
```json
"workflow": {
  "depth": "light",
  "gates": {
    "prd": "skip", "sdd": "skip", "sprint": "skip",
    "implement": "required", "review": "textual", "audit": "skip"
  },
  "verification": { "method": "manual" }
},
"quick_start": {
  "command": "/gtm-setup",
  "description": "Initialize your go-to-market strategy. Position before you promote."
}
```

**Gate rationale**:

| Pack | Why these gates |
|------|-----------------|
| Observer | Research skills don't produce app code. PRD/SDD overkill. Textual review catches methodology errors. |
| Artisan | Design needs visual review but not architecture docs. UI verified visually. `app_zone_access: true` because it writes styles/components. |
| Crucible | Testing IS the quality gate — needs full pipeline depth. |
| Beacon | Deploy scripts need review but SDD overhead unnecessary for operational changes. |
| GTM-Collective | Marketing artifacts don't need architecture review. Lightest pipeline. |

#### 3.2.3 Cross-Repo Coordination Sequence

1. **loa-constructs**: Ship schema extension (FR-1 + FR-2) → merge to main
2. **construct-* repos**: Each adds `workflow` + `quick_start` to `manifest.json` (independent PRs)
3. **Registry sync**: Updated manifests flow via existing git-sync webhooks

Construct-* repos do NOT import from `packages/shared`. Their manifests validate against JSON Schemas in `.claude/schemas/`. The TS/Zod layer serves API and explorer only.

---

### 3.3 FR-4: Post-Install Quick Start

#### 3.3.1 Change Location

File: `.claude/skills/browsing-constructs/SKILL.md` — Phase 6 (Report Results), around line 246.

**Current output**:
```
✅ Observer (6 skills installed)
   Commands: /interview, /persona, /journey, ...
```

**Target output**:
```
✅ Observer (6 skills installed)

   ▸ Start here: /observe
     "Capture your first user insight. Everything else builds on this."

   Commands: /interview, /persona, /journey, ...
```

#### 3.3.2 Implementation

Add to Phase 6 report instructions:

```
For each installed pack:
  1. Read manifest at .claude/constructs/packs/<slug>/manifest.json
  2. If manifest has quick_start:
     Display: "▸ Start here: {quick_start.command}"
     Display: "  \"{quick_start.description}\""
  3. Else if manifest has golden_path.commands[0]:
     Display: "▸ Start here: {golden_path.commands[0].name}"
     Display: "  \"{golden_path.commands[0].description}\""
  4. Else: current behavior (flat command list only)
  5. Display command list as before
```

#### 3.3.3 System Zone Decision

`browsing-constructs` is System Zone (`.claude/skills/`). We are the upstream maintainer of Loa. The change is small, additive, and correct. Edit SKILL.md directly — propagates to all projects via `/update-loa`.

---

### 3.4 FR-5: Schema Version Migration

#### 3.4.1 Version Strategy

| Schema Layer | Current | Change |
|-------------|---------|--------|
| Zod `schema_version` | `z.number().int().min(1).default(1)` | No change — already accepts 1-∞ |
| construct.schema.json | `"minimum": 3` | No change — construct repos stay v3+ |
| pack-manifest.schema.json | No `schema_version` field | No change |
| TS types | `schema_version?: number` | No change |

The version bump is in the **manifests themselves**, not the validation layer. Each construct-* repo bumps to `"schema_version": 4` when adding workflow gates. Existing v3 manifests without new fields remain valid.

---

## 4. Testing Strategy

### 4.1 New Test File: `packages/shared/src/__tests__/pack-manifest.test.ts`

No tests exist today for the shared package. This cycle creates the first test file using Vitest.

#### Schema Extension Tests (FR-1)

```
✓ accepts manifest with all new fields
✓ accepts manifest without any new fields (backward compat)
✓ accepts manifest with only workflow
✓ rejects invalid tier value ("L4")
✓ rejects invalid workflow.depth ("extreme")
✓ rejects invalid workflow.gates.prd ("partial")
✓ rejects workflow.gates.implement as "skip"
✓ accepts workflow.gates with partial gates (only prd + implement)
✓ rejects golden_path with empty commands array
✓ accepts golden_path with truename_map
✓ accepts methodology with partial sub-fields
```

#### TS/Zod Sync Tests (FR-2)

```
✓ accepts dependencies with Record<string, string> skills
✓ accepts author as string shorthand
✓ accepts author as object
✓ accepts long_description, repository, homepage, documentation
✓ accepts keywords array
✓ accepts engines object
✓ dependencies.loa_version accepted
```

#### Backward Compatibility Tests

```
✓ existing v3 manifest (minimal fields) passes validation
✓ existing v3 manifest (full fields) passes validation
✓ schema_version defaults to 1 when absent
✓ .passthrough() allows unknown fields
```

#### Fail-Closed Integration Tests (Flatline SKP-003)

```
✓ manifest with malformed workflow JSON → full pipeline (not crash)
✓ manifest with workflow but missing gates object → full pipeline
✓ manifest with unknown gate value → validation error, runtime falls back to full
✓ manifest with no workflow key at all → full pipeline (exit 1 path)
```

These tests invoke `construct-workflow-read.sh` directly with crafted manifests and assert exit codes + fallback behavior, proving the fail-closed claim end-to-end.

#### Workflow Gate Contract Tests (FR-3)

```
✓ Observer workflow gates are valid
✓ Artisan workflow gates are valid
✓ GTM-Collective light workflow is valid
✓ Crucible deep workflow is valid
```

### 4.2 Integration Verification

```
✓ pnpm --filter shared build succeeds
✓ pnpm --filter api build succeeds
✓ pnpm --filter explorer build succeeds
✓ scripts/validate-topology.sh --strict passes
✓ construct-workflow-read.sh parses new manifest format
```

---

## 5. Data Architecture

No database changes. New manifest fields are stored in the existing `manifest` JSONB column in the `packs` table. JSONB accepts arbitrary JSON, so new fields store automatically on next sync.

The `construct_identities` table (`apps/api/src/db/schema.ts:1133-1152`) is unchanged.

---

## 6. Security Architecture

### 6.1 Workflow Gate Security (Inherited from Cycle-029)

| Invariant | Enforcement | Source |
|-----------|-------------|--------|
| Only installed packs activate | Manifest path must be within `.claude/constructs/packs/` | `construct-workflow-activate.sh` realpath check |
| `implement: required` enforced | Reader rejects `skip` with exit 2 | `construct-workflow-read.sh:82-84` |
| Fail-closed | Parse errors → exit 1 → full pipeline | `construct-workflow-read.sh:148` |
| Observable | Every activation logged to `.run/audit.jsonl` | `construct-workflow-activate.sh` |

### 6.2 Schema Validation Security

| Risk | Mitigation |
|------|-----------|
| Manifest with `implement: "skip"` | Three-layer defense: Zod `z.literal('required')`, JSON Schema `"enum": ["required"]`, runtime script exit 2. |
| Oversized arrays | Zod `max(10)`/`max(20)` + JSON Schema `maxItems`. |
| String injection | Manifests consumed by CLI/API, not injected into HTML. Explorer doesn't render these fields this cycle. |

---

## 7. Deployment Architecture

### 7.1 Release Sequence

```
Phase 1: loa-constructs PR (this cycle)
├── packages/shared/src/types.ts              — TS type changes
├── packages/shared/src/validation.ts         — Zod schema + new helpers
├── packages/shared/src/__tests__/
│   └── pack-manifest.test.ts                 — New test file
├── .claude/schemas/pack-manifest.schema.json — JSON Schema: new fields
├── .claude/schemas/construct.schema.json     — JSON Schema: new fields
└── .claude/skills/browsing-constructs/SKILL.md — Post-install quick_start

Phase 2: construct-* repos (5 parallel PRs, after Phase 1 merges)
├── construct-observer/manifest.json          — workflow + quick_start
├── construct-artisan/manifest.json           — workflow + quick_start
├── construct-crucible/manifest.json          — workflow + quick_start
├── construct-beacon/manifest.json            — workflow + quick_start
└── construct-gtm-collective/manifest.json    — workflow + quick_start
```

### 7.2 CI Impact

- `pnpm --filter shared test` — new tests (must pass)
- `pnpm --filter shared build` — TS compilation (must pass)
- `scripts/validate-topology.sh --strict` — validates against updated schemas (must pass)
- No infrastructure changes.

### 7.3 Rollback Strategy (Flatline IMP-003)

| Failure | Rollback |
|---------|----------|
| TS/Zod changes break API build | Revert `types.ts` + `validation.ts` commits. New fields are purely additive — removing them restores baseline. |
| JSON Schema changes break CI for existing manifests | Revert `pack-manifest.schema.json` + `construct.schema.json`. Existing manifests never had new fields, so only new-field manifests break (which haven't shipped). |
| `dependencies` `oneOf` causes unexpected validation behavior | Revert to array-only form. No existing manifest uses `Record` form yet. |
| Construct-* manifest causes runtime error | Remove `workflow` key from that repo's `manifest.json`. Runtime gracefully falls back to full pipeline when `workflow` is absent (`construct-workflow-read.sh` exits 1 → full pipeline). |
| browsing-constructs SKILL.md regression | Revert single file. Post-install gracefully ignores missing `quick_start` (conditional display). |

**Critical invariant**: All changes are additive. No existing behavior changes for manifests that omit the new fields. Rollback is always "remove what was added."

---

## 8. Open Questions Resolution

| # | Question | Resolution |
|---|----------|------------|
| Q1 | Does cycle-029 runtime read workflow.gates from manifest JSON directly? | **YES.** `construct-workflow-read.sh` uses `jq -e '.workflow // empty'` on manifest.json. Gate values validated against constants at lines 17-25. Format matches our declarations exactly. No runtime changes needed. |
| Q2 | Should browsing-constructs changes go through Loa upstream PR? | **NO.** We are upstream. Edit SKILL.md directly. Propagates via `/update-loa`. |
| Q3 | How do construct-* repos reference updated shared types? | **They don't.** Construct repos validate against JSON Schemas in `.claude/schemas/`, not TS/Zod. The shared package serves API/Explorer only. |

---

## 9. Technical Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JSON Schema `additionalProperties: false` rejects manifests with new fields before schema ships | Low | High | Schema changes ship before any manifest uses new fields. |
| `dependencies` type change breaks API | Low | Medium | `.passthrough()` tolerates both forms. No existing manifest populates `dependencies.skills`. |
| `condense` gates not functional at runtime | Known | Low | Runtime logs advisory: "condense treated as full" (`construct-workflow-read.sh:67`). Documented. |
| No existing test infrastructure | Known | Medium | Create vitest config for shared package. One-time setup cost. |
| Cross-repo coordination delay | Medium | Medium | FR-1/FR-2 ship independently. FR-3 manifests are parallel work in each repo. |
| Cross-layer schema drift (Flatline SKP-002a/b) | Medium | Medium | No automated test validates all 4 layers declare identical fields. Today: `validate-topology.sh` checks JSON schemas, `pnpm build` checks TS/Zod. **Cycle B**: Add cross-layer consistency test that extracts field names from all 4 sources and asserts parity. |

---

## 10. Sprint Breakdown

**Sprint 1** (Schema Foundation — all P0):
1. Set up vitest for `packages/shared` (one-time)
2. FR-2: TS/Zod synchronization (clean baseline first)
3. FR-1: Add Bridgebuilder fields to all 4 schema layers
4. FR-5: Document version bump (manifests themselves bump on update)
5. Write and run all tests
6. Verify builds: `pnpm --filter shared build`, `pnpm --filter api build`

**Sprint 2** (Wiring — P0/P1):
1. FR-4: Update browsing-constructs SKILL.md Phase 6
2. FR-3: Prepare exact manifest JSON for each construct-* repo
3. Integration: `validate-topology.sh --strict`, `construct-workflow-read.sh` with new format
4. PR creation and review

---

*"The runtime is waiting. The manifests just need to declare what they want."*
