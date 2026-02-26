# Session Prompt: Construct Lifecycle Architecture & Planning

> Paste this at session start. Read the referenced artifacts before acting.

---

## Context

We completed a deep research cycle on the construct lifecycle (issue #131 on loa-constructs). Five agents researched loa-constructs, midi-interface, hub-interface, mibera-codex, and loa simultaneously. Gemini Deep Research provided cross-platform DX patterns from Roblox, Bun, Stripe, Vercel, Unity, and Shopify. All findings are synthesized in the issue and its 4 comments.

Read these artifacts to ground yourself:

1. `gh issue view 131 --repo 0xHoneyJar/loa-constructs --comments` — The full RFC with research, team feedback, and skill architecture
2. `grimoires/bridgebuilder/gemini-construct-lifecycle-research.md` — Gemini deep research on cross-platform patterns
3. `grimoires/bridgebuilder/ARCHETYPE.md` — The Bridgebuilder archetype (design philosophy)

## What We Know

**The construct lifecycle is one-directional today**: author → seed/sync → DB → explorer → install. No bidirectional sync, no local dev mode, no divergence detection, no version pinning.

**Three construct archetypes exist** but the schema only supports one:
- **Code Packs** (Observer, Artisan, etc.) — markdown skills, no deps. 5 on the network today.
- **Tool Packs** (The Mint, The Cartograph) — skills + Python tools + external API deps. 3 in hub-interface, not on network.
- **Knowledge Bases** (mibera-codex) — 10K+ markdown files, schemas, ontology. No construct type exists.

**Observer fork drift**: midi-interface evolved Observer from 6 skills (registry v1.0.2) to 23 skills locally. A registry update would destroy the 17 local additions. This is the canonical problem we're solving.

**The architecture decision**: Natural language → Skill (SKILL.md) → Shell scripts → API. Construct lifecycle tools ship as a `construct-network-tools` pack via the network. Core bootstrap (`browsing-constructs`) stays in Loa. The `.construct/` shadow directory (gitignored) handles divergence detection via Merkle-tree hashing.

**Team feedback**: ZERGUCCI and jnova want Loa less intrusive in repos. The `.construct/` pattern aligns — tooling state invisible by default. loa#393 tracks the immediate `.ck/` gitignore bug.

## Your Mission

Architect and plan the `construct-network-tools` pack — the Loa skills that power the full construct lifecycle. This is the foundation that makes everything else possible: once agents can link, sync, publish, create, and upgrade constructs through natural language, the infrastructure is locked down and we can surface it in the explorer UI.

### Phase 1: Use TeamCreate to Parallelize

Spawn a team with these roles:

1. **Schema Architect** — Design the manifest evolution (`construct.yaml` v2) that supports all three archetypes (code pack, tool pack, codex). Include: `type`, `capabilities`, `paths`, `events`, `credentials`, `access_layer`, `portability_score`. Ground this in `packages/shared/src/types.ts` and `packages/shared/src/validation.ts`. The three schema layers (JSON Schema, TypeScript, Zod) must stay in sync.

2. **Skill Designer** — Design the 5 new skills: `linking-constructs`, `syncing-constructs`, `publishing-constructs`, `creating-constructs`, `upgrading-constructs`. Each needs a SKILL.md outline (workflow phases, shell script calls, AskUserQuestion interactions, error handling) and index.yaml (triggers, inputs, outputs, zones, capabilities). Follow the pattern from `.claude/skills/browsing-constructs/` in the Loa repo at `/Users/zksoju/Documents/GitHub/loa`.

3. **Infrastructure Planner** — Design the shell scripts and API extensions needed: `constructs-link.sh`, `constructs-diff.sh`, `constructs-publish.sh`, `constructs-create.sh`. Map each to required API endpoints (new or existing). Design the `.construct/` shadow directory structure and `state.json` schema. Design the GitHub webhook auto-configuration for new construct repos.

4. **Migration Planner** — Plan the concrete steps to onboard the 4 unregistered constructs: The Easel (extract from hub-interface → standalone repo), Observer Cognition Layer (upstream 17 skills to construct-observer), The Mint (extract with tool dep declaration), mibera-codex (new codex type + MCP server). Sequence these by readiness and dependency.

### Phase 2: Hook Into Loa Workflow (Truenames)

Once team research completes and you've synthesized findings, proceed through the Loa planning workflow using truenames:

1. **`/plan-and-analyze`** — PRD for the `construct-network-tools` pack. Requirements derived from issue #131, Gemini research, and team findings. Use the Bridgebuilder archetype principles (progressive disclosure, zero-friction, flow state protection).

2. **`/architect`** — SDD covering: manifest schema v2, `.construct/` shadow directory, new shell scripts, API endpoint extensions, skill-to-script wiring, Merkle-tree divergence detection, MCP access layer for codex type.

3. **`/sprint-plan`** — Break into implementable sprints. Suggested sequence:
   - Sprint 1: Schema evolution (manifest v2 types + Zod + JSON Schema) + `.construct/` directory structure + `constructs-link.sh`
   - Sprint 2: `constructs-diff.sh` (divergence detection) + `constructs-publish.sh` (registry publishing) + webhook auto-config
   - Sprint 3: `creating-constructs` skill (scaffold from template) + `upgrading-constructs` skill (3-way merge)
   - Sprint 4: Onboard The Easel + upstream Observer cognition layer + mibera-codex codex type design

4. **`/run sprint-plan`** or **`/run sprint-N`** — Execute when ready.

### Constraints

- All new skills must follow the SKILL.md + index.yaml + shell script pattern (no TypeScript CLI — the TS RegistryClient in loa-registry is deprecated)
- The `browsing-constructs` skill stays in Loa core as the bootstrap. Everything else ships as the `construct-network-tools` pack.
- Schema changes must maintain backward compatibility with existing schema_version 3 manifests
- The `.construct/` directory MUST be gitignored by default (lesson from the stealth mode feedback)
- Security: all new scripts must source `constructs-lib.sh` for path traversal protection, input validation, TLS enforcement
- Construct lifecycle skills should work within Loa's Three-Zone Model: scripts in System Zone, state in `.construct/` (State Zone), no App Zone writes

### Definition of Done

- [ ] `construct.yaml` v2 schema defined (TypeScript + Zod + JSON Schema in sync)
- [ ] 5 new SKILL.md files with complete workflow instructions
- [ ] 5 new index.yaml files with triggers, capabilities, zones
- [ ] Shell script designs for link, diff, publish, create
- [ ] `.construct/state.json` schema defined
- [ ] API endpoint extensions mapped (new routes or modifications to existing)
- [ ] Migration plan for 4 unregistered constructs with concrete steps
- [ ] PRD, SDD, and Sprint Plan produced through Loa truenames
- [ ] All artifacts committed and issue #131 updated with implementation plan
