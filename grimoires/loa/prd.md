# PRD: Public/Private Network Separation

**Cycle**: cycle-038
**Created**: 2026-03-07
**Status**: Reviewed (Flatline PRD passed — 12 findings integrated)
**Context**: `grimoires/loa/context/public-private-network-separation.md`
**Grounded in**:
- `apps/api/src/db/schema.ts:474-562` (packs table — no visibility column)
- `apps/api/src/services/constructs.ts` (listConstructs — no visibility filter)
- `apps/api/src/routes/oauth.ts` (GitHub OAuth — no org membership check)
- `apps/api/src/services/auth.ts` (JWT HS256 — no org claim)
- `apps/api/src/middleware/auth.ts` (requireAuth, optionalAuth — no requireOrgMember)
- `scripts/seed-forge-packs.ts` (auto-sync — all constructs become published/public)
- `apps/api/src/services/git-sync.ts` (syncFromRepo — no visibility extraction)
- `apps/explorer/lib/stores/auth-store.ts` (Zustand — no org membership state)

---

## 1. Problem Statement

The Construct Network has zero visibility control. Every construct in the `0xHoneyJar` GitHub org that follows the `construct-*` naming convention auto-syncs and appears publicly on `constructs.network`. This creates three problems that are now blocking distribution:

**P1: Internal constructs leak to external users.** Team-only tools (hardening, dynamic-auth, gtm-collective, webgl-particles) appear alongside public offerings on the marketplace. As we begin sharing constructs.network externally, users see internal development tooling mixed with polished, public-ready constructs.

**P2: No opt-in to public.** There is no mechanism for a construct author to say "this is ready for public consumption." The auto-sync pipeline treats all `construct-*` repos identically — synced and published. The only gating is the `status` field (draft/published), which controls lifecycle state, not audience.

**P3: No external submission path.** Non-org members have no way to publish constructs to the network. `POST /v1/constructs/register` exists but only reserves a slug — it does not clone, validate, or create a reviewable submission.

> **Source**: Direct observation — session codebase research confirming `packs` table has no `visibility` column, `listConstructs()` filters only on `status='published'`, and GitHub OAuth stores no org membership.

---

## 2. Vision & Design Principles

**Vision**: The Construct Network serves two audiences through one infrastructure — an internal registry for the team and a public marketplace for external developers. The boundary between them is a single field in `construct.yaml`.

**Design Principles:**

1. **Internal by default, public by intent** — org-synced constructs start `internal`. Authors opt into `public` explicitly via `construct.yaml`. Omitting the field = safe default.

2. **GitHub org = trust boundary** — org membership determines internal access. No separate ACL system, no custom invitation flow. GitHub already manages who's on the team.

3. **External = explicit submission** — third-party constructs enter through registration and review, not auto-discovery. The org namespace is not the only path.

4. **Visibility is orthogonal to status** — a construct can be `published` (lifecycle-approved) and `internal` (team-only). These are independent dimensions.

---

## 3. Goals & Success Metrics

### Business Goals

| Goal | Measure | Target |
|------|---------|--------|
| External users see only public constructs | Internal construct count in public API responses | 0 |
| Internal team retains full access | Org members can discover+download internal constructs | 100% |
| External authors can submit | At least one external construct published | Within 30 days of launch |
| No accidental exposure | New constructs default to `internal` | 100% of auto-synced |

### Non-Goals (Explicit)

- **Dynamic Labs / wallet auth bridge** — deferred, no concrete use case yet
- **Per-skill visibility within a construct** — adds complexity, recommend NO for v1
- **SAML/SSO enterprise auth** — deferred to enterprise tier
- **Real-time GitHub API checks on every request** — cached org membership is sufficient

---

## 4. User & Stakeholder Context

### Persona 1: Internal Team Member

**Who**: Developer on the `0xHoneyJar` GitHub org.
**Has**: GitHub account, org membership, existing constructs.network account (or can create via GitHub OAuth).
**Needs**: See all constructs (internal + public), develop and test constructs without exposing them externally.
**Current pain**: No distinction — their WIP constructs are visible to the world.

