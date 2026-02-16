# SDD: Marketplace Consolidation — Web to Explorer

**Cycle**: cycle-015
**Created**: 2026-02-16
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`

---

## 1. Executive Summary

Consolidate `apps/web` (Next.js 14, 31 routes, full marketplace) into `apps/explorer` (Next.js 15, 4 routes, 3D visualization) to create a single unified app at `constructs.network`. The explorer's 3D graph becomes the front door; auth, dashboard, creator tools, and marketing pages are added behind it.

**Key constraint**: The 3D graph homepage must not regress in performance. All new code (auth, dashboard, marketing) must be isolated from the root bundle through route-group boundaries and lazy-loaded providers.

### Architecture Strategy

| Concern | Approach |
|---------|----------|
| Auth state | New Zustand store (`auth-store.ts`) following `graph-store.ts` pattern |
| Route protection | Next.js middleware (UX gate, cookie presence check) |
| Server state | React Query for authenticated dashboard API calls |
| Public data | ISR with time-based revalidation (existing pattern) |
| Components | Re-implement TUI aesthetic in Tailwind; extend existing `ui/` primitives |
| Bundle isolation | Providers wrapped at route-group level, not root layout |

---

## 2. System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/explorer (Next.js 15)                │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Root Layout │  │  middleware   │  │  next.config.ts   │  │
│  │  (minimal)   │  │  (auth gate) │  │  (redirects,ISR)  │  │
│  └──────┬───────┘  └──────────────┘  └───────────────────┘  │
│         │                                                    │
│  ┌──────┴───────────────────────────────────────────────┐   │
│  │                    Route Groups                       │   │
│  │                                                       │   │
│  │  ┌─────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ (auth)  │  │ (dashboard)  │  │  (marketing)   │  │   │
│  │  │         │  │              │  │                │  │   │
│  │  │ Login   │  │ Layout:      │  │ Server         │  │   │
│  │  │ Register│  │  Sidebar     │  │ Components     │  │   │
│  │  │ OAuth CB│  │  Status Bar  │  │ ISR cached     │  │   │
│  │  │ Reset PW│  │  React Query │  │ No auth        │  │   │
│  │  │ Verify  │  │  Auth Store  │  │                │  │   │
│  │  └─────────┘  └──────────────┘  └────────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────────┐│   │
│  │  │ Root Pages (unchanged): /, /[slug], /about, /install ││   │
│  │  └──────────────────────────────────────────────────┘│   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Shared Layer                        │  │
│  │  lib/stores/  lib/api/  lib/hooks/  components/ui/    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  api.constructs.network   │
              │  (Hono on Railway)        │
              │                           │
              │  /v1/auth/*               │
              │  /v1/constructs/*         │
              │  /v1/packs/*              │
              │  /v1/creators/*           │
              │  /v1/teams/*              │
              │  /v1/api-keys/*           │
              │  /v1/auth/oauth/*         │
              └───────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────┐
              │  Supabase PostgreSQL      │
              │  (Database + Auth tables) │
              └───────────────────────────┘
```

### Request Flow

**Unauthenticated (marketing/root)**:
```
Browser → Vercel Edge → middleware (pass-through) → ISR cache → Server Component → API (if miss)
```

**Authenticated (dashboard)**:
```
Browser → Vercel Edge → middleware (check cookie) → Client Component → React Query → API (Bearer token)
```

**OAuth**:
```
Browser → API /v1/auth/oauth/{provider} → Provider → API callback → redirect to /auth/callback?tokens → Client stores cookies → /dashboard
```

---

## 3. Technology Stack

### Runtime Dependencies

