# Cycle-006 Enrichment Threads (pre-SEED)

> Operator-surfaced threads 2026-04-23 morning (post-sleep on cycle-005 close).
> Captured before SEED dispatch so nothing evaporates. To be folded into the
> SEED draft by Claude before operator-confirmed dispatch.

---

## Thread 1 · Emoji + constructs-computer piping UI (for cycle-006)

**Operator**: *"the emoji plus constructs computer piping that UI that we were discovering there in that section is pretty valuable for us to include."*

**Where it lives already**:
- `bonfire-construct-pipe-doctrine.md` §14.4 — multi-modal Intent, emoji-as-object-refs (🧌 as typed entity handle), inline numeric controls (`[-4+]`), casual framing as vagueness-tolerance marker
- §15.3 — inline-controls as "vibe coding surface"
- [[visual-feedback-protocol]] — the broader reward-function surface unifying PixelMark + DialKit + (future) agent-initiated marks

**What cycle-006 does with it**:
- The transparency/visibility layer (co-load-bearing with meta-pack closure per §3 amendment to [[constructs-as-packages]]) should SURFACE pipe activity in a vibe-coding-legible format — not just stderr summaries
- Concretely: when `construct-compose` fires, the operator should see stage handoffs rendered inline — emoji for construct identity (🔨 artisan, 🕳️ k-hole, 🐝 observer, etc.), readable type transitions, durations at glance-latency
- This is implementation of existing doctrine, not new doctrine

**Status**: implementation in cycle-006 SEED. Referenced, not re-derived.

---

## Thread 2 · Hivemind-as-construct (cycle-007 candidate)

**Operator**: *"I think extracting the hive mind as a separate construct is going to be valuable for us, potentially in the future. Maybe we can plan it as a cycle 7."*

**Context**:
- `/hivemind` skill exists locally, queries `~/hivemind/`
- NO pack owns it today — it's filesystem + skill, not a distributable construct
- The cycle-006 starter taste stack (`/hivemind` + artisan + k-hole + the-arcade) **presumes this pack exists**, so it's on the critical path even though the operator flagged it as cycle-007
- Distinction matters: hivemind-os (THJ org knowledge) is a DIFFERENT pack than the personal `/hivemind` skill — see [[hivemind-trichotomy]] for the five-layer split

**Design questions for cycle-007**:
- Where does personal `~/hivemind/` content live once the skill is a distributable pack? Remain local-only (pack provides structure + skills; content stays private)? Or does the pack publish blank-slate scaffolding?
- Which skills go in the pack: `querying-hivemind`? `crystallize`? `supersede`? `confidence-decay`? (archivist overlap — see [[hivemind-trichotomy]])
- Who's the canonical author — this is operator's personal memory system; does it even *want* to be distributable, or just *reproducible* (others clone the structure, populate their own content)?

**Status**: cycle-007 placeholder. NOT in cycle-006 scope. But cycle-006 should install `hivemind` from a known URL (maybe just a git repo reference, not a registry pack) so the taste stack works.

---

## Thread 3 · TeamCreate + tmux + rewind + HITL operator workflow

**Operator verbatim** (2026-04-23 morning):
> *"now that I'm understanding exactly how TeamCreate works and tmux works, I think I'm starting to realize that this is a feature created by Claude, and it's intended to be run in a tmux view that Claude Code runs on. It allows you to spin up more Claude codes. [...] the ability to actually set up your own TeamCreate tool [...] with clear boundaries and clear piping instructions, could give a lot of flexibility for the actual composition script."*
>
> *"the main session would be like the orchestrator, and then you would delegate it to your team and you would pipe through your team while they're continuing to do work."*
>
> *"separate windows are helpful, because we have access to the rewind command. Essentially, all of this is simply just piping between inputs and outputs, and when you have multiple agents or constructs that you're working with and you design this composition that you work with multiple agents, then I can see how this can be applied to, say, our own workflow or anyone else that has a custom workflow."*
>
> *"Most of the time it's good to just send it out and trust that the agent completes it, but I think the strength of having the separate windows here is that you're able to interact with each of the agents individually and provide input and feedback. I think this is a lot more powerful for creative direction or research, something that's maybe less long-running, structured, like what Jani would set up for architecture work. This is a little bit more iterative and explorative, or maybe even more like human in the loop, I would say."*

**The insight being crystallized**: the pipe doctrine applies FRACTALLY — construct-level (packs), shell-level (stdin/stdout), and agent-team level (TeamCreate sessions in tmux). Same substrate, three strata.

