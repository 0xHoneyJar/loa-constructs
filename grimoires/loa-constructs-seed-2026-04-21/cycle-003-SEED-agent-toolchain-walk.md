# SEED — Cycle-003 · Agent Toolchain Walk + DB Swap (agent-first)

> *"Your job is to improve the tools for your own use case."* — operator 2026-04-21
>
> **Status**: Draft. Author: Claude (operating as the agent user, not the external scribe).
>
> **Date**: 2026-04-21
> **Precedes**: cycle-003 harness dispatch (may skip harness entirely; see §7)
> **Supersedes**: none — extends `cycle-002-findings.md` + `cycle-002-SEED-artisan-lifecycle-walk.md`
> **Shape**: agent-first lifecycle walk; legs already named from prior-walk friction

---

## 0 · The authorship shift (continued)

Cycle-001 = OSTROM-lens SEED. Architecture decomposed into 7 legs. Shipped clean. Half the legs untested.

Cycle-002 = operator-lens paired-scribe walk. Friction emerged; reveal exceeded fix scope (Supabase pause = migration forcing function). Operator rejected full rebuild.

**Cycle-003 = agent-lens first-person walk.** *I* (the Claude Code instance invoking this SEED) perform the lifecycle. The operator observes; I'm the one on the chair. Every friction I personally hit becomes a leg or a finding. Legs here are named from actual cycle-002 session observations, not architectural speculation.

The authorship ladder: OSTROM → operator → agent. Each cycle gets closer to ground-truth use.

---

## 1 · Why this cycle exists

From cycle-002's close:

- **F18+** · constructs.network is the unmigrated outlier on the org's stack. Sovereign = SvelteKit + Turso + SIWE. Constructs.network = Next.js + Supabase + Dynamic. Supabase paused. Won't be restored.
- **Operator scope lock**: DB-only swap. Keep Hono API, keep Next.js explorer ("works as folklore"), keep Dynamic for now. **Do not rebuild the network.**
- **Agent-first directive**: the tools matter because *agents use them*. Explorer is a viewing surface for humans; the product is the CLI-mediated agent flow (install → invoke → compose → emit feedback).
- **Eight friction-points observed** by Claude-the-agent during cycle-002 (catalogued below as §3). Each is a cycle-003 candidate leg.

---

## 2 · The agent walk (first-person protocol)

Performed by a Claude Code instance (the "agent"). The operator observes. Each step has an observable pass/fail from the agent's own perspective — not from a database admin's perspective, not from an explorer visitor's perspective.

### Step A — Enumerate installed constructs from agent POV

**Action**: Issue a single command that answers "what THJ constructs do I, the agent, have access to right now, and where do they physically live?"

**Observables**:
- Response names each pack by slug, version, install state, `.source.json` cleanliness, source commit drift from upstream.
- Distinguishes THJ constructs from global Anthropic skills from user-custom.
- Takes <5 seconds.

**Current state**: no such command exists. Closest is `<available-skills>` in the `<system-reminder>` — opaque list, no provenance.

**Pass**: a command exists; it works; I (agent) can trust it.
**Fail** → Leg L6 (agent-surface skill clarity).

### Step B — Install a construct as the agent

**Action**: Given a slug from a registry listing, install it: `constructs install <slug>`.

**Observables**:
- Registry actually returns a non-empty list (F15 fix + DB swap must hold).
- Install writes `~/.loa/constructs/packs/<slug>/` + `.source.json`.
- `.source.json` is populated with real `source_repo`, `source_commit`, `installed_at`.
- New skill becomes visible in `<available-skills>` without needing session restart.

**Pass**: clean install, agent-visible immediately.
**Fail** → Leg L2 (CLI surface audit) + L1 (DB swap).

### Step C — Invoke a construct and observe trajectory

**Action**: Invoke any installed THJ construct via its slash command (`/feel`, `/dig`, `/systems`, etc.).

**Observables**:
- The invocation is wrapped by `construct-invoke.sh` (Leg D of cycle-001).
- `.run/construct-trajectory.jsonl` gains paired entry/exit rows.
- The agent (me) sees the invocation happen; the trajectory persists.
- `jq 'select(.phase == "exit")' .run/construct-trajectory.jsonl` returns a row with verdict + cost + duration.

**Current state**: `.run/construct-trajectory.jsonl` does not exist post-cycle-001. Leg D shipped dry.

**Pass**: row lands for real usage.
**Fail** → Leg L3 (wire construct-invoke into agent path).

### Step D — Edit an installed construct locally

**Action**: Modify a line in `~/.loa/constructs/packs/<slug>/skills/<skill>/SKILL.md`.

