# Org-Wide Sovereign Migration Plan

> Full diagnostic of 0xHoneyJar infrastructure. 266 repos audited.
> Target: cut costs, consolidate worlds, prepare for freeside distribution.

**Date**: 2026-03-31
**Constraint**: minimize monthly spend, own everything, prepare worlds for freeside

---

## Current Spend: $900-2,100/mo (estimated)

| Tier | Repos | Monthly Est. |
|------|-------|-------------|
| T1: Production products | 9 frontends on Vercel | $400-790 |
| T2: Backend services | 6 APIs on Railway/Envio | $100-250 |
| T3: AWS (Freeside) | 3 services on ECS | $380-1,000 |
| T4: Validator/Bot infra | 7 small services | $30-45 |
| T5: Dormant products | 10 rarely-used apps | $65-170 |
| T6: Zero-cost repos | 30+ constructs, contracts, tools | $0 |

---

## Migration Targets (by service)

### 1. Dynamic Labs → Vanilla Wallet (11 repos)

**SDK version spread**: 4.9.12 to 4.67.2 — 60+ minors apart. Unmaintainable.

| Repo | Current Version | Priority |
|------|----------------|----------|
| honey-interface | 4.20.10 | HIGH (main product) |
| apdao-auction-house | 4.45.0 | MEDIUM |
| mibera-dimensions | 4.67.2 | LOW (migrating to purupuru world) |
| mcv-interface | 4.61.3 | MEDIUM |
| mibera-honeyroad | 4.41.1 | LOW |
| cubquests-interface | 4.43.0 | MEDIUM |
| fat-bera-interface | 4.9.12 | LOW (oldest SDK) |
| set-and-forgetti | 4.41.1 | MEDIUM |
| hub-interface | 4.41.1 | MEDIUM |
| henlo-interface | 4.29.1 / 4.41.1 | LOW |

**Pattern**: copy `wallet.svelte.ts` from world-template (100 lines, EIP-6963). Each repo that migrates to SvelteKit gets vanilla wallet for free.

**Savings**: $0-300/mo depending on Dynamic plan. More importantly: eliminates vendor dependency and SDK version management burden.

### 2. Convex → Turso/Drizzle (6 repos)

| Repo | Tables | Functions | Priority |
|------|--------|-----------|----------|
| rektdrop-interface (sprawl) | 22 | 95 | **IN PROGRESS** (PRD written) |
| purupuru/world | 18 | 70 | **PLANNED** (kickoff written) |
| mibera-dimensions | dual (Convex + Supabase) | ~40 | MEDIUM |
| mcv-interface | primary DB | ~30 | MEDIUM |
| cubquests-interface | dual (Convex + Supabase) | ~30 | MEDIUM |
| henlo-interface | primary DB | ~20 | LOW |
| loa-constructs/explorer | 9 tables, 72 functions | 72 | EVALUATE (Next.js, different stack) |

**Pattern**: follow `sovereign-stack-kickoff.md`. Drizzle schema + SSE for realtime + in-process crons.

### 3. Vercel → Railway (10-18 repos)

Every product frontend currently on Vercel. Migrate as worlds consolidate.

**Approach**: don't migrate Vercel separately. When a product moves to the world architecture (SvelteKit + Turso), it deploys to Railway as part of that migration. Don't pay Vercel migration tax on apps that will be rewritten anyway.

**Exception**: honey-interface is the main product and may stay on Vercel/Next.js longer. Evaluate separately.

### 4. thj-envio → Per-World Indexers (1 monolith → 6 indexers)

See envio decomposition map above. Migration order:

| Phase | Split | Handlers | Consumer | Risk |
|-------|-------|----------|----------|------|
| 1 | **APDAO** | 6 | apdao-auction-house | LOW |
| 2 | **Henlo/S&F** | 17 | set-and-forgetti | MEDIUM |
| 3 | **FatBera/Validator** | 15 | honey-guard | MEDIUM |
| 4 | **Mibera** | 28 | mibera-dimensions, score, cubquests | HIGH |
| 5 | **HoneyJar Core** | 15 | honey-interface, mcv, cubquests, score | HIGH |
| DONE | **Purupuru** | 7+ | purupuru/world | thj-sonar already live |

Each per-world indexer self-hosts on Railway (docker-compose pattern from thj-sonar).

**Savings**: $50-100/mo (Envio managed) → $5/mo (self-hosted on Railway per world).

### 5. Supabase (18 repos — evaluate per-repo)

Supabase is used across 18 repos. Not all need migration.

| Action | Repos | Reasoning |
|--------|-------|-----------|
| **Migrate to Turso** | repos converting to sovereign stack (rektdrop, purupuru, new worlds) | World architecture uses Turso |
| **Keep Supabase** | score-api, score-puru (already working, shared Supabase instance) | Don't migrate what works |
| **Evaluate** | honey-interface, cubquests, mibera-dimensions, honeyroad | Depends on whether these become worlds or stay Next.js |
| **Kill** | inactive repos still paying for Supabase instances | Audit which instances are actually running |

### 6. Trigger.dev (6 repos — evaluate)

