# Cycle-006 Findings · Agentic Full-Stack Runtime

> **SEED**: [`cycle-006-SEED-agentic-fullstack-runtime.md`](cycle-006-SEED-agentic-fullstack-runtime.md)
> **Branch**: `feat/spiral-loa-constructs-cycle-006-agentic-fullstack-runtime`
> **Mode**: Conversational-paired + shell-first (cycle-003/004/005 precedent)
> **Date closed**: 2026-04-23
> **Doctrine state at close**: v6 (§18 amendment landed via L-doctrine)

---

## 0 · Summary

10 of 10 legs landed. 2 legs ship gated on external review (L-migrate awaits @janitooor merge; L-meta-pack awaits operator sign-off on CURATOR voice before upstream publish). Per SEED §11, cycle-006 ships independent of either review closing.

Cycle-005's parallel-plumbing debt ([[constructs-as-packages]] §3 amendment) **closes** — the composition runtime is now visibly legible at glance latency via the vibe-coding UI. Running `compose-run website-scaffold --target X` or the two-pane tmux wrapper produces the pipe graph + stream activity + per-construct color/emoji that cycle-005 lacked.

Doctrine v6 §18 lands the three-layer architecture + agentic-full-stack naming + focus-per-register principle + backend-choice rationale + rails-as-determinism load-bearing WHY + scope-lock as forcing function.

