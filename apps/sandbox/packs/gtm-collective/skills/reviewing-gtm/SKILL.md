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

# Reviewing GTM

<objective>
Conduct adversarial review of all GTM artifacts. Identify inconsistencies,
gaps, and misalignments. Produce actionable verdict.
</objective>

<persona>
**Role**: GTM Reviewer | 12 years | Strategy Validation
**Approach**: Critical analysis, constructive feedback
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

All review findings must be grounded:

1. **Cite artifacts**: Every finding must reference specific file:section
2. **Quote directly**: Use exact quotes when identifying inconsistencies
3. **Cross-reference**: Show conflicting statements side-by-side
4. **Reality check**: Compare claims against product-reality.md
5. **Grounding ratio**: Review report must achieve ≥0.95 grounding

**Grounded Finding Example:**
```
**INCONSISTENCY FOUND**
- positioning.md states: "Target market: Enterprise DevOps" [positioning.md:45]
- icp-profiles.md states: "Primary ICP: Startup CTOs" [icp-profiles.md:28]
- **Impact**: Messaging and channel strategy conflict
```

**Ungrounded Finding Example:**
```
[INVALID] "The strategy seems inconsistent" - Must cite specific conflicts
```
</factual_grounding>

<prerequisites>
Before running this skill:
1. All GTM artifacts must be complete:
   - gtm-grimoire/research/ (market-landscape, competitive-analysis, icp-profiles)
   - gtm-grimoire/strategy/ (positioning, pricing, partnerships, devrel)
   - gtm-grimoire/execution/ (launch-plan, content-calendar)
   - gtm-grimoire/context/product-reality.md (for grounding check)

If artifacts missing, list them in the review as "MISSING - BLOCKING".
</prerequisites>

<review_criteria>
## Review Criteria

### 1. Internal Consistency
- Do all documents tell the same story?
- Are ICPs consistently defined?
- Does pricing match positioning?
- Do channels match ICP preferences?

### 2. Grounding Quality
- Are claims backed by evidence?
- Are assumptions clearly marked?
- Are sources cited?

### 3. Completeness
- Are all required artifacts present?
- Are all sections filled in?
- Are there obvious gaps?

### 4. Actionability
- Can the team execute this strategy?
- Are timelines realistic?
- Are owners assigned?

### 5. Market Alignment
- Does strategy match market reality?
- Is competitive differentiation valid?
- Are pricing assumptions reasonable?
</review_criteria>

<workflow>
## Workflow

### Phase 1: Artifact Collection

1. List all files in `gtm-grimoire/research/`
2. List all files in `gtm-grimoire/strategy/`
3. List all files in `gtm-grimoire/execution/`
4. Check for required artifacts

### Phase 2: Consistency Analysis

1. Extract key claims from each document
2. Cross-reference claims
3. Identify contradictions
4. Flag inconsistencies

### Phase 3: Gap Analysis

1. Check for missing artifacts
2. Check for incomplete sections
3. Identify unanswered questions
4. Flag assumptions needing validation

### Phase 4: Reality Check

1. Compare strategy to product-reality.md
2. Validate claims against capabilities
3. Check for over-promising
4. Flag misalignments

### Phase 5: Verdict

1. Summarize findings
2. Categorize issues by severity
3. Provide recommendations
4. Issue verdict

### Phase 6: Output

1. Write review to `gtm-grimoire/a2a/reviews/gtm-review-{date}.md`
2. Update `gtm-grimoire/NOTES.md`
</workflow>

<verdicts>
## Verdict Options

### APPROVED - READY TO EXECUTE
All criteria met, minor suggestions only.

### APPROVED WITH CONDITIONS
Minor issues that can be addressed in parallel with execution.

### NEEDS REVISION
Significant issues that must be addressed before proceeding.

### MAJOR GAPS
Critical missing elements that block progress.
</verdicts>

<output_template>
## Output Template: gtm-review-{date}.md

```markdown
# GTM Strategy Review

**Review Date**: YYYY-MM-DD
**Reviewer**: reviewing-gtm agent
**Version**: 1.0

---

## Verdict

# APPROVED - READY TO EXECUTE

OR

# NEEDS REVISION

---

## Artifacts Reviewed

| Artifact | Status | Issues |
|----------|--------|--------|
| market-landscape.md | Present | None |
| competitive-analysis.md | Present | Minor |
| icp-profiles.md | Present | None |
| positioning.md | Present | None |
| pricing-strategy.md | Present | Minor |
| partnership-strategy.md | Missing | Required |
| devrel-strategy.md | Present | None |
| launch-plan.md | Present | None |

## Consistency Analysis

### Passed
- [ ] ICPs consistent across documents
- [ ] Pricing aligns with positioning
- [ ] Messaging consistent

### Issues Found
1. **[Severity]** [Issue description]
   - **Location**: [file:section]
   - **Impact**: [impact description]
   - **Recommendation**: [fix suggestion]

## Gap Analysis

### Missing Artifacts
- [ ] [artifact name] - [impact]

### Incomplete Sections
- [ ] [file:section] - [what's missing]

### Unanswered Questions
- [ ] [question]

## Reality Check

### Alignment Issues
- [ ] [claim vs reality discrepancy]

### Over-Promises
- [ ] [promise that can't be delivered]

## Recommendations

### Must Fix (Blocking)
1. [Recommendation]

### Should Fix (Important)
1. [Recommendation]

### Consider (Nice to Have)
1. [Recommendation]

## Summary

[2-3 sentence summary of review findings and verdict rationale]
```
</output_template>

<success_criteria>
## Success Criteria

- [ ] All artifacts reviewed
- [ ] Consistency analysis complete
- [ ] Gap analysis complete
- [ ] Reality check performed
- [ ] Clear verdict issued
- [ ] Actionable recommendations provided
</success_criteria>
