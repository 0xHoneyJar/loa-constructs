# PRD: Internal Dashboard + Convex Real-Time Integration

**Cycle**: cycle-040
**Created**: 2026-03-10
**Status**: Draft
**Depends on**: cycle-039 (Dynamic Labs auth — merged, auth store wired)
**Context**: `grimoires/loa/context/internal-dashboard-convex-plan.md`
**Grounded in**:
- `apps/api/src/routes/auth.ts:468-481` (`/me` response — no `is_admin` field)
- `apps/api/src/db/schema.ts:153` (`users.is_admin` exists in DB, never exposed)
- `apps/api/src/middleware/auth.ts:89` (`role: user.isAdmin ? 'admin' : 'user'` — populated but unused)
- `apps/api/src/services/auth.ts:280-299` (`generateApiKey`, `hashApiKey`, `verifyApiKey` — exist, no CRUD routes)
- `apps/api/src/db/schema.ts:261-281` (`apiKeys` table — full schema, no endpoints)
- `apps/explorer/lib/api/auth.ts:6-14` (`User` interface — no `isAdmin`, `role` is actually tier)
- `apps/explorer/lib/stores/auth-store.ts:26-43` (`AuthState` — no `isAdmin`)
- `apps/explorer/app/layout.tsx` (single `DynamicProvider` wrapper, no Convex)
- `apps/api/src/routes/analytics.ts` (user/creator stats only, no admin aggregate)
- `apps/api/src/routes/packs.ts:1283-1298` (`trackPackInstallation` — no webhook)
- Ecosystem: `midi-interface/convex/` (hot/cold pattern — BFF writes, WS reads, reconciliation cron)

---

## 1. Problem Statement

The Constructs Network has auth but no depth. Three gaps compound:

**P1: No internal dashboard.** Auth exists (Dynamic Labs wallet → Hono JWT) but gates nothing. Authenticated team members land on the same public page as anonymous visitors. The admin analytics API endpoints (`/v1/admin/*`) are fully wired but have no frontend consumer. There is no self-service API key management despite the `apiKeys` table and bcrypt validation being fully implemented in `services/auth.ts:280-299`.

**P2: No real-time visibility.** The registry is static — ISR with 1hr revalidation. No live install feed, no presence, no sync health indicators. The rest of the ecosystem (midi-interface) has Convex for real-time with graceful degradation, but the explorer has no equivalent.

**P3: Admin state is trapped in the database.** `users.is_admin` exists at `schema.ts:153`. The middleware reads it and sets `role: 'admin'` at `auth.ts:89`. But the `/me` endpoint at `auth.ts:471-479` never serializes it. The explorer's `User` interface has no `isAdmin` field. The auth store has no `isAdmin` field. Admin analytics exist but no admin can reach them through the UI.

> **Sources**: Codebase grounding (13 files), `internal-dashboard-convex-plan.md`, midi-interface Convex pattern analysis.

---

## 2. Vision & Design Principles

**Vision**: Progressive disclosure. Public browse stays unchanged. Wallet auth unlocks a dashboard with construct management, API key self-service, and real-time activity. Admin status unlocks platform analytics.

**Design Principles**:

1. **Progressive disclosure** — Public pages are unaffected. Dashboard is additive, behind auth. Admin sections are additive, behind `isAdmin`.

2. **Hot/cold architecture** — Convex for real-time reads (WebSocket subscriptions), Supabase remains source of truth. BFF routes for auth-bearing writes. Same pattern as midi-interface.

3. **Graceful degradation** — No Convex URL → app works fully without real-time features. All Convex UI components use `"skip"` sentinel fallback.

4. **No new auth** — Uses existing Dynamic Labs + Hono JWT pipeline from cycle-039. Dashboard only needs `isAuthenticated` + `isAdmin` from the auth store.

---

## 3. Goals & Success Metrics

### Business Goals