**Contrast named**:
- **Jani's approach** (from spiraling + autonomous harness): structured, long-running, non-HITL, autonomous dispatch with gates
- **Operator's approach**: iterative, exploratory, HITL, separate-windows + rewind for steering mid-composition

Both are valid composition patterns. They differ in *operator presence*, not in substrate.

**Cycle-006 implications**:
- The composition runner (`construct-compose.sh` already in Loa post cycle-005) could eventually dispatch stages as TeamCreate subagents in tmux windows — real LLM work, visible to operator, rewindable mid-chain
- This is STRONGER than the cycle-005 stub-executor design because it closes the transparency gap naturally — each stage is a separate window the operator can watch + steer
- For cycle-006: research TeamCreate API + tmux harness primitives, document what would make `--executor tmux-team` viable

**Captured as hivemind concept**: `agent-teams-as-pipes.md` (stub below — operator to rename if preferred).

---

---

## Thread 4 · Website scaffolding as the first concrete composition (cycle-006 target)

Operator 2026-04-23 late expanded the pipeline to 7 stages (earlier 5-stage sketch was a simplification):

| # | Stage | Construct | Output | Mode |
|---|---|---|---|---|
| 1 | Research / context | [[k-hole]] | Context brief, prior art, constraints | fresh-per-stage |
| 2 | Mood-boarding exploration | the-easel + k-hole | Design concepts, mood candidates | persistent (iter w/ stage 4) |
| 3 | Asset generation | **mint** | Locked mood-board assets | fresh-per-stage |
| 4 | Mood refinement | the-easel | Refined mood tokens, direction lock | persistent (iter w/ stage 2) |
| 5 | Design UI system scaffold | artisan | Taste tokens, color, type scale, motion specs | persistent (iter w/ stage 6) |
| 6 | Component system refinement | artisan + kansei | Component primitives, state variants, feel calibration | persistent (iter w/ stage 5) |
| 7 | Product structuring | the-arcade | Actual product/page structure, navigation | fresh-per-stage |

Copy (vocabulary-bank + herald) weaves in at stages 5–7, not as its own stage.

**Iteration loops** the composition runner must support:
- 2 ↔ 4 (mood-board exploration ↔ refinement)
- 5 ↔ 6 (design system ↔ component refinement)

This is the **first real composition** the cycle-005 runner targets. Real site; real expertise per stage; the operator runs it. SEED leg `L-website-scaffold` authors `grimoires/compositions/website-scaffold.yaml` for this.

**Operator self-caveat**: *"this is just one workflow of many that other people may present, but this is a workflow that I've been using time and time again."* The composition is a **taste statement**, not a universal template. Other operators author their own.

### Runner model clarification (operator 2026-04-23 late, added after Q1-Q4 lock)

The runner is a **navigable persistent state machine**, not a one-shot pass.

- Stages enter waiting state with inputs defined per-stage
- Operator navigates nonlinearly — jump to stage 3 while stage 5 is active; edit stage 2 output after seeing stage 6
- Per-stage teammate holds context in its pane; operator works with that teammate directly; confirms when stage "done for now"
- Iteration loops (2↔4, 5↔6) are first-class — runner does NOT prevent revisiting
- Forward-closing per stage is explicit (operator marks complete), not automatic

**Shapes the MVP UI**: pipe graph + per-pane color/emoji + **stage-status indicators (waiting / active / complete / needs-revisit)** + **operator navigation controls (jump, iterate, close)**.

**Cross-repo invariant** (operator asked 2026-04-23 late): after cycle-006 ships, this composition runs in any Loa-mounted repo — `cd sprawl-interface && construct-compose website-scaffold --target <app>`. The substrate lives in Loa; every mounted repo inherits it. This is the point of the migrate leg.

### The real KANSEI target — Sprawl design system divergence

**Operator 2026-04-23 late**: *"During the process of building all of these apps within the Sprawl world, I think we did lay down the taste runtime tokens, but I think it's really missing a design system and component system that we can iterate on."* + *"Structural work should be default — getting all buttons aligned to same design system should be very easy and it should be default. Currently we have a ton of divergence."*

Cycle-006 isn't abstract infrastructure. Its success criterion is **reducing a specific class of divergence work the operator is doing manually today**: button alignment across Sprawl world apps, component-system consolidation, cross-app design-system propagation.

**Open question for operator before SEED dispatch**: Sprawl design system validation —
- **(a) In-cycle KANSEI gate**: cycle-006's Q5 requires running the 7-stage composition against Sprawl and reporting outcomes. Sprawl success gates cycle close.
- **(b) Cycle-007 application**: cycle-006 ships the substrate and the website-scaffold YAML. Cycle-007 runs it against Sprawl as dedicated work.
- **(c) Post-cycle-006 demonstration**: cycle-006 closes when the substrate works on a toy target; Sprawl is a separate post-cycle paired session, not a gate.