| Repo | Tasks | Keep/Replace |
|------|-------|-------------|
| honey-guard-interface | 11 tasks (validator ops) | KEEP — complex scheduled jobs, Trigger.dev earns its keep |
| mibera-honeyroad | VM generation pipeline | EVALUATE — could be in-process cron |
| score-api | data pipeline tasks | EVALUATE — could be in-process |
| score-puru | scoring tasks | EVALUATE — could be in-process |
| cubquests-interface | quest verification | EVALUATE — could be in-process |
| buy-n-burn | automated burns | KEEP — sensitive financial operations |

### 7. QuikNode (2 repos)

honey-interface and mibera-honeyroad use QuikNode. Replace with public RPC + fallback pattern from `honey-interface/components/web3-provider.tsx:26` (chainTransport pattern).

**Savings**: $50-200/mo.

---

## Idle Services to Kill

Based on your guidance: if nobody complains, it's idle. Kill it.

| Service | What it is | Action |
|---------|-----------|--------|
| **clawdbot** (Fly.io) | Bot — last meaningful commit weeks ago | Check usage, likely KILL |
| **loa-beauvoir** (Fly.io) | Bot — Gecko intelligence | Check usage, likely KILL |
| **ruggy-moltbot** (CF Workers) | Bot | Check usage, likely KILL |
| **community-interface** | Community dashboard | Check if anyone visits |
| **score-dashboard** | Score visualization | Check if anyone visits |
| **arrakis-web** | Freeside marketing page | Check if linked from anywhere |
| **mibera-landing** | Mibera landing page | Check if redirects exist |
| **miberastrology-new** | Astrology feature | Check if active |
| **henlo-interface** (standalone) | Duplicates henlo-monorepo | Likely KILL (duplicate) |
| **fatbera-withdrawal-monitor** (Railway) | Validator bot | Check with ZERGUCCI if still needed |
| **validator-auto-reward-railway** | Validator bot | Check with ZERGUCCI if still needed |
| **fatBERA-validator-depositor** | Validator bot | Check with ZERGUCCI if still needed |

**Savings**: $30-100/mo from killing idle services.

---

## World Consolidation Map

Per `world-architecture.md` — each product becomes a self-contained world repo.

| World | Absorbs | From | Priority |
|-------|---------|------|----------|
| **sprawl/rektdrop** | score, wire, world → src/lib/ | sprawl-protocol org (4→1) | IN PROGRESS |
| **purupuru** | score, sonar, puru, fukuro, observatory → src/lib/ | project-purupuru org (9→3) | PLANNED |
| **henlo** | henlo-monorepo apps + set-and-forgetti vault indexer | 0xHoneyJar (2→1) | MEDIUM |
| **mibera** | mibera-dimensions + honeyroad + mibera indexer | 0xHoneyJar (3→1) | MEDIUM (complex) |
| **apdao** | apdao-auction-house + apdao indexer | 0xHoneyJar (2→1) | LOW |
| **aphive** | new project (El Capitan) | fresh start | PLANNED |
| **honey** | honey-interface (main product) | 0xHoneyJar | LAST (most complex, most users) |

---

## Deploy Pipeline

### Now: Railway ($5/mo per world)
Each world = one Railway service + one SQLite volume. Fast DX, independent.

### Next: Freeside (~$1/mo per world)
Each world = one ECS task on jani's shared AWS cluster. Marginal cost near-zero because ALB/RDS/Redis already paid.

### Endgame: Distribution Platform
External builders deploy worlds on freeside. Revenue: $1/mo × N worlds.

**Spec needed for jani:**
1. ECS task definition template for world containers
2. Database strategy (shared RDS schemas vs Turso on EFS)
3. ALB host-based routing rules for per-world subdomains
4. Secrets Manager integration for per-world env vars

---

## Priority Sequence

### Phase 1 (Now — in progress)
- [x] Sprawl consolidation (4→1 repo)
- [x] Rektdrop Convex → Turso migration (PRD written)
- [x] World template published
- [ ] Purupuru consolidation (9→3 repos)
- [ ] Kill idle bots/services (audit first)

### Phase 2 (Next)
- [ ] thj-envio: split APDAO indexer (lowest risk)
- [ ] thj-envio: split Henlo/S&F indexer
- [ ] QuikNode → public RPC + fallback
- [ ] Dynamic Labs audit — which repos need it, which can go vanilla

### Phase 3 (Medium term)
- [ ] thj-envio: split FatBera/Validator indexer
- [ ] thj-envio: split Mibera indexer (highest complexity)
- [ ] Henlo world consolidation
- [ ] Mibera world consolidation
- [ ] Dynamic Labs → vanilla wallet in remaining repos

### Phase 4 (Long term)
- [ ] HoneyJar Core indexer (stays shared longest)
- [ ] honey-interface evaluation (biggest product, most complex)
- [ ] Freeside world hosting spec
- [ ] Distribution platform launch

---

## Key References

| Document | Purpose |
|----------|---------|
| `grimoires/gecko/world-architecture.md` | The modular world pattern |
| `grimoires/gecko/sovereign-stack-kickoff.md` | Convex → Turso migration guide |
| `grimoires/gecko/kickoff-purupuru-migration.md` | Purupuru-specific plan |
| `grimoires/gecko/specs/kickoff-sprawl-consolidation.md` | Sprawl-specific plan |
| `grimoires/the-easel/specs/kickoff-aphive.md` | apHive build spec |
| `rektdrop-interface/grimoires/loa/prd.md` | Rektdrop migration PRD |
| `0xHoneyJar/world-template` | The starter template |
