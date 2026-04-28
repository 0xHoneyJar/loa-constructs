# ARCH + BUILD: Composition Schema Sync (cycle-002 followup)

> **Mode**: ARCH (Ostrom) + craft lens (Alexander minimal)
> **Date**: 2026-04-25
> **Authors**: cycle-002 followup convergence (operator + Claude Opus 4.7)
> **Kickoff**: this is the spec for the dedicated session that fixes composition.schema.json sync drift relative to loa-compositions YAMLs

---

## TL;DR

The cycle-002 followup added four schema-shaped fields to `loa-compositions` YAMLs (`vocabulary_governance`, `surface_class`, `thinking_effort`, `codex_mode`) over PRs #4–#7 plus three new compositions (hibernate-product, ground-and-craft, feel-iterate). **None of those updated `composition.schema.json` in `loa-constructs`.** The schema's `additionalProperties: false` makes today's loa-compositions YAMLs technically schema-invalid; no CI catches the drift because no validation runs against schema in either repo.

**This is a synchronization problem, not an ownership problem.** The earlier framing ("move the schema to loa-compositions") was reconsidered after Phase 1 dig surfaced that:
- composition.schema.json is one of a coherent **schema family** (prd / sdd / sprint / trajectory / composition) in loa-constructs/.claude/schemas/
- loa-constructs IS the engine that validates these documents — schemas are engine-side contracts, not registry-owned
- The friction is "YAML drifted from schema and nothing caught it," not "schema lives in the wrong repo"

**Fix:** keep the schema in `loa-constructs`, bump it to v1.1 with the cycle-002 fields added explicitly, and add CI in `loa-compositions` that fetches the public `$id` URL and validates every YAML on PR.

---

## Invariants (Ostrom)

What MUST NOT CHANGE:

1. **The schema family in `loa-constructs/.claude/schemas/` stays cohesive.** All five canonical doc-type schemas (prd / sdd / sprint / trajectory-entry / composition) live together. No asymmetric extraction.
2. **Public `$id` URL is the authoritative reference.** `https://loa.dev/schemas/composition.schema.json` is how external consumers (loa-compositions CI, future Herald composition tooling, third-party engines) reach the contract. Don't break the URL.
3. **`loa-compositions` is a registry of YAMLs, not a schema authority.** It conforms to the upstream contract; it doesn't author it.
4. **Backward compatibility for existing loa-compositions YAMLs.** PRs #2–#7 shipped 7 compositions already. Schema bump must NOT invalidate any of them (additive changes only).
5. **Engine reads schema, doesn't own its evolution.** When loa-compositions PRs add new YAML shapes, the schema in loa-constructs catches up via PR; the schema is the consensus contract, not unilateral.

---

## Blast Radius