| Goal | Measure | Target |
|------|---------|--------|
| Team members have a dashboard | Auth'd user at `/dashboard` sees overview | Works |
| Admin analytics accessible | `isAdmin` user sees platform stats | Works |
| Self-service API keys | Create/list/revoke keys from dashboard | Works |
| Real-time install feed | New installs appear within 2s | <2s latency |
| No Convex = no breakage | App runs without `NEXT_PUBLIC_CONVEX_URL` | Fully functional |

### Non-Goals (Explicit)

- **Replacing Supabase with Convex** — Convex is hot layer only. PostgreSQL is truth.
- **External user dashboard** — Dashboard is for 0xHoneyJar org members only.
- **Billing/payment integration** — No Stripe, no NowPayments in this cycle.
- **Per-construct management UI** — No CRUD for constructs from dashboard. That's `/construct sync`.
- **Auth changes** — Dynamic Labs provider already wired. No auth flow modifications.

---

## 4. User & Stakeholder Context

### Persona 1: Team Member (Primary)

**Who**: Developer on `0xHoneyJar` GitHub org, authenticated via Dynamic Labs.
**Has**: Working wallet auth, `isOrgMember: true` in auth store.
**Needs**: Dashboard with construct overview, API key management, live activity feed.
**Current pain**: Logs in, sees same page as anonymous users. No API key UI. No way to see install activity in real-time.
**Expected flow**: Auth'd → click "Dashboard" in header → sidebar nav → overview / keys / constructs / explore.

### Persona 2: Admin (@janitooor)

**Who**: `is_admin = true` in DB (wallet `0x79092A805f1cf9B0F5bE3c5A296De6e51c1DEd34`).
**Has**: All team member access + admin role in DB.
**Needs**: Platform-wide analytics (user count, total installs, construct health).
**Current pain**: Admin analytics API exists but has no frontend consumer.
**Expected flow**: Same as team member + admin-only sections visible in dashboard sidebar and overview page.

---

## 5. Functional Requirements

### FR-1: Expose `is_admin` from API (P0 — blocks dashboard gating)

**Modify**: `apps/api/src/routes/auth.ts` (lines 471-481)

Add `is_admin: user.role === 'admin'` and `wallet_address` to the `/me` response. The `AuthUser` already carries `role` populated from `users.isAdmin` at `middleware/auth.ts:89`.

**Modify**: `apps/explorer/lib/api/auth.ts`
- Add `isAdmin: boolean` and `walletAddress: string | null` to `User` interface
- Map from `u.is_admin` in `fetchMe()`

**Modify**: `apps/explorer/lib/stores/auth-store.ts`
- Add `isAdmin: boolean` to `AuthState` (default `false`)
- Populate in `initialize`, `login`, `connectDynamic` from `user.isAdmin`

**Acceptance Criteria**:
- [ ] `/auth/me` returns `is_admin: boolean` and `wallet_address: string | null`
- [ ] `User` interface includes `isAdmin` and `walletAddress`
- [ ] Auth store exposes `isAdmin` alongside existing `isOrgMember`
- [ ] Existing auth flows (login, OAuth, Dynamic) unaffected

### FR-2: Next.js Middleware — Dashboard Soft Gate

**Create**: `apps/explorer/middleware.ts`

Match `/dashboard/:path*` only. Check `access_token` cookie existence (js-cookie, non-HttpOnly). No token → redirect to `/?login=required`. This is a soft gate — real auth is API-side. Prevents flash of dashboard UI for logged-out users.

**Acceptance Criteria**:
- [ ] Only matches `/dashboard/*` routes
- [ ] Redirects to `/?login=required` when no `access_token` cookie
- [ ] Does not affect any other routes (public pages, API routes)
- [ ] Cookie check only — no JWT validation in middleware

### FR-3: Dashboard Layout + Navigation

**Create**: `apps/explorer/app/(dashboard)/layout.tsx`
- Left sidebar (~200px) + content area
- Client component that reads auth store, redirects if `!isAuthenticated`
- Sidebar nav: Overview, Explore, Constructs, API Keys
- Admin-only items gated by `isAdmin`

**Create**: `apps/explorer/components/dashboard/sidebar.tsx`
**Create**: `apps/explorer/components/dashboard/dashboard-header.tsx`
- Shows wallet address, org badge, breadcrumbs

