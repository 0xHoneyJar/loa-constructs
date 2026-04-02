# Kickoff: CubQuests World — Sovereign Stack Migration

> Migrate cubquests-interface from Next.js + Supabase + Vercel to SvelteKit + Turso + Railway.
> Kill Dynamic Labs. Kill Vercel crons. Move Trigger.dev background jobs in-process.
> Organized for agentic development: one repo, one world, one SQLite file.

**Date**: 2026-04-02
**Author**: Operator (OSTROM framing, /plan-and-analyze)
**Reference**: `grimoires/gecko/sovereign-stack-kickoff.md` (migration patterns)
**Template**: `0xHoneyJar/world-template`
**Constraint**: $5/mo. Own everything. Single deploy.

---

## I. What CubQuests Is

A Berachain faucet + quest platform. Users complete multi-step quests, earn resources (Fuel, Crystals, Quantum), participate in raffles, collect badges, and buy cosmetics. The platform drives engagement across the THJ ecosystem — quests can verify actions in Mibera, Henlo, and other products.

### Product Surface

```
/                    Landing
/login               Auth (Dynamic Labs wallet + social)
/quests              Multi-step quest list
/quests/[slug]       Individual quest with step tracking
/missions            Single-step missions
/raffles             Resource raffles
/raffles/[slug]      Individual raffle
/store               Cosmetics store (resource spending)
/collection/[id]     User collections / badge inventory
/leaderboard         Rankings
/blog                Content/posts
/polls               Community voting
/support             Support tools
```

### What Exists (The Current System)

| Layer | Technology | What It Does |
|-------|-----------|-------------|
| **Framework** | Next.js 15 (App Router) | SSR, routing, API routes |
| **Auth** | Dynamic Labs v4.43.0 | Wallet connection (EVM + Solana) |
| **Social Auth** | NextAuth | Twitter/Discord OAuth linking |
| **Database** | Supabase (Postgres) | All state: quests, resources, profiles, badges, raffles |
| **Migrations** | Supabase CLI | 79 migration files |
| **Background Jobs** | Trigger.dev v3 | Badge snapshots (hourly), IPFS uploads |
| **Crons** | Vercel Crons (5 jobs) | Daily snapshots, weekly raffles, daily store rotation, weekly missions |
| **Rate Limiting** | Upstash Redis | Quest/mission verification throttling |
| **Indexer** | thj-envio (Envio HyperIndex) | On-chain badge ownership queries |
| **Presence** | Convex (THJ Global) | Cross-app online presence (read-only client) |
| **On-chain** | Wagmi + Viem | Badge claiming, merkle proof verification |
| **Assets** | AWS S3 | Badge images, IPFS uploads |
| **Analytics** | Umami Cloud | Usage tracking |
| **Hosting** | Vercel | Production + preview deploys |

### External Service Dependencies

```
CRITICAL (data lives here):
  Supabase Postgres     → 79 migrations, all application state
  AWS S3                → badge images, IPFS uploads
  thj-envio             → on-chain badge holder queries (GraphQL)
  
REPLACEABLE (SDK/service, no state):
  Dynamic Labs          → wallet auth (replace with vanilla EIP-6963)
  NextAuth              → social OAuth (replace with SvelteKit auth)
  Vercel                → hosting + crons (replace with Railway + in-process)
  Trigger.dev           → background jobs (replace with in-process cron)
  Upstash Redis         → rate limiting (replace with in-memory or SQLite)
  Convex (THJ Global)   → presence heartbeat (keep as external client, or drop)
  
KEEP AS-IS (external APIs):
  Berachain RPC         → on-chain reads/writes
  Partner APIs          → Mibera + Henlo quest verification endpoints
```

---

## II. The Architecture Question

### Invariants (what MUST survive)

1. **Quest completion state** — users have earned resources and badges. This history cannot be lost.
2. **Badge merkle trees** — on-chain roots reference specific snapshots. Snapshot data must remain queryable.
3. **Resource ledger** — Fuel, Crystals, Quantum balances are the game economy. Ledger integrity is non-negotiable.
4. **Partner API contracts** — Mibera and Henlo call quest verification endpoints. These URLs must either stay alive or redirect.

### Blast Radius

