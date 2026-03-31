# Construct Ecosystem Audit — 2026-03-31

> gecko walked every stall. four researchers read every SKILL.md, every construct.yaml, every project repo.
> this is what the bazaar looks like today, and what it needs to become.

**Scope**: 18 public constructs, ~130 skills, 6 product repos
**Method**: 4 parallel research agents (design, protocol, analytics, project-learnings)
**Purpose**: Ground descriptions in builder vocabulary, extract project learnings, identify improvement opportunities

---

## Executive Summary

the constructs are real. the expertise is grounded. but the packaging is for us, not for builders. someone searching "how to verify my dApp against deployed contracts" won't find Protocol because we described it as "reads the chain so your users don't hit reverts." someone looking for "user research pipeline" won't find Observer because we called it "builds the hive so the colony can thrive."

**three systemic issues:**
1. **language gap** — poetic descriptions mask capability. builders search in their vocabulary (wagmi, Foundry, design tokens, user research), not ours.
2. **pattern-domain gap** — constructs are problem-domain (feel, feedback, verification) but builders need pattern-domain guidance (transaction lifecycle, async job patterns, indexer setup, observability).
3. **cross-construct silos** — observer, k-hole, herald, gecko all produce intelligence but don't feed each other. no data flow between them.

**what's mature and ready:**
- Artisan (14 skills, all battle-tested, description already clear)
- The Arcade (6 skills, strong composition, clear language)
- Protocol (10 skills, builder-accessible, strong web3 coverage)
- The Mint (8 skills, production-proven via purupuru + honeygpt)
- The Speakers (8 skills, all solid, clear technical grounding)

**what needs work:**
- Observer (24 skills — 6 are orchestrator shims, description opaque)
- K-Hole (description insider-only, resonance profiles underdocumented)
- Kansei (description vague, shaders aspirational)
- Vocabulary Bank (under-marketed, jargon-heavy description)
- Hardening (audit-* skills too generic, needs web3-specific hardening)
- Beacon (x402 too speculative for headline, name too esoteric)
- WebGL Particles (manifest v1, needs schema migration)

---

## Part 1: Description Rewrites

every description should answer two questions a builder asks in 3 seconds:
1. **what does this do?**
2. **when would i use it?**

the name stays memorable. the description gets grounded.

### Constructs That Need Rewrites

| # | Construct | Current Description | Proposed Description | Current Short | Proposed Short |
|---|-----------|-------------------|---------------------|---------------|----------------|
| 1 | **Observer** (Beehive) | "Builds the hive so the colony can thrive. Watches how people actually use your product..." | "Product analytics and user research pipeline. Capture feedback from Discord, Telegram, and direct sources. Synthesize into user journey maps and gap reports. File issues to GitHub/Linear. Hypothesis-first: forms theories from user quotes, not assumptions." | "Tend the colony, read the signals" | "User research + feedback pipeline" |
| 2 | **K-Hole** | "Goes where search engines won't. Seven voices in productive tension pull threads through grounded search..." | "Deep research engine with grounded web search and citation trails. Two modes: /dig for interactive pair-research (follow what resonates) and /forge for systematic multi-domain coverage. Produces structured findings, not summaries. Used for practitioner research, competitive analysis, and domain mapping." | "Depth engine for exploration" | "Grounded deep research + synthesis" |
| 3 | **Kansei** | "Perceptual engineering for digital craft. Shaders, springs, haptics, sound, timing..." | "Translate feeling into engineering parameters. Spring constants, shader recipes, timing curves, haptic feedback patterns. Turn 'this feels too cold' into 'tension should be 150, not 200.' Quantifies the qualitative." | "Perceptual engineering" | "Feeling into physics" |
| 4 | **Vocabulary Bank** | "Per-product vocabulary governance with tiered lexicons, register-aware channel mapping..." | "One vocabulary per product, three tiers: chain-standard (never rename), earned (discovered through use), reserved (not yet deployed). Consistent voice across Discord, docs, UI, and social. Anchored words stick. White space creates meaning. Gravity accumulates through use." | "Vocabulary governance" | "One voice, many channels" |
| 5 | **Hardening** | "The one that finds the holes before someone else does..." | "Security incident response and pre-deployment hardening. Three pipelines: incident forensics (postmortem, triage, blast radius via git history), defensive measures (test/type/monitoring coverage audits), and pre-deploy security scans (API surfaces, auth flows, env secrets, data privacy)." | "Full-stack security construct" | "Security audits + incident response" |
| 6 | **Beacon** | "Makes your project discoverable to the agent network. AI-retrievable content, trust signals, and x402 payment endpoints..." | "Make your content AI-indexable and your APIs agent-discoverable. Content audit scoring, markdown export with semantic chunking, API specification generation, and payment endpoint discovery. Designed for the agent-commerce future." | "AI-retrievable trust signals" | "AI content indexing + API discovery" |
| 7 | **Mibera Codex** | "Canonical source of truth for 10,000 time-travelling Beras and 15,000 years of lore..." | "Living lore database for Mibera NFTs. Query and browse 10,000 digital identities across 7 dimensions (archetype, ancestor, element, tarot, era, molecule, swag rank). Cross-reference trait connections. Returns canonical data with cultural lineage and signal hierarchies." | "Living lore for 10,000 Beras" | "Mibera identity knowledge base" |

