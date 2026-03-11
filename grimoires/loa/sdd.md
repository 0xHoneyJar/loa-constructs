# SDD: Internal Dashboard + Convex Real-Time Integration

**Cycle**: cycle-040
**Created**: 2026-03-10
**Status**: Draft
**PRD**: `grimoires/loa/prd.md`
**Depends on**: cycle-039 (Dynamic Labs auth — merged)

---

## 1. Executive Summary

Cycle-040 adds three capabilities to `constructs.network`: an authenticated dashboard with progressive disclosure (team → admin), self-service API key management, and a Convex real-time layer replicating the midi-interface hot/cold pattern. After this cycle, authenticated users have a sidebar-navigated dashboard with construct metrics, API key CRUD, and live install feeds. The public site is unchanged.

**Scope**: 23 new files (explorer + API), 8 modified files, 1 migration, 1 new dependency (`convex`). No breaking API changes.

---

## 2. System Architecture

### 2.1 High-Level Data Flow

```
                    ┌─────────────────────────────────────┐
                    │          constructs.network          │
                    │          (Next.js 15 / Vercel)       │
                    ├─────────────┬───────────────────────┤
                    │  (site)     │  (dashboard)           │
                    │  Public ISR │  Client Components     │
                    │  /          │  /dashboard/*           │
                    │  /explore   │  /dashboard/keys        │
                    │  /constructs│  /dashboard/constructs  │
                    │             │  /dashboard/explore     │
                    └──────┬──────┴──────────┬─────────────┘
                           │                 │
                    ISR fetch          Bearer token fetch
                    (no auth)          (auth store → cookie)
                           │                 │
                    ┌──────▼─────────────────▼─────────────┐
                    │       api.constructs.network          │
                    │       (Hono / Railway)                │
                    ├──────────────────────────────────────┤
                    │  /v1/auth/me      → is_admin NEW     │
                    │  /v1/keys         → CRUD NEW         │
                    │  /v1/admin/*      → existing          │
                    │  /v1/analytics/*  → installs NEW     │
                    │  /v1/constructs/* → existing          │
                    └──────────┬───────────────────────────┘
                               │
                    fire-and-forget webhook
                    (on pack install)
                               │
                    ┌──────────▼───────────────────────────┐
                    │  /api/convex/install  (BFF route)     │
                    │  validates CONVEX_WRITE_KEY            │
                    └──────────┬───────────────────────────┘
                               │
                    ┌──────────▼───────────────────────────┐
                    │          Convex Cloud                  │
                    │  installEvents  (hot — live feed)      │
                    │  syncStatus     (hot — health)         │
                    │  dashboardPresence (hot — who's on)    │
                    └──────────────────────────────────────┘
                               ▲
                    useQuery() │ WebSocket subscriptions
                               │
                    ┌──────────┴───────────────────────────┐
                    │  Dashboard Components (client)         │
                    │  LiveInstallFeed, PresenceIndicator    │
                    └──────────────────────────────────────┘
```

### 2.2 Hot/Cold Data Architecture

| Data Type | Source of Truth (Cold) | Live Layer (Hot) | Sync Mechanism |
|-----------|----------------------|-------------------|----------------|
| Construct metadata | PostgreSQL (Supabase) | — | ISR revalidation |
| Install counts | `pack_installations` table | `installEvents` (Convex) | Webhook + 15min reconciliation cron |
| API keys | `api_keys` table | — | Direct CRUD (no real-time needed) |
| Dashboard presence | — | `dashboardPresence` (Convex) | 30s heartbeat, TTL cleanup |
| Admin analytics | PostgreSQL aggregates | — | On-demand fetch |

### 2.3 Route Group Architecture

```
apps/explorer/app/
├── (site)/              # Public pages (existing, unchanged)
│   ├── page.tsx         # Homepage / leaderboard
│   └── [slug]/          # Construct detail
├── (marketing)/         # Marketing pages (existing, unchanged)
│   ├── about/
│   └── constructs/
├── (dashboard)/         # NEW — authenticated dashboard
│   └── dashboard/
│       ├── page.tsx         # Overview
│       ├── explore/page.tsx # Graph in dashboard context
│       ├── keys/page.tsx    # API key management
│       └── constructs/page.tsx  # Construct metrics + live feed
├── api/                 # BFF routes
│   ├── convex/
│   │   └── install/route.ts  # NEW — install webhook receiver
│   └── cron/
│       └── reconcile/route.ts # NEW — Convex↔Supabase sync
└── layout.tsx           # Root layout (add ConvexProvider)
```

