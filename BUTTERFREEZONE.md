<!-- AGENT-CONTEXT
name: loa-constructs
type: framework
purpose: SaaS platform for distributing, licensing, and monetizing AI agent constructs. NB: this `version` field is the monorepo-package version domain (historical bun/turbo workspace tag); the canonical construct-registry release version is shown in README.md badge + CHANGELOG.md and on GitHub Releases (currently v2.41.0). See cycle-0 README version-surface map.
key_files: [CLAUDE.md, .claude/loa/CLAUDE.loa.md, .loa.config.yaml, .claude/scripts/, .claude/skills/, package.json]
interfaces:
  core: [/auditing-security, /autonomous-agent, /bridgebuilder-review, /browsing-constructs, /bug-triaging]
  project: [/adding-skills, /cost-budget-enforcer, /creating-constructs, /cross-repo-status-reader, /feedback-widget]
dependencies: [git, jq, yq, node]
ecosystem:
  - repo: 0xHoneyJar/loa-finn
    role: runtime
    interface: hounfour-router
    protocol: loa-hounfour@8.3.1
  - repo: 0xHoneyJar/loa-hounfour
    role: protocol
    interface: npm-package
    protocol: loa-hounfour@8.3.1
  - repo: 0xHoneyJar/arrakis
    role: distribution
    interface: jwt-auth
    protocol: loa-hounfour@8.3.1
capability_requirements:
  - filesystem: read
  - filesystem: write (scope: state)
  - filesystem: write (scope: app)
  - git: read_write
  - shell: execute
  - github_api: read_write (scope: external)
version: v2.45.0
installation_mode: unknown
trust_level: L2-verified
-->

# loa-constructs

<!-- provenance: CODE-FACTUAL -->
SaaS platform for distributing, licensing, and monetizing AI agent constructs. NB: this `version` field is the monorepo-package version domain (historical bun/turbo workspace tag); the canonical construct-registry release version is shown in README.md badge + CHANGELOG.md and on GitHub Releases (currently v2.41.0). See cycle-0 README version-surface map.

The framework provides 48 specialized skills, built with TypeScript/JavaScript, Python, Shell.

## Key Capabilities
<!-- provenance: CODE-FACTUAL -->
The project exposes 5 key entry points across its public API surface.
# API Surface — loa-constructs
## Server bootstrap
- **Framework**: Hono v4.6 + `@hono/node-server` (apps/api/package.json)
- **Entry point**: `apps/api/src/index.ts` → `app.ts`
- **API version**: `/v1` mount (app.ts:99, 162)
- **Default port**: 3000 (config/env.ts:12)
- **Default host**: 0.0.0.0 (config/env.ts:13)
## Global middleware (in order — app.ts:46-94)
## Route groups (mounted under `/v1`)
## Verb counts (approx — `c.get/c.post/...` calls in non-test routes)

## Architecture
<!-- provenance: CODE-FACTUAL -->
The architecture follows a three-zone model: System (`.claude/`) contains framework-managed scripts and skills, State (`grimoires/`, `.beads/`) holds project-specific artifacts and memory, and App (`src/`, `lib/`) contains developer-owned application code. The framework orchestrates       48 specialized skills through slash commands.
```mermaid
graph TD
    api[api]
    apps[apps]
    audits[audits]
    clusters[clusters]
    compositions[compositions]
    cycles[cycles]
    docs[docs]
    evals[evals]
    Root[Project Root]
    Root --> api
    Root --> apps
    Root --> audits
    Root --> clusters
    Root --> compositions
    Root --> cycles
    Root --> docs
    Root --> evals
```
Directory structure:
```
./api
./api/checkout
./api/subscription
./api/webhook
./apps
./apps/api
./apps/docs
./audits
./clusters
./compositions
./cycles
./cycles/cycle-30990251ff
./cycles/cycle-31047133ca
./docs
./docs/architecture
./docs/archive
./docs/guides
./docs/integration
./docs/migration
./docs/mockups
./docs/schemas
./docs/screenshots
./docs/tutorials
./evals
./evals/baselines
./evals/fixtures
./evals/graders
./evals/harness
./evals/results
./evals/suites
```

## Interfaces
<!-- provenance: CODE-FACTUAL -->
### HTTP Routes

