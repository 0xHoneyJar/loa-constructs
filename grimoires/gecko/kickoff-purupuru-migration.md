# Kickoff: Purupuru World — Sovereign Stack Migration

> Migrate purupuru/world from Convex to Turso/Drizzle. Score logic moves in-process.
> Organized for agentic development: one repo, one world, one SQLite file.

**Date**: 2026-03-31
**Reference**: `grimoires/gecko/sovereign-stack-kickoff.md` (migration patterns)
**Rektdrop PRD**: `rektdrop-interface/grimoires/loa/prd.md` (parallel migration, same patterns)
**Constraint**: $5/mo. Own everything. Single deploy.

---

## The Architecture Question (answered)

"Do we use microservices?"

No. Microservices scatter context across N repos. An agent can't see the whole system. The frontier pattern is **"worlds with embedded services"**:

```
purupuru-world/                    ← one repo = one world
  ├── src/routes/                  ← rooms (SvelteKit pages)
  │   ├── (door)/                  ← The Door (/)
  │   ├── bazi/                    ← The Mirror (/bazi)
  │   ├── collection/              ← The Gallery (/collection)
  │   ├── me/                      ← The Alcove (/me)
  │   ├── world/                   ← The Continent (/world)
  │   ├── make/                    ← The Workshop (/make)
  │   ├── battle/                  ← The Arena (/battle)
  │   ├── chat/                    ← The Teahouse (/chat)
  │   ├── station/                 ← The Station (/station)
  │   └── api/                     ← server routes (REST + SSE)
  │       ├── sse/wallet/          ← per-wallet realtime
  │       ├── sse/global/          ← world-wide realtime
  │       ├── claim/               ← ECDSA signature for genesis
  │       ├── paymaster/           ← CDP paymaster proxy
  │       ├── chat/                ← Sky Eyes AI streaming
  │       └── score/               ← scoring logic (IN-PROCESS, not external)
  ├── src/lib/
  │   ├── db/                      ← Turso/Drizzle (one SQLite file)
  │   │   ├── schema.ts            ← 18 tables
  │   │   ├── queries/             ← typed queries
  │   │   └── index.ts             ← db client
  │   ├── wallet.svelte.ts         ← vanilla EIP-6963 (from sprawl)
  │   ├── realtime.svelte.ts       ← SSE subscriptions (from sprawl)
  │   ├── score/                   ← scoring module (was score-api)
  │   │   ├── engine.ts            ← WRS computation
  │   │   ├── factors.ts           ← 74 computed factors
  │   │   └── bazi.ts              ← Four Pillars calculation
  │   ├── battle/                  ← Wuxing battle logic
  │   ├── puru/                    ← UI components
  │   └── auth/                    ← progressive identity
  ├── contracts/                   ← Foundry (13 contracts)
  ├── scripts/                     ← ops (seed, migrate, balance)
  ├── evals/                       ← Sky Eyes AI eval harness
  ├── mcp/                         ← MCP server (agent-queryable)
  ├── drizzle/                     ← migration SQL files
  └── data/                        ← static data (catalog, elements)
```

**One process. One database. One deploy. One agent can see everything.**

The score engine (currently external) becomes `src/lib/score/` — a module, not a service. The 74 computed factors, the WRS computation, the Bazi calculations — all run in the same SvelteKit server process, reading from the same SQLite file. Zero network calls for scoring.

---

## Current State (What Exists)

### Convex Surface (from inventory)

| Metric | Count |
|--------|-------|
| Tables | 18 |
| Functions | 70 (41 queries, 27 mutations, 2 actions) |
| Crons | 1 (WRS snapshot, daily) |
| Realtime subs | 6 |
| Vector search | Yes (custom — Gemini embeddings, cosine similarity) |
| File storage | No (external CDN) |

### Tables to Migrate

**Identity & Journey** (the core — most complex):
| Table | Cols | Notes |
|-------|------|-------|
| `worldIdentity` | 12 | Progressive: anonymous → element → passkey → wallet. Session UUID in localStorage. |
| `doorVisits` | 5 | Journey memory — which rooms visited, when, element at time |
| `battleResults` | 6 | Win/loss/draw per wallet |
| `packBalances` | 3 | Off-chain pack counts |
| `cardOwnership` | 4 | Off-chain card ownership |

**Chat (Sky Eyes)**:
| Table | Cols | Notes |
|-------|------|-------|
| `chatSessions` | 10 | AI conversation sessions |
| `chatMemory` | 4 | Per-visitor accumulated knowledge (key-value) |
| `chatProfiles` | 7 | Team member profiles for multiplayer |
| `feedback` | 8 | Per-page multiplayer chat/review |

**Assets & Config**:
| Table | Cols | Notes |
|-------|------|-------|
| `assetCatalog` | 14 | Synced from catalog.json |
| `assetVectors` | 3 | 3072-dim Gemini embeddings. Move to SQLite vec or keep as JSON column. |
| `assetSets` | 5 | Curated asset groups |
| `cardConfigs` | 7 | Card layer compositions |
| `designTokens` | 6 | Live design overrides |
| `worldState` | 3 | Key-value coherence state |
| `garageConfig` | 4 | Legacy sky-eyes config |

