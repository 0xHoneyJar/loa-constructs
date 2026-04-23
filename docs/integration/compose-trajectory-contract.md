# Compose Trajectory Stream — Backend/Frontend API Contract

> **Status**: cycle-006 L-threadpipe · 2026-04-23
> **Doctrine**: v6 §18.1 three-layer architecture · v4 §14.4 emoji-as-object-refs · v4 §15.3 vibe-coding surface
> **Runtime**: headless-tmux backend · MVP

The **orchestrator trajectory stream** is the documented API contract between cycle-006's backend (`compose-run.sh` + `stage-executor-tmux.sh`) and any frontend surface. Frontend swappability is a doctrine invariant: any UI that tails this stream can render the composition however it prefers. Cycle-006 ships `compose-panes-render.sh` as the reference implementation; alternative surfaces (IDE split-panes, web dashboard, mobile app, voice) remain first-class citizens of the same contract.

---

## 1 · Where the stream lives

```
.run/compose/<run_id>/orchestrator.jsonl
```

Append-only JSONL. One event per line. Ordered by wall-clock ISO-8601 timestamps with millisecond precision. Written by backend scripts only; frontends are read-only consumers.

Adjacent files in the same directory (opaque to the frontend contract but useful for richer introspection):

- `history/stage-<label>.jsonl` — persistent-mode context accumulation per stage label
- [planned] `artifacts/` — concrete Artifact file outputs when stages emit them

---

## 2 · Event types

All events share a base envelope; type-specific fields are listed below each.

### Base envelope (all events carry these)

```json
{
  "ts": "2026-04-23T19:05:45.186Z",
  "type": "<event_type>",
  "run_id": "<uuid>",
  "composition": "<composition_name>",
  "backend": "headless-tmux"
}
```

### `run_start`

Fired once when `compose-run.sh` begins dispatch. Carries composition shape.

```json
{
  "type": "run_start",
  "stages": "7",
  "iterate_pairs": "2",
  "target": "/tmp/fake-site/"
}
```

### `pass_start` / `pass_end`

Fired at the start + end of each pass through `construct-compose.sh`. Initial pass has `pass: "initial"`. Iteration passes carry identifiers like `iterate-<stage_a>-<stage_b>-pass-<n>`.

```json
{"type": "pass_start", "pass": "initial"}
{"type": "pass_end", "pass": "initial", "rc": "0"}
```

### `stage_enter` / `stage_exit`

Fired by `stage-executor-tmux.sh` at the start + end of each stage execution within a pass. Carries construct identity, persona, mode, primary stream type.

```json
{
  "type": "stage_enter",
  "stage": "1",
  "construct": "k-hole",
  "skill": "dig",
  "persona": "STAMETS",
  "primary_type": "Signal",
  "session_id": "<uuid>",
  "iter_pass": "",
  "mode": "fresh"
}
```

```json
{
  "type": "stage_exit",
  "stage": "1",
  "construct": "k-hole",
  "primary_type": "Signal",
  "session_id": "<uuid>",
  "iter_pass": ""
}
```

### `stage_mock`

Emitted only when `LOA_STAGE_MOCK=1`. Frontend may use this to distinguish real vs mock runs (e.g., badge "MOCK" in the UI).

### `stage_llm_call_start` / `stage_llm_call_end`

Emitted around the real `claude -p` subprocess call. `stage_llm_call_end` carries `rc` for the LLM invocation. Useful for frontends that want to show "thinking…" during the LLM call.

### `iterate_prompt` / `iterate_pass_start` / `iterate_pass_end`

Fired during iteration loop management. Frontend may render a "loop active" badge or visual cue.

```json
{"type": "iterate_prompt", "pair": "[2,4]", "stage_a": "2", "stage_b": "4"}
{"type": "iterate_pass_start", "pair": "[2,4]", "iter": "1"}
{"type": "iterate_pass_end", "pair": "[2,4]", "iter": "1", "rc": "0"}
```

### `run_end`

Fired once when `compose-run.sh` returns. Carries final outcome.

```json
{"type": "run_end", "outcome": "completed", "rc": "0"}
```

`outcome` values: `"completed"` | `"failed"`. `rc` values: `0` on success, `1-5` per compose-run exit code table (see `compose-run.sh --help`).

---

## 2.5 · `DecisionArtifact` — typed row (cycle-008 L-compose-fractal)