### Constructs That Are Already Clear (No Rewrite Needed)

| Construct | Why It Works |
|-----------|-------------|
| **Artisan** | "Turns 'this feels off' into an engineering specification" — problem + solution in one sentence. Builder knows exactly what this does. |
| **Protocol** | "Reads the chain so your users don't hit reverts" — clear pain point, clear solution. Web3 devs get it immediately. |
| **Rosenzu** | "Routes are rooms. Transitions are doors." — metaphor is immediately graspable. Spatial navigation design is clear. |
| **The Arcade** | "Game design as operating philosophy. Progressive disclosure, core loops, game feel" — game design vocabulary is already builder vocabulary. |
| **The Mint** | "Forges digital materials into existence" + two clear operators (CELLINI for assets, MURAGE for environments). Production-grounded. |
| **The Speakers** | "Psychoacoustic engineering, sonic identity architecture" — technical + evocative. Audio engineers know exactly what this is. |
| **VFX Playbook** | "Living design system distilled from game VFX masters — Riot, Blizzard, GDC practitioners." — source + application clear. |
| **The Easel** | "Creative studio for aesthetic direction" — clear. Minor improvement: emphasize vocabulary-driven approach. |
| **Gecko** | Clear within construct ecosystem context. Less clear to outsiders, but Gecko is internal tooling — acceptable. |

### Missing Short Descriptions (Add These)

| Construct | Proposed short_description |
|-----------|---------------------------|
| **VFX Playbook** | "Game VFX principles for web UI" |
| **The Mint** | "Generative asset forging + materialization" |
| **The Speakers** | "Sonic identity + psychoacoustic engineering" |
| **Herald** | "Evidence-grounded changelog + announcements" |

---

## Part 2: Skill Consolidation

### Skills to Remove from Manifests

| Construct | Skills | Reason |
|-----------|--------|--------|
| **Observer** | thinking, listening, seeing, speaking, distilling, growing (6 skills) | Orchestrator shims — routing internals, not user-facing capabilities. Keep as internal SKILL.md, remove from construct.yaml manifest. Reduces 24 → 18 visible skills. |
| **WebGL Particles** | production-case-studies | Reference material, not a skill. Move to `research/case-studies.md`. |

### Skills to Merge

| Construct | From | To | Reason |
|-----------|------|----|--------|
| **Protocol** | dapp-lint + dapp-typecheck | dapp-static-analysis | Both catch similar issues (types, patterns). Single entry point simpler. |
| **Hardening** | audit-api + audit-auth + audit-data-privacy + audit-env | web3-security-audit + secrets-and-supply-chain-audit | 4 generic audits → 2 domain-specific. Web3 auth (wallet sigs, EIP-712, nonce replay) is distinct from env/dependency security. |
| **WebGL Particles** | creative-workflow → merge into r3f-production | r3f-production (expanded) | Both about iteration + optimization in R3F context. |
| **K-Hole** | orchestrator + deep-research overlap | deep-research (with batch mode flag) | Orchestrator wraps deep-research. One skill, two modes. |

### New Skills to Add (from project learnings)

| Construct | Skill | What It Does | Evidence |
|-----------|-------|-------------|----------|
| **Protocol** | transact-pattern | Codify the production transaction lifecycle: ensureNetwork → simulate → writeContract → waitForReceipt → refetch. Generate hooks. | MCV README documents this exact pattern. Every dApp reinvents it. |
| **Protocol** | gas-estimator | Validate gas estimates match actual costs before users submit. | MCV pain point — users surprised by gas on complex vault operations. |
| **Observer** | feedback-pipeline | Generalize the mibera-dimensions feedback loop: schema → daily cron → canvas → synthesis → gap filing. Reusable for any product. | Mibera-dimensions built this bespoke. Set-and-forgetti needs it. Pattern is proven. |
| **Hardening** | web3-auth-hardening | Wallet signature verification, nonce replay prevention, EIP-712 domain separation, session token storage compliance. | Auth proxy architecture (memory), SDK version drift (40+ minors across repos), CSRF issues in multiple products. |
| **Artisan** | audit-design-adoption | Validate that defined design tokens (oklch colors, animation tokens, spacing) are actually imported and used in components. | Mibera explorer defined animation tokens (snappy, smooth, gentle, bouncy) but nothing used them. Define ≠ adopted. |
| **Beacon** | seo-meta-generation | Structured data (schema.org) for search engine indexing. More immediate ROI than x402. | constructs.network itself has zero structured data. |

