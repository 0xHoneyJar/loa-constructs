# Changelog

All notable changes to the Loa Skills Registry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.23.0] — 2026-04-22 — operational-token bypass (L0) + discovery pagination fix (F15)

## Cycle-002 · Artisan Lifecycle Walk (friction-driven, in-flight)

### Added

- **cycle-002 L0**: operational admin token bypass for admin endpoints
- **cycle-001**: implement loa-constructs infrastructure cycle — Legs A–G + CL
- **lens**: add cycle-001 review lens — GECKO + KEEPER + OTLET + KISS layered on BRIDGEBUILDER
- **seed**: add loa-constructs infrastructure cycle SEED (§14 amended) + 4 peer research reports
- **spiral**: enable advanced features — flight-recorder SEED folding + pipeline_self_review
- **spiral**: _pre_check_seed environment-invariant gate (#575 item 3) (#594)
- **spiral**: fold prior-cycle failure events into SEED context (#575 item 2) (#592)
- **spiral**: observability dashboard — default-on metrics emission (#569) (#589)
- **bridgebuilder**: persona discovery + resolution trace CLI flags (#396) (#588)
- **adapters**: swap legacy adapter to generated maps (#548 continuation) (#571)
- **adapters**: YAML → bash map generator (vision-011, #548) (#566)
- **adversarial-review**: enforce Phase 2.5 at COMPLETED marker write (#552)
- **models**: promote Opus 4.7 to top-review default (cycle-082) (#547)
- **harness**: Bridgebuilder kaironic fix loop (cycle-074) (#512)
- **cycle-073**: config transparency & safety enforcement (#511)
- **hooks**: auto-sentinel — close last mechanical enforcement gap
- **spiral**: pipeline profiles + scheduling + mechanical dispatch guard (cycle-072) (#508)
- **cycles-070+071**: spiral end-to-end — harness architecture with evidence-gated pipeline
- **cycle-069**: Vision Registry graduation — query API, lifecycle, spiral integration (#486)
- **spiral**: cycle-068 — wire real /simstim dispatch (#495)
- **spiral**: cycle-067 — finish /spiral skill (#494)
- **spiral**: /spiral autopoietic meta-orchestrator MVP (cycle-066) (#493)
- **cycle-workspace**: per-cycle PRD/SDD/sprint workspace (#491)
- **simstim**: state-machine coalescer + --archive-completed (#490)
- **post-merge**: wire lore-promote phase (closes #484)
- **lore-promoter**: HARVEST phase consumer (closes #481)
- **analyzer**: bridge triage stats aggregator (closes #467 tooling)
- **bridge**: --single-iteration re-entrancy + silent-no-op detection (closes #473)
- **skills**: structural AC verification gate at /implement (closes #475)
- **simstim**: git-aware sync_run_mode fallback (closes #474)
- **cycle-055**: wire cross-repo + lore into multi-model Bridgebuilder (#471)
- **cycle-054**: enable Bridgebuilder post-PR review + sync stale dist (#468)
- **cycle-053**: Amendment 1 — close Bridgebuilder loop + kaironic pattern (#466)
- **bridgebuilder**: multi-model review pipeline with Pass-2 enrichment (#463)
- add git-native construct registry
- PRD for core app migration — CubQuests, Honeyroad, APDAO
- flatline adversarial review of org migration plan
- mibera world consolidation context pack — OSTROM + GECKO
- RPC migration spec — QuikNode → org-owned node + public fallback
- org-wide sovereign migration plan — 266 repos audited
- sprawl consolidation kickoff — 4 repos → 1 world
- sovereign stack architecture — construct audit, world pattern, migration guides
- **cycle-052**: DX Hardening — friendly summaries + zone-aware filtering
- **construct-index**: add --validate flag + metadata block
- **sprint-106**: Integration, E2E validation, cross-platform checks
- **sprint-104+105**: Name resolution, composition, operator OS, ambient greeting
- **sprint-103**: Construct index generation + capability aggregation
- **cycle-050/sprint-109**: Mount conflict detection + E2E validation
- **cycle-050/sprint-108**: Dual-mode compliance hook + rule lifecycle metadata
- **cycle-050/sprint-105-107**: Multi-Model Permission Architecture — taxonomy, validation, annotation
- **sprint-104**: Path-scoped rules + ADVISORY compliance hook prototype
- **sprint-103**: Skill frontmatter — allowed-tools, context:fork, name/description
- **sprint-102**: Foundation — model aliases, memory docs, Agent Teams validation
- **constructs**: unified /constructs — discovery, search, composability (#448)

### Fixed

- **cycle-002 F15**: paginate GitHub org scan + mock-db execute stub
- **bridgebuilder**: route OpenAI codex models to /responses endpoint (#585) (#586)
- **flatline**: simstim --mode hitl docs drift + red-team grounding fail-closed (#579, #582) (#583)
- **flatline**: prune phantom Gemini 3 + forward-compat patterns (#573, #574) (#578)
- **spiral**: configurable planning-phase timeouts (#570) (#577)
- **spiral**: export SPIRAL_TASK to dispatch subprocess (#568) (#576)
- **tripwire**: detect untracked-only changes in rollback precheck (#563) (#567)
- **spiral**: REVIEW→IMPL fix-loop + --resume --force (#545, #546) (#565)
- **safety**: stash_with_guard helper + rules + tripwire refactor (#555) (#564)
- **ci**: restore green Shell Tests on main — 5 clusters (#549) (#562)
- **post-merge**: broaden classifier to match cycle-NNN anywhere (#550) (#560)
- **update-loa**: refresh version markers post-merge (Phase 5.6) (#554) (#559)
- **skills**: drop restrictive agent: on write-capable skills + lint invariant (#553) (#558)
- **tests**: update stale gpt-5.2 assertion to gpt-5.3-codex
- **harness**: eliminate silent exits in spiral-harness.sh (#516) (#544)
- **red-team**: anchor template paths to SCRIPT_DIR for submodule compatibility (#528) (#543)
- **vision**: replace grep -c || echo 0 with awk in vision-lib.sh (#542)
- **scripts**: replace (( var++ )) with var=$((var + 1)) across 26 scripts + lint rule (#541)
- **security**: narrow cache-manager secret pattern to reduce false positives (#530) (#540)
- **harness**: reserve audit budget floor + strict-greater comparison (#515) (#538)
- **spiral**: redirect cycle-workspace.sh stdout to prevent early termination (#514) (#537)
- **tests**: Wave-3 BATS cleanup — 32 failures across 7 files (cycle-076) (#536)
- **tests**: isolate PROJECT_ROOT across BATS suite + fix harness secret scanner (cycle-075 W3) (#535)
- **scripts**: replace grep -c || echo 0 pattern with awk (cycle-075 W2f) (#533)
- **search**: 4 bugs in search-orchestrator.sh + JSONL compaction in search-api.sh (cycle-075 W2e) (#532)
- **butterfreezone**: env-var word budget override + richer test fixture (cycle-075 W2d) (#527)
- **cache**: block JSON-style secrets, not just shell-style KEY=value (cycle-075 W2b) (#525)
- **tests**: isolate PROJECT_ROOT + contract-based path assertions in ledger-lib.bats (cycle-075 W2a) (#522)
- **tests**: decouple invariant tests from deleted project data + create subagent-reports placeholder (cycle-075 W1b) (#521)
- **tests**: accept ≥2 frontmatter delimiters in subagent validation (cycle-075 W1c) (#520)
- **lint**: rephrase comment triggering false-positive readlink -f lint (cycle-075 W1e) (#519)
- **tests**: avoid ls|wc -l newline bug in secret_scan cleanup test (cycle-075 W1d) (#518)
- **tests**: rename loa-grimoire → grimoires/loa in 5 test files (cycle-075 W1a) (#517)
- **hooks**: wire safety hooks into settings.json — close activation gap
- **spiraling**: dispatch guard — NEVER implement directly in conversation (#507)
- **harness**: system zone override for autonomous implementation
- **harness**: advisor strategy cost optimization + 6 E2E fixes
- **flatline**: cycle-062 follow-ups — review-mode wiring, inquiry tests, default case (#489)
- **flatline**: jq 1.7 parser error in red-team/inquiry metrics merge (#488)
- **red-team**: wire invoke_live to model-invoke (#469)
- **bridgebuilder**: Issue #464 A1+A2+A3 follow-ups (#465)
- **mount**: curl -o flag before -- sentinel in mount-loa.sh (#461)
- **collect-trace**: unbound variables, invalid JSON, empty array errors (#444)
- **constructs**: address Bridgebuilder review findings on #453
- **constructs**: prefer local source over stale registry pack (#449)
- **bridge-findings**: portable date conversion + missing .ck/** path
- **constructs**: auth fallback in browse, symlink + construct.yaml in loader (#447)

_Source: PR #191_


## [2.9.0] - 2026-02-28

### Why This Release

Agent-Native Output Protocol — teaching the Constructs Network to speak a second language. TOON encoding for agent context windows, CTA protocol for pull-based command discovery, hash divergence detection, and lazy-loading contract documentation. Bridge reviewed with flatline convergence in 3 iterations.

### Added

#### TOON Encoder (cycle-037)

- **TOON (Token-Oriented Object Notation)** — header+CSV tabular format achieving ~39.6% token reduction for agent consumers (`toon-lib.sh`)
- **4-arg format router** — `format_tabular_output(label, tabular_json, original_payload, fallback_fn)` separates data shapes to prevent fallback mismatch
- **Source guard** — `_TOON_LIB_LOADED` prevents re-parsing toon-lib.sh on every invocation

#### CTA Protocol

- **Per-invocation CTA** — `Next:` block with up to 3 context-sensitive command suggestions (`skill-cta.md`)
- Context-aware: install, status, browse, list contexts emit different CTAs

#### Hash Divergence Detection

- `[DIVERGED]` status when version matches but content hash (Merkle SHA-256) differs
- Shared status data collection — single fetch pass feeds both TOON and markdown rendering (Monarch pattern)

#### Documentation

- **Lazy-loading contract** (`runtime-contract.md`) — formal spec: skills auto-load on invocation, only index.yaml at session start
- **`workflow_next` field** — cross-construct navigation hints in PackManifest schema

### Changed

- `do_status_pack()` refactored to shared data collection architecture (bridge review medium-1, medium-2)
- `_show_all_packs_md()` now renders from pre-collected JSON instead of re-fetching (pure function)
- PRD, SDD, sprint plan updated for cycle-037

## [2.8.0] - 2026-02-27

### Why This Release

Constructs Network Distribution Layer — the first CLI tooling for installing, syncing, and managing constructs outside the marketplace UI. Three-phase delivery with bridge reviews, GPT 5.3-codex cross-model security audit, and kaironic flatline termination. Plus DNS infrastructure mapping for the upcoming Route 53 migration.

### Added

#### CLI Distribution Commands (cycle-036)

- **`constructs install <slug>`** — registry-backed pack installation with HTTPS-only verification, post-install hooks, and Merkle SHA-256 content hashing
- **`constructs sync <slug>`** — pull latest version from registry with curl config injection protection (SHELL-002 pattern)
- **`constructs status [slug]`** — version + content-hash staleness reporting (SYNCED/DIVERGED/BEHIND/UNKNOWN indicators)
- **`constructs register <slug>`** — reserve construct slugs with git repo preflight validation
- **Shared library** (`constructs-lib.sh`) — Merkle SHA-256 content hashing, URL validation, safe identifier checks, registry URL resolution
- **`--standalone` audit flag** for `validate-skills.sh` — scans pack skills for unguarded context slots and grimoire references

#### Golden Path Integration

- `/loa` status command now shows construct health alongside workflow state
- `detect_state()` auto-discovers installed packs and skills with path traversal containment
- Skill update notifications when registry has newer versions
- Per-invocation Next Steps CTAs added to all 39 pack skills

#### Research & Infrastructure

- DNS infrastructure mapping for AWS Route 53 migration (`grimoires/bridgebuilder/dns-infrastructure-mapping.md`)
- Agent-native CLI landscape research — Warp, Fig, Cursor, Cline patterns (`grimoires/bridgebuilder/agent-native-cli-landscape-research.md`)
- CLI vs MCP architecture research — incur patterns (`grimoires/bridgebuilder/incur-cli-vs-mcp-research.md`)

### Changed

- GPT review models upgraded to `gpt-5.3-codex` (from 5.2-codex)
- `browsing-constructs` skill updated with CLI command routing
- `seed-forge-packs.ts` uses recursive `canonicalStringify()` for deterministic manifest hashing (fixes nested key loss with `JSON.stringify` array replacer)
- Register API endpoint reordered: git URL validation runs before `createPack` to prevent orphaned DB registrations

### Fixed

#### Security (GPT 5.3-codex Cross-Model Review)

- **Path traversal** — trailing slash comparison + `realpath` + `python3` fallback for macOS portability
- **Curl config injection** — CR/LF/quote validation before writing API keys to curl config files in register + sync commands
- **HTTPS enforcement** — `.refine()` validator on `git_url` field in register API
- **userId guard** — explicit `Unauthorized` error when auth context missing in register endpoint
- **Timeout portability** — `timeout` → `gtimeout` fallback chain, skip execution when unavailable (macOS)
- **Hook sandboxing** — post-install hooks skip with warning instead of executing unbounded when no timeout binary available

### Constructs

| Construct | Repo | Skills |
|-----------|------|--------|
| Observer | `construct-observer` | 6 |
| Crucible | `construct-crucible` | 5 |
| Artisan | `construct-artisan` | 14 |
| Beacon | `construct-beacon` | 6 |
| GTM Collective | `construct-gtm-collective` | 8 |
| Protocol | `construct-protocol` | 10 |

### Quality Gates

- **Bridge review**: 3 iterations to flatline across all 3 phases (kaironic termination at score 0.00)
- **GPT 5.3-codex**: 2 iterations — 5 critical/major findings fixed, approved with 3 minor defense-in-depth suggestions
- **Syntax validation**: All shell scripts pass `bash -n`, TypeScript 0 errors

---

## [2.7.0] - 2026-02-26

### Why This Release

Ecosystem architecture grounded to reality. Four phantom constructs stripped, Protocol registered as the 6th construct, and 8 development cycles (034–042) shipped — spanning measurement honesty, memory sovereignty, multi-model adversarial review, and vision-aware planning.

### Added

#### Construct Registry

- **construct-protocol** registered as the 6th construct (10 skills: contract-verify, tx-forensics, abi-audit, proxy-inspect, simulate-flow, dapp-lint, dapp-typecheck, dapp-test, dapp-e2e, gpt-contract-review)
- Ecosystem architecture diagram now shows all 6 registered constructs with accurate skill counts (49 total)
- Herald and Hardening moved to "Planned Constructs" section

#### Cycles 034–042

- **cycle-034**: Declarative Execution Router + Adaptive Multi-Pass (#404)
- **cycle-035**: Measurement Honesty — signals API, fork provenance, graduation fix, DB resilience (#406)
- **cycle-036**: Quick-Win UX Fixes (#407)
- **cycle-038**: Organizational Memory Sovereignty — Three-Zone State Architecture (#410)
- **cycle-039**: Two-Pass Bridge Review Pipeline (#411, #412)
- **cycle-040**: Multi-Model Adversarial Review — GPT-5.3-Codex + Gemini Tertiary (#414)
- **cycle-041**: Vision-Aware Planning — Creative Agency for AI Peers (#416)
- **cycle-042**: Vision Activation — From Infrastructure to Living Memory (#417)

#### Ecosystem Documentation

- Full ecosystem architecture diagram with ELI5 explanations (#418)
- Naming lineage: Vodou via Tallant/Deren → Gibson → Loa (#419)
- Constructs Network distribution plane diagram (#420)

### Changed

- Topology validator reduced from 8 to 7 checks — legacy naming scan removed (no longer needed)
- Default codex model upgraded to gpt-5.3-codex
- Codex models routed to OpenAI Responses API instead of chat/completions
- `MELANGE_DISCORD_WEBHOOK` → `DISCORD_WEBHOOK_URL` in post-merge workflow

### Removed

- **Melange** references stripped from ecosystem docs (archived Dune naming — never operationalized)
- **Rune** references stripped (dissolved into Artisan construct)
- Legacy naming scan (Check 7) removed from topology validator

### Fixed

- Explorer 500 on construct detail pages
- API response parsing (caught by GPT cross-review)
- Collateral deletion safeguard bug (#331)
- Railway Docker build — DTS generation disabled
- API statement_timeout + real DB health check to prevent infinite hangs
- Next.js 15.1.0 → 15.1.9 security upgrade (CVE-2025-66478: react2shell)
- JSON-LD XSS via `</script>` injection
- Vercel build timeouts — ISR on-demand, API-independent builds, Suspense wrapping
- Flatline scoring engine 3-model tertiary cross-scoring (#415)
- gpt-5.2-codex backward-compat alias + Responses API token tracking

### Constructs

| Construct | Repo | Skills |
|-----------|------|--------|
| Observer | `construct-observer` | 6 |
| Crucible | `construct-crucible` | 5 |
| Artisan | `construct-artisan` | 14 |
| Beacon | `construct-beacon` | 6 |
| GTM Collective | `construct-gtm-collective` | 8 |
| Protocol | `construct-protocol` | 10 |

---

## [1.5.0] - 2026-02-05

### Why This Release

This release hoists MCP server ownership from individual packs to the network level, introduces per-pack changelogs with CI enforcement, and strengthens the validation pipeline.

### Changed

#### MCP Architecture: Network-Level Server Ownership

- Removed `mcp_servers` field from pack manifest schema (JSON Schema, TypeScript, Zod)
- MCP server definitions now live exclusively in `.claude/mcp-registry.yaml` with full runtime config (transport, command, security)
- Artisan pack converted from MCP provider to peer consumer via `mcp_dependencies`
- All packs are now equal consumers — no pack "owns" an MCP server

#### Per-Pack Changelogs

- Added `CHANGELOG.md` to all 5 packs (Artisan, Observer, Crucible, Beacon, GTM Collective)
- Keep a Changelog 1.1.0 format with independent semver per pack

#### CI Validation Pipeline

- `validate-packs` job now runs Zod schema validation via `validate-pack-manifests.mjs`
- MCP dependency resolution check via `validate-mcp-deps.sh`
- Version bump enforcement via `check-pack-versions.sh`
- Skill enrichment audit via `constructs-audit-index.sh` (39/39 skills)

### Fixed

- Removed invalid `dependencies: []` from pack manifests (should be object, not array)

### Pack Versions

| Pack | Version |
|------|---------|
| Artisan | 1.3.0 |
| Observer | 1.0.2 |
| Crucible | 1.0.3 |
| Beacon | 1.0.2 |
| GTM Collective | 1.0.0 |

---

## [1.1.0] - 2026-02-02

### Why This Release

This release implements Projen-style ownership patterns (RFC #66), aligning loa-registry with the upstream Loa framework's managed scaffolding architecture. It also addresses security audit findings to harden credential storage, JWT handling, and privacy compliance.

### Added

#### Projen-Style Ownership Alignment (RFC #66)

- **Magic Markers** - Pack-installed files now include ownership markers
  - `@pack-managed` markers for `.md`, `.yaml`, `.yml` files
  - SHA-256 hash (16 chars) for integrity verification
  - Detection of user modifications via `verifyPackMarkerIntegrity()`
  - Functions: `shouldAddMarker`, `addPackMarker`, `hasPackMarker`, `extractPackMarker`, `removePackMarker`

- **Client-Side Feature Gating** - Offline pack control via `.loa.config.yaml`
  - `constructs.disabled_packs` configuration option
  - Pack installation blocked with clear guidance for disabled packs
  - `[disabled]` indicator in `pack-list` output
  - Functions: `loadLoaConfig`, `isPackEnabled`, `getDisabledPacks`

- **CLAUDE.md Fragments** - Pack-contributed instruction fragments
  - `claude_instructions` field in pack manifest schema
  - Server-side validation (file must exist, max 4KB size)
  - CLI writes fragment to `.claude/packs/{slug}/pack-claude.md`
  - `@import` instructions displayed after successful install

### Security

#### Audit Remediations (SECURITY-AUDIT-REPORT 2026-02-02)

- **H-001: Secure Credential Storage** (CVSS 6.5)
  - File permissions (0600) on credentials.json via `configFileMode`
  - Credential directory permissions (0700) on creation
  - Auto-fix overly permissive directory permissions on Unix systems
  - Location: `packages/loa-registry/src/auth.ts`

- **H-002: Remove JWT Fallback Secret** (CVSS 7.1)
  - Removed hardcoded `development-secret-at-least-32-chars` fallback
  - JWT_SECRET required in all environments (not just production)
  - Clear error message with `openssl rand -base64 32` example
  - Locations: `apps/api/src/services/auth.ts`, `apps/api/src/routes/packs.ts`

- **H-003: Privacy-Compliant Anonymous Licenses** (CVSS 4.3)
  - Replaced IP-based watermarking with random session ID (crypto.randomUUID)
  - Improved privacy/GDPR compliance for anonymous users
  - Location: `apps/api/src/routes/packs.ts`

### Changed

- CLI plugin version bumped to 0.4.0
- Pack install now adds markers to all supported file types
- Pack list now shows disabled pack count in summary

### Test Coverage

- 48 new tests for pack-marker utilities
- 26 new tests for config loading
- All 94 CLI tests passing

---

## [1.0.0] - 2025-12-31

### Why This Release

This is the initial production release of Loa Skills Registry, completing all 15 sprints of development. The platform provides a complete SaaS solution for distributing, licensing, and monetizing AI agent skills compatible with the Loa framework and Claude Code.

### Added

#### Core Platform (Sprints 1-4)

- **Authentication System**
  - JWT-based authentication with access/refresh tokens
  - bcrypt password hashing (cost factor 12)
  - Email verification flow
  - Password reset with secure tokens
  - OAuth integration (GitHub, Google)
  - API key authentication with `sk_live_`/`sk_test_` prefixes

- **Database Schema**
  - PostgreSQL via Drizzle ORM
  - 15+ tables: users, teams, subscriptions, skills, packs, licenses, audit_logs
  - Proper indexes and foreign key constraints
  - JSONB fields for flexible metadata

- **Subscription System**
  - Four tiers: Free, Pro, Team, Enterprise
  - Stripe integration for payments
  - Webhook handling for subscription lifecycle
  - Tier-based access control

- **Skills API**
  - CRUD operations for skills
  - Version management with semver
  - File storage on Cloudflare R2
  - Download tracking and analytics
  - Category and tag filtering
  - Search functionality

#### Dashboard (Sprints 5-6)

- **Authentication Pages**
  - Login, Register, Forgot Password, Reset Password
  - Email verification flow
  - OAuth buttons for GitHub/Google
  - Protected route wrapper

- **Dashboard Core**
  - Responsive layout with sidebar navigation
  - Dashboard home with stats overview
  - Skill browser with search and filters
  - Skill detail pages
  - Billing management
  - Profile settings
  - API key management

#### CLI Plugin (Sprints 7-8)

- **Core Commands**
  - `login` - Authenticate with registry
  - `logout` - Clear credentials
  - `whoami` - Show current user
  - `search` - Search for skills
  - `info` - Get skill details

- **Installation Commands**
  - `install` - Install a skill
  - `update` - Update installed skills
  - `uninstall` - Remove a skill
  - `list` - List installed skills

- **License Validation**
  - Local license file storage
  - Expiration checking
  - Watermark tracking

#### Team Management (Sprint 9)

- **Team API**
  - Create and manage teams
  - Member management (add, remove, change role)
  - Role hierarchy: owner > admin > member
  - Team-scoped subscriptions

- **Invitation System**
  - Email invitations with secure tokens
  - Accept/decline flow
  - Expiration handling
  - Invitation revocation

- **Dashboard Pages**
  - Team list and creation
  - Team settings and members
  - Team billing

#### Analytics & Creator Tools (Sprint 10)

- **Usage Analytics**
  - Per-user usage tracking
  - Skill installation metrics
  - Time-series data

- **Creator Dashboard**
  - Published skills overview
  - Download statistics
  - Revenue tracking (future)

- **Skill Publishing**
  - Multi-step publish flow
  - Version management
  - File upload interface

#### Enterprise Features (Sprint 11)

- **Audit Logging**
  - Comprehensive event tracking
  - User, team, and resource scoping
  - Queryable via API
  - 40+ event types

- **Enhanced Rate Limiting**
  - Sliding window algorithm
  - Tier-based limits
  - Redis-backed for distributed systems

- **Security Hardening**
  - Security headers (CSP, HSTS, X-Frame-Options)
  - CSRF protection (double-submit cookie)
  - Input sanitization utilities

#### Launch Prep (Sprint 12)

- **E2E Testing**
  - Playwright test suite
  - Critical path coverage
  - CI integration

- **API Documentation**
  - OpenAPI/Swagger spec
  - Interactive documentation at `/v1/docs`

- **Deployment Configuration**
  - Fly.io configuration
  - Health checks
  - Rolling deployments

- **Monitoring**
  - Structured logging with Pino
  - Sentry integration for error tracking
  - Performance metrics

#### Pack System (Sprints 13-15)

- **Pack Database Schema** (Sprint 13)
  - 5 new tables: packs, pack_versions, pack_files, pack_subscriptions, pack_installations
  - Pricing types: free, one_time, subscription
  - Status workflow: draft → pending_review → published

- **Pack API** (Sprint 13)
  - CRUD operations for packs
  - Version management
  - Manifest validation
  - Download with subscription check

- **Token Blacklisting** (Sprint 13)
  - Redis-based token revocation
  - True logout functionality
  - Fail-secure on Redis errors

- **GTM Import Script** (Sprint 14)
  - Bulk pack import from JSON
  - Skill bundling
  - File generation

- **CLI Pack Commands** (Sprint 15)
  - `pack-install` - Install a pack
  - `pack-list` - List installed packs
  - `pack-update` - Update packs
  - License storage per pack

- **Admin API** (Sprint 15)
  - User management (list, view, update)
  - Pack moderation (approve, reject, feature)
  - Tier override capability
  - Audit logging for all actions

### Security

- **Authentication**
  - JWT with HS256 signing
  - 15-minute access token expiry
  - 30-day refresh token expiry
  - Token blacklisting for revocation
  - Production JWT_SECRET enforcement (≥32 chars)

- **Authorization**
  - Role-based access control
  - Ownership verification
  - Team permission hierarchy
  - Admin self-modification prevention

- **Input Validation**
  - Zod schemas on all endpoints
  - SQL injection prevention via Drizzle ORM
  - Path traversal prevention
  - XSS prevention via CSP

- **Rate Limiting**
  - Tier-based limits (100-1000 req/min)
  - Stricter auth endpoint limits (10 req/min)
  - Fail-closed for auth endpoints on Redis errors
  - IP-based limiting for unauthenticated requests

- **Infrastructure**
  - HTTPS enforced
  - Security headers on all responses
  - Secrets via environment variables
  - No hardcoded credentials

### Technical Stack

| Component | Technology |
|-----------|------------|
| API | Hono + Node.js |
| Database | PostgreSQL (Supabase) + Drizzle ORM |
| Cache | Redis (Upstash) |
| Storage | Cloudflare R2 |
| Auth | JWT RS256 (jose) + bcrypt |
| Email | Resend |
| Frontend | Next.js 14 + Tailwind CSS |
| Hosting | Railway |
| Monorepo | Turborepo + pnpm |

### API Endpoints

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/auth/register` | Create account |
| POST | `/v1/auth/login` | Login |
| POST | `/v1/auth/refresh` | Refresh tokens |
| POST | `/v1/auth/logout` | Logout (blacklists token) |
| POST | `/v1/auth/forgot-password` | Request password reset |
| POST | `/v1/auth/reset-password` | Reset password |
| POST | `/v1/auth/verify-email` | Verify email |
| GET | `/v1/auth/me` | Get current user |

#### Skills
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/skills` | List/search skills |
| GET | `/v1/skills/:slug` | Get skill details |
| POST | `/v1/skills` | Create skill |
| PATCH | `/v1/skills/:slug` | Update skill |
| DELETE | `/v1/skills/:slug` | Delete skill |
| GET | `/v1/skills/:slug/download` | Download files |
| POST | `/v1/skills/:slug/install` | Record install |

#### Packs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/packs` | List packs |
| GET | `/v1/packs/:slug` | Get pack details |
| POST | `/v1/packs` | Create pack |
| PATCH | `/v1/packs/:slug` | Update pack |
| GET | `/v1/packs/:slug/download` | Download pack |
| POST | `/v1/packs/:slug/versions` | Add version |

#### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/teams` | List user's teams |
| POST | `/v1/teams` | Create team |
| GET | `/v1/teams/:slug` | Get team details |
| PATCH | `/v1/teams/:slug` | Update team |
| DELETE | `/v1/teams/:slug` | Delete team |
| POST | `/v1/teams/:slug/invite` | Invite member |
| POST | `/v1/teams/:slug/members/:id/remove` | Remove member |

#### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/admin/users` | List users |
| GET | `/v1/admin/users/:id` | Get user details |
| PATCH | `/v1/admin/users/:id` | Update user |
| GET | `/v1/admin/packs` | List all packs |
| PATCH | `/v1/admin/packs/:id` | Moderate pack |
| DELETE | `/v1/admin/packs/:id` | Remove pack |

### Test Coverage

- 76 API tests passing
- E2E tests for critical paths
- Type checking across all packages
- Security audit: APPROVED

### Sprint Summary

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Project Setup & Auth | COMPLETED |
| 2 | Skills CRUD & Storage | COMPLETED |
| 3 | Subscriptions & Stripe | COMPLETED |
| 4 | Skills API Polish | COMPLETED |
| 5 | Dashboard Auth | COMPLETED |
| 6 | Dashboard Core | COMPLETED |
| 7 | CLI Plugin Core | COMPLETED |
| 8 | CLI Install & License | COMPLETED |
| 9 | Team Management | COMPLETED |
| 10 | Analytics & Creator | COMPLETED |
| 11 | Enterprise Features | COMPLETED |
| 12 | Polish & Launch Prep | COMPLETED |
| 13 | Security & Pack Foundation | COMPLETED |
| 14 | GTM Collective Import | COMPLETED |
| 15 | CLI Pack Commands & Polish | COMPLETED |

### Documentation

- [README.md](README.md) - Project overview
- [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md) - Security audit
- [loa-grimoire/prd.md](loa-grimoire/prd.md) - Product requirements
- [loa-grimoire/sdd.md](loa-grimoire/sdd.md) - System design
- [loa-grimoire/sprint.md](loa-grimoire/sprint.md) - Sprint plan

---

[2.7.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v2.7.0
[1.5.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v1.5.0
[1.1.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v1.1.0
[1.0.0]: https://github.com/0xHoneyJar/loa-constructs/releases/tag/v1.0.0