| Artifact | Change | Risk |
|---|---|---|
| `loa-constructs/.claude/schemas/composition.schema.json` | Bump to v1.1, add 4 new top-level / per-stage field shapes | LOW — additive only; existing fields unchanged |
| `loa-constructs/.claude/schemas/README.md` | Document the v1.1 additions | LOW — docs |
| `loa-constructs/grimoires/compositions/*.yaml` | (None — internal canonical compositions don't use the new fields yet) | NONE |
| `loa-compositions/.github/workflows/validate-schema.yml` | NEW — fetches `$id` URL + validates all YAMLs | LOW — pure CI add |
| `loa-compositions/scripts/validate-yaml.ts` | NEW — local equivalent for `bun run validate` | LOW — new file |
| `loa-compositions/package.json` | Add `validate` script + `ajv` / `js-yaml` devDeps | LOW — new deps in devDependencies |
| `loa-compositions/README.md` | Update schema badge from `1.0` → `1.1` and link | COSMETIC |
| `loa-compositions/compositions/**/*.yaml` (~10 files) | Bump `schema_version: "1.0"` → `"1.1"` field | LOW — one-line change per file |
| `loa-constructs/grimoires/loa/tracks/session-1-composition-schema-sync-kickoff.md` | NEW — session continuity record | NONE |

**What breaks if wrong:** If schema bump is non-backward-compatible, all 10 loa-compositions YAMLs fail validation immediately on next CI run. Reversibility: revert the schema PR; YAMLs continue working without validation. Low total risk because no production system depends on schema validation today (this PR introduces validation FOR THE FIRST TIME).

---

## Data Architecture

```
                                  ┌──────────────────────────────┐
                                  │  loa-constructs (engine)     │
                                  │  ─────────────────────────   │
                                  │  .claude/schemas/             │
                                  │    composition.schema.json    │ ← SOURCE OF TRUTH
                                  │    (v1.1, additive cycle-002) │
                                  │                               │
                                  │  Public $id:                  │
                                  │  loa.dev/schemas/...          │
                                  └──────────┬───────────────────┘
                                             │ HTTPS fetch
                                             ▼
                                  ┌──────────────────────────────┐
                                  │  loa-compositions (registry) │
                                  │  ─────────────────────────   │
                                  │  .github/workflows/           │
                                  │    validate-schema.yml        │ ← CI fetches schema
                                  │  scripts/                     │
                                  │    validate-yaml.ts           │ ← local validator
                                  │  compositions/                │
                                  │    **/*.yaml (10 files)       │ ← validates against schema on PR
                                  └──────────────────────────────┘
```

**Three-tier model preserved:**
- Tier 1: `construct-*` repos — surface area for each construct
- Tier 2: `loa-constructs` — Constructs Network: registry + engine + schema family
- Tier 3: `loa-compositions` — registry of composition YAMLs that conform to the schema family

---

## Schema v1.1 — Field Additions

Four cycle-002 followup fields to add to `composition.schema.json`:

### 1. `surface_class` (top-level)

```json
{
  "surface_class": {
    "type": "object",
    "additionalProperties": false,
    "description": "Drives gating intensity, codex_mode default, iteration_cap, inline_fix permission. Canonical def in compositions/sorry-for-ur-loss/outage-triage.yaml.",
    "properties": {
      "default": { "enum": ["culturetech-loose", "defi-strict", "mixed", "unspecified"] },
      "enum": { "type": "array", "items": { "type": "string" } },
      "canonical_definition": { "type": "string" },
      "inferred_when_unspecified": { "type": "string" },
      "affects_in_this_composition": { "type": "array", "items": { "type": "string" } },
      "inference": { "type": "object" },
      "affects": { "type": "object" },
      "rationale": { "type": "string" },
      "invocation": { "type": "object" }
    }
  }
}
```

### 2. `thinking_effort` (top-level)

```json
{
  "thinking_effort": {
    "type": "object",
    "additionalProperties": false,
    "description": "Per-stage hint for adaptive-thinking-capable runtimes. Canonical def in compositions/delivery/feel-iterate.yaml.",
    "properties": {
      "default": { "enum": ["low", "medium", "high", "xhigh", "max"] },
      "enum": { "type": "array", "items": { "enum": ["low", "medium", "high", "xhigh", "max"] } },
      "canonical_definition": { "type": "string" },
      "guide": { "type": "object" },
      "rationale": { "type": "string" },
      "runtime_translation": { "type": "object" },
      "promptable_steering": { "type": "string" },
      "affects_in_this_composition": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

### 3. `vocabulary_governance` (per-stage, on chain[].stage)

```json
{
  "vocabulary_governance": {
    "type": "object",
    "additionalProperties": false,
    "description": "Generation-as-audit-surface discipline for chrome copy stages. Per parallel-agent Hibernation Copy Discipline brief, cycle-002 followup.",
    "properties": {
      "taxonomy": { "type": "object" },
      "line_types": {
        "type": "object",
        "properties": {
          "anchor": { "type": "string" },
          "flavor": { "type": "string" }
        }
      },
      "no_promises_linter": {
        "type": "object",
        "properties": {
          "regex": { "type": "string" },
          "action": { "type": "string" },
          "rationale": { "type": "string" }
        }
      },
      "bank_first_authoring": { "type": "object" },
      "reference_brief": { "type": "string" }
    }
  }
}
```

### 4. `codex_mode` (per-stage, on chain[].stage)

```json
{
  "codex_mode": {
    "type": "object",
    "additionalProperties": false,
    "description": "Codex delegation vs pair-program enum on engineering-handoff stages. Canonical in compositions/sorry-for-ur-loss/outage-triage.yaml stage 3.",
    "properties": {
      "delegation": { "type": "string" },
      "pair-program": { "type": "string" },
      "default": { "enum": ["delegation", "pair-program"] }
    }
  }
}
```

### 5. `thinking_effort` (per-stage, on chain[].stage — string form)

In addition to the top-level object form, individual stages can carry the simple string tier:

```json
{
  "thinking_effort": {
    "anyOf": [
      { "enum": ["low", "medium", "high", "xhigh", "max"] },
      { "type": "object" }
    ],
    "description": "Stage-level override (string) or canonical-def object on the composition that owns the family."
  }
}
```

### Plus: stage 1.5 ground-canon shape

The `ground-canon` stage (added v1.6.0 to triage-pause and v1.1.0 to hibernate-product) carries non-standard sub-fields: `when`, `probes` (array), `on_present_and_fresh` (array), `on_present_but_stale` (array), `on_absent` (array). These are gate-specific shapes. Either:
- (a) Allow them as freeform via reduced strictness on stage objects (`additionalProperties: true` on stage)
- (b) Define a `stage.gate_shape` sub-schema with the four predicates explicitly

**Recommendation: (b)** for the long-term schema clarity, but (a) is acceptable as a short-term unblock if the explicit shape is too much detail for this PR.

### Schema version field

```json
{
  "schema_version": {
    "type": "string",
    "enum": ["1.0", "1.1"],
    "description": "Bump to 1.1 when introducing additive field shapes. v1.0 YAMLs validated against v1.1 schema by relaxing required-field set; v1.1 YAMLs reject under v1.0 validators."
  }
}
```

Existing v1.0 YAMLs in loa-compositions get a one-line bump to `schema_version: "1.1"` in this migration PR.

---

## Build Sequence (next session executes this)

### Step 0 — Branch in both repos

```bash
cd ~/Documents/GitHub/loa-constructs && git checkout -b schema-v1.1-cycle-002-fields
cd ~/bonfire/loa-compositions  && git checkout -b add-schema-validation-ci
```

### Step 1 — Bump composition.schema.json to v1.1 (loa-constructs)

Edit `/Users/zksoju/Documents/GitHub/loa-constructs/.claude/schemas/composition.schema.json`:

1. Change `schema_version.const: "1.0"` to `schema_version.enum: ["1.0", "1.1"]`
2. Add 5 new top-level / nested property definitions (see "Schema v1.1 — Field Additions" above):
   - `surface_class` (top-level object)
   - `thinking_effort` (top-level object + stage-level union)
   - `vocabulary_governance` (per-stage object)
   - `codex_mode` (per-stage object)
   - `ground-canon` stage shape (gate sub-fields)
3. Update `$id` if needed — keep `https://loa.dev/schemas/composition.schema.json` unchanged
4. Update `description` to reference v1.1 and cycle-002 followup additions

### Step 2 — Update schemas/README.md (loa-constructs)

Document the v1.1 addition. Reference the canonical compositions where each field lives:
- `surface_class` → outage-triage.yaml v1.2.0 stage block
- `thinking_effort` → feel-iterate.yaml v1.1.0 top-level + per-stage
- `vocabulary_governance` → triage-pause.yaml v1.8.0 + hibernate-product v1.2.0
- `codex_mode` → outage-triage.yaml v1.1.0 stage 3 + triage-pause v1.5.0 stage 6.5

### Step 3 — Add validation CI in loa-compositions

Create `/Users/zksoju/bonfire/loa-compositions/.github/workflows/validate-schema.yml`:

```yaml
name: Validate composition YAMLs against schema
on:
  pull_request:
    paths: ['compositions/**/*.yaml']
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run validate:compositions
```

### Step 4 — Add local validator in loa-compositions

Create `/Users/zksoju/bonfire/loa-compositions/scripts/validate-compositions.ts`:

```typescript
import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
import yaml from "js-yaml";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";

const SCHEMA_URL = "https://loa.dev/schemas/composition.schema.json";
const COMPOSITIONS_DIR = "compositions";

async function main() {
  // Fetch schema (cache to .cache/schemas/ for offline runs)
  const schemaJson = await fetch(SCHEMA_URL).then(r => r.json());
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schemaJson);

  // Walk compositions/ for YAMLs
  const files = await walkYaml(COMPOSITIONS_DIR);
  let failed = 0;

  for (const f of files) {
    const text = await readFile(f, "utf-8");
    const doc = yaml.load(text);
    if (!validate(doc)) {
      console.error(`✗ ${f}`);
      for (const err of validate.errors ?? []) {
        console.error(`    ${err.instancePath} ${err.message}`);
      }
      failed++;
    } else {
      console.log(`✓ ${f}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

async function walkYaml(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkYaml(p));
    else if (entry.name.endsWith(".yaml")) out.push(p);
  }
  return out;
}

