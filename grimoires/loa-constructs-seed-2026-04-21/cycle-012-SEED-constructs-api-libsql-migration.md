# SEED — Cycle-012 · constructs-api sovereign-landing · libSQL migration + dormant-surface prune

> *"I didn't know our API was this complicated. We don't actually use that much in this other than really serving users their own data. I think that a lot of the API surface may be outdated compared to where we're at now with how contracts are even listed on the network and how that all works."* — operator dispatch 2026-04-23
>
> *"Turso managed until we move things into freeside for the final clean migration. Fresh start on libSQL — accept loss on historical data. Dormant routers: delete outright."* — operator amendment 2026-04-23 (cycle-012 pre-dispatch)
>
> **Status**: Draft · Ready for operator dispatch · Awaiting SEED amendment pass
> **Date drafted**: 2026-04-23
> **Supersedes**: no prior SEED (new cycle-012 scope). References [[saas-exit-vectors]] (instance-1 evidence) filed 2026-04-23.
> **Doctrine composition**: [[saas-exit-vectors]], [[sovereign-stack]], [[freeside-vision]], [[tool-absence-as-enforcement]], [[naming-is-diagnostic]], [[constructs-as-packages]], [[builder-touch-imperative]], [[half-done-infrastructure-migration]] (antipattern to avoid), [[resilience-is-remembering]] (supersede; do not delete lore even if we delete code)
> **Dispatch mode**: `/simstim` · full HITL cycle · operator-solo (no Jani pairing required)
> **Branch**: `feat/spiral-loa-constructs-cycle-012-api-libsql-migration` (cut from current `feat/spiral-loa-constructs-cycle-010-freeside-cli-ui-substrate` OR `main` depending on cycle-010 close state at dispatch)

---

## 0 · Why this cycle exists

Four convergent signals from 2026-04-23 diagnostic session:

1. **The prod API's DB is hostage.** `ccrjfpzdgiuqqwmmgrap` (Supabase project) is paused behind an org-level billing hold (*"Failed to restore project: This organization has unpaid invoices"*). Multiple THJ projects affected. The `/v1/constructs` endpoint returns HTTP 200 `data: []` because the API swallows `PostgresError XX000 FATAL` silently and falls back to empty responses. constructs.network has been showing "No constructs" for this reason — not a render bug, not an auth bug, a dead DB the API was lying about. Captured in [[2026-04-23-supabase-billing-hold-recovery]] session record.

2. **The live API surface is a tiny fraction of what's registered.** 20 routers register; ~12 endpoints actually get traffic (from CLI `loa-registry` + UI `constructs.network` + operational `admin/discover`). Dormant surface: subscriptions, webhooks, teams, creator(s), analytics, audit, signals, public-keys, docs — **zero traffic**, captured in grep of real call-sites. Schema: 30 tables / 1,401 lines, of which ~8 tables are reachable from the live surface. Migrating faithfully preserves tech debt; pruning first is the structurally correct move per [[tool-absence-as-enforcement]].

3. **The operator's mental model shifted: namespace IS registry.** Discover pulls `construct-*` repos from GitHub; submission/curation/review tables are remnants of an older product frame that no longer matches reality ([[constructs-as-packages]] — "packs are opt-in installs"). The API's job is to index + serve what `discover` has written, not to orchestrate a submission workflow. This reframes migration scope: the new schema represents the *current* product, not a faithful copy of the legacy one.

4. **Strategic alignment: sovereign-stack, no billing-hold attack surface.** Landing on libSQL (Turso managed now; self-host on Freeside later) removes the structural vulnerability [[saas-exit-vectors]] named. Turso is OSS libSQL protocol — migrating off Turso later to self-hosted `sqld` is zero-schema work. This is cycle-012's "get off Supabase cleanly" move; cycle-N+k (later, when Freeside control-plane exists) is the "move to Freeside-managed libSQL" move.

Cycle-012's load-bearing outcome: **constructs.network serves real registry data from libSQL; API surface is pruned to the ~12 endpoints that actually serve the product; Supabase dependency is severed; doctrine [[saas-exit-vectors]] promoted from instance-1 to executed.**

---

## 1 · Scope lock

### 1.1 Touches

