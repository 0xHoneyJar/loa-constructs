---
name: "position"
version: "1.0.0"
description: |
  Define product positioning and messaging framework.
  Routes to positioning-product skill for execution.

arguments: []

agent: "positioning-product"
agent_path: ".claude/skills/positioning-product"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/context/product-reality.md"
    required: false
  - path: "gtm-grimoire/research/market-landscape.md"
    required: true
  - path: "gtm-grimoire/research/competitive-analysis.md"
    required: true
  - path: "gtm-grimoire/research/icp-profiles.md"
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
    path: "gtm-grimoire/research/market-landscape.md"
    error: "Market research not complete. Run /analyze-market first."

outputs:
  - path: "gtm-grimoire/strategy/positioning.md"
    type: "file"
    description: "Positioning statement and messaging framework"

mode:
  default: "foreground"
  background: true
---

# Position

## Purpose

Define product positioning and messaging framework based on market research.
Creates the strategic foundation for all marketing communications.

## Invocation

```
/position
/position background
```

## Agent

Routes to `positioning-product` skill - Product Marketing Lead persona.

## Prerequisites

- Market research complete (`/analyze-market`)
- All three research documents present

## Outputs

`gtm-grimoire/strategy/positioning.md` containing:
- Positioning statement
- Value proposition framework
- Messaging by persona
- Competitive differentiation
- Proof points

## Next Steps

After positioning:
- `/price` to define pricing strategy
- Review positioning with stakeholders