| Package | Version | Purpose | Bundle Location |
|---------|---------|---------|-----------------|
| `next` | 15.1.0 | Framework | Everywhere |
| `react` | 19.0.0 | UI | Everywhere |
| `zustand` | 5.0.0 | State (graph + auth) | Client components |
| `@react-three/fiber` | existing | 3D rendering | Root page only |
| `@react-three/drei` | existing | 3D helpers | Root page only |
| `three` | existing | WebGL | Root page only |
| `fuse.js` | 7.0.0 | Fuzzy search | Root page only |
| `framer-motion` | 12.x | Animation | Shared |
| `@tanstack/react-query` | ^5 | Server state | Dashboard only |
| `react-hook-form` | ^7.54 | Forms | Auth + Dashboard only |
| `@hookform/resolvers` | ^3 | Zod integration | Auth + Dashboard only |
| `zod` | ^3 | Validation | Auth + Dashboard only |
| `js-cookie` | ^3 | Token storage | Auth + Dashboard only |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@types/js-cookie` | TypeScript types |
| `@next/bundle-analyzer` | Bundle size monitoring |
| `playwright` | E2E testing |

### Key Constraint: Bundle Isolation

React Query, react-hook-form, zod, and js-cookie must NOT appear in the root layout bundle. They are imported only within `(auth)/` and `(dashboard)/` route group layouts via direct client component imports.

---

## 4. Component Design

### 4.1 Root Layout (`app/layout.tsx`)

**Change**: Minimal. Move Header/Footer out to route-group layouts.

```typescript
// app/layout.tsx — KEEP MINIMAL
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background`}>
        {children}
      </body>
    </html>
  );
}
```

**What moves OUT**: Header and Footer move to route-group layouts so they can vary per context (no header in auth, different header in dashboard vs marketing).

**What stays**: Fonts, dark mode class, minimal body styling. No providers in root.

### 4.2 Middleware (`middleware.ts`)

**Purpose**: UX gate for dashboard routes. Redirects to `/login` if no access token cookie present.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token');

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/api-keys/:path*',
    '/billing/:path*',
    '/skills/:path*',
    '/analytics/:path*',
    '/creator/:path*',
    '/teams/:path*',
  ],
};
```

**Design decisions**:
- Matcher uses explicit paths (App Router strips route group parentheses from URLs)
- Stores redirect path as query param for post-login redirect
- Does NOT validate token (UX gate, not security boundary per PRD)
- Does NOT import js-cookie (runs in Edge Runtime, uses `request.cookies`)

**Routes NOT matched (explicitly unprotected)**:
- `/` — 3D graph home
- `/[slug]` — Construct graph view
- `/about`, `/install` — Static pages
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` — Auth pages (under `(auth)/`)
- `/auth/callback` — OAuth token handoff
- All `(marketing)/` routes: `/constructs/*`, `/packs/*`, `/creators/*`, `/docs`, `/pricing`, `/blog/*`, `/changelog`, `/terms`, `/privacy`

**Single source of truth**: The matcher array in `middleware.ts` is the definitive list of protected prefixes. It must stay in sync with the route parity matrix (Section 8.1). Playwright tests must assert: (1) each protected route redirects to `/login` when no cookie, (2) each auth/marketing/root route is accessible without cookies.

### 4.3 Auth Store (`lib/stores/auth-store.ts`)

Zustand store following the existing `graph-store.ts` pattern.

```typescript
interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;

  // Token helpers
  getAccessToken: () => string | undefined;
  setTokens: (access: string, refresh: string, rememberMe?: boolean) => void;
  clearTokens: () => void;
}
```

**Key behaviors**:
- `initialize()`: Called once on dashboard layout mount. Checks for existing tokens, fetches `/v1/auth/me`, sets user state. **Timeout**: 10s max wait; on timeout, clear tokens and redirect to `/login`. Shows loading skeleton during init; on failure shows "Session expired" message with login link (no infinite loading)
- `login()`: Calls API, stores tokens via js-cookie, fetches user
- `refreshToken()`: Reads refresh cookie, calls `/v1/auth/refresh`, stores new tokens. **Failure modes**: (1) 401 from refresh endpoint → refresh token expired/revoked → clear all tokens, redirect to `/login`; (2) Network error → retry once after 2s backoff → if still fails, keep existing tokens (may still be valid), log warning; (3) Non-401 HTTP error → treat as transient, retry once → if fails, clear tokens and redirect. No more than 1 retry per refresh attempt
- `logout()`: Calls API (blacklists refresh token), clears cookies, clears React Query cache (`queryClient.clear()`), resets Zustand state. **Critical**: React Query cache must be fully cleared on logout to prevent cross-session data leakage on shared devices
- Token refresh interval: started by dashboard layout, paused on tab hidden (Page Visibility API)