---

## 3. Component Architecture

### 3.1 Dashboard Layout

```
(dashboard)/layout.tsx
├── Auth gate (client-side redirect if !isAuthenticated)
├── Sidebar (200px fixed)
│   ├── Nav items: Overview, Explore, Constructs, API Keys
│   └── Admin section (gated by isAdmin): Analytics
└── Content area
    └── DashboardHeader (breadcrumbs, wallet address, org badge)
        └── {children}
```

**Auth gate strategy**: Two layers.
1. `middleware.ts` — soft gate. Checks `access_token` cookie existence. Redirects to `/?login=required`. Prevents flash.
2. `(dashboard)/layout.tsx` — hard gate. Client component reads `useAuthStore()`. If `!isAuthenticated` after hydration, redirects. This catches cases where cookie exists but token is expired.

### 3.2 Provider Nesting (Updated)

```
// app/layout.tsx
<DynamicProvider>           // Existing — Dynamic Labs SDK
  <ConvexProvider>          // NEW — graceful degradation
    {children}
  </ConvexProvider>
</DynamicProvider>
```

`ConvexProvider` is a no-op wrapper when `NEXT_PUBLIC_CONVEX_URL` is unset. Module-level singleton `ConvexReactClient` (not recreated per render).

### 3.3 Middleware

```typescript
// apps/explorer/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  if (!token) {
    return NextResponse.redirect(new URL('/?login=required', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
```

Cookie-only check. No JWT validation — that's the API's job. This is a UX gate, not a security gate.

---

## 4. API Changes

### 4.1 `/auth/me` Response Extension

**File**: `apps/api/src/routes/auth.ts` (lines 471-479)

Current response:
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "email_verified": false,
    "is_org_member": true,
    "tier": "free"
  }
}
```

New response (additive):
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "email_verified": false,
    "is_org_member": true,
    "is_admin": true,
    "wallet_address": "0x79092A...",
    "tier": "free"
  }
}
```

Two new fields: `is_admin` (from `user.role === 'admin'` on the `AuthUser` context) and `wallet_address` (from the user record). Both optional/nullable — no breaking change.

### 4.2 Keys Router

**File**: `apps/api/src/routes/keys.ts`

```typescript
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { generateApiKey, hashApiKey } from '../services/auth.js';
import { apiKeys } from '../db/schema.js';
import { db } from '../db/index.js';
import { eq, and, count } from 'drizzle-orm';

const keys = new Hono();

// POST /v1/keys — Create API key
keys.post('/', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const { name, scopes } = await c.req.json();

  // Enforce 10-key limit
  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.revoked, false)));

  if (activeCount >= 10) {
    return c.json({ error: 'Maximum 10 active keys' }, 400);
  }

  const { key, prefix } = generateApiKey();
  const hash = await hashApiKey(key);

  const [row] = await db.insert(apiKeys).values({
    userId,
    keyPrefix: prefix,
    keyHash: hash,
    name: name || 'Unnamed key',
    scopes: scopes || ['read:skills', 'write:installs'],
  }).returning();

  // Return full key ONCE
  return c.json({
    id: row.id,
    key,          // Only time full key is returned
    prefix: row.keyPrefix,
    name: row.name,
    scopes: row.scopes,
    created_at: row.createdAt,
  }, 201);
});

// GET /v1/keys — List user's keys
keys.get('/', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const rows = await db.select({
    id: apiKeys.id,
    keyPrefix: apiKeys.keyPrefix,
    name: apiKeys.name,
    scopes: apiKeys.scopes,
    lastUsedAt: apiKeys.lastUsedAt,
    createdAt: apiKeys.createdAt,
  })
  .from(apiKeys)
  .where(and(eq(apiKeys.userId, userId), eq(apiKeys.revoked, false)))
  .orderBy(apiKeys.createdAt);

  return c.json({ keys: rows });
});

// DELETE /v1/keys/:id — Revoke key
keys.delete('/:id', requireAuth(), async (c) => {
  const userId = c.get('userId');
  const keyId = c.req.param('id');

  const [updated] = await db.update(apiKeys)
    .set({ revoked: true })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  if (!updated) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ revoked: true });
});

export { keys as keysRouter };
```