main();
```

### Step 5 — Add devDeps + npm script (loa-compositions)

Edit `/Users/zksoju/bonfire/loa-compositions/package.json` — add:

```json
{
  "scripts": {
    "validate:compositions": "bun scripts/validate-compositions.ts"
  },
  "devDependencies": {
    "ajv": "^8.12.0",
    "ajv-formats": "^3.0.0",
    "js-yaml": "^4.1.0",
    "@types/js-yaml": "^4.0.9"
  }
}
```

If loa-compositions has no package.json today, create a minimal one:

```json
{
  "name": "loa-compositions",
  "private": true,
  "type": "module",
  "scripts": { "validate:compositions": "bun scripts/validate-compositions.ts" },
  "devDependencies": { /* as above */ }
}
```

### Step 6 — Bump schema_version in all YAMLs (loa-compositions)

For each YAML in `compositions/**/*.yaml`:

```yaml
schema_version: "1.0"   # → change to "1.1"
```

Files to touch (~10):
- `compositions/delivery/direct-render.yaml` (no cycle-002 fields; can stay 1.0 if desired)
- `compositions/delivery/feel-iterate.yaml`
- `compositions/delivery/ground-and-craft.yaml`
- `compositions/discovery/audit-feel.yaml` (no cycle-002 fields; can stay 1.0)
- `compositions/discovery/find-construct.yaml` (no cycle-002 fields; can stay 1.0)
- `compositions/experimentation/mint-codex.yaml` (no cycle-002 fields; can stay 1.0)
- `compositions/sorry-for-ur-loss/hibernate-product.yaml`
- `compositions/sorry-for-ur-loss/outage-triage.yaml`
- `compositions/sorry-for-ur-loss/triage-pause.yaml`

Bump only the ones using v1.1 fields. Files without new fields stay at v1.0 (backward-compat).

### Step 7 — Update README badges (loa-compositions)

Edit `/Users/zksoju/bonfire/loa-compositions/README.md`:

```markdown
[![schema](https://img.shields.io/badge/schema-1.1-8B5CF6)](https://github.com/0xHoneyJar/loa-constructs/blob/main/.claude/schemas/composition.schema.json)
```

### Step 8 — Run validation locally before pushing

```bash
cd ~/bonfire/loa-compositions
bun install
bun run validate:compositions
# Expect: ✓ all YAMLs pass
```

### Step 9 — Commit + PR + merge

Two PRs, sequenced:

**PR A (loa-constructs):** "schema: composition.schema.json v1.1 — cycle-002 followup additions"

**PR B (loa-compositions):** "validate: add schema-validation CI + bump v1.1 fields" — depends on PR A merging first (CI fetches the live schema URL).

Operator-authorized direct merge per the cycle-002 precedent (loa-compositions PRs #2–#7).

---

## Verify

After both PRs merge:

```bash
# Schema validates current YAMLs
cd ~/bonfire/loa-compositions && bun run validate:compositions  # → all pass

# Schema URL is current
curl -s https://loa.dev/schemas/composition.schema.json | jq '.properties.schema_version.enum'
# → ["1.0", "1.1"]

# Future YAML changes that drift from schema get caught in PR CI
```

---

## Design Rules (Alexander minimal — engineering-heavy work)

- **Schema field naming:** snake_case for all new fields (matches existing `schema_version`, `compose_with`, `composes_symmetrically_with`)
- **README badge color:** keep `8B5CF6` (matches existing badge)
- **Error messages from validator:** include file path + JSONPath of failing field + expected vs actual; operator should be able to grep the offending YAML and fix in one read
- **PR description shape:** include schema diff in fenced block + impact table per the cycle-002 PR precedent (#2–#7)

---

## What NOT to Build (Barth scope discipline)

- **Don't extract schemas to a third repo (`@loa/schemas` package)** — that was Option C from the prior thread. Defer until a third consumer surfaces (Herald construct work, custom orchestrator). This PR is sync-fix only.
- **Don't add a runtime that interprets `surface_class` / `thinking_effort` to translate to API config** — that's a separate downstream concern. Schema declares; orchestrators interpret. Out of scope.
- **Don't refactor the schema family structure** (5 schemas in `.claude/schemas/`) — only composition.schema.json gets touched in this PR. Other schemas stay as-is.
- **Don't move composition.schema.json out of loa-constructs** — that was the original framing; revised after dig.
- **Don't add validation for stage-level `notes` prose content** (e.g., the bespoke-per-room language). Prose is documentation, not contract. Schema validates structure, not narrative.

---

## Key References

| Topic | Path |
|---|---|
| Schema source of truth | `loa-constructs/.claude/schemas/composition.schema.json` |
| Schema family README | `loa-constructs/.claude/schemas/README.md` |
| Public $id URL | `https://loa.dev/schemas/composition.schema.json` |
| Validator script (existing, construct-graph) | `loa-constructs/scripts/validate-composition.ts` (NOT a JSON-schema validator — for ghost-wire detection) |
| schema-validator.sh tool | `loa-constructs/.claude/scripts/schema-validator.sh` |
| Compositions registry | `loa-compositions/compositions/**/*.yaml` |
| Composition tower (sorry-for-ur-loss) | `loa-compositions/compositions/sorry-for-ur-loss/{triage-pause,outage-triage,hibernate-product}.yaml` |
| Composition tower (delivery) | `loa-compositions/compositions/delivery/{feel-iterate,ground-and-craft,direct-render}.yaml` |
| Cycle-002 followup PRs | loa-compositions PRs #3, #4, #5, #6, #7 + henlo-monorepo PRs #20, #21, #22 |
| Operator's mental model memory | `~/.claude/projects/-Users-zksoju-Documents-GitHub-henlo-monorepo/memory/feedback_schema_ownership_registry_owns_its_contract.md` |

---

## Open questions for next session

1. **Should `schema_version` enum lock to `["1.0", "1.1"]` only, or use `pattern` for forward compat (`^1\\.\\d+$`)?** Recommendation: lock to enum; requires explicit bump per addition (clearer audit trail).
2. **`ground-canon` stage shape — explicit sub-schema or freeform?** Recommendation: explicit (gate_shape sub-schema with the four predicates) — codifies the gate pattern as reusable.
3. **Should validate-compositions.ts cache the schema fetch?** If yes, write to `.cache/schemas/` with a 24-hour TTL and a `--no-cache` flag. Reasonable polish, not load-bearing.
4. **CI: GitHub Action vs reusable workflow?** Single-repo for now (simple). Promote to org-level reusable workflow if other repos start consuming the same schema.
