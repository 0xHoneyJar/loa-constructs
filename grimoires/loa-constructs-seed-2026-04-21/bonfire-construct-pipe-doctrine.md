# Bonfire Doctrine — Constructs as Unix Pipes, Orchestration as Composition

> *"The network itself should be better designed in a node-like way, in a very Unix-piping-like way. This allows users to compose and better OPERATE… this will enable the orchestration layer that we need to design around."* — operator 2026-04-21-late
>
> **Status**: Draft doctrine, awaiting operator review + amendment
> **Mode**: Bonfire (pause to form the question) · Not a SEED, not a sprint plan
> **Author**: Claude (synthesizing operator direction + hivemind)
> **Date**: 2026-04-21
> **Scope**: the construct network's *protocol layer* — how constructs compose, pipe, and orchestrate. Not the explorer, not the registry UI.

---

## 0 · Why this doctrine exists now

After cycle-002's close, the operator surfaced a deeper frame than either cycle-001 or cycle-002 held. The tending moment:

1. **Cycle-001** built infrastructure (discovery endpoint, webhooks, install flow, feedback schema) against an architectural decomposition.
2. **Cycle-002** walked it, surfaced that cycle-001 built clean plumbing on a stack the org is leaving (Supabase / Dynamic Labs).
3. **Mid-cycle-003 drafting**, the operator reframed: *the product is not the web surface; the product is the composability of constructs as Lego bricks, and the orchestration layer that lets operators wire them into flows.* This is not visible until you say it out loud.

This doctrine names what was implicit. It's the forming step before cycle-003 ships its narrow DB-swap + agent walk, and the cycle-004+ implementation of the orchestration layer.

**Intent**: write this once, carefully, so that all downstream cycles can route through it without re-derivation. Let us return to surface-craft (Purupuru, Sprawl, Mibera, Freeside worlds) knowing the construct protocol is formed.

---

## 1 · The core claim

**A construct is a Unix-pipe stage.** It reads typed input from a stream, applies a single expertise transform, and writes typed output to another stream. It knows nothing about what's upstream or downstream. Composition is pipe-chaining. Orchestration is the scheduler that routes typed streams through chains.

This is not metaphor. It is a structural claim with architectural consequences.

| Unix concept | Construct analog |
|---|---|
| **Program** (does one thing well) | Construct (single expertise responsibility) |
| **stdin** | Construct's typed input stream |
| **stdout** | Construct's typed output stream |
| **stderr** | Feedback-v3 emission + trajectory |
| **Pipe `\|`** | `composition.yaml` edge |
| **Shell** | Orchestration layer |
| **exit code** | Construct's verdict.pass boolean |
| **Environment** | Context slots (per cycle-001 construct.yaml capabilities) |
| **`ps`** | `.run/construct-trajectory.jsonl` |
| **`tee` / file redirection** | Composition forks / artifact persistence |

The consequence: constructs are **ambiguous about each other** per `[[ambiguous-primitives-doctrine]]`. A construct's job is to be a well-typed transform, not to know which upstream produced its input or which downstream will consume its output. Specificity lives in the composition, not the construct.

---

## 2 · The hivemind chain this composes with

This doctrine does not invent. It crystallizes what is already scattered across hivemind + operator direction:

- **`[[composable-expertise-legos]]`** (2026-04-21) — LEGOs with standard studs/holes. This doctrine formalizes stud = typed output shape, hole = typed input shape.
- **`[[composable-systems-open-web-doctrine]]`** (2026-04-19) — "Everything is a construct… isolation-then-composition." This doctrine names the RUNTIME of that composition (the pipe layer).
- **`[[construct-invocation-glossary]]`** (2026-04-20) — three invocation tiers (Named / Intent / Router). This doctrine routes Intent-tier invocations through composition chains.
- **`[[ambiguous-primitives-doctrine]]`** — constructs don't know about each other. The pipe layer is where specificity lives.
- **`[[construct-ontology]]`** — why "construct" not "skill." Ontology says what a construct *is*; this doctrine says how it *flows*.
- **`[[freeside-as-subway]]`** — constructs/modules as orderable menu items. The pipe layer is what makes "Subway ordering" executable instead of aspirational.
- **`[[ecs-architecture-freeside]]`** — Entity-Component-System. Constructs are Components; composition runners are Systems; operators attach Components to Entities (Worlds/Rooms).

Chain preservation: nothing here supersedes the above. It adds one missing layer — the **runtime** of composition — that each of those doctrines assumed would exist but didn't name.

---

## 3 · The pipe primitives — typed streams

For constructs to pipe, they need shared type vocabulary. Four primitive stream types cover the observed flows:

### 3.1 · `Signal` — raw observation
- **Shape**: append-only JSONL rows with `{ts, source, observation, tags}`
- **Producers**: observer, beehive (KEEPER), dig-search, feedback-widget
- **Consumers**: archivist (OTLET ingestion), analyzers, scoring constructs
- **Pipe semantics**: streaming. Multiple producers append concurrently. Consumers tail-follow.

