# Construct Discovery — Design Document
> gecko × beauvoir synthesis | 2026-03-13
> sources: 3 research agents, k-hole /dig grounded search, 23-construct surface analysis

---

## The Problem

23 constructs on the network. 3 fragmented search surfaces (passive finding-constructs, active browsing-constructs, explorer web). No semantic search. No skill-level discovery. No composability-driven navigation. Users need to know construct names to find them.

## The Insight

**At 23 constructs, search is the wrong primary metaphor.** The entire catalog is browsable. The real problem is intent mapping — translating "what am I trying to do?" into "which constructs serve that goal?" and "what works together?"

Reference: Vercel's templates gallery has ~200 templates and **no search bar**. Browse-first with faceted filtering scales to ~50 items before search becomes necessary. Google Maps' Ask Maps feature parses multi-constraint intent ("restaurants near me that are quiet and have outdoor seating") rather than matching keywords.

---

## Design Principles

1. **Intent Over Identity** — Don't ask who the user is. Ask what they want to accomplish.
2. **Browse First, Search Second** — 23 constructs is browsable. Category filters + intent entry points above the grid. Search as refinement.
3. **Composition is Navigation** — "What works together" is the most important discovery signal. When you find one construct, the next action should be "show me what composes with this."
4. **Cold-Start = Curiosity-Driven** — No assumptions until config/profile exists. Discovery is pull-based (user explores), not push-based (system recommends).
5. **Weight = Importance** — Verification tier, install count, skill count, and composition degree influence visual weight.
6. **Progressive Disclosure at Every Level** — Catalog → construct → skills. Overview → neighborhood → composition path.

---

## Architecture: Three Layers

### Layer 1: `/find-constructs` CLI Command (PR to upstream Loa)

Replaces both `finding-constructs` (passive, not user-invocable) and search from `browsing-constructs`. Single unified surface.

**Triggers**:
- Explicit: `/find-constructs <query>`, `/find <query>`
- Passive: "find a skill for X", "I need help with X", "is there a construct that..."

**Search Pipeline (3-tier)**:
1. **Registry API**: `GET /v1/constructs?q={query}&per_page=100` — metadata match
2. **Local QMD index** (if enabled): Search SKILL.md content across installed packs
3. **Composability bonus**: If user has constructs installed, boost constructs that compose with them

**Output**:
```
Found 3 constructs matching "security audit":

1. hardening (7 skills) — Defensive artifact forge
   /threat-model  /security-review  /pen-test  /postmortem  ...
   Composes with: observer, protocol

2. crucible (5 skills) — Journey validation testing
   /validate  /test-journey  /detect-gaps  ...
   Composes with: observer (circular)

3. protocol (10 skills) — On-chain verification
   /verify-contract  /audit  /gas-optimize  ...
   Composes with: observer, artisan

Install: /constructs install <slug>
```

**Key improvements**:
- User-invocable (current finding-constructs is not)
- Skill-level visibility in results
- Composability context per result
- Bridge to skills.sh ecosystem (`npx skills find` as fallback)
- Bridge to explorer (`constructs.network/constructs?q=...`)

### Layer 2: API Enrichment (loa-constructs)

Current API returns: name, slug, description, category, downloads, skills_count.

**Must add to API response**:

```typescript
// Per-construct additions
domains: string[];                    // from construct.yaml domain[]
expertise_summary: string[];          // top expertise areas (depth >= 4)
skill_slugs: string[];                // individual skill names
compose_with: string[];               // explicit composition partners
depended_by: string[];                // who depends on this construct
intent_tags: string[];                // build | research | ship | protect | direct
```