- **GET** `/` (`./apps/api/src/app.ts:172`)
- **GET** `/app-error` (`./apps/api/src/middleware/error-handler.test.ts:40`)
- **GET** `/duck-type-error` (`./apps/api/src/middleware/error-handler.test.ts:48`)
- **GET** `/test` (`./apps/api/src/middleware/auth.test.ts:235`)
- **GET** `/test` (`./apps/api/src/middleware/auth.test.ts:250`)
- **GET** `/test` (`./apps/api/src/middleware/auth.test.ts:272`)
- **GET** `/test` (`./apps/api/src/middleware/auth.test.ts:296`)
- **GET** `/test` (`./apps/api/src/middleware/auth.test.ts:93`)
- **GET** `/test` (`./apps/api/src/middleware/rate-limiter.test.ts:61`)
- **GET** `/unknown-error` (`./apps/api/src/middleware/error-handler.test.ts:44`)
- **GET** `/v1/auth/login` (`./apps/api/src/middleware/rate-limiter.test.ts:62`)
- **POST** `/v1/admin/refresh-registry` (`./apps/api/src/middleware/nonce-store.ts:65`)

### Skill Commands

#### Loa Core

- **/auditing-security** — Paranoid Cypherpunk Auditor
- **/autonomous-agent** — Autonomous Agent Orchestrator
- **/bridgebuilder-review** — Bridgebuilder — Autonomous PR Review
- **/browsing-constructs** — Unified construct discovery surface for the Constructs Network. This skill is a **thin API client** — all search intelligence, ranking, and composability analysis lives in the Constructs Network API.
- **/bug-triaging** — Bug Triage Skill
- **/butterfreezone-gen** — BUTTERFREEZONE Generation Skill
- **/continuous-learning** — Continuous Learning Skill
- **/deploying-infrastructure** — DevOps Crypto Architect Skill
- **/designing-architecture** — Architecture Designer
- **/discovering-requirements** — Discovering Requirements
- **/enhancing-prompts** — Enhancing Prompts
- **/eval-running** — Eval Running Skill
- **/flatline-knowledge** — Provides optional NotebookLM integration for the Flatline Protocol, enabling external knowledge retrieval from curated AI-powered notebooks.
- **/flatline-reviewer** — Uflatline reviewer
- **/flatline-scorer** — Uflatline scorer
- **/flatline-skeptic** — Uflatline skeptic
- **/gpt-reviewer** — Ugpt reviewer
- **/implementing-tasks** — Sprint Task Implementer
- **/managing-credentials** — /loa-credentials — Credential Management
- **/mounting-framework** — Mounting the Loa Framework
- **/planning-sprints** — Sprint Planner
- **/red-teaming** — Use the Flatline Protocol's red team mode to generate creative attack scenarios against design documents. Produces structured attack scenarios with consensus classification and architectural counter-designs.
- **/reviewing-code** — Senior Tech Lead Reviewer
- **/riding-codebase** — Riding Through the Codebase
- **/rtfm-testing** — RTFM Testing Skill
- **/run-bridge** — Run Bridge — Autonomous Excellence Loop
- **/run-mode** — Run Mode Skill
- **/simstim-workflow** — Simstim - HITL Accelerated Development Workflow
- **/translating-for-executives** — DevRel Translator Skill (Enterprise-Grade v2.0)
#### Project-Specific

- **/adding-skills** — Two-phase scaffolding: `construct create` makes the shell, `/skill-add <name>` grows capabilities. Creates a dispatch-ready skill with context-aware content by reading existing skills.
- **/cost-budget-enforcer** — Daily token-cap enforcement for autonomous Loa cycles. Replaces the
- **/creating-constructs** — Scaffold new construct projects from templates. Supports three construct
- **/cross-repo-status-reader** — Read structured cross-repo state for ≤50 repos in parallel via `gh api`, with TTL cache + stale fallback, BLOCKER extraction from each repo's `grimoires/loa/NOTES.md` tail, and per-source error capture so one repo's failure does not abort the full read. The operator-visibility primitive for the Agent-Network Operator (P1).
- **/feedback-widget** — Ufeedback widget
- **/finding-constructs** — Ufinding constructs
- **/flatline-attacker** — Uflatline attacker
- **/graduated-trust** — The L4 primitive maintains a per-(scope, capability, actor) trust ledger
- **/hitl-jury-panel** — Replace `AskUserQuestion`-class decisions during operator absence with a panel of ≥3 deliberately-diverse panelists. Each panelist (model + persona) returns a view and reasoning; the skill logs all views BEFORE selection, then picks one binding view via a deterministic seed derived from `(decision_id, context_hash)`. Provides an autonomous adjudication primitive without compromising auditability.
- **/linking-constructs** — Link local construct repositories for live development. When a construct is linked,
- **/loa-setup** — /loa setup — Onboarding Wizard
- **/publishing-constructs** — Publish constructs to the registry via git-sync. Discovers filesystem structure, prompts for missing Tier 2/3 fields, validates, bumps version, and triggers sync. The agent handles intelligence (field inference, domain suggestion); the bash script handles mechanics (validation, push, sync).
- **/scheduled-cycle-template** — Compose `/schedule` (cron registration) with the existing autonomous-mode primitives into a generic 5-phase cycle: **read state → decide → dispatch → await → log**. Caller plugs five small phase scripts (the *DispatchContract*) into a YAML; the L3 lib runs them under a flock, records every phase to a hash-chained audit log, and (optionally) consults the L2 cost gate before letting any work begin.