**Token storage** (via js-cookie):
- `access_token`: `{ secure: true (prod), sameSite: 'lax', path: '/' }`
- `refresh_token`: `{ secure: true (prod), sameSite: 'lax', path: '/' }`
- Remember-me: `{ expires: 30 }` (30 days)
- Both cookies are intentionally NOT HttpOnly — they must be JS-readable for Bearer header construction and client-side refresh
- **Residual XSS risk**: A successful XSS attack can read both tokens. Mitigations: CSP (no unsafe-eval), short-lived access tokens (15 min), input sanitization, dependency scanning. Sprint 6 migrates refresh token to HttpOnly to limit blast radius to access token TTL

### 4.4 API Client (`lib/api/client.ts`)

Authenticated fetch wrapper with 401 retry.

```typescript
interface ApiClientOptions {
  baseUrl?: string;
  getToken?: () => string | undefined;
  onRefresh?: () => Promise<void>;
  onAuthFailure?: () => void;
}

class ApiClient {
  async fetch<T>(path: string, options?: RequestInit): Promise<T>;
  async get<T>(path: string): Promise<T>;
  async post<T>(path: string, body: unknown): Promise<T>;
  async put<T>(path: string, body: unknown): Promise<T>;
  async delete<T>(path: string): Promise<T>;
}
```

**401 retry flow with single-flight refresh**:

Multiple React Query hooks fire on dashboard mount, so parallel 401s are expected. The API client uses a single-flight refresh lock to prevent token thrash:

```typescript
// Module-level singleton — shared across all requests
let refreshPromise: Promise<void> | null = null;

async function handleUnauthorized(originalRequest): Promise<Response> {
  // Single-flight: if a refresh is already in progress, wait for it
  if (!refreshPromise) {
    refreshPromise = onRefresh().finally(() => { refreshPromise = null; });
  }
  await refreshPromise;

  // Retry with new token (single retry, no recursion)
  const retryResponse = await fetch(originalRequest, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!retryResponse.ok) {
    onAuthFailure(); // redirect to login
  }
  return retryResponse;
}
```

Key behaviors:
1. First 401 triggers `refreshToken()` and stores the promise
2. Concurrent 401s await the same promise (no duplicate refresh calls)
3. All waiters retry with the new token after refresh completes
4. If refresh itself fails, `refreshPromise` is cleared and `onAuthFailure()` fires once
5. `refreshToken()` does NOT clear tokens on transient network errors — only on 401 from refresh endpoint

**Two client instances**:
- `publicClient`: No auth headers, used by ISR server components
- `authClient`: Bearer token from auth store, used by React Query hooks

### 4.5 React Query Integration (`lib/api/hooks.ts`)

```typescript
// Example hooks
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => authClient.get<User>('/v1/auth/me'),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => authClient.get<ApiKey[]>('/v1/api-keys'),
  });
}

export function useCreateApiKey() {
  return useMutation({
    mutationFn: (data: CreateApiKeyInput) => authClient.post('/v1/api-keys', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });
}
```

**Query client configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
```

### 4.6 Dashboard Layout (`app/(dashboard)/layout.tsx`)

**This is where providers live** — not in root layout.

```typescript
// app/(dashboard)/layout.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { queryClient } from '@/lib/api/query-client';

export default function DashboardLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <DashboardShell>{children}</DashboardShell>
      </AuthInitializer>
    </QueryClientProvider>
  );
}
```

**AuthInitializer**: Client component that calls `useAuthStore().initialize()` on mount and starts the token refresh interval. Shows loading skeleton until `isInitialized` is true.

**DashboardShell**: Sidebar + content area + status bar. Implements keyboard navigation (1-6 shortcuts).

### 4.7 Auth Layout (`app/(auth)/layout.tsx`)

```typescript
// app/(auth)/layout.tsx
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-tui-bg">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/">Constructs Network</Link>
        </div>
        {children}
      </div>
    </div>
  );
}
```

No header, no footer, no sidebar. Centered card layout.

### 4.8 Marketing Layout (`app/(marketing)/layout.tsx`)

```typescript
// app/(marketing)/layout.tsx
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

