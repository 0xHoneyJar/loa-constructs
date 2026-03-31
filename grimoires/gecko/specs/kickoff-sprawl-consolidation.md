# Session: Sprawl Protocol Consolidation

> Collapse 4 repos into 1. Kill wire. Absorb score. Formalize world. Ship on sovereign stack.

## Context

sprawl-protocol has 4 repos that should be 1:

| Repo | Status | Action |
|------|--------|--------|
| **interface** | Active. SvelteKit + Convex. The frontend. | **KEEP** — this becomes the world |
| **score** | Active. Hono + SQLite + Railway. Scoring engine. | **ABSORB** into interface as `src/lib/score/` |
| **wire** | Dead. Dune pipeline duplicated in score + interface. Supabase unused. | **ARCHIVE** |
| **world** | 36 markdown files. Design tokens + daemon voice. Not consumed, just referenced. | **ABSORB** into interface as design system files |

The Convex → Turso migration (PRD already written at `grimoires/loa/prd.md` in rektdrop-interface) runs in parallel. This kickoff is about the repo consolidation — what moves where, in what order.

## Load Order

1. This file — the consolidation plan
2. `grimoires/gecko/world-architecture.md` — the target structure (in loa-constructs)
3. `grimoires/gecko/sovereign-stack-kickoff.md` — Convex → Turso migration patterns (in loa-constructs)
4. `grimoires/loa/prd.md` — the Convex migration PRD (already in rektdrop-interface)

## Invariants

1. **Score API stays running during migration.** Interface currently calls it via HTTP. Don't break that path until score logic is fully absorbed and tested in-process.
2. **Production stays live on Railway.** No downtime. Branch migration, test, cut over.
3. **taste.md and voice.md are canonical.** The interface's inline CSS and hardcoded verdict lines are copies — world's files are the source of truth. After absorption, the source lives in `src/lib/design/`.
4. **Daemon chat streaming unchanged.** @ai-sdk/anthropic + Claude. Only the session/message storage changes (Convex → Turso).

## What Moves Where

### Score → `src/lib/score/`

Score is already clean: Hono API + SQLite + Drizzle. The absorption means taking its core logic and running it in-process instead of as a separate Railway service.

**What to copy**:
```
sprawl-protocol/score/src/
├── services/signals.ts      → src/lib/score/signals.ts
├── services/scoring.ts      → src/lib/score/scoring.ts
├── services/pipeline.ts     → src/lib/score/pipeline.ts
├── db/schema.ts             → MERGE into src/lib/db/schema.ts
└── data/*.csv               → data/ (static data files)
```

**What to drop**:
- Hono routes (replaced by SvelteKit API routes)
- Middleware (auth, cache-headers — SvelteKit handles this)
- Separate Railway service + deployment config
- pnpm (interface uses bun)

**Bridge pattern**: During migration, keep score running as a separate Railway service. Interface calls it via HTTP (current behavior). Once score logic works in-process, switch interface to use `src/lib/score/` directly, then kill the Railway service.

Score's 3-layer schema (Bronze → Silver → Gold) merges into the single Turso database:
- **Bronze** (raw Dune data): `dune_nft_pnl`, `dune_erc20_pnl` → Turso tables
- **Silver** (behavioral signals): `wallet_signals` → Turso table
- **Gold** (scored profiles): `wallet_profiles`, `wallet_badges`, `population_stats` → Turso tables

This replaces score's `better-sqlite3` with Turso's `@libsql/client`. Same SQLite underneath, just managed by Drizzle with embedded replica sync.

### Wire → Archive

Wire is superseded. Its roles:
- Dune fetching → score does this via CSV ingest + admin endpoint
- Loss calculation → score does this with behavioral signals
- Supabase storage → interface uses Convex (soon Turso)
- Convex sync → interface handles its own Convex backend

**Action**: `gh repo archive sprawl-protocol/wire`. No code to move. Historical data in Supabase can be exported if ever needed.

### World → `src/lib/design/` + `src/lib/daemon/`

World is 36 files of design tokens and daemon personality. Currently manually mirrored into the interface.

