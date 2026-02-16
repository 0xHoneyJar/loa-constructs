# PRD: Marketplace Consolidation — Web to Explorer

**Cycle**: cycle-015
**Created**: 2026-02-15
**Status**: Draft

---

## 1. Problem Statement

The Constructs Network operates two Next.js frontend apps that serve overlapping purposes with diverging technology stacks:

- **`apps/web`** (Next.js 14, React 18) — Full marketplace with 31 routes: authentication, dashboard, creator tools, marketing pages, TUI terminal aesthetic with CSS variables
- **`apps/explorer`** (Next.js 15, React 19) — 3D construct visualization with 4 routes: graph home, construct detail, about, install. Tailwind CSS, Zustand, React Three Fiber

This dual-app architecture creates concrete problems:

1. **Duplicated concerns** — Both apps display construct details, both have about/install pages, both fetch from the same API
2. **Diverging stacks** — Web uses React Context + CSS variables + React 18; Explorer uses Zustand + Tailwind + React 19. Component patterns can't be shared
3. **Split identity** — Users see `constructs.network` (web) for the marketplace and `constructs.loa.dev` (explorer) for the 3D view. The product feels like two things instead of one
4. **Maintenance burden** — Bug fixes, style updates, and API changes must be applied twice. New features require deciding which app gets them

> Source: marketplace-consolidation.md:5-11, planning session exploration

## 2. Product Vision

**The explorer IS the marketplace.** The 3D network graph is the hero experience — it's what makes the Constructs Network visually distinctive and memorable. Rather than maintaining a separate "traditional" marketplace alongside it, consolidate everything into a single Next.js 15 app where the 3D graph is the front door, and all marketplace functionality (auth, dashboard, creator tools, marketing) lives behind it.

**One URL. One app. One experience: `constructs.network`.**

> Source: marketplace-consolidation.md:9, user direction: "the explorer is our marketplace, that will be our main hub"

## 3. Goals & Success Metrics

### Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G1 | Feature parity | All 31 web routes have working equivalents in explorer |
| G2 | Zero regression | 3D graph load time and frame rate unchanged after consolidation |
| G3 | Single deployment | One Vercel project serves `constructs.network` |
| G4 | Clean removal | `apps/web/` directory deleted, monorepo builds without it |
| G5 | Auth system | Users can register, login, manage profile, create constructs |

### Success Criteria

- All web routes accessible at equivalent explorer URLs
- `pnpm --filter explorer build` succeeds with zero type errors
- 3D graph maintains 60fps on desktop, 30fps on mobile
- Lighthouse performance score >= 80 on marketing pages
- Auth flow works end-to-end: register -> verify email -> login -> dashboard -> logout

### Non-Goals

- Redesigning the UI (port existing functionality, not rethink it)
- Adding new features beyond what web currently has
- Mobile native app
- Internationalization

## 4. User Personas

### P1: Construct Consumer

**Who**: Developer or AI practitioner who discovers, installs, and uses constructs (skills + packs)
**Current journey**: Lands on web marketplace -> browses catalog -> views construct detail -> copies install command -> runs in Claude Code
**New journey**: Lands on explorer 3D graph -> explores visually or searches -> clicks construct node -> views detail -> installs
**Key pages**: Home (3D graph), construct catalog, construct detail, install guide

### P2: Construct Creator

**Who**: Expert who authors and publishes constructs to the marketplace
**Current journey**: Logs into web dashboard -> creates/edits packs -> views analytics -> manages API keys
**New journey**: Logs into explorer dashboard -> same workflow, same pages, unified experience
**Key pages**: Auth (login/register), dashboard, creator tools, profile, API keys

### P3: Team Admin

**Who**: Organization admin who manages team access and billing
**Current journey**: Web dashboard -> teams section -> manage members -> billing
**New journey**: Explorer dashboard -> same workflow
**Key pages**: Teams, team detail, team billing

### P4: Visitor

**Who**: First-time visitor evaluating the product
**Current journey**: Web landing page -> pricing -> docs -> about
**New journey**: Explorer 3D graph (wow factor) -> marketing pages -> docs
**Key pages**: Home, pricing, docs, about, blog, changelog

