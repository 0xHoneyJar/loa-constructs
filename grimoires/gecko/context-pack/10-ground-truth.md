# Ground Truth — Organizational Reality

> what actually exists, right now, before we plan anything.

## Org: 0xHoneyJar

**60 repos** in the GitHub org. Here's the reality map:

### Active Product Repos (recently pushed, have users)
| Repo | Last Push | Private | What |
|------|-----------|---------|------|
| thj-surface | 2026-03-13 | private | Unknown — pushed today |
| mcv-interface | 2026-03-13 | private | MCV product app (most mature, 92 sprints) |
| loa-constructs | 2026-03-12 | private | This repo — constructs network + explorer |
| apdao-auction-house | 2026-03-12 | private | APDAO product |
| cubquests-interface | 2026-03-12 | private | CubQuests product |
| mibera-honeyroad | 2026-03-12 | private | Mibera product |
| mibera-dimensions | 2026-03-12 | private | Mibera product |
| rektdrop-interface | 2026-03-11 | private | Rektdrop product (Easel-dominant) |
| set-and-forgetti | 2026-02-26 | private | Gold standard dApp |
| honey-interface | 2026-03-07 | private | Honey product |
| henlo-interface | 2026-02-27 | private | Henlo product |

### Infrastructure Repos
| Repo | What |
|------|------|
| loa | Framework (open source, Layer 1) |
| loa-finn | Agent runtime (Layer 3) |
| loa-hounfour | Protocol types (Layer 2) |
| loa-freeside | Economics/billing (Layer 4) |
| loa-dixie | Oracle BFF (Layer 5) |
| loa-beauvoir | Personality system |
| loa-gauntlet | Unknown (private) |
| loa-constructs | Constructs network (this repo) |

### Construct Repos (17 total)
construct-observer, construct-artisan, construct-protocol, construct-k-hole, construct-the-easel, construct-hardening, construct-herald, construct-beacon, construct-crucible, construct-dynamic-auth, construct-gecko, construct-growthpages, construct-gtm-collective, construct-mibera-codex, construct-social-oracle, construct-the-arcade, construct-webreel, construct-webgl-particles, construct-vfx-playbook, construct-base

### Ruggie Legacy (4 repos, all private except moltbot)
| Repo | Last Push | Status |
|------|-----------|--------|
| ruggy-v2 | (not in recent 60) | Responses disabled, feedback handler only |
| ruggy-security | (not in recent 60) | Loa construct, not runtime |
| ruggy-moltbot | 2026-02-09 | Never stabilized, Cloudflare Workers |
| ruggy-v3 | (cloned locally) | Appears to be newer — needs investigation |

### Other Infra
| Repo | What |
|------|------|
| thj-envio | Envio indexer |
| rekt-api | Rektdrop API |
| score-api | Score API |
| score-dashboard | Score dashboard |
| fatbera-withdrawal-monitor | Validator tooling |
| validator-auto-reward-railway | Validator tooling |
| fatBERA-validator-depositor | Validator tooling |

## What's Cloned Locally

```
/Users/zksoju/Documents/GitHub/
├── construct-beacon/
├── construct-deep-research/    ← stale, was renamed to k-hole
├── construct-gecko/            ← exists! needs investigation
├── construct-hardening/
├── construct-herald/
├── construct-k-hole/
├── construct-observer/
├── construct-protocol/
├── construct-the-arcade/
├── loa-dixie/                  ← full clone available
├── ruggy-moltbot/
├── ruggy-security/
├── ruggy-v2/
├── ruggy-v3/                   ← what is this?
└── (many more not listed)
```

## Current Branch State

We're on `feat/cycle-044-observability-dashboard` with:
- Signals pipeline (Convex, complete, E2E tested)
- GPT review fixes (key cache, 202 error handling)
- PR #160 not yet merged

## Infrastructure Reality

| Service | Provider | Status |
|---------|----------|--------|
| API | Railway | Running (api.constructs.network) |
| Explorer | Vercel | Running (constructs.network) |
| Database | Supabase | Running (production + dev pooled) |
| Real-time | Convex | Running (dev: doting-jackal-397, prod: quaint-anaconda-866) |
| Alerts | Discord | Webhook configured |
| Issues | Linear | Team 466d92ac..., API key configured |
| Domains | constructs.network, constructs.loa.dev | Active |

## Team Reality
- **Primary maintainer**: @janitooor (you)
- **Team size**: 1-3 developers
- **Package manager**: bun (constructs), npm (dixie)
- **CI**: GitHub Actions
- **Deployment**: Vercel (frontend), Railway (API)

## Open Questions (Reality Gaps)

1. What is `ruggy-v3`? Locally cloned but not in org's recent repos list
2. What is `thj-surface`? Pushed today, private — new product?
3. What is `construct-gecko`? Already exists as a repo — is this the right home for Ruggy, or rename?
4. What is `loa-gauntlet`? Private, unknown purpose
5. How many of the 11 product repos actually have users? Which ones matter most for signal aggregation?
6. Is dixie deployed to production? The research says `dixie-armitage.arrakis.community` is active
7. The ruggie repos — any of them still running in any form? Or all fully deprecated?