export default function MarketingLayout({ children }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
```

**Header auth state without bundle pollution**: The Header must show auth state (login/signup or user avatar) WITHOUT importing the Zustand auth store or js-cookie into the marketing bundle. Strategy:

- `Header` is a Server Component that reads the `access_token` cookie via `cookies()` (Next.js server API) to determine logged-in vs logged-out state
- Logged-out: renders static login/signup links (zero client JS)
- Logged-in: renders a `<HeaderUserMenu />` Client Component loaded via `next/dynamic` with `{ ssr: false }` to avoid shipping auth logic in the marketing SSR bundle
- `HeaderUserMenu` is a thin client component that reads user info from a lightweight cookie or calls `/v1/auth/me` — it does NOT import auth-store.ts or js-cookie
- This ensures js-cookie, auth-store, and React Query remain exclusive to `(dashboard)/` and `(auth)/` bundles

```typescript
// components/layout/header.tsx (Server Component)
import { cookies } from 'next/headers';
import dynamic from 'next/dynamic';

const HeaderUserMenu = dynamic(() => import('./header-user-menu'), { ssr: false });

export async function Header() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has('access_token');

  return (
    <header>
      <nav>{/* ... */}</nav>
      {isLoggedIn ? <HeaderUserMenu /> : <AuthLinks />}
    </header>
  );
}
```

---

## 5. UI Component Mapping

### 5.1 Component Strategy

Port TUI components to Tailwind, extending existing explorer primitives.

| Web Component | Explorer Equivalent | Strategy |
|--------------|-------------------|----------|
| `TuiBox` | `Panel` (NEW) | Tailwind bordered container with title |
| `TuiButton` | `Button` (EXTEND) | Add `variant: 'tui'` to existing button |
| `TuiInput` | `FormInput` (NEW) | forwardRef, react-hook-form compatible |
| `TuiTextarea` | `FormTextarea` (NEW) | forwardRef |
| `TuiSelect` | `FormSelect` (NEW) | forwardRef |
| `TuiCheckbox` | `FormCheckbox` (NEW) | forwardRef |
| `TuiLayout` | `DashboardShell` (NEW) | Three-panel layout in Tailwind |
| `TuiSidebar` | `Sidebar` (NEW) | Nav items with shortcuts |
| `TuiNavItem` | `NavItem` (NEW) | Active state, shortcut hint |
| `TuiStatusBar` | `StatusBar` (NEW) | Bottom bar with key hints |
| `TuiList` | `DataList` (NEW) | Keyboard-navigable list |
| `TuiBadge` | `Badge` (EXTEND) | Add TUI color variants |

### 5.2 Panel Component

```typescript
interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'danger';
  scrollable?: boolean;
}
// Renders bordered container with floating title
// border-tui-border, bg-tui-bg
```

### 5.3 Form Components

All form components use `React.forwardRef` for react-hook-form compatibility:

```typescript
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
// Styling: bg-tui-bg border-tui-border text-tui-fg
// Focus: border-tui-accent
// Error: border-tui-red + error text
```

### 5.4 Dashboard Shell

```
┌──────────┬────────────────────────────┐
│          │                            │
│ Sidebar  │  Content                   │
│ (220px)  │  (flex-1)                  │
│          │                            │
│          │                            │
├──────────┴────────────────────────────┤
│ Status Bar                            │
└───────────────────────────────────────┘
```

Mobile: sidebar is a slide-out overlay triggered by hamburger button.

### 5.5 Tailwind Color Tokens

```typescript
// tailwind.config.ts additions
colors: {
  tui: {
    bg: '#0a0a0a',
    fg: '#c0c0c0',
    bright: '#ffffff',
    dim: '#606060',
    accent: '#5fafff',
    green: '#5fff87',
    yellow: '#ffff5f',
    red: '#ff5f5f',
    cyan: '#5fffff',
    border: '#5f5f5f',
  }
}
```

### 5.6 Keyboard Navigation Hook

```typescript
// lib/hooks/use-keyboard-nav.ts
interface UseKeyboardNavOptions {
  itemCount: number;
  initialIndex?: number;
  onSelect?: (index: number) => void;
  enabled?: boolean;
  shortcuts?: Record<string, string>; // '1' => '/dashboard'
  loop?: boolean;
}
// Returns: { currentIndex, setCurrentIndex }
// Handles: j/k, arrows, g/G, Enter, 1-9 shortcuts
```

---

## 6. Data Architecture

### 6.1 Data Fetching by Route Group

| Route Group | Method | Cache | Auth |
|-------------|--------|-------|------|
| Root (`/`) | Server fetch | ISR 3600s | No |
| `(marketing)` | Server fetch | ISR (per-route) | No |
| `(auth)` | Client fetch (form submissions) | None | No |
| `(dashboard)` | React Query | stale-while-revalidate 5min | Yes |

### 6.2 Public Data Functions

Extend existing `lib/data/fetch-constructs.ts`:

```typescript
// Existing (unchanged)
fetchAllConstructs(): Promise<ConstructNode[]>
fetchConstruct(slug: string): Promise<ConstructDetail>
fetchGraphData(): Promise<{ graphData; categories }>

