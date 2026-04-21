---
author: OSTROM (the-arcade, ARCH lens)
mode: ARCH
lens: infrastructure-first / schema-emerges
date: 2026-04-21
composes_with:
  - grimoires/bridgebuilder/auto-sync-architecture.md
  - grimoires/bridgebuilder/context/construct-dx-universal-fix.md
  - ~/hivemind/strategy/construct-network-feedback-2026-04-20.md
  - ~/hivemind/wiki/concepts/riding-loa-endgame.md §12 (5-layer composition stack)
  - ~/hivemind/wiki/concepts/agent-native-civic-architecture.md §1
confidence: 0.75
---

# loa-constructs Infrastructure Architecture — OSTROM Report
## Infrastructure closes the friction. Schemas emerge as a byproduct.

---

## §1 · Current infrastructure inventory (what is actually deployed)

The repo is a Turborepo (`turbo.json`, `bun.lock`) with one API deployed to Fly.io and one explorer deployed to Vercel. The data lives in one Postgres (via Drizzle, 9 migrations in `apps/api/drizzle/`). Packs on disk under `~/.loa/constructs/packs/` — 29 installed locally.

**Current data-flow diagram (ASCII):**

```
                  ┌──────────────────────────────────────────┐
                  │  0xHoneyJar org  (GitHub, mixed vis)     │
                  │  construct-*  repos  (~30)               │
                  └───────────────┬──────────────────────────┘
                                  │ push / tag
                                  ▼
             ┌──────────────────────────────────────────┐
             │  MANUAL:  seed-forge-packs.ts            │   GIT_CONFIGS hardcoded
             │  GIT_CONFIGS dict (scripts/seed-…:137)   │   new repo ⇒ code edit + run
             └───────────────┬──────────────────────────┘
                             │ clone → parse YAML → DB
                             ▼
┌───────────────────┐    ┌────────────────────────────────────┐
│  GitHub webhook   │───▶│  apps/api (Fly.io: loa-constructs- │
│  /v1/webhooks/    │    │  api.fly.dev)                       │
│  github           │    │  Hono + Drizzle + Postgres          │
│  (webhooks.ts:381)│    │                                     │
└───────────────────┘    │  Routes: constructs.ts (476),       │
                         │  packs.ts (2050), admin.ts (1052),  │
                         │  webhooks.ts (689), +signals/teams/ │
                         │  submissions/creators (see app.ts)  │
                         └───────────────┬────────────────────┘
                                         │ REST /v1/*
                                         ▼
                         ┌────────────────────────────────────┐
                         │  apps/explorer (Vercel)             │
                         │  Next.js 15, Dynamic SDK wallet,    │
                         │  TanStack Query, Convex (auxiliary) │
                         └───────────────┬────────────────────┘
                                         │ npx constructs add <slug>
                                         ▼
                         ┌────────────────────────────────────┐
                         │  User machine                       │
                         │  ~/.loa/constructs/packs/<slug>/    │
                         │  installed via .claude/scripts/     │
                         │  (constructs-install.sh +           │
                         │   construct-index-gen.sh)           │
                         └────────────────────────────────────┘
```

**What's deployed (live):** `api.constructs.network` (Fly.io), `constructs.network` (Vercel explorer), Stripe webhooks, GitHub webhook signature-verification on `/v1/webhooks/github`.

**What's local-only / manual:** `seed-forge-packs.ts` (requires `DATABASE_URL`; GIT_CONFIGS at `scripts/seed-forge-packs.ts:137-198` hardcoded), `discover-constructs.ts` (diagnostic, read-only), webhook *configuration* (users must manually paste a secret into GitHub Settings — `webhooks.ts:670-684` returns instructions, never configures).

**What exists but is unused at scale:** visibility columns (`schema.ts:567` — `constructVisibilityEnum` already shipped in migration 0008), `submissionSource` provenance (`schema.ts:569`), `constructIdentities` table (personas/expertise), `composition_paths/governs/governed_by` on manifests (`constructs.ts:91-93` formats them already, but nothing mines them).