My lean: **(c)**. Cycle-006 substrate work is heavy enough; Sprawl is its own focus session. But the operator's pain is immediate so (a) or (b) might match urgency better. Needs operator call.

### The systems-thinking-applies-to-design doctrine line

**Operator 2026-04-23 late** (verbatim, preservation-worthy):

> *"Systems thinking applies to design as well despite its exploratory nature. I think the iterative loops are just faster. Rails help my adhd so I'm not jumping into completely random places."*

Captured in [[agent-teams-as-pipes]] §"Systems thinking applies to design" and in [[rails-as-legibility]] as a supporting case. The doctrinal claim: rails *accelerate* exploratory work, they don't constrain it. Looseness lives inside stages; rails live between stages. This is the direct answer to the anticipated objection "won't systems thinking kill the creative process?"

## Operator answers locked 2026-04-23 late (pre-SEED)

| Q | Answer | SEED implication |
|---|---|---|
| **Q1** · persistent vs fresh-per-stage | **Both, declarative per-stage in the composition YAML** | Composition format carries `mode: persistent` or `mode: fresh` per stage. Website-scaffold composition above declares per-stage already. |
| **Q2** · TeamCreate backend vs build-from-scratch | **Build-from-scratch.** Backend = `claude -p` headless + tmux split-panes + bash orchestration. TeamCreate remains an **optional alternative backend** (composition can declare `backend: teamcreate` if an operator prefers it). | Default backend is Unix-native, not Claude-native. Matches substrate boundary from [[agent-teams-as-pipes]]. Forkable without Claude-Code-specific features. |
| **Q3** · stage cardinality | **One teammate per stage.** Clear inputs/outputs like a scripting language. Multi-construct loadouts *possible* but deferred — operator wants to understand composition mechanics before multi-construct-per-stage is wired. | Cycle-006 MVP: one-teammate-one-stage strict. Document extension path for multi-construct loadouts but don't implement. |
| **Q4** · MVP UI | **Confirmed**: colors per pane by construct, emoji per pane, main orchestrator pane shows pipe graph + stream activity. | SEED ships exactly this — no more, no less. |

## The rails-under-non-determinism insight (operator 2026-04-23 late)

**Verbatim**: *"(it provides rails for not only my adhd but agents to maximize understanding of the topology of the problem and deterministic outputs IN a non deterministic LLM)"*

This is the load-bearing *why* of cycle-006. Not just operator-convenience scaffolding — **the composition topology IS how you get dispatch-determinism out of non-deterministic LLMs**. Each stage output varies (LLM variance unavoidable); the topology doesn't. Rails orient both operator and agents; legibility becomes the substrate of usable LLM work at scale.

Grounds [[construct-pipe-doctrine]] §17.1 — §17.1 named the split (dispatch-det ≠ output-repro); this insight names *why the split matters*. Transparency in the UI layer (pipe graph, emoji per stage, inline controls) is NOT decoration — it's the operator's view into the rails.

Captured in [[agent-teams-as-pipes]] §"Rails as determinism-under-non-determinism". Should appear in the cycle-006 SEED §"Why this cycle exists" section prominently.

## Scope discipline — operator self-pushback, recorded

**Operator verbatim 2026-04-23 late**: *"I was even thinking that we end up writing a language that layers on top of this. I don't know if that's overkill [...] I would push back on what I'm saying here to limit the scope and enable us to get to actually having our hands on and building out compositions so that I can essentially design or apply our knowledge here into a real-world project where I'm taking a step back and building the design systems from the ground up."*

**The rule for cycle-006 scope lock**:

> **Build primitives in service of one concrete composition. Do not design a DSL, a team-typing language, or upfront abstraction layers. Those emerge from repeated usage across N compositions, not from one.**

Concretely: the website-scaffold composition is in scope. A generalized "team types" schema is NOT. The composition runner with a real LLM stage executor is in scope. A construct-composition language is NOT.

Cycle-006 SEED's §1 scope-lock section should carry this rule explicitly so it's not re-litigated at dispatch time.

---

## Dispatch-ready summary for cycle-006 SEED

