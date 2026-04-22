# SEED — Cycle-006 · Agentic Full-Stack Runtime (three layers, one concrete composition)

> *"Bash should be like the underlying layer. Unix principle is the underlying layer. [...] In bash, is the backend layer the runtime and the UI layer the vibe coding feel area? I want to separate these two concepts because it will enable us to modify the UI layer how we want, and honestly, users can modify how they want as well, but the underlying runtime stays consistent. I think this is the agentic full stack development."* — operator 2026-04-23 late
>
> *"(it provides rails for not only my adhd but agents to maximize understanding of the topology of the problem and deterministic outputs IN a non deterministic LLM)"* — operator 2026-04-23 late (the load-bearing parenthetical that turned into the WHY)
>
> **Status**: Draft · Dispatch this session after operator review
> **Date**: 2026-04-23 late
> **Supersedes**: cycle-005 inheritance queue items 10 (real LLM dispatch) + the transparency-debt strand of [[constructs-as-packages]] §3 amendment
> **Doctrine**: v5 active (§17 landed at cycle-005 close); v6 amendment drafted at cycle-006 close
> **Dispatch mode**: conversational-paired + shell-first (cycle-003/004/005 precedent)
> **Branch**: `feat/spiral-loa-constructs-cycle-006-agentic-fullstack-runtime`

---

## 0 · Why this cycle exists (the rails insight, leading)

**Composition topology IS how you get dispatch-determinism from non-deterministic LLMs.** Each stage's output varies (LLM variance unavoidable at the model layer); the topology doesn't. Same composition → same stages in same order → same types flowing between them → same final artifact shape. **Stage output varies; the problem topology doesn't.**

Rails cut both ways — they orient the *operator* (topology is legible; ADHD gets structure) AND *the agents* (each stage knows exactly what's upstream, what's downstream, what type-shape it produces, what it refuses). Legible topology is the substrate of usable LLM work at scale.

This directly grounds [[construct-pipe-doctrine]] §17.1 (dispatch-determinism vs output-reproducibility). §17.1 named the split; this cycle names *why the split matters* and builds the primitives that cash it in. Transparency in the UI layer (pipe graph, emoji per stage, inline controls, per-pane colors) is NOT decoration — it's the operator's view into the rails. Hiding the pipe would erase the determinism the rails produce.

Load-bearing reference: [[agent-teams-as-pipes]] §"Rails as determinism-under-non-determinism."

### Three convergent pressures forcing cycle-006 now

1. **Cycle-005 shipped parallel plumbing.** The runner executes, the schemas validate, the butterfreezone adapter generates READMEs — but none of it fires when the operator actually types `/feel Button.tsx`. Invisible by construction. [[constructs-as-packages]] §3 amendment named this as the **parallel-plumbing antipattern**; it is load-bearing debt this cycle repays.

2. **Operator surfaced the three-layer architecture.** After cycle-005 close, the operator sharpened the pipe doctrine into frontend / backend / substrate — same structural pattern as web-dev FE/BE/HTTP+OS. The API between FE and BE is the typed-stream output from cycle-005. Multiple UIs can consume the same stream. Backend is swappable per composition. Substrate is bash + markdown + QMD + headless Claude + Unix principle. **This is agentic full-stack development** (operator-coined 2026-04-23 late).

3. **A concrete composition is ready.** Website scaffolding (7 stages: research → mood-board → mint assets → mood refinement → design UI system → component refinement → product structuring) is the operator's actual world-class-design-studio workflow. Real LLM work, real iteration loops, real taste output. The substrate earns its keep by running it.

Cycle-006 closes the parallel-plumbing debt, ships the three-layer runtime at MVP, and proves it by running one real composition end-to-end.

---

## 1 · Scope lock (the forcing function)

**Rule, operator-declared 2026-04-23 late, carried verbatim into this SEED so it is not re-litigated at dispatch time**:

> **Build primitives in service of one concrete composition. Do not design a DSL, a team-typing language, or upfront abstraction layers. Those emerge from repeated usage across N compositions, not from one.**

Concretely, cycle-006 touches:

- `.claude/scripts/` — new `compose-run.sh` backend harness (`claude -p` + tmux + bash); vibe-coding UI surface; per-stage mode dispatch
- `grimoires/compositions/` — one new composition YAML (`website-scaffold.yaml`) with 7 stages + 2 iteration loops declared
- `grimoires/loa-constructs-seed-2026-04-21/` — doctrine v6 amendment on three-layer architecture + agentic-full-stack naming
- `grimoires/loa-constructs-seed-2026-04-21/` — prior-art research log for TeamCreate + tmux + rewind (research-only leg)
- **Upstream repos** (migration, governance-gated per §11):
  - `0xHoneyJar/loa` — migrate cycle-005 scripts (`construct-compose.sh`, `construct-validate.sh`, `stream-validate.sh`, `butterfreezone-construct-gen.sh`), schemas, and `validating-construct-manifest` skill from loa-constructs into loa proper. Jani-PR discipline, no admin merge.
