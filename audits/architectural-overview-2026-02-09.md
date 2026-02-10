# Loa Constructs Network — Architectural Overview

> **Audit Date:** 2026-02-09
> **Audited By:** Claude Opus 4.6 (Lead) + 4 Sonnet Teammates
> **Scope:** loa-constructs monorepo + midi-interface (divergence check)
> **Method:** Read-only exploration with Counterfactual Assessment

---

## 1. Executive Summary

The Loa ecosystem is a **remarkably ambitious attempt to digitize and scale human "Taste"** through a Shared Execution Engine, and significant infrastructure has been built. The Construct Layer is the most mature — 5 packs containing 39 skills with genuine distilled intuition (Observer's cultural context decoder, Artisan's motion philosophy, Crucible's reality extraction model). The framework layer (`.claude/`) is impressively engineered: 53 protocols, ~180 scripts, 23 schemas, 8 CI workflows, and a functional Construct Registry with license enforcement. The **Observer pack stands as the gold standard** for Methodology/Topology separation, demonstrating the base/overlay/compose architecture that all other packs should adopt.

**The most critical structural gap is the complete absence of the Routing Layer (Hounfour) and the incomplete Critique Layer (Bridgebuilder).** The Intuition Stack's three-layer model — Constructs teach, Hounfour routes, Bridgebuilder critiques — is currently a one-layer system. All 25 construct pack skills lack model assignment, danger level, effort hints, and downgrade protection. There is no mechanism to prevent a "Taste" task (Artisan's motion philosophy, styling material) from running on a model incapable of visual nuance. Bridgebuilder v2.1 is merged and operational in midi-interface but has zero presence in loa-constructs, and 3 of 5 packs have no corresponding critique persona.

**The single highest-leverage action is implementing Topology extraction from the Crucible and Beacon packs** using Observer's proven base/overlay/compose pattern, followed by adding capability metadata (model, danger_level, effort_hint, downgrade_allowed) to all 25 construct pack skill index.yaml files. These two actions would make every Construct portable and every routing decision enforceable — unlocking the Hounfour and Bridgebuilder layers when they arrive.

---

## 2. The Intuition Stack — Current State Map

```
┌──────────────────────────────────────────────────────────────────┐
│  CRITIQUE LAYER (Bridgebuilder)                                  │
│  Status: MISSING (in loa-constructs) / IMPLEMENTED (midi-iface)  │
│  Personas: 5 (+1 legacy)    Precedence Levels Active: 5/5       │
│  Coverage: 2/5 packs (Crucible, partial Artisan)                 │
│  Taste Loop: NOT IMPLEMENTED                                     │
├──────────────────────────────────────────────────────────────────┤
│  ROUTING LAYER (Hounfour)                                        │
│  Status: MISSING (no implementation, no RFC, no config)          │
│  Agents Defined: 0    Downgrade Protected: 0/25 pack skills     │
│  Model Declared: 0/25 pack skills, 14/18 framework skills       │
│  Extended Thinking: 4 skills only                                │
├──────────────────────────────────────────────────────────────────┤
│  CONSTRUCT LAYER (Packs)                                         │
│  Status: IMPLEMENTED (mature)                                    │
│  Packs: Artisan(10/14), Crucible(5), Observer(6),                │
│          Beacon(6, sandbox), GTM-Collective(8, sandbox)          │
│  Distillation: Artisan=HIGH, Observer=HIGH, Crucible=MED,        │
│                Beacon=MED, GTM=HIGH, Framework=HIGH              │
└──────────────────────────────────────────────────────────────────┘
```

**Key:**
- Artisan shows 10/14 because 4 skills (analyzing-feedback, decomposing-feel, envisioning-direction, iterating-visuals) exist in `apps/sandbox/` but are NOT installed in `.claude/constructs/`.
- Beacon and GTM-Collective exist only in `apps/sandbox/packs/`, not installed.

---

## 3. Topology Contamination Report

### Category Errors (Fundamentally Breaks Portability)