**Acceptance Criteria**:
- [ ] Dashboard layout renders with sidebar + content
- [ ] Unauthenticated redirect works even if middleware is bypassed
- [ ] Admin nav items visible only to `isAdmin` users
- [ ] Sidebar highlights active route

### FR-4: Dashboard Overview Page

**Create**: `apps/explorer/app/(dashboard)/dashboard/page.tsx`
- Total constructs count, recent activity, quick links
- Admin section (user count, platform stats) gated by `isAdmin`, calls `GET /v1/admin/analytics`

**Create**: `apps/explorer/lib/api/dashboard.ts`
- Authenticated fetch helpers with `Authorization: Bearer` from auth store

**Acceptance Criteria**:
- [ ] Overview shows construct count and recent activity for all auth'd users
- [ ] Admin section calls existing admin analytics API
- [ ] Non-admin users see overview without admin section (no error)

### FR-5: Dashboard Explore Page

**Create**: `apps/explorer/app/(dashboard)/dashboard/explore/page.tsx`
- Reuses existing `GraphExplorer` from `components/graph/graph-explorer.tsx`
- Same `fetchGraphData()` ISR call, wrapped in dashboard layout
- Public `/explore` stays as-is

**Acceptance Criteria**:
- [ ] Graph renders within dashboard layout
- [ ] Public `/explore` unchanged
- [ ] No duplicate data fetching

### FR-6: Header Dashboard Link

**Modify**: `apps/explorer/components/layout/auth-nav.tsx`
- Add "Dashboard" link when `isAuthenticated`

**Acceptance Criteria**:
- [ ] "Dashboard" link appears only for authenticated users
- [ ] Links to `/dashboard`
- [ ] Positioned before the connect button/address display

### FR-7: Admin Wallet Migration

**Create**: `apps/api/src/db/migrations/0010_admin_wallet.sql`

```sql
UPDATE users SET is_admin = true
WHERE LOWER(wallet_address) = LOWER('0x79092A805f1cf9B0F5bE3c5A296De6e51c1DEd34');
```

**Acceptance Criteria**:
- [ ] Migration is idempotent
- [ ] Only affects the specified wallet address
- [ ] Case-insensitive matching

### FR-8: API Key CRUD Endpoints

**Create**: `apps/api/src/routes/keys.ts`

Three endpoints using existing utilities from `services/auth.ts:280-299`:

| Endpoint | Auth | Behavior |
|----------|------|----------|
| `POST /v1/keys` | `requireAuth()` | `generateApiKey()` + `hashApiKey()` → insert `apiKeys` row. Return full key ONCE. Max 10 active keys/user. |
| `GET /v1/keys` | `requireAuth()` | List user's non-revoked keys (prefix, name, scopes, last_used, created). Never return hash. |
| `DELETE /v1/keys/:id` | `requireAuth()` | Set `revoked = true`. Validate key belongs to requesting user. |

**Modify**: `apps/api/src/app.ts`
- Register `keysRouter` at `/v1/keys`

**Acceptance Criteria**:
- [ ] POST creates key, returns full key once, enforces 10-key limit
- [ ] GET lists keys with prefix, name, scopes, last_used — no hash or full key
- [ ] DELETE sets `revoked = true`, rejects if key doesn't belong to user
- [ ] Existing `validateApiKeyAuth` in middleware rejects revoked keys (already works)

### FR-9: API Key Dashboard UI

**Create**: `apps/explorer/app/(dashboard)/dashboard/keys/page.tsx`
**Create**: `apps/explorer/components/dashboard/api-key-list.tsx`
**Create**: `apps/explorer/components/dashboard/create-key-dialog.tsx`
**Create**: `apps/explorer/lib/api/keys.ts`

- Key table: prefix, name, scopes, last_used, created_at, revoke button
- Create dialog: name input, scope checkboxes. On success, show full key ONCE with copy button

**Acceptance Criteria**:
- [ ] Table displays all user's active keys
- [ ] Create dialog returns full key once with copy-to-clipboard
- [ ] Revoke button confirms then calls DELETE
- [ ] Empty state shown when no keys exist