```
cubquests-interface (Next.js)
  ├── Supabase Postgres ← 79 migrations, ALL state
  │   ├── activities (quests, missions)
  │   ├── user_activity_progress (completion tracking)
  │   ├── resource_ledger (user_resources, resource_transactions)
  │   ├── badges + badges_snapshot_mainnet (merkle snapshots)
  │   ├── raffles + raffle_entries
  │   ├── store + cosmetics
  │   ├── profiles + user preferences
  │   └── polls + poll_votes
  │
  ├── thj-envio (Envio HyperIndex) ← on-chain badge holders
  │   └── GraphQL: getBadgeHoldersFromEnvio()
  │
  ├── Trigger.dev ← 2 scheduled tasks
  │   ├── hourly-quest-badge-snapshot (merkle tree generation)
  │   └── upload-badge-ipfs (S3 → IPFS)
  │
  ├── Vercel Crons ← 5 scheduled jobs
  │   ├── /api/snapshot (daily badge snapshots)
  │   ├── /api/admin/cron/resource-raffles/draw (weekly)
  │   ├── /api/admin/cron/resource-raffles/provision (weekly)
  │   ├── /api/store/rotation (daily store rotation)
  │   └── /api/missions/rotation (weekly mission rotation)
  │
  ├── Dynamic Labs ← wallet auth
  ├── NextAuth ← social OAuth (Twitter/Discord linking)
  ├── Upstash Redis ← rate limiting
  ├── Convex (Global) ← presence (read-only, graceful failure)
  ├── AWS S3 ← badge images
  └── Partner APIs ← Mibera + Henlo verification
```

### What Breaks If We're Wrong

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Supabase export loses data | Users lose quest progress and resources | Export + verify row counts before cutover |
| Badge snapshots drift | Users can't claim earned badges | Freeze snapshots during migration, verify merkle roots match |
| Partner APIs break | Mibera/Henlo quests stop verifying | Keep old URLs alive (redirect) or coordinate API update |
| Cron jobs miss a cycle | Store doesn't rotate, raffles don't draw | Run migration during low-traffic window, verify crons fire post-deploy |

---

## III. Target Architecture

```
cubquests-world/                          ← one repo = one world
  ├── src/routes/                         ← rooms (SvelteKit pages)
  │   ├── (app)/                          ← main layout group
  │   │   ├── quests/                     ← multi-step quests
  │   │   │   └── [slug]/                 ← individual quest
  │   │   ├── missions/                   ← single-step missions
  │   │   ├── raffles/                    ← resource raffles
  │   │   │   └── [slug]/
  │   │   ├── store/                      ← cosmetics store
  │   │   ├── collection/[id]/            ← user collections
  │   │   ├── leaderboard/               ← rankings
  │   │   ├── blog/                       ← content
  │   │   ├── polls/                      ← community voting
  │   │   └── support/                    ← support tools
  │   ├── login/                          ← auth page
  │   └── api/                            ← server routes
  │       ├── platform/                   ← activities, badges, resources, store
  │       ├── users/[address]/            ← profiles, claims
  │       ├── cron/                       ← scheduled jobs (in-process)
  │       │   ├── badge-snapshot/         ← hourly merkle tree generation
  │       │   ├── raffle-draw/            ← weekly raffle draws
  │       │   ├── raffle-provision/       ← weekly provisions
  │       │   ├── store-rotation/         ← daily store rotation
  │       │   └── mission-rotation/       ← weekly mission rotation
  │       └── partner/                    ← Mibera + Henlo verification
  ├── src/lib/
  │   ├── db/                             ← Turso/Drizzle
  │   │   ├── schema.ts                   ← ALL tables (from 79 Supabase migrations)
  │   │   ├── queries/                    ← typed query modules
  │   │   └── index.ts                    ← db client
  │   ├── wallet.svelte.ts                ← vanilla EIP-6963 (from world-template)
  │   ├── auth/                           ← SvelteKit auth (replaces Dynamic + NextAuth)
  │   │   ├── social.ts                   ← Twitter/Discord OAuth
  │   │   └── wallet.ts                   ← SIWE or simple wallet auth
  │   ├── badges/                         ← merkle tree generation, snapshot logic
  │   ├── resources/                      ← resource ledger module
  │   ├── envio.ts                        ← thj-envio GraphQL client
  │   ├── s3.ts                           ← AWS S3 client (badge images)
  │   └── presence.ts                     ← Convex presence (optional, graceful failure)
  ├── scripts/                            ← ops
  │   ├── migrate-supabase.ts             ← Supabase → Turso data export
  │   ├── seed.ts                         ← dev seeding
  │   └── verify-migration.ts             ← row count + merkle root verification
  ├── drizzle/                            ← migration SQL files
  ├── Dockerfile                          ← multi-stage bun build
  └── data/                               ← static data (quest definitions if any)
```

**One process. One database. One deploy. One agent can see everything.**

---

## IV. Migration Targets

### A. Database: Supabase Postgres → Turso/Drizzle (SQLite)

