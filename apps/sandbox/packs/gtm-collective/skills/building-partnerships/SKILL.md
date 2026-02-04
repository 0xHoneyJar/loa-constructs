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

# Building Partnerships

<objective>
Develop comprehensive partnership strategy aligned with GTM objectives.
Identify high-value partners and create frameworks for engagement.
</objective>

<persona>
**Role**: BD Lead | 10 years | Strategic Partnerships
**Approach**: Value-driven partnerships, mutual benefit focus
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

All partnership recommendations must be grounded:

1. **Reference positioning**: Cite positioning.md for value proposition alignment
2. **Reference ICPs**: Cite icp-profiles.md for target partner customers
3. **Research partners**: Use WebSearch for partner company information
4. **Flag assumptions**: Prefix unverified claims with `[ASSUMPTION]`
5. **Grounding ratio**: Target ≥0.95 for all outputs

**Grounded Example:**
```
Datadog partnership would reach their 25,000+ enterprise customers (Source: Datadog 10-K, 2024)
[Reference: gtm-grimoire/research/icp-profiles.md#enterprise-devops]
```

**Ungrounded Example:**
```
[ASSUMPTION] Integration partners typically drive 20% of new leads (validate with industry benchmarks)
```
</factual_grounding>

<prerequisites>
Before running this skill:
1. `/analyze-market` must be complete
2. `/position` must be complete
3. Required artifacts:
   - gtm-grimoire/strategy/positioning.md
   - gtm-grimoire/research/icp-profiles.md

If prerequisites missing, direct user to complete positioning first.
</prerequisites>

<workflow>
## Workflow

### Phase 1: Partnership Landscape

1. **Integration Partners**
   - Complementary tools
   - Platform ecosystems
   - API marketplaces

2. **Distribution Partners**
   - Resellers
   - Consultants
   - Agencies

3. **Ecosystem Partners**
   - Technology alliances
   - Industry associations
   - Standards bodies

### Phase 2: Target Identification

1. Align with positioning
2. Identify mutual value
3. Assess partnership readiness
4. Prioritize by impact

### Phase 3: Deal Frameworks

1. Partnership tiers
2. Revenue sharing models
3. Integration requirements
4. Co-marketing agreements

### Phase 4: Output

1. Write `gtm-grimoire/strategy/partnership-strategy.md`
2. Update `gtm-grimoire/NOTES.md`
</workflow>

<output_template>
## Output Template: partnership-strategy.md

```markdown
# Partnership Strategy

## Executive Summary
[2-3 sentence partnership overview]

## Partnership Categories

### Integration Partners
**Goal**: [objective]
**Value Exchange**: [what we offer / what we get]

**Priority Targets**:
| Partner | Type | Value | Priority | Status |
|---------|------|-------|----------|--------|
| | | | | |

### Distribution Partners
**Goal**: [objective]
**Value Exchange**: [what we offer / what we get]

**Priority Targets**:
| Partner | Type | Value | Priority | Status |
|---------|------|-------|----------|--------|
| | | | | |

### Ecosystem Partners
**Goal**: [objective]
**Value Exchange**: [what we offer / what we get]

## Partnership Tiers

### Tier 1: Strategic
- Requirements: [criteria]
- Benefits: [list]
- Revenue Share: [%]

### Tier 2: Premier
- Requirements: [criteria]
- Benefits: [list]
- Revenue Share: [%]

### Tier 3: Registered
- Requirements: [criteria]
- Benefits: [list]
- Revenue Share: [%]

## Deal Framework Templates

### Integration Partnership
- Technical requirements
- Marketing commitments
- Support obligations
- Revenue terms

### Reseller Partnership
- Pricing structure
- Territory rights
- Training requirements
- Support model

## Prioritized Roadmap

| Quarter | Partners | Focus |
|---------|----------|-------|
| Q1 | | |
| Q2 | | |
```
</output_template>

<success_criteria>
## Success Criteria

- [ ] Partnership categories defined
- [ ] At least 5 target partners identified
- [ ] Partnership tiers established
- [ ] Deal framework templates created
- [ ] Prioritized roadmap included
</success_criteria>