| # | File | Line(s) | Contamination | Fix |
|---|------|---------|---------------|-----|
| 1 | `.claude/constructs/packs/crucible/skills/validating-journeys/SKILL.md` | 102-103, 459-460, 476 | Hardcoded wallet addresses `0x79092A...`, `0xdA075...` | Context slot: `{file:./contexts/qa-fixtures.json}` |
| 2 | `.claude/constructs/packs/crucible/skills/validating-journeys/SKILL.md` | 110, 468 | `http://localhost:3003` hardcoded | `{env:DEV_URL}` or `{context:dev_url}` |
| 3 | `.claude/constructs/packs/crucible/skills/walking-through/SKILL.md` | 133 | `http://localhost:3003` hardcoded | Same as above |
| 4 | `.claude/constructs/packs/crucible/skills/validating-journeys/SKILL.md` | 100, 114, 455 | `apps/web/components/qa-cli.tsx` path reference | `{context:qa_component_path}` |
| 5 | `.claude/constructs/packs/crucible/skills/walking-through/SKILL.md` | 140 | `sf-qa-effective-address` localStorage key | `{context:qa_storage_key}` |
| 6 | `apps/sandbox/packs/beacon/skills/accepting-payments/SKILL.md` | 175-176 | `eip155:80094` (Berachain Mainnet) as default | `{context:network_id}` |
| 7 | `apps/sandbox/packs/beacon/skills/accepting-payments/SKILL.md` | 196-198 | `https://x402.org/facilitator` hardcoded | `{context:facilitator_url}` |
| 8 | `apps/sandbox/packs/beacon/skills/discovering-endpoints/SKILL.md` | 66, 81 | `eip155:80094` + `0xHoneyJar` in code examples | `{context:network_id}` + `{context:org_name}` |
| 9 | `apps/sandbox/packs/beacon/skills/discovering-endpoints/resources/templates/well-known-route.ts.md` | 32, 72, 121, 155, 163 | `eip155:80094`, `0xHoneyJar`, `Berachain` throughout template | Template vars: `{{NETWORK_ID}}`, `{{ORG_NAME}}`, `{{CHAIN_NAME}}` |
| 10 | `apps/sandbox/packs/beacon/skills/accepting-payments/resources/templates/middleware.ts.md` | 26-27 | `eip155:80094` + `BERA` as constants | `{{NETWORK_ID}}`, `{{DEFAULT_TOKEN}}` |

### Near Misses (Works But Couples to One Repo)

| # | File | Line(s) | Contamination | Fix |
|---|------|---------|---------------|-----|
| 11 | `.claude/constructs/packs/observer/contexts/overlays/berachain-overlay.md` | entire file | Berachain overlay shipped as the ONLY overlay | Correct architecture, but should be a separate installable context |
| 12 | `.claude/constructs/packs/observer/skills/observing-users/cultural-context.md` | 1, 14, 60 | Title "Berachain/Crypto" couples cultural context to one chain | Generic "crypto-base" + chain overlay |
| 13 | `.claude/constructs/packs/observer/scripts/compose-context.sh` | 16 | Default overlay `berachain,defi` hardcoded | Read from manifest.json `contexts` or env var |
| 14 | `.claude/constructs/packs/observer/skills/observing-users/SKILL.md` | 39 | Example uses `@papa-flavio "planning henlo burns"` | Generic placeholder or "Example for Berachain" header |
| 15 | `.claude/constructs/packs/observer/skills/level-3-diagnostic/SKILL.md` | 259, 262 | "Automated yield platform for Berachain PoL" + "Henlocker (HLKD) vaults" | Product context from context slot |
| 16 | `.claude/constructs/packs/observer/skills/observing-users/examples/complete-diagnostic.md` | 9, 34, 45+ | "henlo burns", "papa-flavio" throughout | Acceptable as example, needs "Berachain Example" header |
| 17 | `.claude/constructs/packs/crucible/skills/walking-through/SKILL.md` | 385 | `migrated+v1`, `V1 locker` state names | Product-specific states in context file |
| 18 | ALL `.claude/skills/*/resources/BIBLIOGRAPHY.md` | Throughout | `https://github.com/0xHoneyJar/loa/...` and `thj-meta-knowledge/...` | `{context:upstream_repo}` |
| 19 | `.claude/skills/continuous-learning/SKILL.md` | 425 | `target_repo: "0xHoneyJar/loa"` | `{context:upstream_repo}` |
| 20 | `.claude/skills/mounting-framework/SKILL.md` | 54 | `https://github.com/0xHoneyJar/loa.git` (has env fallback) | Already partial — promote `$LOA_UPSTREAM` as required |
| 21 | `.claude/skills/browsing-constructs/SKILL.md` | 299 | `loa-constructs#93` issue reference | `{context:constructs_repo}` |
| 22 | ALL pack manifests | author field | `"author": "0xHoneyJar"` | Correct for attribution but forks carry wrong author |

### Beacon Pack: Systematic Contamination

The entire Beacon pack is a **topology monolith**. Every SKILL.md, template, and index.yaml references `BERA`, `eip155:80094`, and `0xHoneyJar`. The methodology (x402 protocol, AI content auditing, endpoint discovery) is portable and valuable, but inseparable from Berachain topology without a refactor. This pack requires the most work.

---

## 4. Counterfactual Coverage Assessment

