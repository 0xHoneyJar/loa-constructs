# Cycle-002 Findings — Artisan Lifecycle Walk (in-flight)

> **Date**: 2026-04-21 (live scribe, session ongoing)
> **Branch**: `feat/spiral-loa-constructs-cycle-002-artisan-walk` → merged to main via PR #191
> **Mode**: Paired scribe-session (operator: zkSoju, scribe: Claude)
> **SEED**: `cycle-002-SEED-artisan-lifecycle-walk.md`

---

## Pre-walk grounding (step 0)

Before step 1, I scouted live state to avoid speculation:

- `constructs.network/constructs` renders *"No public constructs available"*
- `api.constructs.network` is LIVE (HTTP 200)
- `GET /v1/constructs?per_page=5` → `{ pagination: { total: 0 } }`
- `gh repo list 0xHoneyJar` → 21 public `construct-*` repos (confirmed existence)
- `artisan` repo is ALREADY public (no flip needed for step 1)

**Immediate finding pre-walk**: the expected flow is "flip → observe discovery → observe explorer." But artisan is already public, packs table is empty, and 21 public `construct-*` repos exist unseeded. This means **step 1 shifts from "flip and observe webhook" to "why is the already-public infrastructure not registering the already-public repos?"**

---

## Findings surfaced (each closes or generates a leg)

### F10 → REVISED (not what we thought)

**Original claim**: "Construct network has zero operational bootstrap."

**Actual state**: `.github/workflows/discover-constructs.yml` exists and runs **daily at 06:00 UTC**. Last 10 runs all completed `success`. So automation exists.

**But**: prod `packs` table remains empty. The workflow invokes the OLD `scripts/discover-constructs.ts` (flagged for deprecation in cycle-001 SEED §5 / §14.3), not the new `POST /v1/admin/discover` endpoint. The old script either:
- Has the same pagination bug F15 describes (only page 1 → 0 construct-* matches)
- Writes to wrong environment / missing DB creds in CI
- Exits with zero-new without writing

**Revised finding**: F10a — old script runs daily but produces no registry state. F10b — new endpoint never called. Both have the same *effect* (empty table).

**Closed by**: cycle-002 L0 + F15 fix + operator invocation via `POST /v1/admin/discover`.

### F11 · Backend still on Dynamic Labs despite sovereign pivot

Hivemind `[[freeside-as-identity-spine]]` + `[[sign-in-with-thj]]` records operator's 2026-04-13 declaration: *"we should not be using dynamic; we're building from the bottom up, so I think we should use better auth."*

`apps/api/src/middleware/auth.ts:168` still calls `verifyAccessToken(token)` — Dynamic JWT verification. 7 THJ apps audited per `[[sign-in-with-thj]]`, 6 still on fragmented Dynamic versions (v4.41–v4.67), 1 on SIWE+Turso (Freeside Dashboard). Constructs.network is on the unmigrated pile.

**Status**: Pull-thread → cycle-003 candidate. L0 defers this by providing a parallel ops-only surface.

### F12 · Admin JWT opaque to operators

The operator logged into `constructs.network` but had no way to access their JWT for API calls. The Dynamic cookie is domain-scoped to `auth.0xhoneyjar.xyz` — operators must manually extract via browser DevTools. No UI surface exposes tokens, no API key creation flow for admin accounts.

**Status**: Pull-thread, bundled with F11.

### F13 · BRIDGEBUILDER review doesn't run typecheck

Running `bun run typecheck` on cycle-001's merged code (pre-fix) produces compile errors in:
- `src/routes/webhooks.ts:680` — `Promise<GuardResult>` assigned to `SQL<unknown>`
- `src/services/discovery.ts:256` — missing `ownerId` in insert overload
- `src/services/stripe.ts:61` — hardcoded Stripe API version mismatch

BRIDGEBUILDER's 0-actionable review on PR #190 **approved the diff without compiling it**. Review reads code semantically, not structurally.

