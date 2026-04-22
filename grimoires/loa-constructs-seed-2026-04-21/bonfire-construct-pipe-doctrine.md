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

## 10 · Open questions for operator review

Questions where I'm genuinely uncertain and want your direction before cycle-004 SEEDs:

1. **Stream type cardinality** — is four (Signal / Verdict / Artifact / Intent) the right granularity, or should one of them split? E.g., should `Verdict` split into `Praise` / `Finding` / `Reframe` per BRIDGEBUILDER's severity classes? Or is that emission-schema detail, not type-system detail?

2. **Composition authorship** — who writes composition YAMLs? Operator? Agents? Both via a governance-FSM analog? Forum-project suggests a governance layer; cycle-N might need one.

3. **Orchestration transparency granularity** — does the orchestrator report every pipe-stage dispatch to operator ("I'm routing to artisan, then observer, then archivist"), or only report Intent → top-level composition selection? Tradeoff between transparency and noise.

4. **Finn's scope reframe** — is the "Finn = orchestration layer for constructs" claim load-bearing? If yes, `[[sovereign-stack]]` gets amended; Finn becomes cycle-005+ priority over other L3 capabilities.

5. **Forum-project integration timeline** — when (if ever) does the construct network's Signal/Verdict stream cross-post into forum-project's audit log? And vice versa, when does forum deliberation emit Intent into construct orchestrator?

6. **Versioning** — doctrines need versioning. Do we adopt a `doctrine.yaml` metadata pattern (analogous to construct.yaml) so agents can discover/validate doctrine versions programmatically? Or is doctrine a human-read-only artifact?

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
