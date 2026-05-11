# Construct Native-Agent Adapters

> Cycle: cycle-construct-rooms (simstim-20260509-aead9136)
> Status: Sprint 1-3-6 shipped; Sprint 4-5 follow-up

This document describes how Loa constructs are exposed as Claude Code native subagents through the **adapter** layer at `.claude/agents/construct-<slug>.md`.

## Mental model

```
┌────────────────────┐     ┌─────────────┐     ┌──────────────────┐
│ Manifest layer     │────▶│ Generator   │────▶│ Adapter layer    │
│ construct.yaml     │     │ python +    │     │ .claude/agents/  │
│ (canonical truth)  │     │ template    │     │ (ABI / runtime)  │
└────────────────────┘     └─────────────┘     └──────────────────┘
                                                        │
                                                        ▼
                                            ┌──────────────────────┐
                                            │ Claude Code runtime  │
                                            │ — @-mention typeahead │
                                            │ — claude agents CLI   │
                                            │ — operator subagent UI│
                                            └──────────────────────┘
```

The **manifest** is canonical: edit `construct.yaml` to change construct behavior. The **generator** produces the adapter from the manifest — it is a derivation, not a source. The **adapter** is the static binding to Claude Code's runtime — an ABI that registers the construct as a project agent.

## Two invocation paths (Sprint 0 confirmed)

A construct claims its bounded-context authority **only** when invoked through:

1. **`@agent-construct-<slug>`** — operator typeahead in Claude Code. Primary path. Reaches the operator's main session UI; transcripts visible in the running-subagents panel.
2. **Loa room activation packet** at `.run/rooms/<room_id>.json` — used by composition runner. The runner writes the packet, then writes a dispatch prompt that the operator @-mentions. The packet provides structured inputs and forbidden-context declarations.

**Path NOT supported:** `Agent(subagent_type="construct-<slug>", ...)` from skill code. Sprint 0 Probe 1 confirmed the parent session's `Agent` tool computes its allowlist at session start and does NOT include project agents from `.claude/agents/`. Skills attempting this path receive "Agent type not found" errors.

## Anatomy of an adapter

```yaml
---
# generated-by: construct-adapter-gen 1.0.0
# generated-at: 2026-05-09T23:30:00Z
# generated-from: .claude/constructs/packs/artisan/construct.yaml@sha256:...
# checksum: sha256:...
# DO NOT EDIT — regenerate via: bash .claude/scripts/construct-adapter-gen.sh --construct artisan

name: construct-artisan
description: "Use when the operator needs Artisan/ALEXANDER craft judgment..."
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
color: orange

loa:
  construct_slug: artisan
  schema_version: 4
  manifest_schema_version: 3
  canonical_manifest: .claude/constructs/packs/artisan/construct.yaml
  manifest_checksum: sha256:...
  persona_path: .claude/constructs/packs/artisan/identity/ALEXANDER.md
  personas: [ALEXANDER]
  default_persona: ALEXANDER
  skills: [...]
  streams:
    reads: [Signal, Artifact]
    writes: [Verdict, Signal]
  invocation_modes: [room]
  domain:
    primary: visual-surface
    ubiquitous_language: [feel, weight, rhythm, surface, ...]
    out_of_domain: [...]
  cycle:
    introduced_in: simstim-20260509-aead9136
    sprint: cycle-construct-rooms-sprint-3
---

You are operating inside the **Artisan** bounded context, embodying **ALEXANDER**.
...
```

The body contains:
- Bounded-context declaration (domain, ubiquitous language, out-of-domain)
- Invocation authority clause (the @-mention/room-packet contract)
- Persona content (Voice section)
- Skills available to the construct
- Required output: handoff packet contract

## Generator (Sprint 3)

`construct-adapter-gen.sh` reads the manifest and renders the template:

```bash
# Generate one
bash .claude/scripts/construct-adapter-gen.sh --construct artisan

# Generate all (FR-2.6 enforced — pilots must exist)
bash .claude/scripts/construct-adapter-gen.sh

# Idempotency check (CI gate)
bash .claude/scripts/construct-adapter-gen.sh --check

# Dry-run
bash .claude/scripts/construct-adapter-gen.sh --dry-run
```

**Idempotent**: re-running with no manifest changes produces zero diff (the volatile `# generated-at:` timestamp is excluded from comparison).

**FR-2.6 pilot-first ordering**: generator refuses to produce non-pilot adapters until artisan + observer adapters exist. Bypass with `--force` (initial bootstrap only).