**Status**: Lens-gap. Update `cycle-001-review-lens.md` v2 in cycle-003 to add a **COMPILE lens** — reviewer MUST run `bun run typecheck` before approval.

### F14 · mock-db missing `.execute()`

`DEV_MOCK_DB=true` local dev mode couldn't run discovery because `discovery.ts` calls `db.execute(sql\`...\`)` for raw SQL (discovery_runs insert), and `mock.ts` didn't implement `execute`. Every local dev run of the admin endpoint returned `db.execute is not a function`.

**Status**: Closed by inline patch in `apps/api/src/db/mock.ts` (F15 commit).

### F15 · `fetchOrgRepos()` fetches only page 1

The load-bearing bug. `discovery.ts:70` issued `GET /orgs/{owner}/repos?type=all&per_page=100` — no pagination loop. 0xHoneyJar has 278 repos; `construct-*` names live on pages 2-3. Result: every scan against 0xHoneyJar returned 0 results.

**Verified locally**:
```
page 1 of 0xHoneyJar: 0 construct-* matches
page 2:               1 match
page 3:              34 matches
```

**Status**: Closed by paginated loop in `fetchOrgRepos` (commit `c867b264`). Verified end-to-end via local mock-db — scan now returns 35 constructs, 31 new.

### F16 · Old `scripts/discover-constructs.ts` + CI workflow — diagnosis deferred

The daily CI workflow that "should" populate prod runs against the old pre-cycle-001 script. Needs separate diagnosis:
- Does it have the same pagination bug?
- Does it have DB write creds in CI?
- Does `--register` flag actually upsert to the Supabase prod DB or to a different env?

**Status**: Pull-thread. L0 + new endpoint bypasses this entirely; old script + CI workflow flagged for deprecation in cycle-003 once new flow is proven.

### F17 · Cycle-001 migrations never registered in Drizzle journal

`apps/api/drizzle/0012_discovery_runs.sql` and `0013_visibility_transitions.sql` are bare SQL files. `apps/api/drizzle/meta/_journal.json` stops at `0008_cycle_038_visibility`. Migrations 0009, 0010, 0011, 0012, 0013 are not in the journal, so `drizzle-kit migrate` won't apply them.

**Compounding**: `.github/workflows/run-migrations.yml` last ran in Feb 2026 — **both runs failed**. Prod DB schema has been stuck at migration 0008 for ~3 months. Cycle-001's schema additions (discovery_runs, visibility_transitions, trust_level column) exist only in committed SQL files, never in the database.

**Status**: Pull-thread → cycle-003 migration hygiene cycle OR immediate ops fix.

### F18 · Pooler tenant-resolution error on discovery write path

Invoking `POST /v1/admin/discover` against prod with ops token results in:

```
(ENOTFOUND) tenant/user postgres.ccrjfpzdgiuqqwmmgrap not found  [HTTP 500]
```

The same deployment's read path (`GET /v1/constructs`) works fine (HTTP 200, returns `{total:0}`). So the connection succeeds for Drizzle's `.select()` but fails when `.execute(sql\`...\`)` fires. Possible causes:
- Supabase pooler auth context differs for raw SQL vs prepared statements (despite `prepare: false`)
- DATABASE_URL has a tenant reference that's been renamed/rotated
- Connection pool splitting: read pool healthy, write pool unhealthy
- Transient DNS flap (unlikely — reproducible)

**Status**: Blocking. Cycle-002 walk cannot proceed past this without either ops-side diagnosis (check Railway env + Supabase project status) or code fix (investigate why `.execute()` triggers different connection behavior).

---

## Landing state (2026-04-21 session close)