| Construct | Positive Examples | Near Miss Examples | Category Errors | Temperature | Gap |
|-----------|:-:|:-:|:-:|:-:|-----|
| **Artisan — animating-motion** | ✅ | ✅ | ❌ | **HIGH** | Missing "Category Error" examples (e.g., "Never use CSS transitions for physics-based motion") |
| **Artisan — inscribing-taste** | ✅ | Partial | ❌ | MEDIUM | Needs explicit near-miss examples (e.g., using correct tokens but wrong semantic scale) |
| **Artisan — surveying-patterns** | ✅ | ✅ | ❌ | **HIGH** | Enforces Tailwind/Radix/motion but no category error examples |
| **Artisan — styling-material** | ✅ | Partial | ❌ | MEDIUM | Has prescriptive rules but no "seductively wrong" anti-patterns |
| **Artisan — other (6 skills)** | ✅ | Partial | ❌ | MEDIUM | Consistent pattern: good positive examples, partial anti-patterns, no category errors |
| **Crucible — validating-journeys** | ✅ | ❌ | ❌ | MEDIUM | Missing "Near Miss" (e.g., Cypress-style assertions that look right but break) |
| **Crucible — walking-through** | ✅ | ❌ | ❌ | LOW-MED | Mostly binary rules, no nuance about when to deviate |
| **Crucible — other (3 skills)** | ✅ | ❌ | ❌ | LOW-MED | Formulaic methodology without error distribution |
| **Observer — observing-users** | ✅ | ✅ | ✅ | **HIGH** | **Gold standard** — "Wrong Interpretation" vs "Correct Stance" table |
| **Observer — analyzing-gaps** | ✅ | Partial | ❌ | MEDIUM | Has type indicators but no counterfactual analysis |
| **Observer — other (4 skills)** | ✅ | ❌ | ❌ | LOW-MED | Follow the pattern of Observer without the cultural context richness |
| **Beacon — accepting-payments** | ✅ | ✅ | ❌ | MEDIUM | "Never store private keys" but no category error framing |
| **Beacon — other (5 skills)** | ✅ | Partial | ❌ | MEDIUM | Consistent but topology-contaminated examples |
| **GTM-Collective — analyzing-market** | ✅ | ✅ | ❌ | **HIGH** | Grounded vs ungrounded examples with `[ASSUMPTION]` prefix |
| **GTM-Collective — pricing-strategist** | ✅ | ✅ | ❌ | **HIGH** | Competitive anchoring anti-patterns documented |
| **GTM-Collective — other (6 skills)** | ✅ | Partial | ❌ | MEDIUM | Consistent factual grounding requirement |
| **Framework — implementing-tasks** | ✅ | ✅ | ✅ | **HIGH** | Karpathy principles + file creation safety (DANGEROUS heredoc example) |
| **Framework — deploying-infrastructure** | ✅ | ✅ | ✅ | **HIGH** | "Cannot Deploy If" blocking conditions are true category errors |
| **Framework — auditing-security** | ✅ | N/A | N/A | MEDIUM | Rubric-based, not counterfactual |

**Key Finding:** Only 3 constructs demonstrate full **Category Error** documentation: `observing-users` (cultural context), `implementing-tasks` (file safety), and `deploying-infrastructure` (blocking conditions). The rest stop at "Near Miss" level at best. To raise the overall "distillation temperature," every Construct needs at least one Category Error example per domain.

---

## 5. Routing Vulnerability Matrix

**All 25 construct pack skills are completely unprotected.** No model assignment, no danger level, no effort hint, no downgrade protection.

### Critical "Taste" Tasks at Risk

| Skill | Pack | What It Does | Risk If Downgraded | Severity |
|-------|------|-------------|-------------------|----------|
| `inscribing-taste` | Artisan | Brand taste token synthesis | Hallucinated tokens, wrong semantic scale | **CRITICAL** |
| `synthesizing-taste` | Artisan | Extract brand patterns from references | Incorrect pattern extraction | **CRITICAL** |
| `animating-motion` | Artisan | Motion design decisions | Wrong easing/duration, broken animations | **HIGH** |
| `crafting-physics` | Artisan | UI physics timing | Incorrect sync strategies for interactions | **HIGH** |
| `styling-material` | Artisan | CSS/typography/dark mode | Hallucinated CSS classes, wrong rendering | **HIGH** |
| `surveying-patterns` | Artisan | Pattern violation detection | Missed violations, "interface slop" undetected | **HIGH** |
| `rams` | Artisan | WCAG accessibility audit | Missed WCAG violations — **compliance risk** | **HIGH** |
| `distilling-components` | Artisan | Component API design | Wrong composition patterns, broken APIs | **HIGH** |
| `applying-behavior` | Artisan | Touch/keyboard interactions | Inaccessible interaction code | **HIGH** |
| `next-best-practices` | Artisan | Next.js performance patterns | Incorrect rendering/fetching advice | MEDIUM |

### Deep Reasoning Gaps

Tasks requiring multi-step reasoning but lacking `extended_thinking` enablement:

| Skill | Why It Needs Deep Reasoning | Currently Enabled? |
|-------|---------------------------|-------------------|
| `implementing-tasks` | Multi-file refactoring, root cause debugging | **NO** |
| `riding-codebase` | Cross-file pattern extraction, three-way drift analysis | **NO** |
| `deploying-infrastructure` | Infrastructure dependency graphs, security decisions | **NO** |
| `autonomous-agent` | Meta-orchestration, quality gate evaluation | **NO** |
| `simstim-workflow` | Full-cycle orchestration with Flatline integration | **NO** |

