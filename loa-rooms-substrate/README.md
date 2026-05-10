# loa-rooms-substrate

> a substrate that puts every loa construct into an isolated room.

[![status](https://img.shields.io/badge/status-experimental-yellow)](#status)
[![type](https://img.shields.io/badge/type-substrate-blueviolet)](#what-this-is)
[![runtime](https://img.shields.io/badge/runtime-claude--code--native--subagents-blue)](#runtime-target)
[![scope](https://img.shields.io/badge/scope-pan--construct-green)](#what-this-is)

---

## What this is

**A pack that provides invocation boundaries for any Loa construct.**

When `loa-rooms-substrate` is installed in a repo with constructs synced, every construct becomes invocable as a Claude Code native subagent. Each invocation runs in an **isolated room** — its own context, its own tool allowlist, its own transcript — and emits a typed **handoff packet** when it finishes. Multi-stage compositions chain rooms together via packets, never via raw transcript.

It is **substrate**, not expertise. It does not know what `artisan` does or what `k-hole` finds. It knows how to put either of them into a room, watch the room run, and record what came out.

### Concretely, this pack ships:

| Component | Purpose |
|---|---|
| **Adapter generator** | `construct-adapter-gen.sh` produces `.claude/agents/construct-<slug>.md` from any construct's `construct.yaml` |
| **Adapter template** | `templates/construct-adapter.template.md` — the canonical native-subagent shape |
| **Composition runner** | `compose-dispatch.sh` — orchestrates multi-stage construct chains into visible subagent dispatches |
| **Handoff packet schema** | Structured artifact emitted at every room boundary; three-tier required/recommended/optional policy |
| **Room activation packet schema** | Pre-spawn invocation envelope; content-addressable IDs |
| **Construct manifest v4 schema** | Additive over v3; declares `tools.{allowlist,denylist,required}` + `adapter.{description_hint,color,...}` |
| **Validators** | `handoff-validate.sh`, `room-packet-validate.sh`, `construct-manifest-validate.sh` |
| **Parity checker** | `handoff-parity-check.sh` — diffs native vs headless packets; reports allowed-only vs substantive divergence |
| **Hooks** | `subagent-start` / `subagent-stop` for tool-mandate observability + handoff collection |
| **Migration scripts** | `migrate-subagents-to-agents.sh` for the legacy `.claude/subagents/` → `.claude/agents/loa-validator-*` move |
| **Library** | `construct-handoff-lib.sh` mirroring L6 helper signatures |
| **Test suite** | 35 bats integration tests across 4 suites, covering all 8 PRD acceptance gates |

### Why "rooms"?

A room is **one explicit Loa construct invocation boundary**. The brief that originated this pack used the term to distinguish two failure modes Loa needed to address:

- **Studio mode** — natural-language synthesis where the agent "thinks with" several constructs at once. Useful but cannot claim individual construct authority.
- **Room mode** — explicit invocation: this construct, with these inputs, producing this output type, recorded in this transcript, finished by this packet.

Rooms make construct boundaries operationally enforceable. Studios stay studios. The substrate provides the room mechanics.

---

## What this IS NOT

This list is intentionally explicit. The point of a substrate is to be small and clear about its scope.

### NOT a Loa framework feature

The Loa framework already provides first-class construct support (cycle-051 / [`loa#454`](https://github.com/0xHoneyJar/loa/pull/454), closes [`loa#452`](https://github.com/0xHoneyJar/loa/issues/452)). The framework's L1-L5 stack ships:

- `construct-index-gen.sh` → `.run/construct-index.yaml`
- `construct-resolve.sh` (slug / name / command resolution)
- Composition routing via writes/reads path overlap
- `archetype-resolver.sh` (personal modes)
- Ambient session greeting + open thread tracking

That's the **lightweight in-session approach**: agent reads the index, loads the persona inline, scopes to the construct's read/write paths. It works without spawning subagents. **It is the canonical Loa construct contract.**

`loa-rooms-substrate` is a **separate, opt-in runtime** that adds Claude Code-native subagent spawning on top. It does not replace the framework's L1-L5; it complements it. Both can coexist in the same repo. Operators can prefer one, the other, or use both.

### NOT a replacement for Loa's construct contract

A construct's identity remains its `construct.yaml`. A construct's persona remains its `identity/<PERSONA>.md`. A construct's skills remain its `skills/<slug>/SKILL.md` directories. None of this changes.

The substrate adds:

- An **adapter** at `.claude/agents/construct-<slug>.md` (generated, gitignored per repo)
- An optional `tools.{allowlist,denylist,required}` block in the manifest (v4; v3 manifests work unchanged)
- An optional `adapter.{description_hint,color,model,foreground_default,invocation_modes}` block (v4; defaults applied if absent)

That is the only manifest surface the substrate reads.

### NOT its own construct

`loa-rooms-substrate` has no persona. No taste tokens. No domain expertise. No "voice." It is mechanism. If you `@-mention construct-loa-rooms-substrate` you get nothing useful — there is nothing to embody.

For comparison: `construct-artisan` IS a construct (ALEXANDER persona, craft expertise). `construct-observer` IS a construct (KEEPER persona, user-research expertise). `loa-rooms-substrate` is the floor those constructs invoke FROM, not a construct itself.

### NOT prescriptive about modes, workflows, or composition shapes

The substrate is silent on:

- Whether you use Operator OS modes (FEEL/ARCH/DIG/SHIP) or some other personal cognitive frame
- Whether you follow the Loa golden path (`/plan → /build → /review → /ship`) or freestyle
- Whether you prefer agent teams, autonomous mode, simstim, or something else
- Whether your compositions are linear pipes, branching graphs, or single-stage rooms

It only enforces that **when a construct is invoked as a room**, the invocation is explicit, the boundary is recorded, and the output is a packet. What you do inside the room is your business.

### NOT a sandbox runtime

A "room" is a named, traced, packet-emitting invocation boundary. **It is not a security sandbox.** This pack does not provide:

- Process isolation
- Resource limits / cgroups
- Network policy
- Filesystem chroot
- Capability dropping

Tool mandates are enforced via Claude Code's native subagent `tools` allowlist (frontmatter) plus `SubagentStart`-hook observability. Sprint 0 of the originating cycle confirmed this is **observability primary** — the hook logs violations; it does not block spawn. Strict sandboxing is deferred future work.

### NOT for non-Claude-Code runtimes

The adapter format targets Claude Code's `.claude/agents/*.md` registry. It will not produce subagents for:

- OpenAI Agent SDK
- Anthropic API direct (without Claude Code)
- Local LLM frontends
- Custom orchestrators

Other runtimes are welcome and possible — they would be **separate substrate packs** that share the construct manifest contract and the handoff packet schema (which IS runtime-agnostic). Cross-runtime parity is a future-cycle concern.

### NOT a way to create new construct expertise

If you want to author a new construct (`construct-foo`), use the existing tooling: `/create-construct` skill, `construct-base` template, the construct-creator pack. `loa-rooms-substrate` only provides the room mechanics for constructs that already exist.

### NOT a tool for the construct registry

The Loa Constructs Network ([`constructs.network`](https://constructs.network)) handles publication, discovery, version sync, install. This pack does not modify that. It is published TO the network like any other pack; it does not BECOME network infrastructure.

---

## Responsibilities table

| Concern | Owner |
|---|---|
| Skill execution surface (slash commands, gates, beads, golden path) | **Loa framework** |
| Construct contract (`construct.yaml` schema, identity, skills, taste, manifest) | **Loa framework** + individual construct repos |
| In-session construct awareness (index, name resolution, composition routing, archetype, ambient greeting) | **Loa framework** ✅ already shipped (cycle-051) |
| Construct registry, distribution, install, version sync | **Loa Constructs Network** ([this repo](https://github.com/0xHoneyJar/loa-constructs)) |
| Domain expertise, persona content, skills, taste tokens | **Individual construct packs** (e.g. `construct-artisan`, `construct-k-hole`) |
| **Native-subagent invocation boundaries (rooms), generator, composition runner, handoff packets, hooks** | **`loa-rooms-substrate`** ← this pack |
| Other runtime targets (OpenAI Agent SDK, headless Python, in-browser) | **Separate substrate packs** (future, not this one) |
| Per-repo generated outputs (`.claude/agents/`, `.run/`, `grimoires/`) | **Per-repo (consumer)** |
| Sandbox isolation (process, network, fs) | **Not yet shipped** (future cycle) |

If you find yourself asking "where does X go," the test is: does it know about a specific construct? If yes — construct pack. Does it know about a specific runtime? If yes — substrate pack (this one or a sibling). Does it know about all constructs and all runtimes? If yes — Loa framework.

---

## Status

**Experimental.** This pack was authored as the deliverable of the `cycle-construct-rooms` cycle (simstim-20260509-aead9136). It is currently staged in the loa-constructs monorepo at [`loa-rooms-substrate/`](.) pending publication as a standalone construct pack repo and registration with the Loa Constructs Network.

Until publication:

- Operators can copy the contents into a repo's `.claude/{scripts,data,hooks,agents}/` paths to enable the rooms runtime
- All 35 bats acceptance tests pass when run from a repo with the contents installed
- The originating cycle's PR `loa-constructs#234` ships the pilot in the loa-constructs repo itself

After publication (planned next cycle):

- `/constructs install loa-rooms-substrate` will provide the substrate to any Loa-mounted repo
- Construct sync workflow will trigger `construct-adapter-gen.sh` post-install to populate `.claude/agents/`
- Other repos (mcv-interface, mibera-interface, etc.) become opt-in clients

---

## Runtime target

Claude Code v2.1.0+ — the version where project agents at `.claude/agents/<name>.md` are loaded into the agent registry and surfaced via `@`-mention typeahead.

**Empirically verified during cycle Sprint 0** (probe-tool-restricted experiment):

- `claude agents` lists project agents from `.claude/agents/*.md` ✅
- `@agent-construct-<slug>` typeahead works in operator's main session ✅
- Subagent transcripts persist at `~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl` ✅
- The parent session's `Agent` tool has a **fixed `subagent_type` allowlist computed at session start** — project agents from `.claude/agents/` are NOT in it ❌ (this is why room invocation goes via @-mention, not via skill-side `Agent()` calls)

The PRD §6.4 FR-4 invocation contract reflects this empirical finding.

---

## Acceptance gates

Eight gates from the originating cycle's PRD §8 — all have green test infrastructure:

| Gate | Test suite | Tests |
|---|---|---|
| T1 — Native Adapter Discovery | `pilot-adapter-discovery.bats` | 10 |
| T2 — Explicit Invocation Only In Rooms | `composition-pilot.bats` | 3 |
| T3 — Handoff Packet Surfacing | `composition-pilot.bats` | 2 |
| T4 — Composition As Visible Agent Chain | `composition-pilot.bats` | 3 |
| T5 — Headless Parity | `headless-parity.bats` | 7 |
| T6 — Tool Mandate Enforcement | `tool-mandate.bats` | 5 |
| T7 — AskUserQuestion Gate | `tool-mandate.bats` | 3 |
| T8 — Delete-First Migration | `migrate-subagents-verify.sh` | 4 (script-based) |

35 acceptance assertions total.

---

## How to use (when published)

```bash
# 1. Install the substrate
/constructs install loa-rooms-substrate

# 2. Generate adapters for every construct in this repo
bash .claude/scripts/construct-adapter-gen.sh

# 3. Verify
claude agents | grep construct-

# 4. Invoke a construct as a room
# (in your operator session)
@agent-construct-artisan review the visual surface at src/components/Card.tsx
```

For multi-stage compositions, use `compose-dispatch.sh` against a `composition.yaml` describing the stages. See `docs/runtime/construct-adapters.md` for the full operator workflow.

---

## What it composes with

Designed to coexist with:

- **Loa framework's L1-L5 in-session construct support** — both runtimes work; operator picks per invocation
- **L6 structured-handoff library** — shares JCS canonicalization, atomic-publish patterns; handoff packet schema is a sibling, not a child
- **Existing `compose-run.sh`** — composition runner extends, does not replace
- **Existing `.claude/subagents/`** — migrated to `.claude/agents/loa-validator-*` per Sprint 6

Designed NOT to require:

- Custom CLI surface (no `loa-rooms run …` command — uses existing dispatchers)
- New room schema beyond invocation/composition envelopes
- Visual UI (text contract first; tmux renderer remains optional debug surface)

---

## Origin

This pack distills the deliverables of the `cycle-construct-rooms` cycle (May 2026). The originating brief, PRD, SDD, sprint plan, and Bridgebuilder reviews are local-only operator artifacts under `grimoires/loa/` in the cycle's repo. The cycle's PR ([`loa-constructs#234`](https://github.com/0xHoneyJar/loa-constructs/pull/234)) shipped the pilot.

Source brief: "Loa-First Construct Invocation Boundaries" — operator-private; activation receipt declared at simstim cycle entry; expiry: cycle close.

---

## Trade-offs (the honest version)

This substrate makes a specific bet: **operator-visible Claude Code subagents are a useful runtime affordance, worth the additional machinery.** That bet has costs:

- More files per repo (~38 generated adapters + 8 scripts + 3 schemas + 2 hooks)
- Form A operator-paste workflow for interactive composition (operator-in-the-loop UX bottleneck)
- Hook integration with Claude Code's `.claude/settings.json` is operator-controlled (per-repo decision)
- Specific runtime opinion locked in (rooms = subagents; not OpenAI agents, not headless Python)

The alternative — continuing with Loa's existing in-session L1-L5 only — has different trade-offs:

- Lighter (no extra machinery)
- No operator-visible spawn surface (can't see "the construct ran" in the Claude Code UI panel)
- Composition is logical (path overlap) rather than runtime-enforced (separate transcripts)
- No tool-mandate observability per spawn

Different operators want different runtimes. This pack is one runtime; the framework's existing L1-L5 is another. Neither is wrong.

---

## License

AGPL-3.0 — matches Loa framework + Loa Constructs Network conventions.

---

## See also

- [`loa#452`](https://github.com/0xHoneyJar/loa/issues/452) — RFC: First-Class Construct Support (CLOSED, addressed by [`loa#454`](https://github.com/0xHoneyJar/loa/pull/454))
- [`loa-constructs#181`](https://github.com/0xHoneyJar/loa-constructs/issues/181) — RFC: Network-side schema hygiene + install surface
- [`loa-constructs#234`](https://github.com/0xHoneyJar/loa-constructs/pull/234) — the originating cycle's PR (pilot in loa-constructs)
- `docs/runtime/construct-adapters.md` (in this pack) — operator workflow guide