---

## Part 3: Schema & Compliance Issues

| Issue | Construct | Severity | Action |
|-------|-----------|----------|--------|
| manifest.json v1 (not construct.yaml v3) | WebGL Particles | CRITICAL | Migrate to construct.yaml v3. Topology validation catches this. |
| Missing short_description | The Mint, The Speakers, Herald, VFX Playbook | MEDIUM | Add proposed short_descriptions from Part 1. |
| Missing composition declarations | WebGL Particles, Beacon | MEDIUM | WebGL-Particles → compose with the-mint, artisan. Beacon → compose with herald. |
| Observer cognitive primitives in manifest | Observer | LOW | Move 6 orchestrator skills to internal-only. |

---

## Part 4: Cross-Construct Integration Gaps

### The Silo Problem

today each construct produces intelligence in isolation:

```
Observer → canvases, gaps, journeys     (sits in grimoires/observer/)
K-Hole  → research trails, findings     (sits in grimoires/k-hole/)
Herald  → changelogs, announcements     (sits in grimoires/herald/)
Gecko   → health audits, drift reports  (sits in grimoires/gecko/)
```

none of them read each other's output. a builder using observer to capture feedback can't feed that into k-hole for deeper research. herald can't see observer's user quotes when writing announcements. gecko can't warn when observer's canvases go stale.

### Proposed Integration Points

| From | To | Data Flow | Value |
|------|----|-----------|-------|
| Observer gaps | K-Hole research seeds | "Users keep asking about X" → automatic /dig topic | Research grounded in real user needs |
| K-Hole findings | Observer canvases | Research finding → enriches user canvas context | User profiles gain domain depth |
| Observer + K-Hole | Herald announcements | User quotes + research evidence → grounded comms | Announcements cite both user truth and domain research |
| Gecko health | Observer alerts | Construct drift detected → observer notification | Maintenance triggered by real signals |
| All outputs | Shared index | Queryable store of findings, gaps, research, health | Any construct can read any other's intelligence |

### The Pattern-Domain Gap (from project learnings)

current constructs are **problem-domain**: feel (artisan), feedback (observer), verification (protocol), security (hardening).

what's missing are **pattern-domain** constructs — skills that teach builders how to wire infrastructure correctly:

| Missing Pattern | Evidence | Where It Belongs |
|----------------|----------|-----------------|
| Transaction lifecycle (simulate → write → confirm → refetch) | Every dApp builds this from scratch. MCV documents the pattern. | Protocol (new skill) |
| Async job orchestration (Trigger.dev v4 vs cron vs Convex actions) | Honeyroad + honey-guard both struggled with this choice. | New construct or Protocol extension |
| Indexer patterns (Envio setup, materialized views, computed factors) | Mibera-dimensions + honeyroad doing this independently. | New construct or Beacon extension |
| Observability (Sentry, structured logging, perf monitoring) | Zero of 6 product repos have proper monitoring. Universal gap. | New construct |
| Shared web3 config (Dynamic SDK pinning, chain transport, RPC fallback) | Dynamic SDK 40+ minors apart across repos. Gold standard RPC exists in honey-interface. | Beacon or new construct |

---

## Part 5: Construct Readiness Matrix