// New for marketing pages
fetchConstructCatalog(options: CatalogOptions): Promise<PaginatedResponse<Construct>>
fetchPacks(options: PackOptions): Promise<PaginatedResponse<Pack>>
fetchPack(slug: string): Promise<PackDetail>
fetchCreatorProfile(username: string): Promise<CreatorProfile>
fetchBlogPosts(options: PaginationOptions): Promise<PaginatedResponse<BlogPost>>
fetchBlogPost(slug: string): Promise<BlogPost>
fetchChangelog(): Promise<ChangelogEntry[]>
```

### 6.3 Authenticated API Functions

```typescript
// lib/api/auth.ts
login(email, password): Promise<AuthResponse>
register(email, password, name?): Promise<AuthResponse>
refresh(refreshToken): Promise<AuthResponse>
logout(refreshToken): Promise<void>
fetchMe(): Promise<User>
forgotPassword(email): Promise<void>
resetPassword(token, password): Promise<void>
verifyEmail(token): Promise<void>

// lib/api/dashboard.ts
fetchProfile(): Promise<User>
updateProfile(data): Promise<User>
fetchApiKeys(): Promise<ApiKey[]>
createApiKey(data): Promise<ApiKey>
revokeApiKey(id): Promise<void>

// lib/api/creator.ts
fetchCreatorDashboard(): Promise<CreatorDashboard>
createConstruct(data): Promise<Construct>
updateConstruct(id, data): Promise<Construct>

// lib/api/teams.ts
fetchTeams(): Promise<Team[]>
fetchTeam(slug): Promise<TeamDetail>
updateTeam(slug, data): Promise<Team>
```

### 6.4 Type Definitions

```typescript
// lib/types/auth.ts
interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'creator' | 'admin';
  emailVerified: boolean;
  avatarUrl: string | null;
  oauthProvider: 'github' | 'google' | null;
  createdAt: string;
}

interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

// lib/types/api.ts
interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
  request_id: string;
}
```

---

## 7. Security Architecture

### 7.1 Token Security Model

| Token | Storage | Flags | TTL | Accessible By |
|-------|---------|-------|-----|---------------|
| Access | Cookie (`access_token`) | `Secure`, `SameSite=Lax` | 15 min | JavaScript, middleware |
| Refresh | Cookie (`refresh_token`) | `Secure`, `SameSite=Lax` | 30 days | JavaScript |

**Sprint 6 hardening**: Migrate refresh token to HttpOnly cookie with server-side `/api/auth/refresh` route handler proxy.

### 7.2 CORS

API already configured: allows `constructs.network` with `credentials: true`. Post-migration: remove `constructs.loa.dev` from allowed origins.

### 7.3 OAuth Callback Security

The API redirects to `/auth/callback?access_token=...&refresh_token=...&expires_in=...` with tokens in URL query params. This is the existing API-side implementation (see `oauth.ts:292-298`). **Tokens-in-URL is an accepted risk** per PRD Flatline review (user decision: "Accept as-is"). A future cycle may migrate to an authorization-code exchange pattern.

Mitigations for tokens-in-URL:
- **CSRF**: State parameter + httpOnly cookie (API-side, verified before token issuance)
- **Referrer leakage**: `<meta name="referrer" content="no-referrer">` on callback page
- **Indexing**: `robots: { index: false }` in page metadata
- **URL cleanup**: `router.replace('/dashboard')` on first render, before any analytics or third-party scripts
- **Analytics**: Disabled on `/auth/callback` route
- **Server-side protection**: Callback route uses `export const dynamic = 'force-dynamic'` to prevent ISR caching of token-bearing URLs
- **Browser history**: `router.replace` (not `router.push`) prevents tokens from appearing in history stack
- **Error path**: API redirects to `/login?error={code}` on failure — no tokens in error redirects

### 7.4 Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://api.constructs.network;
frame-ancestors 'none';
```

