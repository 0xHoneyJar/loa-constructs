# Sovereign Stack Kickoff — Migration + New Project Guide

> The reference document for any project migrating from Convex to Turso/Drizzle,
> or starting fresh on the sovereign stack. Two parallel efforts (rektdrop-interface, new projects)
> point here as their source of truth.

**Date**: 2026-03-31
**Constraint**: $10/mo perpetual infra, funded by yield on principal. Own everything. Depend on nothing.

---

## Part 1: The Stack

### Golden Path (New Projects)

| Layer | Choice | Why | Cost |
|-------|--------|-----|------|
| **Framework** | SvelteKit 5 (runes) | Reactive by default. No hydration. Flat routing. Agent-legible. | $0 |
| **Database** | Turso embedded replica (libSQL) | SQL. File-based. Zero latency. You own it. Every agent speaks SQL. | $0 |
| **ORM** | Drizzle | Type-safe schema + migrations. Standard SQL underneath. | $0 |
| **Realtime** | SSE / WebSockets (when needed) | 30 lines, no platform. SvelteKit server routes handle this natively. | $0 |
| **Hosting** | Railway (adapter-node) | Persistent volume for SQLite. Predictable pricing. Docker-native. | $5/mo |
| **Chain** | viem (direct) | No wagmi in SvelteKit. Vanilla contract reads/writes. | $0 |
| **Wallet** | Vanilla EIP-6963 | 340 lines. No Dynamic Labs ($0-300/mo saved). Proven in sprawl + purupuru. | $0 |
| **Auth** | WebAuthn passkeys + wallet address | No auth provider. Progressive identity. | $0 |
| **Styling** | Tailwind v4 + oklch tokens | Framework-agnostic design tokens. | $0 |
| **Linting** | oxlint + Biome | Fast. Replaces ESLint + Prettier. | $0 |
| **Testing** | Vitest + Playwright | Unit + E2E. | $0 |
| **Deploy** | `bun build` → Railway (or `bun build --compile` for single binary) | No Dockerfile needed for most cases. | $0 |
| **Total** | | | **$5/mo** |

### Endowment Math

| Monthly cost | Principal at 5% yield | Principal at 8% DeFi yield |
|-------------|----------------------|---------------------------|
| $5/mo | $1,200 | $750 |
| $10/mo | $2,400 | $1,500 |
| $20/mo | $4,800 | $3,000 |

---

## Part 2: Convex → Turso/Drizzle Migration Map

### What Convex Gives You (and what replaces each)

| Convex Feature | Replacement | Effort |
|---------------|-------------|--------|
| **Schema definition** | Drizzle schema (`schema.ts`) with `drizzle-kit generate` migrations | 1:1 — same concept, SQL underneath |
| **Queries** (reactive reads) | Drizzle `select()` + SSE for realtime push | Queries are simpler. Realtime needs SSE endpoint. |
| **Mutations** (writes) | Drizzle `insert()`/`update()`/`delete()` in SvelteKit server routes | Simpler — standard SQL |
| **Actions** (side effects) | SvelteKit server routes (`+server.ts`) or API routes | Same pattern, no Convex wrapper |
| **Crons** (scheduled jobs) | Railway cron service OR `node-cron` in the same process | Railway cron is $0 extra on same instance |
| **Realtime subscriptions** | Server-Sent Events (SSE) from SvelteKit | ~30 lines per subscription. Svelte `$state` receives. |
| **File storage** | R2 (Cloudflare) or S3-compatible | Direct upload. $0 on R2 free tier (10GB). |
| **Vector search** | SQLite `vec` extension via Turso OR external (if needed) | Only if using embeddings. Most apps don't need this. |
| **Scheduled functions** | `setTimeout` in process OR Railway cron | Simpler — no Convex scheduler API |
| **Auth (Convex Auth)** | Not used in our repos (we use wallet auth) | N/A |
| **ConvexClient adapter** | Not needed — Drizzle runs in your server process | Eliminates the hand-rolled adapter entirely |

### Migration Pattern (per table)

