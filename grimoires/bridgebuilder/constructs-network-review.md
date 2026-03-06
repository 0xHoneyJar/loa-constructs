# Constructs Network — Bridgebuilder Review

> *"The best infrastructure is the one nobody thinks about."*

**Date**: 2026-03-05
**Reviewer**: Bridgebuilder
**Scope**: Full network survey — 13 construct repos, 80+ API endpoints, 10 lifecycle skills, 38 explorer routes
**Grounded in**: `scripts/seed-forge-packs.ts`, `apps/api/src/routes/`, `packages/shared/src/types.ts`, `apps/explorer/`, all `.claude/skills/*-constructs/` SKILLs

---

## Summary

The Constructs Network has sophisticated bones — a 30-table database, RS256 license system, Merkle-hash sync, tiered rate limiting, identity layer, signal accuracy tracking, and a 3D WebGL explorer. This is genuine engineering depth. But the system has a fundamental orientation problem: **it was built registry-out (platform → constructs) when it should have been built namespace-in (constructs → platform)**. The result is a network where 3 of 13 constructs are invisible, the CLI requires Loa installed, the API has three overlapping surfaces, and creating a construct informally means it doesn't exist until someone edits a seed script.

The single most important finding: **the `construct-*` namespace convention already works as a social protocol. It just needs to become a technical one.**

---

## Findings

<!-- bridge-findings-start -->

### [CRITICAL-1] Namespace-as-Protocol Gap — 3 of 13 Constructs Are Invisible [RESOLVED]

**Severity**: CRITICAL | **Status**: RESOLVED
**Category**: operational
**File**: `scripts/seed-forge-packs.ts:69-110`
**Resolution**: Four-layer fix shipped:
1. `scripts/discover-constructs.ts` — diagnostic scanner finds all `construct-*` repos via `gh` CLI
2. `--auto-discover` flag on seed script replaces hardcoded `GIT_CONFIGS` with live org scanning
3. Schema tolerance fixes (Zod accepts slug/name, array deps, pack_dependencies variants) — 12/12 validate
4. `pnpm discover` / `pnpm seed:auto` convenience commands

**Description**: The seed script hardcodes 10 repos in `GIT_CONFIGS`. Three construct-* repos in the org (`construct-deep-research`, `construct-webgl-particles`, `construct-base`) are invisible to the network. Creating a construct informally — which should be the primary path — means it simply doesn't exist until someone manually adds it to GIT_CONFIGS or calls `POST /v1/constructs/register`.

**FAANG Parallel**: This is the npm-before-npm-publish problem. npm's genius was: `npm publish` and you're done. No gatekeeper edits a config file. Docker Hub automated builds took this further — push to a repo, it appears. GitHub Packages went further still — the repo IS the package. The Constructs Network has the namespace convention (`construct-*`) but not the automation.

**Metaphor**: Imagine a phone book where you have to mail a form to the publisher every time you get a new phone number, even though your name already follows the naming convention they use to organize entries. Everyone with a `construct-*` repo already told you their number — you're just not listening.

**Suggestion**: Implement org-level namespace discovery. A GitHub Action or cron job that:
1. `gh repo list 0xHoneyJar --json name | jq '.[] | select(.name | startswith("construct-"))'`
2. For each repo not already registered: check for `construct.yaml` or `manifest.json`
3. Auto-register with `status: 'discovered'` (not `published` — the author promotes when ready)
4. GitHub webhook on repo creation in the org triggers immediate discovery

This inverts the flow: **constructs announce themselves by existing, not by being invited.**

**Decision Trail**: Document why the seed script exists (bootstrap seeding for a fresh DB) vs. why ongoing sync should be automated (operational overhead of manual registration scales linearly with construct count).

---

### [CRITICAL-2] Triple API Surface — /constructs, /packs, /skills Serve the Same Data [PARTIALLY RESOLVED]

**Severity**: CRITICAL | **Status**: PARTIALLY RESOLVED
**Category**: quality
**File**: `apps/api/src/routes/constructs.ts`, `apps/api/src/routes/packs.ts`, `apps/api/src/routes/signals.ts`
**Resolution**: Signals router dual-mounted at `/v1/constructs` — showcases and accuracy now available at `/v1/constructs/:slug/showcases` and `/v1/constructs/:slug/signals/accuracy`. Explorer updated to use unified paths. `/v1/packs` preserved for backward compat. Sync + download still only on `/packs` (needs separate router extraction).
**Description**: Three route files serve construct data:
- `/v1/constructs` — unified discovery (the intended future)
- `/v1/packs` — full CRUD + download + sync + signals + showcases (the actual workhorse)
- `/v1/skills` — legacy individual skill management

