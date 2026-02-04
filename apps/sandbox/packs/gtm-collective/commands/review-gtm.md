---
name: "review-gtm"
version: "1.0.0"
description: |
  Conduct adversarial review of all GTM artifacts.
  Routes to reviewing-gtm skill for execution.

arguments: []

agent: "reviewing-gtm"
agent_path: ".claude/skills/reviewing-gtm"

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

  - check: "dir_exists"
    path: "gtm-grimoire/research"
    error: "No research artifacts found. Run /analyze-market first."

  - check: "dir_exists"
    path: "gtm-grimoire/strategy"
    error: "No strategy artifacts found. Complete GTM strategy first."

outputs:
  - path: "gtm-grimoire/a2a/reviews/gtm-review-{date}.md"
    type: "file"
    description: "GTM strategy review with verdict"

mode:
  default: "foreground"
  background: true
---

# Review GTM

## Purpose

Conduct adversarial review of all GTM artifacts.
Identifies inconsistencies, gaps, and misalignments across all GTM documents.

## Invocation

```
/review-gtm
/review-gtm background
```

## Agent

Routes to `reviewing-gtm` skill - GTM Reviewer persona.

## Prerequisites

- Research artifacts present (`/analyze-market`)
- Strategy artifacts present (`/position`, `/price`, etc.)

## Review Criteria

1. **Internal Consistency** - Do all documents tell the same story?
2. **Grounding Quality** - Are claims backed by evidence?
3. **Completeness** - Are all required artifacts present?
4. **Actionability** - Can the team execute this strategy?
5. **Market Alignment** - Does strategy match market reality?

## Verdicts

- **APPROVED - READY TO EXECUTE** - All criteria met
- **APPROVED WITH CONDITIONS** - Minor issues, can proceed
- **NEEDS REVISION** - Significant issues, address before proceeding
- **MAJOR GAPS** - Critical missing elements

## Outputs

`gtm-grimoire/a2a/reviews/gtm-review-{date}.md` containing:
- Artifacts reviewed
- Consistency analysis
- Gap analysis
- Reality check
- Verdict and recommendations

## Next Steps

Based on verdict:
- **APPROVED**: `/create-deck` for stakeholder presentation
- **NEEDS REVISION**: Address feedback, re-run `/review-gtm`
