# Sovereign Migration Tracker

> Master tracking document for the 0xHoneyJar org-wide consolidation.
> 56 Vercel apps + scattered services → ~10 sovereign worlds + 1 corporate surface.
>
> **Maintained by**: Operator (Hermes cross-session) + Gecko patrol
> **Last updated**: 2026-04-02
> **Location**: `grimoires/gecko/sovereign-migration-tracker.md` (in loa-constructs)

---

## Reference Documents

All existing context lives in `0xHoneyJar/loa-constructs` → `grimoires/gecko/`:

| Document | What It Contains | Status |
|----------|-----------------|--------|
| [`world-architecture.md`](grimoires/gecko/world-architecture.md) | Modular world pattern, repo structure, module boundaries | CANONICAL |
| [`sovereign-stack-kickoff.md`](grimoires/gecko/sovereign-stack-kickoff.md) | SvelteKit 5 + Turso/Drizzle migration patterns, Convex export | CANONICAL |
| [`specs/org-sovereign-migration-plan.md`](grimoires/gecko/specs/org-sovereign-migration-plan.md) | 266-repo audit, $900-2,100/mo spend, 6 migration targets | CANONICAL |
| [`specs/kickoff-sprawl-consolidation.md`](grimoires/gecko/specs/kickoff-sprawl-consolidation.md) | 4 repos → 1 world plan, score absorption, wire archive | CANONICAL |
| [`specs/flatline-review-org-migration.md`](grimoires/gecko/specs/flatline-review-org-migration.md) | Opus adversarial review: 3 blockers, 11 risks, 9 gaps | CRITICAL — blockers unresolved |
| [`specs/rpc-migration.md`](grimoires/gecko/specs/rpc-migration.md) | QuikNode → self-hosted RPC, $50-200/mo savings | ACTIONABLE |
| [`kickoff-purupuru-migration.md`](grimoires/gecko/kickoff-purupuru-migration.md) | 18 Convex tables → Turso, 70 functions, 12h estimate | PLANNED |
| [`frontier-stack-synthesis-2026-03-31.md`](grimoires/gecko/frontier-stack-synthesis-2026-03-31.md) | Tech trend analysis, infrastructure endowment math | REFERENCE |
| [`construct-audit-2026-03-31.md`](grimoires/gecko/construct-audit-2026-03-31.md) | 18 public constructs, ~130 skills, consolidation recs | REFERENCE |
| [`stall-directory.yaml`](grimoires/gecko/stall-directory.yaml) | Gecko routing table — product names → repos | MAINTAINED |