The explorer fetches from `/v1/constructs/:slug` for detail but `/v1/packs/:slug/showcases` and `/v1/packs/:slug/signals/accuracy` for enrichment. The CLI uses `/v1/packs/:slug/download` for installation. Signals, showcases, sync, versions — all mounted on the packs router, not constructs.

**FAANG Parallel**: Google's Kubernetes API went through exactly this — `extensions/v1beta1`, `apps/v1beta1`, `apps/v1` all serving Deployments. The migration took years. The lesson: unify early, before the surface area calcifies.

**Metaphor**: Three different doors to the same room, but each door has different furniture inside. Guests keep trying the wrong door.

**Suggestion**: Consolidate to `/v1/constructs` as the single surface. Route signals, showcases, versions, download, sync under `/v1/constructs/:slug/...`. Keep `/v1/packs` as a thin redirect layer with deprecation headers for one version cycle.

---

### [HIGH-1] No Standalone CLI — Constructs Require Loa Installed

**Severity**: HIGH
**Category**: operational
**File**: `.claude/skills/browsing-constructs/SKILL.md`, `packages/loa-registry/`
**Description**: To discover or install a construct today, you need:
- Loa framework installed (`.claude/loa/CLAUDE.loa.md` loaded)
- The `browsing-constructs` skill available
- Claude Code as your runtime

`packages/loa-registry` exists as a CLI plugin but uses deprecated `/skill-*` commands and is tightly coupled to the Loa skill installation layout. There is no `npx constructs find observer` equivalent. Compare with skills.sh: `npx skills find "code review"` works from any directory, no framework required.

**FAANG Parallel**: Homebrew's `brew search` works without being inside a project. npm's `npm search` works without a `package.json`. The discovery layer should be framework-independent.

**Metaphor**: To browse a bookstore, you currently need to already own a library card from a specific library system. The bookstore should let anyone walk in.

**Suggestion**: Ship a standalone `npx constructs` CLI that:
- `npx constructs find <query>` — hits `GET /v1/constructs/summary` or `?q=`
- `npx constructs info <slug>` — hits `GET /v1/constructs/:slug`
- `npx constructs install <slug>` — downloads to `.claude/constructs/packs/`
- No Loa dependency. No auth required for public constructs. Just the API.

This is what wevm/incur represents: a CLI framework where both humans typing commands and agents calling APIs use the same interface.

---

### [HIGH-2] Manifest Shape Mismatch — Explorer Can't Render Edges [RESOLVED]

**Severity**: HIGH | **Status**: RESOLVED
**Category**: quality
**File**: `apps/explorer/lib/data/fetch-constructs.ts:271-331`
**Resolution**: `computeEdges()` rewritten to handle all three `pack_dependencies` formats found in the wild: flat array `[{slug}]`, categorized object `{required: [{slug}], optional: [{slug}]}`, and Record. `pack_dependencies` and `composes_with` added to both Zod schema and TypeScript types. Graph now renders real dependency and composition edges.

**Description**: The explorer's `computeEdges()` reads `manifest.pack_dependencies` (flat object) to draw dependency edges between constructs. But the manifest schema defines `dependencies.packs` (nested under `dependencies`). The `pack_dependencies` field name doesn't exist in `PackManifest`. This means the 3D graph shows zero dependency edges — the network visualization is disconnected even when constructs declare relationships.

---

### [HIGH-3] Identity Layer Half-Connected [RESOLVED]

**Severity**: HIGH | **Status**: RESOLVED
**Category**: quality
**File**: `scripts/seed-forge-packs.ts`, `apps/explorer/app/(marketing)/constructs/[slug]/page.tsx:173-202`
**Resolution**: Root cause was deeper than rendering — the seed script **parsed** identity files but **never wrote them to the database**. `construct_identities` table was always empty. Fixed: seed script now upserts persona_yaml, expertise_yaml, cognitive_frame, expertise_domains, voice_config for all 11 constructs with identity files (49 expertise domains total). The explorer already had the "Expert Identity" section (expertise domain tags + cognitive frame JSON) — it was just receiving null data.

**Description**: The API serves identity data (`cognitive_frame`, `expertise_domains`, `voice_config`, `model_preferences`) via `formatConstructDetail()`. The explorer's `transformToDetail()` consumes it. The construct detail page in the explorer HAS rendering code (lines 173-202: expertise domain tags, cognitive frame display) but it was always getting null because the seed script never populated the `construct_identities` table.

---