- **Meta-pack**: `construct-network-tools` authored as EXEMPLAR pack (not toolbox), dogfooding template v3, taste stack = `/hivemind` + artisan + k-hole + the-arcade

**Does NOT touch** (scope-lock explicit exclusions):

- **No DSL on top of YAML compositions** — operator self-pushback, carried
- **No multi-construct-per-stage** — one teammate per stage, strict MVP
- **No backend rebuild beyond `claude -p` + tmux + bash** — Unix-native substrate
- **No TeamCreate executor implementation** — research-only leg; remains as optional alternative backend for future wiring
- **No QMD integration** — cycle-007; primitives already on substrate
- **No hivemind-as-construct packaging** — cycle-007; this cycle installs `hivemind` from known URL (git ref) so the taste stack works, nothing more
- **No `constructs try` ephemeral exec** — cycle-007
- **No multi-construct loadouts per stage composition mechanics** — cycle-007 once operator has hands on multiple concrete compositions
- **No security cycle, no Dynamic→Freeside migration, no Supabase→Turso** — separate cycles

The ban list exists because this cycle is MVP-bounded. Primitives earn their place by being used, not by being designed.

---

## 2 · Legs

| Leg | Purpose | Est. lines | Priority |
|---|---|---|---|
| **L-backend** | `compose-run.sh` + per-stage mode dispatch (persistent via long-lived tmux pane + `tmux send-keys`; fresh via one-shot `claude -p`). Substrate layer below UI. | ~350 shell | CERTAIN |
| **L-frontend** | Vibe-coding UI consuming trajectory stream — per-pane colors by construct, emoji per pane, inline controls, main orchestrator pane renders pipe graph + stream activity. Closes parallel-plumbing debt from cycle-005. | ~250 shell + curses/tput | CERTAIN |
| **L-composition** | Author `grimoires/compositions/website-scaffold.yaml` — 7 stages with per-stage `mode: persistent | fresh`; 2 iteration loops (2↔4, 5↔6) declared. First real composition the runner targets. | ~150 YAML | CERTAIN |
| **L-migrate** | Move cycle-005 scripts from loa-constructs to loa proper: `construct-compose.sh`, `construct-validate.sh`, `stream-validate.sh`, `butterfreezone-construct-gen.sh`, `.claude/schemas/*.schema.json`, and the `validating-construct-manifest` skill. Jani PR discipline — **PR only, NO admin-merge**, await @janitooor review. | ~300 shell/md moved + PR body | CERTAIN |
| **L-meta-pack** | Author `construct-network-tools` as EXEMPLAR pack (operator-ratified 2026-04-22). Dogfoods template v3. Taste stack: `/hivemind` (personal-path skill, URL-installed until cycle-007) + artisan + k-hole + the-arcade. Not a toolbox; an opinionated statement. | ~200 YAML + SKILL.md + README | CERTAIN |
| **L-threadpipe** | Transparency layer surfacing pipe activity inline per doctrine §14.4 (emoji-as-object-refs) + §15.3 (inline-controls vibe-coding surface). Same surface as L-frontend; this leg names the UX doctrine alignment explicitly and files the §14.4/§15.3 invariants as AC. | integrated with L-frontend (+ ~40 md) | CERTAIN |
| **L-research** | TeamCreate + tmux + rewind prior-art research-only leg. Catalog primitives; document what would make `--backend teamcreate` viable; NO implementation. Output: `grimoires/loa-constructs-seed-2026-04-21/stamets-prior-art-teamcreate-tmux.md`. | ~research + 1 md | LIKELY |
| **L-e2e** | Run website-scaffold composition end-to-end on a real target (small operator site or one of the Honey Jar world pages). Validate: all 7 stages execute, iteration loops fire, trajectory + feedback-v3 emit, final output schema-valid. | test run + 1 bats | LIKELY |
| **L-doctrine** | Doctrine v6 amendment: three-layer architecture (frontend/backend/substrate), agentic-full-stack naming, focus-per-register principle, backend-choice rationale (`claude -p` + tmux over TeamCreate). | ~100 md | CERTAIN |
| **L-close** | Findings + cycle-007 inheritance queue + KANSEI gate + cycle authorship lens. | ~60 md | CERTAIN |