Folded into SEED scope:
- **L-threadpipe**: transparency/visibility layer consuming emoji-vocab + inline-controls pattern (Thread 1)
- **L-starter**: `construct-network-tools` exemplar pack + `Constructfile` format + `constructs create taste-first` (taste stack includes `/hivemind` — needs URL-install path until cycle-007 pack lands)
- **L-migrate**: move compose/validate/stream-validate/butterfreezone + schemas + validator skill from loa-constructs into loa (Path B per paired decision)
- **L-research-teamcreate**: research-only leg, NOT implementation — catalog TeamCreate + tmux + rewind primitives so future cycles can wire them into the composition runner as a stage-executor option
- **L-website-scaffold**: author `grimoires/compositions/website-scaffold.yaml` as the first real 5-stage composition (Thread 4). Target dispatch with [[agent-teams-as-pipes]] principles — focus-per-register per stage, sequential-but-iterative, visible via Thread 1 transparency layer

Deferred to cycle-007:
- Hivemind-as-construct (Thread 2)
- TeamCreate-executor implementation (stages-as-windows)
- `constructs try` ephemeral exec (from cycle-005 decision)
- **Navigation-layer-via-templates** (operator 2026-04-23 late): each construct exposes a template pointer to specific patterns/primitives it recommends (e.g. artisan → button-variants template, the-easel → mood-board template, mint → asset-generation template). Extends the construct contract with declared template metadata. Schema change, not runner change. Creates a structured-but-loose exploration surface per-stage.
- **Claude Code / loa-constructs repo cleanup** (operator 2026-04-23, kickoff-2): "keep it ultra simple, down to what it needs; clean up artifacts; prevent downstream agents from picking up wrong context." TEND-mode maintenance work. Targets: apps dir (move product apps to world repos), any orphaned scripts, drift between documented and actual skill index. Composes with [[naming-drift-hygiene]] doctrine.
- **App separation into world repos** (operator 2026-04-23, kickoff-2): product apps (constructs-network explorer, dashboards) should live in sprawl-world (or per-world) not in loa-constructs. loa-constructs holds constructs themselves; worlds hold apps. Per [[worlds-vs-lenses]] hierarchy. Part of the cleanup.
- **Design-system inheritance mechanism** (operator 2026-04-23, kickoff-2): world-level core DS + app inheritance + opt-out fork + DNA preservation. Amended [[worlds-vs-lenses]] + [[world-registry]] with the updated doctrine. The concrete consequence of cycle-006 Sprawl work is authoring the *world-level core DS* for Sprawl for the first time — cycle-007+ defines the inheritance/fork mechanism at runtime.
- **Expertise-as-consultant framing** (operator 2026-04-23 late): constructs as accelerated-learning surfaces, not just capability injection. The value includes the rate at which a non-expert comes up to speed on the expert's mental model through staged exploration. Doctrine-candidate; not fully named yet per [[naming-is-diagnostic]]. Placeholder noted on [[construct-ontology]].

Deferred further (cycle-008+ or separate cycle):
- **Stack/framework swap consideration** — Radix vs Base UI vs Svelte-sovereign etc. Framework decisions are bigger than compositional-rails work; need their own cycle with own KANSEI gate. Explicitly NOT cycle-006 or cycle-007 scope.

Banned from cycle-006 (scope-lock rule):
- Team-type DSL / composition language layer
- Typed-team primitives as first-class schema
- Any upfront abstraction not earned by a second concrete composition
- Multi-construct loadouts per stage (operator wants to understand mechanics first)
- QMD integration for per-agent memory (cycle-007 — primitives already on substrate)
- TeamCreate-as-backend implementation (optional alternative; research-only leg)

---

## Thread 5 · QMD on the substrate layer (cycle-007 candidate for agent-memory)

**Operator 2026-04-23 late**: *"QMD, bash, and markdown files are something that agents understand extremely well, and this is sort of the baseline for all constructs. [...] I think it's valuable for each agent to use QMD to manage their own memory, integrated with the hive mind, but obviously the hive mind is optional."*

QMD ([tobi/qmd](https://github.com/tobi/qmd)) — markdown-querying tool, required for Loa installation. Agent-friendly because agents natively reason about markdown + simple query surfaces; no database required.

**On the substrate** because it's the same class as bash + markdown: primitive tools that compose into higher-level patterns. Per [[agent-teams-as-pipes]] three-layer architecture: substrate = bash + markdown + QMD (+ headless Claude).

**Cycle-007 candidate**:
- Per-agent memory via QMD-queried markdown
- Optional integration with personal [[hivemind]] layer
- "Collections" as a possible organizing primitive (low priority)
- QMD maintenance / freshness pass (stale content, reorganization) may warrant its own dedicated pass

**NOT in cycle-006 scope.** QMD exists and works today; cycle-006 leaves it as-is on the substrate.
