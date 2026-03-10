# PRD: Dynamic Labs Auth + Internal Constructs Access

**Cycle**: cycle-039
**Created**: 2026-03-09
**Status**: Draft
**Depends on**: cycle-038 (visibility system — merged PR #147)
**Context**: `grimoires/loa/context/dynamic-labs-auth-integration.md`
**Grounded in**:
- `apps/explorer/lib/api/auth.ts:53-57` (fetchMe — broken response parsing)
- `apps/explorer/lib/data/fetch-constructs.ts:106` (ISR fetch — no auth token)
- `apps/explorer/lib/stores/auth-store.ts:275-280` (setTokens — discards refresh token)
- `apps/explorer/components/layout/header.tsx` (no login affordance)
- `apps/api/src/routes/auth.ts:468-481` (/me response — wrapped + snake_case)
- Ecosystem: `mcv-interface/components/web3-provider.tsx`, `midi-interface/lib/verify-jwt.ts`

---

## 1. Problem Statement

After cycle-038 shipped the visibility system, the Constructs Network has two compounding failures:

**P1: The leaderboard is broken.** 8 of 13 constructs are invisible. The seed script defaults `visibility` to `internal` when `construct.yaml` omits the field — and zero of the 13 construct repos declare it. The manual SQL backfill from cycle-038 is not persistent across re-seeds. Live API confirms only 5/13 constructs are public.

**P2: Team members cannot see internal constructs.** Even if a team member logs in via GitHub OAuth, three latent bugs prevent the auth-aware flow from working:
- `fetchMe()` doesn't unwrap the `{ user: { is_org_member } }` response envelope or map snake_case fields — `isOrgMember` is always `false` client-side
- The leaderboard and catalog are ISR server components that fetch without auth tokens — they can never show internal constructs
- The OAuth callback discards the refresh token, so sessions die after 15 minutes

**P3: No path to team-first access.** The explorer has no Dynamic Labs integration. The rest of the 0xHoneyJar ecosystem (mcv-interface, midi-interface, rektdrop, set-and-forgetti) uses Dynamic Labs for wallet-based auth. The explorer's GitHub+Google OAuth is disconnected from the ecosystem's auth identity. Team members who are wallet-native have no way to authenticate on constructs.network using the same identity they use everywhere else.

> **Sources**: Live API probe (5/13 public), codebase exploration of `apps/explorer/lib/api/auth.ts:53-57`, `apps/explorer/lib/data/fetch-constructs.ts:106`, `apps/explorer/app/(auth)/callback/page.tsx:30`, session interview confirming "all private" + Dynamic Labs preference.

---

## 2. Vision & Design Principles

**Vision**: Constructs.network becomes a team-first, wallet-native developer platform. The registry is private by default — authenticated team members see the full construct library. The auth experience is consistent with the rest of the 0xHoneyJar ecosystem via Dynamic Labs. External access comes later, when constructs are ready.

**Design Principles**:

1. **Private by default** — All org-synced constructs are `internal`. The public leaderboard is intentionally gated. Nothing is public until explicitly opted in.

2. **Wallet-native, GitHub-verified** — Dynamic Labs provides the auth UX (wallet connect + social login). GitHub org membership remains the trust boundary for internal access. Users connect with wallet, link GitHub to prove org membership.

3. **Ecosystem consistency** — Same Dynamic Labs environment, same `connect-and-sign` flow, same provider nesting pattern as the product dApps. A team member who connects on midi.0xhoneyjar.xyz is recognizable on constructs.network.

4. **Additive, not destructive** — Existing GitHub/Google OAuth continues working. Dynamic Labs is an additional auth provider. The API gains a new exchange endpoint without modifying existing auth routes.

---

## 3. Goals & Success Metrics

### Business Goals

| Goal | Measure | Target |
|------|---------|--------|
| Team can access all constructs | Authenticated org member sees 13 constructs | 100% |
| Anonymous leaderboard is gated | Unauthenticated request returns 0 constructs | 0 public |
| Auth is ecosystem-consistent | Dynamic Labs connect works on constructs.network | Same flow as mcv/midi |
| Session persistence | OAuth/Dynamic sessions survive refresh | >24h without re-auth |

### Non-Goals (Explicit)

- **External construct submission** — deferred, no external authors expected yet
- **On-chain operations on constructs.network** — no minting, staking, or claiming on the explorer
- **Replacing existing GitHub/Google OAuth** — keep as fallback alongside Dynamic Labs
- **Per-construct visibility management UI** — constructs are all internal for now; visibility is set in construct.yaml or DB
- **Dynamic Labs cookie domain / auth proxy** — known ecosystem issue (mcv-interface#7), defer to proxy fix

---

## 4. User & Stakeholder Context

### Persona 1: Team Member (Primary)

**Who**: Developer on the `0xHoneyJar` GitHub org with an existing wallet.
**Has**: Dynamic Labs wallet identity (from mcv/midi/rektdrop), GitHub org membership.
**Needs**: Single-click access to all 13 constructs on constructs.network.
**Current pain**: Leaderboard shows 5 constructs. GitHub OAuth login doesn't propagate org membership to the client. OAuth sessions expire after 15 minutes.
**Expected flow**: Visit constructs.network → click "Connect" → Dynamic Labs modal → wallet connect → link GitHub (if first time) → see all 13 constructs.

### Persona 2: External Visitor (Secondary)

**Who**: Developer who discovers constructs.network from a link, tweet, or search.
**Has**: No 0xHoneyJar org membership.
**Needs**: Understand what the Constructs Network is, even if they can't browse the full registry.
**Current pain**: Empty leaderboard with "No constructs found."
**Expected flow**: Visit constructs.network → see hero section with description → leaderboard shows "Connect to explore" prompt → may connect wallet, sees 0 public constructs → understands this is a gated network.

---

## 5. Functional Requirements

### FR-1: Fix `fetchMe` Response Parsing (P0 — blocks everything)

**File**: `apps/explorer/lib/api/auth.ts:53-57`

The API `/auth/me` endpoint returns `{ user: { id, email, name, email_verified, is_org_member, tier } }`. The client's `fetchMe()` casts the raw response as `User` without unwrapping the envelope or mapping snake_case fields. This means `user.isOrgMember` is always `undefined` → `false`.

**Acceptance Criteria**:
- [ ] `fetchMe` unwraps `{ user: ... }` envelope
- [ ] Maps `is_org_member` → `isOrgMember`, `email_verified` → `emailVerified`, etc.
- [ ] Auth store `isOrgMember` reflects actual API value after login
- [ ] Existing email/password and OAuth login flows continue working

### FR-2: Dynamic Labs Provider Setup

**New file**: `apps/explorer/components/providers/dynamic-provider.tsx`

Install `@dynamic-labs/sdk-react-core@^4.61.3`, `@dynamic-labs/ethereum@^4.61.3`, `@dynamic-labs/wagmi-connector@^4.61.3`. Set up provider with ecosystem-consistent nesting:

```
DynamicContextProvider
  └── WagmiProvider
        └── QueryClientProvider
              └── DynamicWagmiConnector
                    └── {children}
```

**Acceptance Criteria**:
- [ ] `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` sourced from existing 0xHoneyJar environment
- [ ] `initialAuthenticationMode: 'connect-and-sign'`
- [ ] `walletConnectors: [EthereumWalletConnectors]`
- [ ] Chain-agnostic (no chain overrides)
- [ ] `multiInjectedProviderDiscovery: false` in wagmi config
- [ ] Provider wraps app in root layout
- [ ] `sdkHasLoaded` gate prevents flash before SDK initializes

### FR-3: API JWT Exchange Endpoint

**New files**: `apps/api/src/routes/dynamic-auth.ts`, `apps/api/src/lib/verify-dynamic-jwt.ts`

`POST /v1/auth/dynamic` — accepts Dynamic Labs JWT, returns our API JWT:

1. Verify JWT via JWKS at `https://app.dynamic.xyz/api/v0/sdk/<ENV_ID>/.well-known/jwks`
2. Extract wallet address from `verified_credentials[0].address`
3. Check for linked GitHub social account in JWT claims
4. If GitHub linked → check org membership against `CONSTRUCTS_ORG`
5. Find or create user in DB
6. Return our API JWT with `org` claim

**Acceptance Criteria**:
- [ ] JWKS verification with 10min cache, RS256, 30s clock tolerance
- [ ] Handles minified JWTs (no `verified_credentials` in payload)
- [ ] Rejects tokens with `requiresAdditionalAuth` scope
- [ ] Creates user with `wallet_address` if new
- [ ] Links to existing user if wallet or GitHub match found
- [ ] Returns standard `{ access_token, refresh_token, expires_in }` response
- [ ] `org` claim in JWT reflects GitHub org membership (false if no GitHub linked)
- [ ] Rate-limited to prevent JWT exchange abuse

### FR-4: Explorer Auth Store Integration

**Modify**: `apps/explorer/lib/stores/auth-store.ts`

New action `connectDynamic(dynamicJwt: string)`:
- POST to `/v1/auth/dynamic` with Dynamic JWT
- Receive API JWT
- Store access token in cookie
- Set refresh token via HttpOnly cookie route handler
- Call `fetchMe` to populate user state

**Acceptance Criteria**:
- [ ] `connectDynamic` follows same token storage pattern as existing login
- [ ] Auth state (`isAuthenticated`, `isOrgMember`, `user`) updates after Dynamic connect
- [ ] Logout via Dynamic Labs SDK triggers `clearTokens`
- [ ] 14-minute refresh interval works with Dynamic-obtained tokens

### FR-5: Dynamic Connect Button

**New file**: `apps/explorer/components/auth/dynamic-connect-button.tsx`

Uses `useDynamicContext()` hook. On `onAuthSuccess`, gets JWT via `getAuthToken()`, calls `connectDynamic()`.

**Acceptance Criteria**:
- [ ] Opens Dynamic Labs modal on click
- [ ] Handles auth success → exchanges JWT → populates store
- [ ] Handles auth failure gracefully
- [ ] Shows loading state during JWT exchange
- [ ] Styled with void/bone/cyan design system

### FR-6: Auth-Aware Leaderboard

**New file**: `apps/explorer/components/constructs/auth-aware-construct-list.tsx`
**Modify**: `apps/explorer/app/(site)/page.tsx`, `apps/explorer/app/(marketing)/constructs/page.tsx`

Hybrid ISR + client-side auth overlay:

| State | Display |
|-------|---------|
| Not authenticated | "Connect to explore constructs" CTA + Dynamic connect |
| Authenticated, not org member | "Link GitHub to access internal constructs" prompt |
| Authenticated, org member | Full construct list (13 constructs) |

**Acceptance Criteria**:
- [ ] ISR page renders immediately (may show 0 constructs)
- [ ] Client component detects auth state and re-fetches with auth token
- [ ] Org members see all 13 constructs with install counts and skills
- [ ] "Internal" badge shown on internal constructs for org members
- [ ] Smooth transition when auth state resolves (no layout shift)
- [ ] Search still works for authenticated users

### FR-7: Header Auth State

**New file**: `apps/explorer/components/layout/auth-nav.tsx`
**Modify**: `apps/explorer/components/layout/header.tsx`

| State | Header Shows |
|-------|-------------|
| Not connected | "Connect" button |
| Connected (wallet) | Truncated address, dashboard link |
| Connected (org member) | Address + org badge, dashboard link |

**Acceptance Criteria**:
- [ ] Client component island in server component header
- [ ] No hydration mismatch (renders placeholder during SSR)
- [ ] Connect button opens Dynamic Labs modal
- [ ] Org member indicator is subtle (matches design system)

### FR-8: Fix OAuth Callback Refresh Token

**New file**: `apps/explorer/app/api/auth/set-refresh/route.ts`
**Modify**: `apps/explorer/app/(auth)/callback/page.tsx`

The OAuth callback receives `refresh_token` in query params but `setTokens()` discards it. Create a route handler that sets the HttpOnly cookie.

**Acceptance Criteria**:
- [ ] Route handler validates refresh token (non-empty string)
- [ ] Sets HttpOnly, Secure, SameSite=lax cookie with 7-day expiry
- [ ] CSRF validation on POST
- [ ] Callback page POSTs refresh token before calling `setTokens`
- [ ] OAuth login sessions survive beyond 15 minutes

---

## 6. Technical & Non-Functional Requirements

### NFR-1: Performance

- Dynamic Labs SDK lazy-loaded (not blocking initial page render)
- ISR pages maintain <100ms TTFB for anonymous visitors
- Auth overlay adds <200ms perceived latency for authenticated users
- JWKS cache (10min) prevents per-request key fetches

### NFR-2: Security

- Dynamic Labs JWT verification via JWKS (RS256, not shared secret)
- Reject tokens with `requiresAdditionalAuth` scope
- EVM addresses lowercased before storage (normalization)
- No wallet addresses in error responses
- Rate limiting on `/v1/auth/dynamic` (10 req/min per IP)
- CSRF validation on all POST auth route handlers
- HttpOnly cookies for refresh tokens (existing pattern)

### NFR-3: Compatibility

- Existing GitHub/Google OAuth continues working unchanged
- Existing email/password auth continues working unchanged
- Dashboard routes continue using existing auth initializer
- API backwards-compatible (no breaking changes to existing endpoints)

### NFR-4: Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@dynamic-labs/sdk-react-core` | `^4.61.3` | Core SDK |
| `@dynamic-labs/ethereum` | `^4.61.3` | EVM wallet connectors |
| `@dynamic-labs/wagmi-connector` | `^4.61.3` | wagmi integration |
| `jwks-rsa` | latest | JWKS key fetching (API) |

---

## 7. Scope & Prioritization

### MVP (This Cycle)

| Priority | Feature | FR | Effort |
|----------|---------|-----|--------|
| P0 | Fix `fetchMe` response parsing | FR-1 | 30min |
| P0 | Dynamic Labs provider setup | FR-2 | 1h |
| P0 | API JWT exchange endpoint | FR-3 | 2h |
| P0 | Auth store + connect button | FR-4, FR-5 | 1h |
| P1 | Auth-aware leaderboard | FR-6 | 2h |
| P1 | Header connect button | FR-7 | 1h |
| P2 | Fix OAuth refresh token | FR-8 | 1h |

### Future (Not This Cycle)

- Wallet allowlist for org membership (bypass GitHub linking)
- Dynamic Labs auth proxy / cookie domain fix (ecosystem-wide issue)
- External submission pipeline with construct review
- Per-construct visibility management in dashboard
- Artisan-designed auth theming (Creative Autonomy — may ship alongside)

---

## 8. Risks & Dependencies

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dynamic Labs SDK bundle size bloats explorer | Medium | Medium | Lazy-load via `next/dynamic`, measure with `@next/bundle-analyzer` |
| JWKS endpoint downtime blocks all Dynamic auth | Low | High | Cache keys aggressively (10min), fallback to existing OAuth |
| Minified JWTs missing wallet address | Medium | Medium | Management API fallback (requires `DYNAMIC_AUTH_TOKEN` env var) |
| Existing 0xHoneyJar Dynamic env missing GitHub social config | Low | High | Verify in Dynamic dashboard before implementation |

### External Dependencies

| Dependency | Owner | Risk |
|-----------|-------|------|
| Dynamic Labs dashboard (GitHub social login enabled) | @janitooor | Must verify before Step 3 |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` value | @janitooor | Source from existing product dApp env |
| `DYNAMIC_AUTH_TOKEN` for minified JWT fallback | @janitooor | Optional — only needed for edge case |

---

## 9. Org Membership Model

Dynamic Labs supports social account linking. The org membership gate:

| Auth Method | Org Check | Internal Access |
|---|---|---|
| GitHub (via Dynamic social login) | Check 0xHoneyJar org membership | Yes if member |
| Wallet only | No GitHub linked | No — prompted to link |
| Wallet + GitHub linked | Check org via linked GitHub | Yes if member |

### User Table Extensions

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_address varchar(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS dynamic_user_id varchar(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet ON users (wallet_address) WHERE wallet_address IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_dynamic ON users (dynamic_user_id) WHERE dynamic_user_id IS NOT NULL;
```

---

## Next Step

`/architect` to create Software Design Document based on this PRD.
