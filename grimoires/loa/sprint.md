# Sprint Plan: Public/Private Network Separation

**Cycle**: cycle-038
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Branch**: `feat/cycle-038-visibility`
**Flatline Sprint**: 8 findings integrated (1 BLOCKER, 4 HIGH, 2 MEDIUM, 1 LOW)

---

## Sprint 1: Schema + Auth + Sync Guard (Backend Foundation) — 6 tasks

Vertical slice from DB through auth through sync. After this sprint, the API can distinguish public/internal constructs, knows who's in the org, and the preservation guard prevents sync from overwriting backfilled visibility.

### Task 1.1: DB Migration + Backfill (single PR)

**Files**: `apps/api/src/db/schema.ts`, new migration file
**SDD**: §2.1–§2.5
**Acceptance**:
- [ ] `construct_visibility` enum (`public`, `internal`, `unlisted`)
- [ ] `pack_submission_source` enum (`org_sync`, `external`)
- [ ] `visibility` column on `packs` table with default `'internal'`
- [ ] `submission_source` column on `packs` table with default `'org_sync'`
- [ ] Composite index `(visibility, status)` on packs
- [ ] `github_username` VARCHAR(100) on users
- [ ] `github_user_id` BIGINT on users (stable ID for recheck — SDD FINDING-010)
- [ ] `github_org_member` BOOLEAN default false on users
- [ ] `github_org_checked_at` TIMESTAMPTZ on users
- [ ] Index on `github_org_member`
- [ ] Canonical backfill: 9 slugs → `public`, all others remain `internal`, all → `submission_source = 'org_sync'`
- [ ] Migration SQL is idempotent, backfill is idempotent
- [ ] Drizzle schema matches migration

**Note**: Migration, user columns, and backfill are one PR — they can't deploy independently (Flatline Sprint FINDING-008).

### Task 1.2: Sync Preservation Guard

**Files**: `apps/api/src/services/git-sync.ts`, `apps/api/src/routes/webhooks.ts`, `apps/api/src/routes/packs.ts`, `scripts/seed-forge-packs.ts`
**SDD**: §5.1–§5.4, §11 (rollout FINDING-011)
**Acceptance**:
- [ ] `SyncResult` includes `visibility` field and `visibilityExplicit: boolean`
- [ ] `syncFromRepo()` extracts visibility with `VALID_VISIBILITY` enum validation
- [ ] `syncFromRepo()` tracks whether manifest **explicitly declared** `visibility` (vs defaulted)
- [ ] Webhook sync writes `visibility` to packs update **only when `visibilityExplicit` is true** — do not overwrite backfilled values with default `internal`
- [ ] Manual sync: same preservation logic
- [ ] Seed script reads + writes visibility in upsert, same preservation logic

**Must deploy with or after Task 1.1** to prevent sync from reverting backfill (Flatline Sprint FINDING-001).

### Task 1.3: Four-Layer Schema Sync — Zod + TypeScript + JSON Schema

**Files**: `packages/shared/src/validation.ts`, `packages/shared/src/types.ts`, `.claude/schemas/construct.schema.json`
**SDD**: §3.2, §3.3, §3.4
**Acceptance**:
- [ ] `visibility` added to Zod `packManifestSchema`: `z.enum(['public', 'internal', 'unlisted']).optional().default('internal')`
- [ ] `visibility` added to `PackManifest` TypeScript interface
- [ ] `visibility` added to JSON Schema with enum validation and default (SDD FINDING-008)
- [ ] All three layers agree on values, optionality, and default

### Task 1.4: JWT Claims — `org` Field + `generateTokens()` Update

**Files**: `apps/api/src/services/auth.ts`
**SDD**: §4.1
**Acceptance**:
- [ ] `AccessTokenPayload` includes `org: boolean`
- [ ] `generateTokens()` accepts `org: boolean = false` parameter
- [ ] JWT signs with `org` claim
- [ ] Existing callers of `generateTokens()` pass `false` by default (no behavior change yet)

### Task 1.5: GitHub OAuth — Scope + Org Membership Check