### Frontends Sharing Convex

Currently TWO frontends hit the same Convex:
- `sites/world` — SvelteKit (main consumer app)
- `sites/app` — Next.js (secondary, i18n, drag-and-drop)

**Decision**: the Next.js app (`sites/app`) gets cut OR becomes a static landing page. One world = one framework = SvelteKit. The Next.js app's features (i18n, dnd-kit card arrangement) can be rebuilt in SvelteKit if needed.

### Score Logic Location

Currently scoring is:
- WRS computation in `convex/reflection.ts`
- Bazi calculation via `lunar-typescript`
- Asset semantic search via Gemini embeddings
- Factor computation is NOT in purupuru — it's in the external Score API

**Migration**: WRS + Bazi + semantic search move into `src/lib/score/`. Factor computation from Score API moves in later (or stays as a pull oracle like rektdrop does).

---

## Migration Plan (Phases)

### Phase 0: Kill the Next.js app (1h)

Before migrating anything, simplify the repo. `sites/app` (Next.js) is a second frontend hitting the same Convex. Cut it.

- [ ] Move any unique features from `sites/app` to `sites/world` (check: i18n, dnd-kit, any pages not in world)
- [ ] Remove `sites/app` directory
- [ ] Remove Next.js root package.json (if it's the "garage" layer)
- [ ] Flatten: `sites/world` becomes the root (or stays as-is if monorepo structure serves MCP + contracts)

### Phase 1: Schema (2h)

Translate 18 Convex tables to Drizzle/SQLite.

Follow the exact pattern from `sovereign-stack-kickoff.md` Part 2.

Key decisions:
- `worldIdentity.passkey` stores P256 public key — `text` column, base64 encoded
- `assetVectors` stores 3072-dim embeddings — `text` column with JSON array, or SQLite vec extension
- `doorVisits.elementAtTime` — enum column or text with check constraint
- All timestamps as `integer` (unix epoch) for SQLite compatibility

```bash
bun add drizzle-orm @libsql/client
bun add -d drizzle-kit
# Create src/lib/db/schema.ts
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### Phase 2: Queries + Mutations (3h)

70 Convex functions → Drizzle queries + SvelteKit server routes.

**Queries** (41): Most are simple lookups by address or session ID. Become Drizzle `select()` calls in `src/lib/db/queries/`.

**Mutations** (27): Become SvelteKit server routes in `src/routes/api/`. The progressive identity mutations (session → element → passkey → wallet) are the most complex — they do conditional upserts with merge logic.

**Actions** (2): External API calls. Become SvelteKit server routes. The Gemini embedding action stays as-is (just calls the API from a server route instead of a Convex action).

### Phase 3: Progressive Identity (2h — most complex)

This is the trickiest migration. The progressive identity system:

```
anonymous (session UUID in localStorage)
  → element-aware (Bazi reading stored)
  → passkey-linked (WebAuthn P256 credential)
  → wallet-linked (EIP-6963 address)
```

Currently wired through Convex mutations with merge logic (when a wallet connects, it needs to merge the anonymous session's journey data with the wallet address).

**Migration approach**:
1. Session UUID stays in localStorage (no change)
2. `worldIdentity` table in Turso replaces Convex
3. Server routes handle the merge: `POST /api/identity/link-element`, `POST /api/identity/link-passkey`, `POST /api/identity/link-wallet`
4. The merge mutation (anonymous → wallet) becomes a Drizzle transaction:
   ```typescript
   await db.transaction(async (tx) => {
     // Find anonymous session
     // Find existing wallet identity (if any)
     // Merge journey data (doorVisits, battleResults)
     // Update worldIdentity with wallet address
   })
   ```

### Phase 4: Realtime (1h)

6 Convex subscriptions → SSE.

| Subscription | SSE Endpoint | Poll Rate |
|-------------|-------------|-----------|
| `feedback.list` (multiplayer chat) | `/api/sse/feedback?page=X` | 2s |
| `identity.get` | `/api/sse/identity?session=X` | 5s |
| `cards.list` | Not SSE — load function on page load | — |
| `cards.byElement` | Not SSE — load function on page load | — |

Most of these don't actually need realtime. Only the multiplayer feedback/chat needs SSE. Cards and identity can be loaded once and updated on mutation response.

### Phase 5: Score Engine (2h)

Move scoring into the world:

1. **WRS computation** (`convex/reflection.ts` → `src/lib/score/engine.ts`): reads doorVisits + battleResults + chatSessions from Turso, computes composite score.
2. **Bazi calculation** (already uses `lunar-typescript`): stays in `src/lib/score/bazi.ts`. No change except it reads from Turso instead of Convex.
3. **Asset semantic search**: Two options:
   - **Simple**: keep embeddings as JSON text column, compute cosine similarity in TypeScript (same as current Convex action, just in a server route)
   - **Better**: use Turso's SQLite vec extension for native vector ops

### Phase 6: Crons (15min)

1 Convex cron → in-process:

```typescript
// src/hooks.server.ts
import cron from 'node-cron'

cron.schedule('0 0 * * *', async () => {
  await snapshotWRS(db) // Daily WRS snapshot
})
```

### Phase 7: MCP Server (30min)

The existing MCP server (`mcp/index.ts`) currently reads from Convex via HTTP client. Update to read from Turso directly:

```typescript
// Before: const client = new ConvexHttpClient(url)
// After:  import { db } from '../src/lib/db'
```

The 9 tools and 9 resources stay the same. Only the data source changes.

### Phase 8: Cleanup (30min)

- [ ] Remove `convex/` directory (all files)
- [ ] Remove `convex` + `convex-svelte` from package.json
- [ ] Remove `convex.svelte.ts` adapter
- [ ] Remove Convex environment variables
- [ ] Remove `nvm use` workarounds
- [ ] Update CLAUDE.md (remove Convex references)
- [ ] Update MCP server data source
- [ ] Deploy to Railway (or Vercel — existing deploy target)

---

## Estimated Effort

| Phase | Hours | Complexity |
|-------|-------|------------|
| 0. Kill Next.js app | 1h | Low |
| 1. Schema | 2h | Low |
| 2. Queries + Mutations | 3h | Medium |
| 3. Progressive Identity | 2h | **High** (merge logic) |
| 4. Realtime | 1h | Low (most don't need SSE) |
| 5. Score Engine | 2h | Medium |
| 6. Crons | 15min | Trivial |
| 7. MCP Server | 30min | Low |
| 8. Cleanup | 30min | Low |
| **Total** | **~12h** | 2-3 sessions |

---

## What About the Contracts?

The 13 Foundry contracts (PurupuruGenesis, PuruCard, PuruPack, PackOpener, SoulEngine, etc.) are **unaffected**. They're on Base, deployed, immutable. The frontend reads them via viem — that doesn't change. The `contracts/` directory stays exactly where it is.

The wallet module already uses vanilla wagmi/core adapted for SvelteKit. When migrating, swap to the sprawl-pattern pure viem approach if cleaner, or keep wagmi/core if it works.

---

## What About Fukuro (Sky Eyes Eval)?

`sites/fukuro` is the AI eval harness. It currently reads from Convex to get chat sessions for evaluation. After migration, point it at Turso instead. The eval logic (question generation, LLM-as-judge, friction detection) stays the same.

If fukuro is SvelteKit, it can share the same Drizzle schema import. If it's a standalone script, give it its own `@libsql/client` connection to the same Turso database.

---

## Parallel with Rektdrop

Both migrations follow the same patterns from `sovereign-stack-kickoff.md`:

| Pattern | Rektdrop | Purupuru |
|---------|----------|----------|
| Tables | 22 | 18 |
| SSE endpoints | 2 (wallet + global) | 2 (identity + feedback) |
| Score integration | Pull oracle (external) | In-process module |
| Identity | Wallet = identity | Progressive (session → element → passkey → wallet) |
| Biggest complexity | Daemon AI + ASH economy | Progressive identity merge |
| Estimated hours | 15-20h | ~12h |

Share learnings between the two. The SSE pattern, Drizzle schema conventions, realtime.svelte.ts helper — write once in rektdrop, copy to purupuru.

---

## Constructs to Install

```bash
npx loa-cli install artisan     # UI design (element-specific physics)
npx loa-cli install protocol    # Contract verification (13 contracts on Base)
npx loa-cli install rosenzu     # Navigation (rooms: door, mirror, gallery, etc.)
npx loa-cli install kansei      # Animation + interaction (per-element springs/haptics)
npx loa-cli install the-arcade  # Game design (Wuxing battle, soul evolution, crafting)
npx loa-cli install k-hole      # Deep research (if exploring new game mechanics)
```

---

## Session Pointer (paste into purupuru-world repo)

```
# Purupuru World — Sovereign Stack Migration

You are migrating purupuru/world from Convex to Turso/Drizzle on the sovereign stack.
No one is using this app — you can break things. No backwards compatibility needed.

Read the full migration plan:
@grimoires/gecko/kickoff-purupuru-migration.md (in loa-constructs repo)

Read the sovereign stack patterns:
@grimoires/gecko/sovereign-stack-kickoff.md (in loa-constructs repo)

Read the parallel rektdrop PRD (same patterns, ahead of you):
@grimoires/loa/prd.md (in rektdrop-interface repo)

Stack: SvelteKit 5 + Turso/Drizzle + Railway. $5/mo.
Biggest risk: progressive identity merge logic (Phase 3).
Start with Phase 0 (kill Next.js app) and Phase 1 (schema).
```

---

*This document is the source of truth for purupuru migration. The sovereign-stack-kickoff.md has the universal patterns. The rektdrop PRD has the parallel migration spec.*