### Schema Gap

The `thinking_traces` capability field referenced in CLAUDE.md documentation **does not exist** in any index.yaml. The concept is documented but not implemented in the skill schema.

### Danger Level Drift

| Skill | CLAUDE.md Says | index.yaml Says | Issue |
|-------|---------------|-----------------|-------|
| `browsing-constructs` | safe | NOT DECLARED | Missing declaration |
| `finding-constructs` | NOT LISTED | NOT DECLARED | Missing from both |
| All 25 pack skills | NOT LISTED | NOT DECLARED | Entire construct layer invisible to guardrails |

---

## 6. Critique Layer Gaps

### Persona Coverage by Pack

| Pack | Skills | Bridgebuilder Persona | Coverage | Blind Spot |
|------|--------|----------------------|----------|------------|
| **Artisan** (10) | Taste, motion, styling, components | `default` (Quality), `architecture` (patterns) | **Partial** | No persona tuned for aesthetic/taste enforcement |
| **Crucible** (5) | Testing, state diagrams, reality extraction | `security`, `default` | **Adequate** | Well-covered |
| **Observer** (6) | User research, cultural context, gap analysis | None | **GAP** | No persona critiques research methodology quality |
| **Beacon** (6) | Payments, content audit, endpoints, docs | `dx` (partial) | **Partial** | No persona for communication/narrative quality |
| **GTM-Collective** (8) | Market analysis, pricing, positioning, devrel | None | **GAP** | No persona critiques business/GTM deliverables |

### Missing Personas Needed

1. **`taste.md`** — Critiques Artisan output for aesthetic fidelity, design token correctness, motion philosophy adherence. Should enforce the Counterfactual Method: "Is this the Target, a Near Miss, or a Category Error?"
2. **`research.md`** — Critiques Observer output for methodology rigor (Mom Test compliance, confidence calibration, hypothesis-first framing). Detects when conclusions are drawn from single canvases.
3. **`strategy.md`** — Critiques GTM-Collective output for factual grounding, competitive analysis rigor, pricing model validity. Detects `[ASSUMPTION]` violations.

### The Missing Taste Loop

**This is the most significant architectural gap in the entire system.**

The vision: Bridgebuilder critiques → feed back → refine Construct persona.md files → improved "intuition" → better output → better critiques → virtuous cycle.

The reality:
- Bridgebuilder posts reviews to GitHub PRs and outputs JSON summaries
- **No pipeline reads those summaries and proposes persona.md refinements**
- No event-driven connection between critique output and construct refinement
- The `grimoires/bridgebuilder/` directory (repo-level persona overrides) does not exist in either repo
- Learnings are captured via retrospective (to `NOTES.md`) and upstream scoring, but these operate at the **sprint/implementation level**, not the **construct refinement level**

### Bridgebuilder Distribution

Bridgebuilder v2.1 is merged and operational **only in midi-interface**. It has zero presence in loa-constructs. There is no mechanism to distribute it — it would need to be either:
1. Extracted as a standalone CLI tool
2. Published to the Constructs Registry as a pack
3. Manually copied to each consuming repo

---

## 7. Ecosystem Health

### Repository Structure

| Category | Health | Notes |
|----------|--------|-------|
| Directory organization | **Good** | Clear Three-Zone Model enforcement |
| Pack dual-location | **Problem** | Packs in both `.claude/constructs/` (v1 schema, stale) and `apps/sandbox/` (v2 schema, canonical). 4 Artisan skills missing from installed copy. |
| Orphaned files | **Minor** | `/api/` (legacy), `fly.toml` (legacy), `default.profraw` (build artifact), `.codex/` + `.opencode/` (unclear status) |
| CI/CD | **Strong** | 8 workflows covering validation, security, linting, shell compat, secret scanning |
| CLAUDE.md alignment | **Good** | Properly imports framework, references correct Skills/Subagents |

### Melange Protocol

| Aspect | Status |
|--------|--------|
| Version | v0.8 (lightweight GitHub Issues + Discord webhooks) |
| `/send`, `/inbox`, `/threads` | **NOT IMPLEMENTED** — no commands found |
| Peer messaging | GitHub Issues with structured labels only |
| Discord integration | Webhook notifications for `melange`-labeled issues |
| Resolution tracking | Automated via PR comment detection |
| Melange v2 | **NOT MERGED** — spec archives exist but no implementation |
| Operator map | Only 3 entries: `loa`, `sigil`, `loa-constructs` |
| Real-time messaging | Not available — async issue-based only |

### Upstream Learning Pipeline

