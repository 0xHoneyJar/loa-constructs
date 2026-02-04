---
name: "price"
version: "1.0.0"
description: |
  Define pricing strategy and tier structure.
  Routes to pricing-strategist skill for execution.

arguments: []

agent: "pricing-strategist"
agent_path: ".claude/skills/pricing-strategist"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/research/market-landscape.md"
    required: true
  - path: "gtm-grimoire/research/competitive-analysis.md"
    required: true
  - path: "gtm-grimoire/research/icp-profiles.md"
    required: true
  - path: "gtm-grimoire/strategy/positioning.md"
    required: true
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
    path: "gtm-grimoire/strategy/positioning.md"
    error: "Positioning not complete. Run /position first."

outputs:
  - path: "gtm-grimoire/strategy/pricing-strategy.md"
    type: "file"
    description: "Pricing model and tier structure"

mode:
  default: "foreground"
  background: true
---

# Price

## Purpose

Define pricing strategy based on positioning and market research.
Creates pricing model, tier structure, and packaging recommendations.

## Invocation

```
/price
/price background
```

## Agent

Routes to `pricing-strategist` skill - Revenue Architect persona.

## Prerequisites

- Market research complete (`/analyze-market`)
- Positioning defined (`/position`)

## Outputs

`gtm-grimoire/strategy/pricing-strategy.md` containing:
- Pricing philosophy
- Tier structure
- Feature packaging
- Competitive pricing analysis
- Revenue projections

## Next Steps

After pricing:
- `/plan-partnerships` for BD strategy
- `/plan-devrel` for developer education
- `/plan-launch` for launch planning
