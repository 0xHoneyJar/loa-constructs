---
session: 1
date: 2026-03-31
type: kickoff
status: planned
---

# Session 1 — apHive Treasury Frontend (kickoff)

## Scope
- Scaffold SvelteKit project for apHive DAT frontend
- Install constructs: hypha, artisan, protocol, rosenzu, the-arcade
- Build 5 rooms: dashboard, deposit, redeem, backstop, history
- Vanilla wallet (EIP-6963 from sprawl pattern)
- On-chain reads via viem (no database needed for V1)
- Deploy to Railway ($5/mo)

## Artifacts
- Architecture + build doc: `specs/kickoff-aphive.md`

## Prior session
Construct ecosystem audit + sovereign stack synthesis. All 17 construct descriptions rewritten. Frontier research completed (Turso embedded, bun compile, infrastructure endowments).

## Decisions made
- SvelteKit over Next.js (sovereign stack constraint)
- Railway over Vercel (predictable pricing, $5/mo)
- Vanilla wallet over Dynamic Labs ($0 vs $300/mo)
- viem direct over wagmi (SvelteKit, no React hooks)
- No database for V1 (all data on-chain)
- Hypha installed as knowledge construct (not code dependency)
- Haiku evaluated but deferred to post-V1
