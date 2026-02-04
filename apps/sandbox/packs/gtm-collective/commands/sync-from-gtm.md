---
name: "sync-from-gtm"
version: "1.0.0"
description: |
  Push GTM requirements to development context.
  Creates gtm-requirements.md with positioning and ICP insights.

arguments:
  - name: "suggest-prd"
    type: "boolean"
    required: false
    description: "Generate PRD update suggestions"

agent: null
command_type: "wizard"

context_files:
  - path: "gtm-grimoire/strategy/positioning.md"
    required: false
  - path: "gtm-grimoire/research/icp-profiles.md"
    required: false
  - path: "gtm-grimoire/strategy/pricing.md"
    required: false

pre_flight:
  - check: "file_exists"
    path: ".loa-setup-complete"
    error: "Loa setup has not been completed. Run /setup first."

  - check: "dir_exists"
    path: "gtm-grimoire"
    error: "GTM Collective not installed. Run mount-gtm.sh first."

  - check: "dir_exists"
    path: "loa-grimoire"
    error: "Loa grimoire not found. Initialize development workflow first."

outputs:
  - path: "loa-grimoire/context/gtm-requirements.md"
    type: "file"
    description: "GTM requirements for dev team"
  - path: "gtm-grimoire/NOTES.md"
    type: "append"
    description: "Sync timestamp logged"

mode:
  default: "foreground"
  background: false
---

# Sync From GTM

## Purpose

Push GTM strategy insights to development context. This ensures dev team understands
market requirements and positioning constraints when making technical decisions.

## Invocation

```
/sync-from-gtm
/sync-from-gtm suggest-prd
```

## When to Use

- After completing market research (`/analyze-market`)
- After positioning is defined (`/position`)
- After ICP profiles are created
- When GTM needs feature prioritization from dev

## Workflow

### Step 1: Read GTM Artifacts

Scan and read GTM strategy documents:
1. `gtm-grimoire/strategy/positioning.md` - Positioning strategy
2. `gtm-grimoire/research/icp-profiles.md` - Ideal Customer Profiles
3. `gtm-grimoire/strategy/pricing.md` - Pricing strategy
4. `gtm-grimoire/research/market-analysis.md` - Market research
5. `gtm-grimoire/context/product-brief.md` - Product brief

### Step 2: Extract GTM Requirements

From positioning, extract:
- Key differentiators that need technical support
- Positioning claims requiring feature validation
- Competitive gaps to address

From ICP profiles, extract:
- Use cases that must be supported
- Integration requirements per ICP
- Performance expectations per segment

From pricing, extract:
- Feature tiering requirements
- Usage-based requirements (if applicable)
- Free tier scope

### Step 3: Generate GTM Requirements Document

Create `loa-grimoire/context/gtm-requirements.md`:

```markdown
# GTM Requirements for Development

**Synced From**: gtm-grimoire/
**Last Sync**: YYYY-MM-DD HH:MM UTC
**GTM Strategy Version**: [version/date]

## Executive Summary

Brief overview of GTM strategy and what it requires from the product.

## Positioning Requirements

### Key Differentiators (Must Support)

These positioning claims require technical backing:

| Claim | Technical Requirement | Status |
|-------|----------------------|--------|
| [Positioning claim 1] | [What product must do] | Verify |
| [Positioning claim 2] | [What product must do] | Verify |

### Claims to Avoid

These are NOT current capabilities (per product-reality.md):
- [Feature X] - Planned for [sprint/timeline]
- [Feature Y] - Not on roadmap

## ICP Requirements

### [ICP 1 Name]

**Use Cases**:
- [Use case 1] - [technical requirement]
- [Use case 2] - [technical requirement]

**Integrations Needed**:
- [Integration 1]
- [Integration 2]

**Performance Expectations**:
- [Metric]: [threshold]

### [ICP 2 Name]

[Same structure as ICP 1]

## Feature Tier Requirements

### Free Tier
Must include:
- [Feature list for free tier]

### Paid Tier
Must include:
- [Feature list for paid tier]

### Enterprise Tier (if applicable)
Must include:
- [Feature list for enterprise]

## Prioritized Feature Requests

Based on GTM strategy, these features are critical:

| Priority | Feature | Reason | Target |
|----------|---------|--------|--------|
| P0 | [Feature] | Launch blocker | Sprint X |
| P1 | [Feature] | Positioning enabler | Sprint Y |
| P2 | [Feature] | Future positioning | Backlog |

## PRD Update Suggestions

[If suggest-prd flag is set, generate specific PRD amendments]

### Suggested Additions

1. **User Story**: As a [ICP], I want [feature] so that [benefit]
   - **Source**: GTM positioning requirement
   - **Priority**: P[X]

2. **Success Metric**: [Metric from GTM KPIs]
   - **Source**: GTM strategy
   - **Target**: [value]

### Suggested Modifications

1. **Section**: [PRD section]
   - **Current**: [current text]
   - **Suggested**: [updated text]
   - **Reason**: [GTM alignment reason]

---
**NOTE**: This document is generated from GTM strategy. PRD modifications require
human approval - this is a suggestion, not an automatic update.

*Synced via /sync-from-gtm on YYYY-MM-DD*
```

### Step 4: Log Sync

Append to `gtm-grimoire/NOTES.md`:

```markdown
## Dev Sync Status

| Timestamp | Direction | Summary |
|-----------|-----------|---------|
| YYYY-MM-DD HH:MM | gtm→dev | Pushed [N] positioning requirements, [M] ICP use cases |
```

### Step 5: Conflict Detection

Check for conflicts between GTM requirements and product-reality.md:
- GTM claims vs actual capabilities
- ICP requirements vs technical limitations
- Pricing tiers vs feature availability

List conflicts for resolution but do NOT auto-modify either source.

## Output Summary

After sync completes, display:
- Requirements extracted (positioning, ICP, pricing)
- Files created/updated
- Conflicts detected (if any)
- Suggested next steps

## Next Steps

After syncing:
- Review `gtm-requirements.md` with dev team
- If PRD updates needed, manually apply suggestions
- Run `/sync-from-dev` after PRD updates (bidirectional sync)

## No Auto-Modification Policy

This command NEVER modifies:
- `loa-grimoire/prd.md` - Requires explicit human edit
- `loa-grimoire/sdd.md` - Requires explicit human edit
- `loa-grimoire/sprint.md` - Requires explicit human edit

All changes are suggestions only. Human approval required.
