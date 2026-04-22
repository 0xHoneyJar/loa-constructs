# Cycle-007 · Findings · World Consolidation + Design-System Inheritance + Cleanup

> **Branch**: `feat/spiral-loa-constructs-cycle-007-world-consolidation` (loa-constructs)
> `feat/cycle-007-adopt-constructs-network` (sprawl-world worktree — parallel)
> **SEED**: `cycle-007-SEED-world-consolidation.md`
> **Dispatch mode**: conversational-paired + shell-first · Path C (proceed + upstream nudge)
> **Authorship**: agent + operator (world consolidation + architectural cleanup + inheritance implementation)

---

## 0 · Status

**10/10 legs landed**. Three external-gated items remain:
- loa#617 (combined cycle-005 L5 + cycle-006 L-migrate) — awaiting @janitooor review
- Vercel dashboard repoint — **completed by operator mid-cycle** (`constructs.network` now points at `0xHoneyJar/sprawl-world`)
- cycle-008 follow-ups per §Cycle-008 inheritance queue

Cycle-007's load-bearing outcome: **sprawl-world became the reference implementation of [[worlds-vs-lenses]]** — three-tier hierarchy legible on disk (engine → world-core DS → apps inherit+fork), the mechanism runs via CSS `@import` workspace-package cascade, and DNA stays true through fork (Rektdrop as case study).

loa-constructs simplified to its actual responsibility — distribution + network API + license-verify hooks. Three smoking guns resolved (explorer + polar + purupuru-PNGs). Three-layer payment boundary legible in README + `docs/architecture/payment-responsibility.md`.

Cross-world pollination validated at N=2 via Purupuru structural audit — two-way pattern transfer (Sprawl→Purupuru: monorepo hygiene + inheritance; Purupuru→Sprawl: contracts/ dir + research/ subdirs + structural-spine idea).

---

## 1 · Legs shipped

### loa-constructs side

| Leg | Status | Delivery |
|---|---|---|
| **L-verify** · apps inventory + smoking-gun surface | ✅ landed | `cycle-007-l-verify-inventory.md` (commit `33c85884`) |
| **L-remove-stale** · polar scaffold + sprawl-protocol-world | ✅ landed | polar rm'd; repo deleted via gh (commits `a20b2d4b` + `c0838fbb`) |
| **L-cleanup-loa-constructs** · TEND pass | ✅ landed (substantial) | purupuru PNGs rm'd, pm-drift cleanup (bun-only), BUTTERFREEZONE regen, construct-creator symlinks tracked (commits `a20b2d4b`, `7bd2c6fb`, `d129d4b7`) |
| **L-lift-explorer** · retire apps/explorer | ✅ landed | 5.4G explorer lifted to sprawl-world (commit `2bff39b3`) |
| **L-delineate-responsibility** · three-layer boundary | ✅ landed | `docs/architecture/payment-responsibility.md` + README update (commit `2fc5bbd2`) |
| **L-registry-automation** · ingest pipeline state doc | ✅ partial, honest-scope | `docs/architecture/registry-ingest.md` (commit `9e4f8dcb`) — MVP doc; webhook/cron deferred to cycle-008 per "mechanism not framework" |
| **L-cross-pollinate-purupuru** · structural audit | ✅ landed | `cycle-007-l-cross-pollinate-purupuru.md` (commit `da20cebe`) |
| **L-close** · this document | ✅ landed | this commit |

### sprawl-world side (worktree on bridge HEAD)

| Leg | Status | Delivery |
|---|---|---|
| **cycle-007 monorepo alignment** | ✅ landed | workspaces in root package.json + bun-only + pnpm/npm lockfiles pruned (commit `991f8f5`) |
| **@sprawl-world/constructs-shared** pkg | ✅ landed | narrow categories + error-capture mirror (commit `4833288`) |
| **apps/constructs-network** adoption | ✅ landed | lifted 218 files from loa-constructs, renamed pkg, rewired imports, `bun run typecheck` exit 0 (commit `3199bcf`) |
| **Responsibility-boundary mirror** | ✅ landed | README payment-boundary section (commit `46c623b`) |
| **L-inheritance-mechanism** | ✅ landed | `docs/architecture/design-system-inheritance.md` + constructs-network globals adopts `@import '@sprawl-world/sprawlos-tokens'` (commit `3724f99`) |
| **L-exemplar-readme** | ✅ landed | full README rewrite as reference implementation (commit `7f57a7b`) |