**Registration** in `apps/api/src/app.ts`:
```typescript
import { keysRouter } from './routes/keys.js';
// ...
v1.route('/keys', keysRouter);
```

### 4.3 Install Analytics Endpoint

**File**: `apps/api/src/routes/analytics.ts` (append to admin router)

New endpoint on `adminRouter` at `/v1/admin/analytics/installs`:

```typescript
// GET /v1/admin/analytics/installs?pack_id=X&period=30d
admin.get('/analytics/installs', requireAuth(), requireAdmin(), async (c) => {
  const packId = c.req.query('pack_id');
  const period = c.req.query('period') || '30d';
  // date_trunc('day', created_at) GROUP BY bucketed install counts
});
```

This goes on the existing `adminRouter` at `/v1/admin`, not the root-mounted analytics router.

### 4.4 Install Webhook (Fire-and-Forget)

**File**: `apps/api/src/routes/packs.ts` (after `trackPackInstallation` call at ~line 1284)

```typescript
// Fire-and-forget webhook to explorer BFF for live Convex feed
if (process.env.CONVEX_WEBHOOK_URL) {
  fetch(process.env.CONVEX_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CONVEX_WRITE_KEY}`,
    },
    body: JSON.stringify({
      packSlug: pack.slug,
      packName: pack.name,
      action: 'install',
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {}); // Non-blocking, non-fatal
}
```

---

## 5. Convex Schema & Functions

### 5.1 Directory Structure

```
apps/explorer/
├── convex/
│   ├── schema.ts            # Table definitions
│   ├── installEvents.ts     # Install feed queries + mutations
│   ├── syncStatus.ts        # Sync health queries + mutations
│   ├── dashboardPresence.ts # Presence queries + mutations + cleanup
│   └── crons.ts             # Convex-native cron registrations
├── convex.json              # Functions path override for monorepo
```

`convex.json` at `apps/explorer/`:
```json
{
  "functions": "convex/"
}
```

### 5.2 Schema

```typescript
// apps/explorer/convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  installEvents: defineTable({
    packSlug: v.string(),
    packName: v.string(),
    action: v.string(),       // "install" | "uninstall" | "update"
    timestamp: v.string(),    // ISO 8601
  }).index("by_created", ["_creationTime"]),

  syncStatus: defineTable({
    slug: v.string(),
    status: v.string(),       // "healthy" | "stale" | "error"
    lastSyncAt: v.string(),
    errorMessage: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  dashboardPresence: defineTable({
    wallet: v.string(),
    displayName: v.optional(v.string()),
    lastSeen: v.number(),     // Date.now()
    expiresAt: v.number(),    // lastSeen + 60_000 (60s TTL)
  })
    .index("by_wallet", ["wallet"])
    .index("by_expires", ["expiresAt"]),
});
```

Every table has indexes for every query access pattern. No naked `.collect()` on large tables.

### 5.3 Functions Pattern

**Queries** — live subscriptions via WebSocket:
```typescript
// installEvents.ts
export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return ctx.db
      .query("installEvents")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});
```

**Mutations** — write-key gated for server-to-server:
```typescript
export const record = mutation({
  args: {
    writeKey: v.string(),
    packSlug: v.string(),
    packName: v.string(),
    action: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.writeKey !== process.env.CONVEX_WRITE_KEY) {
      throw new Error("unauthorized");
    }
    await ctx.db.insert("installEvents", {
      packSlug: args.packSlug,
      packName: args.packName,
      action: args.action,
      timestamp: args.timestamp,
    });
  },
});
```

**Internal mutations** — for cron cleanup:
```typescript
// dashboardPresence.ts
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("dashboardPresence")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();
    for (const row of expired) {
      await ctx.db.delete(row._id);
    }
  },
});
```

### 5.4 Crons

```typescript
// apps/explorer/convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "presence/cleanup",
  { seconds: 30 },
  internal.dashboardPresence.cleanupExpired
);

