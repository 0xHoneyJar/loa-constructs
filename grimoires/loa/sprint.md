# Sprint Plan: Marketplace Consolidation — Web to Explorer

**Cycle**: cycle-015
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-02-16
**Status**: Ready for Implementation

---

## Overview

| Aspect | Value |
|--------|-------|
| Total sprints | 7 |
| Team size | 1 (AI agent) |
| Sprint duration | 1 sprint = 1 `/run` cycle |
| Total tasks | 67 |
| Goal | Consolidate 31 web routes into explorer, delete apps/web |

### Sprint Summary

| Sprint | Focus | Tasks | Key Deliverable |
|--------|-------|-------|-----------------|
| 1 | Foundation | 17 | API contract check, auth store, middleware, API client, base UI components, bundle baseline, Playwright |
| 2 | Auth Pages | 8 | Login, register, password flows, OAuth callback, auth E2E tests |
| 3 | Dashboard Core | 7 | Dashboard home, profile, API keys, billing |
| 4 | Dashboard Advanced | 8 | Creator tools, skills browser, teams, analytics |
| 5 | Marketing Pages | 10 | All public content pages with ISR |
| 6 | SEO + Polish + Hardening | 10 | Metadata, sitemap, performance, CSRF, HttpOnly refresh (with API contract verification) |
| 7 | Cleanup | 5 | Rollback plan, delete apps/web, update monorepo, DNS |

---

## Sprint 1: Foundation

**Goal**: Auth infrastructure, base components, providers. Everything else depends on this.

**Verification**: `pnpm --filter explorer dev` starts without errors. `pnpm --filter explorer build` succeeds. 3D graph still works on `/`.

### Tasks

#### T1.1: Add dependencies
- **File(s)**: `apps/explorer/package.json`
- **Description**: Add `react-hook-form`, `@hookform/resolvers`, `zod`, `js-cookie`, `@types/js-cookie`, `@tanstack/react-query`, `@next/bundle-analyzer`, `playwright` (dev)
- **Acceptance Criteria**:
  - All packages install without peer dependency conflicts
  - `pnpm --filter explorer build` still succeeds
  - No new packages appear in root page bundle (verify with build output)
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Build succeeds, existing pages render

#### T1.1b: Establish bundle baseline
- **File(s)**: `apps/explorer/next.config.ts`, baseline report
- **Description**: Before any consolidation code, capture current explorer bundle stats using `@next/bundle-analyzer`. Record root shared chunk sizes as the baseline for Sprint 6 enforcement
- **Acceptance Criteria**:
  - `@next/bundle-analyzer` configured in `next.config.ts` (behind `ANALYZE=true` env flag)
  - `ANALYZE=true pnpm --filter explorer build` generates bundle report
  - Root shared chunk size recorded (committed as `apps/explorer/bundle-baseline.json` or documented in sprint notes)
  - Baseline serves as reference for T6.6 (root shared chunk must not exceed baseline + 20KB)
- **Effort**: Small
- **Dependencies**: T1.1
- **Testing**: Bundle analyzer report generates successfully

