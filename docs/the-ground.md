# The Ground — shared runtime & harness taxonomy for constructs

> **Taxonomy, not inventory.** This document carries the slow-moving AXES of the
> world constructs run in — the *kinds of things*, not the *current values*.
> Current values live in each axis's SoT (see the Seam Ledger at the bottom) and
> are read live at run-time; a doc that carried them would rot. Where a value
> appears below it is an illustration, dated, never authority.
>
> **Provenance**: hoisted from `construct-gecko/identity/environment.md`
> ("The Ground GECKO Stands On", authored cycle 2026-06-07, gecko @ e193fde)
> during the C7 grounding rollout, 2026-07-03 (loa-freeside
> `cycle-construct-grounding-c7`). Gecko-specific stance stayed behind in that
> file's §VI — this is the shared ground only.
>
> **The citation contract**: a construct's `identity/environment.md` MUST carry
> the line below verbatim (URL included) and MUST NOT copy the five shared
> sections — cite, don't clone. One home, zero drift:
>
> ```
> > Shared ground: https://github.com/0xHoneyJar/loa-constructs/blob/main/docs/the-ground.md
> ```

---

## I. Intelligence tiers — the model ladder

Three tiers. A capability/cost gradient, not three interchangeable engines.

| Concrete family | Home alias (`model-config.yaml`) | Illustrative model (2026-07) | For |
|------|------|---------------|-----|
| `opus` | `opus` / tier `max` | Opus 4.8 (`claude-opus-4-8`) | deep reasoning, architecture, adversarial review, large blast-radius |
| `sonnet` | `cheap` / tier `mid` | Sonnet 4.6 (`claude-sonnet-4-6`) | the default working tier — most skills, most of the time |
| `haiku` | `tiny` | Haiku 4.5 (`claude-haiku-4-5`) | fast, mechanical, high-volume, low-judgment passes |

**The home owns the vocabulary; consumers READ it (they do not carry it).** The
canonical tier names live in the consuming repo's
`.claude/defaults/model-config.yaml` — the hounfour/cheval config, synced from
**loa-hounfour**. Read that file at run-time (`aliases:` + `tier_groups:`) so
the vocabulary tracks the home automatically; a carried copy is only ever a
fallback, and using it must be said out loud. An unrecognized tier name is a
SMELL, not a hard failure — the map is fallible, and an unknown rung may be
NEW, not stale. The cure for a stale carried list is never to grow it — it is
to stop carrying it and read the home.

**The reconciliation that settles `cheap` (2026-06-07, operator-ratified):**
two tier-naming schemes coexisted and the word `cheap` resolved to different
rungs. **loa-hounfour is the SoT, and `cheap` ≡ sonnet is canonical.**

| | Home (`model-config.yaml` ← loa-hounfour, SoT) | Emitter (was) | Now |
|---|---|---|---|
| tiers | `max` · `mid` · `cheap` · `tiny` | `deep` · `standard` · `cheap` | conformed to home |
| `cheap` ≡ | **sonnet** | ~~haiku~~ | **sonnet** |

To route the cheapest native model, declare `haiku`/`tiny` explicitly.

Around the tier sit three more knobs:

- **effort** — the runtime's thinking-depth dial (e.g. `xhigh`). Orthogonal to
  tier: a high-effort Sonnet can out-reason a low-effort Opus on a bounded task.
- **fast mode** (`/fast`) — Opus with faster output. **Not a downgrade** — same
  Opus, quicker. Don't read "fast" as "cheaper/weaker."
- **downgrade** — `capabilities.downgrade_allowed`. The escape hatch: may the
  runtime route this construct to a cheaper tier when load/cost warrants? `false`
  pins the tier hard.

**The construct's contract with the ladder** lives in `construct.yaml`:

```yaml
capabilities:
  model_tier: opus            # which rung it asks for
  downgrade_allowed: false    # may the runtime drop it to save cost?
  effort_hint: large          # small | medium | large
```

**Declarations spend real money.** The composition emitter reads each
construct's `model_tier` + `downgrade_allowed` and routes on them:
`downgrade_allowed: false` **pins** the tier; `true` is a **ceiling** the
routing heuristic may go under. A coherent declaration reads like
`opus + downgrade:false + effort:large` for work that genuinely needs the top
of the ladder. A smell reads like `opus + downgrade:false + effort:medium +
danger:safe` — the most expensive rung pinned, no escape hatch, for light safe
work. Not broken, but the operator should *see* it: a light construct pinned
to opus actually routes opus until someone sets `downgrade_allowed: true`.

