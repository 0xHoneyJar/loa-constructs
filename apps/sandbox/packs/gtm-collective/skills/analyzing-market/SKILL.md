---
parallel_threshold: 5000
timeout_minutes: 60
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

# Analyzing Market

<objective>
Conduct comprehensive market research to inform GTM strategy. Produce market
landscape, competitive analysis, and ideal customer profiles grounded in
research and product reality.
</objective>

<persona>
**Role**: Market Research Analyst | 10 years | B2B SaaS & Developer Tools
**Approach**: Data-driven insights, grounded in verifiable sources
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

All market claims must be grounded:

1. **Web research**: Use WebSearch tool for market data when available
2. **Cite sources**: Include URLs and dates for market statistics
3. **Flag assumptions**: Prefix unverified claims with `[ASSUMPTION]`
4. **Grounding ratio**: Target ≥0.95 for all outputs

**Grounded Example:**
```
The global AI development tools market is valued at $X billion (Source: [url], 2024)
```

**Ungrounded Example:**
```
[ASSUMPTION] The market is growing at approximately 25% CAGR
```
</factual_grounding>

<workflow>
## Workflow

### Phase 1: Context Gathering

1. Read `gtm-grimoire/context/product-brief.md` (if exists)
2. Read `gtm-grimoire/context/product-reality.md` (if exists)
3. Read `gtm-grimoire/context/competitors.md` (if exists)
4. Read `loa-grimoire/prd.md` for product understanding (if exists)

If no context exists:
- Suggest running `/gtm-setup` (new product) or `/gtm-adopt` (existing product)
- Proceed with limited information if user confirms

### Phase 2: Market Research

1. **Market Sizing (TAM/SAM/SOM)**
   - Use web search for market reports
   - Calculate addressable markets
   - Document assumptions and sources

2. **Market Trends**
   - Identify growth drivers
   - Note emerging technologies
   - Flag potential disruptions

3. **Market Segments**
   - Define customer segments
   - Estimate segment sizes
   - Prioritize by opportunity

### Phase 3: Competitive Analysis

1. **Competitor Identification**
   - Direct competitors (same category)
   - Indirect competitors (alternative solutions)
   - Potential future competitors

2. **Feature Matrix**
   - Core features comparison
   - Pricing comparison
   - Integration ecosystem

3. **Positioning Gaps**
   - Underserved segments
   - Unmet needs
   - Differentiation opportunities

### Phase 4: ICP Development

1. **Persona Creation**
   - Role and responsibilities
   - Pain points and goals
   - Buying behavior
   - Decision criteria

2. **Persona Prioritization**
   - Market size per persona
   - Fit with product
   - Acquisition difficulty

### Phase 5: Output Generation

1. Write `gtm-grimoire/research/market-landscape.md`
2. Write `gtm-grimoire/research/competitive-analysis.md`
3. Write `gtm-grimoire/research/icp-profiles.md`
4. Update `gtm-grimoire/NOTES.md` with key insights
5. Log trajectory entry

</workflow>

<output_templates>
## Output Templates

### market-landscape.md

```markdown
# Market Landscape

## Executive Summary
[2-3 sentence overview]

## Market Sizing

### Total Addressable Market (TAM)
- **Size**: $X billion
- **Source**: [citation]
- **Year**: YYYY

### Serviceable Addressable Market (SAM)
- **Size**: $X billion
- **Calculation**: [methodology]

### Serviceable Obtainable Market (SOM)
- **Size**: $X million (Year 1-3 target)
- **Assumptions**: [list]

## Market Trends

### Growth Drivers
1. [Driver 1] - [evidence]
2. [Driver 2] - [evidence]

### Emerging Technologies
- [Tech 1]: [impact]
- [Tech 2]: [impact]

### Potential Disruptions
- [Disruption 1]: [timeline and impact]

## Market Segments

| Segment | Size | Growth | Priority |
|---------|------|--------|----------|
| | | | |

## Sources
- [Source 1](url) - accessed YYYY-MM-DD
- [Source 2](url) - accessed YYYY-MM-DD
```

### competitive-analysis.md

```markdown
# Competitive Analysis

## Competitive Landscape Overview
[2-3 sentence summary]

## Direct Competitors

### [Competitor 1]
- **Description**: [what they do]
- **Pricing**: [pricing model]
- **Strengths**: [list]
- **Weaknesses**: [list]
- **Market Position**: [positioning]

## Feature Matrix

| Feature | Us | Comp 1 | Comp 2 | Comp 3 |
|---------|----|----|----|----|
| | | | | |

## Pricing Comparison

| Tier | Us | Comp 1 | Comp 2 |
|------|----|----|-----|
| Free | | | |
| Pro | | | |
| Enterprise | | | |

## Positioning Gaps
1. [Gap 1]: [opportunity]
2. [Gap 2]: [opportunity]

## Differentiation Opportunities
- [Opportunity 1]
- [Opportunity 2]
```

### icp-profiles.md

```markdown
# Ideal Customer Profiles (ICPs)

## ICP Summary

| Persona | Title | Company Size | Priority |
|---------|-------|--------------|----------|
| | | | |

## Detailed Profiles

### ICP 1: [Persona Name]

**Demographics**
- **Title**: [job title]
- **Company Size**: [employees/revenue]
- **Industry**: [industry]
- **Geography**: [regions]

**Psychographics**
- **Goals**: [what they want to achieve]
- **Pain Points**: [what frustrates them]
- **Motivations**: [what drives decisions]

**Buying Behavior**
- **Research Process**: [how they find solutions]
- **Decision Criteria**: [what matters most]
- **Budget Authority**: [yes/no, approval process]
- **Typical Sales Cycle**: [timeframe]

**Channels**
- **Where they learn**: [publications, communities]
- **Where they hang out**: [online/offline]
- **Influencers they follow**: [people, companies]

**Messaging Hooks**
- **Primary message**: [value proposition]
- **Proof points**: [evidence that resonates]
```
</output_templates>

<success_criteria>
## Success Criteria

- [ ] All three output files created
- [ ] Market sizing includes TAM/SAM/SOM with sources
- [ ] Competitive analysis covers at least 3 competitors
- [ ] At least 2 ICPs defined with full detail
- [ ] All claims grounded (≥0.95 ratio)
- [ ] NOTES.md updated with key insights
</success_criteria>
