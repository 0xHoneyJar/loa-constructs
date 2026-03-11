# PRD: Network Cohesion — Construct DX at Platform Scale

**Cycle**: cycle-041
**Created**: 2026-03-11
**Status**: Draft
**Context**: `grimoires/loa/context/construct-network-cohesion.md`
**Research**: `grimoires/bridgebuilder/ecosystem-lifecycle-research.md`, `grimoires/bridgebuilder/stripe-dx-patterns.md`
**Grounded in**:
- `apps/api/src/db/schema.ts:508-597` (packs table — no category column)
- `apps/explorer/lib/data/fetch-constructs.ts:74-91` (SLUG_CATEGORY_MAP hack)
- `apps/api/src/services/constructs.ts:393` (`category: null` hardcoded)
- `apps/api/src/services/category.ts:153-160` (listCategories counts skills only)
- `.claude/scripts/constructs-create.sh` (scaffold generates ~40 YAML fields at create)
- `.claude/scripts/constructs-publish.sh` (do_push prints "not yet implemented")
- `scripts/seed-forge-packs.ts:77-142` (GIT_CONFIGS hardcoded 15 entries)
- `scripts/discover-constructs.ts` (--register flag stubbed)
- `.loa.config.yaml:99-114` (QMD disabled, 188 failures)

---

## 1. Problem Statement

The constructs network has sound architecture — namespace-as-registry, content-addressed versioning, git-sync distribution — but the wiring between what a construct author writes and what the network renders is broken at every joint.

**Category system**: Exists in 4 places (DB seed, API service, frontend constants, frontend SLUG_CATEGORY_MAP), connected to nothing. The `packs` table has no `category` column. Every construct on the graph gets its category from a 16-entry hardcoded map in the frontend. Any new construct not in that map silently falls to `'development'`.

> Source: `fetch-constructs.ts:74-91`, `schema.ts:508` (no category on packs), `constructs.ts:393`

**Scaffold**: Front-loads ~40 YAML fields at create time. The research across Cargo, npm, Shopify, VS Code, and Homebrew shows no ecosystem validates during `create`. Creativity requires incomplete states.

> Source: `constructs-create.sh:75-157`, ecosystem-lifecycle-research.md §Principle 4

**Publish path**: The CLI stub prints "not yet implemented" at the final step. The git-sync path works but isn't wired as the canonical flow. Authors hit a dead end.

> Source: `constructs-publish.sh` do_push function

**Auto-sync**: `GIT_CONFIGS` is hardcoded with 15 entries. The namespace-as-registry principle ("a `construct-*` repo with a `construct.yaml` IS a stall in the bazaar") is aspirational, not operational.

> Source: `seed-forge-packs.ts:77-142`, `discover-constructs.ts`

**QMD**: Integrated into Loa (scripts, hooks, 3 skills call it) but dormant. 188 failures accumulated, master toggle off.

> Source: `.loa.config.yaml:101`, `.loa/qmd/.failure_count`

---

## 2. Vision

**The filesystem IS the configuration. The manifest is for exceptions. The network handles everything after the author writes skills.**

The author lives in steps 1-4. The network lives in steps 5-7. They never meet.

```
1. construct create my-tool        → 5 files, immediately invocable
2. (author writes skills, accumulates grimoire artifacts)
3. /skill-add research             → new skill scaffolded with conventions
4. (author iterates, QMD indexes artifacts)
5. /construct-publish patch        → validates, infers metadata, bumps, syncs
6. (network: category derivation, graph position, search indexing, install API)
7. (consumers: /constructs install my-tool)
```

---

## 3. Design Principles

Extracted from cross-ecosystem research (Vercel, Cargo, npm, Shopify, VS Code, Stripe, Homebrew). These govern all decisions in this PRD.

