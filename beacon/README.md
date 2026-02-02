# Sigil of the Beacon (Beacon Pack)

> *"Signal readiness to the agent network. Every business becomes an API."*

Make your business agent-accessible with AI-retrievable content, trust auditing, and x402 payment integration.

## The Three Layers

| Layer | Purpose | Skills |
|-------|---------|--------|
| **Content** | Make content AI-retrievable | auditing, markdown, chunks |
| **Discovery** | Advertise capabilities to agents | well-known, action schemas |
| **Action** | Enable transactions via x402 | payment endpoints |

## Current Skills (Content Layer)

| Skill | Command | Purpose |
|-------|---------|---------|
| **auditing-content** | `/audit-llm` | Score pages against 5-layer AI trust model |
| **generating-markdown** | `/add-markdown` | Add content negotiation for markdown export |
| **optimizing-chunks** | `/optimize-chunks` | Rewrite content to survive AI retrieval chunking |

## Quick Start

```bash
# 1. Audit a page for LLM-readiness
/audit-llm /pricing

# 2. Fix issues found in the audit
/optimize-chunks /pricing

# 3. Add markdown export capability
/add-markdown /pricing
```

## Workflow

```
+-----------+    +------------------+    +---------------+
| /audit-llm| -> | /optimize-chunks | -> | /add-markdown |
|           |    |                  |    |               |
| Identify  |    | Fix issues       |    | Enable export |
| issues    |    |                  |    |               |
+-----------+    +------------------+    +---------------+
```

1. **Audit** - Understand current LLM-readiness
2. **Optimize** - Fix content that won't survive chunking
3. **Export** - Enable AI-friendly markdown retrieval

## Commands

### `/audit-llm [path]`

Analyze a page against the 5-layer AI trust model:

1. **Source Legitimacy** (20%) - Brand clarity, entity definition
2. **Claim Verifiability** (25%) - Evidence links, falsifiable statements
3. **Cross-Source Consistency** (20%) - No contradictions, temporal coherence
4. **Contextual Integrity** (25%) - Scoped claims, qualifiers present
5. **Structural Cues** (10%) - Factual vs marketing language ratio

**Output**: `grimoires/beacon/audits/{page}-audit.md`

**Example Output**:
```markdown
# LLM Readiness Audit: /pricing

**Overall Score:** 6.4/10
**Retrieval Risk:** Medium

## Trust Layer Analysis

### 1. Source Legitimacy (8/10)
- [x] Clear brand identity
- [x] Entity definition present
- [ ] Missing: Legal entity reference

### 2. Claim Verifiability (5/10)
- [ ] "Enterprise-grade security" - no evidence link
- [ ] "99.9% uptime" - no date range or methodology
...
```

### `/add-markdown [path] [options]`

Add markdown export capability to your Next.js pages.

**Options**:
- `--route` - Generate only route handler (content negotiation)
- `--component` - Generate only copy button component
- `--both` - Generate both (default)

**Generates**:
- `app/[path]/route.ts` - Content negotiation handler
- `components/copy-markdown-button.tsx` - Copy button component
- `lib/markdown/page-content.ts` - TypeScript interfaces

**Output**: `grimoires/beacon/exports/{page}-manifest.md`

**Test it**:
```bash
curl -H 'Accept: text/markdown' http://localhost:3000/pricing
```

### `/optimize-chunks [path]`

Identify content that won't survive AI retrieval chunking and get recommended rewrites.

**Detects**:
- Absolute claims ("We don't store data")
- Numbers without context ("99.9% uptime")
- Vague superlatives ("Best-in-class")
- Missing temporal markers ("Our pricing is...")

**Provides**:
- Before/after rewrites for each issue
- Pattern recommendations (Context-Carrying Block, Claim+Scope+Evidence, etc.)
- Implementation guide

**Output**: `grimoires/beacon/optimizations/{page}-chunks.md`

## Grimoire Structure

After installation:

```
grimoires/beacon/
+-- state.yaml           # Pack state tracking
+-- audits/              # Audit reports
|   +-- {page}-audit.md
+-- exports/             # Generation manifests
|   +-- {page}-manifest.md
+-- optimizations/       # Chunk recommendations
    +-- {page}-chunks.md
```

