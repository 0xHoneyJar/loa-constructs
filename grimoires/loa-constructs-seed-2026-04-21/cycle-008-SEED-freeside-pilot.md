# SEED — Cycle-008 · Freeside Pilot · Strategic-Analysis ↔ Design-Mockup (compositions-compose)

> *"Freeside exploration + GTM connection to Rektdrop + other sprawl apps — Next-session target per operator. Explicitly priority for GTM launch arc."* — cycle-007 findings §12.3 P1#3
>
> *"Freeside pilot."* — operator 2026-04-24 (scope-lock confirmation, the design-studio-workflow refinement session)
>
> **Status**: Draft skeleton · Ready for operator review + paired dispatch
> **Date drafted**: 2026-04-24
> **Supersedes**: none (new leg of cycle-008; companions to root-app-migration + constructs-network-sync per §12.3)
> **Doctrine**: [[creative-work-is-re-entered]], [[agent-teams-as-pipes]] §"pipes are fractal", [[accelerated-learning-surface]], [[naming-is-diagnostic]] — all load-bearing
> **Dispatch mode**: conversational-paired + shell-first — the seam loop IS the deliverable; Spiral-autonomous explicitly banned at composition-seam per doctrine
> **Branch (proposed)**: `feat/spiral-loa-constructs-cycle-008-freeside-pilot`

---

## 0 · Why this cycle-leg exists

Three convergent pressures surfaced in the design-studio-workflow refinement conversation (2026-04-24, paired with operator):

1. **Freeside positioning is upstream of freeside UI.** Eileen #608 (Account Analysis System) + ES/zerker recent_convo reveal that freeside today is "NFT verification but cheaper" and that the real positioning is *premium BI for community managers*. Until the strategic-analysis is run, any UI work on freeside is shaped by an under-specified user. Design-before-analysis = Figma-one-shot antipattern (operator Q2, 2026-04-24).

2. **Compositions-compose is untested at the composition-seam.** [[agent-teams-as-pipes]] §"pipes are fractal" has implied composition-scale composition since cycle-005, but all cycle-006/007 compositions ran as single runs. The freeside case needs TWO compositions (analysis + design-mockup) chaining via a typed handoff. Eileen #608 §5.4 independently prescribes this shape: *"Build the system around a shared evidence model, then render frameworks as views over that model."* Convergent invention; time to validate operationally.

3. **The A `<>` C1 kaironic seam has no tooling.** Scratchpad + `Operator-Model` stream slots exist in the trajectory contract but aren't wired. The operator's mid-flight context injection (per [[creative-work-is-re-entered]] failure mode #2) has no expressive channel. Cycle-008 pilot IS the test of whether the seam-loop is usable, not an optimization of it.

Cycle-008's load-bearing outcome for THIS leg: **the freeside strategic-analysis + design-mockup pilot proves that `A <> C1` converges at the composition-seam, using the freeside case as instance-1.** Sprawl-wide forkable design-system (Tier 1) is explicitly cycle-009+ territory — second-instance-earns-promotion per [[naming-is-diagnostic]] flip-side.

---

## 1 · Scope lock

Cycle-008-freeside-pilot touches:

- `grimoires/compositions/` — author `strategic-analysis.yaml` (composition A) + `design-mockup.yaml` (composition C1); extend YAML schema if needed for `consumes: [ArtifactType]`
- `.claude/scripts/` — extend `compose-run.sh` / `stage-executor-tmux.sh` minimally to support inter-composition handoff + scratchpad tail
- `docs/integration/compose-trajectory-contract.md` — extend with `DecisionArtifact` typed row + seam-loop documentation
- `grimoires/loa-constructs-seed-2026-04-21/` — this SEED + findings + legs
- `.run/compose/` — pilot run artifacts (freeside case-specific; not source-tracked, but emitted as reference)

**Does NOT touch**:
- **cycle-008 P1#1 root-app-migration** (sprawl-world Rektdrop → apps/rektdrop/) — **prerequisite** for design-engineering work later; separate SEED. Flagged as dependency in §5.
- **cycle-008 P1#2 constructs-network-sync** (webhook + cron + create-flow) — parallel SEED; not this leg.
- Actual freeside product changes — this leg emits *design artifacts* (analysis + mockups). Implementation (D1 design-engineering fill + D2 backend wiring) is cycle-009+ by explicit operator direction (*"we are focused on 1 and 2 so we don't waste the other token/attention span"*).
- **Composition C2 (design-system scaffold)** — forkable sprawl-wide DS emit with Stitch `DESIGN.md` format. Deferred to cycle-009 after `A <> C1` converges once.
- **shadcn-svelte target binding** — cycle-009+ (D1 concern).
- Doctrine pages for flagged candidates (bonfire-at-composition-seam, deliverable-not-interface, staircase-growth-acceptance, informal-influence-is-web3-primary, linus-law-for-design, user-truth-not-product-truth). Flagged for second-instance-earns-promotion; watch, don't write.
- jani's repos (loa-freeside untouched; this leg produces analysis + mockups ABOUT freeside, doesn't change freeside code).
- Purupuru, Dixie, Mibera, Apdao — out of scope; cycle-009+ territory when N≥2 design-mockups validate the pattern.

