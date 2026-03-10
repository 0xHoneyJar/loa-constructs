# SDD: Dynamic Labs Auth + Internal Constructs Access

**Cycle**: cycle-039
**Created**: 2026-03-09
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Depends on**: cycle-038 (visibility system — merged PR #147)

---

## 1. Executive Summary

Cycle-039 adds Dynamic Labs wallet auth to `constructs.network`, fixes the broken `fetchMe` response parsing, and introduces auth-aware public pages. After this cycle, anonymous visitors see a gated leaderboard. Authenticated org members see all 13 internal constructs.

**Scope**: 4 new files (explorer), 2 new files (API), 1 migration, 6 modified files. No breaking API changes. Additive auth — existing OAuth continues working.

---

## 2. System Architecture

### 2.1 Auth Flow Overview

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser     │    │  Dynamic Labs    │    │  Constructs API │
│  (Explorer)   │    │  SDK + JWKS      │    │  (Hono)         │
└──────┬───────┘    └────────┬─────────┘    └────────┬────────┘
       │                      │                       │
       │  1. Click "Connect"  │                       │
       │─────────────────────>│                       │
       │                      │                       │
       │  2. Wallet sign /    │                       │
       │     social login     │                       │
       │<─────────────────────│                       │
       │                      │                       │
       │  3. Dynamic JWT      │                       │
       │<─────────────────────│                       │
       │                      │                       │
       │  4. POST /v1/auth/dynamic (Dynamic JWT)      │
       │──────────────────────────────────────────────>│
       │                      │                       │
       │                      │  5. Verify JWT        │
       │                      │<──────────────────────│
       │                      │  (JWKS RS256)         │
       │                      │──────────────────────>│
       │                      │                       │
       │                      │  6. Check GitHub org  │
       │                      │  (if GitHub linked)   │
       │                      │                       │
       │  7. API JWT (HS256) + refresh token          │
       │<─────────────────────────────────────────────│
       │                      │                       │
       │  8. Store tokens,    │                       │
       │     fetchMe()        │                       │
       │──────────────────────────────────────────────>│
       │                      │                       │
       │  9. User state       │                       │
       │<─────────────────────────────────────────────│
```

### 2.2 Component Boundaries

```
Explorer (Next.js 15)                          API (Hono)
═══════════════════                            ═══════════

layout.tsx                                     app.ts
  └─ DynamicProvider (client boundary)           └─ /v1/auth/dynamic (new)
       └─ DynamicContextProvider                      └─ verify-dynamic-jwt.ts
            └─ WagmiProvider                          └─ users upsert
                 └─ QueryClientProvider               └─ generateTokens()
                      └─ DynamicWagmiConnector
                           └─ {children}         /v1/auth/* (existing, unchanged)
                                                 /v1/constructs/* (unchanged)
header.tsx (RSC)
  └─ AuthNav (client island)
       └─ DynamicConnectButton
       └─ UserMenu

page.tsx (ISR, RSC)
  └─ AuthAwareConstructList (client)
       └─ re-fetches with auth token
       └─ CTA states (connect / link GitHub / full list)
```

---

## 3. Technology Stack

### 3.1 New Dependencies

| Package | Version | Location | Purpose |
|---------|---------|----------|---------|
| `@dynamic-labs/sdk-react-core` | `^4.61.3` | explorer | Dynamic Labs SDK core |
| `@dynamic-labs/ethereum` | `^4.61.3` | explorer | EVM wallet connectors |
| `@dynamic-labs/wagmi-connector` | `^4.61.3` | explorer | wagmi bridge |

### 3.2 Existing Dependencies (Reused)

| Package | Location | Purpose |
|---------|----------|---------|
| `jose` | API | JWT verification (already used for HS256, reuse for RS256 JWKS) |
| `zustand` | explorer | Auth store |
| `js-cookie` | explorer | Access token storage |

### 3.3 No New API Dependencies

The API already has `jose` which supports `createRemoteJWKSet()` for JWKS verification. No need for `jwks-rsa` or `jsonwebtoken` — `jose` handles both HS256 (existing) and RS256 (Dynamic Labs) natively.

---

## 4. Data Architecture

### 4.1 Migration: `0009_cycle_039_dynamic_auth.sql`

```sql
-- Add wallet and Dynamic Labs columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_address" varchar(42);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dynamic_user_id" varchar(100);

-- Unique indexes for lookup (partial — only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_wallet"
  ON "users" ("wallet_address")
  WHERE "wallet_address" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_dynamic"
  ON "users" ("dynamic_user_id")
  WHERE "dynamic_user_id" IS NOT NULL;
```

### 4.2 Schema Changes

**File**: `apps/api/src/db/schema.ts`

Add to `users` table:

```typescript
walletAddress: varchar('wallet_address', { length: 42 }),
dynamicUserId: varchar('dynamic_user_id', { length: 100 }),
```

### 4.3 User Lookup Strategy

Dynamic auth creates a three-path user resolution:

| Priority | Lookup | Scenario |
|----------|--------|----------|
| 1 | `dynamic_user_id` | Returning Dynamic Labs user |
| 2 | `wallet_address` | Wallet previously seen via different auth |
| 3 | `github_username` | GitHub linked in Dynamic, matches existing OAuth user |
| 4 | Create new | First-time wallet user |

Wallet addresses are **lowercased** before storage (EVM normalization).

---

## 5. API Design

### 5.1 New Endpoint: `POST /v1/auth/dynamic`

**File**: `apps/api/src/routes/dynamic-auth.ts`

#### Request

```
POST /v1/auth/dynamic
Content-Type: application/json
Authorization: Bearer <dynamic_labs_jwt>
```

No request body — JWT is in the Authorization header.

#### Response (200)

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900
}
```

#### Error Responses

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `INVALID_TOKEN` | JWT verification failed |
| 401 | `ADDITIONAL_AUTH_REQUIRED` | JWT has `requiresAdditionalAuth` scope |
| 429 | `RATE_LIMIT_EXCEEDED` | >10 requests/min per IP |
| 500 | `INTERNAL_ERROR` | JWKS fetch failed, DB error |

#### Processing Pipeline

```
1. Extract Bearer token from Authorization header
2. Verify JWT via JWKS (RS256)
   └─ JWKS URL: https://app.dynamic.xyz/api/v0/sdk/{ENV_ID}/.well-known/jwks
   └─ Cache: 10 min (jose caches internally via createRemoteJWKSet)
   └─ Clock tolerance: 30s
3. Check scopes — reject if 'requiresAdditionalAuth' present
4. Extract identity:
   └─ sub (Dynamic user ID)
   └─ verified_credentials[0].address (wallet address)
   └─ Fallback: environmentId + sub for minified JWTs
5. Check for GitHub social:
   └─ verified_credentials.find(c => c.oauthProvider === 'github')
   └─ If found → check 0xHoneyJar org membership via GitHub API
6. Resolve user (see §4.3 lookup strategy)
7. Generate API tokens via existing generateTokens(userId, email, isOrgMember)
8. Return token pair
```

### 5.2 JWKS Verification Module

**File**: `apps/api/src/lib/verify-dynamic-jwt.ts`

Uses `jose` (already in the project) with `createRemoteJWKSet()`:

- Algorithm: RS256 only
- Clock tolerance: 30 seconds
- Rejects tokens with `requiresAdditionalAuth` scope
- Returns typed `DynamicJWTPayload` with `sub`, `verified_credentials`, `scopes`

### 5.3 Route Mounting

**File**: `apps/api/src/app.ts`

```typescript
import { dynamicAuth } from './routes/dynamic-auth.js';

// Add alongside existing auth routes
v1.route('/auth/dynamic', dynamicAuth);
```

### 5.4 Existing Endpoints (Unchanged)

All existing auth routes (`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/me`, `/auth/oauth/*`) remain unchanged. The Dynamic Labs endpoint is purely additive.

---

## 6. Component Design

### 6.1 DynamicProvider

**File**: `apps/explorer/components/providers/dynamic-provider.tsx`

```
'use client'

DynamicContextProvider
  settings:
    environmentId: NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
    initialAuthenticationMode: 'connect-and-sign'
    walletConnectors: [EthereumWalletConnectors]
  └─ WagmiProvider (config: multiInjectedProviderDiscovery: false)
       └─ QueryClientProvider
            └─ DynamicWagmiConnector
                 └─ {children}
```

**Integration with layout.tsx**: The root layout wraps `{children}` in `<DynamicProvider>`. Since layout.tsx is RSC, the provider is imported as a client component boundary.

**SDK loading gate**: The provider exposes an `sdkHasLoaded` check to prevent flash of unauthenticated content before the SDK initializes.

### 6.2 DynamicConnectButton

**File**: `apps/explorer/components/auth/dynamic-connect-button.tsx`

Client component using `useDynamicContext()`:

| Event | Action |
|-------|--------|
| Click | `setShowAuthFlow(true)` — opens Dynamic modal |
| `onAuthSuccess` | `getAuthToken()` → `connectDynamic(jwt)` → populate auth store |
| `onLogout` | `clearTokens()` → reset auth store |

**Loading states**:
- SDK loading → disabled button with skeleton
- JWT exchange in progress → spinner overlay
- Error → toast notification, button returns to default

### 6.3 AuthNav

**File**: `apps/explorer/components/layout/auth-nav.tsx`

Client component island rendered inside the RSC header:

| Auth State | Renders |
|------------|---------|
| SDK loading | Skeleton placeholder (prevents hydration mismatch) |
| Not connected | "Connect" button |
| Connected (wallet) | Truncated address + "Dashboard" link |
| Connected (org member) | Address + subtle org badge + "Dashboard" link |

**Hydration safety**: Renders a placeholder `<div>` during SSR, mounts actual content after `useEffect`. This prevents server/client mismatch since auth state is client-only.

### 6.4 AuthAwareConstructList

**File**: `apps/explorer/components/constructs/auth-aware-construct-list.tsx`

Client component that overlays the ISR construct list:

```
Props: { publicConstructs: Construct[] }

State flow:
  1. Initial render: show publicConstructs (from ISR, likely 0)
  2. Check auth store → isAuthenticated?
     ├─ No  → Show "Connect to explore constructs" CTA
     ├─ Yes, !isOrgMember → Show "Link GitHub for internal access" prompt
     └─ Yes, isOrgMember  → Fetch /v1/constructs with auth token → show all
  3. During auth fetch: skeleton overlay (no layout shift)
```

**Data fetching**: Uses `createAuthClient` from `lib/api/client.ts` to make authenticated requests. The auth client handles 401 refresh automatically.

### 6.5 OAuth Refresh Fix

**File**: `apps/explorer/app/api/auth/set-refresh/route.ts`

Next.js route handler:

```
POST /api/auth/set-refresh
Body: { refresh_token: string }

1. Validate: non-empty string, reasonable length
2. Set HttpOnly cookie:
   - Name: 'refresh_token'
   - Value: refresh_token
   - HttpOnly: true
   - Secure: true (production)
   - SameSite: 'lax'
   - Path: '/'
   - MaxAge: 7 days
3. Return 200
```

**CSRF**: Validated via `Origin` / `Referer` header check against known domains.

**Callback page modification**: Before calling `setTokens()`, POST the refresh token to this route handler. This ensures the HttpOnly cookie is set for the existing refresh flow.

---

## 7. Security Architecture

### 7.1 JWT Verification

| Token Type | Algorithm | Key Source | Validation |
|------------|-----------|------------|------------|
| Dynamic Labs JWT | RS256 | JWKS endpoint (cached 10min) | `jose.jwtVerify()` with remote JWKS |
| Our access token | HS256 | `JWT_SECRET` env var | `jose.jwtVerify()` (existing) |
| Our refresh token | HS256 | `JWT_SECRET` env var | `jose.jwtVerify()` + blacklist check |

### 7.2 Threat Model

| Threat | Mitigation |
|--------|------------|
| Stolen Dynamic JWT | Short-lived (5min), RS256 verification, one-time exchange |
| JWT replay | Clock tolerance 30s, JWKS rotation handles key compromise |
| Wallet address spoofing | Address comes from verified JWT, not user input |
| Org membership bypass | DB is authoritative (cycle-038 FIND-002), JWT `org` claim is convenience only |
| Brute force JWT exchange | Rate limit: 10 req/min per IP on `/v1/auth/dynamic` |
| XSS token theft | Access token in JS cookie (existing pattern), refresh in HttpOnly cookie |
| Minified JWT (no credentials) | Extract `sub` (Dynamic user ID) only; skip wallet lookup, create user by Dynamic ID |

### 7.3 EVM Address Normalization

All wallet addresses are lowercased before storage and comparison. This prevents checksum-case mismatches (EIP-55 vs lowercase).

### 7.4 Rate Limiting

The `/v1/auth/dynamic` endpoint uses the existing Hono rate limiter: 10 requests per minute per IP.

---

## 8. Environment Variables

### 8.1 New Variables

| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | Explorer | Yes | Dynamic Labs environment ID (from existing 0xHoneyJar env) |
| `DYNAMIC_ENVIRONMENT_ID` | API | Yes | Same value, server-side (for JWKS URL construction) |

### 8.2 Existing Variables (Unchanged)

| Variable | Location | Description |
|----------|----------|-------------|
| `JWT_SECRET` | API | HS256 signing key for our tokens |
| `CONSTRUCTS_ORG` | API | GitHub org name (`0xHoneyJar`) |
| `GITHUB_TOKEN` | API | For org membership checks |
| `NEXT_PUBLIC_API_URL` | Explorer | API base URL |

---

## 9. File Manifest

### 9.1 New Files

| File | Type | Description |
|------|------|-------------|
| `apps/api/src/routes/dynamic-auth.ts` | API route | JWT exchange endpoint |
| `apps/api/src/lib/verify-dynamic-jwt.ts` | API lib | JWKS verification module |
| `apps/api/drizzle/0009_cycle_039_dynamic_auth.sql` | Migration | wallet_address + dynamic_user_id columns |
| `apps/explorer/components/providers/dynamic-provider.tsx` | Component | Dynamic Labs + wagmi provider tree |
| `apps/explorer/components/auth/dynamic-connect-button.tsx` | Component | Connect button with JWT exchange |
| `apps/explorer/components/layout/auth-nav.tsx` | Component | Header auth state island |
| `apps/explorer/components/constructs/auth-aware-construct-list.tsx` | Component | Auth overlay for leaderboard |
| `apps/explorer/app/api/auth/set-refresh/route.ts` | Route handler | HttpOnly refresh cookie setter |

### 9.2 Modified Files

| File | Changes |
|------|---------|
| `apps/api/src/db/schema.ts` | Add `walletAddress`, `dynamicUserId` columns |
| `apps/api/src/app.ts` | Mount `/v1/auth/dynamic` route |
| `apps/explorer/lib/api/auth.ts` | Fix `fetchMe` response parsing |
| `apps/explorer/lib/stores/auth-store.ts` | Add `connectDynamic()` action |
| `apps/explorer/app/layout.tsx` | Wrap in `DynamicProvider` |
| `apps/explorer/components/layout/header.tsx` | Add `AuthNav` island |
| `apps/explorer/app/(site)/page.tsx` | Wrap leaderboard in `AuthAwareConstructList` |
| `apps/explorer/app/(marketing)/constructs/page.tsx` | Wrap catalog in `AuthAwareConstructList` |
| `apps/explorer/app/(auth)/callback/page.tsx` | POST refresh token before `setTokens` |
| `apps/explorer/package.json` | Add Dynamic Labs dependencies |

---

## 10. Implementation Sequence

### Sprint 1: Foundation (P0 fixes + API)

| Task | File(s) | Effort |
|------|---------|--------|
| T1.1: Fix `fetchMe` response parsing | `explorer/lib/api/auth.ts` | 30min |
| T1.2: DB migration + schema | `api/drizzle/0009_*.sql`, `api/db/schema.ts` | 30min |
| T1.3: JWKS verification module | `api/lib/verify-dynamic-jwt.ts` | 1h |
| T1.4: Dynamic auth endpoint | `api/routes/dynamic-auth.ts`, `api/app.ts` | 2h |
| T1.5: Fix OAuth refresh token | `explorer/app/api/auth/set-refresh/route.ts`, `callback/page.tsx` | 1h |

### Sprint 2: Explorer Integration

| Task | File(s) | Effort |
|------|---------|--------|
| T2.1: Install Dynamic Labs packages | `explorer/package.json` | 15min |
| T2.2: Dynamic provider setup | `explorer/components/providers/dynamic-provider.tsx`, `layout.tsx` | 1h |
| T2.3: Auth store `connectDynamic` | `explorer/lib/stores/auth-store.ts` | 45min |
| T2.4: Dynamic connect button | `explorer/components/auth/dynamic-connect-button.tsx` | 1h |
| T2.5: AuthNav header island | `explorer/components/layout/auth-nav.tsx`, `header.tsx` | 1h |

### Sprint 3: Auth-Aware Pages

| Task | File(s) | Effort |
|------|---------|--------|
| T3.1: AuthAwareConstructList | `explorer/components/constructs/auth-aware-construct-list.tsx` | 2h |
| T3.2: Homepage integration | `explorer/app/(site)/page.tsx` | 30min |
| T3.3: Catalog integration | `explorer/app/(marketing)/constructs/page.tsx` | 30min |
| T3.4: E2E verification | Manual testing | 1h |

---

## 11. Performance Considerations

### 11.1 Bundle Impact

Dynamic Labs SDK is ~200KB gzipped. Mitigation: lazy-load via `next/dynamic` with `ssr: false`. ISR pages render instantly for anonymous users. The Dynamic Labs SDK loads in the background and enables auth UI when ready.

### 11.2 JWKS Caching

`jose`'s `createRemoteJWKSet()` caches keys automatically. The JWKS endpoint is only fetched when:
- First request after server cold start
- Cache expires
- Unknown `kid` encountered (key rotation)

### 11.3 ISR Preservation

Auth-aware pages maintain ISR performance:
- Server component renders ISR shell (instant TTFB)
- Client component mounts, checks auth, optionally re-fetches
- No waterfall — auth check and SDK load happen in parallel

---

## 12. Testing Strategy

### 12.1 Manual Verification

1. Anonymous → constructs.network → "Connect to explore" CTA, 0 constructs
2. Click Connect → Dynamic Labs modal → wallet connect
3. Wallet only → "Link GitHub for internal access"
4. Link GitHub → org check → all 13 constructs appear
5. Refresh → session persists (>24h)
6. DevTools → `isOrgMember: true`, `isAuthenticated: true`

### 12.2 API Verification

```bash
# Anonymous — 0 constructs
curl -s https://api.constructs.network/v1/constructs | jq '.data | length'

# Authenticated org member — 13 constructs
curl -s -H "Authorization: Bearer <token>" \
  https://api.constructs.network/v1/constructs | jq '.data | length'

# Dynamic JWT exchange
curl -s -X POST \
  -H "Authorization: Bearer <dynamic_jwt>" \
  https://api.constructs.network/v1/auth/dynamic | jq '.access_token'
```

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dynamic Labs SDK bundle bloat | Medium | Medium | `next/dynamic` lazy load, measure with bundle analyzer |
| JWKS endpoint downtime | Low | High | `jose` caches keys; existing OAuth is fallback |
| Minified JWTs (no `verified_credentials`) | Medium | Medium | Fall back to `sub` claim only, create user by Dynamic ID |
| GitHub social not enabled in Dynamic dashboard | Low | High | Verify before implementation (external dependency on @janitooor) |
| wagmi version conflict with Dynamic SDK | Low | Medium | Pin to ecosystem versions (`^4.61.3`), test in isolation |

---

## 14. Non-Goals (Explicit)

- No on-chain operations on constructs.network
- No wallet allowlist bypass for org membership
- No Dynamic Labs auth proxy / cookie domain fix (ecosystem-wide issue)
- No per-construct visibility management UI
- No external construct submission pipeline
- No replacing existing GitHub/Google OAuth

---

## Next Step

`/sprint-plan` to break down into implementation sprints with task dependencies and acceptance criteria.
