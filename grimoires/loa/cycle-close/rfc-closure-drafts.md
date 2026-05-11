# RFC Closure Comment Drafts — cycle-craft-cluster

Operator-pasteable closure comments for the four RFCs absorbed by cycle-craft-cluster. Each comment cites the per-lane synthesis verdict + the canonical evidence path. Disposition per PRD FR-3.2.

> **How to use**: After the cycle PR merges and `construct-rooms-substrate v0.2.0` is pushed + released, post these as comments on each RFC, then close. Replace `<CLUSTER-PR-LINK>` and `<SUBSTRATE-RELEASE-LINK>` with real URLs before posting.

---

## #235 — pair-relay composition primitive

**Disposition**: SHIPPED

```markdown
**Closed by cycle-craft-cluster** (2026-05-11).

The pair-relay composition primitive ships in `construct-rooms-substrate v0.2.0` ([release](<SUBSTRATE-RELEASE-LINK>)). It carried first-light load across three distinct lanes (fidelity / access / frame) in one Sprint 4 rehearsal — distinct value per lane, all converged.

What landed:
- `data/trajectory-schemas/pair-relay-composition.schema.json` (JSON Schema, Draft 2020-12)
- `scripts/pair-relay-validate.sh` (validator; exit 1 schema / exit 2 semantic)
- `scripts/surface-envelope.sh` (3 modes — silent/summary/interactive; BR-CRAFT-005 WAITING-OPERATOR side-channel preserved)
- `scripts/compose-dispatch.sh` (extended; `pattern: pair-relay` routes into RELAY_LOOP state machine; `parallel` flow unchanged)
- 46 new bats integration tests, all green; zero regressions
- `docs/runtime/composition-patterns.md` (operator-facing reference)

Synthesis: [`grimoires/loa/synthesis/craft-cluster-verdicts.md` — Synthesis note (RFC #235)](../blob/main/grimoires/loa/synthesis/craft-cluster-verdicts.md#synthesis-note-rfc-235--the-pair-relay-primitive-itself).
Cluster index: [`clusters/craft.md`](../blob/main/clusters/craft.md).
Cluster PR: <CLUSTER-PR-LINK>.
```

---

## #236 — access cluster (kansei↔artisan↔kansei)

**Disposition**: LEAKED — gap-seed for future cycle

```markdown
**Resolved partially by cycle-craft-cluster** (2026-05-11). Verdict: **LEAKED**.

The `access-relay` composition (kansei → artisan → kansei) was rehearsed against `construct-rooms-substrate v0.2.0`'s CLI surface. Three of five named exclusions were ADDRESSED by artisan's `narrate-before-grade` taste-response (inline §-ref gloss, "Try this first" block, human-verdict stderr line). Two were PARTIAL — and the residual cold has a name worth seeding a future cycle on:

**Gap shape (for future-cycle PRD)**: ambient breadcrumbs for cycle state visibility. A cold operator entering an in-progress repo needs to see "cycle-X stage-2 awaiting" without first knowing to ask. The `status`/`last-run` subcommand response lights the room beautifully — once you know the switch exists. Same shape applies to the tmux-fluency partial: the 2sec sleep before FIFO drags rhythm where the operator's pulse is rising; a real attention-handoff primitive (confirm-keypress, audible bell, status-line indicator) is the future-cycle work.

The `kansei → crucible → kansei` variant from SDD §2.1.4 was NOT needed — the kansei↔artisan loop carried the work this cycle.

Composition: [`compositions/access-relay.yaml`](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/compositions/access-relay.yaml).
Synthesis: [Lane 2: Access](../blob/main/grimoires/loa/synthesis/craft-cluster-verdicts.md#lane-2-access-rfc-236).
Rehearsal envelopes: `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/access-r1/envelopes/`.
Cluster PR: <CLUSTER-PR-LINK>.

Closing this RFC; the residual gap becomes its own future-cycle PRD candidate.
```

---

## #237 — fidelity cluster (artisan↔crucible↔artisan)

**Disposition**: FILLED

