# Sprint Plan: Internal Dashboard + Convex Real-Time Integration

**Cycle**: cycle-040
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Sprints**: 5
**Total tasks**: 22

---

## Sprint 1: Foundation — `is_admin` Pipeline + Auth Store + Middleware

**Label**: Foundation — Admin Pipeline + Dashboard Gate
**FR**: FR-1, FR-2, FR-6, FR-7

Wire `is_admin` from DB through API to frontend auth store. Create dashboard middleware soft gate. Update header nav. Run migration.

### Tasks

#### 1.1 — Expose `is_admin` and `wallet_address` in `/auth/me` response

**File**: `apps/api/src/routes/auth.ts` (lines 471-479)
**Action**: Add `is_admin: user.role === 'admin'` and `wallet_address` to the user object in `/me` response.
**AC**:
- [ ] `/auth/me` returns `is_admin: boolean`
- [ ] `/auth/me` returns `wallet_address: string | null`
- [ ] Existing fields unchanged

#### 1.2 — Add `isAdmin` and `walletAddress` to explorer `User` interface and `fetchMe`

**File**: `apps/explorer/lib/api/auth.ts`
**Action**: Add `isAdmin: boolean` and `walletAddress: string | null` to `User` interface. Map `u.is_admin` and `u.wallet_address` in `fetchMe`.
**AC**:
- [ ] `User` interface has both new fields
- [ ] `fetchMe` maps snake_case → camelCase correctly

#### 1.3 — Add `isAdmin` to auth store

**File**: `apps/explorer/lib/stores/auth-store.ts`
**Action**: Add `isAdmin: boolean` to `AuthState` (default `false`). Populate in `initialize`, `login`, `connectDynamic`, `refreshToken` from `user.isAdmin`.
**AC**:
- [ ] `isAdmin` in state, default `false`
- [ ] All 4 auth paths set `isAdmin` from fetched user
- [ ] `clearTokens` resets `isAdmin` to `false`

#### 1.4 — Create Next.js middleware for dashboard soft gate

**File**: `apps/explorer/middleware.ts` (new)
**Action**: Matcher `/dashboard/:path*`. Check `access_token` cookie. No cookie → redirect `/?login=required`.
**AC**:
- [ ] Only matches `/dashboard/*`
- [ ] Redirects when no `access_token` cookie
- [ ] Does not affect other routes

#### 1.5 — Add Dashboard link to AuthNav

**File**: `apps/explorer/components/layout/auth-nav.tsx`
**Action**: Add "Dashboard" link when `isAuthenticated`. Position before org badge.
**AC**:
- [ ] Link visible only when authenticated
- [ ] Links to `/dashboard`
- [ ] Styled consistently with existing nav elements

#### 1.6 — Create admin wallet migration

**File**: `apps/api/src/db/migrations/0010_admin_wallet.sql` (new)
**Action**: `UPDATE users SET is_admin = true WHERE LOWER(wallet_address) = LOWER('0x79092A805f1cf9B0F5bE3c5A296De6e51c1DEd34')`
**AC**:
- [ ] Idempotent
- [ ] Case-insensitive match

---

## Sprint 2: Dashboard Shell — Layout + Pages

**Label**: Dashboard Shell — Layout, Sidebar, Pages
**FR**: FR-3, FR-4, FR-5

Build the dashboard route group with layout, sidebar, header, overview page, and explore page.

### Tasks

#### 2.1 — Create dashboard layout with auth hard gate

**File**: `apps/explorer/app/(dashboard)/layout.tsx` (new)
**Action**: Client component. Sidebar (200px) + content area. Read `useAuthStore()`. If `!isAuthenticated` after hydration → redirect to `/`. Pass `children` into content area.
**AC**:
- [ ] Renders sidebar + content
- [ ] Redirects unauthenticated users
- [ ] Works with middleware (double gate)

#### 2.2 — Create sidebar navigation