---

## II. Forks & isolation — splitting into parallel selves

A construct rarely runs alone. The runtime lets an agent **fork**:

| Mechanism | What it is | When a construct wants it |
|-----------|-----------|---------------------------|
| **worktree isolation** (`Agent isolation: "worktree"`) | a fresh git worktree per agent — an isolated copy of the repo | agents that **mutate files in parallel** and would otherwise collide. Expensive (~200-500ms + disk); auto-removed if unchanged. |
| **background** (`run_in_background: true`) | the agent runs detached, notifies on completion | long jobs the caller shouldn't block on (a DIG sweep, a build, a remote queue) |
| **Workflow orchestration** | deterministic fan-out: `pipeline()` / `parallel()` / `agent()`, model + isolation per agent, a token budget | comprehensive/confident work one context can't hold — migrations, audits, multi-perspective review |

The runtime caps concurrency at `min(16, cores-2)` live agents, 1000 agents per
workflow lifetime, 4096 items per fan-out call. `execution_hint: sequential |
parallel` in `construct.yaml` is the construct telling the runtime whether its
skills are safe to run concurrently.

---

## III. Agent types & tool allowlists — the silent gate

This is the one that bites. When you dispatch a subagent you pick its
**type**, and the type carries a **tool allowlist**. If a skill needs to *write*
but routes through a *read-only* type, the runtime honors the type — silently.
The skill produces correct output and then cannot persist it. No error. The
operator sees a clean run and an empty file.

| Agent type | Write / Edit | Use for |
|------------|:---:|---------|
| `general-purpose` | ✓ | skills that author files |
| (unset) | inherits caller | the safe default for write-capable skills |
| `Explore` | ✗ | read-only fan-out search |
| `Plan` | ✗ | read-only planning |
| `claude-code-guide` | ✗ | Claude Code Q&A (Bash/Read/WebFetch/WebSearch) |
| `construct-*` | ✗ (Read/Grep/Glob/Bash) | construct-scoped read analysis |

**The invariant** (this is real, it has a defect number — #553, three independent
reproductions across two repos):

> A skill that declares write capability — `capabilities.write_files: true` OR
> `allowed-tools` listing `Write`/`Edit` — MUST NOT set `agent:` to a type that
> excludes those tools. Allowed: omit `agent:` (inherit the caller) or set
> `agent: general-purpose`.

The harness lints this for its own `.claude/skills`
(`validate-skill-capabilities.sh`, the `WRITE_CAPABLE_AGENTS` array). This is
the canonical capability-reality conflict: provable from the file alone,
breaks silently.

The runtime's core tools: `Bash Read Write Edit Glob Grep Agent Workflow Skill
WebFetch WebSearch NotebookEdit Task* TodoWrite SlashCommand ToolSearch
AskUserQuestion`. More load on demand: **MCP tools** (`mcp__*`) and **deferred
tools** fetched via `ToolSearch`. So an unrecognized tool name in `allowed-tools`
is a SOFT signal (could be MCP/custom), never a hard fail.

---

## IV. The frontmatter contracts — the construct↔runtime interface

Every construct talks to the ground through frontmatter. Two altitudes:

**`construct.yaml` — the pack's contract:**

```yaml
capabilities:
  model_tier: opus            # I. the ladder
  danger_level: moderate      # safe | moderate | dangerous (→ confirmation posture)
  downgrade_allowed: false
  effort_hint: large
  execution_hint: sequential  # II. fork-safety
  requires:
    tool_calling: true
    thinking_traces: true
    vision: false
workflow:
  gates: ...                  # V. the pipeline-ownership exception (rare, high-authority)
```

**`SKILL.md` / `index.yaml` — the skill's contract:**

```yaml
allowed-tools: [Bash, Read, Write, Edit]   # III. the tool allowlist
agent: general-purpose                       # III. MUST be write-capable if writing
user-invocable: true
capabilities:
  schema_version: 1
  write_files: true                          # deny-all default if absent
  web_access: false
cost-profile: moderate                       # lightweight | moderate | heavy | unbounded
role: implementation                         # planning | review | implementation
```

Rules the ground enforces that construct authors keep tripping on:

- **deny-all default.** A skill with no `capabilities` block is denied
  everything — capability is opt-in, not opt-out.
- **consistency.** `write_files: false` + `Write` in `allowed-tools` is a security
  contradiction. `web_access: false` + `WebSearch` likewise. The declaration and
  the toolset must agree.
- **advisor-wins-ties** (for review/audit skills): when `primary_role` ≠ `role`,
  the more-restrictive wins (review beats planning beats implementation), and a
  review→implementation downgrade needs an explicit co-sign comment.

---

## V. How the gates are designed — the harness

Code does not just get written. It walks a ladder, and each rung is a gate.

**The truename ladder** (one PRD → one shipped change):

```
/plan-and-analyze → /architect → /sprint-plan → /implement → /review-sprint → /audit-sprint → /deploy
       PRD              SDD          sprint        code          feedback         approval       infra
