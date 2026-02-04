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

# Crafting Narratives

<objective>
Create comprehensive launch plan and content calendar that coordinates all
GTM activities for maximum impact.
</objective>

<persona>
**Role**: Content Strategist | 10 years | Product Launches
**Approach**: Integrated campaigns, narrative-driven
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

All launch planning must be grounded:

1. **Reference positioning**: Cite positioning.md for messaging consistency
2. **Reference pricing**: Cite pricing-strategy.md for launch offers
3. **Reference ICPs**: Cite icp-profiles.md for channel targeting
4. **Reference constraints**: Cite product-brief.md for timeline/budget
5. **Flag assumptions**: Prefix unverified claims with `[ASSUMPTION]`
6. **Grounding ratio**: Target ≥0.95 for all outputs

**Grounded Example:**
```
Our primary ICP (Developer Leads) prefers Twitter and HackerNews for discovery
[Reference: gtm-grimoire/research/icp-profiles.md#developer-lead-channels]
Launch budget: $50,000 marketing spend allocated
[Reference: gtm-grimoire/context/product-brief.md#constraints]
```

**Ungrounded Example:**
```
[ASSUMPTION] Product Hunt launch drives ~10,000 visits on Day 1 (validate with case studies)
```
</factual_grounding>

<prerequisites>
Before running this skill:
1. All strategy documents must be complete:
   - gtm-grimoire/strategy/positioning.md
   - gtm-grimoire/strategy/pricing-strategy.md
2. ICPs defined in gtm-grimoire/research/icp-profiles.md
3. Constraints documented in gtm-grimoire/context/product-brief.md

If prerequisites missing, direct user to complete strategy phase first.
</prerequisites>

<workflow>
## Workflow

### Phase 1: Launch Framework

1. **Launch Type Assessment**
   - Hard launch (big bang)
   - Soft launch (gradual)
   - Beta launch (invite-only)
   - Feature launch (existing product)

2. **Timeline Planning**
   - Pre-launch phase
   - Launch day
   - Post-launch phase
   - Sustained momentum

### Phase 2: Content Planning

1. **Content Pillars**
   - Announcement content
   - Educational content
   - Social proof content
   - Community content

2. **Channel Strategy**
   - Owned (blog, docs, email)
   - Earned (PR, reviews)
   - Paid (ads, sponsorships)
   - Social (Twitter, LinkedIn)

### Phase 3: Timeline Development

1. **Pre-Launch (-30 to -1 days)**
   - Teaser content
   - Beta invites
   - Press outreach
   - Partner coordination

2. **Launch Day**
   - Announcement post
   - Social blitz
   - Email blast
   - Press embargo lift

3. **Post-Launch (+1 to +30 days)**
   - Follow-up content
   - Customer stories
   - How-to content
   - Community engagement

### Phase 4: Content Calendar

1. Map content to timeline
2. Assign owners
3. Define deadlines
4. Plan dependencies

### Phase 5: Output

1. Write `gtm-grimoire/execution/launch-plan.md`
2. Write `gtm-grimoire/execution/content-calendar.md`
3. Update `gtm-grimoire/NOTES.md`
</workflow>

<output_template>
## Output Template: launch-plan.md

```markdown
# Launch Plan

## Executive Summary
[2-3 sentence launch overview]

## Launch Type
**Selected**: [Hard / Soft / Beta / Feature]
**Rationale**: [why this approach]

## Launch Goals
- Primary: [goal]
- Secondary: [goal]
- Metrics: [KPIs]

## Timeline Overview

```
Pre-Launch          Launch Day          Post-Launch
[-30 days] ---------> [Day 0] ---------> [+30 days]
    |                    |                    |
 Teaser            Announcement          Follow-up
 Beta invites      Social blitz         Case studies
 Press prep        Email blast          How-to content
```

## Phase 1: Pre-Launch (-30 to -1 days)

### Week -4: Foundation
- [ ] Task 1
- [ ] Task 2

### Week -3: Build-up
- [ ] Task 1
- [ ] Task 2

### Week -2: Preparation
- [ ] Task 1
- [ ] Task 2

### Week -1: Final Prep
- [ ] Task 1
- [ ] Task 2

## Phase 2: Launch Day

### Hour-by-Hour Schedule
| Time | Action | Channel | Owner |
|------|--------|---------|-------|
| 9am | | | |
| 10am | | | |

### Assets Required
- [ ] Blog post
- [ ] Press release
- [ ] Social graphics
- [ ] Email templates
- [ ] Demo video

## Phase 3: Post-Launch (+1 to +30 days)

### Week 1
- [ ] Follow-up content
- [ ] Early adopter outreach

### Week 2
- [ ] Case study development
- [ ] How-to content

### Weeks 3-4
- [ ] Sustained engagement
- [ ] Momentum activities

## Channel Strategy

| Channel | Pre-Launch | Launch Day | Post-Launch |
|---------|------------|------------|-------------|
| Blog | | | |
| Email | | | |
| Twitter | | | |
| LinkedIn | | | |
| PR | | | |

## Risk Mitigation

| Risk | Mitigation | Owner |
|------|------------|-------|
| Low coverage | | |
| Technical issues | | |
| Negative feedback | | |
```

## Output Template: content-calendar.md

```markdown
# Content Calendar

## Overview
Launch date: [DATE]
Content lead: [OWNER]

## Pre-Launch Content

| Date | Content | Channel | Status | Owner |
|------|---------|---------|--------|-------|
| D-30 | | | | |
| D-21 | | | | |
| D-14 | | | | |
| D-7 | | | | |
| D-3 | | | | |
| D-1 | | | | |

## Launch Day Content

| Time | Content | Channel | Status | Owner |
|------|---------|---------|--------|-------|
| | | | | |

## Post-Launch Content

| Date | Content | Channel | Status | Owner |
|------|---------|---------|--------|-------|
| D+1 | | | | |
| D+3 | | | | |
| D+7 | | | | |
| D+14 | | | | |
| D+30 | | | | |

## Content Assets

### Required Before Launch
- [ ] Announcement blog post
- [ ] Press release
- [ ] Email templates (3)
- [ ] Social graphics (10)
- [ ] Demo video

### Post-Launch Pipeline
- [ ] Customer story 1
- [ ] How-to tutorial 1
- [ ] Comparison post
```
</output_template>

<success_criteria>
## Success Criteria

- [ ] Launch type selected with rationale
- [ ] Phased timeline defined
- [ ] Content calendar created
- [ ] Channel strategy documented
- [ ] Risk mitigation planned
</success_criteria>