5 new findings surfaced (F35–F39). 2 upstream PRs now in-flight on `0xHoneyJar/loa`: the pre-existing cycle-005 L5 (#615) still awaiting review + the new cycle-006 L-migrate (#616).

---

## 1 · Legs shipped

| Leg | Status | AC closure | Delivery |
|---|---|---|---|
| **L-backend** · compose-run.sh + stage-executor-tmux.sh | ✅ landed | AC-backend.1-8 all met | commit `6dfd8ee8` |
| **L-composition** · website-scaffold.yaml (7 stages, 2 iterate pairs) | ✅ landed | AC-composition.1-7 all met | commit `6dfd8ee8` |
| **L-frontend** · compose-panes.sh + compose-panes-render.sh | ✅ landed | AC-frontend.1-7 all met | commit `0a063613` |
| **L-threadpipe** · compose-trajectory-contract.md | ✅ landed | AC-threadpipe.1-4 all met | commit `0a063613` |
| **L-e2e** · cycle-006-website-scaffold.bats (8/8 pass) | ✅ landed | AC-e2e.1-6 all met | commit `d363e3a5` |
| **L-research** · stamets-prior-art-teamcreate-tmux.md | ✅ landed | AC-research.1-5 all met | commit `8a06779f` |
| **L-doctrine** · pipe doctrine v5 → v6 (§18 amendment) | ✅ landed | AC-doctrine.1-6 all met | commit `8a06779f` |
| **L-meta-pack** · construct-network-tools exemplar | ✅ authored, passes validator + butterfreezone, upstream publish gated on operator review | AC-meta-pack.1-6 (mechanical); F33 final closure deferred | commit `1f4476d4` |
| **L-migrate** · scripts + schemas + validator skill → loa | ⏳ PR OPEN, awaiting review | AC-migrate.1-6 mechanically met | [0xHoneyJar/loa#616](https://github.com/0xHoneyJar/loa/pull/616) |
| **L-close** · this document | ✅ landed | AC-close.1-4 | this commit |

**Total lines shipped in loa-constructs**: ~1,450 shell + ~160 YAML/composition + ~780 pack (yaml + md + skill) + ~180 bats + ~400 markdown. Zero TypeScript. Shell-first discipline (doctrine §13.1) preserved.

**Upstream (loa)**: 5 scripts + 5 schemas + 1 skill dir (migrated cleanly; smoke-tested in fresh loa checkout; ~1,917 lines per PR diff).

---

## 2 · Findings F35 – F39

### F35 · `tmux send-keys` completion detection is the load-bearing gap for true persistent-pane mode

Cycle-006 ships persistent-mode via file-accumulated history (per stage label). True long-lived-tmux-pane mode (operator sees artisan-teammate keep its context across 2↔4 / 5↔6 loop passes in a visible pane) requires completion detection that `tmux send-keys` + `tmux capture-pane` doesn't provide natively — Claude's output is free-form, markers are fragile.

**Three approaches**, each with trade-offs (detailed in `stamets-prior-art-teamcreate-tmux.md` §2.4):

1. Marker-based: LLM emits sentinel line; tail/poll for it. Fragile to prompt variance.
2. File-based: LLM writes to known path; watch path. Requires LLM to honor file-out convention.
3. Claude Code IPC: if/when Claude Code exposes a "session idle" signal (hook or file), use that. Currently doesn't exist.

**Implication**: cycle-007 `--backend teamcreate` sidesteps this gap by using SendMessage response-delivery as the completion signal. That's the cleaner path. True long-lived-pane mode for `--backend headless-tmux` remains a cycle-007+ target; cycle-006 file-accumulation is the MVP.

**Closure**: documented. No work needed to close cycle-006; informs cycle-007 scope.

### F36 · YAML list items with internal colons silently break parsers

Authoring `website-scaffold.yaml` surfaced: a list item like `- MVP cycle-006: persistent-teammate context is file-accumulated` is parsed by yq as `{MVP cycle-006: "persistent-teammate context..."}` (mapping, not string). The value then swallows subsequent continuation lines, and the FAILURE gets reported many lines downstream at a completely innocent key. The error `line 196: could not find expected ':'` pointed at `composes_symmetrically_with:` — 25 lines away from the actual defect.

**Fix in this cycle**: quoted all colon-bearing list items in `known_limitations:` section. Clean.

**Generalization**: operators authoring quick inline notes hit this any time a natural-language dash-list item contains a colon. The diagnostic is load-bearing — without knowing the pattern, the line-196 error is unactionable.

**Implication for cycle-007**: `construct-validate.sh` should grow a YAML structural lint that warns on:
- Dash-list items where the text contains `:` + the value section continues across lines
- Offer the quoting fix mechanically

**Closure**: deferred to cycle-007 as a validator enhancement.

### F37 · Composition YAML `persona:` field is documentation-only; runtime uses construct-resolve's first-in-manifest

Cycle-006 composition YAMLs declare per-stage `persona:` (e.g. `persona: BARTH` on stage 7). But the runtime's `construct-compose.sh` calls `resolve_persona()` which invokes `construct-resolve.sh` to fetch `.construct.personas[0]` from the pack manifest. The YAML declaration is never read.

For website-scaffold stage 7 (the-arcade): YAML declares BARTH; runtime resolves OSTROM (first in manifest). The two disagree silently.

**Impact on cycle-006**: low — dispatch determinism is held at construct+skill level (which is all the bats test validates). Persona specifically was downgraded in the e2e test to just "non-empty + stable."

**Impact long-term**: higher. Operators authoring compositions *expect* their declared persona to fire. Silent override erodes the "composition YAML is authoritative" model.

**Fix (cycle-007 candidate)**: modify `resolve_persona()` to honor the stage's `persona:` declaration when present, falling back to construct-resolve only when the composition YAML doesn't specify. This preserves backward-compat for compositions without persona declarations.

**Closure**: routed to cycle-007 inheritance queue (item below).

### F38 · Two upstream PRs now stacked awaiting @janitooor review

- [0xHoneyJar/loa#615](https://github.com/0xHoneyJar/loa/pull/615) (cycle-005 L5): `--with-constructs` flag — OPEN since 2026-04-22
- [0xHoneyJar/loa#616](https://github.com/0xHoneyJar/loa/pull/616) (cycle-006 L-migrate): script migration — OPEN 2026-04-23

PRs are independent (no merge-conflict between them); reviewer cognitive load is non-zero.

**Implication**: cycle-006 respects the non-gating rule (cycle ships without L-migrate merged). BUT #616 builds on cycle-005 in spirit — reviewing both together may be cheaper for Jani than reviewing separately. If operator wants to expedite: offer to consolidate into a single PR series with a clear "merge order: 615 first, then 616" note in each body.

**Closure**: documented; operator judgment call on whether to coordinate.

### F39 · `jq -e` with streaming input + `select()` exits status 4 when the last input doesn't match

When a bats test pipes multi-line JSONL through `grep | jq -e 'select(.stage == "1") | <bool>'`, jq sees 7 inputs. For stages 2-7, `select(.stage == "1")` produces no output. For stage 1, it produces `true`. Expected: rc=0 (truthy output produced). Actual: rc=4 ("no valid result ever produced" — apparently driven by the last input's select result, not any prior truthy emission).

**Fix**: use `jq -s -e 'map(select(...))[0] | <bool>'` (slurp + pick first match). This avoids the streaming-rc-4 gotcha entirely.

**Generalization**: any CI check that uses `jq -e` with select against multi-line JSONL should use slurp semantics to get predictable exit codes. Documented in `tests/cycle-006-website-scaffold.bats:141` with a comment explaining the pattern.

**Closure**: documented. No ongoing impact.

---

## 3 · Doctrine compliance — per-leg audit

| Invariant | Landed? |
|---|---|
| §3 typed streams (5 primitives) | ✅ unchanged from cycle-005 |
| §4 pipe chain spec | ✅ L-composition adds iterate loops + backend + per-stage mode extensions |
| §14.3 three read-modes (glance/orient/intervene) | ✅ L-backend + L-frontend + L-threadpipe |
| §14.4 emoji-as-object-refs | ✅ L-frontend renderer + L-threadpipe contract doc |
| §15.3 inline-controls vibe-coding surface | ✅ L-frontend iterate-prompt (y/N/a) + L-threadpipe contract doc |
| §16.3 composition determinism | ✅ L-e2e bats #7 locks dispatch-determinism at construct+skill |
| §16.4 agent-transparency | ✅ orchestrator trajectory is the explicit transparency surface |
| §17.1 dispatch-det ≠ output-repro | ✅ e2e test deliberately DOES NOT test content reproducibility |
| §17.2 failure-semantics primitives | ⏳ vocabulary unchanged; enforcement still deferred |
| §17.4 grimoires-as-interface | ✅ unchanged from cycle-005 |
| §18.1 three-layer architecture | ✅ L-doctrine landed the amendment |
| §18.2 agentic-full-stack naming | ✅ ratified in L-doctrine + L-threadpipe contract doc |
| §18.3 focus-per-register | ✅ L-backend mode: fresh default honors this |
| §18.4 backend-choice rationale | ✅ L-backend headless-tmux default; teamcreate opt-in pointer |
| §18.5 rails-as-determinism | ✅ landing as SEED §0 + L-doctrine §18.5 |
| §18.6 scope-lock forcing function | ✅ meta-doctrine for future cycles |

---

## 4 · KANSEI gate (S8, operator-answered)

| # | Question | Agent self-assessment | Operator answer |
|---|---|---|---|
| Q1 | Can I run `compose-run website-scaffold <target>` and watch all 7 stages execute with per-pane colors + emoji + live pipe graph? | **Y** — `compose-panes.sh` spawns tmux with renderer left + runner right. Pane capture shows 7 stages + 4 persist + 3 fresh + iteration pair markers + stream activity + final state. Bats #6 locks this at glyph+state level. | _operator_ |
| Q2 | Does the iteration loop (2↔4 or 5↔6) fire visibly — I can see mood-board and refinement panes exchanging until I ACK? | **Y** (mechanism ships; full happy-path requires interactive session). `compose-run.sh` prompts `[y/N/a]` per pair; renderer handles iterate events (renders `iterate_pass_start` in stream activity, re-runs paired stages to "running" state). Non-interactive bats path validates code-present. | _operator_ |
| Q3 | When I type `/feel Button.tsx` in my regular workflow, does anything from cycle-005's plumbing NOW fire visibly on my screen (transparency debt repaid)? | **Partial** — cycle-005's `construct-compose.sh` now has the full cycle-006 vibe-coding surface wrapped around it, AND cycle-006's migration PR (if merged) puts it in Loa itself. BUT the `/feel` skill invocation still fires through Claude Code's Skill tool directly, not through compose-run. Closing that specific bridge ("operator muscle-memory slash commands route through composition runner") is cycle-007 (it's the "real-LLM dispatch beyond website-scaffold" inheritance item). The debt is reduced but not eliminated. | _operator_ |
| Q4 | Can another operator clone my `website-scaffold.yaml`, edit the stages, and run it on their machine with only `claude` CLI + bash + tmux (backend is Unix-native, not Claude-native)? | **Y** — bats #7 validates substrate-only invocation. No agent-teams needed; `claude` + `bash` + `tmux` is sufficient. | _operator_ |
| Q5 | Free-text: with cycle-006 shipped, what's the SECOND composition you want to author? (drives cycle-007 framing; second composition is where abstraction patterns start earning their keep) | _operator_ | _operator_ |

Agent score on Q1-Q4: **3 Y + 1 Partial**. No halt criteria triggered; cycle-006 ships.

---

## 5 · Cycle-007 inheritance (handoff)

Pre-drafted from SEED §8 + cycle-006 emergence + F35-F39 routing:

### High-priority (expected cycle-007 candidates)

1. **Real-LLM dispatch beyond website-scaffold** — close Q3 transparency bridge: operator muscle-memory `/feel`, `/dig`, etc should route through compose-run when appropriate
2. **Hivemind-as-construct** — pack scaffolding + publishing path for `hivemind` (cycle-006 URL-installed this as a pre-cycle-007 shim in construct-network-tools)
3. **TeamCreate-executor implementation** — consume `stamets-prior-art-teamcreate-tmux.md` output; implement `backend: teamcreate` as `stage-executor-teamcreate.sh` honoring same argv contract
4. **Composition YAML `persona:` field authoritative (F37)** — resolve_persona() honors stage's declared persona before falling back to construct-resolve

### Medium-priority

5. **Multi-construct-per-stage composition mechanics** — once operator has hands on ≥2 concrete compositions
6. **Shared persistent-teammate context across stages** — stages 2 and 4 (both the-easel) accumulate to one shared history rather than two separate per-stage histories
7. **Claude Code rewind orchestration** — programmatic per-pane rewind as failure-recovery policy
8. **`constructs try` ephemeral exec** — npx/uvx pattern; SEED cycle-005 decision
9. **Failure-policy enforcement in runner** — doctrine §17.2 full closure; runner honors `failure_policy:` blocks (timeout / retry / idempotency / dead-letter)
10. **F36 YAML list-with-colons lint** — construct-validate.sh warns on the pattern

### Carryover from cycle-005 (still open)

11. Security model + data governance + trust model (flatline SKP-004/005)
12. Namespace collision enforcement in registry
13. `.source.json` backfill for 29 legacy installs (F22)
14. Dynamic Labs → Freeside sovereign auth
15. Supabase → Turso migration
16. Dependency resolution / version constraints
17. `/feel` routing UX reconciliation (F28)
18. JSONL append integrity hardening (flatline SKP-006)
19. F30 grimoires draft policy
20. F31 symlink-integrity check in global sync
21. F32 ecosystem-wide `CONSTRUCT-README.md` regeneration
22. F34 publish-validator display polish

### Emergent from cycle-006

23. F38 expedited Jani review or PR consolidation — operator judgment
24. CURATOR voice operator review + upstream publish of `construct-network-tools` — F33 FINAL closure
25. QMD integration for per-agent memory (SEED Thread 5 — cycle-007 candidate)
26. UI-surface adapters beyond tmux — IDE split-panes, web dashboard, mobile (cycle-006 L-threadpipe surface enables)
27. **Navigable-state-machine runner** (operator-declared mid-session) — elevate runner from sequential-with-iteration to full nonlinear navigation. Stage states: waiting / active / complete / needs-revisit. Operator controls: jump / iterate / close-forward. Substantial re-architecture; cycle-007 or dedicated.
28. **Navigation-layer-via-templates** (operator commit `5360bf0f`) — each construct exposes declared template pointers (artisan → button-variants, the-easel → mood-board, mint → asset-generation). Schema change, not runner change. Structured-but-loose exploration surface per stage.
29. **Expertise-as-consultant framing** (operator commit `5360bf0f`) — constructs as accelerated-learning surfaces, not just capability injection. Doctrine-candidate per [[naming-is-diagnostic]]; placeholder noted on [[construct-ontology]].
30. **Sprawl design-system divergence as production KANSEI** — run website-scaffold against actual Sprawl world apps; surface real button-alignment divergence; validate whether the substrate reduces the operator's manual consolidation work (SEED §4 KANSEI beyond mock-mode validation).
31. **Stack/framework swap consideration** (operator commit `5360bf0f`) — Radix vs Base UI vs Svelte-sovereign. Framework decisions are bigger than compositional-rails work; explicitly cycle-008+ or dedicated, NOT cycle-007.

Inheritance list is LONG. Cycle-007 framing should pick 2-3 load-bearing items (likely items 1, 2, 3 plus one from the cycle-005 carryover bucket) and defer the rest.

---

## 6 · Cycle authorship lens

**Cycle-006 · operator + substrate** (agentic full-stack — operator-named frame, agent-built substrate, co-authored doctrine)

Declared at SEED open (§9). Held. The shift from cycle-005 ("agent building plumbing to close cycle-004's Q5") to cycle-006 ("operator naming three-layer architecture + rails insight + scope-lock rule; agent implementing primitives in service of one concrete composition") was load-bearing. Cycle-006's doctrine amendments (§18.1-18.6) are all operator-sourced claims that the agent crystallized + shipped.

---

## 7 · What this cycle proved

1. **Three-layer architecture is real, not doctrine**. FE (compose-panes) / BE (compose-run + stage-executor-tmux) / substrate (bash + claude -p + tmux). Swappable at each layer via the typed-stream API (compose-trajectory-contract.md).
2. **Agentic full-stack development is a runnable concept**. Operator can point at the two-pane tmux + renderer and say "this is the stack."
3. **Composition topology delivers dispatch-determinism**. Bats #7 locks it: same composition → same dispatch trail every run, regardless of LLM content variance. Rails work.
4. **Parallel-plumbing debt from cycle-005 is substantially closed** (Q3 partial). The pipe work is now visibly legible at glance latency. Remaining bridge (operator muscle-memory slash commands → compose-run) is cycle-007.
5. **Substrate is Unix-native**. Bats #7 runs in pure bash + claude CLI + bats; no Claude Code agent-teams feature required. Any operator with those three can fork + run.
6. **One concrete composition earns the substrate's keep**. Website-scaffold runs end-to-end in mock mode (full 7 stages, schema-valid final Artifact, orchestrator trajectory complete).
7. **Meta-pack EXEMPLAR pattern is real**. construct-network-tools demonstrates what "taste statement, not toolbox" looks like — dogfoods v3, CURATOR persona ratified via naming-is-diagnostic, auto-generates CONSTRUCT-README via butterfreezone.
8. **Doctrine v6 §18 formalizes the WHY**. Rails-as-determinism-under-non-determinism is now load-bearing doctrine. Future cycles can't slide back into "composition is just scaffolding."

---

## 8 · What didn't land cleanly

- **L-migrate merge**: OPEN awaiting @janitooor review. Cycle does not gate on this. In-flight carryover if review takes > cycle window.
- **L-meta-pack upstream publish**: local authoring complete; gh repo create + push gated on operator review of CURATOR voice. PUBLISH.md documents the one-command path.
- **Real-LLM end-to-end website-scaffold run**: cycle-006 validated in mock mode (LOA_STAGE_MOCK=1). A live run with `claude -p` per stage would cost real LLM tokens and hasn't been exercised in this cycle. The substrate handles it (stage-executor-tmux has the real path); only end-to-end live validation is missing.
- **Live iteration-loop run**: bats uses `--no-interactive` which auto-accepts. Full happy-path with operator `y/N/a` iteration prompts requires live session.
- **F35 true long-lived-pane persistent mode**: file-accumulated history is MVP. Real tmux-pane-held interactive sessions with marker-based or IPC completion detection is cycle-007.

### Significant architectural gap — navigable state machine vs sequential-with-iteration

Operator clarified mid-session (commit `0f119872`): the runner should be a **navigable persistent state machine**, not a one-shot pass. Stages enter *waiting* state; operator navigates nonlinearly (jump to stage 3 while stage 5 is active; edit stage 2 output after seeing stage 6); iteration loops are first-class (runner must NOT prevent revisiting); operator marks stages complete explicitly.

**Cycle-006 MVP honors only PART of this model**:
- ✅ Iteration loops as first-class (`--no-interactive` skips, but `--interactive` runs them with y/N/a prompts)
- ✅ Per-stage persistence (file-accumulated history for persistent-mode stages)
- ✅ Backend invariant preserved (substrate-native, forkable)
- ❌ **Nonlinear navigation** — runner is still sequential dispatch; jumping mid-chain to an arbitrary stage is not supported
- ❌ **Stage status states** (waiting / active / complete / needs-revisit) — compose-panes-render shows *running/done/pending*, which is less expressive
- ❌ **Operator navigation controls** (jump / iterate / close) — iteration ACK is the only explicit control; no arbitrary stage revisit

**Implication**: cycle-006's substrate is **pipe-with-iteration**, which is the lower bound of what the navigable state machine requires. Full-fidelity navigable state machine is cycle-007 (or later) — needs runner-level state management rather than bash-script linear dispatch, and UI-level interactive navigation rather than static render-on-event.

**This is the single biggest honest gap in cycle-006's close.** Routing to cycle-007 inheritance item 27 below.

### Cross-repo invariant depends on L-migrate merge

Operator observation (commit `0f119872`): "After cycle-006 ships, this composition runs in any Loa-mounted repo — `cd sprawl-interface && construct-compose website-scaffold --target <app>`. The substrate lives in Loa; every mounted repo inherits it. This is the point of the migrate leg."

Cycle-006 opens PR #616 to ship this invariant. Until Jani merges, the cross-repo invariant is NOT load-bearing — each mounted repo needs its own copy of the scripts. Closure of this invariant is gated on upstream review.

### Sprawl KANSEI is the real validation — open for operator

Operator (commit `0f119872`) surfaced: **"Cycle-006 isn't abstract infrastructure. Its success criterion is reducing a specific class of divergence work the operator is doing manually today: button alignment across Sprawl world apps, component-system consolidation, cross-app design-system propagation."**

Cycle-006 SEED's Q5 asks about cycle-007 framing but doesn't gate on Sprawl application. Operator named three options:
- **(a)** In-cycle KANSEI gate — Sprawl run must succeed for cycle-006 close
- **(b)** Cycle-007 application — ship substrate + YAML, cycle-007 runs against Sprawl
- **(c)** Post-cycle demonstration — close cycle-006 on toy-target validation; Sprawl is separate paired session

Operator's stated lean was (c), with acknowledgment that (a) or (b) may match urgency better.

**Cycle-006 as shipped close-time: option (c) (toy-target mock mode validation + bats lock, Sprawl deferred)**. If operator prefers (a), cycle-006 should re-open with a Sprawl paired session before final close.

---

## 9 · Supersession

Cycle-005 inheritance item 10 (real-LLM dispatch) is partially superseded — the cycle-006 infrastructure is ready; a cycle-007 "real-LLM dispatch beyond website-scaffold" handles the broader scope. Item 9 (failure-policy enforcement) rolls forward unchanged.

F33 from cycle-005 (construct-network-tools doesn't exist) is MECHANICALLY closed by L-meta-pack. Final registry closure awaits operator-reviewed upstream publish.

Doctrine v5 chain-preserved per OTLET. §18 amendment adds the three-layer structure; all v5 invariants (typed streams, read-modes, dispatch-det-vs-output-repro split, failure-semantics vocabulary, grimoires-as-interface) hold verbatim.

---

*Cycle-006 close · 2026-04-23 · 10/10 legs landed, 2 external-gated, 5 new findings. Doctrine v6 active. Three layers named, one concrete composition runnable, parallel-plumbing debt substantially repaid, scope-lock rule preserved. The substrate earns its keep.*
