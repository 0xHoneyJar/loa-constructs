# RPC Migration: QuikNode → Self-Hosted + Public Fallback

> Kill QuikNode. Use org-owned RPC as priority, public RPCs as fallback.

**Date**: 2026-03-31
**Savings**: $50-200/mo (QuikNode subscription)

## Priority RPC

```
http://57.128.210.178:8545/   ← org-owned Berachain node (OVH server)
```

## Fallback RPCs (free, public)

```
https://rpc.berachain.com          ← Berachain official
https://berachain-mainnet.g.alchemy.com/v2/demo   ← Alchemy free tier
```

## Transport Pattern (gold standard)

From `honey-interface/components/web3-provider.tsx:26` — chainTransport with fallback:

```typescript
import { http, fallback } from 'viem'

export const berachainTransport = fallback([
  http('http://57.128.210.178:8545/'),     // priority: org-owned node
  http('https://rpc.berachain.com'),        // fallback 1: public
])
```

## Repos to Update

| Repo | Current RPC | Action |
|------|------------|--------|
| **mibera-honeyroad** | QuikNode (4 chains) | Update env vars: Berachain → org RPC, others → public |
| **honey-interface** | Mixed (Alchemy + QuikNode?) | Update env vars |
| **All sovereign stack worlds** | Already using public | Add org RPC as priority |

## Action

These are env var changes only — no code changes needed. Update in Vercel/Railway dashboard:

```
NEXT_PUBLIC_ALCHEMY_BERACHAIN_RPC_URL=http://57.128.210.178:8545/
```

For non-Berachain chains (ETH, Base, Arbitrum), use free public RPCs:
- ETH: `https://eth.llamarpc.com`
- Base: `https://mainnet.base.org`
- Arbitrum: `https://arb1.arbitrum.io/rpc`

Then cancel QuikNode subscription.