**Note on `unsafe-eval`**: Removed. WebGL shader compilation (GLSL → GPU) does not use JavaScript `eval()` and does not require `unsafe-eval`. Three.js/R3F work under strict CSP without it. If a specific dependency requires `unsafe-eval` at build time, isolate it to only the graph route via route-specific headers and document the exact dependency.

`unsafe-inline` is needed for Tailwind's runtime style injection. Consider migrating to nonce-based CSP in a future cycle for additional XSS protection, especially given JS-readable token storage.

---

## 8. Route Architecture

### 8.1 Complete File Structure

```
apps/explorer/app/
├── layout.tsx                          # Minimal: fonts, dark mode
├── middleware.ts                       # NEW: dashboard route protection
├── page.tsx                            # 3D graph (UNCHANGED)
├── [slug]/page.tsx                     # Construct graph view (UNCHANGED)
├── about/page.tsx                      # About (UNCHANGED)
├── install/page.tsx                    # Install guide (UNCHANGED)
├── error.tsx                           # Root error boundary (UNCHANGED)
├── loading.tsx                         # Root loading (UNCHANGED)
├── not-found.tsx                       # 404 (UNCHANGED)
├── sitemap.ts                          # NEW
├── robots.ts                           # NEW
│
├── (auth)/
│   ├── layout.tsx                      # Centered, no header/footer
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   └── callback/page.tsx              # OAuth token handoff
│
├── (dashboard)/
│   ├── layout.tsx                      # Providers + Shell
│   ├── error.tsx                       # Dashboard error boundary
│   ├── dashboard/page.tsx
│   ├── profile/page.tsx
│   ├── api-keys/page.tsx
│   ├── billing/page.tsx
│   ├── skills/page.tsx
│   ├── skills/[slug]/page.tsx
│   ├── creator/page.tsx
│   ├── creator/new/page.tsx
│   ├── creator/skills/[id]/page.tsx
│   ├── teams/page.tsx
│   ├── teams/[slug]/page.tsx
│   ├── teams/[slug]/billing/page.tsx
│   └── analytics/page.tsx
│
└── (marketing)/
    ├── layout.tsx                      # Header + Footer
    ├── error.tsx                       # Marketing error boundary
    ├── constructs/page.tsx
    ├── constructs/[slug]/page.tsx
    ├── packs/page.tsx
    ├── packs/[slug]/page.tsx
    ├── creators/[username]/page.tsx
    ├── docs/page.tsx
    ├── pricing/page.tsx
    ├── blog/page.tsx
    ├── blog/[slug]/page.tsx
    ├── changelog/page.tsx
    ├── terms/page.tsx
    └── privacy/page.tsx
```

### 8.2 Reserved Slug Protection

The `/[slug]` dynamic route must not collide with static routes. Protection is dual-layered:
- **API-side (authoritative)**: `POST /v1/constructs` rejects reserved slugs with 400 error
- **Client-side (advisory)**: Creator form mirrors the reserved list for instant UX feedback

Next.js route resolution order: (1) exact static routes → (2) route group pages → (3) `[slug]` catch-all. The reserved slug list matches all static route prefixes defined in Section 8.1.

### 8.3 Error Boundaries

| Route Group | Behavior |
|-------------|----------|
| Root | WebGL fallback + reload button |
| `(auth)` | Error message + return to login |
| `(dashboard)` | Error panel + retry + return to dashboard |
| `(marketing)` | Friendly error + return home |

---

## 9. Component File Structure

```
components/
├── ui/                          # Base primitives
│   ├── badge.tsx                # EXTEND
│   ├── button.tsx               # EXTEND
│   ├── card.tsx                 # EXTEND
│   ├── input.tsx                # EXTEND
│   ├── panel.tsx                # NEW
│   ├── form-input.tsx           # NEW
│   ├── form-textarea.tsx        # NEW
│   ├── form-select.tsx          # NEW
│   ├── form-checkbox.tsx        # NEW
│   └── data-list.tsx            # NEW
│
├── layout/
│   ├── header.tsx               # MODIFY (add auth state)
│   ├── footer.tsx               # UNCHANGED
│   ├── back-button.tsx          # UNCHANGED
│   ├── dashboard-shell.tsx      # NEW
│   ├── sidebar.tsx              # NEW
│   ├── nav-item.tsx             # NEW
│   └── status-bar.tsx           # NEW
│
├── auth/
│   ├── auth-initializer.tsx     # NEW
│   ├── login-form.tsx           # NEW
│   ├── register-form.tsx        # NEW
│   └── oauth-buttons.tsx        # NEW
│
├── graph/                       # UNCHANGED (16 files)
├── construct/                   # UNCHANGED
└── search/                      # UNCHANGED
```