```

**The wrappers that enforce the cycle:**

| Surface | What it is | The gate it adds |
|---------|-----------|------------------|
| `/run sprint-plan` / `/run sprint-N` | the autonomous cycle wrapper | implement+review+audit in one loop with a **circuit breaker** |
| `/simstim` | the HITL accelerated cycle (8 phases) | human drives planning (1-6); **Flatline** reviews each artifact; BLOCKER is *surfaced, not auto-halted*; phase 7 hands to `/run` |
| `/bug` | triage bypass | skips PRD/SDD — but **only** for an observed failure (must cite a stack trace / regression) |
| `/fagan` | code-diff review (multi-model) | the standing review substrate for diffs |
| `/flatline-review` | PRD/SDD/sprint review (multi-model) | the standing review substrate for docs |

**Flatline** is the adversarial heart: independent model voices (via the `cheval`
substrate) score findings. `HIGH_CONSENSUS` (both voices high) auto-integrates;
`BLOCKER` (a skeptic's strong concern) halts an autonomous run or surfaces to a
human one; `DISPUTED` (wide score delta) goes to judgment. The deep cut: a
multi-model **agreement % is a coherence score** — high convergence means the
thing is well-compressed and model-agnostic; divergence points exactly at the
ambiguity.

**The precedence that orders every rule:** `NEVER > MUST > ALWAYS > SHOULD > MAY`.

**The pipeline-ownership exception** — `workflow.gates` in `construct.yaml`.
Normally code is *never* written outside `/implement` (it would bypass review +
audit). But a construct that declares `workflow.gates` **owns its own pipeline**
— it carries the review/audit composition itself, so its skills may write code
directly. That is a high-authority claim, and a construct making it is exactly
the kind of claim an operator's eye should land on. Six packs in the reference
estate make it (`hivemind-os, protocol, the-arcade, the-easel, vocabulary-bank,
webgl-particles`).

**The three zones** the ground is divided into (a construct must know which it
touches): **System** (`.claude/` — never edit, framework-managed), **State**
(`grimoires/ .beads/ .ck/ .run/` — read/write), **App** (`src/ lib/ app/` —
confirm writes). A construct authored canonically lives in its **own repo**
(`construct-<slug>`) and is *installed* into a consumer's System zone — so a
construct edits itself in its source cell, never in the installed copy.

---

## Seam Ledger — where each axis's LIVE truth lives

This doc is a map. Each axis below names its territory — the file or surface
that holds the CURRENT values. When map and territory disagree, the territory
wins and this doc has drifted (staleness is sensor territory: gecko's
`sensing-runtime-fit` reads these SoTs live against this taxonomy).

| Axis | Live SoT | Read how |
|---|---|---|
| §I tier vocabulary + aliases | consuming repo's `.claude/defaults/model-config.yaml` (`aliases:` + `tier_groups:`), synced from **loa-hounfour** | read live at run-time; never carry |
| §I emitter routing (`model_tier`/`downgrade_allowed` honored) | `construct-rooms-substrate/scripts/lib/segment-emitter.py` (`_resolve_model`) | code is the contract |
| §II concurrency caps + fork mechanics | the Claude Code runtime (harness release notes / observed behavior) | illustrative here; verify against the live harness |
| §III agent-type tool allowlists | Claude Code agent-type definitions; consumer-side lint `validate-skill-capabilities.sh` (`WRITE_CAPABLE_AGENTS`) | the lint is the enforceable subset |
| §IV construct.yaml schema | `loa-constructs` `construct.schema.json` (schema_version 3) | validate against the schema, not this prose |
| §IV skill frontmatter invariants | Loa framework `.claude/rules/skill-invariants.md` + `validate-skill-capabilities.sh` | the rule doc + lint travel with the framework |
| §V gate pipeline + precedence | Loa framework `CLAUDE.loa.md` (Process Compliance + Golden Path) | framework-versioned |
| §V gate-owner packs (the six named) | each pack's `construct.yaml` `workflow.gates` | enumerations rot — probe, don't trust the list |