```
CONVEX                              TURSO/DRIZZLE
────────                            ─────────────
convex/schema.ts                →   src/lib/db/schema.ts (Drizzle)
  defineTable({                       export const users = sqliteTable('users', {
    name: v.string(),                   id: text('id').primaryKey(),
    score: v.number(),                  name: text('name').notNull(),
  })                                    score: integer('score'),
                                      })

convex/users.ts                 →   src/lib/db/queries/users.ts
  query({                              export async function getUser(db, id) {
    handler: async (ctx, args) => {       return db.select().from(users)
      return ctx.db.query("users")          .where(eq(users.id, id))
        .filter(...)                          .get()
        .collect()                        }
    }
  })

convex/users.ts                 →   src/routes/api/users/+server.ts
  mutation({                            export async function POST({ request }) {
    handler: async (ctx, args) => {       const { name, score } = await request.json()
      await ctx.db.insert("users",        await db.insert(users).values({ name, score })
        { name, score })                  return json({ ok: true })
    }                                   }
  })

convex/crons.ts                 →   src/lib/crons.ts (or Railway cron)
  crons.interval(                       // In-process:
    "refresh",                          setInterval(async () => {
    { minutes: 15 },                      await refreshLeaderboard(db)
    internal.refresh                    }, 15 * 60 * 1000)
  )
```

### Realtime Migration (the only non-trivial part)

Convex gives you reactive subscriptions for free. Replacing this requires SSE:

**Server** (`src/routes/api/subscribe/+server.ts`):
```typescript
export function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }
      // Poll DB or use SQLite triggers
      const interval = setInterval(async () => {
        const state = await db.select().from(treasury).get()
        send(state)
      }, 5000) // 5s polling — adjust per need

      return () => clearInterval(interval)
    }
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
```

**Client** (`src/lib/realtime.svelte.ts`):
```typescript
export function createSubscription<T>(url: string) {
  let data = $state<T | null>(null)

  $effect(() => {
    const source = new EventSource(url)
    source.onmessage = (e) => { data = JSON.parse(e.data) }
    return () => source.close()
  })

  return { get data() { return data } }
}
```

**Usage**:
```svelte
<script>
  const treasury = createSubscription('/api/subscribe')
</script>

<p>NAV: {treasury.data?.nav}</p>
```

This replaces the entire `convex.svelte.ts` adapter pattern. 30 lines server + 15 lines client.

---

## Part 3: Project Setup (New or Migration)

### Step 1: Scaffold

```bash
# New project
bun create svelte@latest my-project  # SvelteKit, TypeScript, Tailwind
cd my-project
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit

# Existing project (migration)
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit
```

### Step 2: Database Config

`drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_URL ?? 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
```

`src/lib/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_URL ?? 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
  // Embedded replica (zero-latency reads):
  // syncUrl: process.env.TURSO_URL,
  // syncInterval: 60, // seconds
})

export const db = drizzle(client)
```

### Step 3: Schema (translate from Convex)

`src/lib/db/schema.ts`:
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// Example: translate Convex schema → Drizzle schema
export const players = sqliteTable('players', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  wallet: text('wallet').notNull().unique(),
  name: text('name'),
  score: real('score').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})
```

Generate migration:
```bash
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### Step 4: Vanilla Wallet

Copy the proven pattern from sprawl-protocol/interface:
- `src/lib/wallet.svelte.ts` — 340 lines, EIP-6963 discovery, Smart Wallet support
- Berachain config: chain ID 80094

### Step 5: Railway Deploy

`svelte.config.js`:
```javascript
import adapter from '@sveltejs/adapter-node'

export default {
  kit: { adapter: adapter() }
}
```

Railway config:
- **Build**: `bun run build`
- **Start**: `node build`
- **Volume**: mount at `/data` for SQLite persistence
- **Env**: `TURSO_URL=file:/data/app.db` (local file on volume)

For Turso cloud sync (optional — adds remote backup):
- `TURSO_URL=libsql://your-db.turso.io`
- `TURSO_AUTH_TOKEN=your-token`
- Use embedded replica mode: reads from local, writes to cloud