---

## 10. Performance Architecture

### 10.1 Bundle Size Budget

| Target | Budget (gzipped) | Enforcement |
|--------|-------------------|-------------|
| Root shared chunk | Baseline + 20KB max | CI script parses analyzer output, fails on threshold |
| Root page JS | No growth | CI diff check against baseline |
| Marketing pages | < 100KB total JS | Lighthouse CI >= 80 |
| Dashboard pages | No hard limit | Monitor trend |

**Automated enforcement** (machine-enforced, not human-enforced):

1. **Import boundary linting**: ESLint `no-restricted-imports` rules per directory prevent dashboard/auth-only packages (`@tanstack/react-query`, `react-hook-form`, `zod`, `js-cookie`) from being imported in root, marketing, or shared components
2. **CI bundle check**: Script parses `@next/bundle-analyzer` output, extracts root shared chunk size, fails PR if baseline + 20KB exceeded
3. **No barrel exports across route groups**: Barrel files (`index.ts`) that re-export across `(auth)/`, `(dashboard)/`, `(marketing)/` boundaries are prohibited to prevent transitive import pollution

### 10.2 Code Splitting Strategy

```
Root Layout (minimal: fonts, body)
├── / (graph) → R3F components (dynamic import, no SSR)
├── /[slug] → construct components
├── /about, /install → static content
│
├── (auth)/ layout → auth forms (client)
│   └── react-hook-form + zod loaded here
│
├── (dashboard)/ layout → React Query + Auth Store
│   └── Dashboard components loaded here
│
└── (marketing)/ layout → Header + Footer
    └── Server Components (minimal JS)
```

**Critical**: `(dashboard)/layout.tsx` is the provider boundary. React Query and form libraries only load when navigating to dashboard routes.

---

## 11. Integration Points

### 11.1 API Changes Required

| Change | Endpoint | Sprint |
|--------|----------|--------|
| Reserved slug validation | `POST /v1/constructs` | Sprint 4 (or defer) |
| CORS origin update | Middleware config | Sprint 7 |

### 11.2 DNS Changes (Sprint 7)

| Domain | Current | After |
|--------|---------|-------|
| `constructs.network` | → apps/web | → apps/explorer |
| `constructs.loa.dev` | → apps/explorer | 301 → `constructs.network` |

### 11.3 Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://api.constructs.network
NEXT_PUBLIC_SITE_URL=https://constructs.network
CONSTRUCTS_API_URL=https://api.constructs.network/v1  # existing
```

---

## 12. Development Workflow

### 12.1 Branch Strategy

Single long-lived feature branch with per-sprint commits, consolidated PR at end.

### 12.2 Testing

| Type | Tool | When |
|------|------|------|
| Type checking | `tsc --noEmit` | Every PR |
| E2E | Playwright | Sprint 2+ |
| Bundle analysis | `@next/bundle-analyzer` | Every PR |
| Visual regression | Playwright screenshots | Per sprint |

---

## 13. Technical Risks & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| Root bundle grows from providers | High | Providers in `(dashboard)/layout.tsx` only; CI bundle check |
| R3F conflicts with new deps | Medium | Sprint 1 compatibility spike |
| Hydration mismatches | Medium | Clear `'use client'` boundaries |
| Middleware redirect loops | Medium | Explicit matcher paths; no auth check on `/login` |
| OAuth callback race condition | Medium | Immediate token extraction before any client init |
| ISR stale content | Low | Defined revalidation intervals per route |

---

## 14. Future Considerations

### In-Cycle (Sprint 6 Hardening)

- HttpOnly refresh token migration
- Next.js `/api/auth/refresh` route handler proxy
- CSP header tightening

### Post-Cycle

- NowPayments integration
- OAuth code exchange pattern (replace tokens-in-URL)
- Server Actions for form submissions
- WebSocket real-time dashboard updates
