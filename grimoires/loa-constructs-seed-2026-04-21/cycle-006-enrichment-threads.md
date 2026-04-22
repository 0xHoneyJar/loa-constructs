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

## Dispatch-ready summary for cycle-006 SEED

Folded into SEED scope:
- **L-threadpipe**: transparency/visibility layer consuming emoji-vocab + inline-controls pattern (Thread 1)
- **L-starter**: `construct-network-tools` exemplar pack + `Constructfile` format + `constructs create taste-first` (taste stack includes `/hivemind` — needs URL-install path until cycle-007 pack lands)
- **L-migrate**: move compose/validate/stream-validate/butterfreezone + schemas + validator skill from loa-constructs into loa (Path B per paired decision)
- **L-research-teamcreate**: research-only leg, NOT implementation — catalog TeamCreate + tmux + rewind primitives so future cycles can wire them into the composition runner as a stage-executor option

Deferred to cycle-007:
- Hivemind-as-construct (Thread 2)
- TeamCreate-executor implementation (stages-as-windows)
- `constructs try` ephemeral exec (from cycle-005 decision)