**Observables**:
- Edit persists (no file-protection).
- `git diff` inside the pack directory shows the change.
- Agent can detect drift from upstream (`source_commit` in `.source.json` is older than local HEAD).

**Pass**: edit sticks; drift is observable.

### Step E — Upgrade with local edit (three-way-merge round-trip)

**Action**: Run `constructs install <slug>` again (treated as upgrade).

**Observables**:
- Three-way merge detects: base=`.source.json.source_commit`, local=edited, remote=upstream.
- Operator (or agent acting as operator) is **prompted** on conflict.
- Choosing "keep local" → edit preserved; `.source.json.source_commit` updated to latest upstream after manual merge.
- Choosing "accept upstream" → edit lost (explicit consent).
- Zero-diff → no-op; fast-forward → apply.

**Pass**: AC-C4 satisfied with live proof.
**Fail** → Leg L5 (bats round-trip test).

### Step F — Emit feedback-v3 from a persona skill

**Action**: Invoke a skill whose SKILL.md has been wired for feedback-v3 emission (ALEXANDER / KEEPER / STAMETS — cycle-001 Leg E).

**Observables**:
- Invocation produces a feedback-v3 JSON row (in `.run/feedback-v3.jsonl` or stdout block).
- Row validates against `.claude/schemas/feedback-v3.schema.json`.
- `tests/feedback-v3-roundtrip.bats` passes on the emitted row.
- Agent (me) can see my own verdict as a structured artifact.

**Current state**: cycle-001 Leg E SKILL.md edits never landed. Schema exists; emission wiring does not.

**Pass**: emission happens; schema round-trips.
**Fail** → Leg L4 (ALEXANDER/KEEPER/STAMETS SKILL.md emission).

### Step G — Compose two constructs through a recipe

**Action**: Read `.claude/constructs/compositions/feel-audit.yaml`; invoke the composition.

**Observables**:
- A composition runner exists (or at least a shell script) that reads the yaml and chains the two personas.
- Both invocations emit trajectory rows + feedback-v3 verdicts.
- The composition yaml's "expected output" matches reality.

**Current state**: yaml files exist (cycle-001 Leg F) but no runtime consumes them. Read-only folklore.

**Pass**: composition actually chains; both verdicts land.
**Fail** → Leg L7 (composition runtime) — DEFERRED if blocked by time; folklore is acceptable for cycle-003.

### Step H — Agent emits feedback via `/feedback`

**Action**: Trigger the `/feedback` v3 command that cycle-001 §14.2 points external users toward.

**Observables**:
- `/feedback` accepts an issue description + construct slug + severity.
- Routes to correct repo via Smart Routing Classification.
- File appears on the right construct repo's issues, tagged.

**Pass**: channel works end-to-end for an agent, not just a human.

---

## 3 · Emergent legs (from cycle-002 agent-friction catalogue)

| Leg | What ships | Status | Trigger |
|---|---|---|---|
| **L1 · DB swap** | Supabase Postgres → Turso libSQL. Drizzle dialect rewrite. Env var split. | CERTAIN | Foundational — without this, nothing downstream walks. |
| **L2 · CLI surface audit** | `constructs install` canonical path resolved. One install command (PT-4 closure). Offline-mode error message tells operator the right next move. | CERTAIN | Step B fails otherwise. |
| **L3 · construct-invoke wiring** | Wrapper fires when agent invokes THJ skill. Trajectory populates. 24h rotation + 30-day retention. | CERTAIN | Step C fails otherwise. Closes cycle-001 Leg D's dry pipe. |
| **L4 · SKILL.md feedback-v3 emission** | ALEXANDER + KEEPER + STAMETS SKILL.md edited per cycle-001 Leg E. Tight scope, no expansion. | CERTAIN | Step F fails otherwise. |
| **L5 · `.source.json` round-trip bats test** | `tests/construct-install-roundtrip.bats`. Walks install → edit → upgrade → conflict-prompt. | LIKELY | Step E proves AC-C4 behaviorally, but test locks it in. |
| **L6 · Agent skill clarity CLI** | `constructs list` or `loa constructs` command enumerating installed packs with provenance. | LIKELY | Step A fails otherwise. |
| **L7 · Composition runtime** | Runner consuming `compositions/*.yaml`. | POSSIBLE | Step G; defer if infrastructure-heavy. |
| **L8 · Decommission Railway + Supabase refs** | Code cleanup, env-var pruning, sunset cycle-001's Supabase-coupled config. | CONDITIONAL | After L1 lands; cycle-004 candidate. |

---

## 4 · What this cycle does NOT do

