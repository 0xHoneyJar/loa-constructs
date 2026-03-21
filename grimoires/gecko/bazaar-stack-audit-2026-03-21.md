# Bazaar Stack Audit — 2026-03-21

> gecko walked every stall. this is what the dust revealed.

---

## Executive Summary

**Current estimated monthly spend: $420–1,375**
**Post-consolidation estimate: $155–390**
**Savings: $265–985/month ($3,180–11,820/year)**

The org runs ~15 active product repos touching 9+ paid services. The biggest rot isn't cost — it's fragmentation. Four storage providers, three analytics systems, five auth patterns, four Dynamic Labs versions. The top crypto apps (Uniswap, Aave, Blur) all converge on the same tight stack: wagmi + viem + Sentry + Amplitude + ranked RPC fallbacks. We're paying for enterprise services while using free-tier features.

---

## The Gold Standard (What Top Crypto Apps Use)

| Layer | Uniswap | Aave | Our Equivalent |
|-------|---------|------|----------------|
| Framework | React 19 + Vite | Next.js 12 + React 18 | Next.js 15 + React 18/19 (split) |
| Wallet | Custom (wagmi + viem) | ConnectKit + wagmi | Dynamic Labs ($$$) |
| RPC | Infura (paid) + fallback | Alchemy (paid) | QuikNode (cancelling) + dRPC |
| Analytics | Amplitude | Amplitude | Umami + OpenPanel + Vercel (3 systems) |
| Errors | Sentry | Sentry | **NOTHING** (biggest gap) |
| State | Redux + TanStack Query | Zustand + TanStack Query | Zustand + TanStack Query (same!) |
| Data | Apollo + The Graph | GraphQL + subgraphs | Envio + Dune + Convex |
| Deploy | Vercel + Cloudflare | IPFS + Cloudflare | Vercel + Railway |

**Key takeaway**: we match on state management. we're behind on observability (zero Sentry), paying too much on auth (Dynamic for basic wallet connect), and fragmented on everything else.

---

## Service-by-Service Verdict

### 1. RPC — CONSOLIDATE to dRPC PAYG

**Action**: IMMEDIATE (this week)
**Effort**: LOW
**Savings**: $100–200/month

The `honey-interface` already has the perfect pattern:

```typescript
function chainTransport(envVar: string | undefined, drpcSlug: string, publicRpc: string): Transport {
  return fallback([
    ...(envVar ? [http(envVar, { timeout: 8_000 })] : []),
    http(`https://${drpcSlug}.drpc.org`, { timeout: 10_000 }),
    http(publicRpc, { timeout: 12_000 }),
  ], { rank: true });
}
```

Three-tier fallback: paid (if configured) → dRPC → public. `rank: true` auto-promotes healthy transports. This is better than what most top apps do.

**Steps**:
1. Cancel QuikNode (confirmed — have validator + dRPC)
2. Extract `chainTransport()` into shared package
3. Add Berachain with own validator as top-priority: `http://57.128.210.178:8545` → dRPC bera → public
4. Roll out to all 15 repos via env var swap
5. Sign up for dRPC PAYG ($6/1M requests) as safety net

### 2. Dynamic Labs — EVALUATE then REPLACE

**Action**: Audit cost first, then decide
**Effort**: HIGH (if replacing)
**Savings**: $100–500/month

**What we actually use across 22 repos**: `connect-and-sign` + `EthereumWalletConnectors` + JWT via JWKS.
**What we don't use**: Embedded wallets, email auth, MFA, account abstraction, social login (1 repo exception).

This is a wallet connect modal + SIWE. RainbowKit does this for free.

**BUT** — the migration is real work:
- Build `@thj/auth` package with SIWE verification (replaces Dynamic JWT)
- Update wallet connect UI in 10+ repos
- Re-test auth flows everywhere
- `honeyroad` uses social login popup — need alternative or keep Dynamic for that one repo

**Recommendation**:
1. First, find out actual Dynamic Labs cost (ask jani). If it's <$100/month, might not be worth migrating.
2. If >$200/month, build `@thj/auth` and migrate over 2-3 sprints.
3. If social login is needed anywhere, keep ONE Dynamic environment for those apps, free tier for the rest.

### 3. Supabase — CONSOLIDATE projects

**Action**: Next 2 weeks
**Effort**: LOW
**Savings**: $50–125/month