| Construct | Skills | Language | Schema | Composition | Battle-Tested | Overall |
|-----------|--------|----------|--------|-------------|---------------|---------|
| **Artisan** | 14 ✅ | ✅ Clear | ✅ v3 | ✅ Strong | ✅ All skills | **MATURE** |
| **The Arcade** | 6 ✅ | ✅ Clear | ✅ v3 | ✅ Strong | ✅ All skills | **MATURE** |
| **Protocol** | 10 ✅ | ✅ Clear | ✅ v3 | 🟡 Weak | ✅ 8/10 | **READY** (tighten composition) |
| **The Mint** | 8 ✅ | ✅ Clear | ✅ v3 | ✅ Strong | ✅ All skills | **READY** (add short_desc) |
| **The Speakers** | 8 ✅ | ✅ Clear | ✅ v3 | ✅ Strong | ✅ All skills | **READY** (add short_desc) |
| **VFX Playbook** | 4 ✅ | ✅ Clear | ✅ v3 | 🟡 Loose | 🟡 3/4 | **READY** (add short_desc + applied cases) |
| **Rosenzu** | 5 ✅ | ✅ Clear | ✅ v3 | 🟡 Loose | 🟡 3/5 | **READY** (threshold pattern library) |
| **The Easel** | 4 ✅ | ✅ Good | ✅ v3 | 🟡 Loose | ✅ All | **READY** (tighten vocab requirement) |
| **K-Hole** | 6 → 5 | 🔴 Rewrite | ✅ v3 | 🟡 Loose | ✅ /dig proven | **NEEDS WORK** (rewrite + merge orchestrator) |
| **Observer** | 24 → 18 | 🔴 Rewrite | ✅ v3 | 🟡 Weak | ✅ Core proven | **NEEDS WORK** (rewrite + trim skills) |
| **Kansei** | 4 | 🔴 Rewrite | ✅ v3 | 🟡 One-way | 🟡 2/4 | **NEEDS WORK** (rewrite + deploy shaders) |
| **Hardening** | 11 → 7 | 🟡 Rewrite | ✅ v3 | 🟡 Weak | ✅ Core proven | **NEEDS WORK** (consolidate + rewrite) |
| **Beacon** | 6 | 🟡 Rewrite | ✅ v3 | 🔴 None | 🟡 3/6 | **NEEDS WORK** (rewrite + split v2 tier) |
| **Vocabulary Bank** | 2 ✅ | 🟡 Rewrite | ✅ v3 | 🟡 Loose | ✅ Both | **NEEDS WORK** (under-marketed, rewrite) |
| **Gecko** | 4 ✅ | ✅ Context-ok | ✅ v3 | 🟡 Internal | ✅ All | **READY** (internal tooling, acceptable) |
| **Herald** | 3 ✅ | ✅ Clear | ✅ v3 | 🟡 Weak | 🟡 Low adoption | **READY** (add short_desc) |
| **Mibera Codex** | 3 ✅ | 🟡 Domain-specific | ✅ v3 | 🔴 None | ✅ In production | **READY** (rewrite for clarity) |
| **WebGL Particles** | 9 → 7 | ✅ Technical | 🔴 v1 | 🔴 None | ✅ All technical | **BLOCKED** (schema migration first) |

---

## Part 6: Priority Action Plan

### P0 — Do Now (description + schema fixes)

1. **Rewrite 7 construct descriptions** (Observer, K-Hole, Kansei, Vocabulary Bank, Hardening, Beacon, Mibera Codex) using proposed text from Part 1
2. **Add 4 missing short_descriptions** (VFX Playbook, The Mint, The Speakers, Herald)
3. **Migrate WebGL Particles** from manifest.json v1 to construct.yaml v3
4. **Remove 6 orchestrator skills** from Observer manifest (keep as internal SKILL.md)

### P1 — Next Sprint (skill improvements)

5. **Add transact-pattern skill** to Protocol (codify MCV transaction lifecycle)
6. **Add feedback-pipeline skill** to Observer (generalize mibera-dimensions pattern)
7. **Merge Hardening audit-* skills** (4 generic → 2 domain-specific: web3-security + supply-chain)
8. **Merge Protocol dapp-lint + dapp-typecheck** → dapp-static-analysis
9. **Add web3-auth-hardening skill** to Hardening
10. **Add audit-design-adoption skill** to Artisan

### P2 — Medium Term (composition + new constructs)

11. **Wire cross-construct data flow** (Observer ↔ K-Hole ↔ Herald ↔ Gecko)
12. **Create Observability construct** (Sentry setup, structured logging, perf monitoring, rate limiting)
13. **Add async job pattern guidance** (Trigger.dev v4 vs cron vs Convex decision tree)
14. **Add Envio indexer patterns** (schema design, materialized views, computed factors)
15. **Publish golden path stack template** (Next.js 15 + wagmi v2 + Dynamic + Zustand + TQ + Tailwind v4 + Supabase)

### P3 — Strategic (ecosystem maturity)

16. **Gecko public health dashboard** on explorer (construct health scores visible to builders)
17. **Creator maintenance profiles** (response time, update frequency → trust signal)
18. **Research → GTM pipeline** (K-Hole + Observer + Herald producing feature ROI narratives)
19. **Rosenzu threshold pattern library** (slide, fade, portal with Next.js examples)
20. **Kansei shader deployment** (ship one Wuxing shader to purupuru as proof)

