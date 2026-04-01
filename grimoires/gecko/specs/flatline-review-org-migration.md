# Flatline Review: Org-Wide Sovereign Migration

> Adversarial review by Opus. 3 blockers, 11 risks, 9 gaps.
> Verdict: CONDITIONAL PROCEED — fix blockers, then execute sprawl first.

**Date**: 2026-04-01
**Reviewer**: Opus (adversarial posture)
**Scope**: world-architecture, sovereign-stack-kickoff, org-migration-plan, sprawl consolidation, mibera consolidation, RPC migration

---

## BLOCKERS (fix before proceeding)

### B1: SQLite Backup Strategy is Missing

Railway volumes persist across deploys but have NO backup, NO replication, NO disaster recovery. For apps with financial data (ashLedger), this is unacceptable.

**Fix**: Make Turso cloud sync MANDATORY for any world with user data. Embedded replica = local reads + cloud writes. This gives both low-latency reads AND durable storage. Alternatively, add Litestream → S3 backup. Document the recovery procedure.

### B2: RPC Exposes Raw IP in Client Bundles

The org-owned node IP (`57.128.210.178:8545`) is set as `NEXT_PUBLIC_*` env var — visible in client JavaScript. Anyone can DDoS the node. No rate limiting, no auth, no reverse proxy.

**Fix**: Put a reverse proxy (Cloudflare or nginx) in front of the node. Use a domain name, not raw IP. For client-side calls, proxy through the world's own API endpoint. Never expose node IPs in `NEXT_PUBLIC_` variables.

### B3: Write Concurrency Under Load

SQLite single-writer + Turso embedded replicas mean every write is a network round-trip to Turso cloud. Under concurrent mutations (500 users, markets come back), writes serialize and latency spikes.

**Fix**: Document the write throughput ceiling. Profile heaviest write paths. For rektdrop: leaderboard batch refresh + concurrent user mutations is the stress case. This is acceptable for current near-zero traffic but must be understood.

---

## KEY RISKS

### R1: SSE is Not a Drop-In for Convex Realtime (MEDIUM-HIGH)

The 30-line SSE example polls on interval. With 200 concurrent connections × 5s polling × 11 subscriptions = 440 queries/second. No write-triggered push, no `id:` field for reconnection, no connection limit documentation.

**Fix**: Implement write-triggered SSE push (mutation signals SSE subscribers via in-process EventEmitter). Eliminates polling and stale data. Add `id:` field for reconnection.

### R2: Next.js → SvelteKit Rewrite Estimates are 2x Too Low (HIGH)

Mibera Phase 1 estimated at 15-20h to port a full Next.js 15 app with 40+ Convex functions to SvelteKit. This is a full rewrite, not a migration. Components, hooks, routing, auth guards, error boundaries — none translate 1:1.

**Fix**: Either double the estimate (30-40h) OR keep Next.js and just migrate hosting + database. `@next/standalone` works on Railway. Framework change is optional — hosting + DB migration captures 80% of savings.

### R3: "No Backwards Compatibility" is Not True for All Apps (MEDIUM)

honey-interface and set-and-forgetti handle DeFi interactions with real money. Breaking the interface means users can't manage positions.

**Fix**: Classify apps: "can break" (dormant, zero users) vs "must maintain" (active DeFi, active users). honey-interface and set-and-forgetti are "must maintain."

### R4: Convex Export is Not Trivial (MEDIUM)

Plans casually mention "export Convex data" but Convex IDs are internal, relationships need mapping, timestamps need translation. 22-table rektdrop export is not a 1-hour task.

**Fix**: Write export script FIRST. Test against dev Convex. Budget 3-4 hours for tooling.

---

## CRITICAL INSIGHT: Separate Hosting Migration from Framework Rewrite

> "You can get 80% of the cost savings by moving Next.js apps to Railway on standalone adapter without touching the framework at all."

This is the most important finding. For apps currently on Vercel + Next.js:

