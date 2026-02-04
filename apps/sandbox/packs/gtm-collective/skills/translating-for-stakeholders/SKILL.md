---
parallel_threshold: 5000
timeout_minutes: 45
zones:
  system:
    path: .claude
    permission: none
  state:
    paths: [gtm-grimoire, loa-grimoire, .beads]
    permission: read-write
  app:
    paths: [src, lib, app]
    permission: read
---

# Translating for Stakeholders

<objective>
Create compelling pitch deck and executive materials that translate technical
GTM strategy into stakeholder-ready presentations.
</objective>

<persona>
**Role**: Investor Relations | 10 years | Fundraising & Board Communications
**Approach**: Compelling narratives, clear metrics
</persona>

<zone_constraints>
## Zone Constraints

This skill operates under **Managed Scaffolding**:

| Zone | Permission | Notes |
|------|------------|-------|
| `.claude/` | NONE | System zone - never suggest edits |
| `gtm-grimoire/`, `loa-grimoire/`, `.beads/` | Read/Write | State zone |
| `src/`, `lib/`, `app/` | Read-only | App zone |

**NEVER** suggest modifications to `.claude/`.
</zone_constraints>

<factual_grounding>
## Factual Grounding (MANDATORY)

All pitch content must be grounded in GTM artifacts:

1. **Market data**: Cite market-landscape.md for TAM/SAM/SOM
2. **Positioning**: Cite positioning.md for value props and differentiation
3. **Pricing**: Cite pricing-strategy.md for business model
4. **Competition**: Cite competitive-analysis.md for market position
5. **Flag assumptions**: Prefix projections with `[PROJECTION]`
6. **Grounding ratio**: Target ≥0.95 for all outputs

**Grounded Example:**
```
TAM: $15B market opportunity (Source: Gartner 2024)
[Reference: gtm-grimoire/research/market-landscape.md#tam]
```

**Ungrounded Example:**
```
[PROJECTION] Year 3 revenue: $10M ARR (based on 5% market capture assumption)
```

**Note**: Financial projections are inherently ungrounded and MUST be marked as `[PROJECTION]`.
</factual_grounding>

<prerequisites>
Before running this skill:
1. GTM Review must be complete and APPROVED
2. Required artifacts:
   - gtm-grimoire/research/market-landscape.md (TAM/SAM/SOM)
   - gtm-grimoire/strategy/positioning.md (messaging)
   - gtm-grimoire/strategy/pricing-strategy.md (business model)
   - gtm-grimoire/research/competitive-analysis.md (differentiation)
   - gtm-grimoire/execution/launch-plan.md (GTM timeline)
   - gtm-grimoire/a2a/reviews/gtm-review-*.md (approval)

If GTM not approved, direct user to `/review-gtm` first.
</prerequisites>

<deck_structure>
## Standard Pitch Deck Structure

1. **Title Slide** - Company, tagline, contact
2. **Problem** - Pain point you're solving
3. **Solution** - Your product/approach
4. **Demo/Product** - How it works
5. **Market** - TAM/SAM/SOM
6. **Business Model** - How you make money
7. **Traction** - Metrics, milestones
8. **Competition** - Differentiation
9. **Team** - Why you'll win
10. **Go-to-Market** - How you'll grow
11. **Financials** - Projections, asks
12. **Ask** - What you need
</deck_structure>

<workflow>
## Workflow

### Phase 1: Content Synthesis

1. Read positioning for messaging
2. Read market research for opportunity
3. Read pricing for business model
4. Read launch plan for GTM
5. Identify key metrics

### Phase 2: Narrative Development

1. Define core story arc
2. Identify hero metrics
3. Create compelling headlines
4. Develop proof points

### Phase 3: Slide Development

For each slide:
1. Headline (one clear message)
2. Key points (3-5 max)
3. Visual suggestion
4. Speaker notes

### Phase 4: Output

1. Write `gtm-grimoire/execution/pitch-deck.md`
2. Update `gtm-grimoire/NOTES.md`
</workflow>

<output_template>
## Output Template: pitch-deck.md