| # | Principle | Source |
|---|-----------|--------|
| 1 | **Filesystem inference over declaration** | Cargo infers targets from `src/`, Next.js infers routes from `app/` |
| 2 | **Graduated manifest tiers** — Identity (create) < Publication (publish) < Discovery (registry) | Every ecosystem separates these; none front-load all fields |
| 3 | **Two-phase scaffolding** — shell first, capabilities later | Shopify `app init` + `app generate extension` |
| 4 | **Progressive commitment** — same primitives at every tier | Stripe: zero-config and full-control share the same pipeline |
| 5 | **One state machine, all distribution methods** | Stripe PaymentIntents: one lifecycle regardless of method |
| 6 | **Validate at boundaries, not in editors** | No ecosystem validates during `create` or `dev` |
| 7 | **Errors are navigation, not dead ends** | Stripe: every error includes the next step |
| 8 | **Detection over declaration** | Vercel CLI reads 6+ signals before asking the developer anything |

---

## 4. Users

**Primary**: Internal team — @janitooor and team members creating and maintaining constructs under the `0xHoneyJar` org. They build constructs to solve real problems in their product repos (midi-interface, mcv-interface, rektdrop-interface). They want to focus on the craft, not the plumbing.

**Secondary** (deferred): External contributors. The register/pending_review path exists but is not the focus of this cycle.

---

## 5. Success Criteria

| Metric | Current | Target | How Measured |
|--------|---------|--------|-------------|
| Constructs with real category in API response | 0 of 15 | 15 of 15 | `GET /v1/constructs` — zero `category: null` |
| Frontend SLUG_CATEGORY_MAP entries | 16 | 0 (deleted) | Code search |
| Category constants definitions | 3 (duplicated) | 1 (shared) | `packages/shared/src/categories.ts` |
| Scaffold YAML lines at create time | ~40 | <10 | `construct.yaml` line count after `construct create` |
| Scaffold files for skill-pack | 6 (missing dispatch files) | 5 (dispatch-ready) | Includes `commands/<slug>.md` with frontmatter |
| Publish path completes end-to-end | No (stub) | Yes | `construct publish` triggers git-sync successfully |
| New construct-* repos auto-discovered | No (manual GIT_CONFIGS) | Yes (within 24h) | GitHub Action cron runs successfully |
| Constructs with `domain` in construct.yaml | 2 of 15 | 15 of 15 | Check across all construct repos |
| QMD operational | No (disabled, 188 failures) | Yes (enabled, 0 failures) | `.loa.config.yaml` enabled + collections indexed |
| `/skill-add` exists | No | Yes | Skill invocable, creates working skill directory |

---

## 6. Functional Requirements

### FR-1: Category Derivation Pipeline (P0)

**Goal**: Category flows from `construct.yaml:domain[0]` through the network to the graph. No client-side hacks.

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-1.1 | Add `category VARCHAR(50)` column to `packs` table | Migration applied, indexed |
| FR-1.2 | Seed script derives category from `manifest.domain[0]` via `normalizeCategory()` | All 15 packs have non-null category after seed |
| FR-1.3 | API returns `pack.category` in construct responses | `GET /v1/constructs` returns real category for all packs |
| FR-1.4 | `listCategories()` counts both `packs.category` and `skills.category` | Category counts reflect actual construct distribution |
| FR-1.5 | Frontend deletes `SLUG_CATEGORY_MAP`, trusts API | Zero hardcoded category mappings in explorer |
| FR-1.6 | `skillCategoryEnum` aligned with 8-category taxonomy | Enum values match: marketing, development, security, analytics, documentation, operations, design, infrastructure |

### FR-2: Shared Category Constants (P0)

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-2.1 | Create `packages/shared/src/categories.ts` with `CATEGORIES`, `LEGACY_SLUG_MAPPINGS`, `normalizeCategory()` | One file, exported |
| FR-2.2 | API imports from shared package | `services/category.ts` uses shared constants |
| FR-2.3 | Explorer imports from shared package | `lib/data/fetch-categories.ts` uses shared constants |
| FR-2.4 | Seed script imports from shared package | `seed-forge-packs.ts` uses shared `normalizeCategory()` |

