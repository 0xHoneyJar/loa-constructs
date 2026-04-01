# PRD: Core App Migration — CubQuests, Honeyroad, APDAO Auction House

**Version**: 1.0.0
**Date**: 2026-04-01
**Status**: Draft
**Author**: soju + Claude (discovering-requirements)
**Strategy**: SURVIVE. Conserve money. Migrate once to sovereign stack.

---

## 1. Problem Statement

Three core apps run on expensive, fragmented infrastructure that violates the sovereign stack constraint:

| App | Current Cost | Hosting | Database | Auth | Pain Points |
|-----|-------------|---------|----------|------|-------------|
| **cubquests-interface** | $50-100/mo | Vercel | Supabase (35 tables) + Convex (presence only) | Dynamic 4.43 | 6 dead deps, 5 Vercel crons, Trigger.dev |
| **mibera-honeyroad** | $60-120/mo | Vercel | Supabase | Dynamic 4.41 | QuikNode ($50-200), Trigger.dev VM pipeline, Cloudinary |
| **apdao-auction-house** | $40-80/mo | Vercel | Supabase (13 tables) | Dynamic 4.45 | Heavy governance, 30 Radix packages |

**Combined current cost**: $150-300/mo
**Target**: $15/mo total ($5/mo x 3 deploy targets)

---

## 2. Goals

| Goal | Metric | Target |
|------|--------|--------|
| **Cost** | Monthly infra for these 3 apps | $15/mo |
| **DX** | `bun dev` boots entire stack | Zero extra processes |
| **Deploy** | `git push` deploys everything | No Vercel, no Convex |
| **Vendors** | External services per app | 2 max (Railway + Turso sync) |
| **Agent-legible** | One repo, one DB, standard SQL | Agent traverses without SDK knowledge |

### Non-Goals

- Feature parity on day 1 (features defer by phase)
- Historical data migration (fresh start — markets are dead)
- Backwards compatibility (announce maintenance, break things)
- Maintaining Next.js (straight to SvelteKit for all 3)

---

## 3. Where Each App Goes

### CubQuests → Lightweight Service (→ eventually freeside)

CubQuests is cross-cutting — quest verification spans all worlds (checks Action entities from every app). It's NOT a world. It stays as a lightweight SvelteKit service on Railway, eventually folding into freeside's discord quests/missions/POAPs infrastructure.

**Migrate**: verification engine, resource economy, badge pipeline, raffle system, store
**Kill**: 6 dead deps, Solana wallets, SimpleHash, Alchemy, DataFast, Convex presence, 20+ legacy tables
**Defer**: polls, blog/MDX, sound engine

**Schema**: 35 Supabase tables → ~15 essential Turso/Drizzle tables
**Envio**: keeps querying thj-envio shared endpoint (queries Action, TrackedHolder, TrackedTokenBalance, BadgeHolder)
**Crons**: 5 Vercel crons + 2 Trigger.dev tasks → 7 in-process crons

### Honeyroad → mibera-world Phase 2

Already spec'd in `mibera-world-consolidation.md`. Honeyroad features become rooms in mibera-world.

**Migrate**: /market, /market/forum, /market/presale, /market/loans
**Keep external**: Trigger.dev VM pipeline (active — people still mint)
**Kill**: QuikNode → proxied org RPC, Cloudinary → R2/S3
**Defer**: thj-envio Mibera split (Phase 4 of envio decomposition)

### APDAO Auction House → apdao-world

New world housing auction house + aphive treasury (El Capitan). Created from world-template.

**Phase 1 — Auction Core** (40% of codebase):
- Perpetual auction (bid, settle, queue system)
- Membership/seat management
- Treasury balance display
- Loan system
- 3 Envio queries → self-hosted APDAO indexer

**Phase 2 — Governance** (35%): proposals, voting, delegation, TipTap editor
**Phase 3 — Bridge** (15%): 7-collection LayerZero V2 bridge (may stay separate)
**Cut**: AI governance chat, dead dependencies

