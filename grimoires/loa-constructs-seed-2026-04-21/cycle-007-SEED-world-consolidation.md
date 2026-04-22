# SEED — Cycle-007 · World Consolidation + Design-System Inheritance + Cleanup

> *"These should be neatly in sprawl world and serve as a prime example of how to build worlds."* — operator 2026-04-23 late
>
> *"Keep it ultra or super simple, down to what it needs, cleaning up any artifacts... for absolute clarity and to prevent any downstream agents from picking up the wrong context."* — operator 2026-04-23 late
>
> **Status**: Draft skeleton · Ready for operator review + paired dispatch
> **Date drafted**: 2026-04-23 late
> **Supersedes**: cycle-006 §"Banned from cycle-006" items promoted to cycle-007 scope (app separation, Claude Code cleanup, inheritance mechanism)
> **Doctrine**: v5 active · [[worlds-vs-lenses]] §"Design-system inheritance pattern" (2026-04-23 amendment) is load-bearing for this cycle
> **Dispatch mode**: conversational-paired + shell-first (some legs spiral-autonomous eligible — L-verify, L-remove-stale, L-cleanup)
> **Branch**: `feat/spiral-loa-constructs-cycle-007-world-consolidation`

---

**Also**: cycle-006 L-meta-pack close discovered that the registry is **manually-driven today** — new packs don't land automatically on push. The gap affects any operator publishing a construct. Folded in as L-registry-automation.

## 0 · Why this cycle exists

Three convergent pressures surfaced during cycle-006 dispatch:

1. **Operator pain** — *"We have a ton of divergence"* in Sprawl button-alignment / component work. Taste-tokens are per-app; no world-level design system; structural alignment burns tokens on what should be default. Cycle-006 started the core-DS authorship (stage 5-6 of website-scaffold composition); cycle-007 implements the runtime inheritance mechanism so apps actually *consume* the core DS.

2. **Architectural drift** — loa-constructs repo has accumulated product apps (`apps/explorer` with wagmi + Coinbase CDP SDK) that belong on the app side, not in the network-protocol repo. Payment-SDK dependencies are the smoking gun. sprawl-world has canonical `apps/constructs-network` and `apps/dashboard`; loa-constructs has legacy versions. Responsibility boundary is unclear by inspection.

3. **World-template opportunity** — Purupuru already structures its design well. Sprawl is the pilot. Two worlds authored cleanly prove the [[worlds-vs-lenses]] inheritance pattern as template-able. *Cross-world pollination* becomes a compounding learning loop.

Cycle-007's load-bearing outcome: **sprawl-world becomes the reference implementation of worlds-vs-lenses** — the prime example a new operator points at when learning to build a world. loa-constructs simplifies to its actual responsibility: distribution + API + license-verify hooks. Three-layer payment boundary (apps / API / ledger) is explicit on disk, not just in doctrine.

---

## 1 · Scope lock

Cycle-007 touches:

- `0xHoneyJar/loa-constructs` — prune `apps/explorer` (legacy); remove payment-SDK footprint; cleanup pass; update README to reflect narrower responsibility
- `0xHoneyJar/sprawl-world` — receive canonical responsibility for all Sprawl apps; author exemplar README; runtime design-system inheritance mechanism implementation
- `0xHoneyJar/sprawl-protocol-world` — **delete the repo** (confirmed-stale scaffold, 4-week-old, never built)
- `grimoires/compositions/` — may gain an "inheritance-propagation" composition for world-core DS updates flowing to apps
- `grimoires/loa-constructs-seed-2026-04-21/` — findings doc