**Files**: `apps/api/src/routes/oauth.ts`, `apps/api/src/config/env.ts`
**SDD**: §4.2
**Acceptance**:
- [ ] OAuth scope changed to `user:email read:org`
- [ ] `CONSTRUCTS_ORG` env var added (default `'0xHoneyJar'`)
- [ ] `checkGitHubOrgMembership()` helper: calls `GET /user/memberships/orgs/{org}`, returns `true` only if `state === 'active'`
- [ ] GitHub callback stores `github_username`, `github_user_id`, `github_org_member`, `github_org_checked_at`
- [ ] `generateTokens()` called with `org: orgMembership`
- [ ] **Failure policy (single rule across all tasks)**: On GitHub API error — first login: `org: false` (no prior value to preserve). Returning user: preserve existing `githubOrgMember` value from DB. Always log structured warning `{ event: 'github_org_check_failed', userId, error }`

### Task 1.6: All Auth Paths — Org Claim + Refresh Recheck + Middleware

**Files**: `apps/api/src/routes/auth.ts`, `apps/api/src/routes/oauth.ts` (Google callback), `apps/api/src/middleware/auth.ts`
**SDD**: §4.3, §4.4
**Acceptance**:
- [ ] Password login (`POST /v1/auth/login`): reads `user.githubOrgMember` from DB, passes to `generateTokens()`
- [ ] Google OAuth callback: reads `user.githubOrgMember` from DB, passes to `generateTokens()`
- [ ] Token refresh (`POST /v1/auth/refresh`): rechecks org if `github_org_checked_at` > 24h stale
- [ ] Refresh recheck uses `checkGitHubOrgMembershipById()` (stable GitHub user ID — SDD FINDING-010)
- [ ] `checkGitHubOrgMembershipById()`: resolves user ID → username via `/user/:id`, then checks `/orgs/:org/members/:username`
- [ ] Required PAT: `GITHUB_TOKEN` or `GITHUB_SYNC_TOKEN` with `read:org` scope
- [ ] Same failure policy as Task 1.5 (returning user = preserve existing value)
- [ ] `AuthUser` interface includes `isOrgMember: boolean`
- [ ] `getUserById()` fetches `githubOrgMember` from DB
- [ ] `requireAuth()` and `optionalAuth()` set `user.isOrgMember` from JWT `org` claim
- [ ] `c.set('isOrgMember', payload.org ?? false)` convenience accessor
- [ ] `requireOrgMember()` middleware: returns 403 `ORG_MEMBERSHIP_REQUIRED`
- [ ] `GET /v1/auth/me` response includes `is_org_member`
- [ ] **Tests**: SDD §10 scenarios for this task:
  - OAuth callback → org check → JWT `org` claim correct
  - Google OAuth login → reads existing `githubOrgMember` → correct `org` claim
  - Password login → reads existing `githubOrgMember` → correct `org` claim
  - Token refresh with stale org → recheck via GitHub user ID → correct claim
  - Token refresh with GitHub API failure → preserves existing org value

**Note**: Merged auth middleware into this task — middleware can't be tested without auth paths (Flatline Sprint FINDING-008 spirit).

---

## Sprint 2: Visibility Guards + Cache + Explorer UI — 8 tasks

Enforcement layer. After this sprint, internal constructs are invisible to non-org users across ALL read paths.

### Task 2.1: Central Visibility + Status Guard — `getPackBySlug()`

**Files**: `apps/api/src/services/packs.ts`
**SDD**: §6.1
**Acceptance**:
- [ ] `PackAccessContext` interface: `{ userId?, isOrgMember, isAdmin }`
- [ ] `getPackBySlug()` checks **both** status and visibility (SDD FINDING-002)
- [ ] Draft/pending_review packs visible only to owner + admin
- [ ] `canAccessPack()`: public=anyone, unlisted=anyone, internal=org/owner/admin
- [ ] `isPackOwnerAsync()` handles team ownership via `teamMembers` table (SDD FINDING-006)
- [ ] `getAccessContext(c)` helper builds context from Hono context
- [ ] Returns `null` (not 403) for unauthorized access — prevents existence leak
- [ ] **Tests**: 9 core visibility×auth combinations (SDD §10) + 6 status×submission combinations