The `DecisionArtifact` is the **typed handoff between two compositions** per [[bonfire-at-composition-seam]] + Eileen #608 architectural prescription: *"Framework outputs should then be converged into a single decision artifact. Only that decision artifact should be used as input to the product or product-feature workflow."*

Emitted by Composition A (strategic-analysis and similar kinds) as its terminal output. Consumed by Composition B (design-mockup and similar kinds) as input per its `consumes:` declaration in the YAML.

### Row shape

```json
{
  "ts": "2026-04-24T21:04:12.556Z",
  "type": "DecisionArtifact",
  "run_id": "<uuid or named run_id>",
  "composition": "<composition name that emitted this>",
  "backend": "headless-tmux",
  "schema_version": "1.0",
  "findings": [
    {
      "id": "F1",
      "claim": "<one-sentence finding>",
      "source_stage": "<stage label or ref that produced it>",
      "evidence_refs": ["<evidence refs — file paths, trajectory lines, or URL anchors>"],
      "confidence": "high | medium | low"
    }
  ],
  "implications": [
    {
      "id": "I1",
      "claim": "<what the findings mean for downstream work>",
      "depends_on_findings": ["F1", "F2"],
      "consumer_lens": "<design | gtm | implementation | all>"
    }
  ],
  "risks": [
    {
      "id": "R1",
      "claim": "<what could go wrong>",
      "severity": "high | medium | low",
      "mitigation_hint": "<if known>"
    }
  ],
  "open_questions": [
    {
      "id": "Q1",
      "question": "<unresolved question requiring operator or downstream clarification>",
      "blocks": ["<implication_id or consumer_stage>"]
    }
  ],
  "recommended_actions": [
    {
      "id": "A1",
      "action": "<concrete recommended next-step>",
      "rationale": "<why this action, linking to findings/implications>",
      "consumer_stage": "<which downstream composition stage should act on this>"
    }
  ]
}
```

### Where it lives

Primary location: `.run/compose/<run_id>/decision-artifact.json` (single-file, non-JSONL — written at composition close).

Also emitted as a row in the orchestrator trajectory (`orchestrator.jsonl`) for frontend legibility — so `compose-panes-render.sh` can surface the artifact at the seam, and tail-followers see the composition close with full context.

### Rules

1. **Fields match Eileen #608 shape exactly** — findings / implications / risks / open_questions / recommended_actions. Don't rename.
2. **IDs are local to the artifact** — F1, I1, R1, Q1, A1 — not globally unique; scoped within one DecisionArtifact.
3. **`evidence_refs` should be traceable** — either file paths (`inputs/eileen-608-user-picture.md#section-1.2`), trajectory line anchors, or URLs with deep-link fragments. Enables provenance per Eileen #608 §5.4 shared-evidence recommendation.
4. **Non-optional fields**: `findings`, `recommended_actions`. Others may be empty arrays if genuinely none (but not undefined — explicit empty-array is the "no risks" marker).
5. **Convergence stage produces this**, not individual lens stages. Lens stages emit their own typed rows (`Signal`, `Verdict`, etc.) into trajectory; convergence stage reads the evidence base + emits the DecisionArtifact.

### Why this shape (Eileen's reasoning, preserved)

> *"Each framework must produce a bounded output containing key findings, implications, risks, open questions, and recommended actions. Framework outputs should then be converged into a single decision artifact. [...] Do not feed raw framework explorations directly into implementation generation, as this creates branching alternatives, recursive derivative outputs, and loss of decision clarity."* — loa#608 §opening

The DecisionArtifact is the **bounded handoff** that prevents implementation-composition from inheriting analysis-composition's raw exploration space.

---

## 2.6 · Inter-composition handoff events (cycle-008 L-compose-fractal)

Events fired when one composition hands off to another. Additive — frontends ignoring these still work.

### `composition_handoff_emit`

Fired by composition A at the end of its run when a DecisionArtifact has been written and is available for downstream consumption.

```json
{
  "type": "composition_handoff_emit",
  "run_id": "freeside-pilot-20260424-2100",
  "composition": "strategic-analysis",
  "emits_type": "DecisionArtifact",
  "emits_path": ".run/compose/freeside-pilot-20260424-2100/decision-artifact.json",
  "schema_version": "1.0",
  "ts": "2026-04-24T21:04:15.123Z"
}
```

### `composition_handoff_consume`

Fired by composition B on startup when it has successfully loaded an upstream DecisionArtifact declared in its `consumes:` field.