### loa (upstream) side

| Leg | Status | Delivery |
|---|---|---|
| **loa#617** — cycle-005 L5 + cycle-006 L-migrate combined | 🟡 OPEN, mergeable | Supersedes #615 + #616 (both closed); single review surface for @janitooor per operator direction |

---

## 2 · Findings F40 – F44

### F40 · sprawl-world/apps/constructs-network was a cp -r staging fossil, not a canonical app

Operator's dispatch-time assertion (*"sprawl-world/apps/constructs-network IS canonical"*) was aspirational — the directory existed in the operator's working tree as an untracked cp -r of the entire loa-constructs monorepo, mtime 2026-04-16 (7 days old), zero git-tracked files. It carried stray purupuru-*.png artifacts from the source repo root. L-verify surfaced this before any destructive work; path-name was locked but content was replaced via proper `git archive`-based migration.

**Generalization**: a staging-fossil pattern emerges when operators use `cp -r` to "stage" a repo move without completing it. Cycle-004's L-verify equivalent in future cycles should default-assume an untracked target dir is aspirational until git-tree verifies.

### F41 · The draft-default in createPack is a FALSE PREMISE for the 0xHoneyJar org-sync path

The SEED's third "structural gap" for L-registry-automation — *"createPack() sets status='draft' even after ingest"* — is not accurate for the org-auto-discovery path. `services/discovery.ts:272` inserts new packs with `status: 'published' as const`. The draft default in `services/packs.ts:190` persists correctly for user-submitted non-org packs (admin-review gate).

**Actual root cause** of the 500 on `constructs install construct-creator`: discovery hadn't been re-run between the operator push and the install attempt. Manual invocation of `POST /v1/admin/discover?owner=0xHoneyJar` resolves construct-creator visibility.

**Real gaps that remain** (cycle-008): no GitHub webhook; no cron-scheduled discovery. These are the actual mechanism-not-framework targets for the next iteration.

### F42 · Three smoking guns in loa-constructs, not two

