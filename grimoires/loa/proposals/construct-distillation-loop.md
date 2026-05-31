---
status: candidate
authored: 2026-05-30
author: zkSoju + Claude (GECKO scan)
provenance: distilled from the 2026-05-30 operator session (the same session that built the operator-calibration loop + manually ran this loop once on smol-comms-register)
constructs: gecko (lead) · observer · the-arcade
---

# Construct Distillation Loop — learnings from trajectories flow back into constructs

> Operator-named friction (verbatim): *"constructs feel very restrictive in terms of being able to distill key learnings from trajectories (REAL conversations and workflows) back into constructs on an active basis."*

## The problem (grounded probe, 2026-05-30)

Constructs are **write-once, invoke-many, update-rarely.** Measured:

| construct | operator-mentions | skills | lifetime commits | last real update |
|---|---|---|---|---|
| observer | ~3,145 | 59 | ~26 | 2026-05-20 |
| protocol | 788 | 10 | 21 | 2026-05-02 (mass-sync) |
| artisan (ALEXANDER) | 195 | 15 | 7 | 2026-04-22 · 0 in 30d |
| the-arcade | ~257 | 6 | 11 | 2026-05-02 (mass-sync) |

The supply curve flatlines at birth: an authoring burst + a single mass-sync commit (the `2026-05-02` cluster = ~15 repos committed the same day), then silence — while embodiment continues for months. Demand is *undercounted* (only 641 formal Skill-tool invocations across 466 sessions) because constructs are invoked by **embodiment** (read persona, act as it), not tool calls.

**Plus structural rot:** 5 of 47 construct repos are **archived/read-only** (`the-weaver`, `beehive`, `hivemind-os`, `the-loom`, `gauntlet`) — and all 5 are still actively invoked (67–94 operator-mentions each). A construct's own skill can instruct "edit both → canonical" while the canonical is a frozen repo. (Proven this session: a smol-comms-register trim could not PR — `construct-the-weaver` is archived.)

## The precise gap (machinery map)

The learning pipeline already exists — but **constructs are in neither end of it:**

- **`continuous-learning`** (the engine behind "Invisible Retrospective Learning v1.19.0") detects learnings during `/implement`/`/review`/`/audit`/`/ride` and writes them to the **consuming project's** `grimoires/loa/skills-pending|skills|skills-archived` (`continuous-learning/SKILL.md:106-109`). If `the-weaver` produces an insight while running in `loa-constructs`, the learning lands in `loa-constructs/grimoires/loa/` — with **no path back to `construct-the-weaver`.**
- **`/propose-learning`** routes only to the framework: `proposal-generator.sh:52` hardcodes `TARGET_REPO="0xHoneyJar/loa"` (config default at `:94` also `0xHoneyJar/loa`). **No construct-vendor target exists.**
- What ships **into** a construct repo is the framework seed corpus, read-only (`construct-observer/.claude/loa/learnings/*.json`, `tier: framework`, `managed: true`). Constructs receive framework learnings; they cannot absorb their own invocation learnings.

> Capture is project-bound at one end, framework-bound at the other. Construct repos fall through by design.

## The design — `construct-clew` (Closed-Loop Evolution Watcher)

One learning substrate, two consumers. Reuses existing rails; net-new is minimal.

**Capture surface** — one append-only NDJSON ledger per construct at the global-store pack root: `~/.loa/constructs/packs/<slug>/LEARNINGS.jsonl`. One line = one event. Schema = `construct-observer/.claude/schemas/learnings.schema.json` + `tier: construct` + a `target: {skill_slug, line_hint}` object. Write = `flock`'d append (advisory, no hash-chain). `.gitignore`'d in projects; **carved out of the sync overwrite path** so re-seed never clobbers un-distilled lines.

Worked-example seed line (this session's smol casing correction — the loop's first real datum):
```json
{"id":"lrn-20260530-smol-casing","tier":"construct","type":"correction",
 "trigger":"operator: agents should use normal casing, not lowercase — lowercase is MY manual voice",
 "solution":"smol-comms-register: AGENT writes normal sentence casing; lowercase is operator-only",
 "target":{"skill_slug":"smol-comms-register","line_hint":"casing rule (rule 3)"},
 "tags":["the-weaver","smol-comms-register"],"verified":false,"distilled_at":null}
```

**Trigger** (capture cheap, distill slow):
1. PRIMARY — extend the operator's reaction-classifier (`direction-miss`/`restraint`, run 154× this session) to append a ledger line when a construct is in scope. Zero hot-path action.
2. FALLBACK — inline `>>clew: <why>` marker → preserves the verbatim quote (the classifier emits a class, not the words).
3. DISTILL — Chronos only: slow cron (scheduled-cycle-template) OR N=5 un-distilled lines OR folded into the TEND cycle. Never per-turn.

**Distill** — a thin `distilling-construct-learnings` skill generalizing `/distill`'s recommendation-mapping block (`distill/SKILL.md:156-189`): read un-distilled lines → cluster by `target.skill_slug` → run the **existing 4-gate filter** (`continuous-learning/SKILL.md:137-179`) → emit `grimoires/loa/skills-pending/<construct>-<skill>/PROPOSAL.diff` + `RATIONALE.md` (cites each source line by id). Output is a **diff, never an applied edit.**

**Ratification** — one named gesture: `/skill-audit --approve <construct>-<skill>` (reuses the pending→active→archived lifecycle). Approve → PR; reject → archived, re-surfaces silently. Agent never self-promotes `verified:true`. Ignored proposals stay un-stamped + re-surface — degrades to silence, not nag (anti-bureaucracy).