### Task 2.2: Construct Service Layer — Detail, HEAD, Summary, List

**Files**: `apps/api/src/services/constructs.ts`
**SDD**: §6.3, §8.1
**Acceptance**:
- [ ] `getConstructBySlug()` accepts and passes `PackAccessContext` for visibility enforcement
- [ ] `constructExists()` (HEAD) accepts and passes `PackAccessContext`
- [ ] `getConstructsSummary()` accepts `PackAccessContext` for visibility-aware counts
- [ ] `ListConstructsOptions` includes `visibility` filter + `accessContext`
- [ ] `?visibility=internal` requires org or admin (403 otherwise)
- [ ] `?visibility=all` requires org or admin (403 otherwise)
- [ ] Default (no filter): auto-select based on auth context
- [ ] Unlisted NEVER appears in listings (slug-access only)
- [ ] `getVisibilityConditions()` helper generates correct SQL
- [ ] `packToConstruct()` return includes `visibility` field in DTO
- [ ] Fork provenance redacted when source is not accessible to viewer (SDD §6.5)
- [ ] **Tests**: List returns only public for anon, public+internal for org, filtered results for `?visibility=internal`

**Note**: Merged Task 2.3 (list) and 2.4 (DTO) into this task — they modify the same service file and can't be tested independently (Flatline Sprint FINDING-004).

### Task 2.3: Cache Strategy — Tier Keys + Owner Bypass + Full Invalidation

**Files**: `apps/api/src/services/redis.ts`
**SDD**: §6.4
**Acceptance**:
- [ ] `CacheVisibilityTier = 'public' | 'org' | 'admin'`
- [ ] `getCacheVisibilityTier()` helper
- [ ] All 4 `CACHE_KEYS` families include tier: list, detail, summary, exists
- [ ] Owner requests bypass shared cache (SDD FINDING-004)
- [ ] `invalidateConstructCaches()`: deletes detail + exists + summary + **scans/deletes list keys** per tier (SDD FINDING-005)
- [ ] `invalidateForkParentCaches()` for fork create/delete
- [ ] Invalidation runs **after** write transaction commits
- [ ] **Tests**: cache tier selection, owner bypass, stale cache doesn't leak internal constructs

### Task 2.4: Route Layer — Constructs Routes

**Files**: `apps/api/src/routes/constructs.ts`
**SDD**: §7.1
**Acceptance**:
- [ ] `GET /` passes `getAccessContext(c)` + cache tier
- [ ] `GET /:slug` passes `getAccessContext(c)` + cache tier
- [ ] `HEAD /:slug` passes `getAccessContext(c)`
- [ ] `GET /summary` changed to `optionalAuth()`, passes context + cache tier

### Task 2.5: Route Layer — Packs Routes (Complete Inventory)

**Files**: `apps/api/src/routes/packs.ts`
**SDD**: §7.2
**Acceptance**:
- [ ] ALL slug-parameterized routes pass `getAccessContext(c)`:
  - versions, download, hash, reviews, fork, permissions
  - verification, ground-truth, signals, showcases, accuracy (SDD FINDING-001)
  - sync (owner/admin only)
- [ ] Fork endpoint verifies source accessibility before forking
- [ ] Audit: `grep` every `getPackBySlug` call site across ALL route files (not just packs.ts) to ensure context is passed (Flatline Sprint FINDING-003)
- [ ] **Tests**: Download internal pack without org → 404, fork internal → 404, fork provenance redacted

**Note**: Publish gate logic deferred to Sprint 3 Task 3.3 — this task is route wiring only (Flatline Sprint FINDING-006).

### Task 2.6: Sync Layer — Write Visibility to DB

**Files**: `apps/api/src/routes/webhooks.ts`, `apps/api/src/routes/packs.ts`
**SDD**: §5.2, §5.3
**Acceptance**:
- [ ] Webhook sync writes `syncResult.visibility` to packs update (respecting preservation guard from Task 1.2)
- [ ] Manual sync writes `syncResult.visibility` to packs update (same guard)
- [ ] Cache invalidation triggered after sync transaction commits
- [ ] **Tests**: Sync with visibility change → all cache tiers invalidated

### Task 2.7: Explorer — Auth Store + Badges + Filters + SSR

