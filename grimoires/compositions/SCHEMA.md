# Composition YAML Schema

> **Status**: cycle-008 L-compose-fractal · 2026-04-24
> **Scope**: `grimoires/compositions/*.yaml`
> **Doctrine**: v6 §15–§18 (kind/intent/chain), cycle-008 SEED §1 scope-lock (compositions-compose via `consumes:`)
> **Runtime**: `compose-run.sh` + `stage-executor-tmux.sh` (headless-tmux backend default)

A composition YAML declares a pipeline of construct stages the operator can dispatch via `compose-run <composition-name>`. The schema is **additive-only** — new fields may be introduced; existing fields may not break. This is cycle-006's first formal schema documentation; prior compositions (`feel-audit.yaml`, `website-scaffold.yaml`) authored under implicit schema now have this doc to point at.

---

## 1 · Top-level fields

| Field | Required | Type | Description |
|---|---|---|---|
| `schema_version` | ✅ | string | Schema version this YAML targets. Current: `"1.0"`. |
| `kind` | ✅ | enum | One of `workflow` / `audit` / `analysis` / `design-emit` / `meta`. See §2. |
| `name` | ✅ | string | Kebab-case identifier. Must match filename minus `.yaml` (e.g. `strategic-analysis` → `strategic-analysis.yaml`). |
| `description` | ✅ | string | Human-readable one-paragraph summary. |
| `intent` | ✅ | string | First-person "what this composition does when dispatched" — the operator's mental model of invocation. |
| `backend` | ⚪ | enum | `headless-tmux` (default) or `teamcreate` (deferred to cycle-007+). |
| `inputs` | ⚪ | array | Input slots — see §3. |
| `consumes` | ⚪ | array | **cycle-008 addition** — upstream composition handoffs. See §4. |
| `iterate` | ⚪ | array of `[stage_a, stage_b]` pairs | Declared iteration loops; runner manages iteration per-pair. |
| `chain` | ✅ | array | Stage sequence — see §5. |
| `outputs` | ✅ | array | Output declarations — see §6. |
| `compose_with` | ⚪ | array of construct names | Constructs this composition composes with (asymmetric — this composition depends on them). |
| `composes_symmetrically_with` | ⚪ | array of construct pairs | Pairs of constructs that compose both ways in this pipeline. |
| `invocation_examples` | ⚪ | array | Operator-utterance → resolution mapping — see §7. |
| `when_to_use` | ⚪ | string | Multi-line guidance for when to reach for this composition vs alternatives. |
| `known_limitations` | ⚪ | array of strings | Honest-state declarations about what doesn't work yet. |
| `references` | ⚪ | array of key-value pairs | Links to doctrine, SEED, upstream skill paths. |
| `version` | ⚪ | string | Composition version (not schema version). |
| `authored_at` | ⚪ | date | When this composition was first authored. |
| `authored_by` | ⚪ | string | Who authored (operator, cycle + leg, or agent). |

---

## 2 · `kind` — composition taxonomy

| Kind | Purpose | Example |
|---|---|---|
| `workflow` | General-purpose multi-stage composition producing a final artifact | `website-scaffold` |
| `audit` | Review / critique composition emitting Verdict rows | `feel-audit` |
| `analysis` | Analytical composition producing a DecisionArtifact (cycle-008+) | `strategic-analysis` |
| `design-emit` | Downstream composition consuming DecisionArtifact, emitting design artifacts | `design-mockup` |
| `meta` | Composition that itself orchestrates other compositions (deferred cycle-009+) | — |

Kinds are advisory for now — runner doesn't branch on kind. They're primarily for operator-legibility and future routing logic.

---

## 3 · `inputs` — input slot declarations

Inputs represent data the operator provides at invocation time (not carried from another composition).

```yaml
inputs:
  - type: Artifact
    name: target
    description: Path to the project scaffold / brief / existing site dir
    required: true
  - type: Operator-Model
    name: operator_context
    description: Operator expertise + mode + attention register (from /hivemind)
    required: false
```

Each input:

| Field | Required | Type | Description |
|---|---|---|---|
| `type` | ✅ | stream type | `Artifact` / `Signal` / `Operator-Model` / `Intent` / `Verdict` |
| `name` | ✅ | string | Local slot name |
| `description` | ✅ | string | What this input carries |
| `required` | ✅ | bool | If true and missing → `rc: 4` (bad-inputs) |

---

## 4 · `consumes` — upstream composition handoffs (cycle-008 L-compose-fractal)

