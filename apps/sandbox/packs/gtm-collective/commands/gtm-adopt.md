---
name: "gtm-adopt"
version: "1.0.0"
description: |
  Adopt existing dev artifacts (PRD/SDD) into GTM workflow.
  Extracts product info from existing documents to bootstrap GTM planning.

arguments:
  - name: "source"
    type: "string"
    required: false
    description: "Optional path to specific document to adopt from"

agent: null
command_type: "wizard"

context_files:
  - path: "loa-grimoire/prd.md"
    required: false
  - path: "loa-grimoire/sdd.md"
    required: false

pre_flight:
  - check: "file_exists"
    path: ".loa-setup-complete"
    error: "Loa setup has not been completed. Run /setup first."

  - check: "dir_exists"
    path: "gtm-grimoire"
    error: "GTM Collective not installed. Run mount-gtm.sh first."

outputs:
  - path: "gtm-grimoire/context/product-brief.md"
    type: "file"
    description: "Product brief extracted from dev artifacts"
  - path: "gtm-grimoire/context/product-reality.md"
    type: "file"
    description: "Technical reality from SDD for grounding"

mode:
  default: "foreground"
  background: false
---

# GTM Adopt

## Purpose

Bootstrap GTM workflow from existing development artifacts. Extracts product
information from PRD/SDD to create GTM-ready context without redundant discovery.

## Invocation

```
/gtm-adopt
/gtm-adopt loa-grimoire/prd.md
```

## Workflow

This wizard detects and extracts from existing documents:

### Step 1: Document Detection

Scan for existing artifacts:
- `loa-grimoire/prd.md` - Product Requirements
- `loa-grimoire/sdd.md` - Software Design
- `loa-grimoire/context/` - Any user-provided context
- Custom path if provided as argument

### Step 2: PRD Extraction

From PRD, extract:
- Product description and problem statement
- Target users and personas
- Key features and capabilities
- Success metrics

### Step 3: SDD Extraction

From SDD, extract:
- Technical architecture summary
- Integration points
- Performance characteristics
- Technical constraints

### Step 4: Reality Check

Create `product-reality.md` with:
- What the product ACTUALLY does (from code/SDD)
- Current capabilities vs roadmap
- Technical limitations
- Integration requirements

### Step 5: Gap Analysis

Identify what's missing for GTM:
- Market research needed
- Competitive positioning gaps
- Pricing inputs required
- Partnership opportunities

## Output

Create `gtm-grimoire/context/product-brief.md`:

```markdown
# Product Brief (Adopted)

**Source**: [list of source documents]
**Adopted**: YYYY-MM-DD

## Product Overview
[extracted from PRD]

## Technical Reality
[extracted from SDD]

## Target Users
[extracted personas]

## Key Capabilities
[feature summary]

## Gaps for GTM
- [ ] Market research needed
- [ ] Competitive analysis required
- [ ] Pricing research required

---
*Adopted via /gtm-adopt from [sources]*
```

Create `gtm-grimoire/context/product-reality.md`:

```markdown
# Product Reality

**Source**: SDD v[version]
**Extracted**: YYYY-MM-DD

## Technical Architecture
[summary]

## Current Capabilities
[what it actually does]

## Integrations
[integration points]

## Limitations
[technical constraints]

## Performance
[performance characteristics]

---
*Grounding document for GTM claims - all positioning must align*
```

## Next Steps

After adoption completes, suggest:
- `/analyze-market` to begin market research
- Review `product-reality.md` to ensure GTM claims stay grounded