### [MEDIUM-1] Private Constructs — Designed but Deferred

**Severity**: MEDIUM
**Category**: security
**File**: `grimoires/loa/context/construct-as-repo-architecture.md`
**Description**: All constructs are publicly visible. The tier system gates download access but not discovery. The design docs explicitly defer private constructs to "post-launch." The practical workaround — private GitHub repo + direct git clone without registry registration — works but is invisible to the network.

For the user's stated need ("between our internal team, constructs are private to us, and then the ones that are public are public"), this means: private constructs work accidentally through git access control, not intentionally through the network.

**Suggestion**: For now, the simplest path is a `visibility` field on the packs table: `public | org | private`. The auto-sync system (CRITICAL-1) should respect repo visibility — private repos become `visibility: 'org'` constructs, public repos become `visibility: 'public'`. Don't overthink auth yet — GitHub repo access already handles the hard part.

---

### [MEDIUM-2] 9 Lifecycle Gaps in Design-vs-Reality

**Severity**: MEDIUM
**Category**: operational
**Description**: The ecosystem survey identified 9 gaps where design docs describe functionality that isn't confirmed implemented:

1. **4 lifecycle scripts** may not exist on disk (create, diff, publish, link .sh files)
2. **Graduation API** endpoints marked "coming soon"
3. **CLAUDE.md auto-injection** designed but unconfirmed
4. **Finding-constructs** queries fields (`relevance_score`) that may not exist in API response
5. **Private constructs** not implemented
6. **Scoped naming** (`@scope/name`) undecided
7. **construct-network-tools** pack doesn't exist (lifecycle skills live in Loa)
8. **Creator dashboard** has no repo registration UI
9. **Web upload vs git-sync** are parallel undocumented paths

These aren't bugs — they're the gap between architectural vision and shipped reality. The Bridgebuilder philosophy: "Name the trap." The trap is treating design docs as implementation.

**Suggestion**: Run a `constructs-health.sh` equivalent for the network itself. For each lifecycle step (create → develop → validate → publish → discover → install → sync → upgrade → graduate), verify the actual scripts exist, endpoints respond, and the flow completes end-to-end.

---

### [MEDIUM-3] Seed Script Contains `git reset --hard` — Silent Data Loss Risk

**Severity**: MEDIUM
**Category**: security
**File**: `scripts/seed-forge-packs.ts:203`
**Description**: `execSync('git -C "${repoDir}" fetch origin && git -C "${repoDir}" reset --hard origin/${gitRef}')` — if someone has local modifications in a cached repo (e.g., testing a manifest change), those are silently destroyed. The seed script is run by a human, not CI — this is an interactive context where local state matters.

**Suggestion**: Use `git pull --ff-only` instead. If the local state has diverged, fail loudly rather than silently overwriting.

---

### [LOW-1] Icon Field Lives in Script, Not Manifest

**Severity**: LOW
**Category**: quality
**File**: `scripts/seed-forge-packs.ts:54-65`
**Description**: `PACK_ICONS` is a hardcoded map in the seed script. Icons don't come from the construct's manifest — they're assigned centrally. This means a construct author can't control their own icon, and new constructs get the generic `📦` until someone edits the seed script. This is another symptom of the registry-out orientation.

**Suggestion**: Add `icon` to the manifest schema. Fall back to `📦` if not set. The construct defines itself — the registry just reads.

<!-- bridge-findings-end -->

---

## Positive Callouts

### [Quality] Agent-Optimized Summary Endpoint

`GET /v1/constructs/summary` (`constructs.ts:192-207`) — a dedicated low-token endpoint for agent discovery. This is genuine thoughtfulness about the dual-audience (human + agent) problem. Most registries only serve human-sized payloads. This endpoint means an agent can survey the entire network in one call without wasting context window. **This is the seed of the right architecture.**

### [Quality] Merkle-Hash Sync Architecture

The `constructs-diff.sh` sync design uses O(1) hash comparison before doing expensive file-level diffs. The shadow directory pattern (`.construct/shadow/`) preserves the base version for 3-way merge during upgrades. This is distributed systems thinking applied to a CLI tool — the kind of design that scales without degrading.

### [Quality] Signal Accuracy System

`signal_outcomes` table + weighted kappa scoring (`signals.ts`) — constructs can make predictions and have them evaluated. The no-self-evaluation rule prevents gaming. This is a genuine trust mechanism, not vanity metrics. The Bridgebuilder archetype doc says "metrics that measure depth, not breadth" — this delivers on that promise.

### [Operational] Rate Limiting is Tier-Aware and Fails Open