### FR-3: Construct Repo Domain Backfill (P0)

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-3.1 | Add `domain` field to all 15 construct.yaml files across repos | Each repo has `domain: [<category>, ...]` in construct.yaml |
| FR-3.2 | Domain values match the intended category for each construct | Observer→analytics, Artisan→design, Protocol→development, etc. |
| FR-3.3 | Re-run seed script to populate `packs.category` from new domain fields | All 15 DB records have correct category |

**Domain assignments** (derived from existing SLUG_CATEGORY_MAP + construct purpose):

| Construct | domain[0] | Rationale |
|-----------|-----------|-----------|
| artisan | design | Material feel, typography, motion |
| the-easel | design | Visual direction, TDRs |
| webgl-particles | design | WebGL visual effects |
| webreel | design | Video/visual content |
| observer | analytics | User research, feedback capture |
| k-hole | analytics | Deep research, resonance profiles |
| crucible | security | QA, testing, verification |
| hardening | security | Security hardening |
| dynamic-auth | security | Authentication patterns |
| protocol | development | Web3 protocol, dapp UX |
| beacon | operations | Deployment, monitoring |
| herald | operations | PR→social content pipeline |
| gtm-collective | marketing | GTM strategy |
| social-oracle | marketing | Social media content |
| growthpages | marketing | Growth content |
| mibera-codex | documentation | Knowledge base |

### FR-4: Minimal Scaffold (P1)

**Goal**: `construct create` produces 5 files that dispatch immediately. No enrichment fields at create time.

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-4.1 | `construct.yaml` contains only: name, slug, version, type, description, license, schema_version | <10 lines. No domain, capabilities, paths, identity, pack_dependencies |
| FR-4.2 | `skills/<slug>/index.yaml` contains only: name, triggers, entry | Dispatch-critical fields only |
| FR-4.3 | `skills/<slug>/SKILL.md` is a minimal workflow stub | Invocation + TODO sections |
| FR-4.4 | `commands/<slug>.md` has valid routing frontmatter | agent, agent_path, context_files present |
| FR-4.5 | Skill directory named after slug, not "example" | `skills/<slug>/` not `skills/example/` |
| FR-4.6 | No `identity/`, `contexts/`, `capabilities`, `domain`, `paths` generated | These are enrichment — added at publish or via `/skill-add` |

### FR-5: Publish Boundary (P1)

**Goal**: `/construct-publish` validates, infers missing metadata, and syncs via git-sync. One command from "I'm done" to "it's live."

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-5.1 | Filesystem discovery: skills from `skills/*/index.yaml`, commands from `commands/*.md` | Inferred arrays match actual directory contents |
| FR-5.2 | Prompt for Tier 2 fields if missing: version, description, license | User prompted once, values written to construct.yaml |
| FR-5.3 | Suggest Tier 3 fields: domain (with type-based default), keywords | Agent proposes, user confirms or overrides |
| FR-5.4 | Validation: routing frontmatter present, triggers populated, at least one skill | Errors are actionable (file + field + suggestion) |
| FR-5.5 | Git-sync trigger: `POST /v1/packs/:slug/sync` | Sync completes, content hash updated |
| FR-5.6 | Remove direct-upload stub from `do_push()` | One publish path, not two |
| FR-5.7 | Version ceremony: `construct publish patch\|minor\|major` bumps version, commits, tags, pushes | Like `vsce publish minor` |

### FR-6: `/skill-add` Truename (P1)

**Goal**: Two-phase scaffolding — shell first (create), capabilities later (skill-add).

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-6.1 | `/skill-add <name>` creates `skills/<name>/{index.yaml, SKILL.md}` | Files created with populated triggers, entry, name |
| FR-6.2 | Agent reads existing skills to populate domain_hints and examples | New skill is contextually aware of the construct |
| FR-6.3 | Creates `commands/<name>.md` with routing frontmatter if missing | New skill is immediately invocable |
| FR-6.4 | Works inside any construct repo (detects construct.yaml) | Errors clearly if not in a construct directory |

### FR-7: Auto-Sync (P2)