```json
{
  "type": "composition_handoff_consume",
  "run_id": "freeside-pilot-20260424-2130",
  "composition": "design-mockup",
  "consumes_type": "DecisionArtifact",
  "consumes_from": "strategic-analysis",
  "consumes_run_id": "freeside-pilot-20260424-2100",
  "consumes_path": ".run/compose/freeside-pilot-20260424-2100/decision-artifact.json",
  "schema_version": "1.0",
  "ts": "2026-04-24T21:30:02.891Z"
}
```

### Seam-boundary rules

- `composition_handoff_emit` fires BEFORE `run_end` (the emit is part of run close)
- `composition_handoff_consume` fires AFTER `run_start` but BEFORE `pass_start` (must succeed or downstream composition halts)
- Failed consume = `run_end` with `outcome: "failed"` and `rc: 6` (new exit code — upstream-artifact-missing)
- Operator may explicitly run downstream composition WITHOUT upstream artifact present (dev/test mode) — must pass `--allow-missing-upstream` flag to `compose-run.sh`; composition runs with the declared slot empty

### Fractal recursion

A composition CAN itself emit an artifact consumed by a meta-composition. The contract is self-similar — emit/consume events nest if the operator chooses to orchestrate at higher strata. No depth limit in the schema; operator-discretion per [[agent-teams-as-pipes]] §"pipes are fractal."

---

## 2.7 · Seam-loop events — scratchpad + Operator-Model injection (cycle-008 L-compose-fractal)

Events fired when operator injects hyper-context at the composition-seam per [[creative-work-is-re-entered]] failure mode #2 countermeasure. Both event types are additive and informational — frontends may surface them as operator-presence indicators.

### `operator_scratchpad_note`

Fired when the scratchpad file `operator-notes.md` is written-to (via file watch on the `.run/compose/<run_id>/operator-notes.md` path) during a composition run.

```json
{
  "type": "operator_scratchpad_note",
  "run_id": "<active run_id>",
  "composition": "<active composition name>",
  "note_summary": "<first 200 chars of the new content, or explicit --summary flag if via CLI>",
  "note_path": ".run/compose/<run_id>/operator-notes.md",
  "stage_active": "<stage label currently active, or null if between stages>",
  "ts": "2026-04-24T21:12:45.200Z"
}
```

Use-case: operator drops a casual note during a stage run (*"the user mentioned at coffee that they never open the admin panel — don't build around it"*). Active stage tails the file and ingests if relevant; subsequent stages read it as part of their context accumulation.

### `operator_model_inject`

Fired when the operator adds a new `Operator-Model` stream row to the trajectory. Typed injection — structured context that stages may treat as authoritative per their register.

```json
{
  "type": "operator_model_inject",
  "run_id": "<active run_id>",
  "composition": "<active composition name>",
  "injected_payload": {
    "operator_claim": "<the load-bearing assertion>",
    "register": "<product | user | builder | any — matches the three-lens integration surface>",
    "applies_to_stage": "<stage label or 'all'>",
    "confidence": "high | medium | low"
  },
  "ts": "2026-04-24T21:13:02.440Z"
}
```

Use-case: operator has absorbed a specific IRL signal and wants to inject it as structured input at the next re-entry — not just a casual note but a first-class claim the next stage should honor.

### Trigger classes (operator-facing documentation)

| Trigger class | Mechanism | When |
|---|---|---|
| Visual-change | `operator_model_inject` | After a stage renders output; operator reacts with structured claim |
| Outside-inspiration | `operator_scratchpad_note` | DMs, conversations, conferences, dinner comments — ambient drop |
| Cross-composition redirect | Re-invoke upstream composition with updated inputs | Between compositions at the seam; no event emitted — just a new `run_id` |

### Relationship to doctrine

These events are the operational instrumentation of [[builder-touch-imperative]] at the composition-runtime level. Every `operator_scratchpad_note` and `operator_model_inject` event is evidence that the operator is *in the loop* — not solo-building. Frontends may aggregate event-counts per session as a touch-metric (optional reporting surface per [[accelerated-learning-surface]] LEARN-mode legibility).

---

## 3 · Frontend invariants (what the UI must honor)

Minimum viable frontend consumption:

1. **Tail-follow**: Frontend opens the file with `tail -f` (or equivalent) rather than polling. `compose-run.sh` creates the file at run_id-scope before any stage fires, so `tail -f` is safe to open immediately.
2. **Event idempotency**: Rendering the same event twice must be safe (no side effects in the frontend). Events are append-only; replay is a natural operation.
3. **Unknown event types**: Frontend must skip unknown event types gracefully rather than erroring. New types may be added without bumping a version — additive-only evolution per doctrine v5 §17.
4. **Composition shape**: Frontend should read the composition YAML directly for static shape (stages, modes, iterate pairs). Trajectory rows carry *state*, not shape.

