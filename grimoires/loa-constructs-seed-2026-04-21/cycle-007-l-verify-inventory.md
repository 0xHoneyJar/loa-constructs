# Cycle-007 · L-verify · Apps Inventory (Draft)

> **Status**: L-verify research output · operator-review-gated before L-lift-explorer / L-remove-stale start destructive work
> **Date**: 2026-04-23 late (cycle-007 dispatch)
> **Target placement**: `sprawl-world/docs/apps-inventory.md` (port after operator review)
> **ACs addressed**: V.1–V.4

---

## 1 · Sprawl-world apps (ground truth)

| App | Package name | Tracked? | Purpose | Stack | Status |
|---|---|---|---|---|---|
| **(repo root, SvelteKit app)** | `sprawl-world` | ✓ tracked | The Rektdrop surface itself — claim, board, card, daemon, missions, profile, prototype, reading routes | SvelteKit 5 + libSQL + viem + SSE | **canonical + active** |
| `apps/dashboard/` | `@sprawl-world/dashboard` | ✓ tracked (040000 tree) | Freeside Dashboard — admin console for worlds on sovereign infra | SvelteKit 5 + Drizzle + AWS SDK + @xyflow/svelte | **canonical + active** (unstaged mods on `bridge/freeside-dashboard-truthing`) |
| `apps/constructs-network/` | `loa-constructs` (!) | ✗ UNTRACKED | **Staging fossil** — cp -r of entire loa-constructs monorepo from 2026-04-16 | Nested monorepo (apps/{api,docs,explorer} inside) | **not canonical; dispose** |
| `packages/components-schema/` | workspace pkg | ✓ | Shared component schema types | — | active |
| `packages/sprawlos-tokens/` | workspace pkg | ✓ | SprawlOS design tokens | — | active |
| `world-template/` | — | ✓ | Sovereign-stack starter for new worlds (SvelteKit + Turso + Railway) | — | reference template |

### Sprawl-world identity (non-obvious)

- sprawl-world root `package.json` declares `name: sprawl-world`, NO `workspaces` key. Monorepo harness is `pnpm-workspace.yaml` declaring `apps/*` + `packages/*`.
- The `src/` at root IS the Rektdrop SvelteKit app — routes live at `src/routes/` (claim, board, card, daemon, missions, profile, prototype, reading, ~[username], api, dev).
- `apps/dashboard` is distinct from root-SvelteKit: different intention (admin for worlds on Freeside), different target (Freeside dashboard canvas).
- `world-template/` is NOT a Sprawl-specific surface — it's the generic sovereign-stack starter for any new world.

---

## 2 · loa-constructs apps (ground truth)

| App | Package name | Tracked? | Purpose | Stack | Status (cycle-007) |
|---|---|---|---|---|---|
| `apps/api/` | `@loa-constructs/api` | ✓ | Registry / network API (Hono) | Hono + Supabase + Drizzle | **stays** — THIS IS the network |
| `apps/docs/` | (docs) | ✓ | Network docs (VitePress) | VitePress | **stays** — network docs |
| `apps/explorer/` | `@loa-constructs/explorer` | ✓ | constructs.network browse/install UI | Next.js 15 + React 19 + Dynamic Labs + wagmi + Convex + R3F + xyflow + Sentry | **LIFT** to sprawl-world |
| `loa-freeside/packages/adapters/billing/polar/` | (no pkg; scaffold) | ✓ | Polar billing adapter stub (cycle-001 residue) | 4 files, all `NotImplementedError` | **REMOVE** — belongs in Jani's loa-freeside repo |
| `(repo root)` purupuru-{density-and-hold,ecs-architecture,game-flow}.png | — | ✓ | Purupuru world artifacts, bled in at unknown point | PNG | **REMOVE** — world-artifact, wrong repo |

---

## 3 · The cp -r staging fossil (critical finding)

`sprawl-world/apps/constructs-network/` state:

```
sprawl-world/apps/constructs-network/            ← UNTRACKED (0 git-tracked files)
├── apps/
│   ├── api/        ← copy of loa-constructs/apps/api
│   ├── docs/       ← copy of loa-constructs/apps/docs
│   └── explorer/   ← copy of loa-constructs/apps/explorer
├── packages/       ← copy of loa-constructs/packages
├── CLAUDE.md       ← copy of loa-constructs/CLAUDE.md
├── package.json    ← name: "loa-constructs" (root package.json copy)
├── purupuru-density-and-hold.png    ← stray artifact
├── purupuru-ecs-architecture.png    ← stray artifact
├── purupuru-game-flow.png           ← stray artifact
└── ... (full loa-constructs tree)
```