**Shell-first discipline** (doctrine §13.1) held through all legs. No TypeScript expected. Tmux + bash + `claude -p` only.

**Leg sequencing hint** (substrate-first per [[agent-teams-as-pipes]]):

1. L-backend first — substrate layer below UI. Get per-stage mode dispatch working in isolation before wiring UI.
2. L-composition parallel — website-scaffold.yaml can author while backend scripts land; they compose at L-e2e.
3. L-frontend + L-threadpipe together — UI consumes backend's trajectory stream; threadpipe is the UX doctrine naming.
4. L-migrate independent — can run any time; PR gate is async anyway.
5. L-meta-pack independent — can run any time; requires L3 cycle-005 template v3 merged upstream (status check first).
6. L-research independent — research-only, no code dep.
7. L-e2e gates on L-backend + L-frontend + L-composition landing.
8. L-doctrine + L-close last.

---

## 3 · Acceptance criteria

### L-backend · `compose-run.sh` + per-stage mode dispatch

- **AC-backend.1** · `compose-run.sh <composition.yaml> <input>` reads a composition, dispatches stages per their declared `mode:` (persistent | fresh), and executes to completion
- **AC-backend.2** · `mode: fresh` dispatches each stage as `claude -p` one-shot with piped input; subprocess isolation; context resets by construction
- **AC-backend.3** · `mode: persistent` opens a long-lived tmux pane with a Claude Code session loaded with the stage's construct/skill loadout; subsequent stage invocations reuse the pane via `tmux send-keys`
- **AC-backend.4** · Trajectory row emitted per stage entry + exit; matched `session_id`; stream_type declared
- **AC-backend.5** · Per-stage failure propagates a non-zero exit + emits failed-outcome trajectory row (per doctrine §17.2 invariant — failures must be observable; silent-drop is a doctrine violation)
- **AC-backend.6** · Iteration loops (declared in composition YAML as `iterate: [stage_a, stage_b]`) are honored — runner loops between the paired stages until a terminal signal (operator ACK or bounded iteration cap)
- **AC-backend.7** · Backend field honored: composition declares `backend: headless-tmux` (default) or `backend: teamcreate` (not implemented this cycle — clear error message pointing at L-research output)
- **AC-backend.8** · Three read-modes per doctrine §14.3 (glance/orient/intervene) on runner stdout

### L-frontend · vibe-coding UI surface

- **AC-frontend.1** · Main orchestrator pane renders a pipe graph — stage nodes + directed edges + current-stage highlight — updated live as backend emits trajectory rows
- **AC-frontend.2** · Each stage pane is colored by construct identity (artisan = warm amber, k-hole = muted violet, the-easel = warm sage, mint = honey gold, the-arcade = cool slate, observer = deep teal — or operator-overridable via composition YAML)
- **AC-frontend.3** · Each stage pane displays an emoji glyph for its construct (🔨 artisan, 🕳️ k-hole, 🎨 the-easel, 🍯 mint, 🎮 the-arcade, 🐝 observer, 🔮 kansei) — handle-convention per doctrine §14.4
- **AC-frontend.4** · Stream activity visible inline: stage-entry / stage-exit timestamps, stream type transitions (e.g. `Signal → Verdict`), durations at glance latency (<1s)
- **AC-frontend.5** · Inline controls per doctrine §15.3: operator can stepper `[-4+]`-style on stages requiring discrete operator input; emoji-as-object-refs honored in Intent stream authoring
- **AC-frontend.6** · Per-stage pane supports rewind (Claude Code native) — operator can rewind one pane without cascading to others
- **AC-frontend.7** · UI surface is swappable — backend trajectory stream (JSONL) is documented as the API contract; alternative UIs can consume the same stream without touching the runner

### L-composition · website-scaffold.yaml

- **AC-composition.1** · `grimoires/compositions/website-scaffold.yaml` exists with 7 stages in the order: research → mood-board → mint assets → mood refinement → design UI system → component refinement → product structuring
- **AC-composition.2** · Each stage declares `construct:`, `skill:`, `persona:` (if persistent), `mode: persistent | fresh`, `reads: [streams]`, `writes: [streams]`
- **AC-composition.3** · Iteration loops declared: `iterate: [2, 4]` (mood-board ↔ refinement) and `iterate: [5, 6]` (design system ↔ component refinement)
- **AC-composition.4** · Per-stage `mode` values match the table in [[agent-teams-as-pipes]] §"The concrete use-case" — research fresh, mood exploration persistent, mint fresh, mood refinement persistent, design-UI persistent, component persistent, product-structure fresh
- **AC-composition.5** · Backend field defaults to `headless-tmux`; composition is forkable by any operator who has `claude` CLI + bash + tmux
- **AC-composition.6** · Copy construct (vocabulary-bank + herald) noted as weaving in at stages 5–7 but not declared as its own stage — preserves operator-stated shape
- **AC-composition.7** · Validates under L4 cycle-005's `construct-validate.sh` and L2 cycle-005's stream-type check at composition-build time