---

## Part 4: Migration Checklist (per project)

### Phase 1: Schema (1-2 hours)

- [ ] Read `convex/schema.ts` — list all tables and fields
- [ ] Translate each table to Drizzle schema in `src/lib/db/schema.ts`
- [ ] Run `drizzle-kit generate` to create migration SQL
- [ ] Run migration against local SQLite: `drizzle-kit migrate`
- [ ] Verify schema: `sqlite3 local.db .schema`

### Phase 2: Queries + Mutations (2-4 hours)

- [ ] For each Convex query: create equivalent Drizzle select in `src/lib/db/queries/`
- [ ] For each Convex mutation: create SvelteKit server route in `src/routes/api/`
- [ ] For each Convex action (external API calls): move to SvelteKit server route
- [ ] Update all `createQuery()` calls in components → `fetch()` or `load()` calls
- [ ] Update all `mutate()` calls → `fetch('/api/...', { method: 'POST' })`

### Phase 3: Realtime (1-2 hours, if needed)

- [ ] Identify which queries need live updates (reactive subscriptions)
- [ ] Create SSE endpoint per subscription
- [ ] Create `createSubscription()` helper (Svelte 5 runes)
- [ ] Replace reactive Convex queries with SSE subscriptions
- [ ] Test: data updates in real-time when DB changes

### Phase 4: Crons (30 min)

- [ ] List all Convex crons from `convex/crons.ts`
- [ ] Replace with `setInterval()` in server startup OR Railway cron
- [ ] Verify cron jobs run on schedule

### Phase 5: Cleanup (30 min)

- [ ] Remove `convex/` directory
- [ ] Remove `convex` from `package.json`
- [ ] Remove Convex environment variables
- [ ] Remove hand-rolled Convex adapter (`convex.svelte.ts`)
- [ ] Remove any `nvm use` workarounds (Convex required Node 20)
- [ ] Update README
- [ ] Deploy to Railway

---

## Part 5: Rektdrop-Interface Specific Notes

**Current state**: SvelteKit 5 + Convex + Railway. Production at rektdrop.sprawl.gg.

**Migration priority**: HIGH — Convex friction is recurring. Node version pinning (nvm use 20), hand-rolled adapter maintenance, Convex deploy step separate from app deploy.

**Convex deployment**: `fearless-goldfinch-669` (prod), `uncommon-goshawk-452` (dev)

**Exact migration surface**:
- **22 tables**: players, losses (13 cols), cards, mints, ashLedger (append-only), leaderboardEntries, leaderboardMeta, badges, beraPrice, tokenMetadata, profiles (12 cols), daemonSessions, daemonMessages, daemonInteractions (append-only), daemonEvals, daemonSessionScores, rateLimits, daemonSoul (14 cols), missions, signalSnapshots, economyConfig, readings
- **95 functions**: 38 queries, 51 mutations, 6 actions
- **4 crons**: leaderboard refresh (15min), BeraName resolution (15min), daily mission expiry, weekly mission expiry
- **11 realtime subscriptions**: losses.getByAddress, ashLedger.getBalance, badges.getByAddress, missions.getActive, profiles.get, leaderboard.getStats, leaderboard.getTop, leaderboard.getCollections, leaderboard.getNeighbors, cards.getByAddress, mints.getByAddress
- **6 scheduled function usages**: leaderboard refresh batching, loss calculation kickoff, data backfill
- **Zero file storage** (uses external CDN/Dune)
- **Zero vector search**
- **External services** (HTTP, stay the same): score-sprawl (Railway), score-api (Railway), Dune, Alchemy, CoinGecko, Anthropic