**Scope-lock rule carried from cycle-007**:

> *"Build primitives in service of one concrete outcome. Do not design a framework for consolidation — do the consolidation."*

Applied: do the freeside-pilot. Do not design a general-purpose composition-compose framework. The pilot IS the primitive.

---

## 2 · Legs

| Leg | Purpose | Est. effort | Priority |
|---|---|---|---|
| **L-ground** · inputs + baseline capture | Load loa#608 Eileen content, ES/zerker recent_convo, current freeside UI screenshots. Emit baseline artifacts as Composition A inputs. Confirm dependencies (root-app-migration status ok for pilot to proceed against sprawl-world as-is) | small | CERTAIN |
| **L-compose-fractal** · YAML schema extension | Extend composition YAML schema to support `consumes: [ArtifactType from composition-X]`. Add `DecisionArtifact` as typed stream row in compose-trajectory-contract. Minimal runner changes to read from upstream composition's trajectory | medium | CERTAIN |
| **L-composition-A** · strategic-analysis.yaml | Author new composition: LILY (GTM positioning) + BEEKEEPER (user observation over #608 + recent_convo + baseline) + k-hole (supporting research) + lens-renderers (SWOT / Porter / PESTLE / Relationship-Map). Emits DecisionArtifact | medium-large | CERTAIN |
| **L-composition-C1** · design-mockup.yaml | Author new composition: the-easel (mood from DecisionArtifact) + mint (ChatGPT Image 2.0 for visual mockups) + artisan (mockup-taste critique, not token emit). Consumes DecisionArtifact. Emits mockup-set + design-intent-lock | medium | CERTAIN |
| **L-seam-loop** · A `<>` C1 mechanism | Wire the scratchpad (`.run/compose/<run_id>/operator-notes.md` — composition-scoped) + `Operator-Model` stream injection per 2026-04-24 Q5 resolution. Operator-driven re-invocation (no auto-loop for pilot). Visual-change + outside-inspiration as trigger classes | medium | CERTAIN |
| **L-pilot-run** · freeside case execution | Execute A → C1 → operator-review → (re-enter A OR C1) → ... until convergence. Emit pilot-run trajectory + artifacts. The operator's own three-lens integration IS the convergence signal | medium | CERTAIN |
| **L-close** · findings + KANSEI + cycle-009 handoff | F-numbers continue from F44 (cycle-007 last). KANSEI gate. Candidate doctrine second-instance-watch notes. Inheritance queue for cycle-009 | small | CERTAIN |

**Shell-first discipline** held per doctrine §13.1. L-compose-fractal may need YAML schema amendments + minimal runner changes (kept additive per trajectory-contract §"additive-only evolution"). No new TypeScript; no DSL on top.

**Composition-seam is paired-only** — neither L-composition-A nor L-composition-C1 may be dispatched autonomously in this cycle. The `<>` IS the Bonfire-at-composition-seam (see §4 doctrine compliance).

---

## 3 · Acceptance criteria

### L-ground · inputs + baseline capture

- **AC-G.1** · `grimoires/loa-constructs-seed-2026-04-21/cycle-008-l-ground-freeside-baseline.md` exists, captures:
  - Eileen #608 user-picture synthesis (3-tier user: CM + team + exec + THJ-analyst) + her 4 use-cases + §5.4 "shared evidence model" architectural claim
  - ES/zerker recent_convo positioning summary (premium BI, actionable insights, staircase-growth, perks-currency)
  - Current freeside UI baseline — URL + at least 3 screenshots + component inventory snippet (hand-listed, cycle-009 scan-automation)
- **AC-G.2** · Dependency-check: sprawl-world cycle-008 root-app-migration status noted. If sprawl-world monorepo in flux, this leg can still proceed (doesn't depend on sprawl DS stability since we're NOT emitting C2 DS artifacts).
- **AC-G.3** · Inputs packaged as composition-A input artifacts: `.run/compose/freeside-pilot-<run_id>/inputs/` contains raw materials as typed files ready for BEEKEEPER ingestion.

### L-compose-fractal · YAML schema extension

- **AC-CF.1** · `grimoires/compositions/SCHEMA.md` (new OR extended) documents `consumes: [{type: ArtifactType, from: composition-name, required: bool}]` field semantics.
- **AC-CF.2** · `docs/integration/compose-trajectory-contract.md` extended with:
  - `DecisionArtifact` typed row definition — fields per Eileen #608 shape: `findings`, `implications`, `risks`, `open_questions`, `recommended_actions`
  - Seam-loop event types (additive): `composition_handoff_emit`, `composition_handoff_consume`, `operator_scratchpad_note`, `operator_model_inject`
  - `seam-loop` section documenting the composition-to-composition handoff mechanics
- **AC-CF.3** · `compose-run.sh` extended minimally: given a composition YAML with `consumes:`, it locates the upstream composition's trajectory file and loads declared ArtifactTypes into the new run's input slot. No auto-invocation of upstream composition if missing — operator runs A then C1 explicitly.
- **AC-CF.4** · `stage-executor-tmux.sh` extended to tail `operator-notes.md` scratchpad if present, surfacing to active stage stdin via SendMessage-equivalent on file-change.
- **AC-CF.5** · bats tests cover: schema validation, trajectory row emit, scratchpad tail (mock-mode with `LOA_STAGE_MOCK=1`).

### L-composition-A · strategic-analysis.yaml

- **AC-A.1** · `grimoires/compositions/strategic-analysis.yaml` exists, declares `backend: headless-tmux`, lists stages:
  - Stage 1: **LILY** (gtm-collective, positioning) — persona from `.claude/constructs/packs/gtm-collective/identity/persona.yaml`
  - Stage 2: **BEEKEEPER** (observer, user observation) — consumes AC-G.1 inputs
  - Stage 3: **k-hole** (STAMETS, supporting research) — fresh-per-stage, pulls competitive + reference context
  - Stage 4-7: **lens renderers** over shared evidence per Eileen §5.4:
    - Stage 4: SWOT lens
    - Stage 5: Porter's Five Forces lens
    - Stage 6: PESTLE lens
    - Stage 7: Relationship Map lens (heavy-weighted per web3-informal-influence)
  - Stage 8: **convergence** — lens outputs → single `DecisionArtifact` per Eileen's "single decision artifact" rule
- **AC-A.2** · Stages 4-7 read the SAME evidence base (Stages 1-3's typed streams) — no per-lens redundant retrieval per Eileen §5.4.
- **AC-A.3** · `iterate:` declarations at minimum for 1↔2 (positioning ↔ user observation).
- **AC-A.4** · Output: `DecisionArtifact` written to `.run/compose/<run_id>/decision-artifact.json` matching schema from AC-CF.2.
- **AC-A.5** · Mock-mode execution exits clean (bats-gated).

### L-composition-C1 · design-mockup.yaml

- **AC-C1.1** · `grimoires/compositions/design-mockup.yaml` exists, declares `consumes: [DecisionArtifact from strategic-analysis]`, lists stages:
  - Stage 1: **the-easel** (mood exploration grounded in DecisionArtifact's user-picture + positioning)
  - Stage 2: **mint** (ChatGPT Image 2.0 via `feel-to-image-workflow.md` 5-phase pipeline — gist content absorbed as mint taste-params)
  - Stage 3: **artisan** (ALEXANDER, mockup critique — NOT token emit; that's C2, deferred)
  - Stage 4: **convergence** — mockup set + design-intent-lock artifact
- **AC-C1.2** · `iterate:` declared for 1↔2 (mood ↔ asset generation) + 2↔3 (asset ↔ critique).
- **AC-C1.3** · Stage 2 (mint) consumes `feel-to-image-workflow.md` gist conventions: sanitization table + single-stamp discipline + reference-anchoring technique.
- **AC-C1.4** · Screenshots from AC-G.1 baseline accessible as reference-anchors in Stage 2 prompts (the GPT-Image rev-pass is one generation target among several).
- **AC-C1.5** · Output: mockup artifact set (images + design-intent-lock JSON) in `.run/compose/<run_id>/mockups/`.
- **AC-C1.6** · Mock-mode execution exits clean.

### L-seam-loop · A `<>` C1 mechanism

- **AC-SL.1** · Scratchpad wired: `.run/compose/<run_id>/operator-notes.md` exists by convention; runner tails file; new content surfaces to active stage via operator-note trajectory row.
- **AC-SL.2** · `Operator-Model` stream injection documented: operator may write new `Operator-Model` rows to trajectory between stage transitions or during iteration pauses. Typed, contract-clean per compose-trajectory-contract.
- **AC-SL.3** · Trigger-class documentation: scratchpad = "outside-inspiration" path (DMs, conference context, user conversations); `Operator-Model` = "visual-change" path (stage produced renderable output, operator reacts).
- **AC-SL.4** · `composition_handoff_emit` and `composition_handoff_consume` events in both A's and C1's trajectories, legible in compose-panes-render.
- **AC-SL.5** · Operator-driven re-invocation documented: running `compose-run strategic-analysis` again after C1 seen-output recomputes from current Operator-Model state. No auto-loop in pilot.

### L-pilot-run · freeside case execution

- **AC-PR.1** · Composition A runs end-to-end against freeside inputs, emits freeside DecisionArtifact. DecisionArtifact contains concrete recommendations (not framework-theater per Eileen §10 risk).
- **AC-PR.2** · Composition C1 runs consuming A's DecisionArtifact, emits at least 3 mockup variants + design-intent-lock.
- **AC-PR.3** · At least ONE `A <> C1` re-entry occurred — operator read C1 output, re-entered A with sharpened input OR re-entered C1 with scratchpad note. The re-entry is logged in trajectory.
- **AC-PR.4** · Convergence declared by operator explicitly (not auto-detected). Operator marks the pilot-run artifact as "converged for now" — kaironic close, not deterministic end.
- **AC-PR.5** · Pilot-run findings: concrete freeside-specific learnings distinguished from meta-learnings about the A `<>` C1 mechanism. Both captured.

### L-close · findings + KANSEI + cycle-009 handoff

- **AC-CL.1** · `cycle-008-l-freeside-pilot-findings.md` exists (sub-findings doc under cycle-008 overall findings OR standalone if other P1 legs produce their own).
- **AC-CL.2** · F-numbers continue from F44 (cycle-007 last finding).
- **AC-CL.3** · KANSEI gate filled (see §6).
- **AC-CL.4** · Cycle-009 inheritance queue updated with:
  - Composition C2 design-system scaffold (Stitch DESIGN.md emit) if A↔C1 converged
  - D1 design-engineering fill (shadcn-svelte target binding) deferred
  - Sprawl-wide forkable Tier 1 DS as cycle-009+ candidate (if pilot converged, instance-1 complete — ONE more instance before promotion to sprawl-wide)
  - Flagged doctrine candidates (see §4 candidate-watch list) — note any that saw second-instance evidence during pilot
- **AC-CL.5** · Branch status + any upstream PR coordination noted.

---

## 4 · Doctrine compliance (invariants this leg must honor)

| Invariant | How |
|---|---|
| [[creative-work-is-re-entered]] — composition-wide one-shot banned | A `<>` C1 seam is paired-only; at least one re-entry required per AC-PR.3 |
| [[agent-teams-as-pipes]] §"focus-per-register" | Each stage in A and C1 carries ONE construct's expertise; no register-mixing in session |
| [[agent-teams-as-pipes]] §"pipes are fractal" | Compositions-compose via DecisionArtifact typed handoff — compositions ARE constructs |
| [[accelerated-learning-surface]] — operator as three-lens integrator | Operator's presence at the seam IS the integration signal; no auto-integration attempted |
| [[naming-is-diagnostic]] — name before scaling | Pilot is instance-1 of `compositions-compose` at composition-seam; sprawl-wide promotion banned until instance-2 |
| Eileen #608 §"don't co-generate analysis and product-feature" | Composition A and C1 are separate compositions, not co-generated stages |
| Eileen #608 §5.4 "shared evidence model" | Lens stages in A read same evidence base; no per-lens redundant retrieval |
| Shell-first (doctrine §13.1) | All extensions are YAML + shell + additive trajectory rows; no new TypeScript; no DSL |
| OTLET chain-preserved | This SEED links back to cycle-007 §12.3; flagged-candidate doctrines don't delete anything, only add under watch |
| Jani's repos untouched | Pilot emits analysis + mockups ABOUT freeside; doesn't modify loa-freeside code |

**Doctrine candidates under watch (second-instance-earns-promotion)**:

| Candidate | Instance-1 evidence in this cycle | Promote if… |
|---|---|---|
| **bonfire-at-composition-seam** | The `A <> C1` paired-only seam during pilot | Cycle-009+ second composition-compose instance (e.g., C2 after A') shows the same Bonfire-mandatory pattern |
| **deliverable-not-interface** | Freeside CM "report vs dashboard" framing from #608 + recent_convo | Second product case (e.g., sprawl-app CMs, GTM funnel operators) shows same report-over-explore pattern |
| **staircase-growth-acceptance** | Web3 long-quiet + burst-loud pattern named by Eileen #608 | Cycle-009+ work on multiple web3 products sees same non-macro-cycled growth |
| **informal-influence-is-web3-primary** | Eileen §7 relationship-map > org-chart specifically in web3 | Cycle-009+ account-analysis on ≥1 more account confirms |
| **linus-law-for-design** | Operator Q2: "more eyes all bugs become shallow" applied to design | Second composition with different lens-mix shows same convergence property |
| **user-truth-not-product-truth** | Operator Q2: "iterating is finding truth about user, not product" | Second design-mockup pilot confirms the same reframe holds |

None of these get doctrine pages in cycle-008. They get one-line updates to candidates-watch files or inline notes in cycle-008 findings. Promotion ceremony happens when second instance shows up.

---

## 5 · Dependencies + sequencing

### Within cycle-008 (per §12.3 P1s)

| This leg depends on | Status | Blocker? |
|---|---|---|
| P1#1 · sprawl-world root-app-migration | separate SEED; should dispatch earlier in cycle-008 | **Soft blocker** — pilot works against sprawl-world as-is for analysis + mockup emission; design-engineering (D1, cycle-009+) requires migration complete |
| P1#2 · constructs-network sync (webhook + cron) | separate SEED | **Not a blocker** for pilot; pilot doesn't publish new packs |

**Sequencing recommendation**: P1#1 root-app-migration dispatches first (foundation for design engineering later). P1#2 constructs-network-sync dispatches in parallel. This SEED (P1#3 freeside-pilot) dispatches after P1#1 monorepo stable — operator noted: *"Setting the baseline for the Sprawl work so I actually can jump into it."*

### External

- None. This leg uses in-repo primitives + `claude -p` + tmux + ChatGPT Image 2.0 (operator-invoked, no new credential requirements).

### Internal doctrine chain

- [[creative-work-is-re-entered]] — source doctrine for the paired-seam requirement
- [[agent-teams-as-pipes]] §"pipes are fractal" — source doctrine for compositions-compose
- [[accelerated-learning-surface]] — operator three-lens integration frame
- [[naming-is-diagnostic]] — second-instance-earns-promotion discipline
- Eileen #608 — architectural constraint set

---

## 6 · KANSEI gate (cycle-close questions — operator-answered)

Target: ≥4/5 Y on Q1–Q4 + constructive Q5. Halt threshold: <3/5.

- **Q1** — Did the `A <> C1` seam-loop feel usable? Could you re-enter at a moment's notice without reorientation friction?
- **Q2** — Did Composition A's DecisionArtifact feel like a genuine handoff (decision-ready), or like framework-theater (shapes right, substance thin)? Eileen #608 §10 risk.
- **Q3** — Did Composition C1's mockups feel like they inherited from A's analysis, or were they generic "pretty" outputs? Did you feel the three-lens integration happening at the seam?
- **Q4** — Is the pilot instance-1 evidence strong enough that you'd run a second composition-compose instance (C2 design-system scaffold) on similar scaffolding in cycle-009?
- **Q5** — Free-text: with the freeside pilot behind you, what's the first thing about `compositions-compose` as a primitive that feels ready for doctrine promotion, and what still feels vibe-only?

Agent self-scoring optional this cycle — pilot is an operator-judgment outcome; the seam-loop either felt right or didn't.

---

## 7 · Why this leg matters

1. **Instance-1 of compositions-compose.** The fractal claim from [[agent-teams-as-pipes]] has been implied since cycle-005. Pilot validates OR invalidates. Either outcome is cycle-progress — invalidation saves cycle-009+ from building on a broken foundation.

2. **Freeside positioning before freeside UI.** Operator can't do design-engineering on freeside without strategic-analysis first. This leg unlocks the rest of the cycle-008+ freeside arc.

3. **The `A <> C1` seam-loop mechanism tested.** Scratchpad + Operator-Model + manual re-invocation. Either the operator finds it natural (seam works) or frictional (seam needs redesign). Real-world signal.

4. **Eileen's #608 architectural prescriptions honored.** The "don't co-generate analysis and product-feature" rule becomes operational. Shared evidence model becomes operational. Decision-artifact-as-handoff becomes operational.

5. **Freeside pilot sets the pattern for per-app analysis.** Cycle-009+ can dispatch `strategic-analysis` on Rektdrop, Aphive, Cubquests, Dixie, Apdao — same composition, different user + positioning + inputs. The leg produces a reusable primitive.

6. **Doctrine candidates get instance-1 observations.** Six candidate doctrines flagged from this conversation; none promote in cycle-008; all get instance-1 evidence noted so cycle-009+ can recognize instance-2 and ratify.

---

## 8 · What this leg does NOT claim

- **NOT** a general composition-compose framework. The primitive is `DecisionArtifact + consumes + scratchpad + Operator-Model + operator-driven re-invocation`. If the pattern repeats, cycle-009+ decides whether to formalize further.
- **NOT** sprawl-wide Tier 1 design-system. That's cycle-009+ at minimum, after C2 (design-system scaffold) validates.
- **NOT** a freeside implementation. Analysis + mockups emitted; code unchanged.
- **NOT** doctrine promotion for any flagged candidate. Instance-1 only; cycle-009+ territory.
- **NOT** a replacement for `website-scaffold.yaml`. The 7-stage composition remains; this pilot is focused on the freeside-specific shape (A `<>` C1), which is a subset of the broader pipeline + an explicit pre-stage (A).
- **NOT** an automation of the seam-loop. Operator-driven re-invocation only. Auto-looping the seam is cycle-010+ territory if the pattern earns it.

---

## 9 · Post-dispatch additions (operator may amend before branch-cut)

- [ ] Confirm branch name `feat/spiral-loa-constructs-cycle-008-freeside-pilot` OR alternative
- [ ] Confirm leg-file naming convention (`cycle-008-l-*` continues cycle-007 pattern; preferred) vs alternative
- [ ] Confirm freeside UI baseline capture mode: operator-screenshots (manual, faster) vs playwright-automation (slower, reusable for future cycles)
- [ ] Confirm composition run_id convention — cycle-008-freeside-pilot-N or uuid
- [ ] Any cycle-008 P1#1 / P1#2 sequencing signal that changes this leg's dispatch timing
- [ ] Additional candidate-watch doctrines to flag, OR removals from the §4 candidates list

---

*Cycle-008 Freeside-Pilot SEED drafted 2026-04-24 post design-studio-workflow refinement session. Aligns with cycle-007 §12.3 P1#3 (Freeside exploration + GTM connection). Pilot-scoped; sprawl-wide DS explicitly deferred to cycle-009+ for second-instance-earns-promotion discipline. Ready for operator amendment + dispatch.*
