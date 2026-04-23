# Cycle-008 · L-bug-triage-and-migration-queue

> **Leg**: L-bug-triage (conversational; not in SEED §2 originally — emerged from operator `/bug` invocation mid-dispatch)
> **Status**: triage complete · sprint-bug-66 filed · spot-fix DEFERRED per operator direction 2026-04-24
> **Authored**: 2026-04-24

---

## 0 · Why this leg exists

Operator invoked `/bug` mid cycle-008 L-ground dispatch on an observed failure: constructs.network UI rendering *"No public constructs available"* post-cycle-007-close. Triage completed (sprint-bug-66). Before /implement dispatch, operator redirected: **don't spot-fix** the Vercel/DB state; instead file the structural migration as an upcoming cycle.

---

## 1 · Bug triage outcome (from sprint-bug-66)

**Bug ID**: `20260422-b63fed` · **Sprint**: `sprint-bug-66` · **Beads**: `bd-1o9` · **Eligibility**: 5/5 ACCEPT · **Code-changes-required**: NONE

Compound bug, three causes, all config/data:

| # | Cause | Where |
|---|---|---|
| RC1 | Vercel project `loa-constructs-explorer-5bfi` still points at `loa-constructs/apps/explorer` (lifted in cycle-007 commit `2bff39b3`); every main-commit build fails; pre-cycle-007 snapshot served as fallback | Vercel dashboard |
| RC2 | `api.constructs.network/v1/constructs` returns empty — F41-pattern; discovery never ran against current env | DB / ingest pipeline |
| Gap | sprawl-world PR #39 (constructs-network adoption) merged to `bridge/freeside-dashboard-truthing`, NOT `main`; `sprawl-world/origin/main` has diverged on AWS ECS arc | sprawl-world branch topology |

Minor code hygiene: `/v1/constructs/summary` throws 500 on empty reducer (not-blocking; filed for future).

Two accuracy flags against cycle-007 findings:
- §9 pending-actions claim *"Vercel dashboard repoint completed by operator mid-cycle"* — alias `www.constructs.network` never actually moved
- §7 claim *"sprawl-world IS the reference implementation of worlds-vs-lenses"* — holds on `bridge/freeside-dashboard-truthing` only; `main` diverged

---

## 2 · Operator direction (2026-04-24, post-triage)

> *"See if we can migrate constructs over to the freeside and also freeside over to the freeside as upcoming cycle and fixing the freeside itself to a future session."*

Reshapes the fix from **spot-patch Vercel + curl discovery** to **structural migration to freeside as host**.

This aligns with [[freeside-vision]] (*"Sovereign Vercel: deploy worlds, compose modules, vibe-code on shared infra"*) — constructs.network becomes a deployment validation case; freeside-dashboard self-hosting is the ultimate dogfood.

---

## 3 · Cycle-009 candidate — freeside-as-host migration

### 3.1 · Scope (proposed, one cycle, two targets)

| Target | Move | Blast radius | Prerequisite |
|---|---|---|---|
| **constructs.network** | `sprawl-world:apps/constructs-network` deploy via freeside (not Vercel). `www.constructs.network` alias reassigned | DNS + Vercel retirement + freeside deploy surface | sprawl-world `main` branch topology resolved first (Finding Gap above) |
| **freeside-dashboard** | freeside-dashboard app deploys via freeside itself (self-hosting) | Highest — bootstrap-loop; if freeside is down, freeside can't redeploy | constructs.network migration validates the path first |

Two migrations, same cycle, sequenced (constructs.network first → freeside self-host second).

### 3.2 · What this closes

- sprint-bug-66 (superseded by migration — the Vercel path that breaks was the thing being retired anyway)
- cycle-007 §12.3 P1#2 (constructs-network sync) — permanent prevention is freeside hosting + freeside-native registry ingest hooks
- cycle-007 §9 pending-action #3 (Vercel repoint verify) — Vercel retired entirely
- Finding A (cycle-007 close claim drift) — no Vercel remaining to drift
- Finding Gap (sprawl-world branch divergence) — must be resolved as migration prerequisite

### 3.3 · What this opens

- **Dogfood validation at 2 apps** — freeside proves it can host real THJ surfaces
- **Registry-ingest freeside-native** — P1#2's webhook + cron land as freeside services, not loa-constructs/apps/api additions
- **Template for P1 onward** — Rektdrop, other sprawl apps migrate once pattern validates

### 3.4 · Open questions for cycle-009 SEED drafting

1. Does freeside have deploy-app capability today, or is THAT the gate? (Need freeside-vision current-state audit before cycle-009 SEED)
2. DNS cutover sequencing — atomic alias swap or staged (green/blue)?
3. sprawl-world `main` branch resolution — fast-forward from `bridge/freeside-dashboard-truthing`, rebase, or merge? (Discovery for cycle-008 close or cycle-009 L-0)
4. Freeside-on-freeside bootstrap — first deploy through existing infra, subsequent through self? (Chicken-and-egg pattern needs explicit plan)

---

## 4 · Deferrals (explicit)

| Item | Defer to | Why |
|---|---|---|
| sprint-bug-66 implementation (Vercel repoint + discovery curl) | obsolete — migration supersedes | Don't patch what's being retired |
| Direct freeside bug-fixes / freeside-state issues | **future session** (explicit operator direction) | Out of scope for cycle-008; needs its own scoping |
| `/v1/constructs/summary` 500-on-empty | cycle-009+ hygiene pass | Non-blocking cosmetic |
| 3 stale Vercel projects cleanup (`loa-constructs-explorer`, `-5bfi`, `constructs-web`) | cycle-009 migration close (post-cutover) | Delete after aliases reassigned |
| cycle-007 §9 pending-action close updates | cycle-008 L-close | Findings amendment with current accurate state |

---

## 5 · Cycle-008 P1 stack revision (supersedes cycle-007 §12.3 for forward work)

| Priority | Item | Notes |
|---|---|---|
| **P1** | cycle-008 freeside-pilot (this cycle's core) | Proceeds as designed; baseline-capture mode updated per operator (agent-browser + 3-app inventory/tokens scan) |
| **P1** | cycle-008 P1#1 root-app-migration (sprawl-world Rektdrop → apps/rektdrop/) | Separate SEED; companion leg; needed for cycle-009 D1 |
| **P1-promoted** | **cycle-009 freeside-as-host migration** (constructs + freeside self-host) | Was P1#2 "constructs-network sync"; scope expanded + method pivoted from webhook+cron to hosting-migration |
| P2 | sprawl-world `main` branch topology resolution | Prerequisite for cycle-009; can resolve mid-cycle-008 or cycle-009 L-0 |
| P3 | Direct freeside-state fixes | Deferred to future session per explicit operator direction |
| P3 | cycle-009 hygiene (summary-500, Vercel-stale-cleanup, cycle-007 findings amendments) | Tidy at cycle-009 close |

---

## 6 · What this leg leaves cycle-008 with

- Bug triaged, sprint filed (superseded-by-cycle-009 status pending)
- Migration queued, scoped, open-questions named
- Deferrals explicit
- P1 stack updated
- Cycle-009 SEED has a cold-start brief (§3 above) when operator is ready

cycle-008 dispatch resumes with L-ground Part 5 (baseline capture via `/agent-browser` + inventory/token scans, 3 apps) — minus constructs.network until migration (but Rektdrop + Freeside captures unblocked).

---

*L-bug-triage-and-migration-queue — 2026-04-24. Conversational leg emergent from operator /bug invocation. No implementation; scoping + deferral only.*