**Files**: `apps/explorer/lib/stores/auth-store.ts`, `apps/explorer/components/*`, `apps/explorer/app/(site)/constructs/[slug]/page.tsx`, `apps/explorer/app/(site)/page.tsx`
**SDD**: §8.1–§8.5
**Acceptance**:
- [ ] Auth store includes `isOrgMember`, populated from `/auth/me` response `is_org_member`
- [ ] `INTERNAL` amber badge on internal constructs
- [ ] Filter toggle: "Public | Internal | All" (only shown to org members)
- [ ] Listing pages pass auth token on client-side fetches
- [ ] SSR pages: unauthenticated fetch → public only (SEO-correct)
- [ ] Detail page: `AuthAwareConstructLoader` client component for internal constructs on hard refresh (SDD §8.5)
- [ ] Search results respect visibility

### Task 2.8: Construct Repo PRs — Visibility Field

**Files**: 13 construct repos (12 seeded + construct-base)
**SDD**: §11 (rollout step 3)
**Acceptance**:
- [ ] 9 public repos: add `visibility: public` to construct.yaml
- [ ] 4 internal repos: add `visibility: internal` to construct.yaml
- [ ] construct-base template: add `visibility: public` (template for external authors)
- [ ] After webhook sync, all packs have explicit manifest-declared visibility

**Can run in parallel with other Sprint 2 tasks** — these are external repo PRs.

---

## Sprint 3: External Submission + Hardening + Cleanup — 5 tasks

External developers can submit constructs. Regression guards prevent future bypasses. Preservation guard removed.

### Task 3.1: External Registration Endpoint

**Files**: `apps/api/src/routes/constructs.ts` or new route file
**SDD**: PRD FR-8
**Acceptance**:
- [ ] `POST /v1/constructs/register` accepts `{ slug, gitUrl }` from authenticated user
- [ ] Clones repo, validates construct.yaml via Zod schema
- [ ] Creates pack with `status: 'pending_review'`, `visibility: 'public'`, `submission_source: 'external'`
- [ ] Returns webhook setup instructions
- [ ] SSRF protections from existing `git-sync.ts` apply
- [ ] **Tests**: External submission → correct status + submission_source

### Task 3.2: Admin Review + Publish Gate Hardening

**Files**: `apps/api/src/routes/admin.ts` or constructs routes, `apps/api/src/routes/packs.ts`
**SDD**: PRD FR-8, §6.1.1
**Acceptance**:
- [ ] `PATCH /v1/admin/constructs/:slug/review` with `{ action: 'approve' | 'reject', reason? }`
- [ ] `requireAdmin()` middleware
- [ ] Approve: sets `status: 'published'`
- [ ] Reject: sets `status: 'rejected'` with reason
- [ ] Cache invalidation on status change
- [ ] `POST /:slug/versions` rejects if `submission_source = 'external'` AND `status = 'pending_review'`
- [ ] `PATCH /:slug` status changes are admin-only for external packs
- [ ] `POST /:slug/sync` rejects for pending_review external packs
- [ ] **Tests**: External pack publish attempt by non-admin → 403, admin approve → published

**Note**: Admin review and publish gate merged into one task — they're the same security boundary (Flatline Sprint FINDING-006).

### Task 3.3: Route Regression Test

**Files**: New test file
**SDD**: §7.2 (regression guard)
**Acceptance**:
- [ ] Test inventories ALL `:slug`-parameterized routes in **all route files** (packs.ts, constructs.ts, any others with `getPackBySlug` calls) (Flatline Sprint FINDING-003)
- [ ] Asserts each passes `PackAccessContext` to `getPackBySlug()`
- [ ] New routes without visibility context fail the test
- [ ] Runs in CI

### Task 3.4: Preservation Guard Removal

**Files**: `apps/api/src/services/git-sync.ts`, `apps/api/src/routes/webhooks.ts`, `apps/api/src/routes/packs.ts`, `scripts/seed-forge-packs.ts`
**SDD**: §11 (rollout step 4)
**Prerequisite**: All Task 2.8 construct repo PRs merged
**Acceptance**:
- [ ] Remove `visibilityExplicit` tracking from `SyncResult`
- [ ] Sync always writes manifest visibility (or default `internal`) — guard no longer needed
- [ ] Verify no pack has `NULL` visibility in DB
- [ ] **Tests**: Sync without explicit visibility → defaults to `internal` (expected post-guard behavior)