export default crons;
```

---

## 6. Frontend Components

### 6.1 Sidebar

```typescript
// apps/explorer/components/dashboard/sidebar.tsx
'use client';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/explore', label: 'Explore', icon: Network },
  { href: '/dashboard/constructs', label: 'Constructs', icon: Box },
  { href: '/dashboard/keys', label: 'API Keys', icon: Key },
];

const adminItems = [
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const { isAdmin } = useAuthStore();
  const pathname = usePathname();
  // render nav items, admin section gated by isAdmin
}
```

### 6.2 Dashboard Header

```typescript
// apps/explorer/components/dashboard/dashboard-header.tsx
'use client';

export function DashboardHeader() {
  const { user, isAdmin, isOrgMember } = useAuthStore();
  // Breadcrumbs from pathname, wallet address display, org/admin badges
}
```

### 6.3 API Key Components

**Key List** (`api-key-list.tsx`):
- Table: prefix (`sk_live_xxxx...`), name, scopes as pills, last_used relative time, revoke button
- Empty state with create CTA

**Create Dialog** (`create-key-dialog.tsx`):
- Name input (required)
- Scope checkboxes (read:skills, write:installs, read:analytics — checked by default)
- On success: modal shows full key with monospace display + copy button + "This key won't be shown again" warning
- Closes dialog → refreshes key list

### 6.4 Live Install Feed

```typescript
// apps/explorer/components/dashboard/live-install-feed.tsx
'use client';

export function LiveInstallFeed() {
  const events = useQuery(api.installEvents.recent, { limit: 20 });

  // "skip" sentinel: Convex not configured
  if (events === undefined) {
    return <FeedSkeleton />;
  }

  if (events.length === 0) {
    return <EmptyFeed />;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {events.map((event) => (
        <InstallEventRow key={event._id} event={event} />
      ))}
    </div>
  );
}
```

### 6.5 Presence Hook

```typescript
// apps/explorer/hooks/use-dashboard-presence.ts
'use client';

export function useDashboardPresence() {
  const heartbeat = useMutation(api.dashboardPresence.upsert);
  const online = useQuery(api.dashboardPresence.listOnline);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.walletAddress) return;
    const interval = setInterval(() => {
      heartbeat({
        wallet: user.walletAddress,
        displayName: user.name,
      }).catch(() => {}); // Non-fatal
    }, 30_000);

    // Initial heartbeat
    heartbeat({ wallet: user.walletAddress, displayName: user.name });

    return () => clearInterval(interval);
  }, [user?.walletAddress]);

  return { online: online ?? [] };
}
```

### 6.6 Auth Nav Update

```typescript
// apps/explorer/components/layout/auth-nav.tsx (modified)
'use client';

export function AuthNav() {
  const { isOrgMember, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="h-7 w-20" />;
  }

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated && (
        <Link
          href="/dashboard"
          className="font-mono text-[9px] text-bone-light/70 hover:text-bone-light border border-bone-light/20 hover:border-bone-light/40 px-1.5 py-0.5 uppercase tracking-wider transition-colors"
        >
          Dashboard
        </Link>
      )}
      {isOrgMember && (
        <span className="font-mono text-[9px] text-cyan-base/70 border border-cyan-base/20 px-1 py-0.5 uppercase tracking-wider">
          org
        </span>
      )}
      <DynamicConnectButton />
    </div>
  );
}
```

---

## 7. Server-Side Convex Client

```typescript
// apps/explorer/lib/convex/server.ts
import { ConvexHttpClient } from "convex/browser";

let _convex: ConvexHttpClient | null | undefined;