> Source: mapping from apps/web route groups (auth, dashboard, marketing)

## 5. Functional Requirements

### FR-1: Authentication System

The explorer currently has no auth. Port the complete auth system from web.

| ID | Requirement | Source |
|----|------------|--------|
| FR-1.1 | Email/password login with remember-me option | `apps/web/src/app/(auth)/login/page.tsx` |
| FR-1.2 | Email/password registration with name | `apps/web/src/app/(auth)/register/page.tsx` |
| FR-1.3 | Password reset flow (forgot -> email -> reset) | `apps/web/src/app/(auth)/forgot-password/`, `reset-password/` |
| FR-1.4 | Email verification | `apps/web/src/app/(auth)/verify-email/page.tsx` |
| FR-1.5 | JWT token management (access + refresh tokens) | `apps/web/src/contexts/auth-context.tsx` |
| FR-1.6 | Token refresh on 401 + background refresh when tab is active | `auth-context.tsx:248-262` |
| FR-1.7 | Server-side route gating via Next.js middleware (UX optimization — prevents flash-of-unauthenticated-content) | NEW (improvement over web's client-only `ProtectedRoute` redirect) |
| FR-1.8 | Auth state in Zustand store (not React Context) | NEW (consistency with explorer's existing Zustand pattern) |
| FR-1.9 | OAuth login (GitHub + Google) | `apps/web/src/app/(auth)/login/page.tsx`, `apps/api/src/routes/oauth.ts` |

#### Token & Cookie Strategy

The current web app stores JWT tokens in non-HttpOnly cookies via `js-cookie` and sends them as `Authorization: Bearer` headers. This pattern is preserved for parity, with the following explicit requirements:

| Aspect | Requirement |
|--------|-------------|
| Access token storage | Non-HttpOnly cookie (`access_token`), readable by JS for `Authorization` header |
| Refresh token storage | Non-HttpOnly cookie (`refresh_token`), readable by JS for refresh calls |
| Cookie flags | `Secure` (production), `SameSite=Lax` |
| Remember-me | If checked, cookies expire in 30 days; otherwise session cookies |
| Token transmission | `Authorization: Bearer <access_token>` header on all API calls |
| CORS | `credentials: 'include'` on fetch; API already allows `constructs.network` origin with `credentials: true` |
| Access token TTL | 15 minutes (set by API) |
| Refresh token TTL | 30 days (set by API) |
| Token algorithm | HS256 JWT with JTI for revocation |

> **Security model**: Tokens are stored in JS-readable cookies (not HttpOnly) and sent via `Authorization: Bearer` headers. This is the existing `apps/web` pattern, preserved for parity. **XSS risk accepted**: a successful XSS attack can read tokens from cookies. Mitigations: (1) CSP headers to limit script sources, (2) input sanitization, (3) short-lived access tokens (15 min). **Middleware is a UX gate, not a security boundary** — it prevents unauthenticated users from seeing dashboard chrome, but all authorization is enforced API-side. **Sprint 6 hardening**: Migrate refresh token to HttpOnly cookie with a server-side `/api/auth/refresh` Next.js route handler proxy. Access token remains JS-readable for Bearer headers. This limits XSS blast radius to 15-min access token instead of 30-day refresh token.

#### Token Refresh Strategy

| Scenario | Behavior |
|----------|----------|
| API returns 401 | Client interceptor calls `POST /v1/auth/refresh` once with refresh token. On success, retry original request. On failure, clear tokens and redirect to `/login` |
| Background refresh | When tab is active, refresh access token proactively before expiry (~14 min interval, matching 15 min TTL). Pause when tab is hidden (Page Visibility API) |
| Middleware check | Middleware checks for `access_token` cookie **presence** (not validity). If missing, redirect to `/login`. This is a **UX optimization** (prevents flash-of-unauthenticated-content), not a security boundary. Middleware does NOT call external APIs or validate JWT signatures. All security enforcement happens API-side via Bearer token validation |
| Expired token + middleware | Middleware allows request through (cookie present but expired). Page component fetches `/v1/auth/me` or data endpoint. 401 triggers client-side refresh-and-retry. If refresh fails, redirect to `/login` |
| Redirect loop prevention | After redirect to `/login`, login page does NOT check auth (no redirect-if-authenticated on mount until after successful login action) |

#### OAuth Providers

Two OAuth providers are fully implemented in the API:

| Provider | Initiation | Callback | Source |
|----------|-----------|----------|--------|
| GitHub | `GET /v1/auth/oauth/github` | `GET /v1/auth/oauth/github/callback` | `apps/api/src/routes/oauth.ts` |
| Google | `GET /v1/auth/oauth/google` | `GET /v1/auth/oauth/google/callback` | `apps/api/src/routes/oauth.ts` |

OAuth flow:
1. Login page has "Continue with GitHub/Google" buttons
2. Button sets `window.location.href` to `${API_URL}/v1/auth/oauth/{provider}`
3. API sets CSRF state cookie (httpOnly), redirects to provider authorization page
4. Provider redirects back to `${API_URL}/v1/auth/oauth/{provider}/callback`
5. API exchanges code for provider token, fetches user info, creates/links account, generates JWT
6. **API redirects to `${DASHBOARD_URL}/auth/callback?access_token=...&refresh_token=...&expires_in=...`** (tokens in query params — see `apps/api/src/routes/oauth.ts:292-298`)
7. Explorer `/auth/callback` page (NEW — must be created) extracts tokens from query params, stores in cookies via `js-cookie`, then immediately cleans URL via `router.replace('/dashboard')`

**Token security on callback**:
- The `/auth/callback` page must set `<meta name="referrer" content="no-referrer">` to prevent token leakage via Referrer header
- Tokens must be extracted and URL cleaned on first render (before any analytics or third-party scripts fire)
- The callback page must not be indexed: `robots: { index: false }` in metadata
- Error cases: API redirects to `/login?error={code}` (oauth_denied, oauth_failed, oauth_no_email, oauth_invalid_state)

> **Note**: `apps/web` does not have an `/auth/callback` page — this is a partially implemented feature. The explorer must create this page as part of Sprint 2 (Auth Pages). The API-side OAuth flow is fully implemented and tested.

Required env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (already configured on API). Explorer needs `NEXT_PUBLIC_API_URL` to construct OAuth initiation URLs.

**API endpoints** (all exist on `api.constructs.network`):
- `POST /v1/auth/login`
- `POST /v1/auth/register`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`
- `POST /v1/auth/forgot-password`
- `POST /v1/auth/reset-password`
- `POST /v1/auth/verify-email`
- `GET /v1/auth/oauth/github` (OAuth initiation)
- `GET /v1/auth/oauth/github/callback` (OAuth callback)
- `GET /v1/auth/oauth/google` (OAuth initiation)
- `GET /v1/auth/oauth/google/callback` (OAuth callback)

### FR-2: Dashboard

Authenticated user home base with sidebar navigation and keyboard shortcuts.

| ID | Requirement | Source |
|----|------------|--------|
| FR-2.1 | Dashboard overview (activity, stats, quick actions) | `apps/web/src/app/(dashboard)/dashboard/page.tsx` |
| FR-2.2 | User profile editing | `apps/web/src/app/(dashboard)/profile/page.tsx` |
| FR-2.3 | API key management (list, create, revoke) | `apps/web/src/app/(dashboard)/api-keys/page.tsx` |
| FR-2.4 | Billing page (placeholder for NowPayments) | `apps/web/src/app/(dashboard)/billing/page.tsx` |
| FR-2.5 | Skills browser (authenticated view) | `apps/web/src/app/(dashboard)/skills/` |
| FR-2.6 | Sidebar navigation with keyboard shortcuts (1-6) | `apps/web/src/app/(dashboard)/layout.tsx:14-27` |
| FR-2.7 | Status bar with keyboard hints | `apps/web/src/components/tui/tui-layout.tsx` |

### FR-3: Creator Tools

Pack creation and management for construct authors.

| ID | Requirement | Source |
|----|------------|--------|
| FR-3.1 | Creator dashboard (pack list, stats, trust scores) | `apps/web/src/app/(dashboard)/creator/page.tsx` |
| FR-3.2 | Create new construct (multi-step form) | `apps/web/src/app/(dashboard)/creator/new/page.tsx` |
| FR-3.3 | Edit existing construct | `apps/web/src/app/(dashboard)/creator/skills/[id]/page.tsx` |
| FR-3.4 | Reputation badge and trust score display | `apps/api/src/services/creator.ts` (just added in cycle-014) |

### FR-4: Team Management

| ID | Requirement | Source |
|----|------------|--------|
| FR-4.1 | Teams listing | `apps/web/src/app/(dashboard)/teams/page.tsx` |
| FR-4.2 | Team detail with member management | `apps/web/src/app/(dashboard)/teams/[slug]/page.tsx` |
| FR-4.3 | Team billing | `apps/web/src/app/(dashboard)/teams/[slug]/billing/page.tsx` |

### FR-5: Analytics

| ID | Requirement | Source |
|----|------------|--------|
| FR-5.1 | Usage analytics dashboard | `apps/web/src/app/(dashboard)/analytics/page.tsx` |

### FR-6: Marketing Pages

Public-facing content pages. All server-rendered with ISR.

| ID | Requirement | Source |
|----|------------|--------|
| FR-6.1 | Construct catalog (grid view, filters, search, sort) | `apps/web/src/app/(marketing)/constructs/page.tsx` |
| FR-6.2 | Construct detail (full marketing view with manifest, identity, versions) | `apps/web/src/app/(marketing)/constructs/[slug]/page.tsx` |
| FR-6.3 | Creator profiles (author page with constructs, reputation) | `apps/web/src/app/(marketing)/creators/[username]/page.tsx` |
| FR-6.4 | Documentation hub | `apps/web/src/app/(marketing)/docs/page.tsx` |
| FR-6.5 | Pricing page (tier comparison) | `apps/web/src/app/(marketing)/pricing/page.tsx` |
| FR-6.6 | Blog (listing + individual posts) | `apps/web/src/app/(marketing)/blog/` |
| FR-6.7 | Changelog | `apps/web/src/app/(marketing)/changelog/page.tsx` |
| FR-6.8 | Terms of service | `apps/web/src/app/(marketing)/terms/page.tsx` |
| FR-6.9 | Privacy policy | `apps/web/src/app/(marketing)/privacy/page.tsx` |

#### ISR Revalidation Strategy

All marketing pages use Next.js ISR (Incremental Static Regeneration) with time-based revalidation. The API does not currently support webhook-based on-demand revalidation, so all caching is time-based.

| Route Type | `revalidate` | Rationale |
|-----------|-------------|-----------|
| Construct catalog (`/constructs`, `/packs`) | 300s (5 min) | New constructs are published infrequently; 5 min staleness is acceptable |
| Construct detail (`/constructs/[slug]`, `/packs/[slug]`) | 600s (10 min) | Individual construct data changes rarely after publish |
| Creator profiles (`/creators/[username]`) | 600s (10 min) | Reputation/stats update on API writes, not real-time |
| Blog listing + posts (`/blog`, `/blog/[slug]`) | 3600s (1 hr) | Content changes are editorial, not time-sensitive |
| Changelog (`/changelog`) | 3600s (1 hr) | Updated only on releases |
| Static pages (`/docs`, `/pricing`, `/terms`, `/privacy`) | 86400s (24 hr) | Rarely change; daily refresh sufficient |
| Home (`/`) | N/A | 3D graph page is client-rendered, not ISR |

Dashboard routes (`(dashboard)/*`) use React Query with stale-while-revalidate, not ISR — they require authenticated, real-time data.

### FR-7: 3D Explorer (Preserved)

These features already exist and must remain unchanged.

| ID | Requirement | Status |
|----|------------|--------|
| FR-7.1 | 3D network graph visualization (React Three Fiber) | EXISTS — unchanged |
| FR-7.2 | Category filtering | EXISTS — unchanged |
| FR-7.3 | Fuzzy search with command palette (Fuse.js) | EXISTS — unchanged |
| FR-7.4 | Stack composition HUD | EXISTS — unchanged |
| FR-7.5 | Construct detail page (graph-contextualized) | EXISTS — unchanged |
| FR-7.6 | Hover tooltips on nodes | EXISTS — unchanged |

### FR-8: UI Components

Re-implement web's TUI terminal aesthetic within Tailwind.

| ID | Requirement | Source |
|----|------------|--------|
| FR-8.1 | Panel component (bordered container with title) | Port from `apps/web/src/components/tui/tui-box.tsx` |
| FR-8.2 | Form inputs (input, textarea, select, checkbox, radio) with react-hook-form | Port from `apps/web/src/components/tui/tui-input.tsx` |
| FR-8.3 | Dashboard sidebar layout | Port from `apps/web/src/components/tui/tui-layout.tsx` |
| FR-8.4 | Navigation items with active state | Port from `apps/web/src/components/tui/tui-nav-item.tsx` |
| FR-8.5 | Status bar with keyboard hints | Port from `apps/web/src/components/tui/tui-status-bar.tsx` |
| FR-8.6 | TUI color tokens in Tailwind config | NEW: `tui.*` namespace (bg, fg, bright, dim, accent, green, yellow, red, cyan, border) |

### FR-9: SEO & Production

| ID | Requirement | Source |
|----|------------|--------|
| FR-9.1 | Open Graph + Twitter Card metadata per page | `apps/web/` metadata exports |
| FR-9.2 | JSON-LD structured data | `apps/web/` |
| FR-9.3 | Dynamic sitemap | `apps/web/src/app/sitemap.ts` |
| FR-9.4 | robots.txt | `apps/web/src/app/robots.ts` |
| FR-9.5 | Cross-domain redirects from `constructs.loa.dev` | NEW |
| FR-9.6 | Page view + event tracking | `apps/web/` analytics integration |
| FR-9.7 | Header shows login/signup or user avatar based on auth state | NEW |
| FR-9.8 | Canonical URL tags on all pages | NEW |

#### Canonical URL & Redirect Policy

**Same-domain paths**: All 31 web routes use identical URL paths in explorer (see Route Parity Matrix, Section 6). No path-level redirects are needed since URLs are preserved 1:1.

**Cross-domain redirect**: `constructs.loa.dev` must 301 redirect all paths to `constructs.network`. Implementation: Vercel domain redirect (configured in Vercel dashboard, not `next.config.ts`). This is a blanket redirect — `constructs.loa.dev/about` → `constructs.network/about`, etc.

**Dual construct detail routes**:

| Route | Purpose | Canonical | `rel=canonical` |
|-------|---------|-----------|----------------|
| `/[slug]` | Graph-contextualized view (3D context, adjacent nodes) | No | Points to `/constructs/[slug]` |
| `/constructs/[slug]` | Full marketing detail (manifest, versions, reviews, SEO) | **Yes** | Self-referencing |

The marketing detail page (`/constructs/[slug]`) is the canonical URL for search engines. The graph view (`/[slug]`) sets `<link rel="canonical" href="https://constructs.network/constructs/[slug]" />` to avoid duplicate content. Both pages cross-link to each other ("View in graph" / "View full details").

**Sitemap**: Only canonical URLs included. `/[slug]` routes excluded from sitemap; `/constructs/[slug]` included.

## 6. Route Parity Matrix

Complete mapping of all 31 web routes to their explorer equivalents. This is the definitive verification checklist for G1 (feature parity).

| # | Web URL | Explorer URL | Auth | Route Group | Source File |
|---|---------|-------------|------|-------------|-------------|
| 1 | `/` | `/` (3D graph — EXISTS) | No | root | `(marketing)/page.tsx` → already `app/page.tsx` |
| 2 | `/login` | `/login` | No | `(auth)` | `(auth)/login/page.tsx` |
| 3 | `/register` | `/register` | No | `(auth)` | `(auth)/register/page.tsx` |
| 4 | `/forgot-password` | `/forgot-password` | No | `(auth)` | `(auth)/forgot-password/page.tsx` |
| 5 | `/reset-password` | `/reset-password` | No | `(auth)` | `(auth)/reset-password/page.tsx` |
| 6 | `/verify-email` | `/verify-email` | No | `(auth)` | `(auth)/verify-email/page.tsx` |
| — | N/A (missing in web) | `/auth/callback` | No | `(auth)` | NEW: `(auth)/callback/page.tsx` (OAuth token handoff) |
| 7 | `/dashboard` | `/dashboard` | Yes | `(dashboard)` | `(dashboard)/dashboard/page.tsx` |
| 8 | `/profile` | `/profile` | Yes | `(dashboard)` | `(dashboard)/profile/page.tsx` |
| 9 | `/api-keys` | `/api-keys` | Yes | `(dashboard)` | `(dashboard)/api-keys/page.tsx` |
| 10 | `/billing` | `/billing` | Yes | `(dashboard)` | `(dashboard)/billing/page.tsx` |
| 11 | `/skills` | `/skills` | Yes | `(dashboard)` | `(dashboard)/skills/page.tsx` |
| 12 | `/skills/[slug]` | `/skills/[slug]` | Yes | `(dashboard)` | `(dashboard)/skills/[slug]/page.tsx` |
| 13 | `/analytics` | `/analytics` | Yes | `(dashboard)` | `(dashboard)/analytics/page.tsx` |
| 14 | `/creator` | `/creator` | Yes | `(dashboard)` | `(dashboard)/creator/page.tsx` |
| 15 | `/creator/new` | `/creator/new` | Yes | `(dashboard)` | `(dashboard)/creator/new/page.tsx` |
| 16 | `/creator/skills/[id]` | `/creator/skills/[id]` | Yes | `(dashboard)` | `(dashboard)/creator/skills/[id]/page.tsx` |
| 17 | `/teams` | `/teams` | Yes | `(dashboard)` | `(dashboard)/teams/page.tsx` |
| 18 | `/teams/[slug]` | `/teams/[slug]` | Yes | `(dashboard)` | `(dashboard)/teams/[slug]/page.tsx` |
| 19 | `/teams/[slug]/billing` | `/teams/[slug]/billing` | Yes | `(dashboard)` | `(dashboard)/teams/[slug]/billing/page.tsx` |
| 20 | `/constructs` | `/constructs` | No | `(marketing)` | `(marketing)/constructs/page.tsx` |
| 21 | `/constructs/[slug]` | `/constructs/[slug]` | No | `(marketing)` | `(marketing)/constructs/[slug]/page.tsx` |
| 22 | `/packs` | `/packs` | No | `(marketing)` | `(marketing)/packs/page.tsx` |
| 23 | `/packs/[slug]` | `/packs/[slug]` | No | `(marketing)` | `(marketing)/packs/[slug]/page.tsx` |
| 24 | `/creators/[username]` | `/creators/[username]` | No | `(marketing)` | `(marketing)/creators/[username]/page.tsx` |
| 25 | `/docs` | `/docs` | No | `(marketing)` | `(marketing)/docs/page.tsx` |
| 26 | `/pricing` | `/pricing` | No | `(marketing)` | `(marketing)/pricing/page.tsx` |
| 27 | `/blog` | `/blog` | No | `(marketing)` | `(marketing)/blog/page.tsx` |
| 28 | `/blog/[slug]` | `/blog/[slug]` | No | `(marketing)` | `(marketing)/blog/[slug]/page.tsx` |
| 29 | `/changelog` | `/changelog` | No | `(marketing)` | `(marketing)/changelog/page.tsx` |
| 30 | `/terms` | `/terms` | No | `(marketing)` | `(marketing)/terms/page.tsx` |
| 31 | `/privacy` | `/privacy` | No | `(marketing)` | `(marketing)/privacy/page.tsx` |

**Existing explorer routes preserved** (not counted in 31):
- `/[slug]` — Graph-contextualized construct detail (EXISTS, unchanged)
- `/about` — About page (EXISTS, unchanged)
- `/install` — Install guide (EXISTS, unchanged)

**Reserved slugs**: The `/[slug]` dynamic route must not collide with static routes. The following slugs are reserved and must be rejected at construct creation time (API validation + form validation in FR-3.2): `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `auth`, `dashboard`, `profile`, `api-keys`, `billing`, `skills`, `analytics`, `creator`, `teams`, `constructs`, `packs`, `creators`, `docs`, `pricing`, `blog`, `changelog`, `terms`, `privacy`, `about`, `install`, `sitemap.xml`, `robots.txt`.

> All 31 web URLs are preserved 1:1. No URL changes means no redirects needed for web-originated paths. Cross-domain redirects from `constructs.loa.dev` are handled separately (see FR-9).

## 7. Technical Architecture

### Technology Stack (Explorer — Target)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| React | React 19 |
| Styling | Tailwind CSS + Framer Motion |
| State | Zustand (graph + auth stores) |
| Server State | @tanstack/react-query (authenticated API calls) |
| Forms | react-hook-form + Zod |
| 3D | React Three Fiber + drei |
| Search | Fuse.js |
| Auth | JWT in cookies (js-cookie) + Bearer header + Next.js middleware (see FR-1 Token Strategy) |
| Fonts | Geist (sans + mono) |
| API | `api.constructs.network` (Hono, already deployed) |

### Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth state | Zustand store | Explorer already uses Zustand for graph state; avoids React Context re-render cascade near 3D graph |
| Route protection | Next.js middleware | UX optimization: server-side redirect prevents flash-of-unauthenticated-content; replaces web's client-only `ProtectedRoute`. Not a security boundary — API-side token validation is the security gate |
| Component strategy | Re-implement in Tailwind | Don't port CSS variable system; extend existing explorer components |
| Server state | React Query | Dashboard needs authenticated API calls with caching, refetching; replaces raw `fetch` in `useEffect` |
| Data fetching | ISR (public) + React Query (authed) | Keep explorer's existing ISR pattern; add React Query for dashboard |

### Route Structure

Three route groups using Next.js App Router conventions:

- `(auth)/` — Login, register, password flows. Centered layout, no header/footer
- `(dashboard)/` — Protected routes. Sidebar layout, keyboard nav, status bar
- `(marketing)/` — Public content. Standard header/footer layout

Root routes (`/`, `/[slug]`, `/about`, `/install`) remain unchanged.

> Source: marketplace-consolidation.md:28-73

### New Dependencies

| Package | Purpose |
|---------|---------|
| `react-hook-form` | Form state management |
| `@hookform/resolvers` | Zod resolver for react-hook-form |
| `zod` | Schema validation |
| `js-cookie` | JWT cookie management |
| `@types/js-cookie` | TypeScript types (dev) |
| `@tanstack/react-query` | Server state for dashboard API calls |

**Not porting**: `@fontsource/ibm-plex-mono`, `@radix-ui/*`, `tailwindcss-animate`

## 7. Scope & Prioritization

### In Scope (MVP = All)

All 31 web routes ported to explorer across 7 sprints:

1. **Foundation** — Auth infrastructure, base components, providers (14 tasks)
2. **Auth Pages** — Login, register, password flows (6 tasks)
3. **Dashboard Core** — Dashboard home, profile, API keys, billing (6 tasks)
4. **Dashboard Advanced** — Creator tools, teams, analytics (7 tasks)
5. **Marketing Pages** — All public content pages (10 tasks)
6. **SEO + Polish + Hardening** — Metadata, sitemap, performance, responsive, HttpOnly refresh token migration (9 tasks)
7. **Cleanup** — Delete apps/web, update monorepo config, DNS (6 tasks)

### Out of Scope

- New features beyond current web functionality
- UI redesign (port existing, don't reinvent)
- Mobile native app
- Internationalization / localization
- Payment integration (NowPayments deferred to separate cycle)
- On-chain reputation (deferred per cycle-014 plan)

## 8. Risks & Dependencies

| Risk | Severity | Mitigation |
|------|----------|------------|
| 3D graph performance degraded by larger bundle | High | Route groups create separate bundles; dashboard code won't load on `/`; verify with `next-bundle-analyzer` |
| React 19 / Next.js 15 compatibility with new deps | Medium | Sprint 1 includes explicit compatibility spike: verify react-hook-form, @tanstack/react-query, zod, js-cookie all work with Next 15 App Router + React 19. Define client/server component boundaries. Test R3F coexistence with new providers |
| Auth flash on dashboard routes | Medium | Next.js middleware handles server-side redirect before page renders |
| Two construct detail routes (`/[slug]` vs `/constructs/[slug]`) | Low | Different purposes: graph-contextualized vs full marketing. Cross-link between them |
| SEO regression from URL changes | Medium | 301 redirects in `next.config.ts`; verify with Google Search Console |
| Vercel deployment config changes | Low | Explorer already deployed to Vercel; update DNS after migration |

### Dependencies

- **API** (`api.constructs.network`) — All auth, pack, construct, creator, team endpoints already exist and are deployed
- **Vercel** — Explorer already deployed; need DNS update for `constructs.network`
- **Supabase** — Database schema already supports all features (auth, packs, teams, API keys, etc.)

## 9. Reliability & Performance Requirements

### Error Boundaries

Each route group must have its own React error boundary with appropriate fallback UX:

| Route Group | Error Boundary Behavior |
|-------------|------------------------|
| Root (`/`) | WebGL context loss → show static fallback image + "Reload" button. Network errors → retry with backoff |
| `(auth)` | API errors → inline form error messages. Network failure → "Connection lost" banner |
| `(dashboard)` | Query errors → per-widget error state with retry. Auth failure → redirect to login |
| `(marketing)` | ISR stale data → serve stale content with background refresh. Network → static fallback |

### Bundle Size Budget

| Route | Max Shared JS (gzipped) | Enforcement |
|-------|------------------------|-------------|
| Root `/` (3D graph) | Baseline + 20KB max growth | CI check via `next-bundle-analyzer` |
| `(dashboard)` routes | No hard limit (auth users accept loading) | Monitor only |
| `(marketing)` routes | 100KB total JS | Lighthouse CI score >= 80 |

Providers (React Query, auth store) must be lazy-loaded so they are NOT included in the root layout bundle — only initialized on dashboard routes via a `(dashboard)/layout.tsx` client boundary.

### Automated Testing

| Test Type | Scope | Gate |
|-----------|-------|------|
| E2E (Playwright) | Auth flow: register → verify → login → dashboard → logout | Per-sprint |
| E2E (Playwright) | OAuth flow: login → callback → dashboard | Per-sprint |
| E2E (Playwright) | Creator flow: login → create pack → edit → view public | Sprint 4+ |
| Integration | Token refresh on 401 (mock API) | Sprint 1 |
| Visual regression | 3D graph homepage before/after | Per-sprint |
| Bundle size | Root shared chunk delta check | CI on every PR |

## 10. Verification

### Per-Sprint

1. `pnpm --filter explorer dev` — app starts without errors
2. `pnpm --filter explorer build` — production build succeeds
3. Manual smoke test of new routes
4. Verify 3D graph still loads and performs on `/`

### Final Acceptance

1. All 31 web routes have working explorer equivalents
2. Auth flow: register -> verify email -> login -> dashboard -> profile -> logout
3. Creator flow: login -> creator dashboard -> create pack -> edit -> view public profile
4. Marketing: home (3D graph) -> constructs catalog -> detail -> install
5. `apps/web/` directory deleted, monorepo builds cleanly
6. `constructs.network` DNS points to explorer Vercel deployment
7. 3D graph maintains 60fps desktop / 30fps mobile
8. Lighthouse performance >= 80 on marketing pages
