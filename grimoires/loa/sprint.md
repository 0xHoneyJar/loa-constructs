# Sprint Plan: Dynamic Labs Auth + Internal Constructs Access

**Cycle**: cycle-039
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Branch**: `feat/cycle-039-dynamic-auth`

---

## Sprint Overview

| Sprint | Label | Tasks | Effort |
|--------|-------|-------|--------|
| sprint-1 (global-37) | Foundation — fetchMe Fix + API JWT Exchange + Migration | 5 | ~5h |
| sprint-2 (global-38) | Explorer Integration — Dynamic Provider + Auth Store + Header | 5 | ~4h |
| sprint-3 (global-39) | Auth-Aware Pages — Leaderboard + Catalog Gating | 4 | ~4h |

**Total**: 14 tasks, ~13h estimated effort

---

## Sprint 1: Foundation — fetchMe Fix + API JWT Exchange + Migration

**Goal**: Fix the P0 `fetchMe` bug, add the database columns for wallet auth, create the JWKS verification module and Dynamic auth API endpoint, and fix OAuth refresh token loss.

### T1.1: Fix `fetchMe` Response Parsing

**Priority**: P0 — blocks everything downstream
**File**: `apps/explorer/lib/api/auth.ts`
**Depends on**: nothing

**Description**: The API `/auth/me` endpoint returns `{ user: { id, email, name, email_verified, is_org_member, tier } }`. The client's `fetchMe()` casts the raw response as `User` without unwrapping the envelope or mapping snake_case fields. `isOrgMember` is always `undefined` → `false`.

**Changes**:
- Unwrap `{ user: ... }` envelope from API response
- Map snake_case fields to camelCase: `is_org_member` → `isOrgMember`, `email_verified` → `emailVerified`, `created_at` → `createdAt`
- Map `tier` → `role`

**Acceptance Criteria**:
- [ ] `fetchMe` unwraps `{ user: ... }` envelope
- [ ] All snake_case fields mapped to camelCase
- [ ] `isOrgMember` reflects actual API value after login
- [ ] Existing email/password and OAuth login flows still work
- [ ] Type safety maintained (no `as any` casts)

---

### T1.2: DB Migration + Schema Update

**Priority**: P0
**Files**: `apps/api/drizzle/0009_cycle_039_dynamic_auth.sql`, `apps/api/src/db/schema.ts`
**Depends on**: nothing

**Description**: Add `wallet_address` and `dynamic_user_id` columns to the `users` table for Dynamic Labs identity storage.

**Changes**:
- Create migration `0009_cycle_039_dynamic_auth.sql`:
  - `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" varchar(42)`
  - `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dynamic_user_id" varchar(100)`
  - Partial unique indexes on both columns (WHERE NOT NULL)
- Update `schema.ts`: add `walletAddress` and `dynamicUserId` columns

**Acceptance Criteria**:
- [ ] Migration file is idempotent (`IF NOT EXISTS`)
- [ ] Unique indexes are partial (only non-null values)
- [ ] Schema.ts matches migration exactly
- [ ] Existing data unaffected (all new columns nullable)

---

### T1.3: JWKS Verification Module

**Priority**: P0
**File**: `apps/api/src/lib/verify-dynamic-jwt.ts`
**Depends on**: nothing

**Description**: Create a module to verify Dynamic Labs JWTs using RS256 JWKS. Uses `jose` (already in API dependencies) with `createRemoteJWKSet()`.

**Changes**:
- `verifyDynamicJWT(token: string): Promise<DynamicJWTPayload>`
- JWKS URL: `https://app.dynamic.xyz/api/v0/sdk/{DYNAMIC_ENVIRONMENT_ID}/.well-known/jwks`
- RS256 algorithm, 30s clock tolerance
- Reject tokens with `requiresAdditionalAuth` scope
- Export `DynamicJWTPayload` type with `sub`, `verified_credentials`, `scopes`

**Acceptance Criteria**:
- [ ] Uses `jose.createRemoteJWKSet()` (no new dependencies)
- [ ] RS256 algorithm enforced
- [ ] 30s clock tolerance
- [ ] Rejects `requiresAdditionalAuth` tokens
- [ ] Typed payload export
- [ ] `DYNAMIC_ENVIRONMENT_ID` env var sourced

---

### T1.4: Dynamic Auth API Endpoint

**Priority**: P0
**Files**: `apps/api/src/routes/dynamic-auth.ts`, `apps/api/src/app.ts`
**Depends on**: T1.2, T1.3

**Description**: `POST /v1/auth/dynamic` — accepts Dynamic Labs JWT in Authorization header, verifies it, resolves or creates user, checks GitHub org membership if GitHub is linked, returns our API JWT.