- Rebuild the explorer UI (works-as-folklore per operator direction)
- Migrate off Dynamic Labs (F11 pull-thread; future cycle)
- Touch `auth.0xhoneyjar.xyz` or shared-auth infra (cross-brand issue)
- Port constructs.network to SvelteKit
- Wrap constructs.network in Freeside ECS (operator explicitly rejected)
- Add new manifest formats
- New slash-command registrations
- Expand beyond 3 personas for Leg E edits

---

## 5 · Budget + dispatch

**Target**: $60. **Cap**: $120. **Profile**: `light`.

Higher cap than cycle-002 because **L1 DB swap** is not trivial — Drizzle's Postgres and SQLite dialects diverge (JSON types, UUID handling, timestamp behavior, constraint syntax). Expect migration-generation iteration.

**Dispatch consideration**: cycle-003 may NOT use `spiral-harness.sh` at all. This cycle is agent-first lifecycle; the harness assumes architectural-decomposition phases (DISCOVERY → ARCH → PLAN → IMPL → REVIEW → AUDIT). Agent-first walking doesn't decompose into those phases.

**Proposed flow**:
1. Operator + agent conversationally walk Step A → Step H.
2. Each step failure → branch to the named leg inline, ship fix, re-walk.
3. Harness invoked only for L1 (DB swap) since that's substantial code.
4. All other legs are micro-fixes per operator creative latitude.
5. Cycle closes when Step H succeeds OR operator calls HALT.

---

## 6 · KANSEI gate (Steps A–H answerability)

At cycle close, the operator asks me (the agent):

| # | Question | What a pass looks like |
|---|---|---|
| Q1 | Can you enumerate your installed constructs with provenance right now? | `constructs list` returns real state, not `<available-skills>` opacity. |
| Q2 | When you invoked `/feel` just now, did `.run/construct-trajectory.jsonl` gain a paired row? | Yes, show me the row. |
| Q3 | If an operator edits a SKILL.md locally and runs upgrade, does the merge prompt fire? | Demonstrated; yes. |
| Q4 | Does invoking ALEXANDER produce a structured feedback-v3 verdict? | Show me the verdict + validate against schema. |
| Q5 | Free-text: where does the CLI toolchain STILL feel ceremonial, after all this? | Agent names the remaining friction; operator decides cycle-004 shape. |

**Target**: 4/5 Y on Q1-Q4 + concrete Q5. Halt if <3/5.

---

## 7 · Review lens (carryover + cycle-003 additions)

Still applicable: `cycle-001-review-lens.md` (GECKO + KEEPER + OTLET + KISS).

**Cycle-003 additions to the KEEPER friction-map**:
- F19 · Agent has no first-person toolchain visibility (closed by L6)
- F20 · Cycle-001 pipes laid but never walked by an actual agent (closed by Step C + L3)
- F21 · Schema+validator shipped without the emission wiring it implies (closed by L4)

**New lens — COMPILE** (addresses cycle-002 F13):
Reviewer MUST run `bun run typecheck` before approving the PR. Applies to every code change ≥5 lines in apps/api or apps/explorer. Failures are HIGH severity.

**New lens — DOGFOOD**:
For any claim that a leg "works," the reviewer asks: "was this invoked by an actual agent in a live session?" A passing bats test is not sufficient. Agent-walked = real; CI-tested = scaffold.

---

## 8 · Supersession note

Cycle-001-findings.md reference-floored. Cycle-002-findings.md stays live (append-only). Cycle-003-SEED supersedes the cycle-002 SEED's Step 1-8 walk protocol with the agent-first reinterpretation above. The operator's 2026-04-21-late directive (rebuild rejected, DB-only swap, agent-first tools) is the forcing frame.

---

## 9 · What landing this proves

If cycle-003 lands cleanly, it proves:

1. **Agent-first cycle composition works.** The agent's felt friction generates real legs. Unlike cycle-002 which relied on operator mental models, cycle-003 uses the agent's own session experience.
2. **Toolchain hygiene.** THJ constructs have clean provenance, predictable invocation, structured emission — the agent can trust its own tooling.
3. **The sovereign stack swap is tractable in one cycle** for the DB layer alone. Full SvelteKit port is not needed to unblock agent use.
4. **OTLET principle holds across authorship shifts.** Cycle-001 (OSTROM) → Cycle-002 (operator) → Cycle-003 (agent) — each chain-preserves what came before, supersedes what's obsolete, leaves the chain walkable.

If it doesn't land — if Turso's SQLite dialect breaks something non-trivial, if the composition runtime surfaces too much complexity, if Step F reveals that persona-emission is harder than a three-line SKILL.md edit — the learning still matters. Cycle-004's shape emerges from whatever cycle-003 surfaces.

---

*Drafted 2026-04-21 post-cycle-002-close. First SEED authored from the agent's own POV. The operator is not the only ground-truth anymore; the agent operating the toolchain is also ground-truth, and its friction counts.*
