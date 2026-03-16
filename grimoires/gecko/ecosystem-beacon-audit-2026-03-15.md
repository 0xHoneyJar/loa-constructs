# Ecosystem Beacon Audit — 2026-03-15

> Audited 8 core product repos against Beacon's 5-layer trust model.
> Auditor: Gecko (ground-level) + Beacon (construct criteria)

## Ecosystem Score: 5.5 / 10 (below 7.0 "AI-Ready" threshold)

| Repo | Product | URL | L1 | L2 | L4 | L5 | Score | Status |
|------|---------|-----|:--:|:--:|:--:|:--:|:-----:|--------|
| mcv-interface | Moneycomb Vault | moneycomb.0xhoneyjar.xyz | 8 | 9 | 8 | 6 | **7.75** | AI-Ready |
| set-and-forgetti | Set & Forgetti | app.setandforgetti.io | 8 | 4 | 8 | 7 | **6.75** | Near-ready (fix APYs) |
| cubquests-interface | CubQuests | cubquests.com | 3 | 9 | 5 | 8 | **6.25** | Invisible to AI |
| midi-interface | Mibera Dimensions | midi.0xhoneyjar.xyz | 5 | 3 | 7 | 7 | **5.5** | Fabrication risk |
| apdao-auction-house | Apiology DAO | apiologydao.0xhoneyjar.xyz | 3 | 5 | 7 | 6 | **5.25** | Interest rate mismatch |
| honey-interface | Honey Token | app.0xhoneyjar.xyz | 2 | 8 | 6 | 2 | **4.5** | CRITICAL: open proxy |
| mibera-honeyroad | Honeyroad | honeyroad.xyz | 4 | 6 | 5 | 2 | **4.25** | CRITICAL: open admin |
| community-interface | Community Portal | 0xhoneyjar.xyz | 1 | 7 | 4 | 3 | **3.75** | Broken OG metadata |

## Layers

- **L1 Source Legitimacy**: robots.txt, llms.txt, structured data, brand clarity
- **L2 Claim Verifiability**: no fabricated data, claims backed by on-chain/live sources
- **L4 Contextual Integrity**: brand consistency, OG metadata, temporal markers
- **L5 Structural Cues**: auth, rate limiting, cache policies, security headers

## Security Emergencies

### CRITICAL — Act immediately

1. **honey-interface**: `/api/answer` and `/api/search` are unauthenticated OpenAI API proxies. Anyone can call them and burn project OpenAI credits. Add auth or remove.

2. **mibera-honeyroad**: `/api/admin/users`, `/api/admin/debug`, `/api/admin/phase-list`, `/api/admin/phase-spots` — ALL unauthenticated. Public can dump admin user records. Add auth middleware immediately.

### HIGH — Fix this sprint

3. **set-and-forgetti**: `apps/web/types/recipes.ts` has 5 hardcoded APY values (12.5%, 15.2%, 18.7%, 22.1%, 25.8%) rendered in station cards. Wire to `useVaultApy` hook or remove until real data available.

4. **midi-interface**: `components/midi/activity-heatmap.tsx` generates random data via `Math.random()` and labels it "Your activity over the past year." Replace with real data or clearly mark as demo.

5. **apdao-auction-house**: `confirm-loan-button.tsx` uses hardcoded `INTEREST_RATE = 500n` (5%) but `loan-section.tsx` uses `INTEREST_RATE = 200n` (2%). Only loan-section reads from contract. Wire confirm-button to on-chain data.

6. **honey-interface**: No security headers (CSP, X-Content-Type-Options) in next.config.js. Add immediately.

### MEDIUM — Fix next sprint

7. **community-interface**: OpenGraph title and description are empty strings. metadataBase is commented out. OG image cannot resolve.

8. **mibera-honeyroad**: Silk Road homage copy ("unanonymous mibera market") may trigger AI safety classifiers. Review whether it serves the product.

9. **apdao-auction-house**: Hardcoded single-entry whitelist in `/api/whitelist/route.ts` — was meant to be moved to env/database.

## Discoverability Gap Analysis

### robots.txt

| Repo | Status | AI Crawler Rules |
|------|--------|-----------------|
| set-and-forgetti | Has `app/robots.ts` (allows all, disallows /api/) | No AI-specific rules |
| mcv-interface | Meta robots only (index: true, follow: true) | No AI-specific rules |
| All others | MISSING | N/A |

**Action**: Every repo needs `app/robots.ts` with explicit GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot directives.

### llms.txt

| Repo | Status | Quality |
|------|--------|---------|
| set-and-forgetti | `public/llms.txt` (web) + `public/llms.txt` (docs) | Excellent — hub-and-spoke with 6 context files |
| mcv-interface | `public/llms.txt` | Good — contract address, function signatures, API |
| All others | MISSING | N/A |

**Action**: Every deployed product needs an llms.txt. MCV's format (contract + function sigs + API) is the reference for DeFi apps.

### JSON-LD Structured Data

| Repo | Status |
|------|--------|
| mcv-interface | WebApplication schema with creator, category, version |
| All others | MISSING |

**Action**: Add WebApplication or FinancialProduct JSON-LD to all product layouts.

### Rate Limiting

| Repo | Status |
|------|--------|
| set-and-forgetti | Upstash on server actions (10/10s) |
| cubquests-interface | Upstash on auth actions (3/30s) |
| midi-interface | Upstash on codex route (10/60s) |
| All others | MISSING |

**Action**: Add Upstash rate limiting to all API routes, especially write endpoints and any OpenAI proxies.

## Reference Implementation: mcv-interface

MCV got the highest score because it has:
1. `llms.txt` with contract address + Solidity function signatures
2. JSON-LD `WebApplication` structured data
3. Clean data — zero fabrication, all from on-chain
4. Proper OG metadata with siteName, canonical URL
5. No security vulnerabilities

Other repos should adopt MCV's pattern.

## Remediation Status (updated 2026-03-15)

### P0 — DONE
- [x] Lock honey-interface OpenAI proxies (`6f1e3e2c`)
- [x] Lock honeyroad admin routes (`f858912`)
- [x] Fix community-interface OG metadata (`d7231b3`)

### P1 — DONE
- [x] Replace hardcoded APYs in set-and-forgetti (`abb91c04`)
- [x] Delete fabricated heatmap in midi-interface (`f6c9187c`) — was dead code, real component already existed
- [x] Fix interest rate mismatch in apdao (`96b65ec`)
- [x] Add robots.txt to 7 repos (all except set-and-forgetti which already had one)
- [x] Add llms.txt to 4 more repos (community, cubquests, midi, apdao)

### P2 — Next sprint
- Add JSON-LD structured data to remaining 7 repos (mcv is the reference)
- Add rate limiting to remaining 5 repos (set-and-forgetti, cubquests, midi have it)
- Add sitemap.ts to repos without one
- Regenerate stale BUTTERFREEZONE in honeyroad and set-and-forgetti (currently generic Loa template)
- Generate BUTTERFREEZONE for thj-envio

### P3 — Backlog
- x402 payment endpoints (when ready)
- AI crawler-specific robots.txt rules (currently allowing all AI bots)