export function getConvexClient(): ConvexHttpClient | null {
  if (_convex !== undefined) return _convex;
  const url = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  _convex = url ? new ConvexHttpClient(url) : null;
  return _convex;
}
```

Lazy singleton. Returns `null` when not configured. Callers return 503.

---

## 8. BFF Routes

### 8.1 Install Webhook Receiver

```typescript
// apps/explorer/app/api/convex/install/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const writeKey = process.env.CONVEX_WRITE_KEY;

  if (!writeKey || authHeader !== `Bearer ${writeKey}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ error: 'convex not configured' }, { status: 503 });
  }

  const body = await req.json();
  await convex.mutation(api.installEvents.record, {
    writeKey,
    packSlug: body.packSlug,
    packName: body.packName,
    action: body.action,
    timestamp: body.timestamp,
  });

  return NextResponse.json({ ok: true });
}
```

### 8.2 Reconciliation Cron

```typescript
// apps/explorer/app/api/cron/reconcile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getConvexClient } from '@/lib/convex/server';
import { api } from '@/convex/_generated/api';

const MAX_RUNTIME_MS = 50_000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const convex = getConvexClient();
  if (!convex) {
    return NextResponse.json({ error: 'convex not configured' }, { status: 503 });
  }

  const start = Date.now();
  let reconciled = 0;
  let batches = 0;

  // Fetch recent pack_installations from Supabase (last 24h)
  // Compare with Convex installEvents
  // Backfill gaps
  // Paginated with time budget guard

  while (Date.now() - start < MAX_RUNTIME_MS) {
    // fetch batch, compare, backfill
    // break if no gaps remain
    batches++;
  }

  return NextResponse.json({ reconciled, batches });
}
```

Registered in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/reconcile",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## 9. Auth Store Extension

**File**: `apps/explorer/lib/stores/auth-store.ts`

### 9.1 Interface Changes

```typescript
interface AuthState {
  // ... existing fields
  isAdmin: boolean;  // NEW — default false
  // ... existing methods
}
```

### 9.2 fetchMe Integration

```typescript
// In apps/explorer/lib/api/auth.ts
export interface User {
  // ... existing fields
  isAdmin: boolean;           // NEW
  walletAddress: string | null; // NEW
}

// In fetchMe mapping
const user: User = {
  // ... existing mappings
  isAdmin: u.is_admin ?? false,
  walletAddress: u.wallet_address ?? null,
};
```

### 9.3 Store Population

Every path that calls `fetchMe` and sets user state must also set `isAdmin`:
- `initialize()` — on page load from existing token
- `login()` — after email/password
- `connectDynamic()` — after wallet connect
- `refreshToken()` — after token refresh

Pattern: `set({ user, isOrgMember: user.isOrgMember, isAdmin: user.isAdmin })`

---

## 10. Migration

```sql
-- apps/api/src/db/migrations/0010_admin_wallet.sql
-- Promote the primary admin wallet
UPDATE users SET is_admin = true
WHERE LOWER(wallet_address) = LOWER('0x79092A805f1cf9B0F5bE3c5A296De6e51c1DEd34');
```

Idempotent — `SET is_admin = true` is a no-op if already true.

---

## 11. Environment Variables

| Variable | Where | Required | Default |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Explorer (client) | No | — (graceful degradation) |
| `CONVEX_URL` | Explorer (server) | No | Falls back to `NEXT_PUBLIC_CONVEX_URL` |
| `CONVEX_WRITE_KEY` | Explorer + API | No | — (webhook skipped if absent) |
| `CONVEX_WEBHOOK_URL` | API | No | — (webhook skipped if absent) |
| `CRON_SECRET` | Explorer | No | — (cron returns 401 if absent) |

All optional. App is fully functional without any Convex configuration.

---

## 12. File Inventory (31 files total)

### Phase 1: Dashboard Shell (8 new, 4 modify)

| Action | File | Description |
|--------|------|-------------|
| Create | `apps/explorer/middleware.ts` | Dashboard soft gate (cookie check) |
| Create | `apps/explorer/app/(dashboard)/layout.tsx` | Dashboard layout + sidebar + auth hard gate |
| Create | `apps/explorer/app/(dashboard)/dashboard/page.tsx` | Overview page |
| Create | `apps/explorer/app/(dashboard)/dashboard/explore/page.tsx` | Graph in dashboard context |
| Create | `apps/explorer/components/dashboard/sidebar.tsx` | Sidebar navigation |
| Create | `apps/explorer/components/dashboard/dashboard-header.tsx` | Header with breadcrumbs + badges |
| Create | `apps/explorer/lib/api/dashboard.ts` | Authenticated fetch helpers |
| Create | `apps/api/src/db/migrations/0010_admin_wallet.sql` | Admin wallet promotion |
| Modify | `apps/api/src/routes/auth.ts` | Add `is_admin`, `wallet_address` to `/me` |
| Modify | `apps/explorer/lib/api/auth.ts` | Add `isAdmin`, `walletAddress` to User |
| Modify | `apps/explorer/lib/stores/auth-store.ts` | Add `isAdmin` to AuthState |
| Modify | `apps/explorer/components/layout/auth-nav.tsx` | Add Dashboard link |

### Phase 2: API Keys (5 new, 1 modify)

| Action | File | Description |
|--------|------|-------------|
| Create | `apps/api/src/routes/keys.ts` | Keys CRUD router |
| Create | `apps/explorer/app/(dashboard)/dashboard/keys/page.tsx` | Keys management page |
| Create | `apps/explorer/components/dashboard/api-key-list.tsx` | Key table + revoke |
| Create | `apps/explorer/components/dashboard/create-key-dialog.tsx` | Create key dialog |
| Create | `apps/explorer/lib/api/keys.ts` | Key API client |
| Modify | `apps/api/src/app.ts` | Register keys router |

### Phase 3: Convex Real-Time (10 new, 3 modify)

| Action | File | Description |
|--------|------|-------------|
| Create | `apps/explorer/convex/schema.ts` | Convex table definitions |
| Create | `apps/explorer/convex/installEvents.ts` | Install feed functions |
| Create | `apps/explorer/convex/syncStatus.ts` | Sync health functions |
| Create | `apps/explorer/convex/dashboardPresence.ts` | Presence functions |
| Create | `apps/explorer/convex/crons.ts` | Convex-native cron jobs |
| Create | `apps/explorer/components/providers/convex-provider.tsx` | Graceful degradation provider |
| Create | `apps/explorer/lib/convex/server.ts` | Server-side Convex client |
| Create | `apps/explorer/app/api/convex/install/route.ts` | Install webhook BFF |
| Create | `apps/explorer/components/dashboard/live-install-feed.tsx` | Live install feed |
| Create | `apps/explorer/hooks/use-dashboard-presence.ts` | Presence heartbeat hook |
| Create | `apps/explorer/app/(dashboard)/dashboard/constructs/page.tsx` | Construct metrics page |
| Create | `apps/explorer/app/api/cron/reconcile/route.ts` | Reconciliation cron |
| Modify | `apps/explorer/app/layout.tsx` | Wrap with ConvexProvider |
| Modify | `apps/api/src/routes/packs.ts` | Fire install webhook |
| Modify | `apps/api/src/routes/analytics.ts` | Add daily install buckets |

---

## 13. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Admin privilege escalation | `isAdmin` is DB-authoritative. Not in JWT claims. Server validates on every `/admin/*` request via `requireAdmin()` middleware. |
| API key exposure | Full key shown once at creation. Only prefix stored/returned after that. Hash is bcrypt (cost 12). |
| Key ownership bypass | DELETE validates `userId` match before revoking. |
| Convex write abuse | All write mutations gated by `CONVEX_WRITE_KEY` shared secret. No direct client→Convex mutations for auth-bearing data. |
| Dashboard route bypass | Two-layer gate: middleware (cookie) + layout (auth store). Even if middleware is bypassed, layout redirects. |
| Reconciliation cron abuse | `CRON_SECRET` bearer auth. No unauthenticated access. |
| XSS in API key names | Key names are user input — sanitize on display (React's default JSX escaping handles this). |

---

## 14. Testing Strategy

| Layer | What | How |
|-------|------|-----|
| API | Keys CRUD | Integration tests: create, list, revoke, 10-key limit, ownership validation |
| API | `/me` extension | Unit test: verify `is_admin` and `wallet_address` in response |
| API | Install webhook | Integration test: verify fire-and-forget doesn't block install |
| Explorer | Middleware | Edge case: no cookie → redirect, valid cookie → pass-through |
| Explorer | Dashboard layout | Auth gate: redirect when unauthenticated |
| Explorer | Convex provider | Graceful degradation: no URL → renders children |
| Explorer | Key management | E2E: create key, verify shown once, list, revoke |
| Convex | Schema | Type validation: all fields match expected types |
| Convex | Reconciliation | Monotonic guard: duplicate events skipped |

---

## Next Step

`/sprint-plan` to create sprint plan based on this SDD.