---

## §2 · Gap-to-operation map

Operator's three stated constraints → minimum-viable infrastructure changes, priority-ordered:

| Constraint | Gap | Minimum operation | Files / endpoints |
|---|---|---|---|
| "DB not hooked up" | `seed-forge-packs.ts` requires interactive `DATABASE_URL` + `GIT_CONFIGS` code-edits | Trigger `POST /v1/admin/discover` (new) that runs org-scan + upsert from the deployed API | `admin.ts` + `services/discovery.ts` (new) |
| "Private/public friction" | `visibility` column exists but no webhook listens for `repository` events (`private→public` flip) | Add `repository.privatized`/`publicized`/`renamed` handler to `webhooks/github`; demote-only guard already in `guardVisibilityTransition` (`webhooks.ts:575`) | `webhooks.ts` |
| "Syncing friction" | Only push-to-default-branch + tag-create events synced (`webhooks.ts:455-464`) | Add scheduled scan (Fly cron / GitHub Action) that catches repos missed by webhooks; surface via `admin.ts` analytics | `scripts/scheduled-scan.ts` + admin route |

Priority order: **(1) admin discover endpoint** — unblocks operator-driven sync without code edits. **(2) repo-visibility webhook handler** — eliminates manual re-sync after `gh repo edit --visibility public`. **(3) scheduled scan** — last-resort catch-up.

Everything else listed in yesterday's 8-axis feedback (observability, territory, corpus) is *schema that emerges* from these three operations, not a prerequisite.

---

## §3 · Private→public migration architecture

Operator decision: willing to flip private repos public. The friction is eliminated *by removing the branch*, not by designing elaborate auth.

**Migration rule set:**

1. **Ranked flip order** — low-sensitivity first, high-sensitivity last.
   - Tier A (flip first): construct-* packs that are already documented publicly (artisan, k-hole, observer, the-arcade, protocol). These are the 10 in `GIT_CONFIGS`.
   - Tier B (flip second, after secret sweep): construct-dynamic-auth, construct-hardening, construct-herald — touch identity but no secrets inside the construct repo itself.
   - Tier C (stay private): `construct-freeside` (per its `construct.yaml:11 visibility: private` — infra secrets, AWS module refs, `loa-freeside` is separately licensed), any repo that references unreleased brand IP or contains wallet-logic specs.

2. **Pre-flip sanitization checklist** (one-time per repo):
   - `trufflehog git file://. --only-verified` (CI already has `.trufflehog.yaml` at repo root — reuse).
   - grep for `process.env.*_SECRET|_KEY|_TOKEN|DATABASE_URL` in `scripts/` and `skills/`.
   - Ensure no `.env.example` references internal-only Vercel/Fly app names unnecessarily.
   - Confirm `LICENSE` exists (construct-base template already ships MIT).

3. **Registry-side effects when a flip happens:**
   - Existing webhook fires `repository` event → new handler calls `syncFromRepo` with refreshed `visibility` → `guardVisibilityTransition` (`webhooks.ts:575`) allows **public → public** and **private → public** but blocks **public → private** silently (demote-only, preserves external consumers).
   - `discovered_at` remains immutable; `auto_discovered` flips to true if this repo was never in `GIT_CONFIGS`.

4. **Webhook reconfiguration on flip:** no action needed — the org-level webhook (once configured per §4) fires on ALL `construct-*` events regardless of visibility because GitHub org-webhooks receive events for private and public repos when installed as an App.

**Auth-for-private becomes optional.** The auto-sync-architecture doc called for `gh api orgs/…/members/{user}` caching (`auto-sync-architecture.md:82-83`). Under the public-first migration, that entire branch is deferred — only the `internal` visibility tier survives, and it's operator-only via existing admin auth.

---

## §4 · Auto-sync implementation plan (translation layer)