**Goal**: Namespace IS the registry. New `construct-*` repos auto-enter the network.

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-7.1 | Complete `--register` flag in `discover-constructs.ts` | Script can register new constructs via API |
| FR-7.2 | GitHub Action runs daily cron: discover → register → sync | New repos appear in registry within 24h |
| FR-7.3 | Existing repos: compare `last_sync_commit` vs HEAD, sync if diverged | Stale constructs auto-update |
| FR-7.4 | `GIT_CONFIGS` becomes a fallback, not the registry | Auto-discovery is the primary path |

### FR-8: QMD Re-enablement (P2)

**Goal**: QMD operational with expanded construct collections.

| ID | Requirement | Acceptance |
|----|-------------|-----------|
| FR-8.1 | `memory.qmd.enabled: true` in `.loa.config.yaml` | Toggle on |
| FR-8.2 | Failure counter at 0, stays at 0 after sync | `.loa/qmd/.failure_count` = 0 post-index |
| FR-8.3 | `constructs` collection indexes SKILL.md, index.yaml, persona.yaml, CLAUDE.md from installed packs | QMD search returns construct documentation |
| FR-8.4 | `grimoires-all` collection indexes all grimoire markdown | Cross-grimoire semantic search works |
| FR-8.5 | QMD assists domain inference at publish time | Publish skill queries QMD for SKILL.md content → category suggestion |

---

## 7. Technical Constraints

| Constraint | Impact |
|-----------|--------|
| DB migration on production Supabase | Must use `bun -e` with postgres driver (no `psql` locally). Test in dry-run first. |
| `skillCategoryEnum` is a PostgreSQL enum type | ALTER TYPE requires careful migration — rename values, add new, drop unused |
| 15 construct repos under 0xHoneyJar | Domain backfill requires PRs or direct pushes to each repo |
| QMD v1.1.5 globally installed, not project dep | Binary must be in PATH. Graceful degradation if missing. |
| `packages/shared` must be importable by both API (Node) and explorer (Next.js) | Package must work in both server and browser contexts |
| Auto-sync GitHub Action needs `DATABASE_URL` and `GH_TOKEN` secrets | Must be configured in repo settings |

---

## 8. Scope

### In Scope (P0-P2)

- Category derivation pipeline: migration → seed → API → frontend
- Shared constants package
- Domain field backfill across all 15 construct repos
- Minimal scaffold (5 files, <10 YAML lines)
- Publish boundary with git-sync + validation
- `/skill-add` truename
- Auto-sync GitHub Action
- QMD re-enablement + collection expansion

### Out of Scope

- External contributor path (register → pending_review → approval)
- Billing/payments integration
- MCP server wrapper for QMD
- `/construct-distill` truename (P3 — depends on QMD + /skill-add)
- Lifecycle state machine formalization (P4)
- Path inference at publish time (P3)
- Construct piping / event bus
- Explorer UI changes beyond category cleanup

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Enum migration breaks existing skill rows | Medium | High | Verify zero rows for `sales`/`support` before dropping. Run migration in transaction. |
| QMD failures recur after re-enable | Medium | Low | Three-tier fallback (QMD → CK → grep) means functionality degrades gracefully |
| Domain backfill requires 15 PRs to construct repos | Certain | Medium | Batch with `gh` CLI. Direct push to repos where team has write access. |
| Shared package import breaks explorer build | Low | Medium | Test in CI before merging. Shared package exports only pure functions + constants. |
| Auto-sync discovers repos with broken construct.yaml | Medium | Low | Validation in discover script — skip repos that fail manifest parse |
| `last_sync_commit` comparison has edge cases (force push, rebase) | Low | Low | Fall back to full sync if comparison fails |

---

## 10. Dependencies

| Dependency | Status | Blocks |
|-----------|--------|--------|
| Supabase production DB access | Available | FR-1.1 (migration) |
| Write access to 15 construct repos | Available (0xHoneyJar org) | FR-3.1 (domain backfill) |
| `packages/shared` exists in monorepo | Exists | FR-2.1 (shared constants) |
| QMD v1.1.5 binary in PATH | Available | FR-8.1 (re-enablement) |
| GitHub Actions configured for repo | Available | FR-7.2 (auto-sync cron) |

---

## Next Step

`/architect` to create Software Design Document from this PRD.
