# 💠 Sigil of the Beacon (Beacon Pack)

> *"Signal readiness to the agent network. Every business becomes an API."*

Make your business agent-accessible with AI-retrievable content, trust auditing, and x402 payment integration on Berachain.

## The Three Layers

| Layer | Purpose | Skills | Status |
|-------|---------|--------|--------|
| **Content** | Make content AI-retrievable | auditing, markdown, chunks | ✅ Complete |
| **Discovery** | Advertise capabilities to agents | well-known, action schemas | ✅ Complete |
| **Action** | Enable transactions via x402 | payment endpoints | ✅ Complete |

## All Skills

### Content Layer

| Skill | Command | Purpose |
|-------|---------|---------|
| **auditing-content** | `/audit-llm` | Score pages against 5-layer AI trust model |
| **generating-markdown** | `/add-markdown` | Add content negotiation for markdown export |
| **optimizing-chunks** | `/optimize-chunks` | Rewrite content to survive AI retrieval chunking |

### Discovery Layer

| Skill | Command | Purpose |
|-------|---------|---------|
| **discovering-endpoints** | `/beacon-discover` | Generate `/.well-known/x402` discovery endpoint |
| **defining-actions** | `/beacon-actions` | Generate JSON Schema and OpenAPI for endpoints |

### Action Layer

| Skill | Command | Purpose |
|-------|---------|---------|
| **accepting-payments** | `/beacon-pay` | Generate x402 v2 payment middleware and hooks |

## Quick Start

### Content Layer (Make AI-Retrievable)

```bash
# 1. Audit a page for LLM-readiness
/audit-llm /pricing

# 2. Fix issues found in the audit
/optimize-chunks /pricing

# 3. Add markdown export capability
/add-markdown /pricing
```

### Discovery + Action Layer (Enable Agent Commerce)

```bash
# 4. Generate x402 discovery endpoint
/beacon-discover

# 5. Generate action schemas for endpoints
/beacon-actions

# 6. Add payment middleware
/beacon-pay
```

## Workflow

```
CONTENT LAYER                                    DISCOVERY + ACTION LAYER
+-------------+   +------------------+   +---------------+   +------------------+   +----------------+   +-------------+
| /audit-llm  |-->| /optimize-chunks |-->| /add-markdown |-->| /beacon-discover |-->| /beacon-actions|-->| /beacon-pay |
| Identify    |   | Fix issues       |   | Enable export |   | Advertise APIs   |   | Define schemas |   | Add payments|
+-------------+   +------------------+   +---------------+   +------------------+   +----------------+   +-------------+
```

1. **Audit** - Understand current LLM-readiness
2. **Optimize** - Fix content that won't survive chunking
3. **Export** - Enable AI-friendly markdown retrieval
4. **Discover** - Advertise endpoints to agents via `/.well-known/x402`
5. **Define** - Generate JSON Schema and OpenAPI specs
6. **Pay** - Enable x402 v2 payments on Berachain

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
├── state.yaml              # Pack state tracking
├── audits/                 # Audit reports
│   └── {page}-audit.md
├── exports/                # Generation manifests
│   └── {page}-manifest.md
├── optimizations/          # Chunk recommendations
│   └── {page}-chunks.md
└── discovery/              # x402 discovery artifacts
    └── openapi.yaml        # Combined OpenAPI spec
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

## x402 Integration (Complete)

The full agent commerce stack is now available:

### `/beacon-discover`

Generate the x402 discovery endpoint at `/.well-known/x402`:

```bash
/beacon-discover
```

**Generates**:
- `app/.well-known/x402/route.ts` - Discovery endpoint
- Advertises available endpoints, pricing, and supported tokens

**Discovery Response**:
```json
{
  "version": "2.0",
  "capabilities": {
    "payments": {
      "networks": ["eip155:80094"],
      "tokens": ["BERA"]
    }
  },
  "endpoints": [...]
}
```

### `/beacon-actions [path]`

Generate JSON Schema and OpenAPI specifications for your endpoints:

```bash
/beacon-actions
/beacon-actions /api/generate-image
```

**Generates**:
- `app/api/{path}/schema.json` - JSON Schema for request/response
- `grimoires/beacon/discovery/openapi.yaml` - Combined OpenAPI spec

### `/beacon-pay [options]`

Generate x402 v2 payment middleware:

```bash
/beacon-pay
/beacon-pay --endpoint /api/generate-image --subsidy 50%
```

**Generates**:
- `lib/x402/middleware.ts` - Payment verification middleware
- `lib/x402/ratelimit.ts` - Per-agent, per-IP rate limiting
- `lib/x402/hooks.ts` - 4 lifecycle hooks

**Rate Limits (default)**:
- Per-agent: 10 requests/hour
- Per-IP: 50 requests/hour
- Daily subsidy: 1000 BERA

**Lifecycle Hooks**:
- `onPaymentRequired` - Before 402 response
- `onPaymentVerified` - Signature valid
- `onSettlementComplete` - Payment settled
- `onSettlementFailed` - Settlement error

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

All six skills work together to make your business agent-ready:

**Content Layer:**
1. `/audit-llm` identifies issues -> scores pages 0-10
2. `/optimize-chunks` provides fixes -> rewrites for each issue
3. `/add-markdown` enables export -> AI can fetch clean markdown

**Discovery + Action Layer:**
4. `/beacon-discover` advertises -> agents find your APIs
5. `/beacon-actions` defines schemas -> agents understand your APIs
6. `/beacon-pay` enables payments -> agents can transact with your APIs

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