The rate limiter (`middleware/rate-limiter.ts`) degrades gracefully when Redis is unavailable — it adds `X-RateLimit-Degraded: true` header but doesn't block requests. Auth endpoints fail closed (correct — protect the gates), everything else fails open (correct — don't punish users for infrastructure issues). This is operational maturity.

### [Security] RS256 License Verification with Offline Capability

The license system uses RS256 JWT with public key distribution (`GET /v1/public-keys/:keyId`). Clients can verify licenses offline after fetching the public key once. 4-hour cache headers. This is production-grade licensing that respects offline/CLI environments.

---

## The Core Reframe

The user said: *"dig into the core of what it is that I'm trying to do."*

The core is this: **the namespace IS the network.**

Today the flow is: create repo → manually register → manually seed → it appears on the network.

The flow should be: create `construct-*` repo with a `construct.yaml` → it exists on the network.

Everything else — CLI discovery, API consolidation, private/public, the explorer — flows from that inversion. The registry becomes a cache of what already exists in the org's repos, not a gatekeeper that constructs must apply to enter.

This is what skills.sh got right: `owner/repo@skill` — the GitHub coordinate IS the identity. No separate registry to maintain. No seed scripts. The repo is the source of truth and the distribution mechanism simultaneously.

And this is what wevm/incur represents: a CLI framework where the same interface serves both humans and agents. Not two separate tools. Not a web page AND a CLI AND an API. One surface that works for everything.

The Constructs Network already has the hard parts built (auth, licensing, sync, signals, identity). The gap is the easy part — making the namespace self-announcing.

---

## Recommended Priority

| Priority | Action | Why First |
|----------|--------|-----------|
| 1 | **Auto-sync from namespace** | Eliminates the #1 friction: "I made a construct but it doesn't exist on the network" |
| 2 | **Standalone CLI** (`npx constructs`) | Framework-independent discovery. Any agent, any runtime. |
| 3 | **API consolidation** to `/v1/constructs` | One surface, not three. Agents shouldn't guess which door. |
| 4 | **Identity surfaced in explorer** | The data flows through the stack already. Just render it. |
| 5 | **Private/public from repo visibility** | GitHub already solved this. Mirror it. |

---

---

## Reference Architecture Synthesis

### skills.sh (Vercel, Jan 2026)

**The pattern**: GitHub IS the registry. `owner/repo@skill-name` — the GitHub coordinate IS the identity. No separate publishing infrastructure. Telemetry-driven leaderboard auto-surfaces popular skills. Minimal SKILL.md (`name` + `description` frontmatter). Symlink-first install. Two commands: `find` → `add`.

**What to steal**:
- `owner/repo@skill-name` namespace: `0xHoneyJar/construct-observer@observing-users`
- No submission gate — telemetry-driven discovery
- Symlink-first install (single source of truth)
- CLI as the entire entry point — no account, no dashboard required for public constructs

**Where Constructs differentiate**: skills.sh has zero quality control beyond install count. Constructs already has capabilities stanza, schema_version, topology validation, CI gates, signal accuracy, identity layer. This is the moat — verified expertise vs. community scripts.

### wevm/incur ("CLI framework for agents and humans")

**The pattern**: 3 primitives (`create → command → serve`). Zod schemas for args/options/env/output. TOON output (40-60% token reduction). `--llms` self-description. HTTP ↔ CLI bidirectionality (Fetch API mounting). Call-to-actions for workflow continuation.

**What to steal**:
- **Build `npx constructs` with incur** — get TOON, `--llms`, MCP, token pagination for free
- **HTTP mounting** — the existing Hono API at api.constructs.network becomes CLI subcommands automatically via OpenAPI spec
- **Call-to-actions** — typed next-step suggestions. Maps directly to `workflow_next` in PackManifest (already in schema, zero implementations)
- **Token pagination** — `--token-limit` + `--token-offset` makes agent discovery safe for any context window

**What NOT to adopt**: Auto-generated SKILL.md from code (constructs are expertise documents, not API docs), global skill installation (per-repo is correct for constructs), CLI-as-source-of-truth (SKILL.md + index.yaml canonical, not TypeScript code).

### The Combined Insight

| System | Core Truth |
|--------|------------|
| skills.sh | The repo IS the package |
| incur | The CLI serves both humans and agents |
| Constructs | The namespace IS the network |

All three converge on the same principle: **eliminate the gap between creation and distribution.** skills.sh eliminated the registry. incur eliminated the dual code path. Constructs needs to eliminate the seed script.

---

*"The best network is one where creating a construct and having it exist on the network are the same action."*