- **mtime**: Apr 16 21:56 2026 — predates cycle-007 scoping (2026-04-23 late) by ~7 days
- **not in .gitignore** but not committed
- **4.5 MB total** (node_modules never installed — just source)
- Creates a **monorepo-in-a-monorepo** structure (nonsensical; likely an abandoned staging attempt from a prior session)

**Operator's dispatch assertion** (*"sprawl-world/apps/constructs-network IS canonical; loa-constructs/apps/explorer is legacy"*) is **aspirational / intent**, not current reality. The lift has not happened; the nested copy is WIP staging that was forgotten.

---

## 4 · Canonical statement (AC-V.2)

> As of cycle-007 dispatch, the canonical Sprawl apps are **`sprawl-world` (root SvelteKit Rektdrop app)** + **`sprawl-world/apps/dashboard` (Freeside Dashboard)**.
>
> `sprawl-world/apps/constructs-network/` IS NOT CURRENTLY CANONICAL. It is a staging fossil. `loa-constructs/apps/explorer/` remains the live `constructs.network` deployment source until L-lift-explorer relocates it properly.
>
> The target state after cycle-007 L-lift-explorer: `sprawl-world/apps/constructs-network/` becomes a tracked workspace package `@sprawl-world/constructs-network` (not nested-monorepo), integrated into sprawl-world's pnpm-workspace.yaml, with Vercel deployment of `constructs.network` repointed accordingly.

---

## 5 · Version drift analysis (AC-V.3)

Since the nested copy is a cp -r of loa-constructs (no divergent development), there is **no feature-level drift** — the nested copy is identical to loa-constructs as of Apr 16.

