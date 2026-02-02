# Skill: auditing-content

> Analyze pages for LLM trust signals and retrieval resilience.

## Purpose

AI systems retrieve and reuse content in unpredictable ways. Content that lacks proper scoping, evidence, or context can be misquoted, leading to brand misrepresentation and FUD propagation.

This skill audits pages against a 5-layer trust model based on how LLMs evaluate and reuse information.

## Trigger

```
/audit-llm [path]
```

**Arguments:**
- `path` - The page path to audit (e.g., `/pricing`, `/security`, `docs/api.md`)

## Workflow

### Phase 1: Content Discovery

1. **Locate the target content**
   ```
   - If path is a file (e.g., `docs/api.md`), read directly
   - If path is a route (e.g., `/pricing`), search for:
     - app/{path}/page.tsx
     - app/{path}/page.mdx
     - pages/{path}.tsx
     - content/{path}.md
   ```

2. **Extract text content**
   - Read the file(s)
   - Identify all text content, headings, claims, numbers, links
   - Note line numbers for each finding

### Phase 2: Trust Layer Analysis

Score each layer on a 0-10 scale based on the checklist items found.

---

#### Layer 1: Source Legitimacy (20% weight)

**Question**: Can AI systems confidently attribute this content?

**Checklist:**
- [ ] **Brand name defined** - Company/product name appears clearly
- [ ] **Entity context** - Legal entity or organization type mentioned
- [ ] **Consistent naming** - Same brand name used throughout (no "we" without antecedent)
- [ ] **About/company link** - Reference to who is making these claims

**Scoring:**
- 4/4 items = 10 points
- 3/4 items = 7.5 points
- 2/4 items = 5 points
- 1/4 items = 2.5 points
- 0/4 items = 0 points

---

#### Layer 2: Claim Verifiability (25% weight)

**Question**: Can claims be verified or falsified?

**Checklist:**
- [ ] **Evidence adjacency** - Claims have nearby links to proof (docs, audits, status page)
- [ ] **Specific numbers** - Quantitative claims include methodology/date
- [ ] **Falsifiable statements** - Claims that could be proven wrong (vs vague marketing)
- [ ] **No orphan superlatives** - "Best", "leading", etc. have context or are avoided

**Scoring:**
- 4/4 items = 10 points
- 3/4 items = 7.5 points
- 2/4 items = 5 points
- 1/4 items = 2.5 points
- 0/4 items = 0 points

---

#### Layer 3: Cross-Source Consistency (20% weight)

**Question**: Does this content contradict other pages?

**Checklist:**
- [ ] **Internal consistency** - Pricing/features match other pages on site
- [ ] **No outdated content** - No old blog posts with conflicting information
- [ ] **Temporal coherence** - Dates are consistent across pages
- [ ] **Canonical signals** - Page indicates if it's the authoritative source

**Scoring:**
- 4/4 items = 10 points
- 3/4 items = 7.5 points
- 2/4 items = 5 points
- 1/4 items = 2.5 points
- 0/4 items = 0 points

**Note**: This layer may require checking other pages. If unable to verify, score conservatively and note "Unable to verify cross-source consistency."

---

#### Layer 4: Contextual Integrity (25% weight)

**Question**: Will claims be misleading if quoted out of context?

**Checklist:**
- [ ] **Scoped claims** - "Applies to: [specific plans/tiers/regions]" present
- [ ] **Temporal markers** - "As of [date]" or "Current as of [date]" present
- [ ] **Exception clarity** - "Does NOT include" or limitations stated
- [ ] **Self-contained paragraphs** - Key claims include enough context to stand alone

**Scoring:**
- 4/4 items = 10 points
- 3/4 items = 7.5 points
- 2/4 items = 5 points
- 1/4 items = 2.5 points
- 0/4 items = 0 points

---

#### Layer 5: Structural Cues (10% weight)

**Question**: Does the structure signal factual vs marketing content?

**Checklist:**
- [ ] **Descriptive headers** - Headers describe content (not just "Overview", "Features")
- [ ] **Structured data** - Lists/tables for comparable information
- [ ] **Code blocks** - Technical content in proper formatting
- [ ] **Low marketing ratio** - Superlatives < 10% of copy

**Scoring:**
- 4/4 items = 10 points
- 3/4 items = 7.5 points
- 2/4 items = 5 points
- 1/4 items = 2.5 points
- 0/4 items = 0 points

---

### Phase 3: Calculate Overall Score

```
Overall Score = (L1 × 0.20) + (L2 × 0.25) + (L3 × 0.20) + (L4 × 0.25) + (L5 × 0.10)
```

**Risk Level Mapping:**
| Score Range | Risk Level | Meaning |
|-------------|------------|---------|
| 0.0 - 4.0 | **High** | Content likely to be misrepresented |
| 4.0 - 7.0 | **Medium** | Some claims vulnerable to misquoting |
| 7.0 - 10.0 | **Low** | Content designed for AI retrieval |

### Phase 4: Identify High-Risk Claims

Scan the content for these patterns:

| Pattern | Risk | Detection |
|---------|------|-----------|
| Absolute claims | High | "we don't", "never", "always" without scope |
| Unscoped numbers | High | Numbers without date/methodology nearby |
| Vague superlatives | Medium | "best", "leading", "world-class", "enterprise-grade" |
| Missing temporal | Medium | Claims without "as of" or date reference |
| Orphan facts | Medium | Important claims mentioned once, never linked |

For each high-risk claim, record:
- Line number
- Exact claim text
- Issue type
- Specific recommendation

### Phase 5: Generate Output

Write the audit report to: `grimoires/beacon/audits/{page-slug}-audit.md`

Use the template from `resources/templates/audit-report.md`.

### Phase 6: Update State

Update `grimoires/beacon/state.yaml`:
```yaml
audits:
  count: {increment}
  last_audit: "{timestamp}"
  pages:
    {path}:
      score: {overall_score}
      risk: {high|medium|low}
      audited: "{timestamp}"
```

## Output Format

See `resources/templates/audit-report.md` for the full template.

Key sections:
1. **Summary** - Overall score, risk level, timestamp
2. **Trust Layer Analysis** - Score and findings for each layer
3. **High-Risk Claims** - Table of specific issues
4. **Recommendations** - Priority-ordered fixes
5. **Next Steps** - Links to `/optimize-chunks` and `/add-markdown`

## Examples

### Example 1: Marketing Page (Low Score)

```
/audit-llm /pricing
```

Typical findings:
- "Enterprise-grade security" (no evidence link)
- "99.9% uptime" (no date range)
- "We don't store your data" (no scope on what data)

Expected score: 3-5/10

### Example 2: Documentation Page (High Score)

```
/audit-llm docs/api-reference.md
```

Typical findings:
- Clear API versioning with dates
- Code examples with specific versions
- Links to changelog

Expected score: 7-9/10

## Edge Cases

### File Not Found
If the target path doesn't exist:
1. Report "Content not found at {path}"
2. Suggest checking the path or trying alternative locations

### Non-Text Content
If the page is primarily images/video:
1. Note "Limited text content available for audit"
2. Score based on available text
3. Recommend adding text alternatives

### Dynamic Content
If content is fetched client-side:
1. Note "Dynamic content detected - audit may be incomplete"
2. Recommend providing static content or API response samples