### FR-10: Convex Project Setup

```bash
cd apps/explorer && bun add convex
```

**Create**: `apps/explorer/convex/schema.ts`
- `installEvents` — live install feed (packSlug, action, timestamp) with `by_created` index
- `syncStatus` — construct sync health (slug, status, lastSyncAt) with `by_slug` index
- `dashboardPresence` — who's online (wallet, lastSeen, expiresAt) with `by_expires` index

**Create**: `apps/explorer/convex/installEvents.ts` — queries + mutations
**Create**: `apps/explorer/convex/syncStatus.ts` — queries + mutations
**Create**: `apps/explorer/convex/dashboardPresence.ts` — queries + mutations + internal cleanup

**Acceptance Criteria**:
- [ ] All tables have proper indexes (no naked `.collect()` on large tables)
- [ ] Mutations gate on write key for server-to-server calls
- [ ] Queries support pagination/limit parameters

### FR-11: Convex Provider with Graceful Degradation

**Create**: `apps/explorer/components/providers/convex-provider.tsx`

Exact midi-interface pattern:
```ts
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
```

No Convex URL → renders children without provider, app works fully offline.

**Modify**: `apps/explorer/app/layout.tsx`
- Wrap with `ConvexProvider` inside `DynamicProvider`

**Acceptance Criteria**:
- [ ] Module-level singleton (not recreated per render)
- [ ] App runs fully without `NEXT_PUBLIC_CONVEX_URL`
- [ ] Console warning when Convex not configured (not error)

### FR-12: Server-Side Convex Client

**Create**: `apps/explorer/lib/convex/server.ts`

Singleton `ConvexHttpClient` (midi-interface `lib/agora/server.ts` pattern). Reads `CONVEX_URL ?? NEXT_PUBLIC_CONVEX_URL`. Returns `null` if not configured.

**Acceptance Criteria**:
- [ ] Lazy-initialized singleton
- [ ] Returns `null` when env vars absent (callers return 503)

### FR-13: Install Event Webhook

**Create**: `apps/explorer/app/api/convex/install/route.ts`
- BFF route: validates `CONVEX_WRITE_KEY` shared secret, writes to Convex `installEvents`

**Modify**: `apps/api/src/routes/packs.ts` (install tracking path at line ~1284)
- After recording `pack_installations` row, fire-and-forget webhook to explorer BFF
- Non-blocking, non-fatal (same pattern as midi profile hydration)

**Acceptance Criteria**:
- [ ] Webhook validates shared secret before writing
- [ ] API fire-and-forget: failure doesn't affect install tracking
- [ ] Install event appears in Convex within 2s of API call

### FR-14: Real-Time Dashboard Components

**Create**: `apps/explorer/components/dashboard/live-install-feed.tsx`
- `useQuery(api.installEvents.recent, { limit: 20 })` with `"skip"` sentinel fallback
- Scrolling feed of recent installs

**Create**: `apps/explorer/hooks/use-dashboard-presence.ts`
- 30s heartbeat to `dashboardPresence`, shows who else is online

**Acceptance Criteria**:
- [ ] Install feed updates live via WebSocket subscription
- [ ] Components render gracefully when Convex not configured (empty state, not error)
- [ ] Presence heartbeat cleans up on unmount

### FR-15: Construct Metrics Page

**Create**: `apps/explorer/app/(dashboard)/dashboard/constructs/page.tsx`
- All constructs with install counts (cold data from Supabase via existing admin API)
- Live install feed sidebar (hot data from Convex)

**Modify**: `apps/api/src/routes/analytics.ts`
- Add `GET /v1/analytics/installs?pack_id=X&period=30d` — daily bucketed install counts using `date_trunc('day', created_at)` on `pack_installations`

**Acceptance Criteria**:
- [ ] Construct list shows install counts from Supabase
- [ ] Live feed sidebar shows real-time installs from Convex
- [ ] Analytics endpoint supports `pack_id` filter and `period` parameter

### FR-16: Sync Reconciliation Cron