**File**: `apps/explorer/components/dashboard/sidebar.tsx` (new)
**Action**: Nav items: Overview, Explore, Constructs, API Keys. Admin section (Analytics) gated by `isAdmin`. Highlight active route via `usePathname()`.
**AC**:
- [ ] All nav items render and link correctly
- [ ] Admin section hidden for non-admin
- [ ] Active route highlighted

#### 2.3 — Create dashboard header

**File**: `apps/explorer/components/dashboard/dashboard-header.tsx` (new)
**Action**: Breadcrumbs from pathname, wallet address display (truncated), org badge, admin badge.
**AC**:
- [ ] Breadcrumbs reflect current route
- [ ] Wallet address truncated (0x1234...5678)
- [ ] Badges match design system (void/bone/cyan)

#### 2.4 — Create dashboard overview page

**File**: `apps/explorer/app/(dashboard)/dashboard/page.tsx` (new)
**File**: `apps/explorer/lib/api/dashboard.ts` (new)
**Action**: Total constructs count, recent activity, quick links. Admin section calls `GET /v1/admin/analytics` (existing endpoint) gated by `isAdmin`. `dashboard.ts` provides authenticated fetch helper.
**AC**:
- [ ] Overview shows construct count for all auth'd users
- [ ] Admin section shows platform stats (users, installs, subscriptions)
- [ ] Non-admin sees no admin section (no error)

#### 2.5 — Create dashboard explore page

**File**: `apps/explorer/app/(dashboard)/dashboard/explore/page.tsx` (new)
**Action**: Reuse existing `GraphExplorer` component. Pass pre-fetched `graphData` via `fetchGraphData()`.
**AC**:
- [ ] Graph renders in dashboard layout
- [ ] Public `/explore` unchanged
- [ ] No duplicate data fetching

---

## Sprint 3: API Key Management

**Label**: API Keys — CRUD Endpoints + Dashboard UI
**FR**: FR-8, FR-9

Full-stack API key management: Hono CRUD endpoints + dashboard key management UI.

### Tasks

#### 3.1 — Create keys CRUD router

**File**: `apps/api/src/routes/keys.ts` (new)
**Action**: Three endpoints: `POST /v1/keys` (create), `GET /v1/keys` (list), `DELETE /v1/keys/:id` (revoke). Uses existing `generateApiKey`, `hashApiKey` from `services/auth.ts`. Enforces 10-key limit per user.
**AC**:
- [ ] POST creates key, returns full key once, 201
- [ ] POST rejects at 10 active keys (400)
- [ ] GET lists prefix/name/scopes/lastUsed — no hash
- [ ] DELETE sets `revoked = true`, validates ownership (404 if not owner)

#### 3.2 — Register keys router in app

**File**: `apps/api/src/app.ts`
**Action**: Import `keysRouter`, mount at `/v1/keys`.
**AC**:
- [ ] Route registered
- [ ] No conflicts with existing routes

#### 3.3 — Create key API client

**File**: `apps/explorer/lib/api/keys.ts` (new)
**Action**: Functions: `createKey(name, scopes)`, `listKeys()`, `revokeKey(id)`. Authenticated via auth store token.
**AC**:
- [ ] All three functions hit correct endpoints with Bearer auth
- [ ] Error handling for 400/401/404

#### 3.4 — Create key list component

**File**: `apps/explorer/components/dashboard/api-key-list.tsx` (new)
**Action**: Table: prefix, name, scopes as pills, last_used relative time, revoke button with confirmation. Empty state.
**AC**:
- [ ] Renders key table
- [ ] Revoke button confirms before DELETE
- [ ] Empty state with "Create your first key" CTA

#### 3.5 — Create key dialog component

**File**: `apps/explorer/components/dashboard/create-key-dialog.tsx` (new)
**Action**: Name input, scope checkboxes. On success: modal shows full key in monospace + copy button + "This key won't be shown again" warning. Closes → refreshes list.
**AC**:
- [ ] Full key displayed once on creation
- [ ] Copy button works
- [ ] Dialog closes and list refreshes

