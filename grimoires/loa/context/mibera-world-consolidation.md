# Mibera World Consolidation — Context Pack

> OSTROM structural analysis + GECKO ground truth.
> Everything a build session needs to consolidate the Mibera ecosystem.

**Date**: 2026-03-31
**Strategy**: SURVIVE. Conserve energy (money). Kaironic timing — strike when ready.
**Mode**: ARCH (Ostrom) + GECKO (ground truth)

---

## 1. What Exists Today

### Three Apps → One World

| App | URL | Stack | Database | Hosting | Status |
|-----|-----|-------|----------|---------|--------|
| **mibera-dimensions** | midi.0xhoneyjar.xyz | Next.js 15.4 | Convex (realtime) + Supabase (scoring) | Vercel | Primary experience |
| **mibera-honeyroad** | honeyroad.xyz / mibera.0xhoneyjar.xyz | Next.js 15.3 | Supabase | Vercel | Marketplace |
| **score-dashboard** | (internal) | Next.js 16.1 | Supabase (read-only view) | Unknown | View into score data |

### Supporting Services

| Service | What | Cost |
|---------|------|------|
| **thj-envio** (Mibera handlers) | 28 event handlers, 4 chains | $15-30/mo (portion of shared Envio) |
| **score-api** | Behavioral signals, Supabase | $15-30/mo (Railway) |
| **Trigger.dev** (Honeyroad) | VM image generation, HoneyGPT batch | $10-20/mo |
| **Dynamic Labs** | Wallet auth (shared project across both apps) | $0-100/mo |
| **QuikNode** (Honeyroad) | RPC for 4 chains | killing this (→ org RPC + public fallback) |

**Estimated current cost for Mibera ecosystem: $90-280/mo**
**Target cost as one sovereign world: $5-10/mo** (Railway + keep Trigger.dev temporarily)

---

## 2. Structural Decisions (Ostrom)

### Invariant: Mibera Identity

the thing that MUST survive this migration is the Mibera identity — 10,000 NFTs with dimensional data, behavioral signals, and community relationships. the scoring, the chat, the marketplace — those are features. the identity is the invariant.

### Decision 1: Primary Experience

**Dimensions is the front door.** Honeyroad is the marketplace wing. Score-dashboard becomes a `/scores` route. One world, multiple rooms.

```
mibera.world/                   ← Dimensions (social, identity, AI oracle)
mibera.world/market             ← Honeyroad (marketplace, VM, forum)
mibera.world/scores             ← Score dashboard (absorbed)
mibera.world/chat               ← Agora (already in Dimensions)
```

### Decision 2: Database Consolidation

| Current | Target | Migration |
|---------|--------|-----------|
| Convex (Dimensions realtime) | **Turso** (embedded replica) | Follow sovereign-stack-kickoff.md |
| Supabase (Dimensions scoring) | **Turso** (same DB, scoring tables) | Drizzle schema translation |
| Supabase (Honeyroad forum + marketplace) | **Turso** (same DB, marketplace tables) | Drizzle schema translation |
| Supabase (score-dashboard) | **Turso** (same DB, read queries) | Just change the query source |

One SQLite file. One Drizzle schema. All three apps' data in one place.

### Decision 3: Auth Migration

Dynamic Labs is shared across both apps. The plan: export the userbase and build on the sovereign stack with vanilla wallet + optional SSO.