**Create**: `apps/explorer/app/api/cron/reconcile/route.ts`
- Every 15 min: compare recent `pack_installations` (Supabase) with Convex `installEvents`, backfill gaps
- Pattern from midi-interface `app/api/cron/reconcile-profiles/route.ts`
- Time budget guard (50s max), paginated, `CRON_SECRET` auth

**Acceptance Criteria**:
- [ ] Verifies `CRON_SECRET` from `Authorization: Bearer`
- [ ] Paginated with time budget guard
- [ ] Monotonic guard: skips if event already exists in Convex
- [ ] Partial success returns reconciled count

---

## 6. Technical & Non-Functional Requirements

### NFR-1: Performance

- Dashboard pages are client components (no ISR needed — auth-gated)
- Convex subscriptions use indexed queries only (no table scans)
- Install webhook is fire-and-forget (does not slow down install API)
- Live feed limited to 20 most recent events

### NFR-2: Security

- Dashboard soft-gated by middleware (cookie check) + hard-gated by auth store
- Admin sections double-gated: `isAuthenticated && isAdmin`
- API key full value shown once, then only prefix
- Key CRUD endpoints validate ownership (user_id match)
- Convex write mutations gated by `CONVEX_WRITE_KEY` shared secret
- Reconciliation cron gated by `CRON_SECRET`
- No admin bypass — `isAdmin` is DB-authoritative, not JWT-claimable

### NFR-3: Compatibility

- Public pages (`/`, `/explore`, `/constructs/*`, `/about`) unchanged
- Existing auth flows (login, OAuth, Dynamic) unaffected
- Existing API endpoints backwards-compatible
- App fully functional without Convex environment variables

---

## 7. Scope & Prioritization

### Phase 1: Dashboard Shell + Auth Routing (Sprint 1-2)

| Priority | Feature | FR |
|----------|---------|-----|
| P0 | Expose `is_admin` from API | FR-1 |
| P0 | Next.js middleware (soft gate) | FR-2 |
| P0 | Dashboard layout + sidebar | FR-3 |
| P1 | Overview page | FR-4 |
| P1 | Explore in dashboard | FR-5 |
| P1 | Header dashboard link | FR-6 |
| P2 | Admin wallet migration | FR-7 |

### Phase 2: API Key Management (Sprint 3)

| Priority | Feature | FR |
|----------|---------|-----|
| P0 | Key CRUD endpoints | FR-8 |
| P0 | Key dashboard UI | FR-9 |

### Phase 3: Convex Real-Time (Sprint 4-5)

| Priority | Feature | FR |
|----------|---------|-----|
| P0 | Convex setup + provider | FR-10, FR-11 |
| P0 | Server-side client | FR-12 |
| P1 | Install webhook | FR-13 |
| P1 | Live feed + presence | FR-14 |
| P1 | Construct metrics page | FR-15 |
| P2 | Reconciliation cron | FR-16 |

### Future (Not This Cycle)

- Construct CRUD from dashboard (create/update/delete)
- Usage analytics per API key
- Billing integration (NowPayments)
- Team management UI
- Notification center (installs, sync failures)

---

## 8. Risks & Dependencies

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Convex cold start latency on first dashboard load | Medium | Low | Singleton client, lazy init |
| Convex free tier limits (function calls/month) | Low | Medium | Monitor usage, reconciliation cron is heaviest consumer |
| `is_admin` exposure creates privilege escalation surface | Low | High | DB-authoritative (not JWT claim), server validates on every request |
| Dashboard layout breaks existing (site) pages | Low | High | Separate route group `(dashboard)`, no shared layout |

### External Dependencies

| Dependency | Owner | Risk |
|-----------|-------|------|
| Convex project creation + env vars | @janitooor | Must set up before Phase 3 |
| `CONVEX_WRITE_KEY` shared secret | @janitooor | Needed for install webhook |
| `CRON_SECRET` for Vercel cron auth | @janitooor | Needed for reconciliation |
| Admin wallet in production DB | @janitooor | Migration 0010 must run |

---

## 9. New Environment Variables