**Migration order for rektdrop**:
1. **Schema** (2h) — translate 22 tables to Drizzle. Most are flat key-value. `losses.collections` is a nested array — flatten to a join table or store as JSON column.
2. **Non-realtime queries** (3h) — 38 queries → Drizzle selects. Most are simple lookups by address.
3. **Mutations** (3h) — 51 mutations → SvelteKit server routes. Most are inserts/updates.
4. **Crons** (30min) — 4 crons → `setInterval()` in server startup or Railway cron service.
5. **Scheduled functions** (1h) — 6 usages → `setTimeout()` or queue pattern.
6. **Daemon storage** (2h) — daemonSessions, daemonMessages, daemonSoul, daemonInteractions → SQLite. Chat streaming stays @ai-sdk/anthropic.
7. **Realtime** (2h) — 11 subscriptions → SSE endpoints. Leaderboard + profile + badges are the critical ones.
8. **Data export** (1h) — Export Convex data → import into SQLite. Write a one-time migration script.
9. **Cleanup** (30min) — Remove convex/, adapter, env vars, nvm workarounds.

**Estimated total**: 15-20 hours across 2-3 sessions.

**Risk**: rektdrop is in production. Migration should happen on a branch, test against local SQLite, then cut over. Convex data needs to be exported and imported into SQLite as part of the cutover.

---

## Part 6: Purupuru/World Migration Notes

**Migration priority**: LOW — working, not broken, team focused elsewhere. Migrate only if friction appears.

**Convex deployment**: `striped-dachshund-57`

**Exact migration surface**:
- **18 tables**: garageConfig, assetCatalog (14 cols), assetVectors (3072-dim embeddings), assetSets, cardConfigs, designTokens, worldState, feedback, worldIdentity (12 cols, progressive identity), battleResults, packBalances, cardOwnership, doorVisits, chatSessions (10 cols), chatMemory, chatProfiles
- **70 functions**: 41 queries, 27 mutations, 2 actions
- **1 cron**: WRS snapshot (daily)
- **6 realtime subscriptions**: feedback.list (multiplayer chat), identity lookups, card lists
- **Custom vector search**: Gemini Embedding 2 → cosine similarity in-action. NOT native Convex vector search — trivially portable to SQLite vec extension or separate table.
- **Two frontends share one backend**: SvelteKit (world) + Next.js (app) both hit same Convex. Migration means both frontends move, or the Next.js app gets cut.

**Complication**: progressive anonymous identity (session UUID → element → passkey → wallet) is deeply wired through Convex mutations. This is the trickiest part to migrate.

---

## Part 6b: Loa-Constructs/Explorer Migration Notes

**Migration priority**: EVALUATE — this is a Next.js app (different stack from sovereign path). Only migrate if rebuilding explorer on SvelteKit.

**Convex deployment**: `doting-jackal-397` (dev), `quaint-anaconda-866` (prod)

**Exact migration surface**:
- **9 tables**: installEvents, syncStatus, dashboardPresence, healthObservations (12 cols), signals (20 cols), signalKeys, signalRateLimits, signalOverrides, sovereigntyState (12 cols)
- **72 functions**: 25 queries, 24 mutations, 23 actions
- **9 crons**: presence cleanup (30s), signal retry (5min), Linear reconcile (1hr), signal purge (24hr), heartbeat (1hr), heartbeat check (2hr), sovereignty recalc (1hr), Linear failure check (15min), analytics digest (daily 14:00)
- **12 realtime subscriptions**: dashboardPresence, healthObservations (3 queries), installEvents, signals (6 queries)
- **9 scheduled function usages**: signal classification, Discord alerts, Linear issues, sovereignty escalation, pipeline errors
- **Heavy external integrations**: Linear API, Discord webhooks, Umami analytics, Telegram bot, Claude Haiku AI classification

**Complication**: most crons (9) and most external integrations. The signals observatory dashboard is heavily realtime. This is the most operationally complex migration.

---

## Part 7: Full Migration Surface Summary

| Metric | Rektdrop | Purupuru | Explorer | **Total** |
|--------|----------|----------|----------|-----------|
| Tables | 22 | 18 | 9 | **49** |
| Functions | 95 | 70 | 72 | **237** |
| Cron jobs | 4 | 1 | 9 | **14** |
| Realtime subs | 11 | 6 | 12 | **29** |
| Scheduled fns | 6 | 0 | 9 | **15** |
| Vector search | No | Yes (custom) | No | 1 |
| File storage | No | No | No | **0** |