---

## Part 7: The Golden Path Stack

### Legacy Stack (6 older repos — what we used to build)

| Layer | Choice | Confidence |
|-------|--------|------------|
| Framework | Next.js 15 App Router | 6/6 legacy repos |
| Chain interaction | viem + wagmi v2 | 6/6 repos |
| Wallet auth | Dynamic Labs (pin to 4.61.3+) | 6/6 repos (with version drift) |
| Client state | Zustand + TanStack Query v5 | 5/6 repos |
| Styling | Tailwind CSS v4 + oklch tokens | 5/6 repos |
| Database | Supabase PostgreSQL | 4/6 repos |
| Realtime | Convex | 3/6 repos |
| Monorepo | Turborepo + bun | 4/6 repos |
| Hosting | Vercel | 6/6 repos |
| Error tracking | Sentry (should be all — currently 2/6) | GAP |

### First-Principles Stack (recent builds — what we recommend now)

the recent repos (rectrop, mibera-dimensions rebuild, purupuru world) proved a different path. Next.js is bloat for focused dApps — framework tax on build times, bundle size, hosting costs, and complexity ceiling. the shift:

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | **SvelteKit** | Zero hydration mismatches. No server/client boundary confusion. Reactive by default. Smaller bundles. Faster builds. |
| **Hosting** | **Railway** | Predictable pricing ($5-20/mo vs Vercel $20-100+). Docker-native. No vendor lock-in. |
| **Backend/Realtime** | **Convex** | Zero infrastructure. Realtime built-in. Replaces Supabase + TanStack Query + Zustand in many cases. |
| **Chain** | viem + wagmi v2 | Same as legacy — this layer is stable and correct. |
| **Auth** | Dynamic Labs or wallet-native | Same, but evaluate RainbowKit for cost reduction. |
| **Styling** | Tailwind CSS v4 + oklch | Same — design tokens work regardless of framework. |
| **State** | **Svelte stores + Convex reactivity** | Less glue code. Svelte's reactivity + Convex's subscriptions compose naturally. No Zustand, no TanStack Query, no cache invalidation strategies. |
| **Contracts** | Foundry | Same — battle-tested. |
| **Cost** | **$5-20/mo** | Railway + Convex free tier vs Vercel + multiple SaaS subscriptions. |

### The Principle

build from the bottom up, first principles. these frameworks remove entire categories of complexity:
- **no hydration** — Svelte doesn't have the server/client split problem
- **no cache invalidation** — Convex handles realtime state automatically
- **no state management library** — Svelte stores + Convex subscriptions replace Zustand + TanStack Query
- **no infrastructure** — Convex replaces API routes + database + realtime subscriptions

constructs should teach this stack, not the legacy one. skill instructions that reference Next.js patterns (server components, app router, API routes) should provide SvelteKit equivalents or be framework-agnostic.

### What This Means for Constructs

| Construct | Impact |
|-----------|--------|
| **Protocol** | transact-pattern skill should work with both Next.js and SvelteKit. wagmi/viem layer is framework-agnostic. |
| **Observer** | feedback-pipeline should use Convex natively (not Supabase + cron). |
| **Artisan** | Design tokens (oklch, springs) are framework-agnostic. No change needed. |
| **Beacon** | Content indexing works regardless of framework. SvelteKit has better SSR story for SEO. |
| **Hardening** | Security audits need SvelteKit-aware checks (form actions, hooks, load functions). |
| **All** | Skill instructions should default to framework-agnostic patterns. When framework-specific, provide both Next.js and SvelteKit paths. |

---

## Appendix: Research Grounding

### dsaints Research (77 practitioners, 20-person canon)
the dsaints research produced grounded taste tokens now in `grimoires/artisan/taste.md`. seven convergences identified across practitioners. this research should be cited by:
- Artisan (taste synthesis, decomposition)
- Kansei (spring constants reference practitioner values)
- VFX Playbook (emotion arcs from Pedro Duarte)
- The Easel (vocabulary grounding should reference practitioner canon)

### Project Learnings Sources
- MCV transaction lifecycle → Protocol transact-pattern
- Set-and-forgetti feedback pipeline → Observer feedback-pipeline
- Mibera-dimensions factor computation → Indexer patterns
- Honeyroad async dispatch → Async job patterns
- Honey-guard Trigger.dev v4 → Async job patterns
- Hub-interface R3F → WebGL Particles dogfooding
- Bazaar stack audit → Golden path stack confirmation

---

*gecko walked every stall. this is the map. now the question is which roads to pave first.*
