# GECKO FIELD REPORT — Constructs Network Explorer

> reviewer: gecko (bazaar intelligence)
> date: 2026-03-10
> scope: full bazaar inspection — apps/explorer + apps/api data pipeline
> method: three-agent parallel audit (performance, security, UX/drift)
> findings: 52 grounded, file:line referenced

---

## the short version

i walked every stall. the bazaar has a sign that says "neural graph explorer" but when you walk through the door, it's a leaderboard. the graph — the P0 feature, the thing that makes this a souk and not a spreadsheet — exists as a component but is not mounted on any page. it's furniture in a warehouse, not a stall in the market.

the app grew from 4 routes to 34. auth, billing, teams, creator dashboards, blog, changelog — all things the PRD explicitly said "out of scope." the vision was a simplified discovery portal. what got built is a SaaS platform with a discovery widget that nobody can reach.

on mobile, the 3D graph has zero touch affordances. the middleware doesn't validate JWTs. the API has N+1 query patterns that will buckle under growth. and the construct data that reaches the frontend is lying — `verificationTier` is hardcoded to `UNVERIFIED` for every construct in list responses, regardless of actual verification status.

the bones are good. the OKLCH color system is well-designed. the force-directed layout algorithm works. the Stack Composer HUD is a clever piece of interaction design. the auth architecture's split (HttpOnly refresh, JS-readable access) is a defensible tradeoff. but the gap between what was designed and what was built is an **8/10 on the drift scale**.

---

## critical findings (3)

these are the ones that change what the bazaar IS, not just how it looks.

### DRIFT-001 — Graph Explorer has no entry point

**File**: `app/(site)/page.tsx`
**Severity**: CRITICAL

the homepage is a leaderboard (`AuthAwareConstructList`), not the graph explorer. `GraphExplorer` exists as a complete component tree (`components/graph/`) but is not imported or rendered on any page in the app router. the construct detail page at `(site)/[slug]` is a standard detail view, not a graph-embedded experience.

the PRD's P0 goal was: "Create a minimal, snappy discovery experience focused solely on constructs" with "Interactive visualization of all constructs as connected nodes." the neural graph was the core value proposition — the thing that differentiates this from a flat catalog. it's built. it's just not wired up.

**impact**: the primary differentiator of the constructs network — composability made visible — is invisible.

### MOBILE-001 — 3D graph has zero touch affordances

**File**: `components/graph/canvas.tsx:18-48`
**Severity**: CRITICAL

`OrbitControls` is configured with `mouseButtons` but no `touches` override. instruction text says "Scroll to zoom · Drag to pan" — mouse-only language. `HoverTooltip` tracks `mousemove` events with no tap fallback. no `useMediaQuery` hook exists — heavy 3D components are CSS-hidden on mobile but still mounted and running JS (including per-frame `useFrame` rotation loops for every node).

**impact**: mobile visitors (typically 50%+ of traffic) get a broken or absent graph experience.

### UX-001 — Node animations ignore `prefers-reduced-motion`

**File**: `components/graph/node.tsx:145-168`
**Severity**: CRITICAL (accessibility)

every graph node runs `useFrame(() => { rotation.y += delta * 0.3 })` — perpetual spinning. the CSS `@media (prefers-reduced-motion)` rule in `globals.css:102` has no effect on Three.js's JavaScript animation loop. the `prefersReducedMotion()` utility in `lib/animation.ts` is defined but never called by any component. users with vestibular disorders get constant spinning 3D objects. WCAG 2.3.3 violation.

**impact**: accessibility failure affecting users who explicitly requested reduced motion.

---

## high severity findings (12)

### AUTH-001 — access_token in JS-accessible cookie
**File**: `lib/stores/auth-store.ts:48-52`
access_token stored via `js-cookie` (no httpOnly). XSS = full token theft within TTL. the split design (httpOnly refresh, JS access) is deliberate but the risk is real. if access token TTL exceeds 15min, reduce it.

### AUTH-002 — Middleware validates cookie presence only
**File**: `middleware.ts:5-11`
checks `request.cookies.get('access_token')` exists — does NOT validate JWT signature, expiry, or claims. expired or tampered tokens pass the gate. middleware is a UX gate, not a security boundary. document this explicitly.

