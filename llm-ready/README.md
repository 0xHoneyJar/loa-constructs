# LLM-Ready Pack

> Make websites AI-retrievable with markdown export, content auditing, and chunk optimization.

## Problem

AI systems (ChatGPT, Claude, Perplexity) are becoming primary information retrievers. Current websites are optimized for human consumption, not AI retrieval:

- **Context loss**: AI retrieves isolated chunks, losing qualifiers and scope
- **FUD propagation**: Unscoped claims get quoted out of context
- **Trust degradation**: Marketing copy reduces AI confidence in brand claims
- **Inefficient retrieval**: 500KB HTML pages when 2KB markdown would suffice

## Solution

Three skills that work together:

| Skill | Command | Purpose |
|-------|---------|---------|
| **auditing-content** | `/audit-llm` | Analyze pages for LLM trust signals |
| **generating-markdown** | `/add-markdown` | Add markdown export via content negotiation |
| **optimizing-chunks** | `/optimize-chunks` | Rewrite content to survive AI retrieval |

## Quick Start

```bash
# 1. Audit a page for LLM-readiness
/audit-llm /pricing

# 2. Fix issues found in the audit
/optimize-chunks /pricing

# 3. Add markdown export capability
/add-markdown /pricing
```

## Commands

### `/audit-llm [path]`

Analyze a page against the 5-layer AI trust model:

1. **Source Legitimacy** (20%) - Brand clarity, entity definition
2. **Claim Verifiability** (25%) - Evidence links, falsifiable statements
3. **Cross-Source Consistency** (20%) - No contradictions, temporal coherence
4. **Contextual Integrity** (25%) - Scoped claims, qualifiers present
5. **Structural Cues** (10%) - Factual vs marketing language ratio

**Output**: `grimoires/llm-ready/audits/{page}-audit.md`

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

**Output**: `grimoires/llm-ready/exports/{page}-manifest.md`

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

**Output**: `grimoires/llm-ready/optimizations/{page}-chunks.md`

## Workflow

The recommended workflow is:

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│ /audit-llm  │ ──> │ /optimize-chunks │ ──> │ /add-markdown │
│             │     │                  │     │               │
│ Identify    │     │ Fix issues       │     │ Enable export │
│ issues      │     │                  │     │               │
└─────────────┘     └──────────────────┘     └───────────────┘
```

1. **Audit** - Understand current LLM-readiness
2. **Optimize** - Fix content that won't survive chunking
3. **Export** - Enable AI-friendly markdown retrieval

## Why This Matters

From Vercel's approach:
> "The web for agents will be very efficient! Page went from 500kb to 2kb."

From LLM retrieval research:
> "AI doesn't reuse pages. It reuses claim patterns... Content that survives being taken out of context gets reused."

## Installation

```bash
# Via Loa Constructs
/constructs install llm-ready

# Or manually
./llm-ready/scripts/install.sh .
```

## Grimoire Structure

After installation:

```
grimoires/llm-ready/
├── state.yaml           # Pack state tracking
├── audits/              # Audit reports
│   └── {page}-audit.md
├── exports/             # Generation manifests
│   └── {page}-manifest.md
└── optimizations/       # Chunk recommendations
    └── {page}-chunks.md
```

## License

MIT
