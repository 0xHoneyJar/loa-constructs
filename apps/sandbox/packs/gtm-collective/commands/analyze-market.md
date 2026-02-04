---
name: "analyze-market"
version: "1.0.0"
description: |
  Conduct comprehensive market research for GTM strategy.
  Routes to analyzing-market skill for execution.

arguments: []

agent: "analyzing-market"
agent_path: ".claude/skills/analyzing-market"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/context/product-reality.md"
    required: false
  - path: "gtm-grimoire/NOTES.md"
    required: true

pre_flight:
  - check: "file_exists"
    path: ".loa-setup-complete"
    error: "Loa setup has not been completed. Run /setup first."

  - check: "dir_exists"
    path: "gtm-grimoire"
    error: "GTM Collective not installed. Run mount-gtm.sh first."

  - check: "file_exists"
    path: "gtm-grimoire/context/product-brief.md"
    error: "Product brief not found. Run /gtm-setup or /gtm-adopt first."

outputs:
  - path: "gtm-grimoire/research/market-landscape.md"
    type: "file"
    description: "Market size and dynamics analysis"
  - path: "gtm-grimoire/research/competitive-analysis.md"
    type: "file"
    description: "Competitor deep dive"
  - path: "gtm-grimoire/research/icp-profiles.md"
    type: "file"
    description: "Ideal Customer Profiles"

mode:
  default: "foreground"
  background: true
---

# Analyze Market

## Purpose

Conduct comprehensive market research to inform GTM strategy. Creates foundational
research documents that ground all subsequent positioning and pricing decisions.

## Invocation

```
/analyze-market
/analyze-market background
```

## Agent

Routes to `analyzing-market` skill - Market Research Analyst persona.

## Prerequisites

- GTM Collective installed (`gtm-grimoire/` exists)
- Product brief created (`/gtm-setup` or `/gtm-adopt` completed)

## Outputs

Three research documents in `gtm-grimoire/research/`:

1. **market-landscape.md** - TAM/SAM/SOM, market dynamics, trends
2. **competitive-analysis.md** - Competitor profiles, feature matrices
3. **icp-profiles.md** - Ideal Customer Profiles with pain points

## Next Steps

After market analysis:
- `/position` to define product positioning
- Review research docs before proceeding