#### 3.6 — Create keys dashboard page

**File**: `apps/explorer/app/(dashboard)/dashboard/keys/page.tsx` (new)
**Action**: Composes `ApiKeyList` + create button that opens `CreateKeyDialog`.
**AC**:
- [ ] Page renders in dashboard layout
- [ ] Create and manage flow works end-to-end

---

## Sprint 4: Convex Setup + Provider + Server Client

**Label**: Convex Foundation — Schema, Provider, Server Client, Webhook
**FR**: FR-10, FR-11, FR-12, FR-13

Install Convex, define schema, set up provider with graceful degradation, server-side client, and install webhook pipeline.

### Tasks

#### 4.1 — Install Convex dependency

**Action**: `cd apps/explorer && bun add convex`. Create `convex.json` with `"functions": "convex/"` for monorepo path override.
**AC**:
- [ ] `convex` in `apps/explorer/package.json`
- [ ] `convex.json` at `apps/explorer/`

#### 4.2 — Create Convex schema

**File**: `apps/explorer/convex/schema.ts` (new)
**Action**: Three tables: `installEvents` (by_created index), `syncStatus` (by_slug index), `dashboardPresence` (by_wallet, by_expires indexes).
**AC**:
- [ ] All tables defined with proper validators
- [ ] Every query access pattern has an index

#### 4.3 — Create Convex functions

**File**: `apps/explorer/convex/installEvents.ts` (new)
**File**: `apps/explorer/convex/syncStatus.ts` (new)
**File**: `apps/explorer/convex/dashboardPresence.ts` (new)
**File**: `apps/explorer/convex/crons.ts` (new)
**Action**: Queries for live reads, mutations gated by write key for server writes, internal mutations for cron cleanup. Cron: 30s presence cleanup.
**AC**:
- [ ] `installEvents.recent` query returns last N events
- [ ] `installEvents.record` mutation validates write key
- [ ] `dashboardPresence.upsert` mutation handles heartbeat
- [ ] `dashboardPresence.listOnline` query returns non-expired entries
- [ ] `dashboardPresence.cleanupExpired` internal mutation deletes expired rows
- [ ] Cron registered for presence cleanup

#### 4.4 — Create ConvexProvider with graceful degradation

**File**: `apps/explorer/components/providers/convex-provider.tsx` (new)
**Action**: Module-level singleton `ConvexReactClient`. No URL → render children without provider. Console warning.
**Modify**: `apps/explorer/app/layout.tsx` — wrap with `ConvexProvider` inside `DynamicProvider`.
**AC**:
- [ ] App works without `NEXT_PUBLIC_CONVEX_URL`
- [ ] Console warning (not error) when not configured
- [ ] Singleton (not recreated per render)

#### 4.5 — Create server-side Convex client

**File**: `apps/explorer/lib/convex/server.ts` (new)
**Action**: Lazy singleton `ConvexHttpClient`. Falls back `CONVEX_URL → NEXT_PUBLIC_CONVEX_URL`. Returns `null` if absent.
**AC**:
- [ ] Singleton pattern
- [ ] Returns null when not configured
- [ ] Callers can check and return 503

#### 4.6 — Create install webhook BFF route

**File**: `apps/explorer/app/api/convex/install/route.ts` (new)
**Action**: POST handler. Validates `CONVEX_WRITE_KEY` from `Authorization: Bearer`. Writes to Convex `installEvents.record`.
**AC**:
- [ ] 401 if no/bad write key
- [ ] 503 if Convex not configured
- [ ] 200 on success

#### 4.7 — Fire webhook from API install tracking

**File**: `apps/api/src/routes/packs.ts` (modify, after `trackPackInstallation`)
**Action**: Fire-and-forget `fetch` to `CONVEX_WEBHOOK_URL` with `CONVEX_WRITE_KEY` bearer auth. `.catch(() => {})` — non-blocking.
**AC**:
- [ ] Webhook fires after install tracking
- [ ] Failure does not affect install response
- [ ] Skipped when `CONVEX_WEBHOOK_URL` not set