| Variable | App | Phase |
|----------|-----|-------|
| `NEXT_PUBLIC_CONVEX_URL` | explorer | 3 |
| `CONVEX_URL` | explorer | 3 |
| `CONVEX_WRITE_KEY` | explorer + api | 3 |
| `CRON_SECRET` | explorer | 3 |

---

## 10. File Inventory

### Phase 1 (8 new + 4 modify)

| Action | File |
|--------|------|
| Create | `apps/explorer/middleware.ts` |
| Create | `apps/explorer/app/(dashboard)/layout.tsx` |
| Create | `apps/explorer/app/(dashboard)/dashboard/page.tsx` |
| Create | `apps/explorer/app/(dashboard)/dashboard/explore/page.tsx` |
| Create | `apps/explorer/components/dashboard/sidebar.tsx` |
| Create | `apps/explorer/components/dashboard/dashboard-header.tsx` |
| Create | `apps/explorer/lib/api/dashboard.ts` |
| Create | `apps/api/src/db/migrations/0010_admin_wallet.sql` |
| Modify | `apps/api/src/routes/auth.ts` — add `is_admin`, `wallet_address` to `/me` |
| Modify | `apps/explorer/lib/api/auth.ts` — add `isAdmin`, `walletAddress` to User |
| Modify | `apps/explorer/lib/stores/auth-store.ts` — add `isAdmin` state |
| Modify | `apps/explorer/components/layout/auth-nav.tsx` — dashboard link |

### Phase 2 (5 new + 1 modify)

| Action | File |
|--------|------|
| Create | `apps/api/src/routes/keys.ts` |
| Create | `apps/explorer/app/(dashboard)/dashboard/keys/page.tsx` |
| Create | `apps/explorer/components/dashboard/api-key-list.tsx` |
| Create | `apps/explorer/components/dashboard/create-key-dialog.tsx` |
| Create | `apps/explorer/lib/api/keys.ts` |
| Modify | `apps/api/src/app.ts` — register keys router |

### Phase 3 (10 new + 3 modify)

| Action | File |
|--------|------|
| Create | `apps/explorer/convex/schema.ts` |
| Create | `apps/explorer/convex/installEvents.ts` |
| Create | `apps/explorer/convex/syncStatus.ts` |
| Create | `apps/explorer/convex/dashboardPresence.ts` |
| Create | `apps/explorer/components/providers/convex-provider.tsx` |
| Create | `apps/explorer/lib/convex/server.ts` |
| Create | `apps/explorer/app/api/convex/install/route.ts` |
| Create | `apps/explorer/components/dashboard/live-install-feed.tsx` |
| Create | `apps/explorer/hooks/use-dashboard-presence.ts` |
| Create | `apps/explorer/app/(dashboard)/dashboard/constructs/page.tsx` |
| Create | `apps/explorer/app/api/cron/reconcile/route.ts` |
| Modify | `apps/explorer/app/layout.tsx` — ConvexProvider wrapper |
| Modify | `apps/api/src/routes/packs.ts` — fire install webhook |
| Modify | `apps/api/src/routes/analytics.ts` — daily install buckets |

---

## 11. Grounding Discrepancies Found

Issues discovered during codebase grounding that should be addressed in implementation:

1. **`User.role` is actually tier** — `explorer/lib/api/auth.ts:40` maps `u.tier` to `role`. The DB/middleware `role` (admin vs user) is never surfaced. FR-1 adds `isAdmin` to fix this without touching the misnamed field.

2. **`User.createdAt` is phantom data** — `/me` never returns `created_at`, so `fetchMe` always falls back to `new Date().toISOString()`. Not blocking, but worth noting.

3. **No `requireAdmin` middleware** — Only `requireOrgMember` exists. Admin-gated endpoints in this cycle should use `requireAuth()` + manual `role === 'admin'` check, or create a `requireAdmin` middleware.

4. **`analyticsRouter` mounted at `/v1/` root** — Not at `/v1/analytics`. New install analytics (FR-15) should use the `adminRouter` at `/v1/admin` or create a proper `/v1/analytics` namespace.

---

## Next Step

`/architect` to create Software Design Document based on this PRD.
