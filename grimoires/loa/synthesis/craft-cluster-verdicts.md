# Craft Cluster — Per-Lane Synthesis Verdicts

**Cycle**: cycle-craft-cluster (simstim-20260511-craftc1c5)
**Date**: 2026-05-11
**Substrate audited**: construct-rooms-substrate v0.2.0-rc.1
**Verdict legend**: FILLED (relay produced an artifact accepted AS the verdict) · LEAKED (relay surfaced a real gap; gap is named, seed for future-cycle PRD) · MISFRAMED (composition shape itself was wrong for the lane)

---

## Lane 1: Fidelity (RFC #237)

**Composition**: `fidelity-relay` (artisan:ALEXANDER → crucible:null → artisan:ALEXANDER)
**Rehearsal surface**: construct-rooms-substrate v0.2.0 — `scripts/{pair-relay-validate,surface-envelope,compose-dispatch}.sh` audited against SDD §2.1 declared intent.
**Run IDs**: `fidelity-r1` (initial, injected-handoff test mode) + `fidelity-r2` (F1 amendment, real-agent dispatch with authentic wall-clock per stage)
**Envelopes** (r1): `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/fidelity-r1/envelopes/c1.{00.artisan,01.crucible,02.artisan}.handoff.json`
**Envelopes** (r2): `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/fidelity-r2/envelopes/c1.{00.artisan,01.crucible,02.artisan}.handoff.json`
**Verdict**: **FILLED** (both runs converged; r2 closed the F1 wall-clock-authenticity gap)

**Detail**:

The relay produced an accept-the-substrate verdict. Stage 0 (artisan, declare-taste) inscribed five auditable taste claims around one load-bearing principle: the envelope is structural, not decorative. The handoff packet — surfaced in ≤24 lines drawn ONLY from declared fields — is simultaneously the operator's checkpoint, the schema's guarantee, and the relay's rhythm. The "declare → inspect → confirm" cadence (stages 0/N share construct) is the formal property that distinguishes pair-relay from parallel; max_cycles ≥ sequence.length is the invariant that protects it; the interactive WAITING-OPERATOR side-channel (BR-CRAFT-005 remediation) is load-bearing rather than polish.

Stage 1 (crucible, validate-shipped) walked all five claims against shipped code with file:line evidence and returned 4 MET + 1 PARTIAL. The four MET claims were precise verb-for-verb matches: field provenance (`surface-envelope.sh:122-128` reads exactly the six declared fields), surface budget (`:140` + `:160` + `:164` layered caps), cross-field invariants (`pair-relay-validate.sh:299` exits 2 with `:216-220` max_cycles + `:236-263` slug resolution), and graceful-degradation (`compose-dispatch.sh:652-657` `if !` wrap + non-fatal comment).

The single PARTIAL was CLAIM-4 — the artisan's original taste-claim said the WAITING-OPERATOR aggregator entry would be "removed" on FIFO read/timeout. Crucible found that the flag *file* IS removed (`:264`) but the `.run/waiting-on-operator.jsonl` aggregator is append-only by design — the script appends a follow-up `envelope.operator-responded` event at `:265` as a lifecycle-close rather than removing the prior entry. Stage 2 (artisan, confirm-intent) returned a TASTE-REVISION verdict: append-only-as-load-bearing is correct; "remove" was the wrong verb in the original taste declaration; revise next-cycle vocabulary; ship the substrate as-is.

The lane is FILLED. The substrate v0.2.0 ships. The vocabulary refinement (the "append-close" pattern needs a named principle in next-cycle taste vocabulary) is queued as a next-cycle declared-taste improvement, not as a substrate bug.

### Amendment — fidelity-r2 (F1 remediation)

After PR #241 opened, Bridgebuilder review F1 (HIGH, 0.75 confidence) flagged the r1 orchestrator timestamps as clustered in a single second — the script processes pre-staged handoffs in milliseconds, so the trace doesn't reflect any meaningful elapsed time. F1's suggestion: run at least one lane with real subagent dispatch and authentic per-stage wall-clock.

fidelity-r2 addresses F1 directly. Three fresh `construct-*` Agent invocations with real LLM compute:

- Stage 0 (artisan, ALEXANDER, declare-taste): 30,730ms — verdict `schema-surface-parity-with-honest-degradation`
- Stage 1 (crucible, no persona, validate-shipped): 36,513ms — verdict `five-of-five-met-substrate-precedence-honest`
- Stage 2 (artisan, ALEXANDER, confirm-intent): 62,140ms — verdict `five-of-five-intentional-substrate-converged`