**What to copy**:
```
sprawl-protocol/world/
├── taste.md                 → src/lib/design/taste.md (canonical reference)
├── voice.md                 → src/lib/daemon/voice.md (canonical reference)
├── grimoires/sprawl/ecs/    → grimoires/sprawl/ecs/ (architecture docs)
└── construct.yaml           → keep at root (world IS a construct)
```

**Formalize consumption**:
- Extract oklch values from taste.md → `src/lib/design/tokens.css` (generated, not hand-copied)
- Extract verdict lines from voice.md → `src/lib/daemon/verdicts.ts` (typed, importable)
- The generation can be a script: `bun scripts/sync-design.ts` reads taste.md/voice.md → produces CSS + TS

This means taste.md stays the source of truth (human-readable, editable) and the code files are generated from it. Change the markdown, run the script, design system updates.

### Interface → The World

After absorbing score + world, the interface repo becomes the single world repo. Structure:

```
sprawl-protocol/interface/          (rename to sprawl-protocol/world eventually)
├── src/
│   ├── routes/                     ← rooms (unchanged)
│   │   ├── api/sse/                ← SSE endpoints (replaces Convex subscriptions)
│   │   ├── api/chat/               ← daemon streaming (unchanged)
│   │   └── api/[mutations]/        ← REST writes (replaces Convex mutations)
│   ├── lib/
│   │   ├── db/                     ← Turso/Drizzle (replaces convex/)
│   │   │   ├── schema.ts           ← merged: interface tables + score bronze/silver/gold
│   │   │   ├── queries/            ← typed reads
│   │   │   └── mutations/          ← typed writes
│   │   ├── score/                  ← from sprawl-protocol/score
│   │   │   ├── signals.ts          ← 5 behavioral signals
│   │   │   ├── scoring.ts          ← rektScore, tier, ASH, badges
│   │   │   └── pipeline.ts         ← ingest → signals → scoring
│   │   ├── design/                 ← from sprawl-protocol/world
│   │   │   ├── taste.md            ← canonical tokens (source of truth)
│   │   │   ├── tokens.css          ← generated from taste.md
│   │   │   └── springs.ts          ← motion physics
│   │   ├── daemon/                 ← from sprawl-protocol/world
│   │   │   ├── voice.md            ← canonical voice (source of truth)
│   │   │   ├── verdicts.ts         ← generated from voice.md
│   │   │   └── soul.ts             ← persistent daemon memory
│   │   ├── wallet.svelte.ts        ← vanilla EIP-6963 (already exists)
│   │   ├── realtime.svelte.ts      ← SSE helper (from migration)
│   │   └── [existing modules]      ← phase, audio, feedback, haptics, etc.
│   └── hooks.server.ts             ← db init, crons, middleware
├── contracts/abis/                  ← if any on-chain reads needed
├── evals/                           ← already exists (daemon quality)
├── scripts/
│   ├── seed.ts                      ← pull from Dune/external → Turso
│   ├── sync-design.ts              ← taste.md → tokens.css, voice.md → verdicts.ts
│   └── score-ops.ts                ← balance check, credit, debit (from PRD)
├── data/                            ← Dune CSVs, identity crossrefs (from score)
├── mcp/                             ← optional: agent-queryable tools
├── drizzle/                         ← migration SQL
├── grimoires/                       ← architecture docs, tracks, session records
├── e2e/                             ← Playwright tests
├── CLAUDE.md                        ← agent instructions (update: remove Convex refs)
└── construct.yaml                   ← this world IS a construct
```

## Build Sequence (dependency-ordered)

### Phase 1: Archive wire (15 min)

```bash
gh repo archive sprawl-protocol/wire
```

Done. No dependencies on it.

### Phase 2: Absorb world → interface (1h)

1. Copy `taste.md` → `src/lib/design/taste.md`
2. Copy `voice.md` → `src/lib/daemon/voice.md`
3. Write `scripts/sync-design.ts`:
   - Parse oklch values from taste.md → generate `src/lib/design/tokens.css`
   - Parse verdict lines from voice.md → generate `src/lib/daemon/verdicts.ts`
4. Run the script, verify CSS tokens match current inline values
5. Replace hardcoded values in components with imports from generated files
6. Copy ECS architecture docs → `grimoires/sprawl/ecs/`

