---
name: "plan-partnerships"
version: "1.0.0"
description: |
  Develop partnership and business development strategy.
  Routes to building-partnerships skill for execution.

arguments: []

agent: "building-partnerships"
agent_path: ".claude/skills/building-partnerships"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/research/market-landscape.md"
    required: true
  - path: "gtm-grimoire/research/competitive-analysis.md"
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
  - path: "gtm-grimoire/strategy/partnership-strategy.md"
    type: "file"
    description: "Partnership and BD strategy"

mode:
  default: "foreground"
  background: true
---

# Plan Partnerships

## Purpose

Develop partnership and business development strategy.
Identifies strategic partners, integration opportunities, and BD priorities.

## Invocation

```
/plan-partnerships
/plan-partnerships background
```

## Agent

Routes to `building-partnerships` skill - BD Lead persona.

## Prerequisites

- Market research complete (`/analyze-market`)
- Positioning defined (`/position`)

## Outputs

`gtm-grimoire/strategy/partnership-strategy.md` containing:
- Partner categories
- Target partner profiles
- Integration opportunities
- Outreach strategy
- Partnership tiers

## Next Steps

After partnership planning:
- `/plan-devrel` for developer education
- `/plan-launch` for launch planning