```markdown
**Resolved by cycle-craft-cluster** (2026-05-11). Verdict: **FILLED**.

The `fidelity-relay` composition (artisan → crucible → artisan) was rehearsed against `construct-rooms-substrate v0.2.0`'s shipped scripts vs SDD §2.1 declared intent. Of five taste claims:

- 4 MET (envelope-field-provenance, surface-budget-enforcement, cross-field-invariant, graceful-degradation-not-hard-fail) — each with file:line evidence
- 1 TASTE-REVISION (CLAIM-4 interactive-side-channel-integrity): the artisan's original wording said the WAITING-OPERATOR aggregator entry would be "removed" on FIFO read/timeout. The flag *file* IS removed (`surface-envelope.sh:264`), but the `.run/waiting-on-operator.jsonl` aggregator is append-only by deliberate design — the script appends a follow-up `envelope.operator-responded` event at `:265` as lifecycle-close. The substrate's behavior is correct; "remove" was the wrong verb in our taste declaration. Substrate ships as-is; vocabulary refinement queued for future taste-side work.

Composition: [`compositions/fidelity-relay.yaml`](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/compositions/fidelity-relay.yaml).
Synthesis: [Lane 1: Fidelity](../blob/main/grimoires/loa/synthesis/craft-cluster-verdicts.md#lane-1-fidelity-rfc-237).
Rehearsal envelopes: `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/fidelity-r1/envelopes/`.
Cluster PR: <CLUSTER-PR-LINK>.

Closing this RFC.
```

---

## #238 — frame cluster (rosenzu↔artisan↔rosenzu)

**Disposition**: FILLED

```markdown
**Resolved by cycle-craft-cluster** (2026-05-11). Verdict: **FILLED**.

The `frame-relay` composition (rosenzu → artisan → rosenzu) was rehearsed against `construct-rooms-substrate v0.2.0`'s macro-pattern (parallel + pair-relay coexistence in `compose-dispatch.sh`).

- Stage 0 (rosenzu, name-topology, LYNCH) named the shape in route-language: **two-doors-one-vestibule**. Shared vestibule at lines 47–160; decision-desk at `:184` reading `.pattern`; door-A as wrapped-if-block hallway (215 lines); door-B as turnstile chamber with sidecar `relay-state.json`.
- Stage 1 (artisan, critique-fit, ALEXANDER) found the vestibule HONEST but identified five fit-betrayals: silent default to parallel, door-A inlined while door-B is functional, two filename schemas (`%02d` vs `c%d.%02d`), sidecar state as one-way diary, doubled-exit dead-end at `:697`.
- Stage 2 (rosenzu, select-pattern, LYNCH) named the macro-pattern: **GoF Strategy Pattern with leaky defaults**. Recommendation: **live-with for v0.2.0-rc.1 → v0.2.0** (betrayals are aesthetic, not functional). 4-step refactor roadmap deferred to a future cycle:
  1. Extract door-A's `chain[]`-walk into a `run_parallel_strategy()` peer function
  2. Unify on cycle-ring filename schema `cN.NN.slug` (door-A becomes cN=1 degenerate case)
  3. Require explicit `pattern` declaration; fail loud on omission rather than silently defaulting to parallel
  4. Remove the doubled `exit 0` at `:697`

Composition: [`compositions/frame-relay.yaml`](https://github.com/0xHoneyJar/construct-rooms-substrate/blob/main/compositions/frame-relay.yaml).
Synthesis: [Lane 3: Frame](../blob/main/grimoires/loa/synthesis/craft-cluster-verdicts.md#lane-3-frame-rfc-238).
Rehearsal envelopes: `grimoires/loa/rehearsals/cycle-craft-cluster-sprint-4/.run/compose/frame-r1/envelopes/`.
Cluster PR: <CLUSTER-PR-LINK>.

Closing this RFC.
```

---

## After-merge operator checklist

1. [ ] Push `construct-rooms-substrate main` + tags: `git push origin main v0.2.0-rc.1 v0.2.0`
2. [ ] Create substrate release: `gh release create v0.2.0 --repo 0xHoneyJar/construct-rooms-substrate --notes-file <release-notes>`
3. [ ] Push `loa-constructs cycle-craft-cluster` branch + open PR (see `pr-draft.md` for body)
4. [ ] After PR merge, fill in `<CLUSTER-PR-LINK>` and `<SUBSTRATE-RELEASE-LINK>` above and post the four RFC closure comments
5. [ ] Close RFCs #235, #236, #237, #238