**Key observations**:
- Zero file storage anywhere — all repos use external CDN/S3. Eliminates a major migration obstacle.
- Vector search is custom (not Convex native) — cosine similarity in a regular table. Portable.
- The Svelte 5 adapter is already hand-rolled in sprawl + purupuru — replacing it with load functions + SSE preserves the same DX.
- Rektdrop is the priority migration (highest friction, simplest external deps).
- Set-and-forgetti has zero Convex. Already clean.

---

## Part 8: apHive (New Project — No Migration)

apHive starts fresh on the sovereign stack. No Convex, no migration.

**V1**: No database at all. All data is on-chain reads via viem.
**V2** (if needed): Turso for historical tracking, user preferences, cached price feeds.

Full build spec: `grimoires/the-easel/specs/kickoff-aphive.md`

---

## Part 9: Constructs for the Sovereign Stack

Install these in any sovereign stack project:

```bash
npx loa-cli install artisan     # UI design specs
npx loa-cli install protocol    # Smart contract verification
npx loa-cli install rosenzu     # Navigation as rooms
npx loa-cli install the-arcade  # Game design UX patterns
npx loa-cli install hardening   # Security audits
```

Domain-specific (install as needed):
```bash
npx loa-cli install hypha       # Berachain PoL expertise
npx loa-cli install k-hole      # Deep research
npx loa-cli install the-speakers # Audio design
npx loa-cli install kansei      # Animation + interaction physics
```

---

## Part 10: What Dies, What Lives

### Kill List (remove from golden path)

| Tool | Why it dies | Replacement |
|------|-----------|-------------|
| **Convex** (for new projects) | Vendor dependency, proprietary queries, no native Svelte support, Node version pinning | Turso + Drizzle |
| **Dynamic Labs** | $0-300/mo for wallet connection. 340 lines replaces it. | Vanilla EIP-6963 |
| **Vercel** | Unpredictable pricing, vendor lock-in, no persistent volumes | Railway |
| **wagmi** (in SvelteKit) | React hooks library. Doesn't work in Svelte. | viem direct |
| **Zustand** | React state library. Svelte runes replace it. | `$state`, `$derived` |
| **TanStack Query** | React server state. SvelteKit load functions + SSE replace it. | `load()` + SSE |
| **ESLint + Prettier** | Slow, complex config | oxlint + Biome |
| **Redis** | Cache layer. Turso embedded = zero-latency reads. No cache needed. | Turso embedded replica |
| **Supabase** (for new projects) | Managed Postgres. More than you need. | Turso (SQLite) |

### Keep List (stays in golden path)

| Tool | Why it lives |
|------|-------------|
| **SvelteKit 5** | Reactive, flat, agent-legible, no hydration complexity |
| **Turso / libSQL** | SQL, file-based, zero latency, you own it |
| **Drizzle** | Type-safe ORM, standard SQL, clean migrations |
| **Railway** | Predictable pricing, persistent volumes, Docker-native |
| **viem** | Direct chain interaction, typed, proven |
| **Tailwind v4** | Design tokens, oklch, framework-agnostic |
| **Bun** | Fast dev, potential single-binary deploy |
| **Foundry** | Smart contract development, testing, deployment |

### Transition List (existing projects keep Convex, don't rewrite unless friction justifies it)

| Project | Current | Action |
|---------|---------|--------|
| **rektdrop-interface** | Convex | **MIGRATE** — friction is real, production issues recurring |
| **purupuru/world** | Convex | **KEEP** — working, not broken, El Capitan + Gumi focused on other things |
| **set-and-forgetti** | Convex | **EVALUATE** — if friction appears, migrate. Otherwise keep. |
| **loa-constructs** | Convex + Supabase | **EVALUATE** — explorer is Next.js anyway, different stack |
| **apHive** | N/A (new) | **SOVEREIGN STACK** from day one |

---

*This document is the single source of truth for sovereign stack decisions. Both rektdrop migration and new project scaffolding point here.*