### AUTH-004 — connectDynamic bypasses the BFF
**File**: `lib/stores/auth-store.ts:151-156`
Dynamic Labs auth calls `api.constructs.network` directly from browser, receives `refresh_token` in JSON body (briefly in JS scope), then calls `/api/auth/set-refresh` to set HttpOnly cookie. the `.catch(() => {})` on set-refresh means silent failure = broken refresh on next page load. route through BFF like all other auth flows.

### DATA-001 — N+1 query pattern in list endpoints
**File**: `apps/api/src/services/constructs.ts:899-903, 1014-1019`
per-item sequential `getLatestPackVersion()` + `getOwnerInfo()` calls. 20 packs per page = 40 sequential DB round-trips after the main query. identity batch-fetch was correctly refactored — apply same pattern to versions and owners. reduces 2N+1 queries to 3.

### DATA-002 — verificationTier hardcoded 'UNVERIFIED' in list
**File**: `apps/api/src/services/constructs.ts:422`
`packToConstruct()` always sets `verificationTier: 'UNVERIFIED'` regardless of actual verification status. detail endpoint does the real lookup. every construct in the catalog appears unverified. this is the identity-reality drift i track — the stall sign says one thing, the goods say another.

### DATA-004 — Two competing search implementations
**File**: `components/search/global-search.tsx`, `components/search/command-palette.tsx`
both register `Cmd+K` listeners. `GlobalSearch` uses substring filter on API-fetched data (no auth header). `CommandPalette` uses Fuse.js fuzzy search on graph nodes. if both mount simultaneously, keypress fires both. currently dormant since `GraphExplorer` is unmounted. consolidate to one.

### PERF-001 — vercel.json uses pnpm, project mandates bun
**File**: `vercel.json:2-3`
build command `pnpm run build` / install `pnpm install` on Vercel. project uses `bun.lock` as canonical lockfile. dependency version drift between local and production builds.

### PERF-002 — Bundle baseline is stale, already over budget
**File**: `bundle-baseline.json`
baseline captured 2026-02-16 before dashboard/marketing routes. homepage already at 171KB (PRD budget: 150KB). shared chunks at 105KB (threshold: 125KB). Dynamic Labs SDK adds significant weight post-baseline. actual current bundle unknown.

### MOBILE-002 — Stack HUD has no mobile breakpoints
**File**: `components/graph/stack-composer-hud.tsx:289`
three-column grid `grid-cols-[1fr_2fr_1fr]` has no responsive breakpoint. on 375px viewport, columns are unreadable. install command code block overflows.

### MOBILE-003 — Touch targets below 44px minimum
**File**: `components/graph/stack-composer-hud.tsx:140`, `components/layout/dashboard-shell.tsx:54`
floating toggle button: `px-4 py-2` ≈ 36px. dashboard mobile menu trigger: `px-2 py-1` ≈ 28px. close button: `p-1` ≈ 26px. all below the 44px mobile minimum.

### UX-004 — Click on node adds to stack instead of navigating
**File**: `components/graph/network-graph.tsx:40`
PRD §7.2: "Click node → Navigate to construct detail page." implementation: click toggles stack membership. navigation is not accessible from the graph without the search palette. the primary interaction model was changed without updating the spec.

### UX-005 — GlobalSearch navigates to wrong route group
**File**: `components/search/global-search.tsx:103`
navigates to `/constructs/[slug]` (marketing route group) while the site layout has construct detail at `/(site)/[slug]`. two different URLs for the same concept.

### TASTE-001 — Hardcoded hex colors violating OKLCH token system
**Files**: `components/graph/category-filter.tsx:36,44`, `stack-composer-hud.tsx:112`, `node.tsx:207`
four instances of raw hex (`#ffffff60`, `#ffffff30`, `#ffffff40`, `#ffffff`) instead of OKLCH CSS variables. these should be `var(--color-bone-ghost)` or equivalent.

---

## medium severity findings (17)