Many repos already share the same Supabase instance. Consolidate to:
- **Production**: 1 Pro project for all product data ($25/mo)
- **Constructs**: 1 Pro project for registry/API ($25/mo)
- **Dev/Staging**: 1 Free project ($0)

Total: $50/month (down from $100–200).

### 4. Convex — KEEP

**Savings**: $0
**Why**: Genuinely good DX for realtime. Free tier covers usage. Replacing with Supabase Realtime would be a massive downgrade. Used well in explorer, MCV, set-and-forgetti.

### 5. Trigger.dev — KEEP

**Savings**: $0
**Cost**: ~$50/month
**Why**: Deep integration in 9 repos. Background job pipelines for GIF processing, validator ops, score computation. Genuinely cheap for the value. Alternatives (BullMQ, Inngest) would cost more in ops time.

### 6. Storage — CONSOLIDATE to R2 + Cloudinary

**Action**: Next month
**Effort**: MEDIUM
**Savings**: $45–120/month

| Current | Replacement | Migration |
|---------|-------------|-----------|
| AWS S3 (5 repos) | Cloudflare R2 | Endpoint swap — same `@aws-sdk/client-s3` API |
| Vercel Blob (7 repos) | Cloudflare R2 | New upload routes needed |
| Cloudinary (5 repos) | **KEEP** | Image transforms can't be replaced by R2 |
| Irys/Arweave (1 repo) | **KEEP** | Permanent storage, different use case |

R2 pricing: free egress, $0.015/GB storage. S3→R2 migration is literally changing the endpoint URL.

### 7. Analytics — CONSOLIDATE to Umami

**Action**: Next 2 weeks
**Effort**: LOW
**Savings**: $20–40/month

- Keep Umami (already primary for new projects)
- Self-host on Railway (~$5/month) or keep cloud free tier
- Kill OpenPanel (only in deprecated explorer-interface)
- Keep Vercel Analytics as passive freebie (included with Vercel Pro)

### 8. Envio — KEEP

**Cost**: $0–50/month
**Why**: Fastest EVM indexer (143x faster than The Graph). Well-integrated in thj-envio. Free hosted tier likely sufficient.

### 9. Dune — KEEP (short-term), MIGRATE (long-term)

**Cost**: $0–50/month
**Why**: Critical for honey-guard validator vote optimization. Free tier (2,500 credits) may suffice.
**Long-term**: Migrate vault queries to Envio event handlers (already have thj-envio infrastructure).

---

## The Biggest Gap: Zero Observability

**This is worse than any cost issue.**

Not a single production app has Sentry. Every serious crypto app (Uniswap, Aave, all of them) runs Sentry for error tracking. When something breaks in production, you find out from users on Telegram, not from an alert.

**Fix**:
- Sentry free tier: 5K errors/month, 10K performance transactions
- Add `@sentry/nextjs` to every Next.js app
- Add `@sentry/node` to every Hono/API service
- Create shared Sentry config in the SDK package
- One afternoon of work across all repos

---

## Shared Package Design: `@thj/web3-config`

Not a full SDK. A config package. Distribute defaults, not abstractions.

```
@thj/web3-config/
├── chains.ts          # Berachain + supported chain definitions
├── transports.ts      # chainTransport() fallback pattern
├── wagmi.ts           # createConfig() with org defaults
├── sentry.ts          # Sentry init with org DSN + defaults
├── analytics.ts       # Umami wrapper with shared site ID
└── constants.ts       # Contract addresses, API URLs, chain IDs
```

### What it provides:
1. **`chainTransport()`** — the honey-interface pattern, org-wide
2. **`createWagmiConfig()`** — pre-configured with all supported chains + transports
3. **`initSentry()`** — shared DSN, environment tags, source map config
4. **`trackEvent()`** — thin analytics wrapper (Umami today, swappable)
5. **Chain constants** — Berachain definition, canonical contract addresses

### What it does NOT do:
- No wallet UI (that's RainbowKit or Dynamic's job)
- No auth (that stays app-specific until `@thj/auth` is built)
- No state management (apps choose their own)
- No UI components (different design systems per app)

### Installation:
```bash
bun add @thj/web3-config
```