Total real elapsed: 135 seconds across the relay. Orchestrator trace timestamps span 03:36:39Z → 03:38:54Z. No `stage_dispatch_headless_stub` event (r2 doesn't attempt a cycle 2 because the stage-2 verdict already declares INTENTIONAL on all five claims — operator-judged convergence per SDD §2.4, which is the documented termination shape). The convergence_state is `completed-operator-judged`, distinct from r1's mechanical `halted-no-handoff`.

What r2 changes about Lane 1's verdict: nothing structural — both runs converged. What r2 strengthens: the empirical claim that the pair-relay primitive carries real subagent dispatch (not just injected-handoff replay) is now backed by authentic timing evidence. The r1 CLAIM-4 verb-misfit ("remove" v "append-close") that surfaced as TASTE-REVISION does NOT recur in r2's tighter wording — the audit pass on r2 returned five-of-five INTENTIONAL.

Honest scope note: r2 proves operator-piloted real dispatch works. It does NOT prove the substrate's headless `claude -p` dispatch path works (still stubbed — `sprint_4_completes_this` is the substrate's own marker for that work). r2 also does NOT exercise the full multi-cycle convergence loop in code — convergence remains operator-judged in this cycle, with mechanical convergence-check as a named future extension.

Full amendment docs: [`grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/README.md`](../rehearsals/cycle-craft-cluster-sprint-4-amendment-f1/README.md).

---

## Lane 2: Access (RFC #236)

**Composition**: `access-relay` (kansei:null → artisan:ALEXANDER → kansei:null)
**Rehearsal surface**: construct-rooms-substrate v0.2.0-rc.1 CLI surface — `--help` blocks of the three new scripts.
**Run ID**: `access-r1`
**Envelopes**: `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/access-r1/envelopes/c1.{00.kansei,01.artisan,02.kansei}.handoff.json`
**Form used**: kansei → artisan → kansei (canonical). The SDD-named variant `kansei → crucible → kansei` was NOT needed — the kansei↔artisan loop carried the work.
**Verdict**: **LEAKED**

**Detail**:

Stage 0 (kansei, name-exclusion) named five exclusion shapes for the substrate's CLI, all rolling up to one shared root: `exit-code-fluent-only`. The surfaces grade before they greet — every `--help` opens with an exit-code table the way a courthouse opens with case numbers. Five specific exclusions named: first-time-operator-without-SDD (§-refs as authority without inline gloss), low-working-memory-operator (three modes × two side-channels × env-var in one comment-block), operator-arriving-mid-cycle (no `status` or `last-run` verb to orient from), non-exit-code-thinker (CLI grades but does not narrate), operator-without-tmux-fluency (1800s FIFO timeout assumes long-lived terminal).