| Stage | Status | Implementation |
|-------|--------|---------------|
| Observation capture | **Partial** | Memory hooks exist, `grimoires/loa/memory/` empty, no `observations.jsonl` generated |
| Retrospective learning | **Implemented** | Invisible retrospective (v1.19.0) captures learnings silently after skills |
| Quality gates | **Implemented** | 4 gates: Depth, Reusability, Trigger Clarity, Verification |
| Upstream scoring | **Implemented** | Weighted: Quality 25%, Effectiveness 30%, Novelty 25%, Generality 20%. Threshold: score≥70, apps≥3, success≥80% |
| Proposal generation | **Implemented** | `proposal-generator.sh`, `anonymize-proposal.sh` |
| Proposal review | **Implemented** | `check-proposal-status.sh`, `flatline-proposal-review.sh` |
| Two-Tier design | **Designed** | Full PRD+SDD+Sprint in `docs/proposals/two-tier-learnings-*` |
| Mother Loa PR/merge | **NOT IMPLEMENTED** | `/propose-learning` command exists but automated upstream PR not operational |
| RICE scoring | **NOT FOUND** | Replaced by 4-component weighted scoring |
| Event schema (upstream-event-v1) | **NOT FOUND** | No explicit event schema in use |

### MCP Configuration

| Aspect | Status |
|--------|--------|
| Registry | 7 servers defined in `.claude/mcp-registry.yaml` |
| Level | Network-level (correct — NOT pack-level) |
| CI validation | `validate-mcp-deps.sh` in pipeline |
| Server groups | 7 groups: essential, deployment, crypto, communication, productivity, visual-feedback, all |

### midi-interface Divergence

midi-interface has evolved **significantly beyond** loa-constructs:
- Observer: 15 skills (vs 6) — added batch ops, staleness detection, drift detection, daily synthesis, DM ingestion
- Framework: `synthesizing-feedback`, `bridgebuilder-review`, `rtfm-testing` (unique)
- GTM-Collective: installed in `.claude/constructs/` (only in `apps/sandbox/` in loa-constructs)
- Beacon: installed in `.claude/constructs/` (only in `apps/sandbox/` in loa-constructs)

**No synchronization mechanism** exists between the two repos. midi-interface appears to be the more evolved deployment while loa-constructs holds the canonical source that has fallen behind.

---

## 8. Prioritized Roadmap

Ordered by leverage (highest impact on "Taste" enforcement first):

### Tier 1: Foundation Fixes (Highest Leverage)

**1. Add capability metadata to all 25 construct pack skill index.yaml files**
- **Why highest priority:** Without `model`, `danger_level`, `effort_hint`, and `downgrade_allowed`, the entire Construct Layer is invisible to any future routing or guardrail system. Every Artisan taste-critical skill can silently degrade.
- **Effort:** Small — add 4 fields to 25 files.
- **Layer:** Routing (enables Hounfour when it arrives).
- **Recommendation:**
  - Artisan skills: `model: sonnet`, `danger_level: moderate`, `effort_hint: medium`, `downgrade_allowed: false`
  - Crucible skills: `model: sonnet`, `danger_level: moderate`, `effort_hint: medium`
  - Observer skills: `model: sonnet`, `danger_level: moderate`, `effort_hint: medium`
  - Beacon/GTM: same pattern, tuned per skill

**2. Extract Topology from Crucible pack (wallet addresses, URLs, paths)**
- **Why:** 5 Category Errors in a single pack. Every deployment of Crucible to a non-Berachain project is broken on install.
- **Effort:** Medium — create `contexts/qa-fixtures.json`, refactor 2 SKILL.md files to use context slots.
- **Layer:** Construct (portability).

**3. Extract Topology from Beacon pack (network IDs, org names, chain references)**
- **Why:** The entire pack is a topology monolith. The x402 methodology is valuable and portable, but currently fused to Berachain.
- **Effort:** Large — every SKILL.md + every template needs refactoring. Create `contexts/chain-config.json`.
- **Layer:** Construct (portability).

### Tier 2: Immune System Activation

**4. Create 3 missing Bridgebuilder personas: `taste.md`, `research.md`, `strategy.md`**
- **Why:** 3 of 5 packs have blind spots in the critique layer. Observer and GTM-Collective outputs are never adversarially reviewed.
- **Effort:** Medium — follow the pattern established by `security.md` and `dx.md`.
- **Layer:** Critique.

**5. Implement the Taste Loop (critique → construct refinement pipeline)**
- **Why:** This is the "immune system upgrade" — corrections from Bridgebuilder should fine-tune Construct persona files, creating a virtuous learning cycle.
- **Effort:** Large — requires new event pipeline: Bridgebuilder JSON output → parser → persona.md proposal → review → merge.
- **Layer:** Critique + Construct (cross-layer).

**6. Distribute Bridgebuilder to loa-constructs**
- **Why:** The critique layer exists only in midi-interface. loa-constructs has no adversarial review capability.
- **Effort:** Medium — either publish as a Construct pack or extract as standalone CLI.
- **Layer:** Critique.

### Tier 3: Routing Layer Bootstrap

