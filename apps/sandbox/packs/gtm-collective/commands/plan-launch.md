---
name: "plan-launch"
version: "1.0.0"
description: |
  Create comprehensive launch plan and content strategy.
  Routes to crafting-narratives skill for execution.

arguments: []

agent: "crafting-narratives"
agent_path: ".claude/skills/crafting-narratives"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/strategy/positioning.md"
    required: true
  - path: "gtm-grimoire/strategy/pricing-strategy.md"
    required: true
  - path: "gtm-grimoire/strategy/partnership-strategy.md"
    required: false
  - path: "gtm-grimoire/strategy/devrel-strategy.md"
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
    path: "gtm-grimoire/strategy/pricing-strategy.md"
    error: "Pricing not complete. Run /price first."

outputs:
  - path: "gtm-grimoire/execution/launch-plan.md"
    type: "file"
    description: "Comprehensive launch plan"
  - path: "gtm-grimoire/execution/content-calendar.md"
    type: "file"
    description: "Content calendar for launch"

mode:
  default: "foreground"
  background: true
---

# Plan Launch

## Purpose

Create comprehensive launch plan and content strategy.
Synthesizes all GTM strategy into actionable launch execution plan.

## Invocation

```
/plan-launch
/plan-launch background
```

## Agent

Routes to `crafting-narratives` skill - Content Strategist persona.

## Prerequisites

- Positioning defined (`/position`)
- Pricing defined (`/price`)
- Optional: Partnership and DevRel strategies

## Outputs

Two execution documents:
1. `gtm-grimoire/execution/launch-plan.md` - Launch timeline and activities
2. `gtm-grimoire/execution/content-calendar.md` - Content schedule

## Next Steps

After launch planning:
- `/review-gtm` for comprehensive strategy review
- `/create-deck` for stakeholder presentation