Stage 1 (artisan, respond-with-taste) returned a `narrate-before-grade` posture — add a single 'narration band' above each existing block without dethroning the exit code. Five shippable gestures: inline gloss table translating §-refs to English (with dim ANSI on the §-refs so they recede); 'Try this first' block with one concrete invocation + one-line outcome; `status`/`last-run` subcommands reading existing state files; final stderr human-verdict line (green/red/yellow one-liner before the shell's silent exit code); pre-flight warning line + 2sec sleep before the FIFO block in interactive mode.

Stage 2 (kansei, validate-feel) returned 3 ADDRESSED + 2 PARTIAL. The three ADDRESSED were the warmest — gloss table ("warm landing pad"), 'Try this first' block ("hand on the shoulder"), and human-verdict stderr line ("script's closing breath"). The two PARTIAL exposed a residual cold worth naming:

- **`operator-arriving-mid-cycle` is partial**: once the operator types `status`, the room lights up beautifully — but the cold operator doesn't yet know the light switch exists. The doorway is still cold.
- **`operator-without-tmux-fluency` is partial**: the yellow banner is the right warmth, but a 2sec sleep right before a long FIFO park drags the rhythm exactly where the operator's pulse is rising. Honest, but the timing limps.

**Gap shape (seed for future-cycle PRD)**: Both partials share one missing primitive: **ambient breadcrumbs for cycle state**. A cold operator entering an in-progress repo needs to see "cycle-X stage-2 awaiting" without first knowing to ask. Candidate forms: a shell prompt segment, a one-line MOTD that auto-surfaces on `cd`, a status-line indicator. Same shape applies to attention handoff — the tmux sleep is a placeholder for a real attention primitive (confirm-keypress, audible bell, status-line update) that doesn't drag rhythm to buy attention.

The lane is LEAKED. The relay produced a named, specific, future-PRD-shaped gap. The substrate ships; the gap waits for its own cycle.

---

## Lane 3: Frame (RFC #238)

**Composition**: `frame-relay` (rosenzu:LYNCH → artisan:ALEXANDER → rosenzu:LYNCH)
**Rehearsal surface**: construct-rooms-substrate v0.2.0-rc.1 `scripts/compose-dispatch.sh` — the macro-pattern of two composition strategies (parallel + pair-relay) coexisting in one script with tagged dispatch.
**Run ID**: `frame-r1`
**Envelopes**: `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/frame-r1/envelopes/c1.{00.rosenzu,01.artisan,02.rosenzu}.handoff.json`
**Verdict**: **FILLED**

**Detail**:

Stage 0 (rosenzu, name-topology) named the macro-shape in route-language: `two-doors-one-vestibule`. The operator enters one shared vestibule (argv parse + mode-detect + run_id + RUN_DIR setup, `compose-dispatch.sh:47-160`), hits a single decision-desk at `:184` reading `.pattern`, and is routed through one of two mutually-exclusive corridors — door A (parallel, 215-line wrapped if-block hallway, flat 2-digit envelope filenames) or door B (pair-relay, turnstile chamber with `for cycle` loop, 3-component cycle-ring filenames, sidecar `relay-state.json`). Default ticket silently routes to door A. The doubled `exit 0` at `:696-697` confesses door B was extended-by-append rather than extended-by-composition.

Stage 1 (artisan, critique-fit) walked the topology and returned a `vestibule-honest-but-hallways-betray-symmetry` verdict. The shared vestibule is HONEST — arg-parse, MODE detect, RUN_DIR, log_event genuinely shared. But three shapes BETRAY the topology: door-A is inlined while door-B is functional (room-packet construction at `:269-306` unreachable from door-B, which reimplements room activation implicitly); the two filename schemas (`%02d` at `:319` vs `c%d.%02d` at `:576`) treat what is structurally the cN=1 degenerate case as a different building; the doubled-exit dead-end is a textual cul-de-sac. Two shapes STRAINED: decision-desk routing-by-omission (silent default to parallel), and door-B's sidecar state as a one-way diary (writer-only, no reader, no recovery path).

Stage 2 (rosenzu, select-pattern) named the macro-pattern: **GoF Strategy Pattern with leaky defaults**. Route-language for why: a shared vestibule that opens onto two hallways via one decision-desk is the spatial form of strategy-dispatch. Vestibule = context-builder; doors = strategies; decision-desk = selector. The pattern is RIGHT; the realization is asymmetric. Recommendation: **LIVE-WITH for v0.2.0-rc.1** (the betrayals are aesthetic, not functional). Refactor roadmap for the next cycle:

1. Extract door-A's `chain[]`-walk into a `run_parallel_strategy()` peer function (currently a 215-line wrapped if-block).
2. Unify on cycle-ring filename schema `cN.NN.slug` and treat door-A as the cN=1 degenerate case.
3. Require explicit `pattern` declaration at the decision-desk — fail loud on omission rather than silently defaulting to parallel.
4. Remove the doubled `exit 0` at line 697.

The lane is FILLED. The artifact (macro-pattern-recommendation) is produced and operator-accepted. The "leaky defaults" sub-clause names known imperfections in the audited surface, not a gap in the relay output — and the recommendation is paired with a 4-step refactor that future cycles can pick up.

---

## Synthesis note (RFC #235 — the pair-relay primitive itself)

Did the visibility surfacing work? **Yes, on every cycle.** All three lanes produced three envelopes per cycle. Summary mode emitted clean stderr summaries that respected the ≤24-line / ≤80-col cap (independently verified by `surface-envelope.bats` cases 2 and 3). Three `envelope.surfaced` events appeared in each `orchestrator.jsonl`. The substrate's machine convergence-state (`halted-no-handoff` because compositions declare `max_cycles: 3` but only cycle-1 handoffs were available) is the correct mechanical readout; operator-judged convergence happens at the stage-2 verdict layer — and all three lanes converged there.

Did operator intervention happen? **N/A for these rehearsals** (`surface_mode: summary`, no FIFO block). The interactive-mode side-channel + FIFO timeout was exercised separately by `surface-envelope.bats` cases 4–7.

Was the convergence pattern productive across all three lanes? **Yes, and distinct value per lane.** Fidelity produced a verb-precision audit of our own declared taste (caught a wording bug in our taste claim, no substrate bug). Access produced a residual-gap seed (ambient breadcrumb for mid-cycle state visibility) that becomes a future-cycle PRD candidate. Frame named the macro-pattern (Strategy) and gave a 4-step refactor roadmap. None of these would have surfaced as cleanly from a parallel-pattern composition — the "declare → inspect → confirm" rhythm is what produced the depth.

**Pair-relay primitive verdict (RFC #235)**: SHIP. The primitive carried its first-light load across three distinct domains (fidelity, access, frame) and produced three distinct, accepted artifacts. Promote substrate v0.2.0-rc.1 → v0.2.0.

---

## Cycle outcomes — RFCs

| RFC | Lane | Verdict | Outcome |
|---|---|---|---|
| #235 (pair-relay primitive) | substrate-self | SHIP | Promote v0.2.0-rc.1 → v0.2.0 |
| #236 (access cluster) | access | LEAKED | Gap-seed: ambient breadcrumbs for cycle state visibility |
| #237 (fidelity cluster) | fidelity | FILLED | Substrate ships; taste-vocabulary refinement queued |
| #238 (frame cluster) | frame | FILLED | Strategy-pattern named; 4-step refactor roadmap deferred |
