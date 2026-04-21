# Cycle-001 Review Lens — BRIDGEBUILDER Augmentation

> Load this alongside `.claude/data/bridgebuilder-persona.md` during REVIEW, AUDIT, and post-PR BRIDGEBUILDER iterations on `feat/spiral-loa-constructs-infrastructure-cycle-001`.
>
> Four lenses layer on top of base BRIDGEBUILDER voice. Voice stays; vigilance expands.
>
> Cycle SEED: `grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md` (§1–§14)

---

## How to Use

For every review iteration:

1. Run your base BRIDGEBUILDER pass (findings + insights per `.claude/data/bridgebuilder-persona.md`).
2. Then apply each of the four lenses below as a separate pass. Each lens surfaces a distinct *class* of risk that base review misses.
3. Findings from the lenses get the same `severity/category/file/description/suggestion` schema. Tag them `"lens": "gecko" | "keeper" | "otlet" | "kiss"` so triage can route.
4. REFRAME is permitted from any lens when the framing itself is off.

The lenses are additive, not a replacement. Base review = "is this code good?". Lenses = "will this hold up at bazaar-scale, against known friction, under supersession discipline, and under the KISS constraint?"

---

## Lens 1 — GECKO (Ecosystem Vigilance)

> *"you look like nothing. a gecko on a warm wall. eyes that track everything. you survive where nothing else can because you require almost nothing and notice almost everything."* — grimoires/personas/GECKO.md

**The question this lens asks**: when this merges, what happens to the bazaar?

### What to check, by leg

**Leg A (`POST /v1/admin/discover`):**
- Accepts an optional `owner` parameter so external orgs can be scanned (§14.6.d). A hardcoded `0xHoneyJar`-only scan is a regression against the two-community reality.
- Tolerates `construct.json` (Hypha schema_v1) alongside `construct.yaml`. Reject anything that orphans El Capitan's live construct.
- Merges `registry-sources.yaml` entries with org-discovered repos; doesn't silently drop the `hypha` external namespace entry.
- `trust_level` column populated when declared (Hypha → L2), null otherwise. No validation logic, no silent default — evidence-emergence only.

**Leg B (webhook handler + Tier-A flip ritual):**
- Every one of the 5 Tier-A flips (artisan, k-hole, observer, the-arcade, protocol) has evidence of a trufflehog sweep BEFORE the flip command. One-flip-missed = secret leak. Reviewer verifies per-repo sweep logs/commits exist.
- `guardVisibilityTransition` logs blocked demotions to `visibility_transitions` with `source: 'guard_block'`. Silent blocks are worse than loud ones.
- Runbook (`.github/install-constructs-app.md`) has the `/feedback` onboarding subsection (§14.2). One paragraph, no new channel invented.
- Webhook accepts events from any org that registers our URL, not just 0xHoneyJar (§14.6.d). External builders handle their own flips; we observe.

**Leg C (construct-dx-universal-fix):**
- `construct.yaml` is primary, `construct.json` is tolerated legacy — exactly two shapes, no third. Any new schema variant = reject (§14.9 KISS).
- `.source.json` three-way-merge implements Pant's {base=source_commit, local=working_tree, remote=upstream} correctly. Zero-diff → no-op; fast-forward → apply; conflict → prompt, never overwrite (AC-C4).
- AC-C4 bats test exists and round-trips install → edit → upgrade.

**Leg F (compositions):**
- Only SYMMETRIC pairs included. GECKO §2 identified 26 asymmetric `compose_with` declarations. Reviewer verifies `compositions/*.yaml` references only artisan↔observer, crucible↔observer, and whatever third symmetric pair the implementer actually finds in the data — NOT synthetic pairs.
- No new asymmetric `compose_with` introduced anywhere in SKILL.md edits (Leg E) or elsewhere.

**Cross-leg ecosystem checks:**
- No new slash command registered that collides with `/dig`, `/forge`, `/map` (PT-2, Hypha already declares `[map, dig, flows, build, bounds]`).
- No code path assumes constructs live only under `0xHoneyJar`. External namespaces are first-class.
- `archivist` event-consumption remains quiet (GECKO §7) — nothing this cycle wires new emissions without a consumer, don't add to the dead-letter pile.

### GECKO-lens SPECULATION invite

GECKO notices what isn't said yet. If you see a pattern that suggests a future bazaar-health risk (e.g., "if three more constructs declare `trust_level: L3` without a ladder, we'll have an ungoverned trust gradient"), raise it as SPECULATION — not a blocker for this cycle, but captured for cycle-002 input.

---

## Lens 2 — KEEPER (Friction-Map Coverage)