| Approach | Effort | Savings | Risk |
|----------|--------|---------|------|
| **Move to Railway (keep Next.js)** | 1-2h per app | Vercel cost eliminated | LOW |
| **Rewrite to SvelteKit + Turso** | 15-40h per app | Vercel + Convex + Dynamic eliminated | HIGH |

**Phase A** (now): Move Next.js apps to Railway with `@next/standalone`. Instant cost savings. Zero rewrite risk.
**Phase B** (later): Rewrite to SvelteKit when you have time and the world-template is proven.

---

## MIGRATION CONFIDENCE MATRIX

| App | Confidence | Action |
|-----|-----------|--------|
| **rektdrop-interface** | HIGH | Already SvelteKit. PRD written. Execute. |
| **set-and-forgetti** | MEDIUM | Zero Convex. Move to Railway (keep Next.js). Don't rewrite — DeFi app with real money. |
| **apdao-auction-house** | MEDIUM | Small surface. Move to Railway first, SvelteKit later. |
| **mibera-dimensions** | LOW | Most complex: dual DB, progressive identity, AI oracle. Double the estimate. |
| **mibera-honeyroad** | LOW | Depends on mibera-dimensions succeeding first. |
| **mcv-interface** | LOW | No consolidation plan exists. Which world does this belong to? |
| **cubquests-interface** | LOW | Dual DB, cross-app Actions dependency. Which world? |
| **honey-interface** | LOW | Main product. Most users. Correctly deferred to LAST. No plan exists yet. |
| **fat-bera-interface** | MEDIUM | Low usage. Move to Railway (keep Next.js). |
| **hub-interface** | MEDIUM | Low urgency. Move to Railway. |
| **henlo-interface** | LOW | Contradicts kill list — is it killed or consolidated? Resolve. |

---

## GAPS TO FILL

1. **DNS migration checklist** — which domains point where, TTLs, redirects, SSL certs
2. **User communication plan** — even near-zero users need a status page or Discord announcement
3. **CI/CD for world repos** — no GitHub Actions documented for new worlds
4. **Score-API decomposition timeline** — shared service serving multiple consumers, no plan
5. **Convex billing** — are we on paid plan? when to downgrade?
6. **Sentry on every world** — free tier, one afternoon, mentioned in audit but not in any plan
7. **Henlo contradiction** — kill list says kill standalone, consolidation map says create henlo world. Resolve.
8. **mcv-interface + cubquests-interface** — no consolidation target. Which worlds do they belong to?

---

## RECOMMENDED EXECUTION ORDER (revised)

### Immediate (this week)
1. Fix B2: proxy the RPC node, stop exposing IP
2. Fix B1: make Turso cloud sync mandatory in all docs
3. Write Convex export playbook (test on dev, not prod)
4. Add Sentry free tier to rektdrop (proof of pattern)

### Phase A: Railway Hosting Migration (low risk, high savings)
Move Next.js apps to Railway WITHOUT rewriting framework:
- set-and-forgetti → Railway (`@next/standalone`)
- apdao-auction-house → Railway
- fat-bera-interface → Railway
- hub-interface → Railway

Each is 1-2 hours. Eliminates Vercel cost immediately.

### Phase B: Sovereign Stack Rewrites (high effort, full savings)
- rektdrop → Turso migration (IN PROGRESS, PRD written)
- rektdrop → sprawl consolidation (score + world absorbed)
- mibera → Phase 1 scaffold (30-40h, not 15-20h)

### Phase C: Deferred
- honey-interface (main product, last to move)
- mcv-interface (needs a consolidation target)
- cubquests-interface (needs a consolidation target)
- thj-envio decomposition (after worlds are stable)

---

## PRAISE

- **World pattern is sound** at current scale. One repo, one DB, one deploy.
- **Migration order is correct** for sprawl. Starting with lowest risk.
- **Kill list is ruthless and correct.** The discipline the org needs.
- **Cost consciousness is genuine.** Endowment math is real, not vanity.
- **Sprawl consolidation spec is the best document.** Template quality for others.
- **Deferred complexity is honest.** Resisting the temptation to migrate everything at once.