**79 Supabase migrations → 1 Drizzle schema.**

The Supabase schema needs to be flattened into a single Drizzle schema.ts. Key tables:

| Table Group | Tables | Complexity |
|------------|--------|-----------|
| Activities | activities, activity_steps, activity_step_variants | MEDIUM — quest structure |
| User Progress | user_activity_progress, user_step_completions | MEDIUM — per-user tracking |
| Resources | user_resources, resource_transactions | HIGH — ledger integrity critical |
| Badges | badges, badges_snapshot_mainnet, badge_claims | HIGH — merkle trees, on-chain roots |
| Raffles | raffles, raffle_entries, raffle_winners | MEDIUM |
| Store | store_items, store_rotations, user_cosmetics | LOW |
| Profiles | profiles, user_preferences | LOW |
| Polls | polls, poll_options, poll_votes | LOW |

**Migration script** (`scripts/migrate-supabase.ts`):
1. Connect to Supabase Postgres via connection string
2. Export each table as JSON
3. Transform Supabase-specific types (UUIDs → text, timestamps → ISO)
4. Insert into Turso via Drizzle
5. Verify row counts match
6. Verify badge snapshot merkle roots haven't changed

**Supabase RPC functions**: Any stored procedures need to become Drizzle queries. Audit all `rpc()` calls in the codebase.

### B. Auth: Dynamic Labs → Vanilla Wallet

| Current | Target |
|---------|--------|
| Dynamic Labs SDK (v4.43.0) | Vanilla EIP-6963 (340 lines, from world-template) |
| NextAuth (Twitter/Discord) | SvelteKit OAuth (Twitter/Discord) |
| JWT auto-detection per environment | Session-based auth (SvelteKit hooks) |
| Cross-domain SSO via cookie domain | Per-world auth (simplification) |

**The Convex presence client** calls a THJ Global Convex deployment for cross-app online user counts. This is read-only with graceful failure. Keep it as an external HTTP client or drop it — zero migration complexity either way.

### C. Background Jobs: Trigger.dev + Vercel Crons → In-Process

All 7 scheduled jobs become SvelteKit cron routes:

| Job | Current | Frequency | Complexity |
|-----|---------|-----------|-----------|
| Badge snapshot | Trigger.dev | Hourly | HIGH — merkle tree generation, on-chain root setting |
| Badge IPFS upload | Trigger.dev | On-demand | MEDIUM — S3 → IPFS pipeline |
| Badge snapshot (alt) | Vercel cron | Daily | LOW — may overlap with Trigger.dev task |
| Raffle draw | Vercel cron | Weekly (Mon 00:00) | MEDIUM — random selection + resource distribution |
| Raffle provision | Vercel cron | Weekly (Mon 00:05) | LOW — setup for next week |
| Store rotation | Vercel cron | Daily (00:00) | LOW — rotate available items |
| Mission rotation | Vercel cron | Weekly (Mon 00:00) | LOW — rotate available missions |

**Implementation**: Use `node-cron` or SvelteKit scheduled hooks to run these in-process. The badge snapshot is the heaviest — it generates merkle trees and sets on-chain roots. This runs fine in a single process at CubQuests' traffic level.

### D. Hosting: Vercel → Railway ($5/mo)

Standard world-template deployment. Dockerfile (multi-stage bun build), Railway volume for SQLite persistence.

### E. Rate Limiting: Upstash Redis → In-Memory or SQLite

Current rate limiting uses Upstash Redis for quest/mission verification throttling. At CubQuests' traffic level (<100 visits/day per flatline review), in-memory rate limiting or a SQLite table is sufficient. Kills the Upstash dependency.

---

## V. Migration Sequence

### Phase 0: Preparation (no user impact)

1. **Schema audit**: Extract complete Supabase schema from 79 migrations. Generate Drizzle schema.ts.
2. **RPC audit**: Find all Supabase `rpc()` calls. Convert to Drizzle queries.
3. **Export script**: Write `scripts/migrate-supabase.ts` — export all tables to JSON.
4. **Verification script**: Write `scripts/verify-migration.ts` — row counts + merkle root integrity.
5. **Create repo**: Clone world-template → `0xHoneyJar/cubquests-world`.

### Phase 1: Build the World (parallel to production)

1. **Database**: Create Drizzle schema from Supabase audit. Run migrations on empty Turso DB.
2. **Auth**: Implement vanilla wallet + SvelteKit OAuth (Twitter/Discord).
3. **Routes**: Port each page from Next.js App Router → SvelteKit routes.
4. **API routes**: Port API endpoints (activities, badges, resources, store, users).
5. **Background jobs**: Implement 7 cron jobs as in-process scheduled tasks.
6. **Partner APIs**: Ensure Mibera/Henlo verification endpoints have same contract.
7. **Indexer client**: Port thj-envio GraphQL client.
8. **S3 client**: Port AWS S3 badge image operations.