## Module Map
<!-- provenance: CODE-FACTUAL -->
| Module | Files | Purpose | Documentation |
|--------|-------|---------|---------------|
| `api/` | 3 | API endpoints | \u2014 |
| `apps/` | 15719 | Uapps | \u2014 |
| `audits/` | 1 | Uaudits | \u2014 |
| `clusters/` | 1 | Uclusters | \u2014 |
| `compositions/` | 1 | Ucompositions | \u2014 |
| `cycles/` | 11 | Ucycles | \u2014 |
| `docs/` | 49 | Documentation | \u2014 |
| `evals/` | 122 | Benchmarking and regression framework for the Loa agent development system. Ensures framework changes don't degrade agent behavior through | [evals/README.md](evals/README.md) |
| `grimoires/` | 1100 | Home to all grimoire directories for the Loa | [grimoires/README.md](grimoires/README.md) |
| `lib/` | 1 | Source code | \u2014 |
| `packages/` | 1176 | Upackages | \u2014 |
| `scripts/` | 36 | Utility scripts | \u2014 |
| `tests/` | 716 | Test suites | \u2014 |
| `tools/` | 23 | Shell scripts and utilities | \u2014 |

## Verification
<!-- provenance: CODE-FACTUAL -->
- Trust Level: **L2 — CI Verified**
- 719 test files across 1 suite
- CI/CD: GitHub Actions (15 workflows)
- Linting: ESLint configured
- Security: SECURITY.md present

## Agents
<!-- provenance: DERIVED -->
The project defines 1 specialized agent persona.

| Agent | Identity | Voice |
|-------|----------|-------|
| Bridgebuilder | You are the Bridgebuilder — a senior engineering mentor who has spent decades building systems at scale. | Your voice is warm, precise, and rich with analogy. |

## Ecosystem
<!-- provenance: OPERATIONAL -->
### Dependencies
- `@types/node`
- `esbuild`
- `prettier`
- `tsx`
- `turbo`
- `typescript`

## Culture
<!-- provenance: OPERATIONAL -->
**Naming**: Vodou terminology (Loa, Grimoire, Hounfour, Simstim) as cognitive hooks for agent framework concepts.

**Principles**: Think Before Coding — plan and analyze before implementing, Simplicity First — minimum complexity for the current task, Surgical Changes — minimal diff, maximum impact, Goal-Driven — every action traces to acceptance criteria.

**Methodology**: Agent-driven development with iterative excellence loops (Simstim, Run Bridge, Flatline Protocol).
**Creative Methodology**: Creative methodology drawing from cyberpunk fiction, free jazz improvisation, and temporary autonomous zones.

**Influences**: Neuromancer (Gibson) — Simstim as shared consciousness metaphor, Flatline Protocol — adversarial multi-model review as creative tension, TAZ (Hakim Bey) — temporary spaces for autonomous agent exploration.

**Knowledge Production**: Knowledge production through collective inquiry — Flatline as multi-model study group.

## Quick Start
<!-- provenance: OPERATIONAL -->
Available commands:

- `npm run dev` — turbo
- `npm run build` — turbo
- `npm run test` — turbo
- `npm run test:coverage` — turbo
<!-- ground-truth-meta
head_sha: 9cafdf43458fe66bce8e767721310937a732f4d4
generated_at: 2026-05-17T19:02:14Z
generator: butterfreezone-gen v1.0.0
sections:
  agent_context: 06a4e4d4e7873665cfb0c3081fb720aeed41e731632628c0d562e1f96cb9caa9
  capabilities: 4b62d222e5aaf2083317bf600ba3f019afeb0698d303f2bf7509a2cec59b11b9
  architecture: 4f00f1cd2ff3636c02c42d9a69955b0f864d55a1aae539522746a93408d39485
  interfaces: ee53b7c6db85ea867e2ca007594c7da14fd26a2207b26855d5deee04ef262b38
  module_map: fb0974a5a087d9c5f2f1da2849976b75c7133d9bfca6a75b0ae3a90b321e5760
  verification: 46695342bc338213a3265b39488c315cbead89d88c3aaa2758a17786acfb1567
  agents: ca263d1e05fd123434a21ef574fc8d76b559d22060719640a1f060527ef6a0b6
  ecosystem: 2dc951cf4baf045c490819286fb4c5b11166efc12c58ea26517656b5f1171bde
  culture: f73380f93bb4fadf36ccc10d60fc57555914363fc90e4f15b4dc4eb92bd1640f
  quick_start: 15f176d9343ca15a6b32f5134ba0eda33e96f69620f6495734a1f150548e337b
-->