#### T1.0: API contract smoke test
- **File(s)**: Documentation / investigation task
- **Description**: Before building against the API, hit every endpoint referenced in the sprint plan and verify response shapes. Document any gaps as blockers. *[Flatline IMP-002 — auto-integrated]*
- **Acceptance Criteria**:
  - Verify all auth endpoints: `POST /v1/auth/login`, `POST /v1/auth/register`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`, `POST /v1/auth/verify-email`, `GET /v1/auth/oauth/{provider}`
  - Verify construct/pack endpoints: `GET /v1/constructs`, `GET /v1/constructs/:slug`, `GET /v1/packs`, `GET /v1/packs/:slug`
  - Verify creator endpoints: `GET /v1/creator/dashboard`, `POST /v1/constructs`, `PUT /v1/constructs/:id`
  - Verify profile endpoints: `GET /v1/profile`, `PUT /v1/profile`
  - Verify teams endpoints: `GET /v1/teams`, `GET /v1/teams/:slug`, `PUT /v1/teams/:slug`
  - Verify API key endpoints: `GET /v1/api-keys`, `POST /v1/api-keys`, `DELETE /v1/api-keys/:id`
  - Document response shapes and any missing/divergent endpoints as blockers in NOTES.md
- **Effort**: Medium
- **Dependencies**: None
- **Testing**: All referenced endpoints return expected response shapes or gaps documented

#### T1.2: TUI color tokens
- **File(s)**: `apps/explorer/tailwind.config.ts`
- **Description**: Add `tui` color namespace per SDD Section 5.5: bg (#0a0a0a), fg (#c0c0c0), bright (#ffffff), dim (#606060), accent (#5fafff), green (#5fff87), yellow (#ffff5f), red (#ff5f5f), cyan (#5fffff), border (#5f5f5f)
- **Acceptance Criteria**:
  - `className="text-tui-accent bg-tui-bg border-tui-border"` works in any component
  - Existing color tokens unchanged
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Tailwind compilation succeeds, manual visual check

#### T1.3: Auth store
- **File(s)**: `apps/explorer/lib/stores/auth-store.ts`
- **Description**: Zustand store following `graph-store.ts` pattern. Interface per SDD Section 4.3. Token storage via js-cookie with cookie flags per SDD Section 4.3. Single-flight refresh mechanism per SDD Section 4.4. **Store methods return typed results — all redirect/navigation side-effects are handled by the consuming component (AuthInitializer), not the store.**
- **Acceptance Criteria**:
  - Exports `useAuthStore` hook
  - `initialize()` reads cookies, calls `/v1/auth/me`, sets user state. Returns `{ ok: true, user }` or `{ ok: false, reason: 'timeout' | 'unauthorized' | 'network_error' }` — does NOT perform navigation
  - `login()` calls API, stores tokens, fetches user. Returns typed result
  - `refreshToken()` with single-flight lock (module-level `refreshPromise`). Returns success/failure result
  - `logout()` clears cookies, clears React Query cache (`queryClient.clear()`), resets state. Returns void
  - `getAccessToken()` returns current access token from cookie
  - `setTokens()` / `clearTokens()` manage js-cookie storage
  - **No `import` from `lib/api/client.ts`** — auth store uses low-level fetch functions (from `lib/api/auth.ts`) that do NOT import authClient, preventing circular dependencies
- **Effort**: Large
- **Dependencies**: T1.1
- **Testing**: Unit test for store actions (mock API responses). Verify no circular imports between `lib/stores/*` and `lib/api/client.ts`

#### T1.4: Middleware
- **File(s)**: `apps/explorer/middleware.ts`
- **Description**: Protect dashboard routes per SDD Section 4.2. Cookie presence check only (UX gate). Explicit matcher for dashboard path prefixes. Redirect to `/login?redirect={path}` when no cookie
- **Acceptance Criteria**:
  - Matcher includes: `/dashboard/*`, `/profile/*`, `/api-keys/*`, `/billing/*`, `/skills/*`, `/analytics/*`, `/creator/*`, `/teams/*`
  - Auth routes (`/login`, `/register`, etc.) NOT matched
  - Marketing routes NOT matched
  - Root routes (`/`, `/[slug]`, `/about`, `/install`) NOT matched
  - Redirect includes `redirect` query param with original path
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Manual test — dashboard routes redirect, other routes pass through

#### T1.5: API client
- **File(s)**: `apps/explorer/lib/api/client.ts`
- **Description**: Authenticated fetch wrapper per SDD Section 4.4. Two instances: `publicClient` (no auth) and `authClient` (Bearer token + 401 retry). Single-flight refresh on 401 per SDD. **Uses dependency injection to avoid circular imports**: `createAuthClient({ getToken, onRefresh, onAuthFailure })` — does NOT import auth store directly
- **Acceptance Criteria**:
  - `publicClient.get<T>(path)` — no auth headers, for ISR server components
  - `createAuthClient({ getToken, onRefresh, onAuthFailure })` factory function — accepts token getter and refresh callback injected by the consumer
  - 401 response triggers single-flight refresh via injected `onRefresh`, then single retry
  - Failed retry calls injected `onAuthFailure()` callback
  - `authClient` does NOT clear tokens on transient network errors
  - **No circular imports**: `lib/api/client.ts` does NOT import from `lib/stores/*`. Build passes with `madge --circular` or equivalent check
- **Effort**: Medium
- **Dependencies**: T1.1 (NOT T1.3 — no store dependency thanks to DI)
- **Testing**: Unit test with mocked fetch (401 retry flow, concurrent 401 handling). Circular import check passes

#### T1.6: Auth API functions
- **File(s)**: `apps/explorer/lib/api/auth.ts`
- **Description**: Typed API functions per SDD Section 6.3: login, register, refresh, logout, fetchMe, forgotPassword, resetPassword, verifyEmail
- **Acceptance Criteria**:
  - All functions correctly typed with request/response interfaces
  - Uses `publicClient` (no auth needed for auth endpoints except fetchMe/logout)
  - Error responses properly typed
- **Effort**: Small
- **Dependencies**: T1.5
- **Testing**: Type checking passes

#### T1.7: React Query provider + client
- **File(s)**: `apps/explorer/lib/api/query-client.ts`
- **Description**: QueryClient instance per SDD Section 4.5. Configured with staleTime: 5min, retry: 1, refetchOnWindowFocus: true
- **Acceptance Criteria**:
  - Exports `queryClient` singleton
  - Configuration matches SDD defaults
  - NOT imported in root layout (only in dashboard layout)
- **Effort**: Small
- **Dependencies**: T1.1
- **Testing**: Import boundary check — not in root bundle

#### T1.8: Update root layout + 3D route isolation
- **File(s)**: `apps/explorer/app/layout.tsx`
- **Description**: Minimize root layout per SDD Section 4.1. Move Header/Footer out to route-group layouts. Keep only: fonts, dark mode class, body styling. No providers in root. **3D graph pages (`/`, `/[slug]`) remain at root level with the minimal layout — they must NOT inherit marketing/dashboard providers or components.** Establish the ESLint rule early: root-level pages and 3D-related modules cannot import from `(dashboard)/`, `(marketing)/`, or auth modules
- **Acceptance Criteria**:
  - Root layout contains only `<html>`, `<body>`, font classes
  - No React Query, no auth store, no Header/Footer imports
  - Existing pages still render (3D graph, construct detail, about, install)
  - 3D pages (`page.tsx`, `[slug]/page.tsx`) import only graph-related modules (`graph-store`, `three`, `@react-three/fiber`, etc.)
  - ESLint `no-restricted-imports` rule for root-level pages: prevents importing `@tanstack/react-query`, `react-hook-form`, `zod`, `js-cookie`, `auth-store`, and any `(dashboard)/` or `(marketing)/` components
  - Bundle analyzer confirms 3D pages share no chunks with dashboard/marketing route groups
- **Effort**: Medium
- **Dependencies**: T1.1b (baseline must exist before enforcing)
- **Testing**: All existing pages render correctly. ESLint rule catches intentional bad import. Bundle check confirms isolation

#### T1.9: Panel component
- **File(s)**: `apps/explorer/components/ui/panel.tsx`
- **Description**: Bordered container with floating title per SDD Section 5.2. Replaces web's TuiBox. Props: title, variant (default/danger), scrollable, className
- **Acceptance Criteria**:
  - Renders bordered container with `border-tui-border bg-tui-bg`
  - Optional floating title in top-left
  - Danger variant uses `border-tui-red`
- **Effort**: Small
- **Dependencies**: T1.2
- **Testing**: Visual verification

#### T1.10: Form components
- **File(s)**: `apps/explorer/components/ui/form-input.tsx`, `form-textarea.tsx`, `form-select.tsx`, `form-checkbox.tsx`
- **Description**: Form inputs with `React.forwardRef` for react-hook-form compatibility per SDD Section 5.3. Props: label, error, hint. TUI styling
- **Acceptance Criteria**:
  - All components use `forwardRef`
  - Label, error message, and hint slots render correctly
  - Focus state: `border-tui-accent`
  - Error state: `border-tui-red` + red error text
- **Effort**: Medium
- **Dependencies**: T1.2
- **Testing**: Visual verification, forwardRef works with react-hook-form

#### T1.11: Dashboard shell
- **File(s)**: `apps/explorer/components/layout/dashboard-shell.tsx`
- **Description**: Three-panel layout per SDD Section 5.4: sidebar (220px) + content (flex-1) + status bar. Mobile: sidebar as slide-out overlay
- **Acceptance Criteria**:
  - Desktop: sidebar visible, content fills remaining space
  - Mobile: sidebar hidden, hamburger button toggles overlay
  - Status bar at bottom with keyboard hints
- **Effort**: Medium
- **Dependencies**: T1.2, T1.12, T1.14
- **Testing**: Responsive layout at 320px, 768px, 1024px, 1440px

#### T1.12: Sidebar component
- **File(s)**: `apps/explorer/components/layout/sidebar.tsx`
- **Description**: Navigation sidebar with user info and nav items. Port from web's dashboard sidebar
- **Acceptance Criteria**:
  - Shows user avatar/name from auth store
  - Nav items: Dashboard, Skills, Creator, Teams, Analytics, API Keys
  - Logout button at bottom
  - Active state highlights current route
- **Effort**: Medium
- **Dependencies**: T1.2, T1.13
- **Testing**: Navigation works, active state correct

#### T1.13: Nav item component
- **File(s)**: `apps/explorer/components/layout/nav-item.tsx`
- **Description**: Single nav item with active state and keyboard shortcut hint per SDD Section 5.1
- **Acceptance Criteria**:
  - Shows label and optional shortcut hint (e.g., "1")
  - Active state: `bg-tui-accent/10 text-tui-accent`
  - Hover state: `bg-tui-dim/10`
- **Effort**: Small
- **Dependencies**: T1.2
- **Testing**: Visual verification

#### T1.14: Status bar
- **File(s)**: `apps/explorer/components/layout/status-bar.tsx`
- **Description**: Bottom bar showing keyboard navigation hints per SDD Section 5.1
- **Acceptance Criteria**:
  - Shows key hints: j/k navigate, Enter select, 1-6 shortcuts
  - `bg-tui-bg border-t border-tui-border`
  - Fixed to bottom of viewport
- **Effort**: Small
- **Dependencies**: T1.2
- **Testing**: Visual verification

#### T1.15: Playwright configuration
- **File(s)**: `apps/explorer/playwright.config.ts`, `apps/explorer/e2e/fixtures.ts`, `apps/explorer/package.json`
- **Description**: Set up Playwright test infrastructure for incremental E2E coverage per sprint. *[Flatline IMP-003 — auto-integrated]*
- **Acceptance Criteria**:
  - `playwright.config.ts` with `baseURL`, `webServer` config for `pnpm --filter explorer dev`
  - Base test fixtures: `authenticated` (with mock auth cookies) and `unauthenticated`
  - `test:e2e` script in `package.json`
  - At least one smoke test: 3D graph loads on `/` without errors
  - E2E test suite runs as acceptance gate for each sprint going forward
- **Effort**: Medium
- **Dependencies**: T1.1
- **Testing**: `pnpm --filter explorer test:e2e` runs and passes smoke test

---

## Sprint 2: Auth Pages

**Goal**: Users can log in, register, and manage passwords. OAuth callback works.

**Verification**: Auth flow works end-to-end: register -> login -> see dashboard shell -> logout. OAuth buttons redirect correctly.

### Tasks

#### T2.1: Auth layout
- **File(s)**: `apps/explorer/app/(auth)/layout.tsx`
- **Description**: Centered layout with logo, no header/footer per SDD Section 4.7
- **Acceptance Criteria**:
  - Centered container, max-w-md
  - Logo/brand link to `/`
  - No header, no footer, no sidebar
  - `bg-tui-bg` background
- **Effort**: Small
- **Dependencies**: Sprint 1
- **Testing**: Visual verification at multiple viewports

#### T2.2: Login page
- **File(s)**: `apps/explorer/app/(auth)/login/page.tsx`, `apps/explorer/components/auth/login-form.tsx`, `apps/explorer/components/auth/oauth-buttons.tsx`
- **Description**: Email/password login with react-hook-form + zod. OAuth buttons for GitHub + Google. Remember-me checkbox. Post-login redirect from query param
- **Acceptance Criteria**:
  - Form validates email format, password required
  - Submit calls auth store `login()`, redirects to `/dashboard` (or `redirect` query param)
  - OAuth buttons set `window.location.href` to `${NEXT_PUBLIC_API_URL}/v1/auth/oauth/{provider}`
  - Remember-me checkbox controls cookie expiry (30 days vs session)
  - Error messages displayed inline
  - Login page does NOT redirect-if-authenticated on mount (loop prevention per PRD)
- **Effort**: Large
- **Dependencies**: T1.3, T1.6, T1.10
- **Testing**: E2E: login with valid creds -> dashboard. Invalid creds -> error message

#### T2.3: Register page
- **File(s)**: `apps/explorer/app/(auth)/register/page.tsx`, `apps/explorer/components/auth/register-form.tsx`
- **Description**: Email/password/name registration form
- **Acceptance Criteria**:
  - Form validates: email format, password min 8 chars, name optional
  - Submit calls auth store `register()`
  - On success, show verification email sent message
  - Link to login page
- **Effort**: Medium
- **Dependencies**: T1.3, T1.6, T1.10
- **Testing**: Register -> verification message shown

#### T2.4: Forgot password page
- **File(s)**: `apps/explorer/app/(auth)/forgot-password/page.tsx`
- **Description**: Email form to request password reset
- **Acceptance Criteria**:
  - Email input with validation
  - Submit calls `forgotPassword()` API
  - Shows success message regardless of email existence (no user enumeration)
- **Effort**: Small
- **Dependencies**: T1.6, T1.10
- **Testing**: Submit -> success message

#### T2.5: Reset password page
- **File(s)**: `apps/explorer/app/(auth)/reset-password/page.tsx`
- **Description**: Token-based password reset form
- **Acceptance Criteria**:
  - Reads token from URL query params
  - New password + confirm password inputs
  - Submit calls `resetPassword()` API
  - On success, redirect to login
- **Effort**: Small
- **Dependencies**: T1.6, T1.10
- **Testing**: Valid token -> password reset -> login redirect

#### T2.6: Verify email page
- **File(s)**: `apps/explorer/app/(auth)/verify-email/page.tsx`
- **Description**: Email verification with token from URL
- **Acceptance Criteria**:
  - Reads token from URL, calls `verifyEmail()` on mount
  - Shows success or error state
  - Success: link to login
- **Effort**: Small
- **Dependencies**: T1.6
- **Testing**: Valid token -> success message

#### T2.7: OAuth callback page
- **File(s)**: `apps/explorer/app/(auth)/callback/page.tsx`
- **Description**: OAuth token handoff page per SDD Section 7.3. Extracts tokens from URL query params, stores in cookies, cleans URL. **Must live under `(auth)/` route group** which has a minimal layout (T2.1) — no marketing header/footer, no dashboard providers, no third-party analytics scripts
- **Acceptance Criteria**:
  - Route path is `app/(auth)/callback/page.tsx` — inherits (auth) layout (minimal, no header/footer/scripts)
  - `export const dynamic = 'force-dynamic'` — no ISR caching
  - `<meta name="referrer" content="no-referrer">`
  - `robots: { index: false }` in metadata
  - Extracts `access_token`, `refresh_token`, `expires_in` from query params on first render
  - Stores tokens via auth store `setTokens()`
  - Immediately calls `router.replace('/dashboard')` — before analytics/scripts
  - Error case: if `error` query param present, redirect to `/login?error={code}`
  - **Bundle isolation**: callback chunk must NOT include marketing/dashboard components (verify via bundle analyzer)
  - No third-party scripts or analytics load on this page
- **Effort**: Medium
- **Dependencies**: T1.3, T2.1
- **Testing**: Simulate callback URL -> tokens stored -> redirect to dashboard. Bundle analyzer confirms callback chunk is minimal

#### T2.8: Core auth E2E tests
- **File(s)**: `apps/explorer/e2e/auth.spec.ts`
- **Description**: Playwright E2E tests for core auth flows. Run as acceptance gate for Sprint 2. *[Flatline IMP-003 — auto-integrated]*
- **Acceptance Criteria**:
  - Test: login with valid credentials -> redirect to dashboard
  - Test: login with invalid credentials -> error message displayed
  - Test: unauthenticated user -> `/dashboard` redirects to `/login`
  - Test: logout -> redirected to home, dashboard inaccessible
  - All tests pass against dev server
- **Effort**: Medium
- **Dependencies**: T1.15, T2.2, T2.7
- **Testing**: `pnpm --filter explorer test:e2e` passes all auth tests

---

## Sprint 3: Dashboard Core

**Goal**: Authenticated users have a home base with profile and API key management.

**Verification**: Login -> dashboard home -> edit profile -> manage API keys. Sidebar navigation works.

### Tasks

#### T3.1: Dashboard layout + AuthInitializer
- **File(s)**: `apps/explorer/app/(dashboard)/layout.tsx`, `apps/explorer/components/auth/auth-initializer.tsx`
- **Description**: Client component wrapping QueryClientProvider + AuthInitializer + DashboardShell per SDD Section 4.6. This is the provider boundary — React Query and auth only load here. **AuthInitializer is the single place that handles all auth navigation/redirect side-effects** (the store returns typed results, this component acts on them). Also wires up DI for authClient: passes `getToken`/`onRefresh`/`onAuthFailure` from store to client factory
- **Acceptance Criteria**:
  - `'use client'` directive
  - Wraps children in QueryClientProvider + AuthInitializer + DashboardShell
  - AuthInitializer calls `initialize()` on mount, inspects result:
    - `{ ok: true }` → show children
    - `{ ok: false, reason: 'timeout' }` → redirect to `/login`
    - `{ ok: false, reason: 'unauthorized' }` → redirect to `/login`
    - `{ ok: false, reason: 'network_error' }` → show retry UI
  - 10s timeout on init — shows loading skeleton during wait
  - Token refresh interval started on mount, paused on `visibilitychange` hidden
  - AuthInitializer creates `authClient` via `createAuthClient()` with store methods injected (no circular imports)
- **Effort**: Medium
- **Dependencies**: Sprint 1, T1.3, T1.5, T1.7, T1.11
- **Testing**: Dashboard routes show sidebar + content. Unauthenticated -> redirect. Timeout -> redirect

#### T3.2: Dashboard error boundary
- **File(s)**: `apps/explorer/app/(dashboard)/error.tsx`
- **Description**: Error boundary for dashboard route group per SDD Section 8.3
- **Acceptance Criteria**:
  - Shows error in Panel component with retry button
  - "Return to dashboard" link
  - Auth failure -> redirect to login
- **Effort**: Small
- **Dependencies**: T1.9
- **Testing**: Throw error in dashboard page -> error boundary shows

#### T3.3: Dashboard home
- **File(s)**: `apps/explorer/app/(dashboard)/dashboard/page.tsx`
- **Description**: Overview page with activity, stats, quick actions. Port from web's dashboard page
- **Acceptance Criteria**:
  - Shows welcome message with user name
  - Recent activity section
  - Quick action links (create construct, manage API keys)
  - Stats cards (constructs published, total downloads)
- **Effort**: Medium
- **Dependencies**: T3.1
- **Testing**: Page renders with user data

#### T3.4: Profile page
- **File(s)**: `apps/explorer/app/(dashboard)/profile/page.tsx`
- **Description**: User profile edit form with react-hook-form
- **Acceptance Criteria**:
  - Shows current user data (name, email, avatar)
  - Edit form for name, avatar URL
  - Submit calls `updateProfile()` API
  - Success toast/message on save
- **Effort**: Medium
- **Dependencies**: T3.1, T1.10
- **Testing**: Edit name -> save -> name updated on refresh

#### T3.5: API keys page
- **File(s)**: `apps/explorer/app/(dashboard)/api-keys/page.tsx`, `apps/explorer/lib/api/hooks.ts`
- **Description**: API key list, create, revoke. Uses React Query hooks per SDD Section 4.5
- **Acceptance Criteria**:
  - Lists existing API keys with name, prefix, created date
  - Create key button -> modal/form -> shows full key once (never shown again)
  - Revoke button with confirmation
  - React Query hooks: `useApiKeys()`, `useCreateApiKey()`, `useRevokeApiKey()`
  - Optimistic update on revoke
- **Effort**: Large
- **Dependencies**: T3.1, T1.5
- **Testing**: Create key -> shows in list. Revoke -> removed from list

#### T3.6: Billing page
- **File(s)**: `apps/explorer/app/(dashboard)/billing/page.tsx`
- **Description**: Billing placeholder page (NowPayments not active per memory)
- **Acceptance Criteria**:
  - Shows "Free Plan" status
  - Placeholder text for future pricing tiers
  - No payment form (deferred to separate cycle)
- **Effort**: Small
- **Dependencies**: T3.1
- **Testing**: Page renders without errors

#### T3.7: Dashboard API hooks + profile API
- **File(s)**: `apps/explorer/lib/api/hooks.ts` (extend), `apps/explorer/lib/api/profile.ts`
- **Description**: React Query hooks for dashboard data: `useProfile()`, `useUpdateProfile()`, `useDashboardStats()`. Also add profile API functions (`fetchProfile()`, `updateProfile()`) needed by T3.4
- **Acceptance Criteria**:
  - `fetchProfile()` and `updateProfile()` typed API functions in `lib/api/profile.ts`
  - `useProfile()` query hook, `useUpdateProfile()` mutation hook with optimistic update
  - `useDashboardStats()` query hook
  - All hooks use `authClient` for authenticated requests
  - Proper query keys for cache invalidation
  - Error handling returns typed errors
- **Effort**: Medium
- **Dependencies**: T1.5, T1.7
- **Testing**: Hooks return data, loading, error states. updateProfile mutation invalidates profile query

---

## Sprint 4: Dashboard Advanced

**Goal**: Creator tools, skills browser, teams, and analytics.

**Verification**: Creator flow: login -> creator dashboard -> create pack -> edit. Teams and analytics pages render.

### Tasks

#### T4.1: Creator API + hooks
- **File(s)**: `apps/explorer/lib/api/creator.ts`, `apps/explorer/lib/api/hooks.ts` (extend)
- **Description**: API functions and React Query hooks for creator endpoints per SDD Section 6.3
- **Acceptance Criteria**:
  - `fetchCreatorDashboard()`, `createConstruct()`, `updateConstruct()` functions
  - `useCreatorDashboard()`, `useCreateConstruct()`, `useUpdateConstruct()` hooks
- **Effort**: Medium
- **Dependencies**: T1.5
- **Testing**: Type checking passes

#### T4.2: Creator dashboard
- **File(s)**: `apps/explorer/app/(dashboard)/creator/page.tsx`
- **Description**: Pack list with stats, trust scores, reputation badge
- **Acceptance Criteria**:
  - Lists creator's packs with download counts, trust scores
  - Reputation badge display
  - "Create New" button linking to `/creator/new`
  - Empty state for new creators
- **Effort**: Medium
- **Dependencies**: T4.1, T3.1
- **Testing**: Page renders with creator data

#### T4.3: Create construct page
- **File(s)**: `apps/explorer/app/(dashboard)/creator/new/page.tsx`
- **Description**: Multi-step form for new pack creation. Reserved slug validation per SDD Section 8.2
- **Acceptance Criteria**:
  - Form fields: name, slug, description, category
  - Client-side slug validation against reserved list
  - Submit calls `createConstruct()` API
  - On success, redirect to edit page
- **Effort**: Large
- **Dependencies**: T4.1, T1.10
- **Testing**: Create construct -> appears in creator dashboard

#### T4.4: Edit construct page
- **File(s)**: `apps/explorer/app/(dashboard)/creator/skills/[id]/page.tsx`
- **Description**: Edit existing pack/skill
- **Acceptance Criteria**:
  - Loads existing construct data
  - Edit form matches create form fields
  - Submit calls `updateConstruct()` API
  - Success message on save
- **Effort**: Medium
- **Dependencies**: T4.1, T1.10
- **Testing**: Edit field -> save -> updated on refresh

#### T4.5: Skills browser
- **File(s)**: `apps/explorer/app/(dashboard)/skills/page.tsx`, `apps/explorer/app/(dashboard)/skills/[slug]/page.tsx`
- **Description**: Authenticated skills browsing view
- **Acceptance Criteria**:
  - Skills listing with search/filter
  - Detail page for individual skill
  - Install instructions
- **Effort**: Medium
- **Dependencies**: T3.1
- **Testing**: Page renders, navigation to detail works

#### T4.6: Teams pages
- **File(s)**: `apps/explorer/app/(dashboard)/teams/page.tsx`, `apps/explorer/app/(dashboard)/teams/[slug]/page.tsx`, `apps/explorer/app/(dashboard)/teams/[slug]/billing/page.tsx`, `apps/explorer/lib/api/teams.ts`
- **Description**: Team listing, detail with member management, team billing. **All routes under `(dashboard)/` route group for middleware protection and provider access**
- **Acceptance Criteria**:
  - Teams listing page at `(dashboard)/teams/page.tsx`
  - Team detail at `(dashboard)/teams/[slug]/page.tsx` with member list
  - Team billing at `(dashboard)/teams/[slug]/billing/page.tsx` (placeholder like personal billing)
  - API functions: `fetchTeams()`, `fetchTeam()`, `updateTeam()`
  - **All authenticated routes exist only under `(dashboard)/` route group — no duplicate top-level `/teams` routes**
- **Effort**: Large
- **Dependencies**: T3.1
- **Testing**: Navigate teams -> team detail -> members visible. Verify routes are protected by middleware

#### T4.7: Analytics page
- **File(s)**: `apps/explorer/app/(dashboard)/analytics/page.tsx`
- **Description**: Usage analytics dashboard
- **Acceptance Criteria**:
  - Shows usage stats (downloads, API calls, views)
  - Time range selector
  - Chart/graph display
- **Effort**: Medium
- **Dependencies**: T3.1
- **Testing**: Page renders with analytics data

#### T4.8: Keyboard navigation hook
- **File(s)**: `apps/explorer/lib/hooks/use-keyboard-nav.ts`
- **Description**: Keyboard navigation for dashboard per SDD Section 5.6. j/k/arrows for list navigation, 1-6 for sidebar shortcuts, Enter for select
- **Acceptance Criteria**:
  - `useKeyboardNav({ itemCount, shortcuts, onSelect })`
  - j/k move up/down, arrows work, Enter selects
  - Number keys 1-6 navigate to dashboard sections
  - g/G go to first/last item
  - Loop option for list wrapping
- **Effort**: Medium
- **Dependencies**: None
- **Testing**: Keyboard shortcuts work in dashboard

---

## Sprint 5: Marketing Pages

**Goal**: All public-facing content pages with ISR.

**Verification**: All marketing pages render as Server Components with correct ISR revalidation. No auth required.

### Tasks

#### T5.1: Marketing layout
- **File(s)**: `apps/explorer/app/(marketing)/layout.tsx`
- **Description**: Layout with Header + Footer per SDD Section 4.8. Header is Server Component with auth-aware display (cookie check via `cookies()`, no auth store import)
- **Acceptance Criteria**:
  - Header shows login/signup links when no cookie
  - Header shows user menu (dynamic import) when cookie present
  - Footer with site links
  - No js-cookie or auth-store imported in this layout
- **Effort**: Medium
- **Dependencies**: Sprint 1 (T1.8)
- **Testing**: Marketing pages show header/footer. No auth deps in bundle

#### T5.2: Marketing error boundary
- **File(s)**: `apps/explorer/app/(marketing)/error.tsx`
- **Description**: Error boundary for marketing route group
- **Acceptance Criteria**:
  - Friendly error message with return home link
  - Matches marketing layout styling
- **Effort**: Small
- **Dependencies**: T5.1
- **Testing**: Throw error -> error boundary renders

#### T5.3: Construct catalog
- **File(s)**: `apps/explorer/app/(marketing)/constructs/page.tsx`, `apps/explorer/lib/data/fetch-constructs.ts` (extend)
- **Description**: Grid view with filters, search, sort per PRD FR-6.1. ISR with 300s revalidation
- **Acceptance Criteria**:
  - `export const revalidate = 300`
  - Server Component fetching via `publicClient`
  - Grid of construct cards with name, description, category, download count
  - Filter by category, sort by popularity/date
  - Search input
- **Effort**: Large
- **Dependencies**: T5.1, T1.5
- **Testing**: Page renders, filters work, ISR cache serves stale content

#### T5.4: Construct detail (marketing)
- **File(s)**: `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx`
- **Description**: Full marketing detail page per PRD FR-6.2. ISR 600s. Canonical URL (self-referencing)
- **Acceptance Criteria**:
  - `export const revalidate = 600`
  - Shows: description, manifest, identity, versions, reviews
  - `<link rel="canonical">` self-referencing
  - "View in graph" link to `/[slug]`
  - Install command copy button
  - Dynamic metadata for OG/Twitter cards
- **Effort**: Large
- **Dependencies**: T5.1
- **Testing**: Page renders, metadata correct, canonical URL set

#### T5.5: Packs pages
- **File(s)**: `apps/explorer/app/(marketing)/packs/page.tsx`, `packs/[slug]/page.tsx`
- **Description**: Pack listing and detail pages. ISR 300s/600s
- **Acceptance Criteria**:
  - Pack listing with grid view
  - Pack detail with skills list, description, author
  - ISR revalidation intervals per route type
- **Effort**: Medium
- **Dependencies**: T5.1
- **Testing**: Pages render with correct data

#### T5.6: Creator profiles
- **File(s)**: `apps/explorer/app/(marketing)/creators/[username]/page.tsx`
- **Description**: Public creator profile per PRD FR-6.3. ISR 600s
- **Acceptance Criteria**:
  - Shows creator name, bio, reputation, trust score
  - Lists creator's published constructs
  - `export const revalidate = 600`
- **Effort**: Medium
- **Dependencies**: T5.1
- **Testing**: Profile renders with constructs listed

#### T5.7: Docs page
- **File(s)**: `apps/explorer/app/(marketing)/docs/page.tsx`
- **Description**: Documentation hub. ISR 86400s
- **Acceptance Criteria**:
  - Documentation content renders
  - `export const revalidate = 86400`
  - Links to relevant docs sections
- **Effort**: Small
- **Dependencies**: T5.1
- **Testing**: Page renders

#### T5.8: Pricing page
- **File(s)**: `apps/explorer/app/(marketing)/pricing/page.tsx`
- **Description**: Tier comparison page. ISR 86400s
- **Acceptance Criteria**:
  - Tier cards with feature comparison
  - CTA buttons (currently placeholder — NowPayments deferred)
  - `export const revalidate = 86400`
- **Effort**: Small
- **Dependencies**: T5.1
- **Testing**: Page renders

#### T5.9: Blog pages
- **File(s)**: `apps/explorer/app/(marketing)/blog/page.tsx`, `blog/[slug]/page.tsx`
- **Description**: Blog listing + individual posts. ISR 3600s
- **Acceptance Criteria**:
  - Blog listing with post cards (title, date, excerpt)
  - Individual post page with full content
  - `export const revalidate = 3600`
  - Dynamic metadata per post
- **Effort**: Medium
- **Dependencies**: T5.1
- **Testing**: Blog list renders, individual posts render

#### T5.10: Static pages
- **File(s)**: `apps/explorer/app/(marketing)/changelog/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`
- **Description**: Changelog, terms of service, privacy policy. ISR 86400s/3600s
- **Acceptance Criteria**:
  - All three pages render content
  - Changelog: `revalidate = 3600`
  - Terms/Privacy: `revalidate = 86400`
- **Effort**: Small
- **Dependencies**: T5.1
- **Testing**: Pages render

---

## Sprint 6: SEO + Polish + Hardening

**Goal**: Production readiness. SEO metadata, HttpOnly refresh token migration, responsive audit.

**Verification**: Lighthouse >= 80 on marketing pages. Auth flow works with HttpOnly refresh. Bundle budget met.

### Tasks

#### T6.1: SEO metadata
- **File(s)**: `apps/explorer/app/layout.tsx` (base), page-level metadata exports
- **Description**: Port Open Graph, Twitter cards, JSON-LD from web per PRD FR-9
- **Acceptance Criteria**:
  - Base metadata in root layout (site name, description)
  - Dynamic OG/Twitter metadata per marketing page
  - JSON-LD structured data for constructs
  - Canonical URLs: `/constructs/[slug]` self-referencing, `/[slug]` points to `/constructs/[slug]`
- **Effort**: Medium
- **Dependencies**: Sprint 5
- **Testing**: OG tags render in page source

#### T6.2: Sitemap + robots
- **File(s)**: `apps/explorer/app/sitemap.ts`, `apps/explorer/app/robots.ts`
- **Description**: Dynamic sitemap and robots.txt per PRD FR-9
- **Acceptance Criteria**:
  - Sitemap includes all canonical marketing URLs
  - `/[slug]` routes excluded from sitemap (canonical is `/constructs/[slug]`)
  - `/auth/callback` excluded
  - robots.txt allows all crawlers, references sitemap
- **Effort**: Small
- **Dependencies**: Sprint 5
- **Testing**: `/sitemap.xml` returns valid XML, `/robots.txt` correct

#### T6.3: Header auth state
- **File(s)**: `apps/explorer/components/layout/header.tsx`, `apps/explorer/components/layout/header-user-menu.tsx`
- **Description**: Server Component header with auth-aware display per SDD Section 4.8 (revised). No auth store or js-cookie imports
- **Acceptance Criteria**:
  - Header checks `cookies().has('access_token')` server-side
  - Logged out: static login/signup links
  - Logged in: `<HeaderUserMenu />` loaded via `next/dynamic({ ssr: false })`
  - HeaderUserMenu is thin client component — does NOT import auth-store
  - js-cookie NOT in marketing bundle
- **Effort**: Medium
- **Dependencies**: T5.1
- **Testing**: Bundle analyzer confirms no auth deps in marketing chunks

#### T6.4: Redirects
- **File(s)**: `apps/explorer/next.config.ts`
- **Description**: Cross-domain redirects per PRD FR-9.5. Note: Vercel domain redirect for `constructs.loa.dev` is configured in dashboard, not code
- **Acceptance Criteria**:
  - Document Vercel domain redirect configuration
  - Any code-level redirects for URL changes (none expected — 1:1 mapping)
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Verify no broken URLs

#### T6.4b: CSRF mitigation for auth route handlers
- **File(s)**: `apps/explorer/app/api/auth/*/route.ts`, `apps/explorer/lib/api/csrf.ts`
- **Description**: Auth route handlers that set cookies need CSRF protection. *[Flatline IMP-005 — auto-integrated]*
- **Acceptance Criteria**:
  - Origin/Referer header validation on all `POST` route handlers under `/api/auth/*`
  - Reject requests where `Origin` header doesn't match expected domain (`constructs.network`)
  - Alternative: custom `X-Requested-With` header required on all auth API calls from client
  - CSRF check implemented as reusable middleware/utility in `lib/api/csrf.ts`
  - Test: cross-origin POST to `/api/auth/login` is rejected with 403
- **Effort**: Small
- **Dependencies**: None (can be built before T6.5b)
- **Testing**: Unit test for CSRF validation. Cross-origin request -> 403

#### T6.5a: HttpOnly refresh — API contract verification
- **File(s)**: Documentation / investigation task
- **Description**: **Prerequisite for T6.5b.** Verify/confirm the API contract for HttpOnly cookie-based refresh. The current API issues refresh tokens via JSON response body (used with js-cookie). The route handler proxy pattern requires either: (A) API sends refresh token in response body and route handler sets it as HttpOnly cookie, or (B) API itself sets HttpOnly cookie on the response. Confirm which pattern applies and document cookie attributes
- **Acceptance Criteria**:
  - Document which API endpoint(s) return refresh tokens and in what format
  - Confirm cookie attributes: `Domain` (must work across `constructs.network` ↔ `api.constructs.network` if needed), `Path=/`, `SameSite=Lax`, `Secure=true`, `HttpOnly=true`
  - Confirm `credentials: 'include'` is set on fetch calls to the route handler
  - Document the login flow change: login API → route handler sets HttpOnly cookie → client only receives access token
  - If API changes are needed, document them as a dependency
- **Effort**: Small
- **Dependencies**: None
- **Testing**: Contract documented and validated against API source

#### T6.5b: HttpOnly refresh token migration
- **File(s)**: `apps/explorer/app/api/auth/refresh/route.ts`, `apps/explorer/app/api/auth/login/route.ts`, `apps/explorer/lib/stores/auth-store.ts` (update)
- **Description**: Sprint 6 hardening per PRD and SDD. Create Next.js route handlers that proxy auth requests server-side so refresh token is HttpOnly. Login route handler sets HttpOnly cookie; refresh route handler reads it
- **Acceptance Criteria**:
  - `/api/auth/login` route handler: proxies login to API, sets HttpOnly refresh cookie on response, returns access token to client
  - `/api/auth/refresh` route handler: reads HttpOnly refresh cookie, calls API, returns new access token, updates HttpOnly cookie
  - `/api/auth/logout` route handler: clears HttpOnly refresh cookie
  - Auth store `refreshToken()` calls `/api/auth/refresh` instead of directly calling API
  - Auth store `login()` calls `/api/auth/login` route handler
  - Cookie attributes per T6.5a verification (Domain, Path, SameSite, Secure, HttpOnly)
  - `credentials: 'include'` on all fetch calls to route handlers
  - Access token remains JS-readable for Bearer headers
  - E2E test: hard reload → refresh works → user stays logged in
- **Effort**: Large
- **Dependencies**: T6.5a, T1.3
- **Testing**: Refresh flow works, refresh token not accessible via `document.cookie`. E2E test with hard reload

#### T6.6: Bundle size enforcement
- **File(s)**: `apps/explorer/.eslintrc.js` (or equivalent), CI script
- **Description**: Machine-enforced bundle isolation per SDD Section 10.1
- **Acceptance Criteria**:
  - ESLint `no-restricted-imports` prevents `@tanstack/react-query`, `react-hook-form`, `zod`, `js-cookie` imports outside `(auth)/` and `(dashboard)/` directories
  - CI script parses bundle analyzer output, fails if root shared chunk exceeds baseline + 20KB
  - No barrel exports across route group boundaries
- **Effort**: Medium
- **Dependencies**: Sprint 5 (need full app to measure baseline)
- **Testing**: Intentional bad import -> lint error. Bundle check passes

#### T6.7: Responsive audit
- **File(s)**: All pages
- **Description**: Test all pages at mobile (320px), tablet (768px), desktop (1024px, 1440px)
- **Acceptance Criteria**:
  - All pages usable at all breakpoints
  - Dashboard sidebar collapses to overlay on mobile
  - Auth forms centered and readable on mobile
  - 3D graph adapts to viewport
- **Effort**: Medium
- **Dependencies**: All previous sprints
- **Testing**: Playwright screenshots at each breakpoint

#### T6.8: Performance audit
- **File(s)**: Bundle analysis output
- **Description**: Verify 3D graph not impacted by new code. Lighthouse audit on marketing pages
- **Acceptance Criteria**:
  - Root shared chunk within baseline + 20KB budget
  - Lighthouse performance >= 80 on `/constructs`, `/pricing`, `/docs`
  - 3D graph maintains 60fps desktop / 30fps mobile
  - React Query, react-hook-form, zod, js-cookie NOT in root/marketing chunks
- **Effort**: Medium
- **Dependencies**: All previous sprints
- **Testing**: Bundle analyzer report, Lighthouse scores

---

## Sprint 7: Cleanup

**Goal**: Remove apps/web, update monorepo configuration.

**Verification**: `apps/web/` deleted. `pnpm install && pnpm build` succeeds. All turborepo tasks pass.

### Tasks

#### T7.0: Pre-deletion rollback plan
- **File(s)**: Documentation task
- **Description**: Before deleting apps/web, document a rollback/revert plan for the irreversible deletion sprint. Covers git tag, infra/DNS rollback, Vercel retention, and trigger criteria. *[Flatline IMP-001 — auto-integrated]*
- **Acceptance Criteria**:
  - Git tag `pre-consolidation` created on last commit before deletion
  - Document rollback procedure: git revert path, Vercel rollback steps, DNS failover
  - Define trigger criteria for rollback (e.g., SEO regression >20%, auth failure rate >5%)
  - Verify Vercel retains previous deployment for instant rollback
- **Effort**: Small
- **Dependencies**: All previous sprints verified
- **Testing**: Tag created, rollback doc reviewed

#### T7.1: Delete apps/web
- **File(s)**: `apps/web/` (entire directory)
- **Description**: Remove the web app directory
- **Acceptance Criteria**:
  - `apps/web/` directory completely removed
  - No broken imports from other packages referencing web
- **Effort**: Small
- **Dependencies**: T7.0, all previous sprints verified
- **Testing**: `pnpm install` succeeds

#### T7.2: Update monorepo config
- **File(s)**: `turbo.json`, root `package.json`, `pnpm-workspace.yaml`
- **Description**: Remove web references from monorepo configuration
- **Acceptance Criteria**:
  - `turbo.json` no longer references `web` app
  - Root `package.json` scripts don't reference web
  - `pnpm-workspace.yaml` still includes explorer
  - `pnpm build` succeeds across all remaining packages
- **Effort**: Small
- **Dependencies**: T7.1
- **Testing**: `pnpm build` from root succeeds

#### T7.3: Update CI/CD
- **File(s)**: `.github/workflows/*`
- **Description**: Remove web build/deploy steps from CI workflows
- **Acceptance Criteria**:
  - No CI steps referencing `apps/web` or `--filter web`
  - Explorer build/deploy steps correct
  - All CI workflows pass
- **Effort**: Small
- **Dependencies**: T7.1
- **Testing**: CI passes on PR

#### T7.4: Documentation update
- **File(s)**: `README.md`, `CHANGELOG.md`, `.env.example`
- **Description**: Update documentation to reflect single-app architecture
- **Acceptance Criteria**:
  - README reflects 3 apps (api, explorer, sandbox) not 4
  - CHANGELOG entry for consolidation
  - `.env.example` has explorer env vars, no web-specific vars
  - `constructs.network` documented as explorer deployment
- **Effort**: Small
- **Dependencies**: T7.1
- **Testing**: Documentation accurate

---

## Risk Assessment

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Root bundle grows from providers | 1 | Providers in `(dashboard)/layout.tsx` only; ESLint import rules (Sprint 6) |
| R3F conflicts with new deps | 1 | Compatibility check during T1.1 |
| Hydration mismatches | 1-2 | Clear `'use client'` boundaries; test each component |
| Middleware redirect loops | 2 | Explicit matcher; login page no redirect-on-mount |
| OAuth callback race condition | 2 | Token extraction before any client init; `force-dynamic` |
| ISR stale content | 5 | Defined revalidation intervals per route type |
| Bundle budget exceeded | 6 | CI enforcement via analyzer + ESLint rules |

## Dependencies

- **API** (`api.constructs.network`): All endpoints exist and are deployed
- **Vercel**: Explorer already deployed; DNS update needed in Sprint 7
- **Supabase**: Database schema supports all features
