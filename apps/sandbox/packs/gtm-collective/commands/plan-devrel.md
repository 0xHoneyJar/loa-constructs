---
name: "plan-devrel"
version: "1.0.0"
description: |
  Develop developer relations and education strategy.
  Routes to educating-developers skill for execution.

arguments: []

agent: "educating-developers"
agent_path: ".claude/skills/educating-developers"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/context/product-reality.md"
    required: false
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
  - path: "gtm-grimoire/strategy/devrel-strategy.md"
    type: "file"
    description: "Developer relations strategy"

mode:
  default: "foreground"
  background: true
---

# Plan DevRel

## Purpose

Develop developer relations and education strategy.
Creates comprehensive plan for developer engagement, documentation, and community.

## Invocation

```
/plan-devrel
/plan-devrel background
```

## Agent

Routes to `educating-developers` skill - DevRel Lead persona.

## Prerequisites

- ICP profiles complete (`/analyze-market`)
- Positioning defined (`/position`)

## Outputs

`gtm-grimoire/strategy/devrel-strategy.md` containing:
- Documentation strategy
- Tutorial and guide plan
- Community building approach
- Developer experience priorities
- Content calendar

## Next Steps

After DevRel planning:
- `/plan-launch` for launch planning
- `/review-gtm` for strategy review