### Phase 3: Convex → Turso migration (the big one — follows PRD)

This is the 15-20h effort already specced in `grimoires/loa/prd.md`. The consolidation doc doesn't re-spec this — it points to the PRD.

Key: the PRD's schema translation already accounts for the 22 Convex tables. When score is absorbed (Phase 4), we ADD score's bronze/silver/gold tables to the same Turso database.

### Phase 4: Absorb score → interface (3h)

**After Turso migration is running.** Not before.

1. Copy score's core logic:
   - `services/signals.ts` → `src/lib/score/signals.ts`
   - `services/scoring.ts` → `src/lib/score/scoring.ts`
   - `services/pipeline.ts` → `src/lib/score/pipeline.ts`
2. Add score's schema tables to `src/lib/db/schema.ts`:
   - Bronze: `duneNftPnl`, `duneErc20Pnl`
   - Silver: `walletSignals`
   - Gold: `walletProfiles`, `walletBadges`, `populationStats`
3. Run `drizzle-kit generate` + `drizzle-kit migrate`
4. Replace HTTP calls to score-sprawl with direct function calls:
   ```typescript
   // Before: fetch(`${SCORE_URL}/v1/wallets/${addr}`)
   // After:  import { getWalletProfile } from '$lib/score'
   ```
5. Copy `data/*.csv` → `data/` (Dune snapshots for seeding)
6. Add ingest script: `bun scripts/seed.ts` reads CSVs → populates bronze → runs pipeline
7. Test: scoring produces same results as external service
8. Kill score Railway service

### Phase 5: Rename + cleanup (30min)

- Consider renaming repo: `sprawl-protocol/interface` → `sprawl-protocol/world` (the world IS the interface now)
- Archive `sprawl-protocol/world` (old construct — now absorbed)
- Update Railway service name if desired
- Update CLAUDE.md: remove all Convex references, document new module structure
- Update construct.yaml: merge world's construct identity into interface

## What NOT to Build

- No new features during consolidation
- No design system changes (just formalize what exists)
- No daemon personality changes (just move the files)
- No new rooms or routes
- No score algorithm changes (just move the code)
- No Dune pipeline changes (just move the ingest script)

## Verify

After each phase:

- [ ] `bun dev` boots cleanly (no Convex, no external score dependency)
- [ ] `bun run build` exits 0
- [ ] Dashboard loads, leaderboard populates
- [ ] Daemon chat works (Claude streaming + session persistence)
- [ ] Wallet connect works (Berachain mainnet)
- [ ] Score computation matches external service output
- [ ] Railway deploy succeeds

## Railway After Consolidation

```
Railway Project: THJ Worlds
├── rektdrop-interface    $5/mo  ← the world (everything in one service)
│   ├── Volume: /data/rektdrop.db
│   └── Env: TURSO_URL, ANTHROPIC_API_KEY, DUNE_API_KEY
│
└── (score-sprawl)        $0     ← KILLED after Phase 4
```

One service. One volume. One deploy. $5/mo.

## Template Opportunity

After this consolidation proves the pattern, extract a template:

```bash
gh repo create sprawl-protocol/world-template --template
```

The template contains the empty modular world structure:
- SvelteKit + Turso + Drizzle + Railway
- Vanilla wallet (EIP-6963)
- SSE realtime helper
- Design system scaffold (taste.md → tokens.css generation)
- CLAUDE.md with agent instructions
- Dockerfile + Railway config

Anyone clicks "Use this template" and gets a working $5/mo world. aphive, pyonpyon, El Capitan's future projects — all start from here. The world-architecture.md is the reference. The template is the executable version.

## Key References

| Topic | Location |
|-------|----------|
| World architecture pattern | `loa-constructs/grimoires/gecko/world-architecture.md` |
| Sovereign stack migration | `loa-constructs/grimoires/gecko/sovereign-stack-kickoff.md` |
| Convex → Turso PRD | `rektdrop-interface/grimoires/loa/prd.md` |
| Score API source | `sprawl-protocol/score/src/` |
| Design tokens source | `sprawl-protocol/world/taste.md` |
| Daemon voice source | `sprawl-protocol/world/voice.md` |