**Cross-repo propagation** — resolve canonical from `construct.yaml::repository.url` → draft PR via construct-aware `proposal-generator.sh` (`TARGET_REPO="${construct_repo:-0xHoneyJar/loa}"`). The canonical repo is the **only** write target; after merge, the existing seed→populate→symlink chain re-syncs downstream. **"Edit both" becomes "edit canonical, sync propagates."** This is the structural fix for the divergence the worked example exposed (operator edited the local mirror; canonical lived elsewhere — and had drifted 131 vs 181 lines).

## Composition — one substrate, two consumers

```
        trajectory + reaction-classifier (154× live RLHF signal)
                              │
              ┌───────────────┴───────────────┐
   construct in scope?                  no construct in scope
              │                                │
   append LEARNINGS.jsonl              operator-calibration loop
   (tier: construct)                   (mine → operator signs → SessionStart surfaces)
   4-gate → PROPOSAL.diff              → consumer A: OPERATOR MEMORY  [BUILT 2026-05-30]
   /skill-audit --approve
   PR → canonical repo → re-sync
   → consumer B: CONSTRUCTS (live next embodiment)
```

Net-new is small: the `tier: construct` enum value, the `target` object, the `LEARNINGS.jsonl` convention, the `construct.yaml` repo resolver, the `distilling-construct-learnings` skill. No new daemon, schema, or review gate.

## Archived canonicals — uninstall, do not route (operator doctrine 2026-05-30)

The resolver (`construct.yaml::repository.url`) resolves to **archived/read-only repos for 5/47 constructs** (`the-weaver`, `beehive`, `hivemind-os`, `the-loom`, `gauntlet`). My first instinct was "route to a successor / un-archive / monorepo." **The operator corrected this:**

> *"If they are archived they should NOT be written to. I have not found use for them or my mental model evolved into another repo/construct. Constructs should be free territory to extract/combine/etc — an open playground. Treat archived as: we should no longer have them installed. It is noise."*

So the loop's `isArchived` guard is simple: **archived canonical → SKIP (never PR) + flag the construct for UNINSTALL from the active set.** No successor-hunting, no un-archiving by the loop. A learning that targets an archived construct is a signal the *operator-private mirror* (or a live successor the operator already moved to) is now canonical — capture it to the operator's own skill/vault, not the dead repo. (This is exactly what happened to smol: the live copy is `~/.claude/skills/smol-comms-register` + the signed vault doctrine; `the-weaver` is just noise.)

### Construct philosophy (the frame this loop must honor)
Constructs are **free territory** — extract, combine, evolve, fork, archive freely. An open playground, not a rigid per-repo registry. The distillation loop must stay **lightweight and non-restrictive** (capture → distill → propose → recombine), never become per-repo PR bureaucracy. Archiving is a construct's natural death; dead constructs get *uninstalled*, not maintained. This is a candidate doctrine worth signing (`feedback_constructs-are-free-territory`).

### Adjacent immediate hygiene (TEND)
The 5 archived constructs are still present in the active set / install surfaces = noise. Recommended cleanup: uninstall them from `~/.loa/constructs/packs`, project mirrors, and any registry, preserving any still-used skills as operator-private (e.g. smol already lives in `~/.claude/skills`). Scope + mechanism to be confirmed before mutating the install set.

## The doubt (load-bearing)

Embodiment-detection is the single heuristic the PRIMARY trigger rests on, and the codebase has **no reliable signal** for "which construct am I currently being." Misses → silent loss (the exact failure we're fixing) or wrong-ledger contamination. **Recommendation: start `>>clew`-only** (explicit-marker capture — high-fidelity, correctly-routed) and treat the reaction-classifier auto-trigger as Phase 2, once we've measured the real embodiment-detection rate.

## Pilot

`smol-comms-register` in `the-weaver` — it's the worked example (a real seed line + a known-correct target diff to validate against), small, constantly embodied, and its archived canonical forces the archived-repo path early. Success: given the seed line, the distill step emits a `PROPOSAL.diff` matching the casing+trim edit already made by hand.

## Build path — DECIDED 2026-05-30: `/plan` the full loop (Loa gates)

The operator chose the full Loa pipeline (PRD → SDD → sprint-plan → implement → review → audit) over a latitude-built MVP. Planning notes for the pipeline:

- **Phase the build per the doubt**: ship `>>clew`-only capture first (high-fidelity, no embodiment-detection gamble); the reaction-classifier auto-trigger is a Phase-2 sprint gated on a measured embodiment-detection rate.
- **Cross-repo architecture is the key SDD question.** Components split across zones: (a) `LEARNINGS.jsonl` convention + `distilling-construct-learnings` skill = construct-ecosystem (`loa-constructs`); (b) construct-aware `proposal-generator.sh` + `isArchived` guard = Loa **framework** (upstream `0xHoneyJar/loa` via `/propose-learning` — ironically the loop bootstrapping itself); (c) `>>clew` `UserPromptSubmit` hook = framework hooks/settings; (d) reaction-classifier extension = where the classifier lives. The SDD must decide what lands where + the propagation order.
- **Honor the free-territory frame**: lightweight, non-restrictive; capture/extract/recombine, not per-repo bureaucracy.
- **Archived = uninstall** (above) — the `isArchived` guard is skip+flag, never route.