**Changes**:
- New Hono route file with single POST handler
- User resolution: dynamic_user_id → wallet_address → github_username → create new
- Wallet addresses lowercased before storage
- GitHub org check if GitHub social credential found in JWT
- Rate limit: 10 req/min per IP
- Mount route in `app.ts`: `v1.route('/auth/dynamic', dynamicAuth)`

**Acceptance Criteria**:
- [ ] Accepts `Authorization: Bearer <dynamic_jwt>`
- [ ] Returns `{ access_token, refresh_token, expires_in }` on success
- [ ] Creates new user if no match found (with wallet_address and/or dynamic_user_id)
- [ ] Links to existing user if wallet or Dynamic ID match
- [ ] Checks GitHub org membership if GitHub social credential present
- [ ] `org` claim in returned JWT reflects org membership
- [ ] 401 on invalid/expired JWT
- [ ] 401 on `requiresAdditionalAuth` scope
- [ ] 429 on rate limit exceeded
- [ ] Handles minified JWTs (no `verified_credentials`) — uses `sub` only
- [ ] Route mounted at `/v1/auth/dynamic` in app.ts

---

### T1.5: Fix OAuth Callback Refresh Token

**Priority**: P2
**Files**: `apps/explorer/app/api/auth/set-refresh/route.ts`, `apps/explorer/app/(auth)/callback/page.tsx`
**Depends on**: nothing

**Description**: The OAuth callback receives `refresh_token` in query params but `setTokens()` discards it. Create a Next.js route handler that sets the refresh token as an HttpOnly cookie, and modify the callback to POST the refresh token before calling `setTokens`.

**Changes**:
- New route handler `POST /api/auth/set-refresh`:
  - Validates non-empty refresh_token in body
  - Sets HttpOnly, Secure, SameSite=lax cookie with 7-day expiry
  - CSRF check via Origin header
- Modify callback page:
  - POST refresh_token to `/api/auth/set-refresh` before `setTokens`
  - Continue existing redirect flow

**Acceptance Criteria**:
- [ ] Route handler sets HttpOnly cookie with refresh token
- [ ] Cookie attributes: Secure, SameSite=lax, 7-day maxAge, path=/
- [ ] CSRF validation via Origin header
- [ ] Callback POSTs refresh token before calling `setTokens`
- [ ] Existing GitHub/Google OAuth flows still work
- [ ] OAuth sessions survive beyond 15 minutes

---

## Sprint 2: Explorer Integration — Dynamic Provider + Auth Store + Header

**Goal**: Install Dynamic Labs packages, set up the provider tree, add `connectDynamic()` to the auth store, create the connect button, and add auth UI to the header.

**Depends on**: Sprint 1 (API endpoint must exist for JWT exchange)

### T2.1: Install Dynamic Labs Packages

**Priority**: P0
**File**: `apps/explorer/package.json`
**Depends on**: nothing

**Description**: Add Dynamic Labs SDK packages to the explorer app.

**Changes**:
- `bun add @dynamic-labs/sdk-react-core@^4.61.3 @dynamic-labs/ethereum@^4.61.3 @dynamic-labs/wagmi-connector@^4.61.3`
- Add `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` to `.env.example`

**Acceptance Criteria**:
- [ ] All three packages installed at `^4.61.3`
- [ ] `bun.lock` updated
- [ ] `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` documented in env example

---

### T2.2: Dynamic Provider Setup

**Priority**: P0
**Files**: `apps/explorer/components/providers/dynamic-provider.tsx`, `apps/explorer/app/layout.tsx`
**Depends on**: T2.1

**Description**: Create the Dynamic Labs provider tree following the ecosystem pattern (mcv-interface, midi-interface). Wrap the root layout.

**Changes**:
- New `DynamicProvider` component (`'use client'`):
  - `DynamicContextProvider` with `environmentId`, `connect-and-sign`, `EthereumWalletConnectors`
  - `WagmiProvider` with `multiInjectedProviderDiscovery: false`
  - `QueryClientProvider`
  - `DynamicWagmiConnector`
- Modify `layout.tsx`: wrap `{children}` in `<DynamicProvider>`
- Lazy-load via `next/dynamic` with `ssr: false` to avoid bundle impact on initial load

**Acceptance Criteria**:
- [ ] Provider nesting matches ecosystem: Dynamic > Wagmi > Query > WagmiConnector
- [ ] `initialAuthenticationMode: 'connect-and-sign'`
- [ ] `walletConnectors: [EthereumWalletConnectors]`
- [ ] `multiInjectedProviderDiscovery: false` in wagmi config
- [ ] Chain-agnostic (no `overrides.evmNetworks`)
- [ ] Layout wraps children in provider
- [ ] No SSR flash (lazy-loaded or gated on `sdkHasLoaded`)
- [ ] App still builds and serves without `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` set (graceful fallback)