## Validators (Sprint 1)

| Validator | Purpose |
|---|---|
| `construct-manifest-validate.sh` | Validates `construct.yaml` against v4 schema; backward-compatible with v3 (informational warnings only) |
| `handoff-validate.sh` | Validates handoff packets against three-tier schema (required / recommended / optional) |
| `room-packet-validate.sh` | Validates room activation packets + verifies content-addressable `room_id` derivation |

Schemas:
- `.claude/data/schemas/construct-manifest-v4.schema.json`
- `.claude/data/trajectory-schemas/construct-handoff.schema.json`
- `.claude/data/trajectory-schemas/room-activation-packet.schema.json`

## Composition runner (Sprint 2)

`compose-dispatch.sh` orchestrates multi-stage construct compositions:

```bash
# Interactive (Form A): emits dispatch prompts the operator pastes into their session
bash .claude/scripts/compose-dispatch.sh tests/fixtures/compositions/artisan-observer.composition.yaml --interactive

# Headless (Form B audit-substrate, Sprint 4 completes): claude -p invocations
bash .claude/scripts/compose-dispatch.sh <composition.yaml> --headless

# Dry-run: validate composition + emit room packets without dispatching
bash .claude/scripts/compose-dispatch.sh <composition.yaml> --dry-run
```

Per stage, the runner:
1. Constructs a room activation packet from prior handoff + declared inputs
2. Writes packet to `.run/rooms/<room_id>.json`
3. Form A: emits dispatch prompt at `.run/compose/<run_id>/dispatch-prompts/stage-N.prompt.md` for operator to paste
4. Validates returned handoff packet
5. Logs `stage_enter`/`stage_exit` to `.run/compose/<run_id>/orchestrator.jsonl`

## Migrated validators (Sprint 6)

The legacy `.claude/subagents/` directory has been removed. Its 5 validator specs migrated to:

| Old path | New path |
|---|---|
| `.claude/subagents/architecture-validator.md` | `.claude/agents/loa-validator-architecture.md` |
| `.claude/subagents/documentation-coherence.md` | `.claude/agents/loa-validator-documentation.md` |
| `.claude/subagents/goal-validator.md` | `.claude/agents/loa-validator-goal.md` |
| `.claude/subagents/security-scanner.md` | `.claude/agents/loa-validator-security.md` |
| `.claude/subagents/test-adequacy-reviewer.md` | `.claude/agents/loa-validator-test-adequacy.md` |
| `.claude/subagents/README.md` | `.claude/agents/loa-validators-README.md` |

The `loa-validator-` prefix reserves the `loa-` namespace for future general-purpose Loa agent classes (orchestrators, observers, etc.) — the prefix `loa-` alone is not assumed to mean "validator."

Loaders updated:
- `.claude/commands/validate.md` (path updated)
- `.claude/protocols/subagent-invocation.md` (path updated)
- `.claude/protocols/structured-memory.md` (path updated)

Verification: `bash .claude/scripts/migrate-subagents-verify.sh`. Rollback: `git revert <Sprint-6 merge commit>`.

## Future cycle work (out of scope here)

- **Sprint 4**: `compose-run.sh` headless emission of construct-handoff packets; parity with Form A interactive output (T5 acceptance).
- **Sprint 5**: `SubagentStart`/`SubagentStop` hooks for tool-mandate enforcement (observability primary, per Sprint 0 Probe 1) and AskUserQuestion gate (T6, T7 acceptance).
- **vision-024**: Naming the adapter layer as ABI explicitly; future cycle may add additional ABIs targeting other runtimes.
- **vision-025**: Handoff packets as causal-history DAG; merger of `construct-handoff-lib.sh` and `structured-handoff-lib.sh` (L6) under shared helpers.
- **vision-031** (NEW): Two-tier subagent visibility (CLI/@-mention vs Agent-tool-allowlist) named explicitly in Loa's runtime contract.

## Reference

- PRD: `grimoires/loa/prd.md`
- SDD: `grimoires/loa/sdd.md`
- Sprint plan: `grimoires/loa/sprint.md`
- Sprint 0 spike: `.run/spike/sprint-0-probes-report.md`
- Sprint close summaries: `.run/sprint-2-close.md`, `.run/sprint-3-close.md`
- Bridge iter 1 review: `.run/bridge-reviews/bridge-20260509-b49286-iter1-full.md`
- Source brief: `grimoires/loa/context/private/construct-native-subagent-invocation-boundaries-2026-05-09.md`