### Persona 2: External Developer

**Who**: Developer outside the org who wants to use or contribute constructs.
**Has**: GitHub account (or email). May or may not have a constructs.network account.
**Needs**: Browse public constructs, install them, optionally submit their own.
**Current pain**: Sees internal tooling mixed with public offerings. Has no submission path.

### Persona 3: THJ Product User (Deferred)

**Who**: Berachain wallet holder who uses THJ dApps (rektdrop, midi, mcv).
**Has**: Wallet via Dynamic Labs. No constructs.network account.
**Interaction**: Consumes construct outputs through dApps, not through constructs.network directly.
**When relevant**: If/when product users need direct construct access. Not v1.

### Stakeholders

- **@janitooor** — primary maintainer, PR reviewer, admin
- **0xHoneyJar team** — internal construct authors
- **External developers** — early adopters via constructs.network

---

## 5. Functional Requirements

### FR-1: Visibility Enum

**Add `visibility` column to `packs` table with three values:**

| Value | Discovery | Download | Use Case |
|-------|-----------|----------|----------|
| `public` | Anyone | Anyone (respecting tier) | Production-ready external constructs |
| `internal` | Authenticated org members only | Authenticated org members only | Team tools, WIP, sensitive |
| `unlisted` | Nobody (direct slug access only) | Anyone with the slug | Beta sharing, specific audiences |

**Default**: `internal` (safe — nothing leaks without explicit intent).

**Acceptance criteria:**
- [ ] `construct_visibility` enum created in DB
- [ ] `visibility` column added to `packs` with default `'internal'`
- [ ] Composite index `(visibility, status)` created
- [ ] Backfill: 9 public slugs (observer, artisan, crucible, beacon, protocol, herald, k-hole, the-easel, mibera-codex), 4 internal slugs (hardening, dynamic-auth, gtm-collective, webgl-particles) — **canonical list, no heuristics**
- [ ] `constructVisibilityEnum` added to Drizzle schema

### FR-2: Visibility in Construct.yaml

**Authors declare visibility in their manifest:**

```yaml
visibility: public  # or 'internal' or 'unlisted'
```

**construct.yaml is the sole source of truth for visibility.** There is no DB override endpoint — visibility changes only via repo push + sync. This eliminates drift between manifest and DB state (FINDING-003).

**Acceptance criteria:**
- [ ] `visibility` field added to Zod `packManifestSchema` (optional, defaults to `'internal'`)
- [ ] `visibility` field added to JSON Schema in `git-sync.ts` manifest validator (four-layer sync: DB enum ↔ Zod ↔ TS types ↔ JSON Schema)
- [ ] Seed script reads `visibility` from construct.yaml during sync
- [ ] `git-sync.ts` reads `visibility` from manifest and writes to DB
- [ ] Omitted field defaults to `'internal'` in both sync paths
- [ ] TypeScript types updated in `packages/shared`
- [ ] `PackManifest` type in `packages/shared/src/types.ts` includes `visibility?: 'public' | 'internal' | 'unlisted'`

### FR-3: GitHub Org Membership Check

**On GitHub OAuth login, check `0xHoneyJar` org membership and cache the result.**