Declares that this composition depends on a typed artifact emitted by another composition. Implements the [[bonfire-at-composition-seam]] + Eileen #608 architectural prescription.

```yaml
consumes:
  - type: DecisionArtifact
    from: strategic-analysis
    required: true
    description: Strategic-analysis decision artifact from composition A
```

Each consumes-entry:

| Field | Required | Type | Description |
|---|---|---|---|
| `type` | ✅ | typed row name | `DecisionArtifact` (cycle-008) or other typed rows introduced in later cycles |
| `from` | ✅ | composition name | The upstream composition that emits this artifact |
| `required` | ✅ | bool | If true, upstream run must exist in `.run/compose/<any_run_id>/` emitting the type; otherwise `rc: 6` |
| `description` | ⚪ | string | What this consume represents in this composition's context |

### Resolution order

When `compose-run <this>` starts:
1. For each `consumes:` entry, scan `.run/compose/*/decision-artifact.json` (or matching type) in recency order
2. Locate the most recent matching artifact from `<from>` composition
3. Bind to the composition's upstream-slot; emit `composition_handoff_consume` trajectory event
4. If none found and `required: true`:
   - Without `--allow-missing-upstream` flag: abort with `rc: 6`
   - With `--allow-missing-upstream` flag: proceed with upstream-slot empty; may cause stage errors downstream

### Operator override

Operator may explicitly specify upstream run_id:

```bash
compose-run design-mockup --consume-from strategic-analysis:freeside-pilot-20260424-2100
```

Binds to that specific upstream run even if newer runs exist.

### Seam-loop semantics

Per [[bonfire-at-composition-seam]], the handoff is paired-only by design. `compose-run` does NOT auto-invoke upstream. Operator runs A, reviews output, integrates via three-lens, THEN runs B. The `consumes:` declaration is about data-dependency, not control-flow automation.

---

## 5 · `chain` — stage sequence

Ordered list of stages. Each stage declares ONE construct + skill per [[agent-teams-as-pipes]] §focus-per-register.

```yaml
chain:
  - stage: 1
    construct: k-hole
    skill: dig
    persona: STAMETS
    mode: fresh
    reads: [Artifact, Operator-Model]
    writes: [Signal]
    role: primary
    notes: >
      Free-text notes on stage intent, reasoning, behavioral expectations.
```

### Stage fields

