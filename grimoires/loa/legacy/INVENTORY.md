# Legacy Documentation Inventory — /ride 2026-07-12

> 59 documentation files found (see `doc-files.txt`; excludes node_modules, .git, grimoires state history, .claude System Zone, .run, cycles/, evals/ corpora).

## Root Docs

| Doc | Type | Lines | Key verifiable claims |
|-----|------|-------|----------------------|
| `README.md` | README | 196 | Badge v2.41.0 (:4) — STALE vs tag v2.50.4 · framework "v1.130.0" (:11) vs actual 1.196.0 · Quick-start commands `constructs-install.sh` / `constructs-active` / `constructs-list` (:31-40) — scripts REMOVED from `.claude/scripts/` by today's force-restore (present in `.claude.backup.1783885618/scripts/`) · "This repo owns the schema (.claude/schemas/composition.schema.json) + the runner (compose-run.sh)" (:110) — BOTH ABSENT (schema was at `schemas/runtime/`, also only in backup) · Develop section `bun --filter explorer dev` (:186) — GHOST, explorer lifted out per cycle-007 (stated in the same file :168) · "N payment rails … NONE live here; rail-agnostic" (:160) — tension with `apps/api/src/services/stripe.ts`, `stripe-connect.ts`, `payouts.ts` + Stripe checkout routes |
| `CHANGELOG.md` | changelog | ~600 | Head 2.41.0 (2026-05-09); missing 2.42–2.50.4 |
| `CLAUDE.md` | AI guidance | 103 | Project instructions; quality score below |
| `AGENTS.md` | AI guidance | symlink-style mirror of CLAUDE.md (multi-runtime kernel pattern) |
| `PROCESS.md` | workflow guide | 1781 | Loa managed-scaffolding workflow: agents, phases, mount & ride, A2A memory — framework doctrine, mostly runtime-agnostic claims |
| `INSTALLATION.md` | guide | 1029 | CLI install path claims — verify against current script names |
| `BUTTERFREEZONE.md` | agent-ground-truth | — | Generated summary; regenerate after this ride |
| `CONTRIBUTING.md` (595), `LICENSE.md` | governance | — | Present; AGPL-3.0 consistent with README badge |
| `SECURITY.md` | governance | 107 | STALE — supported-versions table lists 0.1.x/0.2.x (pre-1.0) vs registry at v2.50.4 |

## apps/ and packages/ Docs

| Doc | Lines | Key claims |
|-----|-------|-----------|
| `apps/api/README.md` | 151 | Stack "Hono + Drizzle + PostgreSQL + TS" — VERIFIED · Quick-start uses **`pnpm install` / `pnpm dev`** — violates repo bun-only rule (CLAUDE.md); STALE |
| `apps/docs/index.md` | — | Docs-site index (deployed via `apps/docs/vercel.json`) |

## docs/ (21 files)

| Doc | Key claims to drift-check |
|-----|---------------------------|
| `docs/ecosystem-architecture.md` | 5-layer ecosystem map (dixie/freeside/finn/hounfour/loa) — matches MEMORY layer model |
| `docs/architecture/payment-responsibility.md` | N-rails boundary doctrine (source of README :160 claim) |
| `docs/architecture/ADR-002-multimodel-cheval-substrate.md` | Only numbered ADR in-tree (no ADR-001) |
| `docs/architecture/{capability-schema,decision-lineage,jam-geometry,registry-ingest,separation-of-concerns,sync-architecture-plan}.md` | Decision-shaped but unnumbered/unstatused |
| `docs/CLI-INSTALLATION.md`, `docs/CONFIG_REFERENCE.md`, `docs/NAMESPACING.md`, `docs/GRADUATION.md`, `docs/SOFT-LAUNCH-OPERATIONS.md`, `docs/LOA-INTEGRATION.md`, `docs/MAINTAINER_GUIDE.md` | Operational guides — spot-check script names against current tree |
| `docs/guides/{context-slots,counterfactual-authoring,script-conventions}.md` | Authoring doctrine |
| `docs/integration/{runtime-contract,compose-trajectory-contract}.md` | Runtime Contract — referenced by CLAUDE.md |
| `docs/migration/v1.157-multimodel-live.md` | Migration note (framework now at 1.196) |
| `docs/tutorials/creating-your-first-pack.md` | Pack authoring walkthrough |

## Other

| Doc | Note |
|-----|------|
| `.github/*` (7) | Templates + BRANCH_PROTECTION.md + install-constructs-app.md |
| `audits/architectural-overview-2026-02-09.md` | Point-in-time audit (5 months old) |
| `clusters/craft.md` | Craft-cluster lane index (README links it) |
| `scripts/cutover-runbook.md` | Migration runbook (maintenance-mode era) |
| `tests/fixtures/*.md` (10) | Golden test fixtures — not documentation, exclude from deprecation pass |
| `.codex/hooks/README.md` | Codex runtime mirror note |

## CLAUDE.md AI-Guidance Quality Score: 7/7

| Criterion | Score | Evidence |
|-----------|-------|----------|
| Length > 50 lines | 1/1 | 103 lines |
| Tech stack mentions | 2/2 | bun/turbo monorepo, api/explorer split, Convex/Supabase/Railway in linked memory + capability metadata stanza |
| Pattern/convention guidance | 2/2 | Canonical paths table, capability metadata schema, runtime/construct boundary |
| Warnings/gotchas | 2/2 | "ALWAYS bun", Vercel/Railway log-first rule, never-edit `.claude/`, no-extrapolation feedback rule |

Sufficient (≥5). NOTE: CLAUDE.md's Operator OS table references `grimoires/personas/*.md` — verify those files exist (personas dir not confirmed in this ride's scans).

## Deprecation Recommendation (Phase 8)

Deprecation banners are warranted ONLY for: `apps/api/README.md` (pnpm instructions), README.md Develop/Quick-start sections (broken commands). Full-file deprecation notices deferred — most docs/ content is doctrine still in force; blanket-banner would add noise, not truth (flag, don't fix).