**GitHub API contract:** Use `GET /user/memberships/orgs/{org}` (authenticated user's own membership) which returns `{ state: 'active' | 'pending', role: 'member' | 'admin' }`. Only `state: 'active'` grants org membership. API failure = treat as non-member (fail secure). Requires `read:org` scope on the user's OAuth token. (FINDING-012)

**Acceptance criteria:**
- [ ] GitHub OAuth scope updated: `user:email` → `user:email read:org`
- [ ] `github_username`, `github_org_member`, `github_org_checked_at` columns added to `users`
- [ ] Org membership checked via `GET /user/memberships/orgs/{org}` during OAuth callback; only `state: 'active'` = member
- [ ] Result cached in DB; rechecked on login if stale (>24 hours)
- [ ] `org: boolean` claim added to JWT access token payload
- [ ] `GET /v1/auth/me` includes `isOrgMember` field
- [ ] **Refresh token org recheck** (FINDING-004): On token refresh (`POST /v1/auth/refresh`), if `github_org_checked_at` is stale (>24h), recheck org membership before minting new access token. If user is no longer a member, mint token with `org: false`
- [ ] **Existing user rollout** (FINDING-009): Existing GitHub-linked users get `github_org_member` backfilled to `false`. On next login, the new `read:org` scope triggers GitHub re-consent; org check runs and populates correctly. Users who don't re-login continue with `org: false` (safe default — they see only public constructs until re-auth)
- [ ] **Org status is account-level** (FINDING-007): Once a user links GitHub OAuth and passes the org check, `github_org_member = true` persists on the account. Subsequent password or Google sessions on the same account inherit org access. This is intentional — the user proved org membership once, and the 24h recheck cycle handles revocation

### FR-4: Visibility-Aware API Filtering — All Read Paths

**Every endpoint that reads pack/construct data must enforce visibility, not just `/v1/constructs*`.**

The following endpoint families must ALL check visibility (FINDING-001):

| Route Family | Endpoints Affected |
|---|---|
| `/v1/constructs` | list, detail, summary, HEAD |
| `/v1/packs/:slug` | detail, versions, download, verification, ground-truth |
| `/v1/packs/:slug/fork` | fork source lookup (FINDING-006) |
| Shared service | `getPackBySlug()` in `services/packs.ts` — add visibility check at service layer |

**Visibility rules:**

```
No auth         → WHERE visibility = 'public'
Auth + org      → WHERE visibility IN ('public', 'internal')
Auth + owner    → sees own constructs regardless of visibility
Auth + admin    → sees all
```

**Acceptance criteria:**
- [ ] `getPackBySlug()` in `services/packs.ts` enforces visibility check (single guard for all pack routes)
- [ ] `listConstructs()` in `constructs.ts` adds visibility WHERE clause
- [ ] `getConstruct()` returns 404 for `internal` constructs when viewer is not org member
- [ ] `unlisted` constructs accessible by slug but excluded from listings
- [ ] `/v1/constructs/summary` applies same visibility filter
- [ ] `?visibility=internal` explicit filter param works (requires auth + org)
- [ ] All `/v1/packs/:slug/*` sub-routes (download, versions, verification, HEAD) inherit visibility from the pack
- [ ] Fork endpoint rejects forking internal/unlisted constructs by non-org members; fork provenance from non-public parents is redacted in public responses (FINDING-006)
- [ ] Redis cache keys vary by visibility context (viewer auth hash) across ALL cache families: list, detail, summary, existence (FINDING-002)
- [ ] Visibility changes (sync, toggle, status change) invalidate all affected cache key variants

### FR-5: Org Membership Middleware

**New `requireOrgMember()` middleware for internal-only endpoints.**

**Acceptance criteria:**
- [ ] `requireOrgMember()` chains after `requireAuth()`
- [ ] Reads `org` claim from JWT; returns 403 if false
- [ ] `optionalAuth()` sets `c.set('isOrgMember', payload.org ?? false)` when token present
- [ ] Construct listing endpoints use `optionalAuth()` + read org flag for filtering

### ~~FR-6: Visibility Toggle Endpoint~~ — REMOVED

**Removed per Flatline review FINDING-003.** construct.yaml is the sole source of truth for visibility. A DB toggle would create drift — the next webhook sync would revert it. To change visibility: update `construct.yaml` → push → webhook sync updates DB.

**Admin override path (emergency only):** Admins can still change `packs.visibility` directly via the admin API or DB console. This is intentionally NOT a first-class endpoint to prevent routine use.

### FR-7: Explorer Visibility UI

**Explorer shows/hides constructs based on auth state and org membership.**

**Acceptance criteria:**
- [ ] Unauthenticated visitors see only public constructs
- [ ] Authenticated org members see public + internal with `INTERNAL` badge (amber pill)
- [ ] Filter toggle: "Public / Internal / All" (only shown to org members)
- [ ] Internal construct detail pages return 404 for unauthenticated visitors
- [ ] Auth store (`auth-store.ts`) tracks `isOrgMember` from `/auth/me`
- [ ] Search results respect visibility (auth token passed on API calls)

### FR-8: External Construct Registration + Publish Lockdown

**Complete the `POST /v1/constructs/register` endpoint for external submissions AND lock down existing publish paths that bypass review (FINDING-005).**

**Acceptance criteria:**
- [ ] Accepts `{ slug, gitUrl }` from authenticated user
- [ ] Clones repo, validates `construct.yaml`, runs Zod schema validation
- [ ] Creates construct with `status: 'pending_review'`, `visibility: 'public'`
- [ ] Returns webhook setup instructions for ongoing sync
- [ ] `PATCH /v1/admin/constructs/:slug/review` endpoint for admin approve/reject
- [ ] Approved constructs become `status: 'published'`
- [ ] **Publish gate hardening** (FINDING-005): All paths that can transition a pack to `status: 'published'` or create a downloadable version MUST check: if the pack was created via external registration (not org auto-sync), `status` must be `'published'` (admin-approved) before version upload or download is permitted. Specifically:
  - `POST /v1/packs/:slug/versions` — reject if `status = 'pending_review'`
  - `PATCH /v1/packs/:slug` status changes — admin-only for non-org packs
  - `POST /v1/packs/:slug/sync` — reject if `status = 'pending_review'`

---

## 6. Technical & Non-Functional Requirements

### NFR-1: Performance

- Visibility filtering adds at most 1 index-assisted WHERE clause — no measurable query impact
- Org membership cached in JWT (no per-request DB lookup)
- Redis cache keys must include auth context hash to prevent serving internal constructs to public visitors

### NFR-2: Security

- **Org membership cache staleness**: Max 24h via DB cache. Refresh endpoint also rechecks if stale. Removed org members lose access within one refresh cycle (max 24h, typically faster). JWT `org` claim ensures no per-request DB lookup (FINDING-004)
- **Unlisted ≠ secret**: Unlisted constructs are accessible by slug. They are "not advertised" not "access controlled." Do not store secrets in unlisted constructs
- **Visibility downgrade**: Changing `public` → `internal` takes effect on next sync. ISR cache may show stale data (60s for list, 3600s for detail). Redis caches invalidated on sync
- **External submissions**: Admin review required. No auto-approve for external repos. SSRF protections in `git-sync.ts` already cover the clone path. All publish paths locked down (FINDING-005)
- **OAuth scope expansion**: `read:org` is a read-only scope — does not grant write access to the org
- **Fork provenance**: Internal construct slugs are NOT exposed in fork provenance for public responses (FINDING-006)

### NFR-3: Backwards Compatibility

- Existing API consumers continue to work — unauthenticated requests see `public` constructs (previously all were effectively public)
- No breaking change to `/v1/constructs` response shape — `visibility` is a new optional field
- `construct.yaml` files without `visibility` field continue to validate (defaults to `internal`)

### NFR-4: Data Integrity

- **Four-layer** schema sync must be maintained (FINDING-011): DB enum ↔ Zod (`packManifestSchema`) ↔ TypeScript types (`PackManifest`) ↔ JSON Schema/AJV in `git-sync.ts`
- Migration must be idempotent (safe to re-run)
- Backfill must use explicit slug list (see §9 canonical table), not heuristics

### NFR-5: Team Ownership (FINDING-010)

- `isPackOwner()` in `services/packs.ts` currently returns `false` for team-owned packs. The "owner sees own constructs" rule in FR-4 must work for both user-owned and team-owned constructs
- Team admin/owner of a construct's owning team should have the same visibility permissions as individual owners

---

## 7. Scope & Prioritization

### MVP (Sprints 1-2)

| # | Feature | Priority |
|---|---------|----------|
| FR-1 | Visibility enum + schema | P0 |
| FR-2 | Visibility in construct.yaml | P0 |
| FR-3 | GitHub org membership check | P0 |
| FR-4 | Visibility-aware API filtering | P0 |
| FR-5 | Org membership middleware | P0 |
| ~~FR-6~~ | ~~Visibility toggle endpoint~~ — REMOVED | — |
| FR-7 | Explorer visibility UI | P1 |

### Post-MVP (Sprint 3+)

| # | Feature | Priority |
|---|---------|----------|
| FR-8 | External construct registration | P2 |
| — | CLI publish (`npx constructs publish`) | P3 |
| — | Dynamic Labs / SIWE auth bridge | P4 |
| — | Admin review dashboard UI | P3 |

### Explicit Out of Scope

- Per-skill visibility within a construct
- SAML/SSO enterprise auth
- Wallet-based authentication
- Private visibility (owner-only) — `draft` status covers this case
- Real-time GitHub org membership checks (cached is sufficient)

---

## 8. Risks & Dependencies

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitHub org API rate limits | Low | Medium | Cache for 24h; recheck on refresh only when stale |
| OAuth scope change requires re-consent | Medium | Low | Users re-auth once; non-re-authed users default to `org: false` (safe) |
| Cache poisoning (internal constructs served to public) | Low | High | Cache keys vary by auth context hash across all 4 cache families |
| ISR stale data after visibility change | Medium | Low | 60s list TTL, 3600s detail TTL; Redis invalidated on sync |
| `/v1/packs/*` bypass routes | Medium | High | Single visibility guard in `getPackBySlug()` service layer |
| Publish path bypass for external submissions | Medium | High | All version/publish paths check `status != 'pending_review'` |
| Refresh token extends org access beyond removal | Medium | Medium | Org recheck on refresh when stale >24h |

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Supabase Postgres | Infrastructure | Available — migration path is standard Drizzle |
| GitHub OAuth (existing) | Integration | Working — scope expansion needed |
| Redis (Upstash) | Infrastructure | Available — cache key format change needed |
| 12 construct repos | External | PRs needed to add `visibility` field to construct.yaml |

### Decisions to Validate

1. **Public construct list at launch**: observer, artisan, crucible, beacon, protocol, herald, k-hole, the-easel, mibera-codex = public. hardening, dynamic-auth, gtm-collective, webgl-particles = internal. `construct-base` = **recommend public** (template for external authors).

2. **External submission review model**: Admin-only review for v1. No auto-approve. This can be relaxed later with verified publisher tiers.

---

## 9. Construct.yaml Backfill Plan

Across the 12 seeded construct repos, add `visibility` field:

| Construct | Visibility | Rationale |
|-----------|-----------|-----------|
| observer | `public` | Core offering — user research automation |
| artisan | `public` | Design system — broad appeal |
| crucible | `public` | Testing — broad appeal |
| beacon | `public` | Analytics — broad appeal |
| protocol | `public` | Web3 protocol integration — broad appeal |
| herald | `public` | Release management — broad appeal |
| k-hole | `public` | Deep research — flagship construct |
| the-easel | `public` | Design engineering — broad appeal |
| mibera-codex | `public` | Knowledge base — community value |
| hardening | `internal` | Security tooling — team-only |
| dynamic-auth | `internal` | Auth patterns — team-specific |
| gtm-collective | `internal` | GTM workflow — team-specific |
| webgl-particles | `internal` | Experimental — not production-ready |

---

## 10. Implementation Sequence

### Sprint 1: Schema + Auth + API (Backend Foundation)

**DB migrations** (FR-1, FR-3):
1. `construct_visibility` enum + `visibility` column on `packs`
2. `github_username`, `github_org_member`, `github_org_checked_at` on `users`
3. Indexes + canonical backfill (9 public, 4 internal)

**Auth changes** (FR-3, FR-5):
4. GitHub OAuth scope → `user:email read:org`
5. Org membership check in OAuth callback via `/user/memberships/orgs/{org}`
6. `org` claim in JWT access token
7. Org recheck on token refresh if stale >24h
8. `requireOrgMember()` middleware
9. `/auth/me` includes `isOrgMember`

**API changes** (FR-4):
10. Visibility guard in `getPackBySlug()` service layer (single guard for all pack routes)
11. Visibility filtering in `listConstructs()` and `getConstruct()`
12. `/v1/constructs/summary` visibility gate
13. Fork provenance redaction for non-public parents
14. Cache key variation by auth context across all cache families
15. Fix `isPackOwner()` for team-owned packs (NFR-5)

**Sync changes** (FR-2):
16. Four-layer schema update (DB + Zod + TS + JSON Schema)
17. Seed script + git-sync visibility extraction

### Sprint 2: Explorer UI + Construct Repo PRs

**Explorer** (FR-7):
18. Auth store org membership from `/auth/me`
19. Visibility badges + filter toggle
20. Detail page access control (404 for internal when unauthenticated)
21. Search visibility awareness

**Construct repos** (FR-2):
22. PRs to add `visibility` field across 13 repos (12 seeded + construct-base as public template)

### Sprint 3: External Submission + Publish Lockdown (FR-8)

23. Complete registration endpoint with clone + validate
24. Admin review endpoint (approve/reject)
25. Webhook setup instructions in registration response
26. Publish gate hardening — lock version upload and sync for `pending_review` packs

---

*"The network is two networks — one that we share, one that we ship. The gate between them is a single word in a YAML file."*

---

## Appendix: Flatline PRD Review Log

**Reviewer**: Codex (GPT-based, read-only sandbox)
**Date**: 2026-03-07
**Findings**: 12 total (5 BLOCKER, 4 HIGH, 2 MEDIUM, 1 LOW)

| ID | Severity | Summary | Resolution |
|----|----------|---------|------------|
| FINDING-001 | BLOCKER | `/v1/packs/*` routes bypass visibility | Fixed: FR-4 expanded to cover all pack read paths via `getPackBySlug()` guard |
| FINDING-002 | BLOCKER | Cache poisoning across all cache families | Fixed: FR-4 acceptance criteria requires auth-context-varied cache keys for all 4 families |
| FINDING-003 | BLOCKER | Source-of-truth contradiction (YAML vs DB toggle) | Fixed: FR-6 REMOVED. construct.yaml is sole source of truth |
| FINDING-004 | BLOCKER | Refresh token bypasses org staleness check | Fixed: FR-3 adds org recheck on token refresh when stale >24h |
| FINDING-005 | BLOCKER | Existing publish paths bypass review gate | Fixed: FR-8 adds publish gate hardening for all version/status paths |
| FINDING-006 | HIGH | Fork rules missing for internal constructs | Fixed: FR-4 adds fork provenance redaction for non-public parents |
| FINDING-007 | HIGH | Org status account-level vs session-level ambiguity | Fixed: FR-3 explicitly declares account-level org status |
| FINDING-008 | HIGH | Migration slug list inconsistent | Fixed: FR-1 backfill uses canonical 9+4 slug list |
| FINDING-009 | HIGH | Existing user rollout plan missing | Fixed: FR-3 defines backfill + re-consent behavior |
| FINDING-010 | MEDIUM | `isPackOwner()` false for team-owned packs | Fixed: NFR-5 added |
| FINDING-011 | MEDIUM | Four-layer schema sync, not three | Fixed: NFR-4 updated to four layers |
| FINDING-012 | LOW | GitHub API endpoint semantics underspecified | Fixed: FR-3 specifies `/user/memberships/orgs/{org}` with `state: 'active'` check |

> **Sources**: `grimoires/loa/context/public-private-network-separation.md`, session codebase research (auth stack, DB schema, API surface, auto-sync pipeline), `grimoires/loa/context/ecosystem-brand-origins.md` (wallet identity context)
