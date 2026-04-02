# Session 36 — Sovereign Deploy Context Pack

> Captures: OSTROM architecture brief, production fix, deploy pipeline state.
> Cross-repo: applies to `sprawl-protocol/interface` (local: `rektdrop-interface`).

---

## What Was Done

### Phase 1: Production Fix (SHIPPED)
- **Root cause**: Railway `CONVEX_DEPLOYMENT=dev:uncommon-goshawk-452` → should be `prod:fearless-goldfinch-669`
- **Fixed**: All 4 Convex env vars (CONVEX_DEPLOYMENT, PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_URL, NEXT_PUBLIC_CONVEX_SITE_URL)
- **Result**: Deploy SUCCESS, healthcheck 200, leaderboard returns 500 entries, /api/chat validates correctly
- **Three bugs resolved by one fix**: wrong instance, empty leaderboard, rateLimits type mismatch

### Phase 2: GHCR Activation (DASHBOARD REQUIRED)
Railway CLI cannot switch service source or delete variables. Requires:
1. Railway Dashboard → `interface` service → Settings → Source → Docker Image
2. Image: `ghcr.io/sprawl-protocol/interface:latest`
3. GHCR credentials: GitHub PAT with `read:packages`
4. Delete `NIXPACKS_BUILD_CMD` variable
5. Add `railway redeploy` step to GitHub Actions workflow

### Phase 3: Architecture Brief (WRITTEN)
- Spec: `rektdrop-interface/grimoires/bridgebuilder/specs/arch-sovereign-deploy.md`
- Three tiers: GHCR pre-built (6s, now) → Bun compile (4s, next sprint) → Binary-only (2s, future)
- Key discovery: `@eslym/sveltekit-adapter-bun` v2 solves the compile asset embedding problem
- Railway benchmark: 6s for pre-built images (their own blog)

## Known Code Bug (not blocking, needs fix)
- `convex/rateLimits.ts:20`: `check = query({...})` — defined as query
- `src/routes/api/chat/+server.ts:499`: `makeFunctionReference<'mutation'>('rateLimits:check')` — called as mutation
- Works on prod because Convex prod instance has matching types
- Will break on next `npx convex deploy` — fix the reference to `<'query'>` and use `client.query()`

## Key Rotation Needed
- ANTHROPIC_API_KEY — exposed in S35, in .env.local, and on Railway
- ALCHEMY_API_KEY — same
- Also exposed in .env.local: OPENAI_API_KEY, GOOGLE_API_KEY, DUNE_API_KEY

## Railway Project Context
- Project: `rektdrop-interface` (The Honey Jar workspace)
- Service: `interface`
- Environment: `production`
- Link command: `railway link -p rektdrop-interface -e production -s interface`

---

*For Phase 2 execution, open Railway dashboard and follow the GHCR checklist above.*
*For Phase 3 sprint planning, run `/plan-and-analyze` with the arch brief.*
