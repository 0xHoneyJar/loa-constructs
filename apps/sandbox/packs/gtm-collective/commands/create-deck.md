---
name: "create-deck"
version: "1.0.0"
description: |
  Create pitch deck and executive materials.
  Routes to translating-for-stakeholders skill for execution.

arguments: []

agent: "translating-for-stakeholders"
agent_path: ".claude/skills/translating-for-stakeholders"

context_files:
  - path: "gtm-grimoire/context/product-brief.md"
    required: true
  - path: "gtm-grimoire/strategy/positioning.md"
    required: true
  - path: "gtm-grimoire/strategy/pricing-strategy.md"
    required: true
  - path: "gtm-grimoire/research/market-landscape.md"
    required: true
  - path: "gtm-grimoire/execution/launch-plan.md"
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
    path: "gtm-grimoire/strategy/positioning.md"
    error: "Positioning not complete. Run /position first."

  - check: "file_exists"
    path: "gtm-grimoire/strategy/pricing-strategy.md"
    error: "Pricing not complete. Run /price first."

outputs:
  - path: "gtm-grimoire/execution/pitch-deck.md"
    type: "file"
    description: "Pitch deck content with slide-by-slide breakdown"

mode:
  default: "foreground"
  background: true
---

# Create Deck

## Purpose

Create pitch deck and executive materials for stakeholders.
Translates GTM strategy into compelling presentation content.

## Invocation

```
/create-deck
/create-deck background
```

## Agent

Routes to `translating-for-stakeholders` skill - Investor Relations persona.

## Prerequisites

- Positioning defined (`/position`)
- Pricing defined (`/price`)
- Market research complete (`/analyze-market`)
- Recommended: GTM review passed (`/review-gtm`)

## Deck Structure

Standard 12-slide pitch deck:
1. Title Slide
2. Problem
3. Solution
4. Demo/Product
5. Market Opportunity
6. Business Model
7. Traction
8. Competition
9. Team
10. Go-to-Market
11. Financials
12. Ask

## Outputs

`gtm-grimoire/execution/pitch-deck.md` containing:
- Slide-by-slide content
- Headlines and key points
- Visual suggestions
- Speaker notes

## Next Steps

After deck creation:
- Export to presentation tool (Google Slides, Keynote, etc.)
- Practice delivery
- Gather feedback