### Phase 2: Data Migration (maintenance window)

1. **Freeze writes**: Put CubQuests in read-only mode (or pick low-traffic window).
2. **Export**: Run migrate-supabase.ts against production Supabase.
3. **Import**: Load data into Turso.
4. **Verify**: Run verify-migration.ts — check row counts, badge merkle roots, resource balances.
5. **DNS cutover**: Point cubquests.0xhoneyjar.xyz → Railway.
6. **Smoke test**: Verify quest completion, badge claiming, resource spending.
7. **Kill old**: Redirect old Vercel URL → new domain.

### Phase 3: Cleanup

1. **Archive**: `gh repo archive 0xHoneyJar/cubquests-interface`
2. **Cancel**: Supabase project (after backup verification), Trigger.dev, Upstash Redis.
3. **Update tracker**: Mark CubQuests as 🟢 DEPLOYED in sovereign-migration-tracker.md.
4. **Provision Terraform**: Add cubquests to Freeside world module (for eventual Freeside deploy).

---

## VI. Effort Estimate

| Task | Hours | Notes |
|------|-------|-------|
| Schema audit + Drizzle schema generation | 3-4h | 79 migrations → 1 schema |
| Export/import/verify scripts | 3-4h | Supabase → Turso data pipeline |
| SvelteKit route porting (12 routes) | 8-12h | Mechanical but thorough |
| API endpoint porting | 6-8h | activities, badges, resources, store, users |
| Auth replacement (Dynamic → vanilla wallet) | 3-4h | World-template pattern |
| Social OAuth (Twitter/Discord) | 2-3h | SvelteKit OAuth |
| Background jobs (7 cron tasks) | 4-6h | Badge snapshot is the heavy one |
| Partner API compatibility | 1-2h | Mibera/Henlo verification |
| Testing + smoke tests | 3-4h | End-to-end verification |
| Data migration + cutover | 2-3h | Maintenance window |
| **TOTAL** | **35-50h** | |

### Per flatline review insight

The flatline review noted that Next.js → SvelteKit rewrites are often 2x underestimated. The 35-50h range accounts for this. If we want Phase A savings immediately (move Next.js to Railway as-is), that's 1-2h and captures hosting cost elimination while the full rewrite proceeds.

---

## VII. Cost Impact

| Service | Current Monthly | After Migration |
|---------|----------------|-----------------|
| Vercel (hosting + crons) | $20-50 | $0 |
| Supabase (Postgres) | $25-50 | $0 |
| Trigger.dev | $10-25 | $0 |
| Upstash Redis | $0-10 | $0 |
| Dynamic Labs | $0-50 | $0 |
| Railway | $0 | $5 |
| Turso (free tier) | $0 | $0 |
| **Total** | **$55-185/mo** | **$5/mo** |

---

## VIII. Open Questions

1. **Convex presence**: Keep the THJ Global presence heartbeat or drop it? It's read-only and fails gracefully. Low effort to keep, zero value if nobody uses cross-app presence.
2. **Partner API coordination**: Do Mibera and Henlo need to update their quest verification URLs? Or can we redirect?
3. **Badge snapshot timing**: The hourly Trigger.dev task generates merkle trees. In-process cron at hourly frequency on a $5 Railway instance — acceptable? Badge claiming isn't time-sensitive.
4. **Solana wallet support**: Dynamic Labs currently supports Solana wallets. Vanilla EIP-6963 is EVM-only. Is Solana wallet support needed for CubQuests? (Berachain is EVM.)

---

## IX. Related Documents

| Document | Relevance |
|----------|-----------|
| [`grimoires/gecko/sovereign-stack-kickoff.md`](../sovereign-stack-kickoff.md) | Migration patterns (Convex → Turso, auth replacement) |
| [`grimoires/gecko/world-architecture.md`](../world-architecture.md) | Target repo structure |
| [`grimoires/gecko/specs/flatline-review-org-migration.md`](flatline-review-org-migration.md) | Risk assessment, especially R2 (rewrite estimates) |
| [`grimoires/gecko/sovereign-migration-tracker.md`](../sovereign-migration-tracker.md) | Master tracker — update when complete |
| [`grimoires/gecko/specs/rpc-migration.md`](rpc-migration.md) | RPC provider changes |
| `0xHoneyJar/world-template` | Clone target for new repo |
