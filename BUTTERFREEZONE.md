<!-- AGENT-CONTEXT
name: loa-constructs
type: framework
purpose: SaaS platform for distributing, licensing, and monetizing AI agent constructs
key_files: [CLAUDE.md, .claude/loa/CLAUDE.loa.md, .loa.config.yaml, .claude/scripts/, .claude/skills/, package.json]
interfaces:
  core: [/auditing-security, /autonomous-agent, /bridgebuilder-review, /browsing-constructs, /bug-triaging]
  project: [/creating-constructs, /finding-constructs, /linking-constructs, /publishing-constructs, /syncing-constructs]
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
version: v2.9.0
installation_mode: unknown
trust_level: L2-verified
-->

# loa-constructs

<!-- provenance: DERIVED -->
SaaS platform for distributing, licensing, and monetizing AI agent constructs

The framework provides 35 specialized skills, built with TypeScript/JavaScript, Python, Shell.

## Key Capabilities
<!-- provenance: DERIVED -->
The project exposes 15 key entry points across its public API surface.

### .cache/construct-repos/construct-beacon/scripts

- **fail** — Ufail (`./.cache/construct-repos/construct-beacon/scripts/validate.sh:27`)
- **pass** — Upass (`./.cache/construct-repos/construct-beacon/scripts/validate.sh:26`)
- **warn** — Uwarn (`./.cache/construct-repos/construct-beacon/scripts/validate.sh:28`)

### .cache/construct-repos/construct-k-hole/scripts/templates

