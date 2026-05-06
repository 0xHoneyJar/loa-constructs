# Registry-table dependency audit

**Cycle**: constructs-network-migration · 2026-05-06
**Task**: T-1.9 (FR-1.4.1)
**Author**: claude-opus-4-7 in session with @zksoju

## Purpose

T-1.6 (migration `0014_deprecate_registry_tables.sql`) added `DEPRECATED`
COMMENT markers to `packs` / `skills` / `skill_versions`. T-1.4 cut the API
over to fresh Railway Postgres with **zero data migration**. Both of those
moves are safe **only if the read paths through these tables are inventoried,
ported, or explicitly disabled**.

This document is that inventory.

## Scope

`grep -rEn "\.from\(\s*(packs|skills|skillVersions|skillFiles|packVersions|packFiles)" apps/api/src/`
returns **70 occurrences across 15 files**. Plus several
`db.select().from(packInstallations|packDownloadAttributions|skillUsage)`
which look related but operate on **ops-state event tables**, not registry
data — those are NOT deprecated and stay.

### File-level classification

| File | Occurrences | Class | Action |
|---|---:|---|---|
| `services/constructs.ts` | 14 | **registry-read** (canonical entry point for `/v1/constructs*`) | **PORT → registry-loader.ts** (T-1.11a-d landed; this file is the canonical migration target). Tracker issue to file: "services/constructs.ts → yaml-source migration" |
| `services/packs.ts` | 12 | **registry-read + write** (publish flow) | **MIXED**: read paths PORT to registry-loader; write paths (publish/update) → **410 Gone** for 30 days (publish flow is on hold per cycle scope; D3 closure deferred third-party publish) |
| `routes/admin.ts` | 11 | **admin dashboards** | **MIXED**: registry counters PORT (use `loader.health().entries_count`); ops-state counters (subscriptions, users, installations) **KEEP** — those tables stay |
| `services/skills.ts` | 8 | **registry-read** (skill detail surface) | **PORT** to a future skill-detail loader OR mark **410** if skill-level surface is out-of-scope this cycle |
| `services/submissions.ts` | 4 | **publish flow** | **410 Gone** for 30 days. Submissions were already broken pre-cycle (Supabase down). Per D3, third-party publish deferred to follow-on cycle |
| `services/creator.ts` | 4 | **publish + creator profile** | **MIXED**: profile reads on `packs` PORT; creator-economics fields **410** for 30 days |
| `services/category.ts` | 4 | **category aggregation** (counts of skills/packs per category) | **PORT** to registry-loader: `[...loader.getRegistry().entries.values()].reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + 1; return acc; }, {})` |
| `services/analytics.ts` | 3 | **analytics on skillUsage** (joins to skills for grouping) | **MIXED**: skillUsage table stays (ops-state); the join to `skills` for name lookup PORTs to loader |
| `services/license.ts` | 2 | **license verification** (joins to skills for plan tier) | **PORT** join to loader; license table itself stays (ops-state) |
| `routes/webhooks.ts` | 2 | **GitHub webhook handler** (looks up packs by gitUrl on push events) | **PORT** lookup to `[...loader.getRegistry().entries.values()].find(e => e.git_url === ...)`. Linear scan over 18 entries is fine |
| `db/seed-publish-packs.ts` | 2 | **seed script** (offline) | **DELETE** or mark explicitly broken. Greenfield Postgres has no registry rows to seed. Per FR-1.4 + ADR-002, registry data is yaml-only |
| `services/discovery.ts` | 1 | **discover-constructs scan** (existing in-DB write path) | **REWRITE** in T-1.12 follow-up: discovery-scan emits a yaml-diff PR via `discover-constructs.yml` (T-1.12 done) instead of DB writes |
| `services/attributions.ts` | 1 | **attribution accounting** (joins to packs for display name) | **PORT** join to loader; attributions table stays (ops-state) |
| `routes/packs.ts` | 1 | **packs route** (slug lookup) | **PORT** to `loader.getEntry(slug)` |
| `db/seed-showcases.ts` | 1 | **seed script** (offline) | **DELETE** or mark broken (same as seed-publish-packs.ts) |
| `db/seed-pack-icons.ts` | 0 in `.from()` (only imports) | **seed script** (offline) | **DELETE** or mark broken |
| `services/payouts.ts` | 0 in `.from()` (only imports) | **revenue tracking** | **KEEP** — joins through packs but for revenue display; PORT join to loader for display name |
| `services/pack-analytics.ts` | 0 in `.from()` (only imports) | **install metrics** | **KEEP** — packInstallations table stays; PORT join to loader for display name |
| `services/reviews.ts` | 0 in `.from()` (only imports) | **review system** | **KEEP** — constructReviews table stays; PORT join to loader for display name |