**Does NOT touch**:
- `0xHoneyJar/loa` (Jani territory — no changes needed this cycle)
- `0xHoneyJar/loa-freeside` (ledger layer; stays where it is)
- Purupuru world (already structured well; cycle-007 *studies* its patterns, doesn't modify)
- Explicitly NOT: DSL on top of composition, multi-construct-per-stage, TeamCreate executor, `constructs try`, QMD integration, hivemind-as-construct pack (all cycle-006 deferrals stay deferred)
- Stack/framework swap considerations (cycle-008+ per [[agent-teams-as-pipes]] self-pushback rule)

**Scope-lock rule carried from cycle-006**:

> *"Build primitives in service of one concrete outcome. Do not design a framework for consolidation — do the consolidation. Do not design a DSL for inheritance — implement the mechanism for ONE world."*

Cycle-007 consolidates Sprawl. Purupuru might follow in cycle-008 if pattern validates. That's a choice, not a template.

---

## 2 · Legs

| Leg | Purpose | Est. effort | Priority |
|---|---|---|---|
| **L-verify** · audit sprawl-world canonical status | Confirm `apps/constructs-network` + `apps/dashboard` are the canonical versions; identify any version drift between them and loa-constructs' legacy | small (research) | CERTAIN |
| **L-lift-explorer** · retire loa-constructs/apps/explorer | Legacy explorer carries payment-SDK deps (wagmi, @base-org/account, @coinbase/cdp-sdk). Remove from loa-constructs; ensure sprawl-world version supersedes cleanly | medium | CERTAIN |
| **L-delineate-responsibility** · three-layer payment boundary | Document explicitly: apps = UI + checkout; network-API = license-verify hooks only; freeside = ledger. Update loa-constructs README / CLAUDE.md to reflect narrower responsibility | small (docs) | CERTAIN |
| **L-remove-stale** · delete sprawl-protocol-world repo + any other stale loa-constructs artifacts | `sprawl-protocol-world` confirmed dead. Audit loa-constructs for other 4-week+ untouched scaffolds. Delete cleanly (not admin-merge — actual `gh repo delete` with operator confirmation) | small | CERTAIN |
| **L-cleanup-loa-constructs** · TEND pass on artifacts cluttering agent context | Audit what a fresh agent reading loa-constructs picks up wrong. Remove stale registry entries, orphaned skills, dangling commands. Target: "ultra simple, down to what it needs" | medium | CERTAIN |
| **L-registry-automation** · close the manual-publish gap | New packs pushed to `0xHoneyJar/*` do NOT auto-land in the registry today. Three gaps: (1) no github webhook on push, (2) no namespace-scan cron, (3) `createPack()` defaults `status=draft` so even ingested packs are invisible to `/v1/constructs`. Discovered cycle-006 L-meta-pack close when `constructs install construct-creator` returned HTTP 500 post-push. Wire an ingest pipeline + flip auto-publish | medium-large | CERTAIN |
| **L-exemplar-readme** · sprawl-world as reference implementation | Author the README / docs that make sprawl-world the prime example of [[worlds-vs-lenses]] three-tier hierarchy. Other operators / future worlds read this to learn the pattern | small (docs) | CERTAIN |
| **L-inheritance-mechanism** · runtime implementation of design-system inheritance | The **biggest leg**. Implement the cycle-006 doctrine amendment: world-level core DS + apps inherit by default + apps may fork + DNA survives forks. Concrete: how does sprawl-world's apps/constructs-network pull tokens from sprawl-world/design-system/core? What's the update propagation? What's the fork mechanism? | **large** | CERTAIN |
| **L-cross-pollinate-purupuru** · extract Purupuru's existing patterns for Sprawl template | Purupuru is already structured well. Document what Purupuru does that Sprawl should inherit as the world-template invariants. Two-world cross-check validates the inheritance pattern | medium | LIKELY |
| **L-close** · findings + cycle-008 handoff | F-numbers continue from cycle-006's last F. KANSEI gate. Inheritance queue for cycle-008 | small | CERTAIN |

**Shell-first discipline** held through all legs per doctrine §13.1. L-inheritance-mechanism may need more structure than pure shell — JSON/YAML schemas for the inheritance contract, possibly a small build script. Still Unix-shaped.

---

## 3 · Acceptance criteria

### L-verify · audit sprawl-world canonical status

- **AC-V.1** · Inventory doc: `sprawl-world/docs/apps-inventory.md` enumerates all apps, their package names, active-or-stale status
- **AC-V.2** · Explicit statement: `sprawl-world/apps/constructs-network` is canonical (superseding `loa-constructs/apps/explorer`)
- **AC-V.3** · Any version drift between the two versions is documented — which one has features the other doesn't; migration plan if needed
- **AC-V.4** · `sprawl-world/apps/dashboard` verified as the Sprawl dashboard (not freeside dashboard); confirm package scoping

### L-lift-explorer · retire loa-constructs/apps/explorer

- **AC-LE.1** · `loa-constructs/apps/explorer/` removed (or moved to `archive/`) after verification sprawl-world carries equivalent functionality
- **AC-LE.2** · All wagmi / @base-org / @coinbase/cdp-sdk dependencies removed from loa-constructs root if no longer needed
- **AC-LE.3** · Any downstream references (docs, README, CI) updated to point at sprawl-world version
- **AC-LE.4** · `constructs.network` deployment target (Vercel) confirmed pointing at the correct source — no deploy breakage
- **AC-LE.5** · `apps/api` + `apps/docs` audit — these stay in loa-constructs (they ARE the network), but confirm no payment-related bleed

### L-delineate-responsibility · three-layer payment boundary

- **AC-DR.1** · `loa-constructs/README.md` updated with explicit responsibility statement: *"This repo owns construct distribution + network API + license-verification hooks. Payments, UI, checkout, and wallet integrations live on the app side (see sprawl-world / other world repos). Ledger state lives in loa-freeside."*
- **AC-DR.2** · Three-layer boundary documented in `docs/architecture/payment-responsibility.md` with the exact split (apps / API / ledger)
- **AC-DR.3** · `sprawl-world/README.md` mirrors the boundary from the app-side perspective
- **AC-DR.4** · No new payment-handling code enters loa-constructs during or after this cycle; lint or CI check if feasible

### L-remove-stale · delete sprawl-protocol-world + other dead scaffolds

- **AC-RS.1** · `sprawl-protocol-world` repo deleted via `gh repo delete` with operator explicit confirmation prompt
- **AC-RS.2** · Audit produces a list of other repos in `0xHoneyJar` org with 4-week+ no-commit + scaffold-only state. Operator reviews; any genuinely-dead repos marked for deletion in a follow-up cycle
- **AC-RS.3** · No accidental deletion of active repos — every deletion gated on operator confirmation

### L-cleanup-loa-constructs · TEND pass

- **AC-CL.1** · Agent-context audit: a fresh Claude Code session mounting loa-constructs reads CLAUDE.md + construct index + grimoires and produces a faithful summary of what this repo owns. Drift (wrong register, stale claims, conflicting docs) surfaced and fixed
- **AC-CL.2** · Orphaned skill/command entries in registry removed
- **AC-CL.3** · Dead branches audit (not just this cycle's work); stale PRs reviewed
- **AC-CL.4** · `apps/` reduces to `api` + `docs` only (explorer lifted per L-lift-explorer; sandbox evaluated for whether it still serves a purpose)
- **AC-CL.5** · BUTTERFREEZONE.md regenerated to match narrower responsibility

### L-registry-automation · close the manual-publish gap

Discovered during cycle-006 L-meta-pack close: pushed `0xHoneyJar/construct-creator` → attempted `constructs install construct-creator` → registry returns HTTP 500. Root cause documented in `apps/api/src/db/seed-publish-packs.ts` header comment: *"createPack() defaults status to 'draft', and there's no automatic publish mechanism. Packs must be manually published via admin API or this script."*

Three structural gaps:

1. **No ingest trigger** — github push to `0xHoneyJar/*` doesn't notify the registry. Registry remains unaware a new repo exists.
2. **No namespace-scan cron** — `pnpm seed:auto` is something an operator runs manually; no schedule fires it.
3. **Draft-default gate** — `createPack()` sets `status='draft'` even after ingest; packs stay invisible to `/v1/constructs` until explicitly published.

- **AC-RA.1** · Ingest trigger exists: either github webhook → registry endpoint, or scheduled cron running namespace scan on `0xHoneyJar` (operator picks mechanism)
- **AC-RA.2** · Ingest pipeline: on new repo detected, fetch `construct.yaml`, run `construct-validate.sh`, insert into packs table with source URL + commit SHA pinned
- **AC-RA.3** · Auto-publish on clean ingest: remove the `draft` default OR add a post-ingest publish step; configurable per-org if governance demands it later
- **AC-RA.4** · Backfill: re-ingest all 0xHoneyJar/construct-* repos to catch anything that landed during the manual-only era (minimally construct-creator from cycle-006)
- **AC-RA.5** · Smoke test: `constructs install <slug>` on a freshly-pushed `0xHoneyJar/construct-test-smoke` succeeds end-to-end within N minutes (N configurable; webhook path ≤ 1min, cron path ≤ scan interval)
- **AC-RA.6** · Related issues closed or linked: #72 (registry API returning stale data) · #57 (DB migrations not running on Fly.io) — if scoped into this leg, close them; otherwise link as "composes with"

Shape-sketch: if webhook path — add an endpoint on `apps/api` at `POST /v1/admin/ingest` authenticated via the existing API-key path; github webhook fires on org push events; webhook body tells registry which slug + commit SHA to fetch. If cron path — add a scheduled function (Convex cron if explorer is using Convex, or a github Action on schedule that hits the admin endpoint).

### L-exemplar-readme · sprawl-world as reference implementation

- **AC-ER.1** · `sprawl-world/README.md` opens with: *"This is the reference implementation of [[worlds-vs-lenses]] — a world composed of apps that inherit from a world-level core design system, each with their own intent within shared DNA."*
- **AC-ER.2** · Mermaid diagram of the sprawl-world structure: engine (shared primitives) → Sprawl (world DNA + core DS) → apps (inheriting, some forked) → overrides (minimal)
- **AC-ER.3** · Concrete table of what Sprawl ships: apps, their inheritance status, fork reasons if any
- **AC-ER.4** · Operator-reading test: if another builder reads this README, do they understand how to author a new world from this template?
- **AC-ER.5** · Back-links to [[worlds-vs-lenses]] + [[constructs-as-packages]] + [[agent-teams-as-pipes]] so the doctrine chain is traversable

### L-inheritance-mechanism · runtime implementation (the big one)

- **AC-IM.1** · sprawl-world gains a `design-system/core/` directory containing the world-level core DS tokens (oklch palette, spacing, type scale, motion specs, button primitives)
- **AC-IM.2** · Each Sprawl app's design-system consumes the core via a documented inheritance mechanism — concrete path: symlink / package workspace / build-time merge / CSS cascade / other. Pick one, document it, ship it
- **AC-IM.3** · Fork mechanism documented + demonstrated: if `apps/constructs-network` needs button variants the core doesn't provide, how does it fork? Does it still receive core updates for everything else? What's the divergence boundary?
- **AC-IM.4** · Update propagation tested: change a core token (e.g. primary color), run the propagation mechanism, verify all non-forked apps pick up the change
- **AC-IM.5** · DNA invariants preserved — core DS changes MUST NOT break brand coherence across apps. Document which tokens are "DNA-locked" (can't diverge per-app) vs "DNA-free" (app discretion)
- **AC-IM.6** · **Bats test or smoke test** validating the mechanism works end-to-end — not just documented; runs and produces expected artifacts

### L-cross-pollinate-purupuru · extract existing patterns

- **AC-CP.1** · `grimoires/worlds/purupuru-structural-audit.md` — what's in Purupuru today that makes the operator say *"it already structures its design well"*? Inventory: engine usage, world DNA expression, app composition, design-system pattern
- **AC-CP.2** · Cross-world comparison table: Sprawl structure (post-cycle-007) vs Purupuru structure. Gaps in either direction surfaced
- **AC-CP.3** · Patterns Purupuru has that Sprawl should inherit → added to Sprawl as part of L-exemplar-readme
- **AC-CP.4** · Patterns Sprawl is authoring that Purupuru should retroactively gain → logged as cycle-008+ Purupuru alignment work
- **AC-CP.5** · Validates the inheritance pattern at the world-template level (not just app-level)

### L-close · findings + handoff

- **AC-CL.1** · `cycle-007-findings.md` with F-numbers continuing from cycle-006's final F
- **AC-CL.2** · KANSEI gate Q1–Q5 answered
- **AC-CL.3** · Cycle-008 inheritance queue updated (Purupuru alignment, multi-world validation, any runtime friction from cycle-007)
- **AC-CL.4** · What this cycle proves section mirrored in findings

---

## 4 · Dispatch

**Budget**: $180 target · $260 cap · Profile `medium` (cycle-006 baseline + 40% for L-inheritance-mechanism complexity)

Cap higher than cycle-006 because:
- L-inheritance-mechanism is substantive runtime work (schema + mechanism + test)
- L-cleanup-loa-constructs requires careful audit to not break existing installs
- L-cross-pollinate-purupuru spans two repos + validation work
- Paired with sprawl-world concurrent activity (operator's A workstream from cycle-006 close)

**Dispatch mode**: conversational-paired + shell-first per doctrine §13.1. Some legs eligible for spiral-autonomous:
- L-verify (research-only, deterministic)
- L-remove-stale (mechanical after operator confirmation)
- L-cleanup-loa-constructs (mechanical after audit is operator-reviewed)

Legs requiring paired-conversational mode (taste calls):
- L-inheritance-mechanism (architectural choices about HOW to implement inheritance)
- L-exemplar-readme (operator voice, storytelling)
- L-delineate-responsibility (responsibility-boundary framing affects downstream cycles)

**Pre-dispatch checklist** (next session):
- Verify main is clean + current (`git log -3 origin/main`)
- Cycle-006 MUST be merged to main first (or at least: key cycle-006 scripts landed in Loa via L-migrate)
- Branch from main (`git checkout -b feat/spiral-loa-constructs-cycle-007-world-consolidation`)
- Operator-model probe: re-read `~/hivemind/wiki/concepts/worlds-vs-lenses.md` (amended 2026-04-23), [[constructs-as-packages]] §3 amendment, [[learn-mode]] for register
- Then begin L-verify (cheap research first, operator reviews inventory before L-lift-explorer starts destructive work)

---

## 5 · KANSEI gate (S8, operator-answered)

Five questions per doctrine §14.5 (operator-experience framing, not architecture-spec). Target ≥4/5 YES on Q1–Q4 + constructive Q5. Halt if <3/5.

| # | Question | Pass criterion |
|---|---|---|
| Q1 | Is loa-constructs "ultra simple" enough that a fresh agent reading it doesn't pick up wrong context? | Y |
| Q2 | When I point someone at sprawl-world and say "this is how to build a world," do they see the three-tier hierarchy (engine / world / apps) clearly on disk and in docs? | Y |
| Q3 | When I change a core design-system token in sprawl-world, do all non-forked apps pick up the change without me touching each one? | Y |
| Q4 | Is the three-layer payment responsibility boundary (apps / API / ledger) legible at a glance in both loa-constructs and sprawl-world READMEs? | Y |
| Q5 | Free-text: with cycle-007 shipped, when I start authoring a new world from this template, what's the first thing that feels easier than before? (constructive answer — drives cycle-008 framing) | constructive answer |

---

## 6 · Review lens (carryover + additions)

Still applicable: cycle-001 lens (GECKO + KEEPER + OTLET + KISS) + cycle-004 (COMPILE, TRANSPARENCY, DETERMINISM, PLAYGROUND) + cycle-005 (EXECUTION, INTEGRATION) + cycle-006 (RAILS-AS-LEGIBILITY, FOCUS-PER-REGISTER).

**Cycle-007 additions**:

- **RESPONSIBILITY-BOUNDARY lens** — does each artifact/file/dep land in the layer that actually owns its concern? Payments in loa-constructs = boundary violation. Surface such violations explicitly.
- **REFERENCE-IMPLEMENTATION lens** — could another operator read sprawl-world and author a new world from this template without pairing? If not, docs + structure aren't exemplar enough.
- **INHERITANCE-WITHOUT-RIGIDITY lens** — does the core DS propagate by default AND does a real app's fork feel welcomed (not resisted)? Both must be true.

---

## 7 · What landing this proves

If cycle-007 lands cleanly:

1. **loa-constructs reflects its actual responsibility** — distribution + network API + license-verify hooks. No payment-SDK bleed. Agent-reading produces correct context.
2. **sprawl-world IS the reference implementation of [[worlds-vs-lenses]]** — another operator can point at it and learn the three-tier pattern.
3. **Design-system inheritance works at runtime** — the cycle-006 doctrine amendment becomes operational. Core DS + apps inherit + forks welcome + DNA preserved.
4. **Three-layer payment boundary is legible on disk** — the architecture is self-documenting via file placement, not just prose.
5. **Two-world validation** — Purupuru + Sprawl both expressing the worlds-vs-lenses hierarchy cross-checks the pattern. Template proves template-ability.
6. **The dead scaffolds stop confusing context** — sprawl-protocol-world deleted; other stale artifacts pruned. Agent context hygiene restored.

If it doesn't land cleanly, the findings route to cycle-008+ and the doctrine absorbs what broke (OTLET chain-preserved).

---

## 8 · What cycle-008 inherits

Pre-drafted from cycle-006 deferrals + this cycle's likely gaps:

1. **TeamCreate-executor implementation** — alternative backend for the composition runner (deferred from cycle-006)
2. **`constructs try` ephemeral execution** — npx/uvx pattern for constructs (deferred from cycle-005)
3. **QMD integration** — per-agent memory + optional hivemind-layer integration (deferred from cycle-006)
4. **Hivemind-as-construct pack** — `/hivemind` personal skill becomes a publishable construct (deferred from cycle-005)
5. **Multi-construct-per-stage loadouts** — composition mechanics for multiple constructs loaded into one teammate (deferred from cycle-006)
6. **Navigation-layer-via-templates** — each construct exposes a template pointer to recommended patterns (deferred from cycle-006)
7. **Purupuru alignment** — whatever patterns sprawl authors in cycle-007 that Purupuru should retroactively gain
8. **Stack/framework swap evaluation** — Radix vs Base UI vs Svelte-sovereign (deferred from cycle-006 as cycle-008+)
9. **DSL-on-top** — if N compositions across multiple cycles reveal repeated patterns, composition-language evaluation (operator self-pushback from cycle-006; only revisit after evidence)

---

## 9 · Cycle authorship lens

Cycle-001 · OSTROM (architecture-first)
Cycle-002 · operator (experience-first paired-scribe)
Cycle-003 · agent (first-person toolchain walk)
Cycle-004 · agent + doctrine (open playground)
Cycle-005 · agent + integration (runtime + ecosystem-coherence)
Cycle-006 · agent + operator (agentic full-stack runtime)
**Cycle-007 · agent + operator (world consolidation + architectural cleanup + inheritance implementation)**

Declared at cycle open so subsequent cycles chain-preserve per OTLET.

---

## 10 · Governance notes (per cycle-005 SEED §11)

| Repo | Owner | PR discipline |
|---|---|---|
| `0xHoneyJar/loa-constructs` | Operator (this repo) | Admin-merge OK |
| `0xHoneyJar/sprawl-world` | Operator | Admin-merge OK |
| `0xHoneyJar/sprawl-protocol-world` | Operator | **Delete operation** — requires explicit `gh repo delete` with operator confirmation. Already pre-confirmed 2026-04-23 late as stale (4-week-old scaffold) |
| `0xHoneyJar/loa` | **@janitooor** | NOT touched this cycle |
| `0xHoneyJar/loa-freeside` | @janitooor + operator collab | NOT touched this cycle (ledger stays; responsibility-boundary docs reference but don't edit) |

**Deletion discipline**: L-remove-stale involves `gh repo delete` — irreversible. Protocol:
1. Pre-flight: operator confirms list of candidates-for-deletion
2. Each deletion is a separate command with its own confirmation prompt
3. Backup: any non-stale content discovered mid-audit is archived via `git archive` before any deletion

---

## 11 · Supersession note

Cycle-006 enrichment-threads §"Deferred to cycle-007" items are promoted to cycle-007 scope (this SEED). Specifically: Claude Code repo cleanup, app separation, design-system inheritance mechanism. Remaining cycle-006 deferrals (TeamCreate executor, QMD, hivemind-as-construct, `constructs try`, multi-construct-per-stage) stay in cycle-008+ queue.

Cycle-006 doctrine amendment to [[worlds-vs-lenses]] §"Design-system inheritance pattern" is the load-bearing doctrinal input for cycle-007 L-inheritance-mechanism — that leg implements the amendment's claims at runtime.

Cycle-005 L-migrate (move scripts into Loa) is a **prerequisite for cycle-007 dispatch** — until the scripts land in Loa proper, every world repo (sprawl, purupuru, future) relies on symlinks to loa-constructs. That's brittle for a "reference implementation" claim. Cycle-006 completion (B workstream currently running) lands L-migrate; cycle-007 assumes it's done.

---

## 12 · Cross-world pollination as a new pattern

**Operator 2026-04-23 late**: *"Whatever we learn from doing this as I switch back and forth between Sprawl and Purupuru will kind of trickle its way upstream or carry upstream."*

Pattern worth naming (not yet a hivemind page — validation this cycle): **cross-world pollination compounds learning**. One world surfaces edges the other doesn't. Both inform the shared engine/primitives/DNA layer. **Two worlds are the minimum for the inheritance pattern to prove itself** — one world can't validate a shared-DS floor because there's nothing to share with.

Cycle-007's L-cross-pollinate-purupuru leg is the first explicit instance of this pattern. If it produces clean template-extraction, the pattern crystallizes to doctrine in cycle-008. If it doesn't, the pattern was premature naming.

---

## 13 · Dispatch kickoff prompt (copy into next session)

```
Dispatching cycle-007 per SEED at
grimoires/loa-constructs-seed-2026-04-21/cycle-007-SEED-world-consolidation.md

Branch: feat/spiral-loa-constructs-cycle-007-world-consolidation
Base: main (after cycle-006 merges — verify L-migrate landed first)
Mode: conversational-paired, shell-first per doctrine §13.1
Budget: $180 target / $260 cap

WHY THIS CYCLE EXISTS:
  Sprawl-world becomes the reference implementation of [[worlds-vs-lenses]].
  loa-constructs simplifies to its actual responsibility (distribution + API
  + license-verify hooks). Design-system inheritance works at runtime, not
  just in doctrine. Three-layer payment boundary (apps / API / ledger) is
  legible on disk.

OPERATOR DECISIONS LOCKED (from 2026-04-23 late paired session):
  - sprawl-world/apps/constructs-network IS canonical; loa-constructs/apps/explorer is legacy
  - sprawl-protocol-world is stale (4-week-old scaffold); DELETE via gh repo delete
  - Rektdrop is sprawl-world itself (not a separate repo)
  - Payments layer-split: apps = UI + checkout; network-API = license-verify hooks;
    freeside = ledger (NO payment handling in loa-constructs)
  - Purupuru already structures well → cross-pollinate, don't modify

LEGS (priority-ordered):
  L-verify              · audit sprawl-world canonical status (research first)
  L-lift-explorer       · retire loa-constructs/apps/explorer (destructive after verify)
  L-delineate-responsibility · three-layer payment boundary documented
  L-remove-stale        · delete sprawl-protocol-world + other dead scaffolds
  L-cleanup-loa-constructs · TEND pass for agent-context hygiene
  L-exemplar-readme     · sprawl-world as reference implementation
  L-inheritance-mechanism · runtime DS inheritance (BIGGEST leg)
  L-cross-pollinate-purupuru · extract existing patterns for Sprawl template
  L-close               · findings + cycle-008 handoff

SCOPE-LOCK (operator forcing-function):
  NO DSL on top. NO multi-construct-per-stage. NO TeamCreate executor
  implementation. NO QMD integration. NO hivemind-as-construct pack. NO
  stack/framework swap. Consolidate ONE world (Sprawl); implement inheritance
  for ONE world; cross-pollinate from Purupuru's existing patterns.

READ FIRST (priority order):
  1. grimoires/loa-constructs-seed-2026-04-21/cycle-007-SEED-world-consolidation.md (this file)
  2. ~/hivemind/wiki/concepts/worlds-vs-lenses.md §"Design-system inheritance pattern" (2026-04-23 amendment — load-bearing for L-inheritance-mechanism)
  3. ~/hivemind/wiki/entities/world-registry.md (amended opening line)
  4. ~/hivemind/wiki/concepts/constructs-as-packages.md §3 amendment (responsibility boundaries)
  5. ~/hivemind/wiki/concepts/learn-mode.md (operator register — visual-first, ultra-concise)
  6. ~/hivemind/wiki/concepts/naming-is-diagnostic.md (diagnostic rule for friction)
  7. grimoires/loa-constructs-seed-2026-04-21/cycle-006-enrichment-threads.md §"Deferred to cycle-007" (promoted to this cycle's scope)

BEGIN: start with L-verify (research only; no destructive operations).
Operator reviews inventory before L-lift-explorer or L-remove-stale
start destructive work.

FINDINGS: grimoires/loa-constructs-seed-2026-04-21/cycle-007-findings.md
per OTLET convention.
```

---

*Drafted 2026-04-23 late during operator-paired cycle-006 close + cycle-007 scoping session. Ready for operator review + admin-merge to main. Cycle-007 dispatch begins after (a) operator SEED approval, (b) cycle-006 completion, (c) L-migrate landing in Loa.*