---

### T2.3: Auth Store `connectDynamic` Action

**Priority**: P0
**File**: `apps/explorer/lib/stores/auth-store.ts`
**Depends on**: T1.1 (fetchMe fix), T1.4 (API endpoint)

**Description**: Add a `connectDynamic(dynamicJwt: string)` action to the auth store that exchanges the Dynamic Labs JWT for our API tokens.

**Changes**:
- New action `connectDynamic(dynamicJwt: string)`:
  - POST to `/v1/auth/dynamic` with Dynamic JWT in Authorization header
  - Store access_token in cookie (same as existing `setTokens`)
  - POST refresh_token to `/api/auth/set-refresh` (from T1.5)
  - Call `fetchMe()` to populate user state
  - Set `isAuthenticated`, `isOrgMember`, `user` state
- Handle errors: network failure, 401 (invalid JWT), 429 (rate limited)

**Acceptance Criteria**:
- [ ] `connectDynamic` follows same token storage pattern as existing `login`
- [ ] Access token stored in cookie
- [ ] Refresh token stored via HttpOnly cookie route handler
- [ ] `fetchMe()` called to populate user state after token exchange
- [ ] Auth state (`isAuthenticated`, `isOrgMember`, `user`) updates correctly
- [ ] Error states handled (sets `isLoading: false`, surfaces error)
- [ ] 14-minute refresh interval works with Dynamic-obtained tokens

---

### T2.4: Dynamic Connect Button

**Priority**: P0
**File**: `apps/explorer/components/auth/dynamic-connect-button.tsx`
**Depends on**: T2.2 (provider), T2.3 (auth store)

**Description**: Client component that triggers the Dynamic Labs auth modal and handles the JWT exchange flow.

**Changes**:
- Uses `useDynamicContext()` for `setShowAuthFlow`, `sdkHasLoaded`, `primaryWallet`
- On auth success: `getAuthToken()` → `connectDynamic(jwt)`
- On logout: `clearTokens()`
- Loading states: SDK loading (skeleton), JWT exchange (spinner), error (toast)
- Styled with void/bone/cyan design system tokens

**Acceptance Criteria**:
- [ ] Opens Dynamic Labs modal on click
- [ ] Handles auth success → exchanges JWT → populates store
- [ ] Handles auth failure gracefully (toast notification)
- [ ] Shows loading state during JWT exchange
- [ ] Disabled/skeleton while SDK loads
- [ ] Logout triggers `clearTokens()` in auth store

---

### T2.5: AuthNav Header Island

**Priority**: P1
**Files**: `apps/explorer/components/layout/auth-nav.tsx`, `apps/explorer/components/layout/header.tsx`
**Depends on**: T2.4 (connect button)

**Description**: Client component island in the RSC header that shows auth state and the connect button.

**Changes**:
- New `AuthNav` component (`'use client'`):
  - Not connected → "Connect" button (opens Dynamic modal)
  - Connected (wallet) → truncated address + "Dashboard" link
  - Connected (org member) → address + subtle org badge + "Dashboard" link
  - SSR placeholder (prevents hydration mismatch)
- Modify `header.tsx`: add `<AuthNav />` after navigation links

**Acceptance Criteria**:
- [ ] Client component island in server component header
- [ ] No hydration mismatch (renders placeholder during SSR)
- [ ] Connect button opens Dynamic Labs modal
- [ ] Shows truncated wallet address when connected
- [ ] Org member indicator is subtle (matches design system)
- [ ] "Dashboard" link when authenticated
- [ ] Responsive — collapses well on mobile

---

## Sprint 3: Auth-Aware Pages — Leaderboard + Catalog Gating

**Goal**: Make the homepage leaderboard and catalog page auth-aware. Anonymous visitors see a connect CTA. Org members see all 13 constructs.

**Depends on**: Sprint 2 (auth UI must work end-to-end)

### T3.1: AuthAwareConstructList Component

**Priority**: P1
**File**: `apps/explorer/components/constructs/auth-aware-construct-list.tsx`
**Depends on**: T2.3 (auth store), T2.4 (connect button)

**Description**: Client component that overlays ISR construct lists with auth-aware behavior.

**Changes**:
- Props: `{ publicConstructs: Construct[], variant: 'leaderboard' | 'catalog' }`
- State machine:
  - Not authenticated → "Connect to explore constructs" CTA with DynamicConnectButton
  - Authenticated, not org member → "Link GitHub to access internal constructs" prompt
  - Authenticated, org member → fetch `/v1/constructs` with auth token → render full list
