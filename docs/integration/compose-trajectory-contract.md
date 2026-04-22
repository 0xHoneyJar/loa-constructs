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