**Must add to search**:
- Full-text search via PostgreSQL `tsvector/tsquery` (replace `ilike`)
- Skill-level search (search within skill slugs and descriptions)
- Compose-aware ranking (boost constructs that pair with user's installed stack)

### Layer 3: Explorer UI (constructs.network)

**Three-tab discovery surface**:
```
[Browse]  [Graph]  [Compose]
```

- **Browse** (current `/constructs`, enhanced): Intent-based entry cards above grid. Domain tag chips as secondary filters. Sort by downloads/recency/skills. No search bar prominently featured — browse is primary.
- **Graph** (current `/explore`, enhanced): Stack-driven recentering. Neighborhood highlighting on hover. Edge labels with composition reasons. Bridge to Browse (click cluster → filtered list).
- **Compose** (new): Stack builder page. Shows selected constructs with full detail, compatibility matrix, combined capability summary, install command.

**Intent-based entry points** (above the grid on Browse):
- "Build something new" → artisan, the-mint, webgl-particles, protocol
- "Improve code quality" → crucible, hardening, observer
- "Ship & communicate" → gtm-collective, herald, social-oracle, beacon
- "Research & explore" → k-hole, observer, gecko
- "Direct aesthetics" → the-easel, the-speakers, vocabulary-bank, showcase

---

## The Composability Graph (from surface analysis)

### Hub Constructs (most depended-upon)
| Construct | Inbound Deps | Role |
|-----------|-------------|------|
| k-hole | 5 | Research engine — feeds creative pipeline |
| observer | 4 | Truth engine — feeds quality pipeline |
| the-easel | 4 | Taste arbiter — feeds creative pipeline |
| artisan | 4 | Implementation — consumes taste + truth |

### Natural Clusters
1. **Creative Studio**: k-hole → the-easel → artisan → the-mint, the-speakers, showcase, vfx-playbook
2. **Quality & Trust**: observer ↔ crucible → hardening → protocol
3. **Go-to-Market**: gtm-collective, social-oracle, growthpages, herald, vocabulary-bank
4. **Standalone/Infra**: beacon, gecko, dynamic-auth, webgl-particles, mibera-codex, the-arcade, webreel

### Starter Stacks (curated compositions)
- **Full Observability**: observer + crucible + hardening
- **Creative Pipeline**: k-hole + the-easel + artisan + the-mint
- **Ship-Ready Frontend**: artisan + hardening + beacon + showcase
- **Web3 dApp**: protocol + dynamic-auth + observer + hardening
- **Content Machine**: gtm-collective + social-oracle + herald + vocabulary-bank

---

## Data Quality Issues (must fix)

| Priority | Issue | Fix |
|----------|-------|-----|
| HIGH | 13 constructs have no inline expertise — invisible to API | Surface expertise.yaml data in API response |
| HIGH | No skill-level descriptions in API | Add `include_skills=true` param |
| HIGH | search_keywords empty on all constructs | Populate from domain + expertise |
| MEDIUM | webgl-particles still on schema v1 | Migrate to construct.yaml |
| MEDIUM | 8 constructs have `consumes: ['?']` placeholder | Fix or remove |
| MEDIUM | Event namespace inconsistency (gecko/vocab-bank lack `forge.` prefix) | Standardize |
| LOW | Protocol has 8 domains, most have 1 | Normalize cardinality guidance |
| LOW | vfx-playbook has empty domain array | Add domains |

---

## PR Scope for Upstream Loa

### PR #1: Enhanced `/constructs` command
- Repurpose `browsing-constructs` skill with discovery, intent search, composability view
- `/constructs` (no args) → browse-first catalog, `/constructs <query>` → intent search, `/constructs compose` → composability
- Absorb `finding-constructs` passive triggers, deprecate standalone skill
- 3-tier search: API → QMD → merge
- Skill-level visibility + composability context in results

### PR #2: API enrichment (loa-constructs)
- Add domains, expertise_summary, skill_slugs to construct list response
- Add compose_with and depended_by to detail response
- Add `include_skills=true` query param
- PostgreSQL full-text search (replace ilike)

### PR #3: Explorer browse-first redesign (loa-constructs)
- Intent-based entry cards above construct grid
- Domain tag chips as secondary filters
- "Works with" panel on detail pages
- Graph ↔ list state bridging
- Starter stacks / recipes

---

## Vocabulary Analysis (for search weighting)

**Hub concepts** (high-frequency, navigational anchors):
design, voice, visual, web, chain, research, content, trust, identity, architecture, pipeline

**Discriminating terms** (low-frequency, high-signal):
psychoacoustic, on-chain, postmortem, blast-radius, progressive-disclosure, generative, grounded-search, landing-page, wallet, sonic, taste

**Semantic clusters** (co-occurring terms):
1. Creative-Sensory: visual, taste, motion, feel, aesthetic, sonic, material
2. Web3-Chain: wallet, chain, contract, verification, on-chain, defi, dapp
3. Quality-Trust: validation, testing, grounding, trust, security, hardening
4. Communication: voice, content, narrative, vocabulary, announcement
5. Research-Analysis: research, analysis, observation, intelligence, synthesis

---

## What This Enables (the map vision)

When all three layers are in place:
- A user types "I need help making my dapp secure" → finds protocol + hardening + crucible
- They see that observer composes with all three → adds it to the stack
- The graph recenters around their stack, dimming irrelevant constructs
- They click "Install stack" → one command sets up all four
- The vocabulary bank ensures the website describes this naturally
- Gumi's blotter view eventually becomes another surface consuming the same API

---

## Addendum: Grounded Research (155 Gemini queries, 88 + 67 across 6 dig sessions)

### Architecture Shift: Client-Side Discovery

the dig research (npms.io, GitHub Blackbird, Morville/Nudelman, QUEST framework) converges on a clear answer for catalogs < 100 items:

**show everything. filter on the client. no server-side search.**

```
API: GET /v1/constructs?per_page=100  →  enriched JSON (~50KB)
Client: Fuse.js or FlexSearch  →  sub-100ms instant filtering
UX: horizontal tag pills, not sidebar facets  →  playful exploration
```

at 23 constructs, pagination is counterproductive. faceted sidebars make the catalog feel empty. the optimal UX is a flat, all-visible grid with instant client-side tag filtering and URL-sync for shareable states.

### New Patterns from Deep Research

**1. Diagnostic Dialogue** (from Google Maps' AMIE medical diagnostics model):
Instead of returning all results for "security", ask a clarifying question: "Are you looking to audit existing code, or harden new code?" Implementable without AI — keyword-to-subcategory decision tree.

**2. Concern Cards** (from Maps' fan-out pattern):
"Building a dapp" fans out into concern cards, not a filtered list:
```
[UI & Feel: Artisan]  [Transactions: Protocol]  [Quality: Crucible]  [Monitoring: Observer]
```
Each card = one concern the user should address, with the construct that serves it.

**3. Salience-Based Disclosure** (from Emily Short / interactive fiction):
Information appears when relevant to the user's current action:
- Grid scan → name + one-line only
- Hover/expand → skills and commands (no page navigation)
- Add to stack → composition edges and compatibility
- Current gap: no intermediate disclosure between grid and full detail page.

**4. Goals, Not Bundles** (from Vercel's generative assembly shift):
Frame starter stacks as outcomes: "Ship secure code" not "Security Stack." Users care about the goal, not the bundle name.

**5. Density as Trust** (from Eve Weinberg's "Parsed Metadata"):
Developers value metadata density over aesthetic minimalism. Add to cards: skill count, composition degree, domain tags as chips, last updated.

**6. Middle-Out Graph** (from Tom Sawyer / Tweag research):
Graph default view = category clusters (6 blobs). Click to expand into individual constructs. Click construct to see neighborhood. Current flat graph works at 23 nodes but won't scale.

### Ranking Formula (client-side)

```
relevance(q, c) =
    w1 * exact_match(q, slug | skill_slugs)           // precision floor
  + w2 * BM25(q, name + short_description)             // title
  + w3 * BM25(q, expertise_areas, boost=depth_score)   // expertise signal
  + w4 * BM25(q, description + domains)                // body
  + w5 * popularity(downloads)                          // social proof
  + w6 * composability_bonus(user_installed_constructs) // network effect
```

### Research Sources
- npms.io quality scoring (Andre Cruz)
- GitHub Blackbird AST-based search (Timothy Clem)
- HyDE hypothetical document embeddings
- QUEST framework (Sonia Haiduc) — intent-adaptive weighting
- Google Maps Ask Maps (Mike Schaekermann / AMIE diagnostics)
- Vercel generative assembly (Guillermo Rauch)
- Emily Short salience-based disclosure
- Peter Morville / Greg Nudelman small-catalog UX
- Marti Hearst faceted navigation anti-patterns at small scale

### Late-Breaking: `.well-known/skills` RFC (Cloudflare)

Cloudflare published an RFC extending RFC 8615 for decentralized agent skill discovery. Any domain can publish `/.well-known/skills/index.json` — agents crawl it like robots.txt. Mintlify already auto-generates this for all docs sites.

**Implication**: `constructs.network/.well-known/skills/index.json` could list all 23 public constructs as agent-discoverable skills. Zero CLI required. Any agent that supports the RFC discovers our constructs by visiting the domain.

### Late-Breaking: QMD = Tobias Lutke's Hybrid Search

QMD uses BM25 (lexical) + sqlite-vec (semantic) + local reranker (qwen3-reranker-0.6B). Significantly more powerful than Loa's current grep fallback. If re-enabled with SKILL.md indexing, gives us semantic search over construct content locally.

### Competitive Positioning

| Platform | Discovery | Quality Signal |
|----------|-----------|---------------|
| skills.sh (Vercel) | Centralized, popularity-ranked | Install count only |
| `.well-known/skills` (Cloudflare) | Decentralized, domain-trust | Domain ownership |
| Loa Constructs | Curated registry + git-sync | **Verification tiers** (UNVERIFIED → COMMUNITY → VERIFIED → OFFICIAL) |

Verification tiers are our differentiator. Skills.sh has zero quality control. We have provenance.

### "Roussel" Note

Multiple deep searches found no connection between "Roussel" and skills.sh. The tool is by **Vercel Labs** (Shu Ding, Micah Smith, Andrew Qu). "Roussel" may refer to a different tool or an internal reference.

### Dig trail files
- `/Users/zksoju/Documents/GitHub/construct-k-hole/scripts/research-output/dig-session-2026-03-13.md`

the bazaar needs a good map. this is the cartography.