### L-migrate · scripts + schemas + validator skill → loa

- **AC-migrate.1** · Upstream PR on `0xHoneyJar/loa` moves from loa-constructs: `construct-compose.sh`, `construct-validate.sh`, `stream-validate.sh`, `butterfreezone-construct-gen.sh`; `.claude/schemas/*.schema.json`; `.claude/skills/validating-construct-manifest/`
- **AC-migrate.2** · loa-constructs retains thin shim / symlink / deprecation-notice for backward compat during transition period
- **AC-migrate.3** · PR body explains: what (script migration), why (per [[constructs-as-packages]] §"Four-axis ownership boundary" — connectivity responsibility belongs on Loa, not the registry; these scripts are connectivity tooling), risk (no breaking change to existing installs — paths preserved or shimmed), request (review from @janitooor)
- **AC-migrate.4** · PR **not admin-merged** per SEED §11; cycle-006 does not gate on merge
- **AC-migrate.5** · If Jani rejects or requests changes, L-migrate adapts or defers to cycle-007 carry-over
- **AC-migrate.6** · Cycle-005 findings F31 (symlink integrity) + F32 (27-pack CONSTRUCT-README.md drift) addressable by the migrated tooling; documented in PR body as downstream benefit

### L-meta-pack · construct-network-tools EXEMPLAR