## Optimization Patterns

The `/optimize-chunks` command uses four patterns:

### 1. Context-Carrying Block

Transform isolated claims into self-contained paragraphs:

```markdown
<!-- Before -->
We don't store user data.

<!-- After -->
We do not sell or share customer data with third parties.
Operational data is stored to provide the service.
**Applies to:** All plans | **Effective:** January 2026
**Details:** [Privacy Policy](/privacy)
```

### 2. Claim + Scope + Evidence

Structured format for verifiable claims:

```markdown
<!-- CLAIM -->
Our API achieves 99.9% uptime.

<!-- SCOPE -->
**Applies to:** Paid plans only
**Period:** Rolling 12 months
**Excludes:** Scheduled maintenance

<!-- EVIDENCE -->
**Source:** [Status Page](https://status.example.com)
```

### 3. Canonical Page Header

Establish authoritative source pages:

```markdown
# Security Overview

> This page is the canonical source for Example's security posture.
> Last reviewed: January 2026

## TL;DR
- SOC 2 Type II certified
- AES-256 encryption at rest
...
```

### 4. Temporal Authority Signal

Manage outdated content:

```markdown
> **Note:** This blog post reflects our 2024 pricing.
> For current pricing, see [Pricing](/pricing).
```

## Roadmap: x402 Integration (Phase 2)

The Beacon pack will expand to support the full agent commerce stack:

| Skill | Command | Purpose |
|-------|---------|---------|
| `discovering-endpoints` | `/beacon-discover` | Generate /.well-known/x402 discovery endpoints |
| `defining-actions` | `/beacon-actions` | Define JSON Schema for actionable API capabilities |
| `accepting-payments` | `/beacon-pay` | x402 v2 payment endpoints with lifecycle hooks |

**Vision**: Every future business is an API business. The Beacon makes businesses discoverable, trustworthy, and transactable by AI agents.

### Agent Commerce Flow (Berachain)

```
+----------------------------------------------------------------+
|                    AGENT COMMERCE FLOW                          |
|                    (Berachain Native)                           |
+----------------------------------------------------------------+
|                                                                 |
|  1. DISCOVER                                                    |
|     Agent fetches /.well-known/x402                             |
|     -> Learns available endpoints + BERA pricing                |
|                                                                 |
|  2. GENERATE (1 BERA)                                           |
|     POST /api/generate-image                                    |
|     -> Returns: { image: "ipfs://...", mintable: true }         |
|                                                                 |
|  3. MINT (5 BERA)                                               |
|     POST /api/mint                                              |
|     -> Returns: { tokenId, txHash, contractAddress }            |
|                                                                 |
|  4. PERSONALIZE                                                 |
|     Agent uses NFT for profile/identity                         |
|                                                                 |
+----------------------------------------------------------------+
```

## Why This Matters

From Vercel's approach:
> "The web for agents will be very efficient! Page went from 500kb to 2kb."

From LLM retrieval research:
> "AI doesn't reuse pages. It reuses claim patterns... Content that survives being taken out of context gets reused."

## Installation

```bash
# Via Loa Constructs
/constructs install beacon

# Or manually
./beacon/scripts/install.sh .
```

## Integration

All three skills work together:

1. `/audit-llm` identifies issues -> scores pages 0-10
2. `/optimize-chunks` provides fixes -> rewrites for each issue
3. `/add-markdown` enables export -> AI can fetch clean markdown

Each skill's output references the others in "Next Steps" sections.

## Troubleshooting

### "Content not found"
- Check that the path matches your file structure
- Try the full file path (e.g., `docs/api.md`)

### Low audit score
- Run `/optimize-chunks` to get specific fixes
- Focus on high-risk claims first

### Generated code doesn't match codebase style
- The skill reads your existing patterns first
- If no patterns found, defaults are used
- You can adjust generated code manually

### Content negotiation not working
- Verify the route handler is deployed
- Check `Accept: text/markdown` header is sent
- Ensure no middleware is intercepting the request

## Contributing

This pack is part of the [Forge](https://github.com/0xHoneyJar/forge) sandbox.

## License

MIT