**Architectural drift** (what's structurally different):

| Axis | sprawl-world/apps/constructs-network (nested) | loa-constructs/apps/explorer (live) |
|---|---|---|
| Package identity | `name: "loa-constructs"` (root pkg) — wrong level | `@loa-constructs/explorer` — correct |
| Workspace integration | None (nested monorepo, no parent hookup) | Part of loa-constructs workspaces |
| Vercel config | `cd apps/explorer && bun run build` | `cd ../../packages/shared && bun run build && cd ../../apps/explorer && bun run build` |
| Deployment target | None live | constructs.network (Vercel, live) |
| Orphan assets | 3 purupuru PNGs (cp'd along) | Same 3 PNGs at loa-constructs root (source of cp) |

**Migration plan for L-lift-explorer**:

1. Dispose `sprawl-world/apps/constructs-network/` (untracked, zero-risk delete)
2. Move `loa-constructs/apps/explorer/` → `sprawl-world/apps/constructs-network/` via `git mv` in sprawl-world (requires source copy; git history will fork)
3. Rename package: `@loa-constructs/explorer` → `@sprawl-world/constructs-network`
4. Update `@loa-constructs/shared: workspace:*` dependency → vendor OR re-export via sprawl-world
5. Integrate into sprawl-world pnpm-workspace.yaml (already declares `apps/*` — automatic)
6. Update Vercel config: cross-repo switch from `0xHoneyJar/loa-constructs` to `0xHoneyJar/sprawl-world`, build command aligned to sprawl-world monorepo
7. Remove from loa-constructs: `apps/explorer/`, `@dynamic-labs/*`, `wagmi`, `viem` (if only explorer used), three.js, framer-motion, etc
8. Remove orphan PNGs from loa-constructs root
9. Smoke-test deploys from both repos (sprawl-world constructs-network deploys cleanly; loa-constructs still builds api + docs)

**Git history**: a `git mv` cross-repo is a `git rm` + `git add` — history doesn't follow. Acceptable trade-off; source paths visible in git log of both repos.

---

## 6 · Dashboard verification (AC-V.4)

`sprawl-world/apps/dashboard/package.json`:

```json
{
  "name": "@sprawl-world/dashboard",
  "description": "Freeside Dashboard — admin console for worlds running on sovereign infrastructure",
  ...
}
```

| Check | Result |
|---|---|
| Package name scoped to sprawl-world? | ✓ `@sprawl-world/dashboard` |
| Description states Sprawl/Freeside identity? | ✓ "Freeside Dashboard — admin console for worlds" |
| NOT a freeside repo dashboard? | ✓ This is sprawl-world's hosted copy; loa-freeside has its own |
| Workspace hooks? | ✓ imports `@sprawl-world/components-schema`, `@sprawl-world/sprawlos-tokens` |
| Active development? | ✓ unstaged mods on `bridge/freeside-dashboard-truthing`: `DeployHistory.svelte`, `github.ts` |

**Verdict**: canonical Sprawl dashboard, operator-confirmed.

---

## 7 · Symlink dependency topology (L-migrate blocker)

sprawl-world currently depends on live symlinks into loa-constructs:

```
sprawl-world/
├── .claude/scripts/compose-run.sh              → loa-constructs/.claude/scripts/compose-run.sh
├── .claude/scripts/compose-panes.sh            → loa-constructs/.claude/scripts/compose-panes.sh
├── .claude/scripts/compose-panes-render.sh     → loa-constructs/.claude/scripts/compose-panes-render.sh
├── .claude/scripts/stage-executor-tmux.sh      → loa-constructs/.claude/scripts/stage-executor-tmux.sh
└── grimoires/compositions/website-scaffold.yaml → loa-constructs/grimoires/compositions/website-scaffold.yaml
```

**Origin**: cycle-006 ships these scripts in loa-constructs; sprawl-world uses them via symlink as interim mechanism. L-migrate (`0xHoneyJar/loa#616`, OPEN, mergeable, awaiting @janitooor) relocates the scripts into Loa proper so the symlinks can repoint to `~/.loa/scripts/`.

**Impact**: until loa#616 merges + sprawl-world repoints its symlinks, the *"sprawl-world is the reference implementation of worlds-vs-lenses"* claim (AC-ER.1) carries a latent "conditional on loa#616" caveat. Path C handles this: surface to @janitooor mid-cycle, aim to land during the cycle-007 window.

---

## 8 · Three smoking guns in loa-constructs (summary)

| # | Artifact | Size | Class | Disposition |
|---|---|---|---|---|
| 1 | `apps/explorer/` | 5.4 GB (mostly node_modules + .next) | UI app with wallet/wagmi bleed | LIFT to sprawl-world (L-lift-explorer) |
| 2 | `loa-freeside/packages/adapters/billing/polar/` | ~5 KB | Dead billing adapter scaffold (cycle-001) | REMOVE (L-remove-stale); belongs in Jani's loa-freeside repo if anywhere |
| 3 | `purupuru-*.png` at repo root (3 files) | small | World-artifact bleed | REMOVE (L-cleanup-loa-constructs); belongs in purupuru repo if anywhere |

Shared class: **payment-layer + world-artifact bleed into the network-infrastructure repo**. All three addressed by cycle-007; together they close the *"what this repo owns"* drift that surfaced during cycle-006 close.

---

## 9 · What this inventory produces for downstream legs

| Leg | Inputs from this inventory |
|---|---|
| **L-lift-explorer** | Migration plan §5. First step must be dispose `sprawl-world/apps/constructs-network/` (untracked cp -r) before doing the real lift |
| **L-delineate-responsibility** | §8 three-smoking-guns table is the exhibit for the boundary statement |
| **L-remove-stale** | Adds polar scaffold (smoking gun #2) as second target alongside sprawl-protocol-world deletion |
| **L-cleanup-loa-constructs** | Adds purupuru PNG removal (smoking gun #3) as additional target |
| **L-exemplar-readme** | Requires L-lift-explorer to complete before sprawl-world can be pointed-at as canonical; until then, "conditional on loa#616 + L-lift-explorer" caveat |
| **L-inheritance-mechanism** | apps/dashboard is already canonical → can target inheritance against it without waiting for explorer lift; explorer joins the inheritance-participants pool after L-lift-explorer completes |

---

## 10 · Operator-review decisions required before destructive work

1. ✅ Confirm disposition of `sprawl-world/apps/constructs-network/` untracked staging — operator approves deletion before L-lift-explorer starts
2. ✅ Confirm `git mv` cross-repo approach (history fork acceptable) for L-lift-explorer OR pick alternative (e.g. fresh scaffold in sprawl-world, no history carry)
3. ✅ Confirm `@loa-constructs/shared` dependency strategy: vendor into sprawl-world, re-export, or reorganize into a shared `packages/` between both repos
4. ✅ Confirm Vercel cross-repo switch is acceptable (constructs.network domain repoint)
5. ✅ Confirm removal of purupuru PNGs from loa-constructs root (third smoking gun)
6. ✅ Ratify L-verify inventory as ground truth for remaining legs

---

*Draft authored 2026-04-23 late during cycle-007 L-verify. Port to `sprawl-world/docs/apps-inventory.md` after operator review and before L-lift-explorer completion.*