### Usage:
```typescript
import { createWagmiConfig, initSentry, trackEvent } from '@thj/web3-config'

// One line to get production-grade wagmi config
const config = createWagmiConfig({
  chains: ['berachain', 'base', 'mainnet'],
  rpc: { berachain: process.env.NEXT_PUBLIC_BERA_RPC_URL }
})

// One line to get Sentry
initSentry({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, environment: 'production' })

// Consistent analytics
trackEvent('vault_deposit', { amount: '100', token: 'HONEY' })
```

---

## Migration Roadmap (Priority Order)

### Wave 1 — This Week (LOW effort, HIGH impact)
| Action | Repos | Savings | Time |
|--------|-------|---------|------|
| Cancel QuikNode | org-wide | $100-300/mo | 5 min |
| Roll out `chainTransport()` pattern | all wagmi repos | included above | 2-3 hours |
| Add Sentry free tier to top 5 apps | explorer, honeyroad, mcv, cubquests, honey-interface | $0 (free) | 1 afternoon |
| Kill OpenPanel | explorer-interface | $0-20/mo | 10 min |

### Wave 2 — Next 2 Weeks (LOW-MEDIUM effort)
| Action | Repos | Savings | Time |
|--------|-------|---------|------|
| Consolidate Supabase projects | 5 repos sharing DB | $50-125/mo | 1 day |
| Standardize Umami analytics | all frontends | $20-40/mo | half day |
| Create `@thj/web3-config` package | new shared package | — | 2 days |

### Wave 3 — Next Month (MEDIUM effort)
| Action | Repos | Savings | Time |
|--------|-------|---------|------|
| Migrate S3 → R2 | 5 repos | $30-80/mo | 2-3 days |
| Migrate Vercel Blob → R2 | 7 repos | $15-40/mo | 3-4 days |
| Standardize Dynamic Labs version | 10+ repos | $0 (consistency) | 1-2 days |

### Wave 4 — When Ready (HIGH effort, highest long-term savings)
| Action | Repos | Savings | Time |
|--------|-------|---------|------|
| Build `@thj/auth` (SIWE) | new package | — | 1 week |
| Replace Dynamic → RainbowKit | 10+ repos | $100-500/mo | 2-3 weeks |
| Migrate Dune queries → Envio | honey-guard | $0-50/mo | 1 week |

---

## Cost Summary

| | Current | After Wave 1-2 | After Wave 3-4 |
|---|---------|---------------|----------------|
| RPC | $100-300 | $50-100 | $50-100 |
| Dynamic Labs | $100-500 | $100-500 | $0 |
| Supabase | $100-200 | $50-75 | $50-75 |
| Convex | $0-25 | $0-25 | $0-25 |
| Trigger.dev | $50 | $50 | $50 |
| Storage | $50-150 | $50-150 | $5-30 |
| Analytics | $20-50 | $0-10 | $0-10 |
| Envio | $0-50 | $0-50 | $0-50 |
| Dune | $0-50 | $0-50 | $0 |
| Sentry (NEW) | $0 | $0 | $0 (free tier) |
| **TOTAL** | **$420-1,375** | **$300-1,010** | **$155-340** |

---

## What Makes Us Match the Top Apps

After full consolidation:

| Capability | Uniswap/Aave | Us (Post-Audit) |
|------------|-------------|-----------------|
| RPC | Infura/Alchemy (paid) + fallback | dRPC PAYG + validator + public fallback |
| Wallet | wagmi + viem + custom/ConnectKit | wagmi + viem + RainbowKit |
| Error tracking | Sentry | Sentry |
| Analytics | Amplitude | Umami (lighter, privacy-first) |
| State | Zustand + TanStack Query | Zustand + TanStack Query (already match!) |
| Realtime | Apollo/GraphQL | Convex (better for our use cases) |
| Indexing | The Graph | Envio (faster) |
| Background jobs | Custom | Trigger.dev (better DX) |
| Deploy | Vercel + Cloudflare | Vercel + Railway |
| Shared config | Internal packages | `@thj/web3-config` |

we don't need to match their budget. we need to match their patterns. the patterns are surprisingly cheap.

---

## React Version Note

honey-interface, honeyroad, cubquests, honey-interface are on React 18.
mcv-interface, loa-constructs explorer are on React 19.

this blocks shared components. standardizing to React 19 is a prerequisite for the shared config package working cleanly across all repos. mcv-interface already shows it works with wagmi v3 + React 19.

---

*gecko observation: the bazaar isn't expensive. it's scattered. consolidate the stalls, share the infrastructure, and the same money buys three times the resilience.*