- **DISCOVERY_QUERIES:DiscoveryQuery[]=[** — Udiscovery queries:discovery query[]=[ (`./.cache/construct-repos/construct-k-hole/scripts/templates/research-config.template.ts:28`)
- **SYNTHESIS_CONTEXT=`Theresearcherwantstobuilddeepexpertisein[** — Usynthesis context=`theresearcherwantstobuilddeepexpertisein[ (`./.cache/construct-repos/construct-k-hole/scripts/templates/research-config.template.ts:75`)
- **TOPICS:Topic[]=[** — Utopics:topic[]=[ (`./.cache/construct-repos/construct-k-hole/scripts/templates/research-config.template.ts:53`)

### .cache/construct-repos/construct-mibera-codex/.claude/adapters

- **_build_provider_config** — U build provider config (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:149`)
- **_error_json** — U error json (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:74`)
- **_load_persona** — U load persona (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:93`)
- **cmd_invoke** — Ucmd invoke (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:177`)
- **cmd_print_config** — Ucmd print config (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:326`)
- **cmd_validate_bindings** — Ucmd validate bindings (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:337`)
- **main** — Umain (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/cheval.py:351`)

### .cache/construct-repos/construct-mibera-codex/.claude/adapters/loa_cheval/config

- **LazyValue** — Ulazy value (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/loa_cheval/config/interpolation.py:41`)
- **_check_env_allowed** — U check env allowed (`./.cache/construct-repos/construct-mibera-codex/.claude/adapters/loa_cheval/config/interpolation.py:122`)

## Architecture
<!-- provenance: DERIVED -->
The architecture follows a three-zone model: System (`.claude/`) contains framework-managed scripts and skills, State (`grimoires/`, `.beads/`) holds project-specific artifacts and memory, and App (`src/`, `lib/`) contains developer-owned application code. The framework orchestrates       35 specialized skills through slash commands.
```mermaid
graph TD
    api[api]
    apps[apps]
    audits[audits]
    docs[docs]
    evals[evals]
    grimoires[grimoires]
    packages[packages]
    packs[packs]
    Root[Project Root]
    Root --> api
    Root --> apps
    Root --> audits
    Root --> docs
    Root --> evals
    Root --> grimoires
    Root --> packages
    Root --> packs
```
Directory structure:
```
./api
./api/checkout
./api/subscription
./api/webhook
./apps
./apps/api
./apps/explorer
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
./grimoires/bridgebuilder
./grimoires/loa
```

## Interfaces
<!-- provenance: DERIVED -->
### HTTP Routes

- **GET** `/` (`./apps/api/src/app.ts:159`)

### Skill Commands

#### Loa Core

- **/auditing-security** — Paranoid Cypherpunk Auditor
- **/autonomous-agent** — Uautonomous agent
- **/bridgebuilder-review** — Bridgebuilder — Autonomous PR Review
- **/browsing-constructs** — Provide a multi-select UI for browsing and installing packs from the Loa Constructs Registry. Enables composable skill installation per-repo.
- **/bug-triaging** — Bug Triage Skill
- **/butterfreezone-gen** — BUTTERFREEZONE Generation Skill
- **/continuous-learning** — Continuous Learning Skill
- **/deploying-infrastructure** — Udeploying infrastructure
- **/designing-architecture** — Architecture Designer
- **/discovering-requirements** — Discovering Requirements
- **/enhancing-prompts** — Uenhancing prompts
- **/eval-running** — Ueval running
- **/flatline-knowledge** — Provides optional NotebookLM integration for the Flatline Protocol, enabling external knowledge retrieval from curated AI-powered notebooks.
- **/flatline-reviewer** — Uflatline reviewer
- **/flatline-scorer** — Uflatline scorer
- **/flatline-skeptic** — Uflatline skeptic
- **/gpt-reviewer** — Ugpt reviewer
- **/implementing-tasks** — Sprint Task Implementer
- **/managing-credentials** — /loa-credentials — Credential Management
- **/mounting-framework** — Create structure (preserve if exists)
- **/planning-sprints** — Sprint Planner
- **/red-teaming** — Use the Flatline Protocol's red team mode to generate creative attack scenarios against design documents. Produces structured attack scenarios with consensus classification and architectural counter-designs.
- **/reviewing-code** — Senior Tech Lead Reviewer
- **/riding-codebase** — Riding Through the Codebase
- **/rtfm-testing** — RTFM Testing Skill
- **/run-bridge** — Run Bridge — Autonomous Excellence Loop
- **/run-mode** — Urun mode
- **/simstim-workflow** — .loa.config.yaml
- **/translating-for-executives** — Utranslating for executives
#### Project-Specific

- **/creating-constructs** — Scaffold new construct projects from templates. Supports three construct
- **/finding-constructs** — Ufinding constructs
- **/linking-constructs** — Link local construct repositories for live development. When a construct is linked,
- **/publishing-constructs** — Publish constructs to the Loa Constructs Registry. Runs a 10-point validation
- **/syncing-constructs** — Detect divergence between local constructs and their upstream registry versions.
- **/upgrading-constructs** — Upgrade installed constructs to newer versions using 3-way merge. Uses the

## Module Map
<!-- provenance: DERIVED -->
| Module | Files | Purpose | Documentation |
|--------|-------|---------|---------------|
| `api/` | 3 | API endpoints | \u2014 |
| `apps/` | 15747 | Uapps | \u2014 |
| `audits/` | 1 | Uaudits | \u2014 |
| `docs/` | 41 | Documentation | \u2014 |
| `evals/` | 122 | Benchmarking and regression framework for the Loa agent development system. Ensures framework changes don't degrade agent behavior through | [evals/README.md](evals/README.md) |
| `grimoires/` | 553 | Home to all grimoire directories for the Loa | [grimoires/README.md](grimoires/README.md) |
| `packages/` | 93 | Upackages | \u2014 |
| `packs/` | 1 | Upacks | \u2014 |
| `scripts/` | 30 | Utility scripts | \u2014 |
| `tests/` | 202 | Test suites | \u2014 |

## Verification
<!-- provenance: CODE-FACTUAL -->
- Trust Level: **L2 — CI Verified**
- 202 test files across 1 suite
- CI/CD: GitHub Actions (12 workflows)
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
- `next`
- `prettier`
- `react`
- `react-dom`
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
head_sha: d8886d4eeba0bb78cacf9fd2387b4cdee35acd6e
generated_at: 2026-03-08T02:22:59Z
generator: butterfreezone-gen v1.0.0
sections:
  agent_context: 641bcdc90a9f0c26d60baa6663d108c59173e891175d85542ca4ee7b8154629b
  capabilities: adf373939ce9b10506f6a776ef7ac3f6b1662864c0adb1f9181d9e0f4f8d4bb7
  architecture: ffdfd8f14e40bdad179aae5c8587b22dc82e36eee2f0d0d1448a561cc5978b35
  interfaces: b6aca6dcb25d75731ce5b1ef817757e785907ca6e7c00503440bd40d50a1fed4
  module_map: f416e9e23e480bfcd2c8c8fa8994034cfb93a237e119621332209afbc07be0a0
  verification: 59ac6fde298eae65daf5282a330aa55a3eb3615c47aff6f1d324c2ab6b7f1947
  agents: ca263d1e05fd123434a21ef574fc8d76b559d22060719640a1f060527ef6a0b6
  ecosystem: 0d998700d4489ca2aec077a69004279a3c45c117b9fb5b37c9f85ad511187c7c
  culture: f73380f93bb4fadf36ccc10d60fc57555914363fc90e4f15b4dc4eb92bd1640f
  quick_start: 15f176d9343ca15a6b32f5134ba0eda33e96f69620f6495734a1f150548e337b
-->