Concrete translation of `auto-sync-architecture.md` into endpoints + env vars + scopes.

**New endpoints:**

| Route | Method | Purpose | Files |
|---|---|---|---|
| `/v1/admin/discover` | POST | Manual trigger of org-scan + upsert. Returns `{discovered, updated, unchanged}`. | `admin.ts` + `services/discovery.ts` (new) |
| `/v1/admin/discover/dry-run` | POST | Preview mode; no writes. | same |
| `/v1/webhooks/github` (existing) | POST | Add handlers for `repository` (create/rename/archived/visibility_change) events. Currently only handles `push` + `create` (`webhooks.ts:429-431`). | `webhooks.ts` |

**Required env vars (additions, on Fly):**

- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` — for org-scan at scale. Minimum scope: `metadata:read` + `contents:read` (public repos) + `administration:read` (private repos, only if we keep any Tier-C). **GITHUB_TOKEN (PAT) is sufficient for Tier-A-only** and simpler; start there.
- `DISCOVERY_CRON_SECRET` — Fly `[[services.scheduled_tasks]]` guard.
- `CONSTRUCTS_ORG` already consumed at `seed-forge-packs.ts:33`; reuse.

**Rate limits:** GitHub API = 5,000 req/hr authenticated. 30 repos × 2 calls (contents + repo) ≈ 60 req per scan. At 6-hour cadence = 240 req/day. Well under the limit; no backoff strategy needed for v1.

**6h scan cost:** ~60 API calls × 1 DB upsert each = ~60 writes per scan = negligible. Fly machine stays warm; no cold-start penalty.

**Webhook configuration — the real friction:** today `POST /v1/webhooks/configure` (`webhooks.ts:637-689`) returns **instructions** — a secret to paste manually into each repo's Settings. Under org-level webhook installation via GitHub App, a single install covers all `construct-*` repos forever. This is the single-biggest DX win and should be the first sprint deliverable after §3's flip ritual.

---

## §5 · Freeside integration (scaffold, not implementation)

Reading `~/Documents/GitHub/construct-freeside/construct.yaml`: Freeside is AWS infra (ECS + EFS + S3 + CloudFront). Its construct ships as `visibility: private`. It is **not a payment rail** — it's a *deployment* construct. Therefore the "Freeside integration for charging" the operator mentioned is either (a) misattribution — charging goes through Stripe (already wired, see `webhooks.ts` Stripe handlers) — or (b) a future Freeside module that doesn't exist yet.

**Assuming (a): charging stays on Stripe.** The scaffold becomes:

- **Creator Stripe Connect flow (exists):** `services/stripe-connect.ts` + `webhooks.ts:166-191` (`account.updated`). Creator can already onboard.
- **Paid-tier construct flag:** extend `construct.yaml` schema with `tier: free | pro | team | enterprise` (already in `packs.tierRequired` column at `schema.ts:532` — just expose via manifest sync). No new infra.
- **Download gating:** `packs.ts` (2050 lines) already has tier-gating on install routes; wire the manifest-declared `tier` to `packs.tierRequired` at sync time.
- **Payout flow:** `services/payouts.ts` exists. Untested end-to-end; confirm with an internal round-trip before publicizing.
- **What flows between networks:** nothing bidirectional. Freeside is downstream of constructs.network — a world deploys a construct, constructs.network ships it, Freeside hosts the deployed-world's runtime. No shared state.

**If (b): Freeside becomes a payment backend,** that is a *full new construct* and out of scope for this seed. Flag for follow-up: operator should clarify during Bonfire review.

---

## §6 · #184 spawn-context protocol (pick: L1 + L2 hybrid)

The four proposed solutions for "spawned agents don't inherit SKILL.md":

- **L1 — prompt-injection** (pass rules in spawn prompt): simple, no framework change, but operator must remember to include. High friction.
- **L2 — rules-based** (a `spawn-context.md` the framework auto-injects): low friction after wiring, but requires framework cooperation.
- **L3 — construct-aware spawning** (spawner reads the construct of its parent): elegant but deep; requires Claude Code internals we don't control.
- **L4 — hook enforcement**: blocks errant spawns; reactive not proactive.

**Pick: L1+L2 hybrid.** L2 as the primary (`.claude/spawn-context.md` auto-read on subagent start via a UserPromptSubmit hook on the parent) with L1 as the emergency escape hatch for cross-session invocations. L3 is the long-arc correct answer but depends on Claude Code evolution.

**Scope:** 1 hook file (`~/.claude/hooks/spawn-context-inject.sh`), 1 schema doc (`~/.claude/spawn-context.md`), 1 rule addition to `CLAUDE.loa.md` declaring MUST-SPAWN-1.

---

## §7 · The schema emergence principle (what schemas derive from closing the gaps)

Infrastructure-first lens: what schemas **naturally emerge** from the operations in §2, §3, §4?

| Operation closed | Schema that emerges (not designed ahead) |
|---|---|
| `POST /v1/admin/discover` (§4) | A `discoveries` audit row: `{scanned_at, repo, visibility, had_manifest, registered, new}`. Emerges because we need to debug which repos are silently skipped. |
| Org-webhook `repository` event handler (§3, §4) | `visibility_transitions` log: `{pack_id, from, to, at, source}`. Emerges because compliance/debugging demands a trail, not because we planned it. |
| Public-first migration (§3) | `governance_layer: public | internal | private` becomes a direct mirror of GitHub repo visibility — not a separate field. The civic-layer split (`agent-native-civic-architecture.md §1`) *maps* to this but doesn't originate it. |
| Scheduled scan (§4) | `sync_runs` metric: `{cron_ts, repos_scanned, drift_count}`. Emerges as ops telemetry. |
| Installer index-fix (`construct-dx-universal-fix.md`) | `manifest_source: yaml | json | both` tag on every pack install. Emerges because we need to know which path generated the local manifest. |

**What does NOT emerge from infrastructure alone** (schemas that still require design work): `writes_to`/`reads_from`/`compose_with` territory declarations (yesterday's Axis 2), `governance_layer: system|participation` distinction, `feedback-v3` corpus emission (Axis 7). Those are *doctrine* — the infrastructure enables them, but they require a separate authoring pass informed by the emergence data collected above.

This is the **infrastructure-first covenant**: ship the plumbing, collect the drift, *then* crystallize the schemas from observed patterns rather than inventing them prospectively.

---

## §8 · Triaging yesterday's 8 axes under infrastructure-first lens

| Axis (yesterday) | Classification | Justification |
|---|---|---|
| 1 · Observability per invocation | **Infrastructure — sprint now** | Hook + JSONL trajectory. No schema design needed beyond "append-only log". |
| 2 · Territory declaration | **Doctrine — defer** | Requires observing real conflicts before schema is justified. |
| 3 · Civic-layer (system vs participation) | **Doctrine — already captured in hivemind** | `agent-native-civic-architecture.md §1` is canonical. Not code. |
| 4 · Invocation vocabulary tiers | **Doctrine — defer** | No infrastructure blocker. |
| 5 · Orchestration router | **Schema emerges — defer** | Needs Axis-1 trajectory data to design against reality. |
| 6 · Composition recipes | **Infrastructure — sprint-adjacent** | `compose_with` already in manifest format (`constructs.ts:91`); `.claude/constructs/compositions/*.yaml` is a cheap file-system convention. Could ship alongside §4 since it only needs read-path. |
| 7 · Uniform corpus emission (feedback-v3) | **Infrastructure — sprint now** | One wrapper script, one JSONL convention. Biggest RL-horizon leverage per `riding-loa-endgame §12 L5`. |
| 8 · Micro/macro loop separation | **Schema emerges — defer** | Needs Axis-1 + Axis-7 data first. |

**Infra-first sprint absorbs**: axes 1, 6, 7 + §2 operations. The rest waits for the data this sprint will generate. This is exactly the "close infrastructure → schemas emerge" principle in action.

---

## §9 · 5-leg sprint decomposition (seed input for OTLET)

Each leg: scope, files touched, acceptance, risk.

### Leg A — `POST /v1/admin/discover` endpoint
- **Scope:** port `discover-constructs.ts` logic (`scripts/discover-constructs.ts:60-132`) into `services/discovery.ts`; expose behind admin auth at `admin.ts`.
- **Files:** `apps/api/src/routes/admin.ts`, `apps/api/src/services/discovery.ts` (new), one migration for `discovery_runs` table.
- **Acceptance:** operator curls `/v1/admin/discover` and all `construct-*` repos (missing from `GIT_CONFIGS`) appear in DB with `auto_discovered: true`, `status: 'discovered'`.
- **Risk:** GitHub rate limit (mitigated: §4); drift between `discover-constructs.ts` and the service (mitigated: delete the script after migration).

### Leg B — public-first flip ritual + `repository` webhook handler
- **Scope:** run the §3 checklist on Tier-A repos; flip; extend `webhooks.ts:381` to handle `repository.{privatized,publicized,renamed}`; add `visibility_transitions` log.
- **Files:** `apps/api/src/routes/webhooks.ts`, new migration.
- **Acceptance:** `gh repo edit 0xHoneyJar/construct-X --visibility public` produces within 10s: webhook fires, DB `packs.visibility` updates, `visibility_transitions` row written.
- **Risk:** webhook miss on first flip (org-install not complete) — mitigation: Leg A's discover endpoint is the safety-net.

### Leg C — `construct.yaml` as primary source (DX universal fix)
- **Scope:** implement `construct-dx-universal-fix.md` Fix 1, 2, 3 at `.claude/scripts/` layer.
- **Files:** `.claude/scripts/construct-index-gen.sh`, `.claude/scripts/constructs-install.sh`, `.claude/scripts/construct-resolve.sh`.
- **Acceptance:** user `git clone`s a construct into `~/.loa/constructs/packs/`, `constructs-install.sh list` shows it indexed without a manual `manifest.json`.
- **Risk:** scope leak into Loa framework — keep to the three-file patch documented in `construct-dx-universal-fix.md:27-69`.

### Leg D — Axis-1 trajectory emission
- **Scope:** wrapper script `.claude/scripts/construct-invoke.sh` logs entry/exit JSONL to `.run/construct-trajectory.jsonl`. Rewire `/feel`, `/dig`, `/systems` commands through it.
- **Files:** `.claude/scripts/construct-invoke.sh`, CLAUDE.loa.md pointer update.
- **Acceptance:** one construct invocation produces one labeled entry row + one exit row with cost + tokens + verdicts.
- **Risk:** emission bloat — mitigate via log rotation + per-cycle archival.

### Leg E — feedback-v3 emission convention (Axis 7)
- **Scope:** define schema (one file), ship a validator, update ALEXANDER + KEEPER + STAMETS to emit. Do NOT boil the ocean — three personas prove the loop.
- **Files:** `.claude/schemas/feedback-v3.schema.json`, a bats test, minor edits to three SKILL.md files.
- **Acceptance:** a FEEL session produces one feedback-v3 row that passes schema validation and is queryable via `jq`.
- **Risk:** three-persona limit is deliberate; DO NOT expand in this sprint.

**Sequencing:** A and B can parallelize (different systems). C can parallelize with both (different subtree). D depends on nothing structural but should land after A so trajectory can tag discovery events. E depends on D's JSONL convention.

**Out of scope (deliberately):** orchestration router (Axis 5), territory declarations (Axis 2), micro/macro loops (Axis 8). These wait for the data D+E produce. That wait is the infrastructure-first covenant.

---

*End OSTROM report. 2026-04-21. Confidence 0.75. Awaits composition with VIRTUE (doctrine), WEAVER (schema-emergence review), and OTLET (SEED synthesis).*