---

## Sprint 5: Live Dashboard Components + Reconciliation

**Label**: Live Feed, Presence, Metrics, Reconciliation
**FR**: FR-14, FR-15, FR-16

Wire Convex subscriptions into dashboard components. Build construct metrics page. Set up reconciliation cron.

### Tasks

#### 5.1 — Create live install feed component

**File**: `apps/explorer/components/dashboard/live-install-feed.tsx` (new)
**Action**: `useQuery(api.installEvents.recent, { limit: 20 })`. Skeleton on undefined, empty state on empty array, scrollable feed on data.
**AC**:
- [ ] Live updates via WebSocket
- [ ] Graceful when Convex not configured (skeleton, not crash)
- [ ] Scrollable, max-height constrained

#### 5.2 — Create dashboard presence hook

**File**: `apps/explorer/hooks/use-dashboard-presence.ts` (new)
**Action**: 30s interval heartbeat to `dashboardPresence.upsert`. Query `dashboardPresence.listOnline`. Cleanup on unmount.
**AC**:
- [ ] Heartbeat fires every 30s
- [ ] Initial heartbeat on mount
- [ ] Interval cleared on unmount
- [ ] Returns online users list

#### 5.3 — Create construct metrics page

**File**: `apps/explorer/app/(dashboard)/dashboard/constructs/page.tsx` (new)
**Action**: All constructs with install counts (cold data from existing admin API). Live install feed sidebar (hot data from Convex `LiveInstallFeed`).
**AC**:
- [ ] Construct list with install counts
- [ ] Live feed sidebar
- [ ] Works without Convex (feed shows empty/skeleton)

#### 5.4 — Add daily install analytics endpoint

**File**: `apps/api/src/routes/analytics.ts` (modify, on admin router)
**Action**: `GET /v1/admin/analytics/installs?pack_id=X&period=30d`. Daily bucketed install counts via `date_trunc('day', created_at)` on `pack_installations`.
**AC**:
- [ ] Returns daily bucketed counts
- [ ] Supports `pack_id` filter and `period` parameter
- [ ] Requires admin auth

#### 5.5 — Create reconciliation cron

**File**: `apps/explorer/app/api/cron/reconcile/route.ts` (new)
**Action**: GET handler. Validates `CRON_SECRET`. Fetches recent installs from Supabase, compares with Convex, backfills gaps. Time-budget guard (50s). Register in `vercel.json` at `*/15 * * * *`.
**AC**:
- [ ] 401 without CRON_SECRET
- [ ] Paginated with time budget
- [ ] Returns reconciled count
- [ ] Registered in vercel.json

---

## Sprint Dependency Graph

```
Sprint 1 (Foundation)
  └── Sprint 2 (Dashboard Shell) ─── depends on isAdmin + middleware
       └── Sprint 3 (API Keys) ─── depends on dashboard layout
       └── Sprint 5 (Live Components) ─── depends on dashboard pages

Sprint 4 (Convex Foundation) ─── independent of Sprint 2/3
  └── Sprint 5 (Live Components) ─── depends on Convex schema + provider
```

Sprint 4 can run in parallel with Sprint 2+3. Sprint 5 depends on both Sprint 2 (dashboard pages) and Sprint 4 (Convex).

---

## Ledger Mapping

| Sprint | Local ID | Global ID | Label |
|--------|----------|-----------|-------|
| 1 | sprint-1 | sprint-40 | Foundation — Admin Pipeline + Dashboard Gate |
| 2 | sprint-2 | sprint-41 | Dashboard Shell — Layout, Sidebar, Pages |
| 3 | sprint-3 | sprint-42 | API Keys — CRUD Endpoints + Dashboard UI |
| 4 | sprint-4 | sprint-43 | Convex Foundation — Schema, Provider, Server Client, Webhook |
| 5 | sprint-5 | sprint-44 | Live Feed, Presence, Metrics, Reconciliation |