- `apps/api/src/db/schema.ts` — **full rewrite** Postgres → libSQL-flavored Drizzle (sqliteTable, text for UUIDs, integer for timestamps, CHECK constraints replacing pgEnum, JSON as text with json1 extension)
- `apps/api/drizzle.config.ts` — `dialect: 'postgresql'` → `dialect: 'turso'`; add `authToken` config
- `apps/api/src/db/index.ts` — driver swap `postgres-js` → `@libsql/client`
- `apps/api/drizzle/` — **reset** (delete Postgres migrations; regenerate single fresh migration for SQLite dialect from the new schema)
- `apps/api/src/routes/constructs.ts` — **port** (reads packs + skills; serves `/v1/constructs`, `/v1/constructs/:slug`, `/v1/constructs/summary`)
- `apps/api/src/routes/packs.ts` — **port** (reads packs)
- `apps/api/src/routes/skills.ts` — **port** (reads skills)
- `apps/api/src/routes/admin.ts` — **port** (only `/discover` handler; operational-token auth path via middleware/operational-token.ts)
- `apps/api/src/routes/categories.ts` — **port** if UI consumes; else **delete**
- `apps/api/src/routes/health.ts` — **port** (no DB touch)
- **NEW · Stats surface** — add handlers for per-construct observability (per operator: *"basic statistics and observability over constructs, their usage, and downloads for now"*):
  - `POST /v1/constructs/:slug/view` — anonymous increment of `packs.view_count` (UI calls on detail page load)
  - `POST /v1/constructs/:slug/download` — anonymous increment of `packs.download_count` (CLI or install-script calls)
  - Sort parameter on `GET /v1/constructs?sort=downloads&order=desc` — aggregate popularity view
  - Rate-limit deferred (Redis not configured per Railway logs); document as tech-debt finding