```markdown
# Pitch Deck

**Company**: [Name]
**Version**: 1.0
**Date**: YYYY-MM-DD
**Contact**: [email]

---

## Slide 1: Title

**Headline**: [Company Name]
**Tagline**: [One-line value prop]
**Visual**: Logo, clean design

**Speaker Notes**:
[What to say when presenting this slide]

---

## Slide 2: Problem

**Headline**: [Problem statement as headline]

**Key Points**:
- [Pain point 1] - [supporting stat if available]
- [Pain point 2] - [supporting stat if available]
- [Pain point 3] - [supporting stat if available]

**Visual**: [Suggestion for visual representation]

**Speaker Notes**:
[Narrative for this slide]

---

## Slide 3: Solution

**Headline**: [Solution statement as headline]

**Key Points**:
- [Solution aspect 1]
- [Solution aspect 2]
- [Solution aspect 3]

**Visual**: Product screenshot or diagram

**Speaker Notes**:
[How to present the solution]

---

## Slide 4: Product Demo

**Headline**: [Product headline]

**Demo Flow**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Visual**: Screenshots or GIF

**Speaker Notes**:
[Demo talking points]

---

## Slide 5: Market Opportunity

**Headline**: $[TAM] Market Opportunity

**Key Points**:
- **TAM**: $[X]B - [description]
- **SAM**: $[X]B - [description]
- **SOM**: $[X]M - [description]

**Visual**: TAM/SAM/SOM diagram

**Speaker Notes**:
[Market narrative]

---

## Slide 6: Business Model

**Headline**: [Business model headline]

**Key Points**:
- [Pricing model summary]
- [Key metrics: LTV, CAC, etc.]
- [Revenue drivers]

**Visual**: Pricing table or unit economics

**Speaker Notes**:
[How we make money]

---

## Slide 7: Traction

**Headline**: [Traction headline with key metric]

**Key Metrics**:
| Metric | Value | Growth |
|--------|-------|--------|
| | | |

**Milestones**:
- [Milestone 1]
- [Milestone 2]

**Visual**: Growth chart

**Speaker Notes**:
[Traction narrative]

---

## Slide 8: Competition

**Headline**: [Differentiation headline]

**Positioning**:
[2x2 matrix or comparison description]

**Key Differentiators**:
- [Differentiator 1]
- [Differentiator 2]

**Visual**: 2x2 matrix or feature comparison

**Speaker Notes**:
[Competitive narrative - how to handle questions]

---

## Slide 9: Team

**Headline**: Experienced Team

**Key Members**:
- **[Name]** - [Role] - [Credential]
- **[Name]** - [Role] - [Credential]

**Why We'll Win**:
[Team's unique advantage]

**Visual**: Team photos

**Speaker Notes**:
[Team story]

---

## Slide 10: Go-to-Market

**Headline**: [GTM headline]

**Strategy**:
- [Channel 1]: [approach]
- [Channel 2]: [approach]

**Timeline**:
| Phase | Focus | Target |
|-------|-------|--------|
| | | |

**Visual**: GTM funnel or timeline

**Speaker Notes**:
[GTM narrative]

---

## Slide 11: Financials

**Headline**: [Financial headline]

**Projections**:
| Year | Revenue | Growth |
|------|---------|--------|
| | | |

**Key Assumptions**:
- [Assumption 1]
- [Assumption 2]

**Visual**: Revenue chart

**Speaker Notes**:
[Financial narrative]

---

## Slide 12: Ask

**Headline**: [Ask headline]

**The Ask**:
- **Amount**: $[X]
- **Use of Funds**:
  - [Use 1]: [%]
  - [Use 2]: [%]

**Milestones This Enables**:
- [Milestone 1]
- [Milestone 2]

**Visual**: Use of funds pie chart

**Speaker Notes**:
[Closing narrative]

---

## Appendix

### Additional Slides (as needed)
- Detailed product architecture
- Case studies
- Extended financials
- FAQ responses
```
</output_template>

<success_criteria>
## Success Criteria

- [ ] All 12 core slides developed
- [ ] Clear headlines for each slide
- [ ] Key points limited to 3-5 per slide
- [ ] Visual suggestions included
- [ ] Speaker notes provided
- [ ] Consistent narrative arc
</success_criteria>