**Phase 1**: Keep Dynamic temporarily. Both apps already share one Dynamic project.
**Phase 2**: Replace with vanilla EIP-6963 wallet + WebAuthn passkeys (same pattern as purupuru's progressive identity). Export Dynamic user data before cutting.
**Phase 3**: If SSO needed across worlds, that becomes a freeside-level service spec for jani.

Prior RFC exists — check mibera-dimensions or mibera-honeyroad issues for the original auth migration plan.

### Decision 4: Trigger.dev (VM Pipeline)

**Keep for now.** The VM image generation pipeline (Sharp → S3 → CloudFront) works. Moving in-process is a Phase 2 optimization. SURVIVE first.

When ready: either move to in-process Sharp/Canvas in SvelteKit server, or spec it as a freeside service (jani's ECS handles async workers naturally via NATS).

### Decision 5: Indexer

The Mibera chunk of thj-envio is the largest (28 handlers). This is Phase 4 in the envio decomposition plan — don't tackle it during the initial world consolidation.

**Phase 1**: Mibera world continues querying thj-envio's shared GraphQL endpoint. No change.
**Phase 2** (later): Extract Mibera handlers into a self-hosted indexer inside the world's `src/lib/wire/` module.

### Decision 6: Chain Strategy

Mostly Berachain today. Not attached to any chain. Sovereign — the world works regardless of which chain the contracts live on. viem supports any EVM chain. The indexer handles multi-chain. The frontend doesn't need to care.

---

## 3. Blast Radius Map (Ostrom)

### What Changes

| Artifact | Change | Risk |
|----------|--------|------|
| **mibera-dimensions/** (entire repo) | Becomes the base for mibera-world. Rewrite to SvelteKit. | HIGH — main product |
| **mibera-honeyroad/** (entire repo) | Features absorbed as rooms in mibera-world. | MEDIUM — marketplace features move |
| **score-dashboard/** (entire repo) | Absorbed as `/scores` route. | LOW — just a view |
| **Convex schema** (Dimensions) | Translated to Drizzle/Turso. ~40 functions. | MEDIUM — follow sovereign-stack patterns |
| **Supabase tables** (Dimensions scoring) | Translated to Drizzle/Turso. | LOW — read-heavy, simple queries |
| **Supabase tables** (Honeyroad forum/marketplace) | Translated to Drizzle/Turso. | MEDIUM — forum has threads/messages |
| **Dynamic Labs** | Keep Phase 1, replace Phase 2. | LOW (Phase 1) / MEDIUM (Phase 2) |
| **Trigger.dev** | Keep as-is. | ZERO (no change) |
| **thj-envio** | Keep querying shared endpoint. | ZERO (no change Phase 1) |
| **Vercel hosting** | → Railway. | LOW — adapter-node swap |

### What Does NOT Change

- thj-envio indexer (stays shared)
- Trigger.dev VM pipeline (stays external)
- score-api (stays as Railway service — scoring logic stays in score-api for now, absorb later)
- NFT contracts on-chain (immutable)
- Dynamic Labs (Phase 1)

---

## 4. Data Architecture

### Current Data Flow

```
Berachain/ETH/Base/OP contracts
        ↓ events
thj-envio (shared indexer, Envio hosted)
        ↓ GraphQL
┌─────────────────────────────────────────┐
│  mibera-dimensions    mibera-honeyroad  │
│  (Convex + Supabase)  (Supabase)        │
│         ↓                    ↓          │
│    score-api          Trigger.dev       │
│  (behavioral signals) (VM generation)   │
└─────────────────────────────────────────┘
        ↓ HTTP
   Dynamic Labs (auth)
        ↓ 
   Vercel (hosting)
```

### Target Data Flow

```
Berachain/ETH/Base/OP contracts
        ↓ events
thj-envio (keep querying — Phase 1)
        ↓ GraphQL
┌──────────────────────────────────┐
│        mibera-world              │
│   (SvelteKit + Turso/Drizzle)   │
│                                  │
│  /          ← Dimensions rooms   │
│  /market    ← Honeyroad rooms   │
│  /scores    ← Score dashboard    │
│  /chat      ← Agora             │
│                                  │
│  src/lib/db/     ← Turso        │
│  src/lib/score/  ← scoring view │
│  src/lib/market/ ← marketplace  │
│                                  │
│  Trigger.dev (external, keep)    │
│  Vanilla wallet (Phase 2)        │
└──────────────────────────────────┘
        ↓
   Railway ($5/mo)
```

---

## 5. Module Map (Target Repo Structure)

```
mibera-world/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte          ← shared shell, wallet, nav
│   │   ├── +page.svelte            ← Dimensions home (identity mirror)
│   │   ├── (dimensions)/           ← Dimensions rooms
│   │   │   ├── oracle/             ← AI oracle
│   │   │   ├── chat/               ← Agora
│   │   │   ├── profile/            ← identity, dimensional data
│   │   │   └── caravan/            ← partnerships
│   │   ├── (market)/               ← Honeyroad rooms
│   │   │   ├── vending-machine/    ← VM minting
│   │   │   ├── forum/              ← threads, messages
│   │   │   ├── presale/            ← presale phases
│   │   │   └── loans/              ← liquid backing
│   │   ├── scores/                 ← Score dashboard (absorbed)
│   │   └── api/
│   │       ├── sse/                ← realtime (replaces Convex subscriptions)
│   │       ├── chat/               ← AI oracle streaming
│   │       └── trigger/            ← Trigger.dev webhook (VM callbacks)
│   ├── lib/
│   │   ├── db/                     ← Turso/Drizzle
│   │   │   ├── schema.ts           ← merged: Convex + Supabase tables
│   │   │   └── queries/            ← typed reads
│   │   ├── score/                  ← scoring view (reads from same Turso)
│   │   ├── market/                 ← marketplace logic (from Honeyroad)
│   │   ├── indexer/                ← GraphQL client for thj-envio (Phase 1)
│   │   ├── design/                 ← oklch tokens, Mibera visual identity
│   │   ├── wallet.svelte.ts        ← Dynamic (Phase 1) → vanilla (Phase 2)
│   │   └── realtime.svelte.ts      ← SSE helper
│   └── hooks.server.ts             ← db init, crons
├── contracts/abis/                  ← Mibera contract ABIs
├── evals/                           ← if AI oracle quality eval needed
├── scripts/
│   ├── seed.ts                      ← pull from score-api + thj-envio → Turso
│   ├── export-dynamic.ts           ← export Dynamic Labs userbase (before Phase 2)
│   └── migrate-supabase.ts         ← one-time: Supabase → Turso data migration
├── grimoires/                       ← architecture docs
├── CLAUDE.md                        ← agent instructions
└── construct.yaml                   ← Mibera world construct identity
```

---

## 6. Migration Phases

### Phase 1: Scaffold + Dimensions (the core)

**What**: Create mibera-world repo from world-template. Port Dimensions features to SvelteKit + Turso. Keep Dynamic auth. Keep thj-envio queries.

**Schema**: Translate Convex tables (~40 functions) + Dimensions' Supabase scoring tables to Drizzle.

**Result**: Dimensions runs on sovereign stack. Honeyroad and score-dashboard still on old infra temporarily.

**Estimated effort**: 15-20h across 3-4 sessions.

### Phase 2: Absorb Honeyroad

**What**: Port Honeyroad's marketplace features as rooms in the mibera world. Forum threads/messages + presale phases + VM minting + loan interface move to Turso.

**Keep**: Trigger.dev stays external for VM generation.

**Schema**: Translate Honeyroad's Supabase tables to Drizzle (add to existing schema).

**Result**: Honeyroad routes work in mibera-world. Old Honeyroad repo archived.

**Estimated effort**: 10-15h across 2-3 sessions.

### Phase 3: Absorb Score Dashboard + Auth Migration

**What**: Score dashboard becomes `/scores` route (simple — just a view). Export Dynamic Labs userbase. Replace with vanilla EIP-6963 wallet.

**Result**: Zero Dynamic Labs dependency. Mibera world is fully sovereign.

**Estimated effort**: 5-8h across 1-2 sessions.

### Phase 4: Indexer Independence (later)

**What**: Extract Mibera's 28 handlers from thj-envio into a self-hosted indexer. Lives in `src/lib/wire/` or as a sidecar service.

**Result**: No dependency on shared thj-envio. Mibera world owns its entire data pipeline.

**Estimated effort**: 8-12h. Do this when the envio decomposition reaches the Mibera phase.

---

## 7. Execution Scripts

### Create the repo

```bash
gh repo create 0xHoneyJar/mibera-world --template 0xHoneyJar/world-template --private
cd mibera-world
bun install
```

### Seed from existing data

```bash
# Pull Dimensions Convex data (export before killing Convex)
bun scripts/export-convex.ts --deployment <convex-deployment-id> --output data/convex-export.json

# Pull Honeyroad Supabase data
bun scripts/export-supabase.ts --tables threads,messages,presale_phases,vm_orders --output data/supabase-export.json

# Import into Turso
bun scripts/seed.ts --source data/convex-export.json --source data/supabase-export.json
```

### Validate after each phase

```bash
bun dev                    # local dev boots
bun run build              # production build clean
bun scripts/verify.ts      # check: all routes render, wallet connects, data loads
railway up                 # deploy to Railway
```

---

## 8. What to Ask ZERGUCCI

Honeyroad has DeFi-adjacent features (liquid backing loans, presale phases). Check with ZERGUCCI:

- Are the liquid backing loan contracts still active? (MiberaLoan handlers in thj-envio)
- Is anyone using the P2P loan feature? Or is it dormant?
- PaddleFi integration — still active or dead?
- Any Trigger.dev tasks in Honeyroad that ZERGUCCI maintains?

---

## 9. Risk Assessment (Ostrom)

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Convex export loses data | LOW | HIGH | Export + verify row counts before killing Convex |
| Dynamic auth breaks during migration | LOW | MEDIUM | Keep Dynamic in Phase 1, only replace in Phase 3 |
| thj-envio goes down (shared dependency) | LOW | HIGH | Phase 4 gives independence, but not urgent |
| Trigger.dev VM pipeline breaks | LOW | LOW | Nobody's minting VMs right now (markets dead) |
| Forum data loss | LOW | LOW | Export Supabase before migration. Forum is low activity. |

**Overall risk**: LOW. Markets are dead. Apps are near-death. This is the clearing. The perfect time to rebuild from first principles.

---

## 10. Cost Comparison

| | Current | After Phase 1 | After Phase 3 | After Phase 4 |
|---|---------|-------------|-------------|-------------|
| Hosting | $40-100 (Vercel ×2) | $5 (Railway) | $5 | $5 |
| Database | $0-50 (Convex + Supabase) | $0 (Turso free) | $0 | $0 |
| Auth | $0-100 (Dynamic) | $0-100 (keep) | $0 (vanilla) | $0 |
| Indexer | $15-30 (thj-envio share) | $15-30 (keep) | $15-30 (keep) | $5 (self-hosted) |
| Trigger.dev | $10-20 | $10-20 (keep) | $10-20 (keep) | $0 (in-process) |
| RPC | $50-200 (QuikNode) | $0 (killed) | $0 | $0 |
| **Total** | **$115-500/mo** | **$30-155/mo** | **$20-55/mo** | **$10/mo** |

Endgame: $10/mo for the entire Mibera ecosystem. Endowment: $2,400 at 5% yield.

---

## Key References

| Topic | Location |
|-------|----------|
| World architecture pattern | `grimoires/gecko/world-architecture.md` |
| Sovereign stack migration | `grimoires/gecko/sovereign-stack-kickoff.md` |
| thj-envio decomposition | `grimoires/gecko/specs/org-sovereign-migration-plan.md` (Mibera section) |
| World template | `0xHoneyJar/world-template` |
| Dynamic Labs auth RFC | Check mibera-dimensions or mibera-honeyroad GitHub issues |
| Mibera stall directory entry | `grimoires/gecko/stall-directory.yaml` |
