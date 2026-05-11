# Sprint 4 Amendment — F1 remediation rehearsal (fidelity-r2)

**Created**: 2026-05-11
**Addresses**: Bridgebuilder review F1 on [PR #241](https://github.com/0xHoneyJar/loa-constructs/pull/241) — *"Rehearsal evidence is agent-fabricated, not from real script execution"*
**Lane covered**: fidelity-relay (RFC #237). Access-r1 and frame-r1 remain in their original `--inject-handoff` test-mode classification per the disclosure in NOTES.md Sprint 4.

## What F1 said

The original Sprint 4 rehearsal artifacts (`grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/{fidelity,access,frame}-r1/`) used `compose-dispatch.sh --inject-handoff` to pre-stage operator-authored handoff packets. Bridgebuilder review F1 (HIGH severity, 0.75 confidence) called this out:

> The orchestrator.jsonl traces have suspicious properties: timestamps essentially identical (most events within the same second), `blocked_ms` always 0, and a `stage_dispatch_headless_stub` event with payload `sprint_4_completes_this` appears in every trace at cycle=2. Combined with the NOTES.md disclosure that this was agent-run, the rehearsal artifacts are constructed handoff envelopes fed through a partial dispatch, not authentic runtime traces.

The suggestion: *"run at least one lane with real subagent dispatch through compose-dispatch.sh's actual loop (not --inject-handoff), capture genuine event timestamps with varying durations."*

## What this amendment is

This `fidelity-r2/` directory is a re-run of the fidelity-relay lane using **real, separately dispatched** `construct-artisan` → `construct-crucible` → `construct-artisan` Agent invocations, each with authentic wall-clock elapsed time. The `compose-dispatch.sh --inject-handoff` test mode was NOT used.

### What's different from r1

| Dimension | fidelity-r1 (test-mode) | fidelity-r2 (real-agent) |
|---|---|---|
| Dispatch method | `compose-dispatch.sh --inject-handoff <stage>:<path>` | Three separate `Agent(construct-*)` tool invocations with prior verdict passed as input |
| Per-stage elapsed | All events ~same second (script just validates pre-staged JSON) | 30.7s + 36.5s + 62.1s real LLM dispatch per stage (133.4s total agent compute) |
| Timestamps in orchestrator.jsonl | Bunched in one second (substrate execution time, not agent compute) | Span 2 minutes 15 seconds, reflecting per-stage real dispatch durations |
| Cycle-2 stub event | Present (`stage_dispatch_headless_stub` payload `sprint_4_completes_this`) — because compose-dispatch.sh has no real-dispatch path for cycle 2 in headless mode | Absent — relay terminates after cycle 1 via explicit `relay.operator_terminate` event citing SDD §2.4's "convergence is operator-judged" gate |
| convergence_state | `halted-no-handoff` (mechanical readout: cycle 2 had no handoff) | `completed-operator-judged` (operator terminates after cycle 1's stage-2 verdict declares INTENTIONAL on all 5 claims) |
| Verdict shape | Same — relay produced operator-acceptable artifact | Same — relay produced operator-acceptable artifact; one CLAIM-4 verb-misfit caught in r1 does NOT recur in r2 wording |

### What this amendment does NOT change

- Access-r1 and frame-r1 remain in the original Sprint 4 directory with their original injected-handoff classification. They demonstrated the `--inject-handoff` test path, which is the SHIPPED Sprint 2 B.4 test surface (`bats tests/integration/pair-relay-orchestrator.bats` exercises it for end-to-end coverage). The injection path is itself a primitive output of cycle-craft-cluster — its existence is intentional and tested.
- The substrate code is UNCHANGED — `construct-rooms-substrate` `main` at `8259a76` (tagged `v0.2.0`) is exactly what the r1 rehearsal exercised and what r2 audits with fresh agent eyes.
- The synthesis verdict for Lane 1 (Fidelity) is UNCHANGED — both r1 and r2 converged on the same operator-facing acceptance (substrate ships; one taste-vocab refinement noted in r1, gone in r2's tighter wording).

## File inventory

| Path | What |
|---|---|
| `fidelity-r2/envelopes/c1.00.artisan.handoff.json` | Stage 0 (artisan, declare-taste, ALEXANDER) — verdict `schema-surface-parity-with-honest-degradation` + 5 taste claims |
| `fidelity-r2/envelopes/c1.01.crucible.handoff.json` | Stage 1 (crucible, validate-shipped, null) — verdict `five-of-five-met-substrate-precedence-honest` + per-claim audit |
| `fidelity-r2/envelopes/c1.02.artisan.handoff.json` | Stage 2 (artisan, confirm-intent, ALEXANDER) — verdict `five-of-five-intentional-substrate-converged` + per-claim terminal verdicts |
| `fidelity-r2/orchestrator.jsonl` | 14 events spanning 2m15s of real elapsed time; per-stage timestamps reflect actual agent dispatch+return |
| `fidelity-r2/relay-state.json` | Final state — `completed-operator-judged`; per-stage real_dispatch_ms preserved as `per_stage_dispatch_ms` array |

Each handoff envelope carries a `dispatch_timestamps` field with `dispatched_at` / `returned_at` / `duration_ms` — fields the original r1 envelopes did not have because the script processes them all instantaneously.

## How to verify

```bash
# 1. Confirm the orchestrator.jsonl timestamps span multiple minutes (not bunched)
jq -r '.ts' grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/fidelity-r2/orchestrator.jsonl | sort -u
# Expected: timestamps from 03:36:39Z through 03:38:54Z (5+ distinct values)

# 2. Confirm the per-stage durations are real (range from 30s to 62s, not 0ms)
jq -r '.payload.real_dispatch_ms // empty' grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/fidelity-r2/orchestrator.jsonl
# Expected: 30730, 36513, 62140

# 3. Confirm convergence_state is operator-judged, not mechanical
jq '.convergence_state' grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/fidelity-r2/relay-state.json
# Expected: "completed-operator-judged"

# 4. Confirm no stage_dispatch_headless_stub event in cycle 2 (because r2 doesn't attempt cycle 2)
grep -c "stage_dispatch_headless_stub" grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/fidelity-r2/orchestrator.jsonl
# Expected: 0
```

## Honest framing

This amendment proves the substrate's pair-relay primitive can be operator-piloted with real subagent dispatch. It does NOT prove that the substrate's headless `claude -p` dispatch path works — that path is still stubbed (`stage_dispatch_headless_stub` in the substrate code), and is the documented next-cycle work item.

What this amendment proves:

- The construct subagents (artisan, crucible) can produce real verdicts via the canonical pair-relay rhythm
- The handoff packet schema accepts those verdicts cleanly (no schema violations)
- The validator and surface-envelope primitives work as declared when fed real verdicts
- The relay's "operator-judged convergence at end of cycle N" semantic is the right termination shape — and is distinct from the mechanical `halted-no-handoff` state that r1 surfaced

What this amendment does NOT prove (still future-cycle work):

- Headless dispatch via `claude -p` inside the substrate's own loop (Sprint 4 of the broader substrate roadmap)
- Multi-cycle convergence detection in code (the convergence_criteria field is operator-judged today; mechanical detection is a future extension named in `docs/runtime/composition-patterns.md`)
- Full FIFO interactive side-channel under load — exercised in unit tests (`surface-envelope.bats` cases 4–7) but not in this amendment, which used `surface_mode: summary`