**7. Write the Hounfour RFC**
- **Why:** The routing layer has no implementation, no RFC, no configuration. Without a formal design, capability enforcement is impossible.
- **Effort:** Medium — RFC document defining: capability matrices, model routing rules, downgrade policies, provider constraints.
- **Layer:** Routing.

**8. Add `extended_thinking` to reasoning-heavy skills**
- **Why:** `implementing-tasks`, `riding-codebase`, `deploying-infrastructure`, `autonomous-agent`, and `simstim-workflow` all require multi-step reasoning but lack extended thinking enablement.
- **Effort:** Small — add 5 entries to `.loa.config.yaml` `extended_thinking.enabled_agents`.
- **Layer:** Routing.

**9. Implement `thinking_traces` and `native_runtime` in skill schema**
- **Why:** CLAUDE.md documents these capability requirements but the schema doesn't implement them. Drift between documentation and reality.
- **Effort:** Small-Medium — extend index.yaml schema, update Zod validation.
- **Layer:** Routing.

### Tier 4: Ecosystem Coherence

**10. Resolve the dual-location pack problem**
- **Why:** Packs exist in both `.claude/constructs/` (v1, stale) and `apps/sandbox/` (v2, canonical). Artisan has 10 installed skills but 14 in sandbox. This creates confusion about source of truth.
- **Effort:** Medium — decide: is `.claude/constructs/` a read-only install target populated by the registry? If so, re-install from sandbox to sync.
- **Layer:** Ecosystem.

**11. Sync loa-constructs and midi-interface**
- **Why:** midi-interface has 9 additional Observer skills, 3 additional framework skills, and different pack installations. No sync mechanism exists.
- **Effort:** Large — requires deciding which direction learnings flow and building a sync protocol.
- **Layer:** Ecosystem.

**12. Complete the upstream learning pipeline (Mother Loa PR automation)**
- **Why:** Scoring infrastructure is built but the end-to-end flow (propose → PR → review → merge to template) is not operational.
- **Effort:** Large — automate `gh pr create` from proposal output with anonymization.
- **Layer:** Ecosystem.

**13. Advance Melange to v2 (real-time peer messaging)**
- **Why:** Current v0.8 is GitHub Issues + Discord webhooks — async and heavyweight. The SDD envisions real-time messaging.
- **Effort:** Very Large — full protocol implementation.
- **Layer:** Ecosystem.

---

## 9. The Methodology/Topology Refactor Plan

### Architecture: The Observer Pattern

The Observer pack demonstrates the correct architecture. Every other pack should adopt it:

```
pack/
  contexts/
    base/               # Universal methodology context
      crypto-base.md    # Domain-generic crypto cultural context
    overlays/           # Topology-specific overlays (installable)
      berachain-overlay.md
      ethereum-overlay.md
    composed/           # Runtime-composed output (gitignored)
  scripts/
    compose-context.sh  # Merges base + selected overlays
  manifest.json         # Declares available contexts
  skills/
    skill-name/
      SKILL.md          # Pure methodology — ZERO topology references
      index.yaml        # Metadata including context requirements
```

### Refactor Plan: Crucible Pack

**Before** (`validating-journeys/SKILL.md:100-114`):
```markdown
## QA Fixtures
| Fixture    | Address                                      |
|------------|----------------------------------------------|
| rewards-ready | 0x79092A805f1cf9B0F5bE3c5A296De6e51c1DEd34 |
| new-user   | 0xdA0758706E9E488bc6c7Ea487FFe48c415718e95     |

Base URL: http://localhost:3003
QA Component: apps/web/components/qa-cli.tsx
```

**After** (`validating-journeys/SKILL.md:100-114`):
```markdown
## QA Fixtures

Load fixtures from the project's QA context:

{file:./contexts/qa-fixtures.json}

Fields required: `fixtures` (map of fixture-name → wallet address), `base_url`, `qa_component_path`, `qa_storage_key`.

If no context file exists, prompt the user to create one:
> No QA fixtures found. Create `./contexts/qa-fixtures.json` with your test wallet addresses and dev URL.
```

**New file** (`crucible/contexts/qa-fixtures.json.example`):
```json
{
  "fixtures": {
    "rewards-ready": "0xYOUR_REWARDS_WALLET",
    "new-user": "0xYOUR_NEW_USER_WALLET"
  },
  "base_url": "http://localhost:3000",
  "qa_component_path": "src/components/qa-cli.tsx",
  "qa_storage_key": "qa-effective-address"
}
```

### Refactor Plan: Beacon Pack

**Before** (`accepting-payments/SKILL.md`):
```markdown
Default network: eip155:80094 (Berachain Mainnet)
Facilitator: https://x402.org/facilitator
```

**After** (`accepting-payments/SKILL.md`):
```markdown
## Network Configuration

Load chain configuration from project context:

{file:./contexts/chain-config.json}

Fields required: `network_id`, `chain_name`, `default_token`, `facilitator_url`.
```