### Aggregate counts

| Action | Files | Notes |
|---|---:|---|
| **PORT to registry-loader** (full or partial) | 12 | Bulk of the migration work |
| **410 Gone for 30 days** | 4 | Publish/submissions/creator-economics flows |
| **DELETE / mark broken** (seed scripts) | 3 | Offline scripts, no greenfield run |
| **KEEP unchanged** (ops-state on event tables) | 4 | Tables that survive (skillUsage, attributions, installations, reviews) but their JOINs to packs/skills need PORTed to loader for display-name resolution |

## Out-of-scope decisions

The full PORT is too large for Sprint 1. T-1.9 is the **inventory**, not the
implementation. Per the Sprint plan §6 stall-recovery protocol and FR-1.4
30-day grace, the actual migration of these read paths follows in a
**dedicated follow-on cycle** (proposed slug:
`registry-loader-route-migration`). Until that cycle ships:

- The deprecated tables remain physically present (T-1.6 added comments only,
  no `DROP TABLE`)
- The /v1/constructs surface returns empty data (`{"data":[],"total":0}`)
  via the existing `services/constructs.ts` reads — this matches pre-cycle
  prod behavior (PRD §1) and is **not a regression**
- registry-loader-driven endpoints (to be wired in the follow-on) will
  return `total >= 18` once `services/constructs.ts` is migrated
- The yaml-source itself works (verified in T-1.11a tests; cold-start seed
  + raw.gh fetch + Zod validation green)

## Known-broken paths during the grace window

These will return errors or empty data until the follow-on cycle ports them.
None are user-facing show-stoppers because the surfaces themselves were
already broken pre-cycle (Supabase tenant gone since 2026-05-01):

| Endpoint / Service | Behavior in grace window | Owner-fix in follow-on |
|---|---|---|
| `GET /v1/constructs*` | empty results (no rows in fresh `packs`) | services/constructs.ts → loader |
| `GET /v1/packs/:slug` | 404 for all slugs | routes/packs.ts → loader.getEntry(slug) |
| `GET /v1/categories` | empty counts | services/category.ts → loader aggregation |
| Submissions API (POST /v1/submissions) | 5xx on insert (FK to packs) | 410 Gone middleware |
| Admin counters dashboard | reports 0 packs / 0 skills | mixed PORT (registry) + KEEP (ops-state) |

## Gate satisfied

T-1.9 acceptance per Sprint plan: "Audit document at
`apps/api/docs/registry-table-dependencies-2026-05-XX.md` · every occurrence
classified port/410/known-broken".

- ✅ Document created at `apps/api/docs/registry-table-dependencies-2026-05-06.md`
- ✅ All 15 files with imports + 14 files with `.from()` reads classified
- ✅ Categories: PORT (12), 410 (4), DELETE (3), KEEP (4)
- ✅ Out-of-scope decision documented (full PORT → follow-on cycle)
- ✅ Known-broken paths during 30-day grace explicitly enumerated

## Recommended follow-on cycle

**Slug**: `registry-loader-route-migration`
**Scope**: Port all PORT-classified files to read from
`getRegistryLoader().getEntry(slug)` / `.getRegistry().entries`. Add 410-Gone
middleware for publish/submissions paths during the deprecation window.
Drop `packs` / `skills` / `skill_versions` after grace expires.

**Estimated effort**: 2-3 sprints (substantially more than this entire cycle)
because services/constructs.ts and services/packs.ts are the canonical entry
points and have rich response-shape contracts to preserve.