**Note**: This is the cleanup task missing from the original plan (Flatline Sprint FINDING-002).

### Task 3.5: Visibility Integration Test Suite

**Files**: New test file(s)
**SDD**: §10 (full test strategy)
**Acceptance**:
- [ ] 9 core visibility×auth unit tests
- [ ] 6 status×submission_source unit tests
- [ ] Integration: list anon → public only
- [ ] Integration: list org → public + internal
- [ ] Integration: `?visibility=internal` without org → 403
- [ ] Integration: owner views own internal construct (non-org) → visible, bypasses cache
- [ ] Integration: sync with visibility change → cache invalidated across all tiers
- [ ] Integration: external submission → pending_review → admin approve → published

**Note**: Dedicated test task ensures SDD §10 coverage isn't split across ad-hoc per-task tests (Flatline Sprint FINDING-005). Per-task tests above are unit-level; this task covers end-to-end integration.

---

## Deployment Sequence

Sequenced to prevent data loss (SDD §11, Flatline Sprint FINDING-001):

```
1. Deploy Task 1.1 (migration + backfill)
2. Deploy Task 1.2 (preservation guard) — SAME DEPLOY as 1.1
3. Deploy Tasks 1.3–1.6 (schema sync, auth)
4. Open construct repo PRs (Task 2.8) — parallel with Sprint 2 dev
5. Deploy Sprint 2 Tasks 2.1–2.7 (enforcement + explorer)
6. Merge all construct repo PRs → webhook sync writes explicit visibility
7. Deploy Task 3.4 (remove preservation guard)
8. Deploy Tasks 3.1–3.3, 3.5 (external submission + hardening + tests)
```

---

## Risk Mitigation

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Backfill overwrites on sync | S1 | Preservation guard (Task 1.2) deploys with migration |
| Old tokens lack `org` claim | S1 | `payload.org ?? false` default — org users re-login or wait for 15-min refresh |
| Cache serves internal to public | S2 | Tier-based cache keys + full invalidation matrix (Task 2.3) |
| Side-channel route bypass | S2 | Complete route inventory across all files (Task 2.5) + regression test (Task 3.3) |
| Team ownership false negatives | S2 | `isPackOwnerAsync()` with team member query (Task 2.1) |
| Preservation guard stays forever | S3 | Explicit removal task (Task 3.4) with prerequisite gate |
| GitHub API failure inconsistency | S1 | Single fail-stale policy in Tasks 1.5 + 1.6 |

---

## Flatline Sprint Review Log

**Reviewer**: Codex MCP (GPT-5.2)
**Verdict**: NEEDS_REVISION → all 8 findings integrated

| Finding | Severity | Title | Resolution |
|---------|----------|-------|------------|
| F-001 | BLOCKER | Preservation guard scheduled after needed | Moved to Sprint 1 Task 1.2, deploys with migration |
| F-002 | HIGH | No task for guard removal | Added Task 3.4 with prerequisite gate |
| F-003 | HIGH | Route inventory not exhaustive | Task 2.5 + 3.3 scope expanded to all route files |
| F-004 | HIGH | Construct detail/HEAD service changes unowned | Created Task 2.2 covering all construct service functions |
| F-005 | HIGH | Test strategy not scheduled | Added per-task test criteria + dedicated Task 3.5 integration suite |
| F-006 | MEDIUM | Publish gate duplicated | Removed from Task 2.5, consolidated in Task 3.2 |
| F-007 | MEDIUM | Contradictory failure policy | Unified in Tasks 1.5 + 1.6 with explicit first-login vs returning-user behavior |
| F-008 | LOW | Migration over-split | Merged Tasks 1.1–1.3 into single Task 1.1 |

---

> **Sources**: PRD `grimoires/loa/prd.md`, SDD `grimoires/loa/sdd.md` (24 Flatline findings integrated across PRD + SDD + Sprint)