**New file** (`beacon/contexts/chain-config.json.example`):
```json
{
  "network_id": "eip155:1",
  "chain_name": "Ethereum Mainnet",
  "default_token": "ETH",
  "facilitator_url": "https://x402.org/facilitator",
  "org_name": "YourOrg"
}
```

**Template refactor** (`well-known-route.ts.md`):
Replace all instances of:
- `eip155:80094` → `{{NETWORK_ID}}`
- `0xHoneyJar` → `{{ORG_NAME}}`
- `Berachain` → `{{CHAIN_NAME}}`
- `BERA` → `{{DEFAULT_TOKEN}}`

### Context Slot Interface Standard

Every pack manifest should declare its context requirements:

```json
{
  "contexts": {
    "base": ["crypto-base"],
    "overlays_dir": "contexts/overlays",
    "composed_dir": "contexts/composed",
    "required_slots": [
      { "name": "network_id", "type": "string", "description": "EIP-155 chain identifier" },
      { "name": "org_name", "type": "string", "description": "Organization name for branding" }
    ],
    "optional_slots": [
      { "name": "facilitator_url", "type": "url", "default": "https://x402.org/facilitator" }
    ]
  }
}
```

This allows the registry to validate at install time: "Does this repo provide the required context slots for this pack?"

---

## Appendix A: Cross-Construct Consistency Issues

| Issue | Details | Impact |
|-------|---------|--------|
| Schema version mismatch | `.claude/constructs/` = v1, `apps/sandbox/` = v2 | Confusion about source of truth |
| No standard persona format | GTM uses `<persona>` XML, deploying-infra uses prose, Observer has none | Inconsistent instruction patterns |
| No standard resource structure | Framework: `resources/BIBLIOGRAPHY.md`, packs: ad hoc | Discovery friction |
| Command namespace collision | Beacon uses `beacon-` prefix, others don't | No namespace convention |
| Output path inconsistency | Observer → `grimoires/observer/`, GTM → `gtm-grimoire/` | Not `grimoires/{pack}/` uniformly |
| Missing READMEs | Artisan and Crucible (installed) lack README.md | Onboarding friction |

## Appendix B: Files Audited

This audit read and analyzed:
- 25 construct pack SKILL.md files (across `.claude/constructs/` and `apps/sandbox/`)
- 18 framework skill SKILL.md + index.yaml files
- 5 pack manifest.json files
- `.loa.config.yaml` (59KB)
- `.claude/loa/CLAUDE.loa.md` (19.5KB)
- All CLAUDE.md files (root, sandbox, midi-interface)
- `.claude/mcp-registry.yaml`
- 8 GitHub workflow files
- `.github/CODEOWNERS`
- 6 Bridgebuilder persona files (midi-interface)
- `grimoires/loa/NOTES.md`
- Multiple protocol, template, and configuration files
- midi-interface construct definitions for divergence analysis

## Appendix C: Systemic Grimoire Path Hardcoding

The routing-auditor's supplementary analysis revealed that **15 of 21 pack skills (71%)** hardcode `grimoires/{pack}/` paths directly in their SKILL.md instructions. While `.loa.config.yaml` supports configurable `paths.grimoire`, no SKILL.md references the configured path — they all assume the default. This means changing `paths.grimoire` in config **breaks every skill instruction silently**.

### Affected Skills (by pack)

| Pack | Skill | Hardcoded Paths |
|------|-------|----------------|
| Artisan | `inscribing-taste` | `grimoires/taste.md`, `contexts/taste/taste.md` |
| Artisan | `synthesizing-taste` | `grimoires/taste.md` |
| Observer | `observing-users` | `grimoires/observer/canvas/`, `grimoires/artisan/observations/`, `grimoires/observer/state.yaml` |
| Observer | `shaping-journeys` | `grimoires/observer/canvas/*.md`, `grimoires/observer/state.yaml` |
| Observer | `filing-gaps` | `grimoires/crucible/gaps/` |
| Observer | `analyzing-gaps` | `grimoires/observer/journeys/`, `grimoires/observer/canvas/`, `grimoires/crucible/gaps/` |
| Observer | `importing-research` | `grimoires/pub/research/users/*.md` → `grimoires/observer/canvas/*.md` |
| Observer | `level-3-diagnostic` | `grimoires/artisan/observations/user-insights.md` |
| Crucible | `grounding-code` | `grimoires/crucible/reality/`, `grimoires/crucible/state.yaml` |
| Crucible | `diagramming-states` | `grimoires/observer/journeys/`, `grimoires/crucible/diagrams/`, `grimoires/crucible/state.yaml` |
| Crucible | `validating-journeys` | `grimoires/crucible/diagrams/`, `grimoires/crucible/tests/`, `grimoires/crucible/results/` |
| Crucible | `walking-through` | `grimoires/observer/journeys/`, `grimoires/crucible/walkthroughs/` |
| Crucible | `iterating-feedback` | `grimoires/crucible/results/`, `grimoires/observer/journeys/`, `grimoires/crucible/refinements/` |

