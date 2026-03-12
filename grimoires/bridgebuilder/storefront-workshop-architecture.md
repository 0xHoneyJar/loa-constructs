# Storefront vs Workshop Information Architecture

> Dig session 2026-03-12 | 45 Gemini grounded searches | depth: ++
> Via `dig-search.ts` — real sources with provenance
>
> Thread: Two-tier description systems for human browsers and AI agents

## The Core Model

**Brad Frost's "Storefront vs. Workshop"** maps precisely to our three-tier description system:

| Tier | Frost's Model | Constructs Network | Audience | Information Density |
|------|--------------|-------------------|----------|-------------------|
| **1. Storefront** | Curated discovery | Landing / catalog list | Human scanner | Minimal: icon + name + tagline + downloads |
| **2. Gallery** | Detailed evaluation | `/constructs/[slug]` detail | Human evaluator | Medium: full description, skills, identity, deps |
| **3. Workshop** | Raw implementation | `construct.yaml` + SKILL.md | AI agent + maintainer | Maximum: cognitive frame, voice, long_description |

This echoes **Museum Curation (Phygital IA)** — the visitor's narrative caption (Tier 1) must be separated from the researcher's provenance metadata (Tier 3) so the "messy" details don't rot the user experience.

## The Dual Audience Discovery

The critical finding from this dig: developer platforms now serve two fundamentally different consumers of the same information, and their information architectures are diverging.

### For Humans: Deep and Hierarchical
- Progressive disclosure reduces cognitive load (John Carroll's 1983 "Training Wheels" model)
- Social proof matters (downloads, stars, verification badges)
- White space and visual hierarchy guide the eye
- **The "Eject Pattern"** (Jason Lengstorf): start with one-click storefront, provide clear path to "eject" into the full technical workshop

### For AI Agents: Flat and Semantic
- **Passive Context beats Active Retrieval** — **Jude Gao (Vercel)** documents that agents have **100% success with passive context** but **fail 56% of the time with active retrieval**
- Token cost makes deep nesting expensive
- Agents need `AGENTS.md` / `llms.txt` — a compressed semantic skeleton at root
- **MCP** (Anthropic) acts as universal translator for agentic access

## The Description Field Is Agent Context

The maintainer writes for TWO audiences simultaneously:

| Field | Human Audience | Agent Audience |
|-------|---------------|---------------|
| `short_description` | Storefront scanning (Tier 1) | Search result ranking |
| `description` | Detail page evaluation (Tier 2) | Construct identification |
| `long_description` | "About" section, expandable (Tier 2) | Full operational context (Tier 3) |
| `identity/persona.yaml` | Rendered as IdentityPanel | Voice/behavior calibration |
| `construct.yaml` | Not shown to users | Full capability declaration |

The user's thesis — **"expansive vocabulary = broader latent space"** — is validated by the passive context research. When an AI agent installs a construct, the `long_description` becomes part of its operational context. Richer, more precise language in the workshop tier directly improves agent behavior.

## The "Double Maintenance" Burden

**IA for humans is becoming deeper** (nested, hierarchical) to manage complexity.
**IA for agents is becoming flatter** (semantic, compressed) to manage token costs.

This creates dual maintenance:
- **Visual layer** → optimized for human social proof (stars, downloads, screenshots)
- **Semantic layer** → optimized for agentic utility (dependencies, entry points, capabilities)

## Emerging Standards

| Standard | Author | Purpose | Our Status |
|----------|--------|---------|-----------|
| `llms.txt` | Jeremy Howard | Compressed site map for LLMs | Could generate from construct registry |
| `AGENTS.md` | Vercel | Agent-specific instructions | Already exists as CLAUDE.md |
| MCP | Anthropic | Structured tool access | Already integrated (mcp-registry.yaml) |
| JSON-LD | Schema.org | Machine-readable metadata | Could enrich construct detail pages |

## The Workshop as Training Substrate

The workshop is no longer just where code is built — it's the raw data that shapes agent behavior, which in turn serves the storefront consumer. The two-tier system is transforming from a static description hierarchy into a **dynamic feedback loop**:

```
Workshop (construct.yaml, SKILL.md, persona.yaml)
    ↓ agent installs construct
Agent Behavior (calibrated by workshop tier)
    ↓ agent produces output
Storefront Consumer (experiences quality)
    ↓ signals (downloads, reviews)
Maintainer (improves workshop tier)
    ↓ cycle continues
```

## Convex-Backed Profile Editing (Future)

Research on dual-source metadata conflict resolution:

| Platform | Git Source | Web Source | Conflict Resolution |
|----------|-----------|------------|-------------------|
| npm | `package.json` | npmjs.com web UI | Git wins on publish |
| Docker Hub | Dockerfile LABEL | Hub web UI | Web wins (manual override) |
| GitHub | Repository fields | Settings web UI | Last-write-wins |
| VS Code | `package.json` | N/A (git-only) | No conflict |

**Recommendation for Constructs Network**: `construct.yaml` remains source of truth for `description` and `long_description` (synced via git-sync). `short_description` could be web-editable via Convex — it's marketing copy, not technical metadata. The web UI lets maintainers iterate on their tagline without pushing commits.

## Pull Threads

- **Passive Context vs. Active Retrieval** — the 100% vs 56% success rate gap has design implications for how we surface construct data to agents
- **FRBR Model in DX** — Library Science (Work/Expression/Manifestation/Item) could solve versioning and documentation rot
- **Differential Disclosure for Dual Audiences** — UI patterns for high-density agent metadata + high-whitespace human views
- **The Eject Pattern** — one-click start with clear path to full technical workshop

## Emergence

- **Depth divergence**: Human IA going deeper while agent IA going flatter — same data, opposite architectures
- **Workshop → Training Substrate**: The workshop is now the raw data that calibrates agent behavior, not just where humans build
- **The tagline as routing signal**: At Tier 1, the short_description doesn't just inform — it routes both human attention and agent intent

## Provenance

Gemini grounded search via `construct-k-hole/scripts/dig-search.ts`
Trail file: `construct-k-hole/scripts/research-output/dig-session-2026-03-12.md`