| Field | Required | Type | Description |
|---|---|---|---|
| `stage` | ✅ | integer | Ordinal stage label (1-indexed). Referenced in `iterate:` pairs. |
| `construct` | ✅ | construct name | Which construct this stage loads (artisan, k-hole, the-easel, mint, etc.) |
| `skill` | ✅ | skill name | Which skill within the construct this stage invokes |
| `persona` | ⚪ | persona name | Override persona resolution (default: construct's primary persona, uppercased fallback to slug) |
| `mode` | ⚪ | enum | `fresh` (default — context resets per stage) or `persistent` (accumulates across runs) |
| `reads` | ⚪ | array of stream types | Which typed streams this stage reads from trajectory |
| `writes` | ⚪ | array of stream types | Which typed streams this stage writes |
| `role` | ⚪ | enum | `primary` (default — main producer) / `critic` / `integrator` |
| `iterates_with` | ⚪ | integer | Stage label this one loops with (matches declared `iterate:` pair) |
| `notes` | ⚪ | string | Multi-line free-text context for agents + operator |
| `consumes_slot` | ⚪ | string | (cycle-008) Name of a `consumes:` entry to bind to this stage's input |

### Mode semantics

- `fresh` — `claude -p` subprocess fires with no prior context. Stage output stands alone.
- `persistent` — context accumulates across iteration passes via `.run/compose/<run_id>/history/stage-<label>.jsonl`. MVP: per-label accumulation only. Cycle-009+ target: shared-teammate across stages via TeamCreate backend.

---

## 6 · `outputs` — final output declarations

```yaml
outputs:
  - type: Artifact
    destination: .run/compose/<run_id>/final-product-structure.json
    description: Structured product specification — pages, nav, journey
  - type: Signal
    destination: .run/compose/<run_id>/orchestrator.jsonl
    description: Orchestrator trajectory (pipe graph + stream activity)
```

Each output:

| Field | Required | Type | Description |
|---|---|---|---|
| `type` | ✅ | stream type OR `DecisionArtifact` | What this composition emits |
| `destination` | ✅ | path template | Where it lands (supports `<run_id>` interpolation) |
| `description` | ⚪ | string | Human-readable description |
| `notes` | ⚪ | string | Additional constraints or behaviors |

### DecisionArtifact emit declaration

An `analysis`-kind composition typically declares:

```yaml
outputs:
  - type: DecisionArtifact
    destination: .run/compose/<run_id>/decision-artifact.json
    schema_version: "1.0"
    description: Bounded decision artifact (findings + implications + risks + open_questions + recommended_actions)
```

Runner emits `composition_handoff_emit` trajectory event when this output is successfully written.

---

## 7 · `invocation_examples` — operator-facing examples

Not consumed by the runner; serves as documentation for operators reading the composition YAML to understand how it's meant to be dispatched.

```yaml
invocation_examples:
  - operator_utterance: "scaffold a new site from research to structure"
    resolves_to: full 7-stage composition end-to-end
  - operator_utterance: "just the mood phase"
    resolves_to: stages 1-4 (halt at product structuring)
```

---

## 8 · Full example — minimal `analysis`-kind composition with `consumes:`

For a downstream composition that consumes an upstream DecisionArtifact:

```yaml
schema_version: "1.0"
kind: design-emit
name: design-mockup
description: >
  Mockup generation from a locked strategic brief. Runs mood + asset-gen
  + critique loops. Consumes upstream DecisionArtifact.
intent: >
  "Given a DecisionArtifact from strategic-analysis, generate mood-locked
   mockups the operator can critique at the seam."
backend: headless-tmux

consumes:
  - type: DecisionArtifact
    from: strategic-analysis
    required: true
    description: Strategic brief defining user + positioning + risks

inputs:
  - type: Operator-Model
    name: operator_notes
    description: Free-text operator notes for mid-flight redirection
    required: false

iterate:
  - [1, 2]   # mood ↔ asset-gen
  - [2, 3]   # asset-gen ↔ critique

chain:
  - stage: 1
    construct: the-easel
    skill: exploring-visuals
    persona: OPERATOR
    mode: persistent
    reads: [DecisionArtifact]
    writes: [Signal]
    role: primary
    consumes_slot: strategic-analysis
  - stage: 2
    construct: mint
    skill: mint
    persona: MINT
    mode: fresh
    reads: [Signal]
    writes: [Artifact]
    role: primary
  - stage: 3
    construct: artisan
    skill: reviewing-code  # no direct artisan-critique skill yet; placeholder
    persona: ALEXANDER
    mode: fresh
    reads: [Artifact]
    writes: [Verdict]
    role: critic

outputs:
  - type: Artifact
    destination: .run/compose/<run_id>/mockups/
    description: Mockup image set + design-intent-lock

version: 0.1
authored_at: 2026-04-24
authored_by: cycle-008 L-composition-C1
```

---

## 9 · Validation

`compose-run.sh --validate <composition>` (future) will check:

1. `schema_version` in supported range
2. All required fields present
3. `name` matches filename
4. Stages form a valid DAG when combined with `iterate:` pairs
5. All `construct` references resolve to installed constructs
6. All `consumes:` entries reference valid typed-row names
7. All `outputs` have well-formed destinations

Cycle-008 ships the contract + schema doc; validation CLI is deferred to cycle-009+ once second-composition instance validates the shape.

---

## 10 · Evolution rules

- **Additive-only**: new fields may be added without bumping `schema_version` major
- **Breaking changes**: require major version bump + migration path for existing YAMLs
- **Field deprecation**: soft-deprecated fields emit warnings during `compose-run.sh --validate` for at least one cycle before removal
- **`kind:` extension**: new kinds added freely; runner doesn't branch on kind today

---

## 11 · Related

- `docs/integration/compose-trajectory-contract.md` — trajectory event types, including `composition_handoff_emit` / `composition_handoff_consume` / `operator_scratchpad_note` / `operator_model_inject` / DecisionArtifact typed row
- `grimoires/loa-constructs-seed-2026-04-21/cycle-008-SEED-freeside-pilot.md` — first operationalization of `consumes:` via `strategic-analysis` → `design-mockup`
- `~/hivemind/wiki/concepts/bonfire-at-composition-seam.md` — doctrine this schema serves
- `~/hivemind/wiki/concepts/agent-teams-as-pipes.md` — source doctrine for composition shape
- `grimoires/compositions/website-scaffold.yaml` — reference workflow-kind composition (pre-`consumes:` era)
- `grimoires/compositions/feel-audit.yaml` — reference audit-kind composition

---

*cycle-008 L-compose-fractal. Schema made explicit after two compositions (website-scaffold, feel-audit) authored under implicit schema. Additive extension (consumes field) + new kinds (analysis, design-emit) land without breaking prior compositions.*