**Recommendation**: Introduce a `{grimoire_dir}` context variable that resolves from `.loa.config.yaml` `paths.grimoire`, and replace all hardcoded `grimoires/` prefixes in SKILL.md files. Alternatively, accept this as a documented limitation and enforce `grimoires/` as the canonical, non-configurable default.

## Appendix D: Distillation Temperature Ratings

A "distillation temperature" measures how much project-specific knowledge is baked into a skill vs. pure transferable methodology. Lower = more portable.

| Rating | Range | Meaning |
|--------|-------|---------|
| COLD | 0.0-0.2 | Pure methodology, immediately portable |
| COOL | 0.2-0.4 | Methodology with minor stack assumptions |
| WARM | 0.4-0.6 | Methodology with significant stack lock-in |
| HOT | 0.6-0.8 | Contains product-specific knowledge |
| BURNING | 0.8-1.0 | Deeply embedded product specifics |

### Artisan Pack

| Skill | Temperature | Rationale |
|-------|-------------|-----------|
| `animating-motion` | COLD (0.1) | Pure motion design methodology |
| `applying-behavior` | COLD (0.1) | Universal interaction patterns |
| `rams` | COLD (0.1) | Universal WCAG methodology |
| `distilling-components` | COOL (0.2) | React-specific but transferable |
| `styling-material` | COOL (0.2) | Assumes Tailwind/Next.js but techniques universal |
| `synthesizing-taste` | COOL (0.2) | Generic extraction methodology |
| `inscribing-taste` | COOL (0.3) | Hardcoded taste.md path |
| `next-best-practices` | COOL (0.3) | Next.js-specific but well-structured |
| `surveying-patterns` | WARM (0.4) | Stack-locked to Tailwind + motion/react + Base UI |
| `crafting-physics` | WARM (0.4) | Good methodology but crypto keywords embedded |

### Observer Pack

| Skill | Temperature | Rationale |
|-------|-------------|-----------|
| `observing-users` | WARM (0.4) | Good methodology, hardcoded grimoire paths |
| `shaping-journeys` | WARM (0.4) | Good methodology, hardcoded grimoire paths |
| `filing-gaps` | WARM (0.5) | Hardcoded paths + taxonomy labels |
| `analyzing-gaps` | WARM (0.5) | Multiple hardcoded paths, cross-pack coupling |
| `importing-research` | WARM (0.5) | Migration-specific paths, crypto signal patterns |
| `level-3-diagnostic` | HOT (0.7) | Product names embedded (Set & Forgetti, Berachain, HLKD) |

### Crucible Pack

| Skill | Temperature | Rationale |
|-------|-------------|-----------|
| `grounding-code` | COOL (0.3) | Generic extraction, hardcoded output path |
| `diagramming-states` | COOL (0.3) | Generic Mermaid methodology, hardcoded paths |
| `iterating-feedback` | WARM (0.4) | Generic feedback loop, locked to grimoire structure |
| `validating-journeys` | HOT (0.7) | Hardcoded wallet addresses, QA fixtures, localhost |
| `walking-through` | HOT (0.7) | Same fixtures, agent-browser dependency |

### Auxiliary Files

| File | Temperature | Quality |
|------|-------------|---------|
| `conversation-frameworks.md` | COLD (0.1) | Pure Mom Test methodology, fully portable |
| `diagnostic-conversation.md` | COLD (0.1) | Pure methodology template |
| `insights-log.md` | COLD (0.1) | Generic tracking template |
| `canvas-template.md` | COLD (0.1) | Generic with placeholders |
| `crypto-base.md` | COOL (0.2) | Well-designed composable base |
| `cultural-context.md` | WARM (0.5) | Nuanced but crypto-specific |
| `complete-diagnostic.md` | HOT (0.7) | Product-specific example |
| `berachain-overlay.md` | BURNING (0.9) | By design — chain-specific |

### Summary Statistics

| Metric | Value |
|--------|-------|
| Skills with topology contamination | 15/21 (71%) |
| Skills with product-specific content | 4/21 (19%) |
| Skills COLD (immediately portable) | 5/21 (24%) |
| Skills COOL (minor assumptions) | 7/21 (33%) |
| Skills WARM (stack lock-in) | 6/21 (29%) |
| Skills HOT/BURNING (product-bound) | 3/21 (14%) |
| Skills with GOOD counterfactual coverage | 9/21 (43%) |
| Skills with zero category-error examples | 21/21 (100%) |
| Cross-pack dependencies (implicit) | 5 |
| Cross-pack dependencies (declared) | 0 |

---

*Generated by Loa Audit Team — 2026-02-09*
*Lead: Claude Opus 4.6 | Teammates: 4× Claude Sonnet (construct-auditor, routing-auditor, critique-auditor, ecosystem-auditor)*