| ID | File | Issue |
|----|------|-------|
| AUTH-003 | `app/api/auth/set-refresh/route.ts:11-26` | custom CSRF instead of shared `validateCsrf()` |
| AUTH-005 | `components/auth/auth-initializer.tsx:9` | module-level singleton leaks across hot reloads |
| DATA-003 | `services/constructs.ts:412` | `has_identity` appears fixed in code but silent `catch {}` may mask DB migration failure |
| DATA-005 | `components/search/global-search.tsx:31` | fetches without auth — org members see degraded search |
| CACHE-001 | `services/redis.ts:76` | `auth` and `anon` tiers cache same result set twice |
| PERF-003 | `next.config.ts:13` | `optimizePackageImports` misconfigured — Three.js is CJS, no benefit |
| PERF-006 | `app/(site)/[slug]/page.tsx:18-20` | missing `revalidate` export — every request hits API |
| MOBILE-004 | `components/layout/dashboard-shell.tsx:54` | dashboard mobile menu trigger below 44px |
| MOBILE-005 | `components/graph/hover-tooltip.tsx:22` | tooltip tracks `mousemove` only — no touch fallback |
| CWV-001 | `app/layout.tsx:7-12` | BasementGrotesque `display: swap` causes FOUT on LCP element |
| CWV-002 | `app/(site)/page.tsx` | auth loading state causes layout shift on homepage |
| TASTE-002 | `components/layout/dashboard-shell.tsx:21,34` | sidebar width as inline `style={{ width: 220 }}` magic numbers |
| TASTE-003 | `components/graph/stack-composer-hud.tsx:4` | Framer Motion springs hardcoded, not sourced from `lib/animation.ts` |
| UX-007 | `components/graph/stack-composer-hud.tsx:289` | three-column grid has no mobile breakpoints |
| UX-008 | `components/graph/graph-explorer.tsx` | no keyboard navigation in graph — no tabindex, no role, no focus management |
| UX-009 | `components/graph/hover-tooltip.tsx` | no ARIA role — invisible to screen readers |
| DRIFT-006 | `(marketing)/constructs/[slug]` + `(site)/[slug]` | duplicate construct detail pages in two route groups |

---

## low severity findings (12)

| ID | File | Issue |
|----|------|-------|
| AUTH-006 | `apps/api/src/lib/verify-dynamic-jwt.ts:33-47` | JWKS singleton not keyed on envId |
| AUTH-007 | `components/auth/auth-initializer.tsx:62-90` | hardcoded 14min refresh interval ignores actual token expiry |
| CACHE-002 | `lib/data/fetch-constructs.ts:157` | detail revalidation 1hr vs list 60s — stale detail after list refresh |
| DATA-006 | seed script | `model_preferences` always null — no extraction logic |
| DATA-007 | `components/constructs/auth-aware-construct-list.tsx:81` | brief public content flash for org members on mount |
| PERF-007 | `components/graph/node.tsx:145-168` | all nodes run `useFrame` per-frame — 13+ callbacks at 60fps |
| MOBILE-006 | `components/graph/graph-explorer.tsx:76` | WebGL path category filter missing overflow guard |
| MOBILE-007 | codebase-wide | no `useMediaQuery` hook — heavy components mounted but CSS-hidden on mobile |
| CWV-003 | `components/graph/skeleton.tsx` | skeleton has no reserved height |
| TASTE-004 | `stack-composer-hud.tsx`, `stack-preview.tsx` | Framer Motion components don't use `useReducedMotion` |
| UX-011 | `components/graph/node.tsx:143` | `detail` LOD always 0 — dead code |
| DRIFT-007 | `lib/stores/graph-store.ts` | Zustand store missing `immer` middleware per SDD spec |

---

## SDD compliance scorecard

| SDD Specification | Status | Notes |
|-------------------|--------|-------|
| Shadcn/ui for search (Command) | NO | three bespoke implementations |
| Zustand with `immer` middleware | NO | plain `create()` |
| `react-spring/three` for nodes | NO | raw `useFrame` imperative mutation |
| Pre-computed layout at build time | NO | client-side `useMemo` |
| `RoundedBox` node geometry | NO | polyhedra (icosahedron/dodecahedron/octahedron) |
| `Text` drei for labels | NO | `Html` overlay |
| `generateStaticParams` pre-gen | PARTIAL | returns `[]` — ISR on-demand only |
| Force-directed layout algorithm | YES | faithful implementation |
| WebGL detection + SVG fallback | YES | works correctly |
| Fuse.js client search | YES | used in CommandPalette + graph store |
| ISR 1-hour revalidation | YES | on homepage |
| Framer Motion for UI animations | PARTIAL | used in HUD, not nodes |

**SDD compliance rate**: 4/12 fully compliant (33%)

