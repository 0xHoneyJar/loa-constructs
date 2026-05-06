<!-- AGENT-CONTEXT
name: loa-constructs
type: framework
purpose: SaaS platform for distributing, licensing, and monetizing AI agent constructs
key_files: [CLAUDE.md, .claude/loa/CLAUDE.loa.md, .loa.config.yaml, .claude/scripts/, .claude/skills/, package.json]
interfaces:
  core: [/auditing-security, /autonomous-agent, /bridgebuilder-review, /browsing-constructs, /bug-triaging]
  project: [/adding-skills, /cost-budget-enforcer, /creating-constructs, /feedback-widget, /finding-constructs]
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
version: v2.36.0
installation_mode: unknown
trust_level: L2-verified
-->

# loa-constructs

<!-- provenance: CODE-FACTUAL -->
SaaS platform for distributing, licensing, and monetizing AI agent constructs

The framework provides 43 specialized skills, built with TypeScript/JavaScript, Python, Shell.

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
The architecture follows a three-zone model: System (`.claude/`) contains framework-managed scripts and skills, State (`grimoires/`, `.beads/`) holds project-specific artifacts and memory, and App (`src/`, `lib/`) contains developer-owned application code. The framework orchestrates       43 specialized skills through slash commands.
```mermaid
graph TD
    api[api]
    apps[apps]
    audits[audits]
    docs[docs]
    evals[evals]
    grimoires[grimoires]
    lib[lib]
    packages[packages]
    Root[Project Root]
    Root --> api
    Root --> apps
    Root --> audits
    Root --> docs
    Root --> evals
    Root --> grimoires
    Root --> lib
    Root --> packages
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
./docs
./docs/architecture
./docs/archive
./docs/guides
./docs/integration
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
./evals/tasks
./evals/tests
./grimoires
./grimoires/artisan
./grimoires/beacon
./grimoires/bridgebuilder
```

## Interfaces
<!-- provenance: CODE-FACTUAL -->
### HTTP Routes

- **GET** `/` (`./apps/api/src/app.ts:165`)
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
- **/feedback-widget** — Ufeedback widget
- **/finding-constructs** — Ufinding constructs
- **/hitl-jury-panel** — Replace `AskUserQuestion`-class decisions during operator absence with a panel of ≥3 deliberately-diverse panelists. Each panelist (model + persona) returns a view and reasoning; the skill logs all views BEFORE selection, then picks one binding view via a deterministic seed derived from `(decision_id, context_hash)`. Provides an autonomous adjudication primitive without compromising auditability.
- **/linking-constructs** — Link local construct repositories for live development. When a construct is linked,
- **/loa-setup** — /loa setup — Onboarding Wizard
- **/publishing-constructs** — Publish constructs to the registry via git-sync. Discovers filesystem structure, prompts for missing Tier 2/3 fields, validates, bumps version, and triggers sync. The agent handles intelligence (field inference, domain suggestion); the bash script handles mechanics (validation, push, sync).
- **/scheduled-cycle-template** — Compose `/schedule` (cron registration) with the existing autonomous-mode primitives into a generic 5-phase cycle: **read state → decide → dispatch → await → log**. Caller plugs five small phase scripts (the *DispatchContract*) into a YAML; the L3 lib runs them under a flock, records every phase to a hash-chained audit log, and (optionally) consults the L2 cost gate before letting any work begin.
- **/spiraling** — Uspiraling
- **/syncing-constructs** — Detect divergence between local constructs and their upstream registry versions.
- **/upgrading-constructs** — Upgrade installed constructs to newer versions using 3-way merge. Uses the
- **/validating-construct-manifest** — Validate a construct pack directory before it lands in a registry or a local install. Surfaces:

## Module Map
<!-- provenance: CODE-FACTUAL -->
| Module | Files | Purpose | Documentation |
|--------|-------|---------|---------------|
| `api/` | 3 | API endpoints | \u2014 |
| `apps/` | 15698 | Uapps | \u2014 |
| `audits/` | 1 | Uaudits | \u2014 |
| `docs/` | 47 | Documentation | \u2014 |
| `evals/` | 122 | Benchmarking and regression framework for the Loa agent development system. Ensures framework changes don't degrade agent behavior through | [evals/README.md](evals/README.md) |
| `grimoires/` | 982 | Home to all grimoire directories for the Loa | [grimoires/README.md](grimoires/README.md) |
| `lib/` | 1 | Source code | \u2014 |
| `packages/` | 1176 | Upackages | \u2014 |
| `scripts/` | 36 | Utility scripts | \u2014 |
| `tests/` | 432 | Test suites | \u2014 |
| `tools/` | 2 | Utools | \u2014 |

## Verification
<!-- provenance: CODE-FACTUAL -->
- Trust Level: **L2 — CI Verified**
- 435 test files across 1 suite
- CI/CD: GitHub Actions (13 workflows)
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
head_sha: 862dd61b538d65104628df41d932d9597b717f7b
generated_at: 2026-05-06T02:20:57Z
generator: butterfreezone-gen v1.0.0
sections:
  agent_context: 10549e86f17d07440a6aa4dd9717709a694aefef61654c0d693f15ea82882dce
  capabilities: 4b62d222e5aaf2083317bf600ba3f019afeb0698d303f2bf7509a2cec59b11b9
  architecture: 14e538d2033965b028321f7076b13e9a417d10d635f9b79b573631c72828b6a1
  interfaces: d455d5e889d8e5651874ce63966eb2a31bf77d3d14ed0f59cd311f29c604d9a0
  module_map: f52b6ece3df44ade2f3147879c3401173c3f00100340d28ff2d53ebb829591a4
  verification: 7244dcd63598690e974e95f66e33d85b6ea4ee8c84d83cdc034120e180f63b74
  agents: ca263d1e05fd123434a21ef574fc8d76b559d22060719640a1f060527ef6a0b6
  ecosystem: 2dc951cf4baf045c490819286fb4c5b11166efc12c58ea26517656b5f1171bde
  culture: f73380f93bb4fadf36ccc10d60fc57555914363fc90e4f15b4dc4eb92bd1640f
  quick_start: 15f176d9343ca15a6b32f5134ba0eda33e96f69620f6495734a1f150548e337b
-->
