---
name: "gtm-setup"
version: "1.0.0"
description: |
  Initialize GTM Collective for a new product.
  Gathers product information and creates context for GTM workflow.

arguments: []

agent: null
command_type: "wizard"

context_files: []

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
    description: "Product brief for GTM workflow"

mode:
  default: "foreground"
  background: false
---

# GTM Setup

## Purpose

Initialize GTM Collective workflow for a new product. Gathers essential
product information to kickstart go-to-market planning.

## Invocation

```
/gtm-setup
```

## Workflow

This is an interactive wizard that gathers:

1. **Product Description**: What does the product do?
2. **Target Market**: Who is this for?
3. **Known Competitors**: Who else solves this problem?
4. **Constraints**: Budget, timeline, team size
5. **Launch Goals**: What does success look like?

## Wizard Flow

### Step 1: Product Description

Ask the user:
- What is the product/feature you're launching?
- What problem does it solve?
- What makes it unique?

### Step 2: Target Market

Ask the user:
- Who is the primary target audience?
- What industry/vertical?
- Company size (startup, SMB, enterprise)?

### Step 3: Competitors

Ask the user:
- Who are known competitors?
- What are alternatives customers use today?
- What's your primary differentiation?

### Step 4: Constraints

Ask the user:
- What's the target launch timeframe?
- What's the marketing budget?
- What's the team size?

### Step 5: Goals

Ask the user:
- What are your launch goals? (signups, revenue, awareness)
- What metrics define success?

## Output

Create `gtm-grimoire/context/product-brief.md` with gathered information:

```markdown
# Product Brief

## Product Overview
[description]

## Target Market
[target audience details]

## Competitive Landscape
[competitors and differentiation]

## Constraints
[budget, timeline, team]

## Launch Goals
[success metrics]

---
*Created via /gtm-setup on [date]*
```

## Next Steps

After setup completes, suggest:
- `/analyze-market` to begin market research
- `/gtm-adopt` if they have existing dev artifacts (PRD/SDD)
