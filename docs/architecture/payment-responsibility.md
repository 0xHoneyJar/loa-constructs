# Payment Responsibility — Three-Layer Boundary

> *The network supports N rails via freeside hooks; NONE live here.*
> — cycle-007 L-delineate-responsibility, operator direction 2026-04-23 late

---

## The boundary

Payments travel through three layers. Each layer owns a distinct responsibility; mixing concerns across layers is a boundary violation.

```
┌─────────────────────────────────────────────────────────────┐
│  APPS        UI + checkout                                    │
│  (sprawl-world, purupuru, etc — world repos)                  │
│  • Stripe / NOWPayments / x402 checkout widgets               │
│  • Wallet connect (Dynamic Labs, viem)                        │
│  • Payment-initiation UI                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │  user pays; app receives
                          │  webhook OR user JWT
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NETWORK-API  license-verify hooks                            │
│  (0xHoneyJar/loa-constructs/apps/api)                         │
│  • POST /v1/license/verify — receives signed payment receipt  │
│  • Issues JWT (RS256) claiming entitlement                    │
│  • Calls freeside to record ledger entry                      │
│  • NO raw payment processing, NO Stripe/NOWPayments state     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │  license-verified receipt
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LEDGER        freeside-owned                                 │
│  (0xHoneyJar/loa-freeside — Jani's canonical home)            │
│  • Append-only ledger                                         │
│  • Revenue share, royalties, construct-author payouts         │
│  • Single source of truth for who paid what, when             │
└─────────────────────────────────────────────────────────────┘
```

## Rule of thumb

| Question | Layer |
|---|---|
| Is it a button, form, or checkout UI? | **Apps** |
| Does it talk to Stripe/NOWPayments/x402 HTTP API? | **Apps** |
| Does it receive the payment webhook from a rail? | **Apps** (ideally; network-API may proxy in interim) |
| Does it verify a license + issue entitlement? | **Network-API** |
| Does it write to the author-payout ledger? | **Ledger (freeside)** |
| Does it need to answer "did user X pay for construct Y"? | **Ledger** (query via freeside API) |

## N-rails invariant

The network supports **N payment rails** — Stripe, NOWPayments, x402, and any future addition — via freeside hooks. **NONE of those rails live in `loa-constructs`.** Adding a new rail means:

1. App side adopts the rail's SDK / checkout flow
2. Ledger (freeside) gains a new adapter for recording that rail's receipts
3. Network-API *does not change* — it only verifies signed receipts

This inversion keeps the network-API minimal and rail-agnostic. The network never learns Stripe's specific quirks; it only knows "given a valid receipt, mint a license."

## Current state (honest)

| Code location | Status | Target |
|---|---|---|
| `loa-constructs/apps/api/src/services/stripe.ts` | **Boundary violation** (inherited from pre-cycle-007 build) | Extract to freeside as an adapter; network-API shrinks to `/v1/license/verify` |
| `loa-constructs/apps/api/src/routes/subscriptions.ts` | Partial violation — mixes license-state queries (OK) with checkout-session creation (not OK) | Split: license-state stays, checkout-session moves to apps |
| `loa-constructs/apps/api/src/routes/webhooks.ts` | Boundary violation — directly handles Stripe webhook signatures | Migrate to freeside adapter; apps proxy if needed |
| `loa-constructs/loa-freeside/packages/adapters/billing/polar/` | **REMOVED in cycle-007 L-remove-stale** | Belongs in Jani's loa-freeside repo if ever re-introduced |
| `loa-constructs` root | No payment code | **Invariant** (lint/CI check candidate — cycle-008+) |

Migration of the existing Stripe backend from `apps/api` → freeside is tracked for **cycle-008+**. Not in scope for cycle-007; cycle-007 documents the intended boundary and the known gap.

## Enforcement (future)

Post-cycle-007, a lint check should flag new payment-rail imports (`stripe`, `@polar-sh/*`, `@nowpayments/*`, etc) landing in `loa-constructs` outside the `@loa-constructs/api` license-verify module. Implementation deferred; concept documented here as a guardrail candidate.

## Related

- `grimoires/loa-constructs-seed-2026-04-21/cycle-007-SEED-world-consolidation.md` §L-delineate-responsibility
- `grimoires/loa-constructs-seed-2026-04-21/cycle-007-l-verify-inventory.md` — three smoking guns + boundary framing
- Operator memory: *"NOWPayments target, NOT Stripe."* — Stripe in current codebase is legacy to be superseded