> *"the gap in the agentic age isn't knowledge — it's navigation."* — KEEPER friction profile

**The question this lens asks**: did this leg actually *close* its mapped friction, or just ship code adjacent to it?

KEEPER identified six concrete friction events (F1–F6). Four are covered this cycle; two are deferred. Reviewer verifies coverage is *real*, not nominal.

| Friction | Leg | Verification the review demands |
|----------|-----|--------------------------------|
| F1 `/dig` broken on installed packs (#171) | Leg C | After Leg C lands, `/dig` works on an installed pack end-to-end. `.run/construct-trajectory.jsonl` contains a paired entry/exit row demonstrating this. If the trajectory is empty for `/dig`, F1 is NOT closed — the code shipped, the friction didn't. |
| F2 Seed destroys visibility state | Leg A AC-A5 | A seed re-run with differing `construct.yaml` visibility does NOT overwrite operator-set DB visibility. Reviewer checks `services/discovery.ts` has explicit preservation logic + a unit test proving it. Absence of test = unverified claim. |
| F3 Schema v1→v3 migration tooling (#117) | DEFERRED (PT-8) | Reviewer verifies no inline migration-tool attempt exists. If someone snuck in a partial schema migrator, reject — PT-8 is doctrine work, not this cycle. |
| F4 Spawned agents don't inherit context (#184) | Leg D partial | Trajectory emits rows for spawned agents, even if context-passing isn't fully fixed. A spawn event without a paired trajectory row = Leg D incomplete. |
| F5 Three install commands (#181) | DEFERRED (PT-4) | No new install command added this cycle. If Leg C added a fourth install surface, reject. |
| F6 Product-repo grimoires invisible | Leg D + E | Emission surfaces exist (`construct-trajectory.jsonl`, `feedback-v3.jsonl`). Doesn't resolve F6 this cycle but opens the path. |

### KANSEI gate pre-validation (Q3 specifically)

KANSEI Q3 requires "at least one FEEL session's paired entry/exit rows in `.run/construct-trajectory.jsonl`." If S8 fires before such a row exists, the gate cannot answer Q3. Reviewer blocks the S8→S9 transition if trajectory is empty.

### KEEPER signal: zero instrumentation for own friction

`.run/audit.jsonl` was 0 bytes pre-cycle. Leg D trajectory is the first-class instrumentation surface. Reviewer verifies that by the end of the cycle, `.run/audit.jsonl` AND `.run/construct-trajectory.jsonl` are both producing rows during dogfooding. If either is still empty at S8, Leg D didn't actually land — the skeleton exists, the observation doesn't.

---

## Lens 3 — OTLET (Supersession Discipline)

> *"chain rather than overwrite. supersede with reasoning. the chains stay walkable; the content stays preserved; retrieval prefers the newest first."* — OTLET Principle 3

**The question this lens asks**: does every change preserve the chain back to what it supersedes, or does it silently mutate?

### Migration discipline

- Every ALTER is additive: `ADD COLUMN` with nullable; no `DROP COLUMN`, no `ALTER COLUMN … NOT NULL` on existing data.
- `discovery_runs` migration: append-only audit semantics. No `UPDATE` paths on audit rows.
- `visibility_transitions` migration: append-only. Every transition (including `source: 'guard_block'`) is a new row, never a mutation.
- `trust_level` column: nullable varchar. Null is valid and means "not declared yet," not "invalid." No default 'L0' or similar — that would be inventing a ladder (§14.5 explicitly defers the ladder).

### Service-layer discipline

- `services/discovery.ts` AC-A5: reads current DB state, diffs, preserves operator-set visibility. The code path must be **read-then-compare-then-write**, never blind upsert with `EXCLUDED.*`. Reviewer checks the SQL and confirms no `EXCLUDED.visibility` anywhere in the new code.
- `scripts/seed-forge-packs.ts` is DEPRECATED this cycle, not deleted. Reviewer verifies a deprecation notice/comment exists but the file is still present (deletion is cycle-002).

### Persona / doctrine discipline

- The three SKILL.md edits (Leg E: ALEXANDER, KEEPER, STAMETS) extend emission discipline; they do not rewrite the personas. Reviewer checks the diff adds a `feedback-v3` emission block and doesn't touch existing voice/stance sections.
- If the PR modifies `grimoires/bridgebuilder/ARCHETYPE.md` or `grimoires/personas/*.md` outside the three Leg E targets, reject — that's doctrine mutation, not infrastructure.

### Supersession chain

- The SEED supersedes three prior design docs per §11. The PR description must link back to the SEED + §14 amendments. A PR that lands cycle-001 work without citing the SEED breaks the chain.
- Every new migration file has a header comment citing: SEED path + relevant §14 amendment (AC-A5 for discovery_runs, §14.5 for trust_level, etc.).

### OTLET REFRAME invite

If the PR is *actually* overwriting prior work in a way that should be superseded with reasoning instead, raise REFRAME: "This looks like supersession dressed as replacement — should we preserve the chain?"

---

## Lens 4 — KISS Red-Team (§14.9 NOT-list)

> *"LEGOs: pieces with studs that fit standard holes. Don't customize the stud-pattern."* — SEED §14.9

**The question this lens asks**: does anything in this PR sneak in a NOT-list item?

SEED §14.9 enumerates what this cycle explicitly does NOT do. Reviewer red-teams the PR for each item:

| NOT-list item | What to look for |
|---------------|------------------|
| No new manifest formats | Any new schema/yaml shape beyond `construct.yaml` (primary) + `construct.json` (legacy). Reject a third. |
| No Loa framework forks | Any new `loa` variant, alt-Loa convention, or fork-encouraging pattern. Reject. |
| No pre-publish ceremony | Any new required step between "write construct.yaml" and "it's on the network." Reject. |
| No viz layer this cycle | Any Svelte/D3/sigma.js/vis-network code targeting construct composition rendering. That's PT-11; reject. |
| No new slash-command collisions | Any new `/<verb>` that shares a name with `/dig`, `/forge`, `/map`, or any external-builder-declared command (check Hypha's declared set). Reject. |
| No new feedback channels | Any new channel parallel to `/feedback` v3.0.0. The existing channel is canonical. Reject new surfaces. |
| No expansion beyond 3 personas in Leg E | `feedback-v3` emission edits in any SKILL.md OTHER than artisan/ALEXANDER, observer/KEEPER, k-hole/STAMETS. Reject expansion — gates on KANSEI Q4. |
| Zero network calls from Leg G | Any actual Polar SDK call, HTTP request, or live endpoint hit in `loa-freeside/packages/adapters/billing/polar/`. Bats test must enforce zero-network; verify it exists and passes. Reject live integration. |
| No Axis 2/3/4/5/8 schema design | Any schema work on territory/civic-layer/invocation-tiers/orchestration/micro-macro-loop. Defer until D+E data lands. |
| No orchestration router | Any new dispatching/routing service above `construct-invoke.sh`. Leg D is the wrapper; not an orchestrator. |
| No AITOBIAS04 onboarding | Any PR-level integration work for AITOBIAS04 constructs (breath, corona, tremor, forge, Echelon). PT-10, operator-gated. |
| `seed-forge-packs.ts` deletion | Deprecated yes, deleted no. Cycle-002 does the delete. Reject any PR that removes the file. |

### KISS REFRAME invite

The strongest KISS test: can you explain this PR's change to someone in the bazaar in one sentence? ("We added one endpoint that preserves operator-set visibility during discovery.") If the one-sentence explanation requires hedges or multiple clauses, the change is probably overreaching KISS. Raise REFRAME.

### The grandmother test

§14.9 invokes the grandmother lens — would a non-technical observer recognize the metaphor? If a change can only be explained in framework-speak (e.g., "this registers a new axis-3 civic declaration under the L2 trust gradient"), it's failing KISS and should be deferred.

---

## Coordination Notes

### Multi-model Bridgebuilder interaction

The config enables three reviewers (Opus primary, GPT-5.3-codex, Gemini 2.5 Pro). Each should apply all four lenses. Consensus scoring (threshold 700) already handles disagreement — but lens-tagged findings inform that consensus: a GECKO finding flagged by all three models is high-consensus ecosystem risk; a KISS finding flagged by one is worth a disputed-delta look.

### What this lens doc does NOT do

- Replace the base BRIDGEBUILDER persona (voice, output format, token budget). Those remain.
- Apply during PRD, SDD, Sprint gates (those are Flatline Protocol, not BRIDGEBUILDER).
- Authorize scope expansion. If a lens surfaces work worth doing, it's a pull-thread or cycle-002 candidate, not a this-cycle add.

### Lens decay

This lens is cycle-001-scoped. If cycle-002 inherits similar legs, write a cycle-002-specific lens rather than reusing this one — the KISS NOT-list changes per cycle, the friction map evolves, the ecosystem drifts. Frozen lenses go stale.

---

*Layered on 2026-04-21 before cycle-001 harness dispatch. Four lenses, additive. BRIDGEBUILDER still builds the bridge; the lenses just mean more of what matters survives the crossing.*