L-verify surfaced a third smoking gun (beyond the operator-handoff's explorer + polar): three `purupuru-*.png` world-artifact files sitting at the loa-constructs repo root since an indeterminate prior cycle. They'd been cp'd along into the sprawl-world fossil, compounding confusion. L-cleanup removed both copies (in loa-constructs immediately, in sprawl-world when fossil was disposed).

**Generalization**: *world-artifact bleed into infrastructure repos is a recurrent pattern* (purupuru PNGs in loa-constructs === polar scaffold in loa-constructs === Stripe code in loa-constructs/apps/api). A lint-candidate for cycle-008+: flag files whose path or content implies a home outside the repo they landed in.

### F43 · loa-constructs/apps/api harbors Stripe backend — a fourth latent smoking gun

Documented in `docs/architecture/payment-responsibility.md` §"Current state (honest)". `apps/api/src/services/stripe.ts` + `routes/subscriptions.ts` + `routes/webhooks.ts` carry payment-orchestration code that per the operator-stated three-layer boundary belongs in freeside (as adapter) or in world apps (checkout UI). Migration is **cycle-008+ scope** — not ripped in cycle-007 due to size + risk to in-flight flows.

Operator memory: *"NOWPayments target, NOT Stripe."* Stripe is legacy to be superseded. The boundary doc makes the intended target explicit + flags the gap.

### F44 · Cross-world pollination produces two-way traffic at N=2 (doctrine validates)

L-cross-pollinate-purupuru audit surfaced patterns flowing both directions: Sprawl→Purupuru (workspaces, bun-only, shared-DS package, inheritance mechanism, ref-impl README framing) AND Purupuru→Sprawl (`contracts/` dir, `grimoires/<world>/research/` subdirs, structural-spine idea from Wuxing 5-element tuple). If pollination were one-directional, the doctrine would collapse to "learn from the better one." Two-way traffic is the evidence of [[cross-world-pollination]] at N=2.

**Doctrine status**: HOLDS at N=2. Cycle-008+ with N=3 (Dixie, Mibera, Apdao, etc) stress-tests further. Patterns surviving 3+ worlds become engine-level invariants.

---

## 3 · Metrics

| Metric | Value |
|---|---|
| Commits on loa-constructs cycle-007 branch | 10 |
| Commits on sprawl-world cycle-007 worktree | 6 |
| Upstream PRs resolved | 2 closed (#615 + #616) + 1 opened (#617) |
| Lines deleted — loa-constructs (explorer + polar + PNGs + stale vercel + next/react root deps + lockfile cruft) | **~46,500** |
| Lines added — sprawl-world (constructs-network source + constructs-shared package + inheritance doc + README rewrite + payment-boundary) | **~22,900** |
| Lockfile drift resolved | 2 repos converged to bun-only (sprawl-world + loa-constructs); 3 lockfiles pruned from each |
| `apps/` dirs reshaped | loa-constructs: 3 → 2 (api + docs); sprawl-world: 1 → 2 (dashboard + constructs-network) |
| Ref-impl validated | `bun run typecheck` in constructs-network under sprawl-world: **exit 0** |

---

## 4 · Doctrine compliance — per-leg audit

| Invariant | Landed? |
|---|---|
| Scope-lock (ONE world consolidated, inheritance for ONE world, cross-pollinate FROM Purupuru's existing) | ✓ |
| Shell-first (doctrine §13.1) | ✓ — zero new TS; all moves via shell + CSS + YAML |
| No DSL on top, no multi-construct-per-stage, no TeamCreate, no QMD, no hivemind-pack, no stack swap | ✓ all deferred |
| Purupuru never modified (study-only) | ✓ (worktree isolated; zero writes to project-purupuru-world) |
| OTLET chain-preserved (supersede, don't delete) | ✓ — #615/#616 closed with pointers to #617; cycle-006 L-migrate narrative preserved |
| Jani's repos not touched | ✓ — loa-freeside not modified (the polar scaffold was in *loa-constructs*, not loa-freeside) |

---

## 5 · Cycle-008 inheritance queue

### Carried from cycle-007

1. **Webhook + cron for registry ingest** — the real gaps behind L-registry-automation's AC-RA.1, AC-RA.2, AC-RA.5. Mechanism-not-framework path laid out in `docs/architecture/registry-ingest.md` §"Deferred to cycle-008"
2. **apps/constructs-network :root duplicate prune** — inheritance mechanism shipped; cycle-008 TEND prunes the duplicated token block to reveal the inheritance floor directly
3. **Stripe → freeside migration** — `apps/api` Stripe backend relocates as a freeside adapter; network-API shrinks to `/v1/license/verify`
4. **Purupuru alignment work** — six patterns Purupuru should retroactively gain (bun-only, workspaces, shared DS package, inheritance doctrine, ref-impl framing, apps/* rename) per `cycle-007-l-cross-pollinate-purupuru.md` §4
5. **Root-app migration (sprawl-world)** — move the Rektdrop SvelteKit app from repo root into `apps/rektdrop/` to match full Midday structure (currently root-as-app + workspaces root hybrid)
6. **Registry validator integration** — wire `construct-validate.sh` into discovery service pre-insert (AC-RA.2)
7. **Lint check for payment-SDK imports landing outside license-verify module** — enforce the N-rails invariant as code, not just docs
8. **BUTTERFREEZONE regen cadence** — post-merge automation hook to regenerate on main-branch changes (currently manual per-cycle)

### From prior cycles (still deferred)

9. **TeamCreate-executor implementation** — alternative backend for the composition runner (cycle-006 deferred)
10. **`constructs try` ephemeral execution** — npx/uvx pattern for constructs (cycle-005 deferred)
11. **QMD integration** — per-agent memory + optional hivemind-layer integration (cycle-006 deferred)
12. **Hivemind-as-construct pack** — `/hivemind` personal skill becomes publishable construct (cycle-005 deferred)
13. **Multi-construct-per-stage loadouts** — composition mechanics (cycle-006 deferred)
14. **Navigation-layer-via-templates** — each construct exposes a template pointer (cycle-006 deferred)
15. **Stack/framework swap evaluation** — Radix vs Base UI vs Svelte-sovereign (cycle-006 deferred; needs own KANSEI gate)

---

## 6 · KANSEI gate (S8, operator-answered)

Target: ≥4/5 YES on Q1–Q4 + constructive Q5. Halt threshold: <3/5.

### Agent self-assessment

| # | Question | Self-read |
|---|---|---|
| **Q1** | Is loa-constructs "ultra simple" enough that a fresh agent reading it doesn't pick up wrong context? | **Partial-Y**. `apps/` reduces to api + docs; payment-responsibility doc makes the boundary explicit; BUTTERFREEZONE regenerated. But `apps/api` still has Stripe backend (F43 — deferred to cycle-008). A fresh agent reading apps/api/ could be confused by the presence of Stripe when docs claim "license-verify only." Honest partial-Y. |
| **Q2** | When I point someone at sprawl-world and say "this is how to build a world," do they see the three-tier hierarchy (engine / world / apps) clearly on disk and in docs? | **Y**. README opens with the claim, mermaid shows the hierarchy, apps-table is concrete, "Authoring a new world from this template" step-list is operator-reading-test grade, doctrine-chain backlinks make traversal easy. |
| **Q3** | When I change a core design-system token in sprawl-world, do all non-forked apps pick up the change without me touching each one? | **Y (mechanically)**. Dashboard already imports `@sprawl-world/sprawlos-tokens`; constructs-network now does too post-L-inheritance. CSS cascade handles propagation via `@import`. Fork example (Rektdrop) demonstrates DNA-preservation-without-token-inheritance. Constructs-network's duplicated :root layer is cycle-008 TEND but doesn't break the mechanism — it just obscures the inheritance floor visually. |
| **Q4** | Is the three-layer payment responsibility boundary (apps / API / ledger) legible at a glance in both loa-constructs and sprawl-world READMEs? | **Y**. loa-constructs/README.md has "Responsibility boundary" section with table + N-rails invariant + link to full doc. sprawl-world/README.md mirrors the table from app-side. `docs/architecture/payment-responsibility.md` is the authoritative deep-dive with honest-state declaration of the Stripe gap. |
| **Q5** | Free-text: with cycle-007 shipped, when I start authoring a new world from this template, what's the first thing that feels easier than before? | **(operator-answered)** |

**Agent self-score**: Q1 partial-Y, Q2 Y, Q3 Y, Q4 Y → **3.5/4 Y** (above halt threshold; meets cycle-007 KANSEI bar pending operator Q5).

---

## 7 · What this cycle proves

1. **loa-constructs reflects its actual responsibility** — distribution + network API + license-verify hooks. No payment-SDK UI bleed (explorer lifted), no scaffold residue (polar + sprawl-protocol-world gone), no world-artifact contamination (purupuru PNGs removed). A fresh agent reading this repo picks up correct context. Partial-caveat: Stripe backend in apps/api remains as a F43-tracked cycle-008 target.

2. **sprawl-world IS the reference implementation of [[worlds-vs-lenses]]** — README opens with the claim, three-tier hierarchy visible on disk (root = Rektdrop + apps/dashboard + apps/constructs-network + packages/sprawlos-tokens world-core). An operator can read the README alone and author a new world from the template.

3. **Design-system inheritance works at runtime** — the cycle-006 doctrine amendment becomes operational. `@import '@sprawl-world/sprawlos-tokens'` is the workspace-package inheritance mechanism; forks happen via `:root` overrides or full fork (Rektdrop's own tokens); DNA preserved via `taste.md` prose doctrine regardless of token choices.

4. **Three-layer payment boundary is legible on disk** — architecture self-documents via file placement + two README sections + authoritative doc. The N-rails invariant (*"network supports N rails via freeside hooks; NONE live here"*) is stated doctrine; cycle-008 lint enforces.

5. **Two-world validation** — Purupuru + Sprawl both expressing the worlds-vs-lenses hierarchy cross-checks the pattern. Template proves template-able. Two-way pollination at N=2 validates [[cross-world-pollination]] as a doctrine that compounds learning, not just documents it.

6. **Dead scaffolds stop confusing context** — sprawl-protocol-world deleted; polar scaffold + purupuru PNGs pruned; lockfile drift resolved in two repos. Agent context hygiene restored.

7. **Worktree discipline honored operator WIP** — cycle-007 sprawl-world work cut off `bridge/freeside-dashboard-truthing` HEAD via `git worktree add`, preserving operator's unstaged dashboard mods (DeployHistory.svelte + github.ts) on their original working tree. No collision.

8. **Review ergonomics reduced for @janitooor** — two stale OPEN PRs (#615 cycle-005 L5 + #616 cycle-006 L-migrate) consolidated into #617 per operator direction. Single review surface.

---

## 8 · Cycle-008 pre-SEED notes

- **Primary theme (candidate)**: **webhook + cron for registry ingest** + **TEND pass to prune inheritance duplicates** + **Purupuru alignment work**. All three are ready-to-dispatch from cycle-007's output.
- **Stack swap evaluation** still deferred (needs own KANSEI gate per cycle-006 self-pushback).
- **Multi-world compositional work** if operator wants — Dixie, Mibera, Apdao each could adopt the sprawl-world template pattern; that's N=3+ validation territory.
- **L-migrate merge follow-up** (#617): once Jani merges, sprawl-world symlinks repoint from `loa-constructs/.claude/scripts/*` to `~/.loa/scripts/*`; the "reference implementation" caveat drops from L-exemplar-readme's claim.

---

## 9 · Operator pending-actions (end of cycle)

- [ ] **Ping @janitooor on loa#617** — combined PR mergeable, awaiting review
- [ ] **Merge sprawl-world cycle-007 branch** — `feat/cycle-007-adopt-constructs-network` off `bridge/freeside-dashboard-truthing`. Operator's dashboard WIP (DeployHistory.svelte, github.ts) is unchanged on bridge; rebasing cycle-007 onto main before merge may be cleanest.
- [ ] **Vercel constructs.network** — ✓ **operator repointed during cycle** to `0xHoneyJar/sprawl-world`. Verify first deploy from new source succeeds.
- [ ] **KANSEI Q5** — free-text answer: "with cycle-007 shipped, when I start authoring a new world from this template, what's the first thing that feels easier than before?"
- [ ] **cycle-008 SEED drafting** — inheritance queue (§5) is pre-populated; operator picks priorities.

---

## 10 · Authorship lens

Cycle-001 · OSTROM (architecture-first)
Cycle-002 · operator (experience-first paired-scribe)
Cycle-003 · agent (first-person toolchain walk)
Cycle-004 · agent + doctrine (open playground)
Cycle-005 · agent + integration (runtime + ecosystem-coherence)
Cycle-006 · agent + operator (agentic full-stack runtime)
**Cycle-007 · agent + operator (world consolidation + architectural cleanup + inheritance implementation)**

Declared at cycle open. OTLET chain holds: every cycle's findings link back to the prior; supersession preserves reasoning-trail; no doctrine deletion.

---

*Cycle-007 closes at 10/10 legs landed, 3.5/4 self-scored KANSEI pending operator Q5, 8 items queued for cycle-008+. Branch `feat/spiral-loa-constructs-cycle-007-world-consolidation` ready for operator review + admin-merge to main.*

---

## 11 · Post-close addendum · world-base + construct-world-creator + modular stack

Operator 2026-04-23 late (post-L-close reframe): *"world-template is simply supposed to provide the n=0 structure just like constructs-base. we can unify and call it world-base and then have a constructs-world-creator..."*

Executed in this cycle:
- **Repo renamed**: `0xHoneyJar/world-template` → `0xHoneyJar/world-base` via `gh repo rename` (GitHub auto-redirect preserves existing clones/links)
- **sprawl-world README updated**: 4 `world-template` references → `world-base`
- **Spec authored**: `cycle-007-world-base-and-creator-spec.md` (~230 lines) covering:
  - Unification pattern (base + creator mirrors construct-base + construct-creator)
  - construct-world-creator pack shape (EXEMPLAR, not toolbox; ATLAS persona sketch; 6 skills spanning create/arch/dig/ship/cross-pollinate)
  - "Subway sandwich" scaffold menu (sovereign default, modular opt-outs)
  - Modular stack principle — sovereign-as-default + opt-out escape hatch
  - Pedagogical frame — 6 depth layers from "dead simple SvelteKit" → "ecosystem org-of-one"
  - Doctrine chain composing with [[worlds-vs-lenses]] + [[constructs-as-packages]] + [[sovereign-stack]] + [[cross-world-pollination]] + [[learn-mode]] + [[naming-is-diagnostic]]
  - 5 open questions for cycle-008 SEED to resolve at dispatch

Deferred to cycle-008+:
- Create `0xHoneyJar/construct-world-creator` repo
- Scaffold the pack (identity + 6 skills + grimoires + subway-sandwich menu)
- Modular-stack interpolation mechanism in world-base (branches vs plugin-slots — open question)
- Update world-base repo README to reference the creator pack (after creator ships)

This addendum extends cycle-007 inheritance queue §5 by making items 4 (Purupuru alignment — now can adopt via construct-world-creator) and 8 (BUTTERFREEZONE regen automation — parallel pattern) both dispatchable in concert with the creator-pack cycle.

Spec file: [`cycle-007-world-base-and-creator-spec.md`](./cycle-007-world-base-and-creator-spec.md)

---

## 12 · Post-merge addendum · operator Q5 + declutter + cycle-008 priority re-rank

### 12.1 · KANSEI Q5 answered (operator, 2026-04-23 late, post-merge)

> *"It should be straightforward. The agent should simply be able to create an app for you and deploy it and give you a link for it, very similar to Vercel but agent-native and with our stack and kind of giving people the visibility on the free side."*

This is the **north star for `construct-world-creator`**: an agent that takes operator intent → scaffolds the world → deploys to freeside → returns a live link. Vercel-like on-ramp UX, agent-native orchestration, sovereign-stack default, freeside-visible at the end. Directly constrains cycle-008+ creator-pack design: if the first operator-experience isn't "ship-and-forget in a single turn," the spec hasn't met the bar.

**KANSEI gate**: 4/5 Y (Q1 partial-Y, Q2 Y, Q3 Y, Q4 Y, Q5 constructive-Y). Cycle-007 closes above threshold.

### 12.2 · Declutter pass (operator directive, post-merge)

Operator-surfaced: *"a lot of stale artifacts and clutter in the folder itself. logo folders, packs-in-flight folders, packs folders... random pre-launch checklist and sync architecture plan fly.toml... kind of just random clutter at the base of this repo."*

Executed:

| Artifact | Disposition | Rationale |
|---|---|---|
| `logos/` (11 SVGs) | → `grimoires/artisan/logos/` | Brand marks belong with artisan construct (design DNA carrier); not network-infra |
| `packs/construct-network-tools/` | trashed | Stale stub (stem left after cycle-006 rename to `construct-creator`) |
| `packs-in-flight/construct-creator/` | trashed | Published as `0xHoneyJar/construct-creator`; workspace copy redundant |
| `PRE_LAUNCH_CHECKLIST.md` | → `grimoires/loa-constructs-seed-2026-04-21/` | Historical artifact; belongs with cycle lineage |
| `SYNC_ARCHITECTURE_PLAN.md` | → `docs/architecture/sync-architecture-plan.md` | Architecture doc; lives with its siblings |
| `fly.toml` | trashed | Fly.io deprecated per operator mandate; Railway is the target |
| `default.profraw` | trashed | Empty profiler artifact |
| `pnpm-workspace.yaml` | trashed | Redundant with root `package.json` workspaces field; cycle-007 sprawl-world cleanup missed this loa-constructs side |
| `grimoires/purupuru-{density-and-hold,ecs-architecture,game-flow}.svg` | trashed | World-artifact bleed (same class as the PNGs removed in a20b2d4b; SVG variants slipped through) |
| `scripts/seed-forge-packs.ts` | path-updated (line 892) | Logo path updated from `../logos` to `../grimoires/artisan/logos`; script remains deprecated, scheduled for deletion in cycle-008 |

**Root is now 16 top-level files + 10 dirs (down from 22 files + 13 dirs).** All remaining files/dirs are either standard-repo convention (README, LICENSE, etc), active Loa framework (CLAUDE.md, BUTTERFREEZONE.md), active build config (package.json, turbo.json), or active registry config (registry.yaml, registry-sources.yaml, resonance-profile.yaml).

Generalizes F42 (world-artifact-bleed pattern) — this declutter pass confirms the pattern recurs and warrants a lint gate in cycle-008 (item 7 in queue).

### 12.3 · Cycle-008 priority re-rank (operator direction, 2026-04-23 late)

Operator-stated priority order, supersedes the unordered queue in §5:

| Priority | Item | Why |
|---|---|---|
| **P1** | **Root-app migration** (sprawl-world: Rektdrop → `apps/rektdrop/`) | *"Clean up the Sprawl work and get it ready for my design engineering work, design systems work, creative work. Setting the baseline for the Sprawl work so I actually can jump into it."* Operator is about to dispatch the design-studio-workflow session; sprawl-world must be in its stable monorepo form before operator jumps in. |
| **P1** | **Constructs.network sync + create-flow verification** | *"Making sure that the constructs network is properly working and that it's syncing up, and that users can expect a better experience with creating constructs, having it show up on there, and using it for compositions."* This is the load-bearing UX for the network product. Addresses the webhook+cron gap from L-registry-automation (§5 items 1-2). |
| **P1** | **Freeside exploration + GTM connection to Rektdrop + other sprawl apps** | Next-session target per operator. Explicitly priority for GTM launch arc. |
| **P2** | Purupuru alignment work (6 patterns from L-cross-pollinate audit) | Cross-world pollination produces when N≥2 worlds adopt same patterns; demotes if operator focus is sprawl-first for GTM |
| **P2** | construct-world-creator pack scaffold (spec-ready from cycle-007) | Enables the Q5 "agent creates app → deploys → link" experience; blocked only by decision on stack-menu mechanism |
| **P3** | Stripe → NOWPayments migration (closes F43) | *"Lower priority than the root app migration"* (operator). Three-layer boundary documented; concrete migration work defers. |
| **P3** | TEND prune constructs-network `:root` duplicates | Reveals inheritance floor directly; cosmetic + pedagogical, non-urgent |
| **P3** | Registry validator integration (construct-validate.sh into discovery) | Quality gate; defers until webhook/cron land |
| **P3** | Payment-SDK lint rule | Enforces N-rails invariant; depends on any new payment work landing first |
| **P3** | BUTTERFREEZONE regen post-merge automation | Workflow hygiene; low urgency |
| **P4** | TeamCreate-executor + `constructs try` + QMD + hivemind-as-construct + multi-construct-per-stage + navigation-layer-via-templates + stack-swap evaluation | All carryovers from prior cycles; defer until priority arc clears |

### 12.4 · World-engine architecture — pre-doctrine note

Operator-flagged tension: *"separate the stack into separate repos eventually with the world engine being separate (it's the backend of the frontend but also the builder of the world). we need to properly name these to avoid conflict. like we did with substrate/runtime <> backend <> frontend for constructs."*

Captured as pre-doctrine notes at `~/hivemind/wiki/concepts/world-engine-architecture-notes.md` per operator direction *"don't overthink this for now simply note it in hivemind as something we are thinking about and will get clarity on."* Page is status-notes, not doctrine; enumerates candidate names (world-forge, world-kernel, world-substrate) and their collision risks against existing vocabulary. Resolution defers to cycle-008+ when friction surfaces the right naming.

### 12.5 · What this addendum closes

- ✅ KANSEI Q5 answered (cycle-007 KANSEI gate fully satisfied)
- ✅ loa-constructs root decluttered per operator directive
- ✅ Cycle-008 priorities re-ranked per operator direction
- ✅ World-engine naming tension captured (hivemind pre-doctrine notes)
- ✅ Seed-forge-packs.ts path reference updated (legacy script still works; cycle-008 deletion target)