---

## scope drift analysis

**PRD scope** (Jan 2026): 4 route patterns. no auth. no billing. no creator dashboard. no blog. a "simplified discovery portal."

**actual scope** (Mar 2026): 34 routes across 4 route groups. three auth providers. billing pages. team management. creator dashboard. blog, changelog, docs, privacy, terms.

**drift score: 8/10**

the bazaar grew while the sign stayed the same. this isn't necessarily bad — a bazaar should grow. but the growth should be intentional, and the core vision (the neural graph as primary experience) got buried under the new stalls. the leaderboard is useful but it's a list, not a network. it shows constructs. it doesn't show how they compose. the composability story — the thing that makes this a network and not a catalog — is furniture in the warehouse.

---

## what the bazaar needs (gecko's recommendations)

### tier 1 — the stall needs to be open (critical path)

1. **mount the graph.** put `GraphExplorer` on a page. whether that's the homepage (original vision) or a dedicated `/graph` route (pragmatic) or a toggle on the homepage (compromise) — the neural graph needs a URL. the composability story is the differentiator.

2. **fix mobile or disable gracefully.** either add proper touch affordances (`touches` config on OrbitControls, tap-to-select, `useMediaQuery` to skip R3F on mobile) or serve the SVG fallback to all mobile visitors. rendering a 3D canvas that can't be interacted with is worse than showing a 2D diagram.

3. **fix `prefers-reduced-motion` in WebGL.** check `prefersReducedMotion()` before running `useFrame` rotation loops. this is an accessibility obligation, not a nice-to-have.

### tier 2 — the goods need to be honest (data integrity)

4. **fix verificationTier in list responses.** batch-fetch verification data and populate `packToConstruct()` correctly. constructs that earned their verification should wear it.

5. **fix N+1 queries.** batch-fetch versions and owners like identity rows. the bazaar can't grow if every new stall makes the API slower.

6. **consolidate search.** one implementation, one `Cmd+K` handler, one data source (authenticated when available). `CommandPalette` with Fuse.js is the better implementation — promote it, remove `GlobalSearch`.

### tier 3 — the walls need to hold (security)

7. **route Dynamic auth through BFF.** refresh_token should never touch client JS. create `/api/auth/dynamic` BFF route.

8. **decide what middleware is.** either validate JWTs properly (signature + expiry) or document it as a UX gate only. the current ambiguity will mislead future developers.

9. **fix vercel.json to use bun.** dependency drift between local and production is a ticking clock.

### tier 4 — the stall needs polish (quality)

10. **re-baseline the bundle.** run `ANALYZE=true bun run build` and establish current reality. gate PRs on the threshold.

11. **replace hardcoded hex colors** with OKLCH token references. four files, four fixes.

12. **add mobile breakpoints to Stack HUD.** `grid-cols-1 md:grid-cols-[1fr_2fr_1fr]`.

---

## what's working well

not everything is broken. some stalls are healthy:

- **OKLCH color token system** (`globals.css`) — well-designed, comprehensive, semantically layered. the strongest part of the design system.
- **force-directed layout** (`compute-layout.ts`) — deterministic hash-based init, domain gravity clustering, 50-iteration convergence. solid algorithm.
- **Stack Composer HUD** — clever interaction design. shift-click composition, keyboard shortcuts, soft hints at 5+ and 8+ constructs. the Grafana inspiration landed.
- **auth architecture** — the HttpOnly refresh / JS-readable access split is a defensible tradeoff. the BFF proxy pattern is correct. the CSRF protection works.
- **visibility gating** — `getAccessContext()` → `getVisibilityConditions()` → cache key segmentation. the data model is sound even if the edges are rough.
- **SVG fallback** — shares the same layout algorithm, renders clickable `<Link>` nodes, highlights search results. functional and accessible.

---

## closing

i've been in the bazaar a long time. i've seen stalls that look beautiful and sell nothing. i've seen ugly stalls with lines around the block. this one has good bones — the algorithms work, the data model is sound, the auth architecture is defensible. but the sign says "neural graph explorer" and the door opens to a leaderboard.

the graph is the soul of this thing. the moment a creator sees how their construct connects to others — that's when the bazaar becomes a network. that moment is built. it's just not accessible.

mount the graph. fix mobile. fix the data. the rest is polish.

— gecko