- Uses `createAuthClient` for authenticated API calls
- Skeleton loading state during auth fetch (no layout shift)
- "Internal" badge on internal constructs for org members

**Acceptance Criteria**:
- [ ] Shows CTA when not authenticated
- [ ] Shows GitHub linking prompt when authenticated but not org member
- [ ] Fetches and displays all 13 constructs for org members
- [ ] Uses `createAuthClient` with automatic 401 refresh
- [ ] Skeleton loading state (no layout shift)
- [ ] "Internal" badge on internal constructs
- [ ] Search still works for authenticated users
- [ ] Smooth transition when auth state resolves

---

### T3.2: Homepage Leaderboard Integration

**Priority**: P1
**File**: `apps/explorer/app/(site)/page.tsx`
**Depends on**: T3.1

**Description**: Wrap the existing leaderboard section in `AuthAwareConstructList`.

**Changes**:
- Keep `fetchAllConstructs()` ISR call (will return 0 since all constructs are internal)
- Pass public constructs to `AuthAwareConstructList` as initial data
- Component handles empty state CTA and authenticated full list

**Acceptance Criteria**:
- [ ] ISR page still renders immediately (sub-100ms TTFB)
- [ ] Anonymous visitors see "Connect to explore" CTA
- [ ] Org members see all 13 constructs after auth resolves
- [ ] No hydration errors

---

### T3.3: Catalog Page Integration

**Priority**: P1
**File**: `apps/explorer/app/(marketing)/constructs/page.tsx`
**Depends on**: T3.1

**Description**: Same pattern as homepage — wrap catalog grid in `AuthAwareConstructList`.

**Changes**:
- Pass public constructs to `AuthAwareConstructList variant="catalog"`
- Component renders grid layout instead of leaderboard table

**Acceptance Criteria**:
- [ ] ISR catalog page maintains performance
- [ ] Auth-aware behavior matches homepage
- [ ] Category filter still works for authenticated users
- [ ] Grid layout preserved for catalog variant

---

### T3.4: E2E Verification

**Priority**: P1
**Depends on**: T3.2, T3.3

**Description**: Manual end-to-end verification of the complete auth flow.

**Verification Checklist**:
- [ ] Incognito → constructs.network → 0 constructs, "Connect to explore" CTA
- [ ] Click Connect → Dynamic Labs modal opens → wallet connect works
- [ ] Wallet only → "Link GitHub for internal access" prompt
- [ ] Link GitHub (org member) → all 13 constructs appear
- [ ] Refresh page → session persists
- [ ] DevTools → auth store: `isOrgMember: true`, `isAuthenticated: true`
- [ ] API: `curl -H "Authorization: Bearer <token>" /v1/constructs` → 13 results
- [ ] Existing GitHub OAuth login still works
- [ ] OAuth session survives beyond 15 minutes (refresh token fix)

---

## Dependencies Graph

```
T1.1 (fetchMe fix) ─────────────────────────────────┐
T1.2 (migration) ──┐                                 │
T1.3 (JWKS module) ├──> T1.4 (auth endpoint)         │
                    │                                 │
T1.5 (OAuth fix) ──┘                                 │
                                                      │
T2.1 (packages) ──> T2.2 (provider) ──┐              │
                                       ├──> T2.4 (button) ──> T2.5 (header)
T1.4 (endpoint) ──> T2.3 (store) ─────┘              │
T1.1 (fetchMe) ────────────────────────────────────────┘
                                                      │
T2.3 + T2.4 ──> T3.1 (auth list) ──> T3.2 (homepage)
                                  ──> T3.3 (catalog)
                                  ──> T3.4 (verify)
```

---

## Environment Setup (Pre-Implementation)

Before starting Sprint 1, these env vars must be configured:

| Variable | Where | Source |
|----------|-------|--------|
| `DYNAMIC_ENVIRONMENT_ID` | Railway (API) | Dynamic Labs dashboard → existing 0xHoneyJar env |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Vercel (Explorer) | Same value as above |

**External dependency**: Verify GitHub social login is enabled in the Dynamic Labs dashboard (@janitooor).

---

## Risk Mitigation

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Dynamic Labs env ID not available | S2 | Can mock provider for development; real ID needed for E2E |
| GitHub social not configured in Dynamic | S1 | T1.4 handles missing GitHub gracefully (org=false) |
| wagmi version conflict | S2 | Pin to `^4.61.3`, same as ecosystem |
| Bundle size impact | S2 | Lazy-load provider via `next/dynamic` with `ssr: false` |

---

## Next Step

`/run sprint-plan` for autonomous implementation with review+audit cycle.