- `apps/api/src/routes/auth.ts` · `auth/oauth.ts` · `auth/dynamic.ts` — **delete outright**. No authenticated surface in cycle-012 scope per operator (*"public registry browsing (no auth)"* + stats). OAuth/Dynamic-Labs flow returns in future cycle when authenticated CLI-install lands.
- `apps/api/src/routes/keys.ts` · `users.ts` (if exists) — **delete outright**. No user-scoped reads in live surface.
- `apps/api/src/routes/subscriptions.ts` · `webhooks.ts` · `teams.ts` · `creator.ts` · `creators.ts` · `audit.ts` · `analytics.ts` (mounted at v1 root) · `signals.ts` · `public-keys.ts` · `docs.ts` · `installs.ts` (if exists) — **delete outright**, route registration removed from `apps/api/src/app.ts`
- `apps/api/src/services/*.ts` — **audit**: fix `ilike` → `like` + `COLLATE NOCASE` or `LOWER()` wrap; replace `date_trunc('day', x)::date::text` with `strftime('%Y-%m-%d', x)`; replace `sql\`gen_random_uuid()\`` with TypeScript-side `crypto.randomUUID()`; replace `jsonb` accessors with `json_extract()`
- `apps/api/src/services/analytics.ts` · `teams.ts` · `creator.ts` · `subscription.ts` · `audit.ts` · `signals.ts` · `auth-helpers.ts` (OAuth/Dynamic) · `license.ts` · `api-keys.ts` — **delete** (all orphaned post-auth-drop + pruning)
- `apps/api/src/middleware/auth.ts` · `operational-token.ts` — **audit**: operational-token stays (admin/discover still uses it); auth.ts deletes if zero remaining routes use it; if only admin uses it, strip unused code paths down to what operational-token middleware needs
- `apps/api/src/middleware/rate-limiter.ts` — **keep** (public stats endpoints want rate-limiting; Redis not wired yet — tech-debt finding)
- `apps/api/package.json` — remove `postgres` dependency; add `@libsql/client`; update scripts
- `apps/api/.env.example` — remove `DATABASE_URL` / `DATABASE_URL_DIRECT`; add `TURSO_DATABASE_URL` (`libsql://...turso.io` for prod / `file:./local.db` for dev) + `TURSO_AUTH_TOKEN`
- `apps/api/Dockerfile` — no change expected (runtime doesn't care), verify post-port
- Railway env vars — unset `DATABASE_URL` + `DATABASE_URL_DIRECT`; set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
- `grimoires/loa-constructs-seed-2026-04-21/` — this SEED + L-close findings
- `~/hivemind/wiki/concepts/saas-exit-vectors.md` — amend instance-1 entry: "execution complete; cycle-012 promoted doctrine to executed"
- `~/hivemind/sessions/2026-04-23-supabase-billing-hold-recovery.md` — append completion note on cycle-012 close

### 1.2 Does NOT touch

- **Frontend `constructs.network`** (bonfire/sprawl/apps/constructs-network) — it already fetches against `api.constructs.network/v1`; contract unchanged for public-registry endpoints. UI likely has auth'd code paths that will now 404 — acceptable for pre-launch state; UI cleanup is separate cycle. Surface any blocking UI-breaks during L-ui-smoke as findings.
- **`loa-registry` CLI auth flow** — CLI's `POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET /v1/users/me` all 404 post-cycle. CLI install flow effectively inoperative until a future cycle restores auth. **This is intentional** per operator: pre-launch, no real users, re-auth doesn't matter. Document in findings.
- **OAuth / Dynamic Labs session flow** — **fully removed** in cycle-012. Session logic, JWT signing, Dynamic Labs integration deleted with the auth routers. When auth returns (future cycle), rebuild on libSQL + potentially on SIwTHJ / better-auth per [[sign-in-with-thj]] direction rather than resurrecting Dynamic.
- **Historical data from paused Supabase** — explicitly out of scope per operator dispatch: "accept loss, fresh start." Users re-auth; registry rebuilds via discover.
- **Other THJ Supabase-paused projects** (mentioned by operator but scope-locked out) — each has its own migration story; this cycle is constructs-api only.
- **Freeside ECS / Terraform / control-plane** — cycle-011 pre-SEED territory; this cycle stays on Railway.
- **Self-hosted libSQL / `sqld` on Railway** — deferred per operator direction ("Turso managed until we move things into freeside for the final clean migration"). When cycle-N+k lands self-host, schema work is zero (libSQL protocol identical).
- **Convex webhook** (`CONVEX_WEBHOOK_URL` in Railway env) — if still actively used, leaves as-is; if not, prune in a separate cleanup.
- **Redis / rate-limiter** — Railway warns `"Rate limiting disabled: Redis not configured"`; unchanged this cycle.
- **Sentry wiring** — logs show Sentry DSN not set; unchanged.

### 1.3 Scope-lock rule carried forward

> *"Build primitives in service of one concrete outcome. Do not design a framework — do the consolidation."*

Applied here: the new schema is the minimum that lets the live surface function. It does NOT design a generic content-registry platform. Future surfaces (submissions, curation, revenue-sharing, team subscriptions) are NOT reserved shapes in the cycle-012 schema — if they come back, they come back as targeted additions, not pre-built scaffolding.

### 1.4 libSQL host decision (pre-dispatch settled)

| Stage | Host | Rationale |
|---|---|---|
| Cycle-012 prod | **Turso managed edge** (`libsql://<db>-<org>.turso.io`) | Matches sprawl-world dashboard precedent (first-checked recipe, not pioneer). Free tier sufficient. Migration-off-is-cheap (Turso = OSS libSQL). |
| Cycle-012 dev | `file:./local.db` (SQLite local file) | Matches sprawl-world dashboard dev pattern. Zero auth token required. |
| Cycle-N+k (future) | Self-hosted `sqld` on Freeside ECS | Strategic landing. Zero schema work (same protocol). Cycle-011 Vercel-for-Freeside lands the provisioning primitive first. |

### 1.5 Data-loss decision (pre-dispatch settled)

Per operator: **accept loss on historical data; fresh start on libSQL. Pre-launch state — no external users, no comms needed.**

- Auth flow fully removed this cycle (no users table, no api_keys table in libSQL schema).
- Install history / analytics / showcases / submissions / users / api-keys / audit-log: gone, not re-imported. Tables not recreated.
- Registry content: fully reproducible from GitHub via `POST /v1/admin/discover`.
- View/download counters: start at zero. Fresh observability from cycle-012 onward.
- Supabase email thread (handled separately) MAY yield `pg_dump`. If historical data is worth keeping, a LATER cycle can import it — but nothing in cycle-012's schema retains the shapes.

### 1.6 Auth-drop rationale (addendum)

Operator clarified API's current product job: **public registry browsing + basic statistics/observability over constructs/usage/downloads for now.** Authenticated surface — user dashboards, CLI-install with API keys, user-scoped reads — is explicitly NOT in cycle-012 scope.

Consequence: cycle-012 ships a **read-only + anonymous-increment API**. Auth returns as a future cycle when the product needs it (authenticated install flow, user-scoped analytics, etc.). Probable landing: SIwTHJ + better-auth per [[sign-in-with-thj]] + [[freeside-as-identity-spine]], not the current Dynamic-Labs + OAuth shape.

This narrows cycle-012's work substantially (no auth middleware chain, no session management, no JWT issuance, no OAuth callback routes, no users table, no api_keys table). Revised table count: **~5 tables** (was 8): packs, skills, categories, discovery_runs, plus 1-2 optional (stats-events if we want time-series, or leave as columns on packs).

---

## 2 · Legs

| Leg | Purpose | Est. effort | Priority | Mode |
|---|---|---|---|---|
| **L-0** (done in dispatch) | Preflight: live-surface audit (12 endpoints confirmed), sprawl-world libSQL pattern reviewed (Turso managed + `file:` dev), Drizzle config diff scoped, prior seeds read (cycle-010 format adopted), branch-cut | done | CERTAIN | — |
| **L-schema-slice** | Rewrite `schema.ts` to libSQL-flavored Drizzle. Tables: `packs` (+ `view_count`, `download_count` counter columns), `skills`, `categories`, `discovery_runs`, plus optional `stats_events` if time-series needed (default: no — columns on `packs` sufficient for "basic stats"). **~5 tables** (was 8 pre-auth-drop). Replace: pgEnum → CHECK constraints; uuid() → text + crypto.randomUUID(); jsonb → text w/ json1; timestamp → integer unix epoch. Preserve indexes. | small-medium (2 hrs) | CERTAIN | operator-solo |
| **L-db-client** | Swap `drizzle.config.ts` dialect + `db/index.ts` driver. Install `@libsql/client`, remove `postgres`. Run `bun drizzle-kit generate` against new schema to produce fresh initial migration. | small (1 hr) | CERTAIN | operator-solo |
| **L-route-port** | Port live-surface handlers (reduced post-auth-drop): `/v1/constructs*`, `/v1/packs`, `/v1/skills`, `/v1/categories` (if kept), `/v1/admin/discover`, `/v1/health`. Add NEW stats handlers: `POST /v1/constructs/:slug/view`, `POST /v1/constructs/:slug/download`. Fix Postgres-isms in services: ilike → like + COLLATE NOCASE or LOWER(); date_trunc → strftime; uuid() → randomUUID(); jsonb operators → json_extract. Update/delete tests for removed endpoints. | medium (2-3 hrs) | CERTAIN | operator-solo |
| **L-route-prune** | **Delete outright** (per operator doctrine-clarification §4.1): auth.ts, auth/oauth.ts, auth/dynamic.ts, keys.ts, users.ts (if exists), installs.ts (if exists), subscriptions.ts, webhooks.ts, teams.ts, creator.ts, creators.ts, audit.ts, analytics.ts, signals.ts, public-keys.ts, docs.ts. Delete orphaned services (analytics, teams, creator, subscription, audit, signals, auth-helpers, license, api-keys). Remove registrations from `app.ts`. Grep-verify no remaining imports. Middleware/auth.ts — audit for remaining uses (operational-token still needs it? if not, delete). | medium (1-2 hrs — deletions cascade) | CERTAIN | operator-solo |
| **L-env-wire** | Provision Turso DB (via `turso db create constructs-network-prod`). Obtain URL + auth token. Set Railway env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Unset `DATABASE_URL` + `DATABASE_URL_DIRECT`. Update `.env.example`. | small (30 min) | CERTAIN | operator-solo |
| **L-migrate-run** | Run `bun drizzle-kit push` against Turso prod DB (or migrate if prefer migration file). Verify tables created. POST `/v1/admin/discover` with admin token. Verify `/v1/constructs` returns ≥20 rows. | small (30 min) | CERTAIN | operator-solo |
| **L-ui-smoke** | Load `https://constructs.network` in browser per [[builder-touch-imperative]]. Verify catalog renders real constructs. Verify `/explore`, detail pages, install flow. Click through enough to confirm no regressions. Test `loa install <slug>` end-to-end against the live API. | small (30 min) | CERTAIN | operator-solo (builder-touch mandatory) |
| **L-canon-amend** | Amend `~/hivemind/wiki/concepts/saas-exit-vectors.md` — instance-1 evidence updated to "executed"; promote doctrine from "candidate" to "executed instance-1." Amend `~/hivemind/sessions/2026-04-23-supabase-billing-hold-recovery.md` with cycle-012 completion note. | tiny (15 min) | CERTAIN | async |
| **L-close** | Findings (F50+ continuing from cycle-010's F49). KANSEI gate. Cycle-013 handoff queue. Amend cycle-010/cycle-011 references as needed. | small (1 hr) | CERTAIN | paired (operator KANSEI) |

**Total estimated effort**: 10-12 hours focused work. Matches the revised-estimate post-reframe (§earlier diagnosis).

**Parallelization**: L-route-port + L-route-prune can overlap partially (both touch `app.ts`). L-env-wire can start in parallel with L-schema-slice (independent — Turso provisioning doesn't block schema design). L-canon-amend is pure async.

---

## 3 · Acceptance criteria

**AC-1 · Registry visibility**: `curl https://api.constructs.network/v1/constructs | jq '.data | length'` returns ≥20 rows sourced from libSQL. `constructs.network` explore page renders these visually.

**AC-2 · Stats surface functional**: `POST /v1/constructs/<real-slug>/view` returns 204 and increments `packs.view_count`. `POST /v1/constructs/<real-slug>/download` similarly increments `download_count`. `GET /v1/constructs?sort=downloads&order=desc` returns rows sorted by aggregate popularity. (Rate-limit not required for AC — tech-debt filed.)

**AC-3 · Endpoint contract stability**: each live endpoint that existed pre-migration returns the same JSON shape post-migration (captured via contract tests or golden-file diffs). Contracts documented at `apps/api/src/routes/*.ts` docstring level.

**AC-4 · Dormant AND auth routes 404**: each deleted path — auth (`POST /v1/auth/login`, `POST /v1/auth/refresh`, `GET /v1/users/me`, `/v1/auth/oauth/*`, `/v1/auth/dynamic/*`), user-scoped (`GET /v1/keys`, `GET /v1/installs`), dormant (`GET /v1/webhooks`, `/v1/teams`, `/v1/subscriptions`, etc.) — returns **404 Not Found**, not 500. Verifies clean deletion.

**AC-5 · Zero Supabase dependency**: `railway variables | grep -iE 'DATABASE_URL|SUPABASE'` returns empty (or only irrelevant matches). API logs show zero `PostgresError` after deploy.

**AC-6 · Test suite green**: `bun test` (apps/api) passes. Deleted-router tests removed or archived. Postgres-specific assertions in remaining tests updated for SQLite semantics.

**AC-7 · Deploy verified**: Railway deploy succeeds; `/v1/health` returns 200; first prod request to `/v1/constructs` hits libSQL (confirmed via Turso dashboard or API logs).

**AC-8 · Doctrine amendment filed**: `~/hivemind/wiki/concepts/saas-exit-vectors.md` updated with cycle-012 execution record; doctrine promoted from candidate to executed.

**AC-9 · Builder-touch satisfied**: operator has loaded `constructs.network` in a real browser. At minimum: home/catalog renders real constructs; detail page loads for at least one; sort-by-popularity works if surfaced in UI. Install-flow not testable this cycle (no auth). Any UI page that 404s due to dropped auth endpoints gets logged as a finding (acceptable pre-launch; fixes happen in follow-up cycle). [[builder-touch-imperative]] — AC-9 is non-negotiable within the narrowed scope.

---

## 4 · Invariants · Doctrine composition

| Doctrine | Instance in this cycle |
|---|---|
| [[saas-exit-vectors]] | **Instance-1 executed.** Cycle-012 IS the execution of the doctrine coined 2026-04-23. Promotes from "candidate" to "executed-instance-1." Second-instance candidate: any future THJ SaaS exit. |
| [[sovereign-stack]] | libSQL landing is L1-L4 alignment. Turso managed is not fully sovereign (SaaS dependency remains) but is OSS-wrapper so migration-off-is-cheap. Cycle-N+k self-host on Freeside closes the sovereignty loop fully. |
| [[tool-absence-as-enforcement]] | **Instance-2 evidence** (cycle-010 was instance-1 with `--apply` absence). Dropping dormant routers IS enforcement — "this endpoint does not exist" is stronger than "this endpoint is deprecated." Promote candidate to load-bearing on cycle-012 close if it feels right. |
| [[naming-is-diagnostic]] | Schema prune clarifies what's nameable. If after prune any remaining table feels unnameable, that's a diagnostic — surface as finding. |
| [[constructs-as-packages]] | Namespace-is-registry → submission/curation tables are dead weight. Pruning them confirms the doctrine is load-bearing at the data layer, not just the install layer. |
| [[builder-touch-imperative]] | AC-9 enforces this structurally. No green-check without operator touching UI. |
| [[half-done-infrastructure-migration]] (antipattern) | This cycle must NOT land in half-done state — a Supabase DB that's disconnected + a libSQL DB that's half-populated. AC-5 + AC-1 together enforce full-migration state. |
| [[resilience-is-remembering]] | **Doctrine-clarification** (operator 2026-04-23): *"remembering for code is commit history not dead hanging code."* Applies to lore/doctrine/decisions (frontmatter-status supersession), NOT to application code. Git history IS the remembering mechanism for code. Dead code in tree ≠ resilience; it's clutter. Filed as candidate doctrine-delta → §4.1. |

### 4.1 Doctrine-delta · git-is-code-memory (candidate, operator-coined)

Pre-dispatch (2026-04-23) I proposed archiving dormant routes to `routes/.archived/` as a [[resilience-is-remembering]] compliance move. **Operator overrode:**

> *"Delete outright, remembering for code is commit history not dead hanging code."*

This is a doctrine-refinement worth filing. Proposed addendum to [[resilience-is-remembering]]:

**git-is-code-memory** — code deletion is supported by git history; lore/doctrine/decision deletion is not. The two memory mechanisms differ in kind:

| Artifact type | Memory mechanism | Deletion semantics |
|---|---|---|
| Wiki pages / doctrine / session digests | Frontmatter-status supersession + in-tree preservation | Never delete; chain-preserve with `status: superseded` |
| Cycle SEEDs / findings / KANSEI records | In-tree historical artifacts | Never delete; cycles roll forward |
| Application code | Git commit history | DELETE outright when no longer product-aligned; history recalls it if needed |
| Configuration / infra / env templates | Git commit history | Delete (unused vars don't belong in examples) |

**Why the distinction matters**: lore needs in-tree preservation because git-commit-SHA references are slow to navigate and not human-browsable; doctrine evolution is read narratively. Code needs only commit-history because modern tooling (git log, git blame, GitHub blame UI) makes retrieval trivial, and dead code in tree actively harms navigation + comprehension + bug-surface.

File at cycle-012 close as finding; if second-instance emerges (future cycle faces same archive-vs-delete decision), promote to load-bearing doctrine per [[naming-is-diagnostic]]. Amendment to [[resilience-is-remembering]] wiki page upon promotion.

### 4.2 L-route-prune behavior under this clarification

Delete files outright (`git rm`). Delete registrations from `app.ts`. Delete orphaned services + utilities. Delete schema tables that no endpoint references. Verify via:
- `bun build apps/api` (no import errors)
- `bun test` (no orphaned test suites reference deleted code)
- `rg "import.*\\b(auth|users|api_keys|installs|subscriptions|webhooks|teams|creator|analytics|audit|signals)\\b" apps/api/src` — zero matches expected
- `curl https://api.constructs.network/v1/<deleted-path>` returns 404

If historical reference is needed during a future cycle, `git log --follow -- apps/api/src/routes/<deleted-path>.ts` recalls the full history. That IS the memory per operator doctrine.

---

## 5 · Dependencies · dispatch gates

| Gate | Requirement | Resolution |
|---|---|---|
| Turso account | Operator has Turso account + org set up | Check at dispatch; `turso auth login` if needed |
| Railway CLI linked | Already verified — `constructs network > production > loa-constructs-api` | ✓ verified 2026-04-23 |
| CONSTRUCTS_ADMIN_TOKEN | Already set in Railway from 2026-04-23 diagnostic work | ✓ verified |
| GITHUB_TOKEN (for discover) | Already set in Railway from 2026-04-23 | ✓ verified |
| gh CLI auth | Operator has `gh auth status` healthy | Check at L-0 |
| Bun 1.3.11+ | Per project packageManager | ✓ assumed |
| Cycle-010 state | Cycle-010 branch can merge or stay parallel — this cycle cuts fresh | Decide at L-0 |

**Dispatch-blocking gates**: none. All prerequisites verified.

---

## 6 · NOT this cycle · handoff

**Deferred to cycle-N+k:**

1. **Self-host libSQL (`sqld`) on Freeside** — when cycle-011 Vercel-for-Freeside lands managed-apply, provision a libSQL service as another ECS task. Zero schema work (same protocol). Operator explicitly flagged this as "the final clean migration" target.
2. **Historical data recovery** — if Supabase email thread yields a `pg_dump`, a separate data-migration sub-cycle can import users + installs history. Out of scope here.
3. **Missing endpoints** — if builder-touch (L-ui-smoke) reveals the UI depends on an endpoint not in the 12 we ported, flag as finding, add in a targeted patch cycle. Don't expand cycle-012 scope mid-flight.
4. **OAuth / auth flow simplification** — any overhaul of the Dynamic Labs / SIwTHJ flow is separate.
5. **Other THJ Supabase-paused projects** — each has its own product surface + migration story. Operator to decide which gets its own cycle.
6. **Frontend redesign / compositions form factor / dungeon UX** — the "what does constructs.network LOOK like" question is a FEEL/ARCH cycle. Out of scope here.

**Handoff to cycle-013 (queue):**

- If [[tool-absence-as-enforcement]] second-instance earns promotion on cycle-012 close, amend the wiki page.
- If builder-touch surfaces UX gaps on the now-live registry, seed a FEEL cycle for compositions form factor.
- If the Supabase email resolves with `pg_dump`, seed a data-import sub-cycle.
- Cycle-011 Vercel-for-Freeside remains queued.

---

## 7 · KANSEI gate (cycle-close — operator-answered)

Target ≥4/5 Y on Q1-Q4, constructive Q5. Halt <3/5.

- **Q1** — Did the schema prune feel clarifying (nameable, "yes that's the registry") or lossy (amputation, "where did X go")? If lossy: name what feels missing. Is it a doctrine-delta or just an as-yet-unshipped feature?
- **Q2** — Does the narrowed live-surface (public reads + stats increment + admin discover) match what you actually need from the product as it stands today? Any real UI need that surfaced during L-ui-smoke that was missed?
- **Q3** — Did the auth-drop feel right post-landing, or did it feel like too-aggressive scope reduction? When auth returns, should it rebuild on SIwTHJ/better-auth as sketched in §1.6, or something else?
- **Q4** — With Turso managed live and Supabase severed, does the "defer self-host until Freeside-landing" frame hold, or does self-host feel like it should be sooner than cycle-N+k?
- **Q5** — **Doctrine-delta verification** (git-is-code-memory, §4.1): did delete-outright feel right in practice, or did any deletion spark a "wait, I want that back" moment? If the latter: was git-log retrieval satisfying, or is the doctrine wrong? If the former: promote to load-bearing on second-instance.
- **Q6** — Free-text: with constructs-api sovereign-landed, what about constructs-as-product feels NAMEABLE now that wasn't before cycle-012? What still feels vibe-only or pre-verbal? And: does this migration's ease (or difficulty) update your confidence in [[saas-exit-vectors]] as a doctrine you'd re-apply?

---

## 8 · What this cycle does NOT claim

- **NOT** self-hosted libSQL shipped. Managed Turso only.
- **NOT** historical data preserved. Accepted loss.
- **NOT** other THJ Supabase-paused projects migrated. Constructs-api only.
- **NOT** Freeside control-plane provisioning. Cycle-011 territory.
- **NOT** OAuth / auth flow overhauled. DB storage only.
- **NOT** frontend changes. UI unchanged; contract-stable.
- **NOT** cycle-010 closed. Parallel or sequential per operator preference at dispatch.
- **NOT** the full [[sovereign-stack]] landed. Intermediate step; full landing at cycle-N+k self-host.

---

*SEED drafted 2026-04-23 post-diagnostic-session. Operator-amendable. Dispatch mode: `/simstim`. Operator to approve or amend before harness-dispatch. Next step on approval: `bash .claude/scripts/spiral-harness.sh --task "cycle-012 api-libsql-migration" --cycle-dir .run/cycles/cycle-012 --cycle-id cycle-012 --branch feat/spiral-loa-constructs-cycle-012-api-libsql-migration --budget 15 --profile standard` OR direct `/simstim` invocation per operator preference.*