---

## 4 · Construct → (color, emoji) mapping (reference implementation)

Cycle-006's renderer uses this mapping. Frontends may override per operator taste (doctrine v4 §16.1 — Operator OS is starter template, not canon).

| Construct | Emoji | Color (ANSI 256) | Color name |
|---|---|---|---|
| artisan | 🔨 | 214 | warm amber |
| k-hole | 🕳️ | 99 | muted violet |
| the-easel | 🎨 | 108 | sage |
| mint | 🍯 | 220 | honey gold |
| the-arcade | 🎮 | 66 | cool slate |
| observer / beehive | 🐝 | 30 | deep teal |
| kansei | 🔮 | 141 | soft purple |
| mibera-codex | 📜 | 180 | warm tan |
| protocol | ⚙️ | 244 | neutral grey |
| noether | Σ | 130 | burnt orange |
| herald | 📣 | 173 | coral |
| vocabulary-bank | 📚 | 109 | muted blue |
| gtm-collective | 📊 | 168 | rose |
| hivemind | 🧠 | 111 | sky |
| unknown | ◇ | 247 | default grey |

Handle semantics (doctrine §14.4): emoji IS an object-ref for the construct. Frontend may accept operator utterances referencing `🔨` as shorthand for `artisan`.

---

## 5 · Mode glyphs (reference implementation)

| Mode | Glyph | Rationale |
|---|---|---|
| `fresh` | ⊘ | "no inheritance" — circle with line through, context resets |
| `persistent` | ⟳ | "cycle continues" — open cycle glyph, context accumulates |

---

## 6 · Stream type rendering (reference implementation)

Stream type colors mirror the construct color of the producer by default. This gives a visual chain: the arrow out of a construct stage is dyed its color, so the pipe edges are legible at glance latency.

Alternative: frontends may render stream types as their own palette (per-type color regardless of producer) — both are valid.

---

## 7 · Swap examples (alternative frontends the contract enables)

Not built in cycle-006; listed to illustrate the contract surface:

- **IDE split-pane**: Monaco/VS Code extension tailing orchestrator.jsonl, rendering pipe graph in a sidebar panel with clickable stages that jump to the skill source.
- **Web dashboard**: React / Svelte app with WebSocket bridge reading trajectory files from a set of run_ids, showing all active runs as a grid.
- **Mobile (per cycle-006 SEED vibe-coding direction)**: Native app tailing a synced trajectory file, emoji-per-stage, swipe-to-accept on iteration prompts.
- **Voice surface**: Read-aloud stream activity + TTS-prompted iteration prompts.
- **Minimal logging**: Just `tail -f` the file and `jq` it — that's a valid "frontend" too.

All of these honor the same contract. None require backend changes.

---

## 8 · What this contract does NOT claim

- Not a wire-format spec. Events carry JSON but no declared JSON Schema yet (cycle-007 target: publish `compose-trajectory-events.schema.json` alongside).
- Not a real-time delivery guarantee. Events may buffer in file-system caches; frontend tail-follow typically sees them within ~100ms.
- Not authoritative for stage-internal state. Per-stage content rows (Signal/Verdict/Artifact) live in separate schemas and files; orchestrator trajectory is about *dispatch*, not content.
- Not backwards-incompatible evolution path. New event types must be additive. Breaking changes to base envelope require doctrine amendment + version bump.

---

## 9 · Related doctrine

- `grimoires/loa-constructs-seed-2026-04-21/bonfire-construct-pipe-doctrine.md` §14.4 (emoji-as-object-refs), §15.3 (vibe-coding surface), §18 (three-layer architecture, landing at cycle-006 close)
- `~/hivemind/wiki/concepts/agent-teams-as-pipes.md` (three-layer architecture source)
- `grimoires/loa-constructs-seed-2026-04-21/cycle-006-SEED-agentic-fullstack-runtime.md` §3 (AC-backend.1-8, AC-frontend.1-7, AC-threadpipe.1-4)

---

*Cycle-006 L-threadpipe · 2026-04-23. Authored at backend+frontend landing. The contract IS the seam — both layers honor it, either may evolve under it, the operator is never locked to one surface.*