Freeside infrastructure spec:
| Document | What It Contains | Status |
|----------|-----------------|--------|
| [Issue #153](https://github.com/0xHoneyJar/loa-freeside/issues/153) | World Container Hosting ECS spec — 4 requirements, 6 questions | OPEN — awaiting Jani |

HoneyPort design context:
| Document | What It Contains | Status |
|----------|-----------------|--------|
| [PR #24](https://github.com/0xHoneyJar/hub-interface/pull/24) | HoneyPort V2 — design system, The Mint pipeline, MCV wiring | OPEN |
| [Issue #20](https://github.com/0xHoneyJar/hub-interface/issues/20) | Sign in with THJ — unified identity initiative | OPEN |

---

## The Sovereign Stack

Every world runs the same pattern:

```
SvelteKit 5 (runes) + Turso/Drizzle (SQLite) + Railway ($5/mo)
├── One repo, one process, one database file, one deploy
├── Vanilla EIP-6963 wallet (340 lines, no vendor SDK)
├── SSE realtime (write-triggered, not polling)
├── AI features via Finn gateway (when deployed)
└── Loa framework mounted as git submodule
```

Template: [`0xHoneyJar/world-template`](https://github.com/0xHoneyJar/world-template)

**Key insight from flatline review**: Separate hosting migration from framework rewrite. Moving Next.js apps to Railway with `@next/standalone` captures 80% of cost savings at 5% of the effort. Full SvelteKit rewrite is Phase B.

---

## Infrastructure Blockers (ordered by severity)

### CRITICAL — Blocks all Freeside deploys

| # | Issue | Impact | Owner |
|---|-------|--------|-------|
| [#128](https://github.com/0xHoneyJar/loa-freeside/issues/128) | Fargate vCPU quota exhausted — 50 leaked scheduled tasks eating 12.75 vCPU against 6 vCPU limit | Cannot deploy ANY new world to Freeside | Jani |
| [#106](https://github.com/0xHoneyJar/loa-freeside/issues/106) | DNS Authority Migration — 0xhoneyjar.xyz to Route 53 | Subdomain routing for worlds blocked | Jani |

### HIGH — Blocks specific migrations

| # | Issue | Impact | Owner |
|---|-------|--------|-------|
| [#153](https://github.com/0xHoneyJar/loa-freeside/issues/153) | World Container Hosting spec — storage, scale-to-zero, Finn, provisioning decisions | Architecture decisions needed before worlds deploy | Jani |
| [#127](https://github.com/0xHoneyJar/loa-freeside/issues/127) | Staging migration AWS CLI parsing error | Can't test deploys | Jani |
| [#126](https://github.com/0xHoneyJar/loa-freeside/issues/126) | Staging deploy wrong SHA for ECR | Can't test deploys | Jani |

### MEDIUM — Quality of life

| # | Issue | Impact | Owner |
|---|-------|--------|-------|
| [#143](https://github.com/0xHoneyJar/loa-freeside/issues/143) | CORS allowlist for honeyroad.mibera.io | Mibera auth blocked | Jani |
| [#141](https://github.com/0xHoneyJar/loa-freeside/issues/141) | Auth proxy hardening (Cloudflare 1015) | Reliability | Jani |
| [#111](https://github.com/0xHoneyJar/loa-freeside/issues/111) | Scale-to-zero audit + Finn deploy ring | Cost optimization | Jani |

### Flatline Review Blockers (from adversarial review)

| ID | Blocker | Status |
|----|---------|--------|
| B1 | SQLite backup strategy missing — Railway volumes have NO backup/replication | UNRESOLVED — Turso cloud sync or Litestream → S3 needed |
| B2 | RPC exposes raw IP (57.128.210.178) in client bundles via NEXT_PUBLIC_ | UNRESOLVED — needs reverse proxy |
| B3 | Write concurrency under load — SQLite single-writer + Turso embedded replicas | DOCUMENTED — acceptable for current traffic |

---

## World Consolidation Map

### Legend
- 🟢 DEPLOYED — live on sovereign stack
- 🟡 CODE READY — Dockerfile exists, awaiting infra
- 🔵 PLANNED — kickoff doc exists, work not started
- ⚪ NOT STARTED — no migration work done
- 🔴 BLOCKED — waiting on external dependency

---

### 🟡 WORLD: rektdrop (Sprawl Protocol)

> The face — CRT terminal, experience flow, wallet summon. Where the daemon meets the screen.

**Target**: `rektdrop.0xhoneyjar.xyz`
**Repo**: [`sprawl-protocol/interface`](https://github.com/sprawl-protocol/interface) (stays, becomes the world)
**Stack**: SvelteKit 5 + Turso/Drizzle + Bun (ALREADY on sovereign stack)
**Freeside Terraform**: ✅ Provisioned (256 CPU / 512 MB)
**Dockerfile**: ✅ Ready
**Railway config**: ✅ Ready

**Consolidation status**:
| Source Repo | What | Status |
|-------------|------|--------|
| `sprawl-protocol/interface` | Main app | ✅ IS the world |
| `sprawl-protocol/score` | Leaderboard API (Hono + SQLite) | 🟡 Score logic absorbed into `src/lib/score/`. Infra consolidation pending ([Issue #29](https://github.com/sprawl-protocol/interface/issues/29)) |
| `sprawl-protocol/wire` | Dune pipeline + API | ✅ Dune queries migrated into interface. Wire is dead — archive it. |
| `sprawl-protocol/world` | Design specs, taste.md, voice.md | 🟡 Reference only. Absorb canonical files into `src/lib/design/`. |

**Remaining work**:
1. Kill score-sprawl Railway service, run scoring in-process
2. Archive wire repo (`gh repo archive sprawl-protocol/wire`)
3. Absorb world design tokens into interface
4. Deploy to Freeside (blocked on #128)

**Spec**: [`specs/kickoff-sprawl-consolidation.md`](grimoires/gecko/specs/kickoff-sprawl-consolidation.md)

---

### 🟡 WORLD: mibera

> Identity mirror + marketplace. 10,000 time-travelling Beras.

**Target**: `mibera.0xhoneyjar.xyz`
**Repo**: [`0xHoneyJar/mibera-world`](https://github.com/0xHoneyJar/mibera-world)
**Stack**: SvelteKit 5 + Turso/Drizzle (sovereign stack)
**Freeside Terraform**: ✅ Provisioned (256 CPU / 512 MB)
**Dockerfile**: ✅ Ready

**Consolidation status**:
| Source Repo | What | Status |
|-------------|------|--------|
| `mibera-world` | Main world app | ✅ IS the world |
| `mibera-dimensions` | Canvas pipeline, provenance | 🔵 Convex migration done. Needs absorption into world as module |
| `mibera-honeyroad` | Silk Road marketplace (Trigger.dev, Supabase, S3) | ⚪ Complex — Supabase + Trigger.dev dependencies. Separate world or module? |
| `mibera-landing` | Landing page (Vercel) | ⚪ Absorb as route or keep as static page |
| `miberastrology-new` | Astrology feature | ⚪ Absorb as module |
| `mibera-freeside` | Freeside integration | ⚪ Evaluate — may be obsolete |
| `mibera-contracts` | Solidity contracts | Stays separate (contracts are not worlds) |

**Remaining work**:
1. Define module boundaries (dimensions, honeyroad, astrology)
2. Decide: is honeyroad a separate world or a mibera module?
3. Migrate mibera-dimensions Convex → Turso (partially done)
4. Deploy to Freeside (blocked on #128)

**Open question**: Honeyroad uses Trigger.dev + Supabase + Sharp + S3 — heavy external deps. This might warrant its own world (`honeyroad.mibera.io`) rather than absorption.

---

### 🟡 WORLD: apdao

> Treasury dashboard for apDAO.

**Target**: `apdao.0xhoneyjar.xyz`
**Repo**: [`0xHoneyJar/apdao-world`](https://github.com/0xHoneyJar/apdao-world)
**Stack**: SvelteKit 5 + Turso/Drizzle (sovereign stack)
**Freeside Terraform**: ✅ Provisioned (256 CPU / 512 MB)
**Dockerfile**: ✅ Ready

**Consolidation status**:
| Source Repo | What | Status |
|-------------|------|--------|
| `apdao-world` | Main world app | ✅ IS the world |
| `apdao-auction-house` | Auction interface (Vercel) | ⚪ Absorb as module |
| `apdao-interface` | Legacy interface (Vercel) | ⚪ Superseded by world — archive |
| `apdao-docs` | Documentation (Vercel) | ⚪ Absorb or keep as static |
| `apdao-docs-es` | Spanish docs (Vercel) | ⚪ Same as docs |
| `apdao-transfer` | Transfer tool (Vercel) | ⚪ Absorb as route |

**Remaining work**:
1. Absorb auction-house functionality as module
2. Archive legacy apdao-interface
3. Deploy to Freeside (blocked on #128)

---

### 🔴 WORLD: honeypot (The HoneyPort → The HoneyPot)

> The portal. Where everything converges. Hub → HoneyPot transformation.

**Target**: `honeypot.0xhoneyjar.xyz` (or root domain)
**Repo**: [`0xHoneyJar/hub-interface`](https://github.com/0xHoneyJar/hub-interface)
**Stack**: Next.js 15 + TypeScript + Tailwind v4 + Wagmi + Dynamic SDK + Supabase (NOT YET sovereign)
**Freeside Terraform**: ❌ Not provisioned
**Dockerfile**: ❌ Not present

**This is the most complex world.** Currently a Next.js monorepo with packages (app, contracts, indexer). PR #24 is the V2 design system foundation with The Mint pipeline, 5 materials, MCV wiring.

**Consolidation status**:
| Source Repo | What | Status |
|-------------|------|--------|
| `hub-interface` | The portal (Next.js monorepo) | 🔴 Active development. PR #24 open. NOT on sovereign stack yet. |
| `honey-interface` | Protocol interface (Vercel) | ⚪ Absorb or redirect |
| `mcv-interface` | MoneyComb Vault UI (Vercel) | 🔴 Being rebuilt inside hub-interface (PR #24, Issue #18) |
| `moneycomb-interface` | Legacy MCV (Vercel) | ⚪ Archive — superseded |
| `honey-guard-interface` | Internal VaaS dashboard | ⚪ Absorb as admin module |
| `honeyOS` | HoneyOS (Vercel) | ⚪ Evaluate — absorb or archive |
| `mcv-contracts` | MCV Solidity contracts | Stays separate |
| `honeyjar-contracts` | THJ jar contracts | Stays separate |

**Critical context from PR #24**:
- MCV has 43 generated wagmi hooks, only 2 imported, only 1 wired (blocked by `BETA_MODE=true`)
- Proxy on-chain is V3, `closeAccount` requires V5 — upgrade blocked on @Zergucci
- Copy audit needed: "burn" → "deposit" (NFTs transfer to multisig, not destroyed)
- Identity initiative (Issue #20) unlocks Phase 2 cross-wallet features
- Financial pressure: months from infrastructure fund depletion

**Migration path (per flatline review)**:
1. **Phase A**: Move Next.js to Railway with `@next/standalone` (1-2h, instant savings)
2. **Phase B**: Eventually rewrite to SvelteKit when world-template is proven
3. MCV extracts to `moneycomb.0xhoneyjar.xyz` as separate world (iframe boundary = state boundary)

**Remaining work**:
1. Ship PR #24 (design system + MCV foundation)
2. Wire remaining vault hooks (Issue #18)
3. Verify proxy version (Issue #16)
4. Move to Railway (Phase A) — minimal effort, big savings
5. Eventually rewrite to sovereign stack (Phase B)

---

### 🔵 WORLD: purupuru

> Card venture — Tsuheji trading cards. THJ APAC.

**Target**: `purupuru.0xhoneyjar.xyz`
**Repo**: [`project-purupuru/world`](https://github.com/project-purupuru/world)
**Stack**: Currently Convex — needs full sovereign migration
**Freeside Terraform**: ❌ Not provisioned

**Consolidation status** (9 repos → 3):
| Source Repo | What | Status |
|-------------|------|--------|
| `project-purupuru/world` | Main world (Convex) | 🔵 Migration planned (kickoff doc exists) |
| `project-purupuru/score` | Score API | 🔵 Absorb in-process |
| `project-purupuru/puru` | UI components | 🔵 Absorb into world |
| `project-purupuru/observatory` | Observation layer | 🔵 Absorb into world |
| `project-purupuru/sonar` | Signal processing | 🔵 Absorb into world |
| `project-purupuru/fukuro` | Unknown | 🔵 Evaluate |
| `project-purupuru/game` | Battle/card game | 🔵 Absorb as module |
| `project-purupuru/contracts` | Solidity | Stays separate |
| `purupuru-metaphysical-ai-agent` | Sky Eyes AI agent | Stays separate (agent, not world) |

**Migration scope**: 18 Convex tables, 70 functions (41 queries, 27 mutations, 2 actions), 1 cron, 6 realtime subs, vector search. Estimated 12h.

**Spec**: [`kickoff-purupuru-migration.md`](grimoires/gecko/kickoff-purupuru-migration.md)

---

### 🔵 WORLD: cubquests

> Berachain faucet + quests. Resource economy (Fuel, Crystals, Quantum), badge merkle trees, partner verification.

**Target**: `cubquests.0xhoneyjar.xyz`
**Repo**: [`0xHoneyJar/cubquests-interface`](https://github.com/0xHoneyJar/cubquests-interface) (becomes the world)
**Stack**: Next.js 15 + Supabase + Dynamic Labs + Trigger.dev + Vercel (NOT YET sovereign)
**Freeside Terraform**: ❌ Not provisioned
**Archived**: cubquests-dashboard ✅, cubquests ✅

**External dependencies**:
- Supabase Postgres (79 migrations, ALL state)
- thj-envio (on-chain badge holder queries)
- Trigger.dev (badge snapshot + IPFS upload)
- Dynamic Labs (wallet auth)
- Upstash Redis (rate limiting)
- AWS S3 (badge images)
- Convex THJ Global (presence, read-only)
- Partner APIs (Mibera + Henlo quest verification)

**Estimated effort**: 35-50h
**Cost reduction**: $55-185/mo → $5/mo

**Spec**: [`specs/kickoff-cubquests-migration.md`](grimoires/gecko/specs/kickoff-cubquests-migration.md)

---

### ⚪ WORLD: henlo

> HENLO token ecosystem.

**Target**: `henlo.0xhoneyjar.xyz`
**Repos to consolidate**:
| Source Repo | What | Vercel URL |
|-------------|------|------------|
| `henlo-monorepo` | Main app | henlo-interface.vercel.app |
| `henlo-interface` | Interface (dup?) | henlo-interface.vercel.app |
| `henlo-app` | App | henlo-app.vercel.app |
| `plHenlo-app` | plHenlo | pl-henlo-app.vercel.app |
| `henlo-flip` | Flip game | henlo-flip.vercel.app |
| `henloflip-interface` | Flip interface | henloflip-interface.vercel.app |
| `henlo-landing-old` | Legacy landing | henlo-landing.vercel.app |
| `henlocker-docs` | Docs | henlocker-docs.vercel.app |

**Stack**: Next.js (current). Needs sovereign migration or Railway Phase A.
**Freeside Terraform**: ❌ Not provisioned
**Migration work**: Not started. No kickoff doc. Heavy consolidation needed (8 repos).

---

### ⚪ WORLD: set-and-forgetti

> PoL farming without the hassle.

**Target**: `saf.0xhoneyjar.xyz`
**Repos to consolidate**:
| Source Repo | What | Vercel URL |
|-------------|------|------------|
| `set-and-forgetti` | Main app | setandforgetti.io |
| `sf-landing` | Landing page | set-and-forgetti-landing.vercel.app |
| `sf-widget` | Widget | sf-widget-demo.vercel.app |
| `set-and-forgetti-widget` | Validator widget | validator-widget.vercel.app |
| `set-and-forgetti-registry` | Registry | set-and-forgetti-registry.vercel.app |
| `setandforgetti-docs` | Docs | setandforgetti-docs.vercel.app |
| `sf-interface-archived` | Archived | sf-interface-iota.vercel.app |
| `sf-contracts-v2` | Contracts | — |

**Stack**: Next.js + Convex (current). DeFi with real money — "must maintain" per flatline review.
**Freeside Terraform**: ❌ Not provisioned
**Migration work**: Not started. No kickoff doc.
**⚠️ CAUTION**: Active DeFi. Users manage real positions. Cannot break during migration.

---

### ⚪ WORLD: fatbera

> fatBERA validator ecosystem.

**Target**: `fatbera.0xhoneyjar.xyz`
**Repos to consolidate**:
| Source Repo | What | Vercel URL |
|-------------|------|------------|
| `fat-bera-interface` | Main app | fat-bera-interface.vercel.app |
| `fatBera-docs` | Docs | fat-bera-docs.vercel.app |
| `fatbera-withdrawal-monitor` | Withdrawal monitor (service) | — |
| `fatBERA-validator-depositor` | Validator depositor (service) | — |

**Stack**: Next.js (current).
**Freeside Terraform**: ❌ Not provisioned
**Migration work**: Not started. No kickoff doc.

---

### ⚪ WORLD: interpol

> LP lockers on Berachain. Rug insurance.

**Target**: `interpol.0xhoneyjar.xyz`
**Repos to consolidate**:
| Source Repo | What | Vercel URL |
|-------------|------|------------|
| `interpol-landing` | Landing | interpol-landing.vercel.app |
| `interpol-docs` | Docs | interpol-docs.vercel.app |
| `interpol-contracts` | Contracts | — |

**Stack**: Next.js (current).
**Freeside Terraform**: ❌ Not provisioned
**Migration work**: Not started.

---

### THJ Corporate (not a world — separate surface)

> B2B brand endpoint. Institutional intelligence surface.

**Target**: `thj.0xhoneyjar.xyz` or root domain
**Primary repo**: `thj-surface` (thj-corporate.vercel.app)

**Related repos** (absorb or archive):
| Source Repo | What | Vercel URL | Action |
|-------------|------|------------|--------|
| `thj-surface` | Corporate B2B surface | thj-corporate.vercel.app | KEEP — primary |
| `thj-docs` | Documentation | thj-docs-sandy.vercel.app | Absorb or redirect |
| `thj-registry` | Registry | thj-registry.vercel.app | Evaluate |
| `internal-dashboard` | Internal dashboard | internal-dashboard.vercel.app | Absorb or keep internal |
| `score-dashboard` | Score dashboard | score-dashboard.vercel.app | Absorb or archive |
| `thj-internal-ops-book` | Ops book | thj-internal-ops-book.vercel.app | Absorb |
| `explorer-interface` | Explorer | explorer-interface.vercel.app | Evaluate |
| `partners-interface` | Partners | partners-interface.vercel.app | Absorb |
| `ecosystem-api` | Ecosystem API | ecosystem-api-psi.vercel.app | Evaluate |

---

### Misc / Tools / Archive Candidates

These don't fit neatly into worlds. Triage needed:

| Repo | Vercel URL | Recommendation |
|------|------------|----------------|
| `beradrops-interface` | beardrops-interface.vercel.app | Evaluate — active? |
| `community-interface` | community-interface.vercel.app | Absorb into honeypot or archive |
| `crayons-monorepo` | harbor-mu.vercel.app | Evaluate |
| `tomato-patch` | tomato-patch.vercel.app | Evaluate — internal tool? |
| `tomato-chicago` | tomato-farm-nu.vercel.app | Evaluate |
| `culture-legos` | culture-legos.vercel.app | Archive candidate |
| `ooga-booga-landing` | ooga-booga-landing.vercel.app | Archive candidate |
| `crest-of-arms` | crest-of-arms.vercel.app | Archive candidate |
| `hotdog-safe` | hotdog-safe.vercel.app | Evaluate |
| `guz` | guz-seven.vercel.app | Evaluate |
| `score-words` | score-words-five.vercel.app | Archive candidate |
| `r3f-sandbox` | r3f-sandbox.vercel.app | Keep as dev sandbox |
| `w3ga` | — | Evaluate |
| `marketing` | — | Evaluate |
| `geo` | — | Evaluate — GEO monitoring tool |

---

## Migration Priority Sequence

Based on existing specs, financial pressure, and dependency order:

### Phase 1: Ship What's Ready (NOW)

| # | Action | Effort | Blocked By |
|---|--------|--------|------------|
| 1a | Fix Fargate vCPU quota (#128) | Jani | — |
| 1b | Deploy rektdrop to Freeside | Low — code ready | #128, DNS (#106) |
| 1c | Deploy mibera to Freeside | Low — code ready | #128, DNS (#106) |
| 1d | Deploy apdao to Freeside | Low — code ready | #128, DNS (#106) |
| 1e | Archive `sprawl-protocol/wire` | 5 min | — |
| 1f | Kill score-sprawl Railway service | Low — logic already in interface | Testing |

### Phase 2: Quick Wins — Railway Phase A (NEXT)

Move Next.js apps to Railway with `@next/standalone`. No rewrite. Instant Vercel savings.

| # | Action | Effort | Savings |
|---|--------|--------|---------|
| 2a | honeypot (hub-interface) → Railway | 1-2h | Vercel cost |
| 2b | cubquests-interface → Railway | 1-2h | Vercel cost |
| 2c | fat-bera-interface → Railway | 1-2h | Vercel cost |
| 2d | henlo-monorepo → Railway | 1-2h | Vercel cost |
| 2e | set-and-forgetti → Railway | 1-2h | Vercel cost |
| 2f | interpol-landing → Railway or static | 1h | Vercel cost |
| 2g | Cancel QuikNode (RPC migration) | Env var changes | $50-200/mo |

### Phase 3: Sovereign Rewrites (WHEN READY)

Full SvelteKit + Turso migrations for worlds that benefit from it:

| # | Action | Effort | Spec Exists? |
|---|--------|--------|-------------|
| 3a | Purupuru → sovereign stack | 12h est | ✅ kickoff-purupuru-migration.md |
| 3b | CubQuests → sovereign stack | TBD | ❌ Need kickoff doc |
| 3c | Henlo → sovereign stack | TBD | ❌ Need kickoff doc (8 repos to consolidate) |
| 3d | Set & Forgetti → sovereign stack | TBD | ❌ Need kickoff doc (DeFi — careful) |
| 3e | FatBera → sovereign stack | TBD | ❌ Need kickoff doc |
| 3f | Interpol → sovereign stack | TBD | ❌ Need kickoff doc |
| 3g | HoneyPot → sovereign stack | 30-40h est | ❌ Need kickoff doc (most complex) |

### Phase 4: Infrastructure Completion

| # | Action | Dependency |
|---|--------|------------|
| 4a | Deploy Finn (AI gateway) — minimal surface | Fargate unblocked |
| 4b | Provision remaining worlds in Terraform | Per world as they're ready |
| 4c | DNS migration to Route 53 (#106) | Jani |
| 4d | SQLite backup strategy (Litestream or Turso cloud sync) | Architecture decision |
| 4e | RPC reverse proxy (fix B2 blocker) | Jani |
| 4f | Vercel account sunset | All apps migrated |

---

## Loa Stack Integration (L1-L5)

| Layer | What | Status | World Integration |
|-------|------|--------|-------------------|
| **L1 loa** | Dev framework, skills, quality gates | ✅ SHIPPED | Mounted in every world via git submodule |
| **L2 hounfour** | 304+ TypeBox schemas (JWT, billing, routing) | 🟡 SHIPPING | npm dependency for type validation |
| **L3 finn** | Model routing, billing, sessions, BYOK | 🔴 BUILT, needs deploy | Worlds call via internal HTTP + JWT |
| **L4 freeside** | Auth, API gateway, JWKS, Terraform | 🟡 PARTIALLY DEPLOYED | Worlds authenticate through freeside |
| **L5 dixie** | Oracle product (cross-project memory) | 🔴 BUILT, needs deploy | IS a world itself |

---

## Cost Model

| Scenario | Monthly Cost |
|----------|-------------|
| **Current state** (56 Vercel + Railway + AWS + Convex + Dynamic) | $900 — $2,100 |
| **Phase 2 complete** (Next.js on Railway, kill Vercel) | ~$200 — $400 |
| **Phase 3 complete** (sovereign stack, kill Convex + Dynamic) | ~$100 — $200 |
| **Phase 4 complete** (all worlds on Freeside) | ~$150 baseline + ~$1/world |

Target: 10 worlds × ~$1/world + $150 baseline = **~$160/mo** (vs current $900-2,100)

---

## Services to Kill (After Migration)

| Service | Monthly Cost | Kill After |
|---------|-------------|------------|
| Vercel (56 apps) | $400-790 | Phase 2 (Railway migration) |
| Convex (rektdrop, purupuru, S&F) | $100-300 | Phase 3 (Turso migration) |
| Dynamic Labs SDK | $0-200 | Identity initiative (Issue #20) |
| QuikNode | $50-200 | Phase 2g (RPC migration) |
| Supabase (honeyroad, others) | $25-75 | Per-world migration |

---

## Open Questions

1. **Honeyroad**: Separate world (`honeyroad.mibera.io`) or mibera module? Heavy external deps (Trigger.dev, Supabase, S3).
2. **HoneyPot identity**: Does "Sign in with THJ" (Issue #20) need to ship before worlds can share auth?
3. **Finn minimal surface**: What's the smallest deployment — routing + billing only? Or wait until more worlds are live?
4. **Scale-to-zero**: Can worlds sleep when idle? Most get <100 visits/day.
5. **Archive ceremony**: How many of the 56 Vercel apps can be archived immediately? Need triage pass.
6. **Convex export tooling**: Flatline review notes this is "not a 1-hour task" for 22-table rektdrop. Budget 3-4h for tooling.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-02 | Initial tracker created. Inventoried 56 Vercel apps, mapped 10 worlds + corporate surface, linked all existing specs. |