### 3.2 · `Verdict` — evaluated judgment
- **Shape**: feedback-v3 JSONL row (already schema'd in cycle-001 Leg E)
- **Producers**: ALEXANDER (feel audit), KEEPER (friction observe), STAMETS (dig summary), and other verdict-emitting personas
- **Consumers**: orchestrator (routes next stage), operator (reads for decisions), archivist (corpus)
- **Pipe semantics**: per-invocation. One invocation → one verdict row.

### 3.3 · `Artifact` — produced material
- **Shape**: file-at-path with content-hash + metadata
- **Producers**: implementation constructs (code writers, migrators, document generators)
- **Consumers**: review constructs, audit constructs, deployment constructs
- **Pipe semantics**: content-addressable. Multiple constructs may read the same artifact; writers commit to versioned paths.

### 3.4 · `Intent` — operator routing signal
- **Shape**: structured operator utterance with `{intent, context, constraints, feedback_on}`
- **Producers**: operator (the only source)
- **Consumers**: orchestration layer (routes to construct composition)
- **Pipe semantics**: the entry point. Every pipe chain begins with an Intent.

Every construct declares, in its `construct.yaml`, the stream types it reads and the stream types it writes. The pipe runtime verifies type compatibility at composition-build time.

---

## 4 · Composition = pipe chain specification

A composition is a declarative pipe chain. Today `.claude/constructs/compositions/*.yaml` files exist as read-only folklore (cycle-001 Leg F). Under this doctrine, they become executable specifications.

### 4.1 · Shape

```yaml
# compositions/feel-audit.yaml (illustrative)
name: feel-audit
intent: "audit a UI component for craft-feel compliance"
inputs:
  - type: Artifact
    path: <component-file-path>
chain:
  - construct: artisan
    skill: feel-audit-decompose
    reads: [Artifact]
    writes: [Signal]
  - construct: artisan
    skill: scoring-experience
    reads: [Signal]
    writes: [Verdict]
  - construct: observer
    skill: keeper-friction-observe
    reads: [Verdict, Signal]
    writes: [Verdict]
outputs:
  - type: Verdict
    destination: .run/feedback-v3.jsonl
  - type: Signal
    destination: .run/construct-trajectory.jsonl
```

The composition is **declarative** — names which constructs, which skills, in what order, what types flow. The composition runner (cycle-004) executes it.

### 4.2 · Symmetric vs asymmetric composition

GECKO §2 identified 26 asymmetric `compose_with` declarations — constructs claiming composition without reciprocation. Under Unix-pipe semantics this becomes tractable:

- **Symmetric composition** = both constructs declare each other in `compose_with` AND their types align (A's output type matches B's input type). These pipe.
- **Asymmetric composition** = one claims, the other doesn't. Under pipe semantics: if types align, it *can* pipe; the one-sided declaration is incomplete metadata, not a broken pipe. If types don't align, it *cannot* pipe — the declaration is aspirational only.

The pipe layer reveals which asymmetric compositions are fixable (add the reciprocal declaration) vs which are structurally impossible (type mismatch).

### 4.3 · What compositions are NOT

- Not workflows in the Airflow / Temporal sense. Pipe chains are short-lived, stateless, operator-invoked.
- Not orchestration. Compositions *are* the specifications; the orchestrator consumes them.
- Not test fixtures. Compositions describe production flows.
- Not agent prompts. Compositions compose constructs; each construct may internally run an agent session, but the composition doesn't prescribe it.

---

## 5 · Orchestration — the shell-equivalent layer

If a construct is a program and a composition is a pipe chain, the **orchestration layer is the shell**. It:

1. **Receives Intent** from operator (or from an upstream composition that emits Intent)
2. **Selects composition** — matches Intent to an appropriate composition YAML, or composes a new chain on-the-fly via construct-invocation-glossary Tier 2 (Intent-tier)
3. **Verifies type compatibility** — checks every pipe edge's types align before execution
4. **Dispatches stages** — each pipe stage runs the named construct via `construct-invoke.sh`
5. **Routes streams** — upstream stdout becomes downstream stdin; trajectory + feedback-v3 append continuously
6. **Reports back** — final output returned to operator in their invocation surface (Claude Code session, CLI, eventually Dashboard)

### 5.1 · Where this lives

| Layer | Home | Responsibility |
|---|---|---|
| **Construct** | `~/.loa/constructs/packs/<slug>/` | Single expertise transform |
| **Composition** | `.claude/constructs/compositions/*.yaml` | Pipe-chain spec |
| **Invoker** | `.claude/scripts/construct-invoke.sh` (cycle-001 Leg D) | Runs one pipe stage |
| **Runner** | `.claude/scripts/construct-compose.sh` (**cycle-004 candidate**) | Reads composition, executes chain, routes streams |
| **Orchestrator** | L3 Finn (per `[[sovereign-stack]]` L1-L5) | Intent → composition selection, multi-session routing, fleet dispatch |

Today: layers 1-2 exist as artifacts; layer 3 exists but doesn't fire (cycle-001 Leg D dry); layer 4 doesn't exist; layer 5 (Finn) is named but unbuilt for construct orchestration.

### 5.2 · What cycle-003 must NOT pre-commit against this layering

Cycle-003 ships the DB swap + agent walk + L3 (construct-invoke wiring). The doctrine's cycle-003 lens:

- **`construct-invoke.sh` must emit stream types** on its entry/exit rows. If it writes trajectory rows that don't declare `stream_type`, it pre-commits to a non-typed pipe model — wrong.
- **`compositions/*.yaml` edits must include `reads:`/`writes:` type declarations**. Cycle-001 Leg F's YAMLs currently lack these. Cycle-003 edits should add them as part of Leg L4.
- **SKILL.md feedback-v3 emission (Leg L4) must produce `Verdict` stream rows**, not ad-hoc shapes. The schema already covers this; the emission must honor it.
- **Nothing in cycle-003 invents a NEW stream type beyond Signal/Verdict/Artifact/Intent.** Four is the vocabulary. New types = new doctrine = next cycle.

Cycle-003 as drafted is compatible with this doctrine. Cycle-004 is where the runner lands.

---

## 6 · Operator as orchestrator — feedback as pipe-stage input

The operator's cycle-002-closing observation:

> *"When I give input or feedback, that's more so me operating as the operator to orchestrate many agents."*

Under this doctrine, this is a structural claim:

- **Operator utterance** → Intent stream
- **Intent stream** → orchestrator input
- **Orchestrator** selects composition, dispatches agents
- **Each agent** runs one construct (or a composition of constructs) as its session
- **Agents emit Signal + Verdict + Artifact**
- **Orchestrator collects**, routes results back to operator
- **Operator reviews**, emits next Intent (often with `feedback_on: <prior_artifact>`)

Feedback is not commentary. **Feedback is the operator's pipe-stage output that becomes the orchestrator's next-step input.** "Don't rebuild the network" isn't opinion — it's a routing signal that prunes an entire sub-tree of compositions the orchestrator was considering.

### 6.1 · Implications for tooling

- The operator's CLI surface (`/plan`, `/build`, `/review`, `/ship`, plus skill invocations) should be modeled as Intent emitters.
- Freeform operator text (like this conversation) is an Intent stream — messier, higher-context, but still routable.
- An orchestration layer that reads operator Intent and routes to composition should surface its routing decision back to the operator ("I interpreted your feedback as: prune architectural rebuild, focus on toolchain cleanup; routing to cycle-003"). This is the **orchestration transparency** requirement.
- `AskUserQuestion` is the Router tier — the orchestrator asking operator to disambiguate Intent. Already built into the Claude Code harness; this doctrine names its role.

---

## 7 · Forum-project parallel — the communication-layer instance

[`0xHoneyJar/forum-project`](https://github.com/0xHoneyJar/forum-project) is a parallel instance of this doctrine at a different layer:

| Forum-project | Construct network |
|---|---|
| Three account classes (human, participant agent, system agent) | Operator, external builders, agent runners |
| Seven system-agent roles with separation of duties | (Future: compositions declaring role-constraints on pipe stages) |
| Append-only audit log, INSERT-only GRANTs, hash-chain trigger | `.run/construct-trajectory.jsonl` + `.run/feedback-v3.jsonl` (append-only JSONL) |
| OPA/Rego bundles as versioned governance | `construct.yaml` + composition YAMLs (versioned artifacts) |
| MCP server as agent interface | `construct-invoke.sh` + composition runner as agent interface |
| Governance FSM (eight-step amendment) | (Future: composition amendment protocol for changes to canonical pipe chains) |

The forum-project is the **communication-layer** instance: typed actors, append-only audit, stateful protocols, governance for amendments. The construct network is the **composition-layer** instance: typed streams, append-only audit, stateful pipe chains, (future) governance for canonical composition amendments.

**They compose**: forum-project's audit log can consume construct network's Signal/Verdict streams as forum artifacts. Construct network's Intent stream can emerge from forum-project's deliberations. Two instances of the same doctrine at different layers, eventually wired to each other.

---

## 8 · Chain of implications — what this doctrine makes possible

If the above holds, these previously-stuck questions become tractable:

### 8.1 · "What is the construct-network actually for?"
Answer: it's a registry of typed expertise transforms + a runtime for composing them into pipe chains + an orchestration layer that routes operator Intent through the chains. **Not** a catalog for browsing. The explorer UI is a viewing surface; the product is the runtime.

### 8.2 · "How do we prevent construct-network stagnation?"
Answer: the moat is *composition flow volume*, not install count. Every executed composition = one pipe-chain execution = rows in trajectory + feedback-v3. RL corpus value scales with *real pipe traffic*, not passive registrations. Cycle-001 Leg D dry = zero corpus. Cycle-003 L3 wiring = corpus begins. Cycle-004 composition runner = corpus compounds.

### 8.3 · "When do we need the orchestration layer?"
Answer: when the operator consistently describes their Intent in a form too abstract for direct construct selection. The `[[construct-invocation-glossary]]` Tier 2 (Intent-tier). Today that's rare — operator still mostly Names constructs. The orchestration layer is needed when the operator says *"orchestrate many agents"* at a frequency where Named invocation is too slow. Not cycle-003. Probably cycle-005+.

### 8.4 · "What do external builders need from us?"
Answer: stream-type declarations in their `construct.yaml`, and symmetric composition reciprocation. Everything else (schema version, slash-command namespace, trust_level) is secondary. The pipe contract is primary. This is what cycle-005+ external-builder onboarding prioritizes.

### 8.5 · "What does Finn do?"
Answer per `[[sovereign-stack]]`: L3 "navigation" — session routing, model selection. Under this doctrine: **Finn is the orchestration-layer implementation for the construct network.** It reads operator Intent, selects composition, dispatches sessions, routes streams, handles budget + model tiering per stage. That's a full reframe of Finn's scope; worth an amendment to `[[sovereign-stack]]` once ratified.

---

## 9 · Boundaries — what this doctrine is NOT

- **Not a dispatch spec.** Contains no implementation details for cycle-003 or cycle-004. Those are SEED-level.
- **Not prescriptive of the code language.** Composition runner could be bash, TypeScript, Rust — doctrine is runtime-agnostic.
- **Not limited to Claude Code.** Any agent runtime (Agent SDK, external agent) that honors the stream contract can be a pipe stage. Claude Code is the primary near-term runtime but not the only one.
- **Not the final doctrine.** Living document. Amendable per operator review. Should be versioned when amended (this version = v1, drafted 2026-04-21).
- **Not a justification to rebuild existing constructs.** Existing constructs stay; we add typed I/O declarations to their `construct.yaml` over time. Migration is incremental.
- **Not a mandate for compositions on every invocation.** Named-tier (single construct) invocations remain first-class. Compositions are for pre-packaged flows + Intent-tier dispatch.

---

## 10 · Open questions for operator review — v1

**Reframed in v2 (see §14). Kept here as chain-preserved v1 record.**

1. **Stream type cardinality** — four or more? `Verdict` subdivision?
2. **Composition authorship** — operator / agents / governance-FSM?
3. **Orchestration transparency granularity** — every stage or top-level only?
4. **Finn's scope reframe** — is "Finn = orchestration layer for constructs" load-bearing?
5. **Forum-project integration timeline** — when do the streams cross?
6. **Doctrine versioning** — `doctrine.yaml` metadata or human-read-only?

**Operator feedback 2026-04-21-late** (reviewing v1): Q1/Q2/Q5/Q6 weren't framed in operator language — they were framed as architecture-spec questions. The operator thinks in UX, expertise-depth, visual output, read-modes. Q3 and Q4 were tractable (Q3 because it bridged to UX via loa#598; Q4 because it flagged a specific knowledge gap). Meta-lesson folded into §14.

---

## 11 · Lens for downstream cycles

Any cycle touching the construct network protocol layer gets evaluated against this doctrine. Specifically:

**For cycle-003**:
- L1 DB swap → does the new DB schema include stream-type columns where composition state would live? If yes, too much; defer. If no, clean.
- L3 construct-invoke wiring → does trajectory emit `stream_type` field on entry/exit rows? Required.
- L4 SKILL.md feedback-v3 → emission must validate as `Verdict` stream row.
- L6 agent skill clarity CLI → must report stream I/O types per construct, not just names.

**For cycle-004 (composition runner)**:
- Reads `compositions/*.yaml` → checks type compatibility before executing → runs each stage via construct-invoke.sh → pipes outputs per doctrine.
- MVP: executes one composition end-to-end with full trajectory/feedback emission. Proves the doctrine at runtime.

**For cycle-005+ (orchestration)**:
- Intent-tier dispatch on top of composition runner.
- Multi-agent fleet coordination (per operator's "orchestrate many agents").
- Forum-project integration (if timeline from §10.5 lands here).

---

## 12 · What landing this proves

If this doctrine is adopted and subsequent cycles route through it:

1. **Constructs stop being a registry; they become a runtime.** The distinction is load-bearing.
2. **Composition goes from folklore to execution.** Read-only YAMLs become the specification of what actually runs.
3. **Operator feedback becomes first-class routing signal.** Not QA, not commentary — structured Intent.
4. **The network's moat shifts from install-count to composition-flow-volume.** Better metric, actually measurable via trajectory + feedback streams.
5. **External builders integrate at the type-contract layer.** A well-typed construct from any org pipes into THJ compositions (and vice versa). The sovereign-web bet.
6. **The orchestration layer gets designed-for, not stumbled-into.** Cycle-005+ has a target, not a blank canvas.

If it's rejected or significantly amended:

The fact that this doctrine exists and was reviewed means future cycles won't accidentally re-derive it. Chain preservation in either direction.

---

## 13 · Authorship, review, amendment

**Drafted by**: Claude (synthesizing operator direction + hivemind).
**To be reviewed by**: operator.
**Amendment protocol**: operator edits in place OR appends amendment section. Version bump to v2 on structural change.
**Related doctrine this amends**: `[[sovereign-stack]]` §Finn scope (see §8.5) — amendment pending operator ratification.
**Related doctrine this extends**: `[[composable-expertise-legos]]`, `[[composable-systems-open-web-doctrine]]`, `[[construct-invocation-glossary]]`.

---

*v1 · 2026-04-21 · Bonfire doctrine produced during cycle-002 close, pre-cycle-003 dispatch. The frame before the shipping.*

---

## 14 · Amendments (v1 → v2, 2026-04-21-late operator review)

### 14.1 · Generalization — "everything is a computer"

Operator review surfaced Eileen's frame: *"Pretty much everything is a computer; everything takes inputs and produces outputs, and in this way we're all computing."*

The Unix-pipe claim in §1 is an instance of this broader frame, not the frame itself. Generalized:

**Every actor in the construct network is a computer.** Each takes typed inputs, applies a transform (expertise / orchestration / framing / feedback / decision), emits typed outputs. The "computer" is not metaphor; it's the structural unit. Operators are computers. Agents are computers. Constructs are computers. The orchestration layer is a computer that routes between computers.

Consequence: the protocol doesn't privilege any actor type. An operator's feedback and a construct's verdict and a forum-project deliberation are all typed I/O events. The pipe layer routes them uniformly.

This reframes §6 (operator-as-orchestrator) — the operator isn't "above" the stack; the operator is one computer in the mesh. Powerful because their Intent output shapes routing; not special because they're metaphysically different.

### 14.2 · Operator-Model as first-class input

Operator review added a layer §5 didn't name: **the agent's model of the operator is a load-bearing input to every pipe stage**, not just the orchestration layer.

Evidence:
> *"Designing around the operator and what the operator knows is a very powerful tool. What we've built with… hive mind is a tool that a lot of people can use so that the agent can better understand what you know."*

Structural claim:

- **Operator-Model** is a typed stream (5th primitive — "what does this operator know, care about, have expertise in?"). Sourced from `~/hivemind/` + session context + explicit operator utterances.
- Every pipe stage reads Operator-Model alongside its domain input. A construct producing a `Verdict` calibrates that verdict's depth/framing/vocabulary to Operator-Model.
- Example: ALEXANDER producing a feel-audit verdict. If Operator-Model says "expert in design engineering, familiar with Emil Kowalski," the verdict can reference motion-design patterns by name. If Operator-Model says "designer onboarding, no prior feel-system context," the verdict explains the concept before the judgment.
- Without Operator-Model, verdicts default to a generic-expert register. This is the failure mode — the agent is speaking, but the operator can't process it because the framing isn't calibrated.

Corollary to §3 primitive stream types: **add Operator-Model as the 5th type.**

| Type | Shape | Primary source |
|---|---|---|
| Signal | append-only observation | upstream construct |
| Verdict | evaluated judgment | persona emission |
| Artifact | produced material | implementation |
| Intent | operator routing signal | operator utterance |
| **Operator-Model** (NEW) | operator knowledge/expertise map | hivemind + session |

### 14.3 · Output read-modes (loa#598 generalized)

loa#598 names three read-modes for the SIMSTIM harness's ambient pulse:
- **Glance** (<1s) — status at ambient attention
- **Orient** (~5s) — what's happening + why
- **Intervene** (~15s) — actionable detail for course-correction

Operator framing extends this to all construct output:
> *"It's exactly just the right amount of information, not too much or not too little, just the right amount of information."*

Structural claim: **every construct's Verdict/Signal output should support all three read-modes, calibrated to Operator-Model.**

- **Glance-mode output**: one line. Emoji + phase + pass/fail + cost. Supports ambient watching.
- **Orient-mode output**: 3-5 lines. Intent + key finding + next-step cue. Supports reading between steps.
- **Intervene-mode output**: full structured block. All findings, all metadata, actionable detail. Supports active redirection.

The construct emits all three levels; the consumer (UI, CLI, orchestrator) selects the mode based on context. Reference implementation: loa#598's `[INTENT]` + `[HEARTBEAT]` dual schema.

This feeds back into §3 stream types — `Verdict` isn't a single shape; it's a **tiered shape** with glance/orient/intervene variants. Equivalent for `Signal` (single event vs orient-summary vs full observation). `Artifact` is usually intervene-only. `Intent` is usually glance-or-orient.

### 14.4 · Multi-modal Intent — the inline-controls pattern

Operator shared a screenshot (2026-04-21) showing a mobile app where natural-language Intent is interleaved with inline controls:

> "make 🧌 bigger and spawn [-4+] of them each round. also make it look 🎮 like its 2004 or something 😂"

Pattern:
- **Emoji-as-object-refs** — 🧌 is a handle to a typed entity; 🎮 is a handle to a concept/style
- **Inline numeric controls** — `[-4+]` is a discrete stepper embedded mid-sentence
- **Casual framing** — "or something 😂" as acceptable vagueness tolerance
- **Multi-modal** — text + emoji + UI control + tone-marker, composed into one Intent

This is the UX of Intent emission. Structural implications:

- **Intent stream type from §3 gains structured-slots.** Not just prose text; prose with typed inline slots (`@artifact:<path>`, `#intent-class:<enum>`, discrete controls, vague-tolerance markers).
- **The orchestration layer parses structured Intent** — extracting the typed slots for routing, preserving the prose for framing.
- **Operator-tooling for Intent authoring** becomes a UX concern: how does the operator express multi-modal Intent efficiently? Chat input with inline widget support; CLI with typed flags; forum-project post templates.

This is NOT something cycle-003 or cycle-004 builds. It's a UX north star for cycle-006+ (operator-facing Intent authoring surface). Naming it here so future surfaces can target it.

### 14.5 · Reframed open questions (operator-language)

The v1 questions were architecture-spec. The v2 questions are operator-experience:

1. **Does the pipe output feel right for different expertise levels?** When ALEXANDER emits a verdict, does it read right to an expert-in-feel-systems *and* to a new designer just installing artisan? If not, what does the Operator-Model miss?

2. **Is the ambient presence of an invocation calibrated?** When operator runs a composed chain (artisan → observer) in the background, do the glance/orient/intervene levels hit at the right rhythm? Does the operator feel in control or narrated-at?

3. **Does the composition feel like Lego bricks snapping, or like YAML configuration?** If the operator has to edit YAML to compose two constructs, that's config. If they can describe Intent multi-modally and the orchestrator suggests a composition they can accept/redirect, that's bricks. Are we close to the second, or stuck in the first?

4. **When I (the operator) give feedback, does the system route it or file it?** Feedback-as-Intent should trigger re-dispatch. Feedback-as-note should persist as Signal. Are both paths honored, or does everything get filed as notes?

5. **Is the Finn/orchestration layer visible enough to steer, invisible enough to not narrate?** Operator should know where they are in a composition without having to ask. But they shouldn't be forced to read every stage's handoff.

6. **Does hivemind feed the Operator-Model fast enough?** When operator references something ("the Finn design Jani did"), does the agent have Operator-Model data on that reference, or does it need clarification? What's the decay rate of operator expertise model? Per-session? Per-week?

These are the questions I should have asked. They route to UX outcomes, not architecture specs. Operator engagement is higher because the questions match how the operator experiences the system.

### 14.6 · Meta-lesson — question-framing as doctrine

**Questions from agent → operator should be framed in operator-experience language, not architecture-spec language.** Architecture-spec questions are what the agent wants to know to build; operator-experience questions are what the operator can answer from their ground-truth use of the system.

Applied to the doctrine:
- Operator-Model (§14.2) is what makes this calibration possible.
- Output read-modes (§14.3) apply to questions too — "glance-mode question" (one line, yes/no), "orient-mode question" (with context), "intervene-mode question" (full exploration).
- When the agent asks a bad question, the operator's pushback ("that's not framed in a way I'd understand") is itself an Intent signal to recalibrate.

This is recursive: the doctrine describes the system; the system produces the doctrine; the operator's feedback on the doctrine reshapes both. Bonfire ↔ Spiral in miniature.

### 14.7 · Version bump

This file is now **v2**. v1's §10 open-questions are chain-preserved (not deleted) per OTLET. Future amendments should continue the §14.N amendment-section pattern rather than rewriting in place — readers want the chain, not the latest snapshot.

---

*v2 · 2026-04-21-late · Amended after operator review. Generalized to "everything is a computer." Added Operator-Model + read-modes + multi-modal Intent. Reframed questions in operator language. Meta-lesson on question-framing folded into doctrine itself.*

---

## 15 · Amendments (v2 → v3, 2026-04-21-late operator review after cycle-003 walk)

Operator provided three load-bearing amplifications while reviewing v2 + cycle-003 walk outcomes. All three are doctrine-deep — they extend existing sections rather than contradicting them.

### 15.1 · Operator OS is the proto-composition system

Looking at `~/.claude/CLAUDE.md` (operator's global memory, auto-loads into every Claude Code session), the **Operator OS v2** section contains:

- **Six cognitive modes** (FEEL/ARCH/DIG/SHIP/FRAME/TEND) — each names a persona + primary construct
- **Five lenses** (craft/keeper/canon/GTM/weaver/ecosystem) — each layers on top of any mode with a specific question
- **Construct Resolution (cybernetic)** table — eight domains × mode + primary + secondary + lens compositions

This is a **compositional dispatch system, pre-dating the doctrine that named it.** Each row in the Construct Resolution table is a composition spec expressed in mode+lens+construct vocabulary instead of stream-type vocabulary:

> Smart contracts → ARCH mode · the-arcade + protocol + noether · craft lens

Translated to doctrine §4 composition shape:
```yaml
# compositions/smart-contracts-arch.yaml
name: smart-contracts-arch
intent: "architect a smart-contract change"
frame: ARCH          # mode — sets the operational register
lens: craft          # lens — question to hold throughout
chain:
  - construct: the-arcade   # primary — owns the frame
  - construct: protocol     # secondary — composes with primary
  - construct: noether      # secondary — composes with primary
```

**Structural claim**: Operator OS's modes-and-lenses vocabulary is **not parallel to** this doctrine's pipe vocabulary — it's an earlier, more-operator-friendly expression of the same thing. The pipe vocabulary compiles down FROM operator-OS vocabulary.

**Implication**: Composition YAMLs should accept BOTH:
- Construct-stream specification (pipe layer — for machines)
- Mode-lens-construct specification (Operator OS layer — for humans/operators)

The orchestration layer translates between them. This honors the operator's pre-existing compositional thinking without forcing a rewrite.

### 15.2 · Frames vs workflows — two compositional flavors

Operator distinguishes:

| Compositional flavor | What it is | Example |
|---|---|---|
| **Frame / Lens** | Way to SEE a problem (analytical stance) | KEEPER lens — "what are users actually doing?" |
| **Workflow** | Way to EXECUTE on a seen problem (sequenced dispatch) | feel-audit workflow — decompose component → score experience → emit verdict |

Doctrine §4 composition YAMLs currently describe WORKFLOWS (pipe chains). Frames/lenses are a DIFFERENT composition primitive — they filter / interpret inputs across ANY workflow, rather than dispatching a sequence.

**Amendment to §4 shape**:
```yaml
# Two composition kinds
kind: workflow       # pipe chain — sequenced dispatch (e.g., feel-audit)
# OR
kind: frame          # input-filter / interpretation-lens (e.g., keeper-lens)
```

**Implication for cycle-004+**:
- The composition runner (L7) consumes BOTH kinds.
- Workflow kind: executes the chain with typed I/O verification.
- Frame kind: attaches to a workflow as a pre-filter OR a per-stage lens. Modifies interpretation; doesn't change dispatch.
- Operator OS's five lenses become frame-kind compositions.
- Feel-audit, dig-to-ship, material-tour (cycle-001 Leg F YAMLs) are workflow-kind compositions that have never been designed with frames/lenses attached yet.

**Gap named**: workflow-kind design is largely undone. Cycle-005+ candidate. Feel-audit is the canonical first workflow to author — closes the gap between "compositions exist as folklore" and "compositions execute."

### 15.3 · Inline-controls as "vibe coding surface" — §14.4 amplified

Operator reflection on the mobile-app screenshot in §14.4:

> *"This sort of view is something that a lot of people will likely fall in love with from a vibe coding point of view. We're using emojis and really clear identifiers for things that are being changed, like number changes, thinking about this as an operating surface or a fun vibe coding surface that pretty much everyone can relate to."*

Load-bearing promotion: multi-modal Intent authoring (emoji-as-object-refs + inline discrete controls + casual framing) is not just a UX north star (v2 framing). **It is a potential first-class distribution vector.**

- The Unix-pipe semantics underneath are power-user-legible (§13.2 pre-AI continuity).
- The vibe-coding surface on top is mass-legible — emojis + steppers + casual tone.
- Same compositional substrate, two read-registers.

**Amendment**: Intent stream (§3) implementations should be designed to support BOTH:
- Terminal/CLI operators (text + shell flags)
- Vibe-coding operators (text + inline emoji-refs + stepper controls + casual tone)

Neither is default; both are valid. Surface selection is runtime-choice (terminal vs chat vs web vs native app). The underlying Intent stream is the same typed object.

**Implication for cycle-006+**: the "operator-facing Intent authoring surface" is not just a CLI — it's an adaptive surface. Vibe-coding may be the distribution hook that brings the construct network to mass operators.

### 15.4 · Hivemind-as-shareable-system

Operator observation:

> *"The hivemind, in itself, its whole design, can be shared with people, because I think this knowledge base and this structure is a very powerful tool that can scale up and scale down."*

Structural signal:
- `hivemind-os` construct already exists (67 skills, private visibility — confirmed in cycle-003 Step A output)
- Its structure (wiki/concepts, wiki/entities, strategy, self, sessions, worlds, raw-sources) scales from solo-operator to team to org
- The `[[wikilinks]]` convention + frontmatter decay + supersession semantics are all existing Obsidian-plus-conventions
- Operator-Model (§14.2) READS FROM hivemind; it could also WRITE BACK (closing the loop)

**Amendment to §14.2 Operator-Model**: hivemind is the canonical source for Operator-Model, AND a first-class construct in its own right. Two usage modes:

1. **Operator-Model source** — pipe stages read hivemind as typed input to calibrate depth/framing
2. **Shareable knowledge construct** — hivemind's structure itself is installable as a pack (`hivemind-os`), configurable per-operator, cross-pollinating between operators

Cycle-005+ candidate: promote `hivemind-os` from private to public (with appropriate redaction of operator-specific content) + document the structure-as-methodology for external adoption.

### 15.5 · Operator OS ↔ Claude base memory ↔ Hivemind

Operator observation:

> *"The operator OS in the memory of the base of Claude is, I guess, a direct parallel to what is in the hive mind. What's in Claude auto-loads, what's in the hive mind, I'm not sure, auto-loads."*

Confirming: `~/.claude/CLAUDE.md` **does auto-load** (every Claude Code session reads it). Hivemind **does NOT auto-load** — it's read on-demand when `[[wikilink]]` is mentioned OR when agent explicitly checks.

Three layers of operator-context in current state:

| Layer | Lifecycle | What |
|---|---|---|
| **Claude base** (`~/.claude/CLAUDE.md`) | Auto-loads every session | Operator OS modes + lenses, creative latitude, micro-fix threshold |
| **Project CLAUDE.md** (`loa-constructs/CLAUDE.md`) | Auto-loads when in that project | Project-specific instructions, team, conventions |
| **Hivemind** (`~/hivemind/`) | Read on-demand | Deep mental models, strategy, self-observation, world details |

**Gap**: there's no bridge that makes hivemind *selectively* auto-load based on context. An agent starting in a purupuru session should auto-read purupuru-relevant hivemind pages; an agent in loa-constructs should auto-read construct-network pages.

**Amendment**: add a 6th stream type OR extend Operator-Model:
- **Operator-Model** (existing §14.2 / 5th type) remains: what operator knows
- **Operator-Context** (new consideration): which slice of Operator-Model is load-bearing *right now*

Context-aware hivemind loading is a cycle-006+ construct — probably named something like `hivemind-autoload` or `context-routed-memory`. Scope-defer; just name the shape now.

### 15.6 · First-class Loa + Claude Code integration without bloat

Operator concern:

> *"First-class integration with these tools is important for us without overbloating or confusing mental models."*

Risk observed: we now have four overlapping mental frames:

1. **Claude Code primitives** — Skill tool, Agent tool, hooks, settings
2. **Loa framework** — cycles, skills, harness, construct registry
3. **Operator OS** — modes, lenses, construct resolution table
4. **Pipe doctrine** — stream types, compositions, orchestration

These aren't redundant — they're nested:

- Pipe doctrine names the underlying protocol
- Operator OS names the operator-facing register
- Loa names the cycle-driven execution shape
- Claude Code names the runtime substrate

**Doctrine stance**: do not try to unify all four into one vocabulary. Do NOT flatten Operator OS into pipe doctrine, and vice versa. Instead:

- **Documentation** should show the translation between layers (§15.1 composition YAML example is one)
- **Tooling** should accept input in any layer's vocabulary (operator says "ARCH mode with craft lens"; orchestrator translates to pipe chain; construct-invoke emits JSONL rows)
- **Operator cognitive load** stays in the register they're already fluent in (CLAUDE.md modes + lenses for most users; pipe vocabulary only for protocol-authors)

**Implication for cycle-N readme + public release** (operator-stated next step): the public README should lead with the **Operator OS register** (modes + lenses + construct resolution) because that's the familiar pattern. Pipe-doctrine is the "how it actually works under the hood" section, not the landing.

### 15.7 · Reframed cycle-004 legs

Given v3 amendments, cycle-003's cycle-004 inheritance queue gains doctrinal framing:

| Queue item | Doctrinal framing (v3) |
|---|---|
| F24 three-way-merge impl | §4 composition-runner first primitive — merge IS composition of 3 states |
| `.source.json` backfill | Operator-Model integrity — ensures Operator-Model reads get real data |
| Upstream SKILL.md emission PRs | §15.2 workflow-kind compositions — feel-audit workflow's first stage |
| Install round-trip bats test | Doctrine §11 cycle-003 lens — locks the invariant at test layer |
| Composition runtime L7 | §15.2 — consumes BOTH workflow-kind AND frame-kind |
| DB swap Supabase → Turso | Unrelated to pipe doctrine — pure infra |
| Railway/Supabase decommission | Same |
| F23 validator fix | Quality-of-life |

**New cycle-005 candidate (§15.2 / §15.4 / §15.5)**: "workflow-kind composition design" — author the feel-audit workflow end-to-end (frame + chain + lens attachments) as the first real workflow. Requires the composition runner (L7) to land first OR run alongside as co-design.

### 15.8 · Version bump

**v3**. v2 chain-preserved. Amendments address operator's 2026-04-21-late post-cycle-003 observations. Structural changes:

- Operator OS recognized as proto-composition system (§15.1)
- Two composition kinds: workflow + frame (§15.2)
- Vibe-coding surface promoted to distribution vector (§15.3)
- Hivemind-as-shareable-construct (§15.4)
- Operator-Context layer named (§15.5)
- Four overlapping layers explicitly NOT unified (§15.6)

---

*v3 · 2026-04-21-late · After cycle-003 walk + second operator review. Doctrine deepens: Operator OS is the proto-composition system we're naming underneath. Frames vs workflows distinguished. Vibe-coding surface promoted. Hivemind as shareable. Four layers explicitly co-exist without forced unification.*

---

## 16 · Amendments (v3 → v4, 2026-04-21-late third operator review)

After doctrine v3 merged + cycle-003 closed. Operator signaled two structural shifts + named a friction point that reframes cycle-004 primary target.

### 16.1 · Operator OS inverts — prescriptive → prototype (open playground)

Operator observation:

> *"We built this Claude MD at the base before we even designed this new update here… I think we should reverse our understanding of using this as a composition. I guess it's a prototype of the composition system; it can inform what types of compositions there could be, but again, if we design stuff in the sense that they are Unix tools, then all of these modes and possibilities should be possible. My personal workflow should never prescribe specificity, but it could provide ideas and overall form of how an operator may structure his/hers. Open playground."*

**Structural claim**: with pipe doctrine as the ground, Operator OS (the `~/.claude/CLAUDE.md` modes + lenses + Construct Resolution table) is no longer the canonical spec. It becomes the **reference implementation** — one operator's structured workflow, offered as a starter template for others. Any operator may:

- Use it as-is
- Fork it and customize modes/lenses
- Replace it entirely with their own composition
- Mix: adopt some modes, introduce their own

The pipe doctrine guarantees that **all of these are valid** as long as the compositional substrate (typed I/O, Signal/Verdict/Artifact/Intent/Operator-Model streams) is honored. Modes are a UX affordance over that substrate, not the substrate itself.

**Implication for public release** (operator-stated post-cycle goal): the README should frame Operator OS as "here's one operator's workflow — here's how to author yours." The construct network's value is the *substrate*; Operator OS is one of many surfaces.

**Doctrine invariant**: no construct, pipe, or composition may require Operator OS modes/lenses as preconditions for operation. Modes are **orchestration hints**, not dispatch requirements.

### 16.2 · Hivemind trichotomy — named layers

Operator clarification:

> *"The hive mind OS is an internal hive mind tool. The hive mind that I'm talking about more so is the /hive mind, so I think we can consider the hive mind construct as an internal knowledge base, and then we can also consider the organizational memory, the hive mind, as well. There's a personal hive mind, and then there's the organizational hive mind."*

Clean trichotomy:

| Layer | What it is | Lives at |
|---|---|---|
| **Construct** | `hivemind-os` pack — installable org-knowledge structure + skills | `~/.loa/constructs/packs/hivemind-os/` |
| **Skill** | `/hivemind` (router) + `querying-hivemind` (org lookup) — invocation surface | `.claude/skills/` |
| **Knowledge (personal)** | Operator's own memory — self, strategy, wiki concepts, world notes | `~/hivemind/` |
| **Knowledge (organizational)** | Org-shared — library, laboratory, distribution, identity | `~/.loa/constructs/packs/hivemind-os/library+laboratory+network+…` |
| **Archivist** | Separate construct for vault mechanics — ingest, supersede, decay | `~/.loa/constructs/packs/archivist/` (not installed by default) |

**Structural claim**: these five are distinct and composable. Operator-Model (§14.2) reads from **all four knowledge-bearing layers** through the Skill layer. Construct layer (hivemind-os) is the *shareable structure* that any org can adopt. Archivist composes with either personal or org hivemind to provide vault mechanics without re-implementing them.

**Implication for §15.4 "hivemind-as-shareable-system"**: the shareable thing is the *structure*, the *conventions* (frontmatter, wikilinks, decay classes, supersession), and the *skill router* — not any specific operator's content. Publishing `hivemind-os` publicly means publishing the PATTERN, with redacted starter content showing how to use it.

**Implication for cycle-N**: document the trichotomy in public-facing material. Not as "this is complicated" — as "here are four clean slots: plug your org's knowledge into layer 2, your personal into layer 3, compose with archivist for mechanics, invoke through the skill."

### 16.3 · Composition determinism — the stated friction

Operator observation (load-bearing for cycle-004):

> *"One of the key friction points is that it is unclear to me which constructs are being called and how consistent they are. It doesn't feel extremely consistent, especially with the amount of context loaded in and the variance and non-deterministic nature of agents. I think you have a lot more variance if the sessions that you kick off are very unstructured; it could be a conflict of frames."*

**Three distinct failures** this names:

1. **Transparency failure** — operator can't see which constructs are informing the current agent response
2. **Consistency failure** — same operator utterance on different sessions routes to different constructs
3. **Frame conflict** — when multiple constructs load into one session, their frames (modes, lenses, personas) can contradict without explicit resolution

**Structural claim**: composition determinism is a first-class construct-network invariant, not a tooling nicety.

Minimum requirements a construct-using agent session must support:

| Invariant | Manifestation |
|---|---|
| **Active set visible** | Agent can report "constructs in my active context right now" at any point — a `constructs-active` command or equivalent |
| **Invocation deterministic** | When operator invokes `/feel`, the same pack + skill + lens set fires every time. Variance is explicit (e.g., parameter), not hidden |
| **Frame resolution named** | When two constructs' frames conflict (e.g., FEEL mode + TEND mode simultaneously), the resolution is explicit — one wins, or they compose with a stated rule |
| **Trajectory completeness** | Every construct-touching action emits a trajectory row (Signal stream), not just Skill tool invocations |

**Cycle-003's contribution**: the `.run/construct-trajectory.jsonl` + hook wiring solves the trajectory side of #1. But the UX-level "what's active right now" question is not answered — trajectory is append-only historical, not active-state.

**Cycle-004 primary target**: close this trifecta. Composition determinism becomes the load-bearing cycle outcome, not an incidental fix.

### 16.4 · Invariant: agent-transparency is non-optional

Promoting a consequence of §16.3 to doctrine-level invariant:

> **Every construct-network-aware agent session MUST support the operator asking "what's informing this response" and receiving a specific, complete, trustworthy answer within read-mode latency (glance <1s, orient <5s).**

This is not "logging." It's a runtime capability. An agent that can't surface its active construct set *cannot participate honestly in operator orchestration* — the operator's pipe-stage input can't route effectively if they don't know what's downstream.

**Implementation implications for cycle-004**:
- Shell tool: `constructs-active.sh` — outputs active set with mode + lens + pack + active skills per pack. Three read-modes per §14.3.
- Integration: hook into operator workflow naturally — e.g., at session start, on /loa-style status, on explicit `/active` query.
- Coverage: personal hivemind context, org hivemind context, operator OS mode, active lenses, invoked skills (trajectory-backed), agent's own self-reported frame.

**Invariant fails** if:
- Active-state is inferred post-hoc from trajectory rather than available live
- Modes/lenses/constructs can be "loaded" without the agent being able to enumerate them
- Different invocations of the same intent produce non-deterministic active sets without operator visibility into the divergence

### 16.5 · Operator-Context ↔ Hivemind autoload revisited

Previously in §15.5 I named Operator-Context as cycle-006+ candidate. After §16.3 framing, this is now earlier-stage:

- Operator-Context (slice of Operator-Model load-bearing NOW) is the MECHANISM that makes composition determinism work across expertise levels
- Without it, an agent either over-explains (operator impatience pattern per `~/hivemind/self/patterns.md`) or under-explains (misses context operator needs)
- With it, the same construct invocation adapts output-depth to operator state per read-mode

**Revised placement**: Operator-Context construct candidate moves from cycle-006 → cycle-005. Same cycle as workflow-kind composition design, since both rely on operator-state read-paths.

### 16.6 · Cycle-004 legs restructured

Original cycle-003 inheritance queue (§15.7) carried infra-heavy priorities (F24, DB swap). After §16.3 friction surfaced, cycle-004 primary target shifts to **transparency + determinism + open-playground doctrine**. Infra defers to cycle-005.

| Leg | Purpose | Priority |
|---|---|---|
| **L1 · constructs-active.sh** | Active-set reporter for agent sessions (§16.4 invariant) | CERTAIN |
| **L2 · Mode invocation contract** | Document + enforce: /feel, @ALEXANDER, "FEEL mode" all route deterministically to same pack+skill+lens | CERTAIN |
| **L3 · Operator OS as starter template** | Draft `~/.claude/CLAUDE.md` as template; separate operator's canonical version as example; publish as hivemind page | CERTAIN |
| **L4 · Hivemind trichotomy doc** | Formal named page: personal / org / construct / skill / archivist | CERTAIN |
| **L5 · feel-audit workflow-kind composition** | First real workflow per §15.2; composes artisan + observer | LIKELY |
| **L6 · Trajectory extension** | Cover not just Skill tool use but full agent-action attribution (Bash/Read/Edit touching construct files) | POSSIBLE |
| **L7 · F24 three-way-merge** | Carryover from cycle-003; still useful but not primary | CONDITIONAL |
| **L8 · DB swap** | Defers to cycle-005+ | DEFERRED |

### 16.7 · Version bump

**v4**. v3 chain-preserved. Amendments:
- Operator OS inverted (prescriptive → prototype, open playground)
- Hivemind trichotomy named (5 layers, 4 composable)
- Composition determinism invariant (§16.4)
- Agent transparency promoted (non-optional)
- Operator-Context upgraded to cycle-005 placement
- Cycle-004 legs restructured around transparency

---

*v4 · 2026-04-21-late · Third operator review. Operator OS inverts from canon to starter-template. Hivemind trichotomy cleaned. Composition determinism promoted to cycle-004 primary. Agent transparency becomes doctrine-level invariant. Open playground — "my workflow is one example, not THE workflow."*

---

## 17 · Amendments (v4 → v5, 2026-04-22 post cycle-005 L1/L2/L4/L6 landing)

Cycle-005 shipped the composition runner, stream schemas, manifest validator, and butterfreezone adapter. Running a real chain revealed two structural claims v4 conflated that v5 needs to separate, and one primitive layer v4 left undefined.

### 17.1 · Dispatch-determinism vs output-reproducibility (flatline SKP-002 closure — partial)

The v4 §16.3 "composition determinism" invariant packed two distinct guarantees into one phrase. Running `construct-compose feel-audit <target>` twice surfaces the tension:

**Dispatch-determinism** — the runner's obligation. A composition YAML + input selects the same construct slugs, same skill slugs, same persona handles, same stream types, same ordering *every invocation*. No LLM variance. No hidden routing. Verifiable from trajectory rows alone.

**Output-reproducibility** — not a pipe-layer guarantee. Each stage's *content* comes from an LLM-driven skill whose output varies session-to-session even on identical inputs. A feel-audit verdict changes wording and sometimes surfaces a different finding on re-run.

v4 said "same operator utterance → same construct every time" (dispatch-side) and implicitly suggested same-chain-runs-same-way (output-side). The second claim is false under LLM semantics and v5 doesn't pretend otherwise.

**Promoted to invariant**:

> Compositions MUST be dispatch-deterministic. Compositions MUST NOT be assumed to be output-reproducible. Tooling that needs reproducibility pins model + seed + temperature at the stage boundary; that's a stage-level contract, not a pipe-layer one.

**Consequence for trajectory rows**: an agent comparing two runs of the same composition should diff the *dispatch trail* (constructs touched, stages ordered, stream types) and expect identical rows. Output content diffing is optional, not a doctrine obligation.

**Flatline SKP-002 partial closure**: the determinism claim is now clearly split. SKP-002's full closure (how to pin output reproducibility when an operator wants it) lands in cycle-006+.

### 17.2 · Failure-semantics primitives (flatline SKP-003)

v4 was silent on what a pipe chain does when a stage fails. Cycle-005's runner implements the simplest possible policy (fail-fast, propagate exit code 3) but doctrine v5 names the primitive vocabulary so downstream cycles can choose other policies coherently.

Four primitives, named but not yet all implemented:

| Primitive | What it means | Cycle-005 default |
|---|---|---|
| **Timeout** | Stage exceeds duration budget → marked failed | Not enforced (stages are stubs) |
| **Retry** | Stage failed → runner re-invokes per policy (max attempts, backoff) | Not enforced — one attempt |
| **Idempotency** | Re-running the same stage on the same input produces the same-schema output even if content varies (see §17.1) | Partially — stubs are idempotent; real stages TBD |
| **Dead-letter** | Stage permanently failed after retries → payload diverts to a dead-letter stream for operator review | Not implemented — failures surface in exit code only |

A composition MAY declare a `failure_policy:` block per stage. Example (post-cycle-005, not yet consumed):

```yaml
chain:
  - stage: 2
    construct: observer
    skill: analyzing-gaps
    reads: [Verdict, Signal]
    writes: [Verdict]
    failure_policy:
      timeout_ms: 30000
      retry:
        max_attempts: 3
        backoff: exponential
      idempotency_key: "{run_id}-{stage}"
      dead_letter: .run/deadletter/feel-audit.jsonl
```

**Invariant** (promoted): every pipe-stage failure MUST be observable. Either the runner propagates exit code + emits a failed-outcome trajectory row, OR the payload routes to a dead-letter stream. Silent-drop is a doctrine violation.

**Flatline SKP-003 partial closure**: the vocabulary is set. Full closure requires a runner that honors failure_policy blocks — cycle-006 target.

### 17.3 · `Verdict` finding type — severity-evidence contract

Cycle-005 L4's `construct-validate.sh` emits findings as Verdict stream rows with `severity` and `evidence` fields. Usage demonstrated that a Verdict row doubles as both:

1. An evaluated judgment (v4 §3.2 original framing)
2. A structured finding with severity tier (info/low/medium/high/critical) + evidence chain

Both usages already round-trip through `.claude/schemas/verdict.schema.json`. Promoting to doctrine: Verdict rows SHOULD carry `severity` when the producer is an audit / validator / review construct. The `severity` field itself is optional on the schema (preserves backwards compat with feedback-v3-era verdicts), but downstream consumers (dashboards, install gates, bridge reviewers) may key off it.

### 17.4 · Grimoires-as-interface convention (SEED §12 promotion)

The cycle-005 SEED §12 convention was repo-local guidance. After L6 butterfreezone surfaced artisan's CLAUDE.md drift (construct.yaml declares paths; CLAUDE.md does not), the convention is load-bearing enough for doctrine:

> **A construct's declared `grimoires/` read/write paths ARE its filesystem-level composition interface.** Two constructs writing to the same grimoire path compose automatically; no event bus, no handshake. Two constructs where one reads a path the other writes form an implicit pipe edge. This is structurally identical to a typed-stream pipe at the stream layer.

The implication for v5: **pipe compatibility is a two-layer claim**. The stream layer (Signal/Verdict/Artifact/Intent/Operator-Model) gives in-memory typing; the grimoire layer gives filesystem typing. Both must align for a composition to be complete.

Cycle-005 enforces the stream layer via `construct-compose.sh` type check. Cycle-006+ can extend to the grimoire layer: the composition runner reads each stage's declared grimoire paths and warns when two stages overwrite the same path without sequencing.

### 17.5 · Version bump

**v5**. v4 chain-preserved. Amendments:

- Dispatch-determinism vs output-reproducibility split (§17.1)
- Failure-semantics primitives vocabulary (§17.2)
- Verdict severity field promoted as canonical for audit/review/validator producers (§17.3)
- Grimoires-as-interface promoted from SEED §12 to doctrine invariant (§17.4)

Flatline blocker updates:
- SKP-002 — partially closed by §17.1 split. Full closure (reproducibility knob) deferred.
- SKP-003 — partially closed by §17.2 vocabulary. Full closure (runner enforcement) deferred to cycle-006.

---

*v5 · 2026-04-22 · Post cycle-005 runtime landing. Two conflated invariants split. Failure-semantics primitives named. Grimoires-as-interface promoted. Four active primitives now have doctrine: Signal/Verdict/Artifact/Intent/Operator-Model for stream typing; timeout/retry/idempotency/dead-letter for failure; stream-layer + grimoire-layer compose for composition completeness.*