**Schema**: 13 Supabase tables → ~10 essential Turso/Drizzle tables
**Contracts**: 4 ABIs (AuctionHouse, MemberToken, Treasury, WETH) on Berachain
**Design**: oklch, Space Grotesk, Nohemi — already documented for aphive, directly portable

---

## 4. Envio APDAO Split (proof of pattern)

Extract 6 handlers from thj-envio as the FIRST envio decomposition:

```
AuctionCreated, AuctionBid, AuctionExtended,
AuctionSettled, TokensAddedToAuctionQueue, TokensRemovedFromAuctionQueue
```

Entities: ApdaoAuction, ApdaoBid, ApdaoQueuedToken

Deploy: Railway (docker-compose, thj-sonar pattern). After split, apdao-world queries its own indexer.

---

## 5. Execution Phases

### Phase 0: Envio APDAO Split (1-2 sessions)

Copy thj-sonar docker-compose pattern. Extract 6 APDAO handlers. Deploy to Railway. Verify data matches.

Proves the envio decomposition pattern.

### Phase 1: apdao-world Auction Core (2-3 sessions)

1. Create repo from world-template + mount Loa
2. Translate 10 Supabase tables to Drizzle
3. Port auction routes to SvelteKit (bid, settle, queue, membership, treasury, loans)
4. Wire viem contract reads (4 ABIs)
5. Wire Envio queries to self-hosted indexer
6. Port design system (oklch, Space Grotesk, Nohemi)
7. Vanilla wallet (replace Dynamic)
8. Deploy to Railway

### Phase 2: mibera-world Honeyroad (2-3 sessions)

Per `mibera-world-consolidation.md` Phase 2:
1. Port marketplace routes
2. Merge Honeyroad Supabase tables into mibera Turso schema
3. Keep Trigger.dev external
4. Kill QuikNode → proxied org RPC

### Phase 3: CubQuests Service (3-4 sessions)

Largest migration:
1. Scaffold from world-template
2. Translate ~15 essential tables
3. Port verification engine (Action entity queries)
4. Port resource economy (atomic Drizzle transactions)
5. Port badge snapshot pipeline (in-process cron)
6. Port raffle + store
7. Deploy to Railway

### Phase 4: Cleanup (1 session)

Archive old repos. Kill Vercel. Cancel Supabase. Remove Dynamic. Cancel QuikNode. Update DNS.

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SQLite backup | Turso cloud sync MANDATORY for all services |
| RPC exposure | Proxy org node. Never expose IP in client bundles. |
| Rewrite estimates | APDAO Phase 1 (auction only) = manageable. CubQuests = largest, budget 3-4 sessions. |
| Supabase export | Write export scripts FIRST. Test on dev. RPC functions need manual Drizzle translation. |
| Dynamic wallet | All 3 use connect-and-sign only. No embedded wallets. Vanilla wallet is clean replacement. |
| CubQuests RPC functions | `apply_resource_mutation`, `complete_activity_step_tx`, etc. are Supabase stored procedures. Must be translated to Drizzle transactions manually. |

---

## 7. Key References

| Topic | Location |
|-------|----------|
| World architecture | `grimoires/gecko/world-architecture.md` |
| Sovereign stack guide | `grimoires/gecko/sovereign-stack-kickoff.md` |
| Mibera consolidation | `grimoires/loa/context/mibera-world-consolidation.md` |
| Flatline review | `grimoires/gecko/specs/flatline-review-org-migration.md` |
| Org migration plan | `grimoires/gecko/specs/org-sovereign-migration-plan.md` |
| APDAO design system | `grimoires/the-easel/specs/aphive-design-direction.md` |
| World template | `0xHoneyJar/world-template` |
| RPC migration | `grimoires/gecko/specs/rpc-migration.md` |

---

## Next Step

`/architect` → SDD for each migration target, starting with APDAO (simplest, envio split included).