**Shipped on main** (via merge of PR #191 which carried PR #190):
- Cycle-001 infrastructure (admin.ts, webhooks.ts, discovery.ts, migrations, construct-invoke.sh, feedback-v3 schema, compositions, polar stubs)
- Cycle-002 L0 (operational-token middleware + audit wiring + 8 vitest cases)
- Cycle-002 F15 fix (discovery pagination)
- Cycle-002 F14 fix (mock-db execute stub)

**Deployed to Railway prod**:
- Commit `843beb06` LIVE
- `CONSTRUCTS_ADMIN_TOKEN` set
- L0 verified working (operational token accepted, admin context synthesized, logged)
- F15 verified working (service code reaches pagination logic)

**Blocked on prod**:
- Discovery write path (F18)
- Migrations (F17) — discovery_runs / visibility_transitions tables likely do not exist on prod

**Experience delivered**:
- Operator experienced before/after of L0+F15 on local mock-db: 0 → 35 constructs discovered
- Operator experienced prod deploy + env var workflow end-to-end
- Operator experienced the next layer of friction (F17/F18) — which is load-bearing intel for cycle-003

---

## Emergent legs (reclassified from SEED §5 draft)

| Leg | Original status | Revised status |
|---|---|---|
| **L0** (operational token) | New, not in original SEED | **SHIPPED** in PR #191, commits 6cf92ba1 + c867b264 |
| **L1** (seed packs + unbreak explorer) | SEED §5 marked CERTAIN | Closed by running discover against prod with ops token (pending deploy) |
| **L2** (ALEXANDER SKILL.md emission) | CERTAIN | Still pending — requires step 7 walk |
| **L3** (`construct-install-roundtrip.bats`) | LIKELY | Still pending — requires step 6 walk |
| **L4** (explorer data-pipeline fix) | LIKELY | Likely unnecessary — F15 fix may have been the only data-pipeline bug; defer validation to post-deploy |
| **L5** (move polar stubs to loa-freeside) | LIKELY | Still pending — carryover from cycle-001 Leg G |
| **L6** (soft-nudge naming) | POSSIBLE | Still pending — requires step 1 walk against external orgs |
| **L7** (KEEPER/STAMETS SKILL.md) | CONDITIONAL | Deferred to cycle-003 (three-persona discipline per operator) |
| **L8** (seed-forge decommission) | DEFERRED end-of-cycle | Still deferred |

---

## Meta-observations

### Experience-first cycle composition is working

In ~30 minutes of paired scribe-walk + local implementation, we surfaced:
- F10 (revised) — operational-bootstrap gap is actually two layered failures
- F13 — systemic review-lens gap
- F14 — local-dev mode is broken for new features
- F15 — a load-bearing production bug invisible to three-model BRIDGEBUILDER review

**None of these showed up in cycle-001's autonomous 51-minute harness cycle.** The `0 actionable, 0 non-actionable` BRIDGEBUILDER verdict on PR #190 was a false-negative across all four findings.

This validates §11 of the cycle-002 SEED: *"legs emerge from operator experience rather than architectural decomposition."*

### Operator as experience ground-truth

The walk has been driven by the operator's *felt* questions ("how do I get a JWT?", "where's the 'No public constructs' bug?", "are we overcomplicating auth?") rather than SEED pre-decomposition. Each question collapses into a concrete diagnosis + fix or pull-thread.

### OSTROM architecture addendum (owed)

Per cycle-002 SEED §9 decision ("Yes — write an OSTROM addendum"), after the walk completes I owe an OSTROM-lens pass that translates F10/F11/F13/F14/F15/F16 into architectural implications. Drafted in the next session.

---

## Remaining walk steps (to complete)

- [ ] **Step 2** — AC-A5 preservation (needs real DB, will execute against prod post-deploy)
- [x] **Step 3 (partial)** — explorer fetch confirmed broken pre-walk; expected to resolve post-discovery
- [ ] **Step 4** — install artisan on fresh env (blocked until registry is populated)
- [ ] **Step 5** — edit locally
- [ ] **Step 6** — upgrade with edit (AC-C4 three-way-merge)
- [ ] **Step 7** — invoke `/feel` + observe trajectory
- [ ] **Step 8** — compose artisan + observer

---

*Rolling document. Ships with PR #191 or follow-up. Updated as the walk proceeds.*