- **AC-meta-pack.1** · `construct-network-tools` pack authored and published to registry per [[naming-is-diagnostic]] rule (closes F33)
- **AC-meta-pack.2** · Pack is an EXEMPLAR, not a toolbox — fully-decorated, taste-carrying, demonstrates template v3 conventions (streams, persona handle, CONSTRUCT-README.md)
- **AC-meta-pack.3** · Composes taste stack: declares `compose_with: [hivemind, artisan, k-hole, the-arcade]`
- **AC-meta-pack.4** · `hivemind` URL-installed (git ref since cycle-007 pack doesn't land yet) — composition works end-to-end for a fresh operator
- **AC-meta-pack.5** · `CONSTRUCT-README.md` auto-generated via butterfreezone adapter (dogfoods cycle-005 L6)
- **AC-meta-pack.6** · Includes one reference composition YAML (likely a pared-down version of website-scaffold) so a fresh author reading the pack sees what "authoring a composition" looks like

### L-threadpipe · transparency UX doctrine alignment

- **AC-threadpipe.1** · UI surface honors doctrine §14.4 emoji-as-object-refs end-to-end (Intent authoring + pipe graph + stream activity display)
- **AC-threadpipe.2** · Inline controls (§15.3 vibe-coding surface) available on stages requiring operator parameter input
- **AC-threadpipe.3** · Three read-modes per §14.3 supported by default (glance = pipe graph; orient = stage-entry/exit with durations; intervene = full trajectory + stream payload view)
- **AC-threadpipe.4** · Documentation markdown explicitly files the alignment: one page in `grimoires/loa-constructs-seed-2026-04-21/` naming the §14.4/§15.3 invariants as cycle-006 AC closures (not a new doctrine — naming-is-diagnostic compliance)

### L-research · TeamCreate + tmux + rewind prior art

- **AC-research.1** · Research document authored: `grimoires/loa-constructs-seed-2026-04-21/stamets-prior-art-teamcreate-tmux.md`
- **AC-research.2** · Covers: TeamCreate API surface (agent spawning, SendMessage, TaskCreate in Agent Teams mode); tmux orchestration patterns (session management, pane routing, send-keys mechanics); Claude Code rewind command semantics
- **AC-research.3** · Identifies what would make `backend: teamcreate` viable in a future cycle — concrete primitives + gaps
- **AC-research.4** · NO implementation — research-only leg, per scope lock
- **AC-research.5** · Output routes into cycle-007 inheritance queue as TeamCreate-executor candidate

### L-e2e · website-scaffold end-to-end

- **AC-e2e.1** · `compose-run website-scaffold <target>` executes all 7 stages in declared order
- **AC-e2e.2** · Iteration loops fire: stages 2↔4 and 5↔6 loop until operator-ack or iteration cap
- **AC-e2e.3** · Trajectory rows: at minimum 14 (7 entry + 7 exit), plus iteration-loop extras; all paired; all schema-valid
- **AC-e2e.4** · Final artifact is a structured product specification (the-arcade stage 7 output) — content quality not gated, but schema conformance is
- **AC-e2e.5** · Bats test `tests/cycle-006-website-scaffold.bats` locks behavior at the trajectory-shape layer (not content)
- **AC-e2e.6** · Runs on operator machine with only `claude` CLI + bash + tmux — no Claude Code Agent Teams feature required

### L-doctrine · v6 amendment

- **AC-doctrine.1** · New section §18 in `bonfire-construct-pipe-doctrine.md`
- **AC-doctrine.2** · §18.1 names three-layer architecture (frontend/backend/substrate), promotes [[agent-teams-as-pipes]] three-layer model into doctrine
- **AC-doctrine.3** · §18.2 ratifies "agentic full-stack development" as the operator-coined name for the overall pattern
- **AC-doctrine.4** · §18.3 files the focus-per-register principle (one agent, one register; context purity is the substrate of expert-quality output)
- **AC-doctrine.5** · §18.4 records backend-choice rationale: `claude -p` + tmux chosen over TeamCreate because substrate-native, forkable without Claude Code, natural fit for fresh-per-stage semantics
- **AC-doctrine.6** · Version bump v5 → v6; v5 chain-preserved per OTLET

### L-close · findings + inheritance + KANSEI

- **AC-close.1** · `cycle-006-findings.md` authored per OTLET convention
- **AC-close.2** · Cycle-007 inheritance queue drafted, including all deferred items from §"Deferred explicitly" below
- **AC-close.3** · KANSEI gate answered (operator fills Q5 free-text)
- **AC-close.4** · Cycle authorship lens declared + held

---

## 4 · Dispatch

**Budget**: $150 target · $220 cap · Profile `medium` (substantive backend + frontend + 7-stage composition + upstream migration PR)

Cap is higher than cycle-005 because:
- L-backend + L-frontend are a two-layer build (~600 lines combined, bash + curses/tput UI work is fiddly)
- L-composition authors a 7-stage YAML with per-stage mode + iteration loops (substantial spec work)
- L-migrate is an upstream-repo PR (clone + edit + PR body + review-cycle overhead)
- L-e2e runs a real 7-stage composition — actual LLM cost per stage, iteration-loop cost per loop
- L-meta-pack is a full exemplar pack authored + published

**Dispatch mode**: conversational-paired + shell-first (cycle-003/004/005 precedent). If autonomous preferred, `/spiraling` harness is compatible — all acceptance criteria are observable.

**Kickoff prompt** (already in hand from operator; included for SEED self-contained completeness — operator message used verbatim):

```
Dispatching cycle-006 per SEED at
grimoires/loa-constructs-seed-2026-04-21/cycle-006-SEED-agentic-fullstack-runtime.md

Branch: feat/spiral-loa-constructs-cycle-006-agentic-fullstack-runtime
Base: main (current tip)
Mode: conversational-paired, shell-first per doctrine §13.1
Budget: $150 target / $220 cap

WHY THIS CYCLE EXISTS — rails insight is load-bearing WHY:
  composition topology IS dispatch-determinism under non-deterministic LLMs.
  rails orient operator (ADHD / focus) AND agents (topology legibility).
  transparency in UI is the operator's view into the rails.

THREE-LAYER ARCHITECTURE:
  FE · vibe-coding UI (replaceable, taste-per-operator)
  BE · runtime (claude -p + tmux + bash harness)
  Substrate · kernel (bash + markdown + QMD + Unix principle)

OPERATOR DECISIONS LOCKED (Q1–Q4):
  Q1 persistent vs fresh → BOTH, declarative per-stage YAML
  Q2 TeamCreate vs build-from-scratch → BUILD FROM SCRATCH
  Q3 stage cardinality → ONE teammate per stage (MVP)
  Q4 MVP UI → per-pane colors + emoji + pipe graph + stream activity

SCOPE-LOCK (operator self-pushback):
  NO DSL. NO multi-construct-per-stage. NO backend rebuild beyond
  claude -p + tmux + bash. NO TeamCreate executor impl (research only).
  NO QMD integration (cycle-007). NO hivemind-as-construct (cycle-007).

IMPORTANT governance (SEED §11):
  0xHoneyJar/loa is Jani-owned. L-migrate is PR-only, request
  @janitooor review, NEVER admin-merge.

Start with L-backend (substrate layer below UI). Then L-composition
parallel. Then L-frontend + L-threadpipe together. L-migrate + L-meta-pack
+ L-research independent. L-e2e gates on backend + frontend + composition.
L-doctrine + L-close last.

Findings go in cycle-006-findings.md per OTLET convention.

Begin with constructs-list glance + reading ~/hivemind/wiki/concepts/
agent-teams-as-pipes.md in full (three-layer architecture is the compass),
then L-backend.
```

**Pre-dispatch checklist** (this session):
- Verify main is clean + current (`git log -3`)
- Branch from main (`git checkout -b feat/spiral-loa-constructs-cycle-006-agentic-fullstack-runtime`)
- Confirm cycle-005 L3 (construct-base template v3) and L5 (loa `--with-constructs`) PR states — if L3 unmerged, L-meta-pack may need to inline the template v3 conventions rather than rely on upstream
- Then begin L-backend

---

## 5 · KANSEI gate (S8, operator-answered)

Five questions. Target ≥4/5 YES on Q1–Q4 + constructive Q5. Halt if <3/5.

| # | Question | Pass criterion |
|---|---|---|
| Q1 | Can I run `compose-run website-scaffold <target>` and watch all 7 stages execute with per-pane colors + emoji + live pipe graph? | Y |
| Q2 | Does the iteration loop (2↔4 or 5↔6) fire visibly — I can see mood-board and refinement panes exchanging until I ACK? | Y |
| Q3 | When I type `/feel Button.tsx` in my regular workflow, does anything from cycle-005's plumbing NOW fire visibly on my screen (transparency debt repaid)? | Y |
| Q4 | Can another operator clone my `website-scaffold.yaml`, edit the stages, and run it on their machine with only `claude` CLI + bash + tmux (backend is Unix-native, not Claude-native)? | Y |
| Q5 | Free-text: with cycle-006 shipped, what's the SECOND composition you want to author? (drives cycle-007 framing; second composition is where abstraction patterns start earning their keep) | constructive answer |

---

## 6 · Review lens (carryover + additions)

Still applicable: cycle-001 GECKO + KEEPER + OTLET + KISS; cycle-004 COMPILE + TRANSPARENCY + DETERMINISM + PLAYGROUND; cycle-005 EXECUTION + INTEGRATION.

**Cycle-006 additions**:

- **RAILS lens**: "does this make composition topology legible to both operator and agents at glance-latency?" — L-frontend + L-threadpipe must pass this
- **SUBSTRATE lens**: "does this ride on bash + tmux + `claude -p` without requiring Claude Code agent-teams or any Claude-native feature?" — L-backend must pass this (the fork-ability test)
- **VISIBILITY lens**: "does cycle-006 close the parallel-plumbing debt from cycle-005 — does cycle-005's work fire visibly on operator muscle-memory invocations now?" — cycle-006 close-lens, not per-leg
- **FOCUS-PER-REGISTER lens**: "does each stage pane load ONE construct's expertise, with context-reset by construction between stages?" — L-backend AC-backend.2 enforces this structurally

---

## 7 · What landing this proves

If cycle-006 lands cleanly:

1. **Three-layer architecture is real, not just doctrine** — FE / BE / substrate, swappable at each layer, typed-stream API between FE and BE
2. **Agentic full-stack development is a runnable concept** — operator can point at a tmux screen and say "this is what agentic full-stack looks like"
3. **Composition topology delivers dispatch-determinism** — running `compose-run website-scaffold X` three times produces three identical dispatch trails (same constructs, same order, same stream types) with varying content (LLM variance honored)
4. **Parallel-plumbing debt from cycle-005 closes** — operator can SEE the pipe work; transparency is not decoration, it's the determinism surface
5. **The substrate is Unix-native** — any operator with `claude` + bash + tmux can fork + run; no Claude Code agent-teams lock-in
6. **One concrete composition earns its keep** — website scaffolding runs end-to-end; operator can point at a real product and say "built via composition"
7. **Meta-pack exemplar pattern is real** — `construct-network-tools` proves that meta-packs are taste statements, not toolboxes; closes F33 from cycle-005

If it doesn't land cleanly, the findings route to cycle-007+ and doctrine absorbs what broke (OTLET chain-preserved).

---

## 8 · What cycle-007 inherits

Pre-drafted from cycle-005 §5 inheritance queue + scope-lock deferrals + cycle-006 emergence:

### Deferred explicitly from cycle-006 (first-class carryover)

1. **Hivemind-as-construct** — pack scaffolding + publishing path; `/hivemind` skill promoted from local-only to distributable pack with blank-slate scaffolding (per [[hivemind-trichotomy]] five-layer split)
2. **TeamCreate-executor implementation** — alternative backend wiring; consume L-research output; implement `backend: teamcreate` option in composition YAML
3. **`constructs try` ephemeral exec** — npx/uvx pattern; from cycle-005 decision + stamets-prior-art package-manager synthesis
4. **QMD integration** — per-agent memory via QMD-queryable markdown + optional hivemind integration; "collections" as possible organizing primitive
5. **QMD freshness / maintenance pass** — dedicated pass for stale content + reorganization
6. **Multi-construct-per-stage composition mechanics** — once operator has hands on ≥2 concrete compositions
7. **Failure-policy enforcement in runner** — doctrine §17.2 full closure; runner honors `failure_policy:` blocks (timeout / retry / idempotency / dead-letter)
8. **Real-LLM dispatch beyond cycle-006 scope** — stages outside the 7-stage website composition (e.g. feel-audit via real artisan + observer dispatch)

### Carryover from cycle-005 (still open)

9. Security model + data governance + trust model (flatline SKP-004/005; dedicated security cycle)
10. Namespace collision enforcement in registry
11. `.source.json` backfill for 29 legacy installs (F22 from cycle-003)
12. Dynamic Labs → Freeside sovereign auth (operator pivot 2026-04-13)
13. Supabase → Turso migration (infra decommission pending unpause)
14. Dependency resolution / version constraints (cycle-005 integration research Gap 2)
15. `/feel` routing UX reconciliation (F28: artisan pack-layer vs Operator-OS-aware resolver)
16. JSONL append integrity hardening (flatline SKP-006)
17. F30 grimoires draft policy — commit under `draft/` or route to hivemind
18. F31 symlink-integrity check in global sync
19. F32 ecosystem-wide `CONSTRUCT-README.md` regeneration — 27 packs drifted
20. F34 publish-validator display polish — `manifest_validate` detail truncation

### Emergent from cycle-006 (anticipated)

21. UI-surface adapters — alternative vibe-coding UIs beyond tmux (IDE split-panes, web dashboard, mobile)
22. Composition versioning — `website-scaffold-v2.yaml` when taste evolves; semver-style pinning
23. Persistent-teammate state export — operator wants to save artisan-teammate's accumulated taste across sessions (bridge into cycle-007 QMD + hivemind integration)

Inheritance list is intentionally LONG — cycle-006 ships a substrate that unlocks many next-tier questions. Cycle-007 framing should pick 2–3 load-bearing items (likely hivemind-as-construct + TeamCreate-executor + multi-composition usage) and defer the rest.

---

## 9 · Cycle authorship lens

Cycle-001 · OSTROM (architecture-first)
Cycle-002 · operator (experience-first paired-scribe)
Cycle-003 · agent (first-person toolchain walk)
Cycle-004 · same agent + doctrine (open playground)
Cycle-005 · agent + integration (runtime + ecosystem-coherence)
**Cycle-006 · operator + substrate** (agentic full-stack — operator-named frame, agent-built substrate, co-authored doctrine)

Declared at cycle open so subsequent cycles chain-preserve per OTLET.

The shift matters: cycle-005 was "agent building the plumbing to close cycle-004's Q5." Cycle-006 is "operator naming the three-layer architecture + the rails insight + the scope-lock rule; agent implementing the primitives in service of one concrete composition." Authorship is co-located.

---

## 10 · Supersession note

Cycle-005 findings §5 items 10 (real-LLM dispatch) + the transparency-debt strand of [[constructs-as-packages]] §3 post-dispatch amendment are superseded by this SEED — they are now in-scope as L-backend + L-frontend + L-threadpipe + L-e2e.

Doctrine v5 §17 remains load-bearing. v6 amendment (§18, landing at cycle-006 close via L-doctrine) ADDS three-layer architecture + agentic-full-stack naming + focus-per-register + backend-choice rationale. v5 chain-preserved.

F33 (`construct-network-tools` pack does not exist) is closed by L-meta-pack.

---

## 11 · Repo governance (IMPORTANT — carried from cycle-005 §11)

Not all repos in `0xHoneyJar` are ours to admin-merge. Cycle-006 legs touching upstream MUST respect ownership boundaries:

| Repo | Owner | PR discipline |
|---|---|---|
| `0xHoneyJar/loa` | **@janitooor** (Jani). We are a collaborator, not owner. | **PR only · request @janitooor review · NEVER admin-merge**. Clear rationale in PR body. Await approval. |
| `0xHoneyJar/loa-constructs` | Operator (this repo) | Admin-merge OK. |
| `0xHoneyJar/construct-base` | Operator (template we maintain) | Admin-merge OK for schema / integration improvements. |
| `0xHoneyJar/construct-*` (individual packs, incl. `construct-network-tools`) | Operator (packs we publish) | Admin-merge OK for schema / integration improvements. |

**L-migrate scope correction**: Loa script migration = **upstream PR discipline**. Do NOT admin-merge. PR body must explain:
- What: migration of `construct-compose.sh` / `construct-validate.sh` / `stream-validate.sh` / `butterfreezone-construct-gen.sh` / `.claude/schemas/*` / `validating-construct-manifest` skill from loa-constructs to loa proper
- Why: per [[constructs-as-packages]] §"Four-axis ownership boundary" — these are connectivity tooling; connectivity belongs on Loa (the computer), not the network (the registry)
- Risk: backward-compat preserved via shim / symlink / deprecation-notice; no breaking change to existing installs
- Request: review from @janitooor

If Jani rejects or requests changes, L-migrate adapts or defers. Cycle-006 does not gate on Jani-PR merge; cycle ships without L-migrate if upstream review takes longer than cycle window. L-migrate becomes an "in-flight" item carried to cycle-007.

---

## 12 · Three-layer architecture (reference — read [[agent-teams-as-pipes]] for full treatment)

```
┌─────────────────────────────────────────────┐
│  FRONTEND  ·  vibe-coding UI surface        │  ← taste, per-operator, REPLACEABLE
│  emoji + constructs, inline controls,       │    (web-dev analog: React / Svelte / HTML)
│  tmux coloring, transparency layer, rewind  │
├─────────────────────────────────────────────┤
│  BACKEND  ·  runtime                         │  ← stable, opinionated, SHARED
│  construct composition, agent-team          │    (web-dev analog: API + business logic)
│  dispatch (claude -p + tmux),               │
│  typed-stream emission, trajectory logging  │
├─────────────────────────────────────────────┤
│  SUBSTRATE  ·  bash + markdown + QMD         │  ← the kernel; BOTH ride atop
│  + Unix principle — processes, stdio,       │    (web-dev analog: HTTP + OS)
│  files, signals, headless Claude, markdown  │
│  as native agent-memory, QMD as queryable    │
│  markdown index                              │
└─────────────────────────────────────────────┘
```

**API between FE and BE**: JSONL trajectory + typed streams from cycle-005 (Signal / Verdict / Artifact / Intent / Operator-Model). Multiple UIs consume the same stream. Swapping UI doesn't touch runtime. Swapping backend doesn't touch UI — provided the stream contract is honored.

**Parallel to web-dev FE/BE** is structural, not metaphorical:

| Agentic layer | Web-dev analog | Invariant |
|---|---|---|
| Frontend (vibe-coding UI) | Browser (React/Svelte/HTML) | Replaceable per-operator; taste-heavy |
| Backend (runtime) | API + business logic | Stable, opinionated, shared |
| Substrate (bash/Unix/QMD) | HTTP + OS | Ground floor — everything rides atop |

Cycle-006 builds **all three layers at MVP**: L-backend = backend, L-frontend + L-threadpipe = frontend, substrate exists already (bash + `claude -p` + tmux + markdown; QMD is substrate-present-but-unused-this-cycle).

---

## 13 · Deferred explicitly (the ban list)

Carried from scope-lock (§1) for single-source-of-truth read:

**Cycle-007 candidates** (deferred, first-class):
- Hivemind-as-construct (pack scaffolding + publishing path)
- TeamCreate-executor implementation (alt backend)
- `constructs try` ephemeral exec
- QMD integration for per-agent memory + collections
- Multi-construct-per-stage composition mechanics
- QMD freshness / maintenance pass

**Banned from cycle-006** (scope-lock rule):
- Team-type DSL / composition language layer on top of YAML
- Typed-team primitives as first-class schema
- Any upfront abstraction not earned by a second concrete composition
- Multi-construct loadouts per stage
- QMD integration
- TeamCreate-as-backend implementation
- Backend rebuild beyond `claude -p` + tmux + bash

The ban list is the forcing function. Without it, this cycle sprawls into "build a language" and never produces the one concrete composition that makes the substrate earn its keep.

---

*Drafted 2026-04-23 late. Follows cycle-005-SEED format. Operator decisions Q1–Q4 locked pre-draft. Rails insight as §0 WHY. Scope-lock rule carried verbatim from operator self-pushback. Ready for operator review, then dispatch L-backend first per substrate-below-UI sequencing.*
