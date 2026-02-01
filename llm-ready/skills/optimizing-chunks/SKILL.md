# Skill: optimizing-chunks

> Analyze content for AI chunk survival and generate context-carrying rewrites.

## Purpose

AI systems chunk content during retrieval, often pulling paragraphs out of context. Content without proper scoping, dates, or evidence can be misleading when isolated.

This skill identifies "chunk-vulnerable" content and provides rewrite patterns that survive isolation.

## Trigger

```
/optimize-chunks [path]
```

**Arguments:**
- `path` - The page path or file to analyze (e.g., `/pricing`, `docs/security.md`)

## Workflow

### Phase 1: Load Content

1. **Locate the target content**
   - If file path (e.g., `docs/api.md`), read directly
   - If route path (e.g., `/pricing`), search for content files:
     - `app/{path}/page.tsx` or `page.mdx`
     - `content/{path}.md`
     - `pages/{path}.tsx`

2. **Parse into chunks**
   - Split by paragraph boundaries
   - Identify list items as individual chunks
   - Identify table rows as chunks
   - Preserve line numbers for each chunk

### Phase 2: Chunk Boundary Detection

#### 2.1 Chunk Types

| Type | Detection | Notes |
|------|-----------|-------|
| Paragraph | 2+ sentences, blank line boundaries | Primary chunk type |
| List Item | Lines starting with `-`, `*`, `1.` | Often isolated by LLMs |
| Table Row | Lines within markdown tables | Frequently quoted alone |
| Code Block | Lines between ``` markers | Usually preserved whole |
| Blockquote | Lines starting with `>` | Context often lost |

#### 2.2 Sentence Detection

Use simple heuristics:
```
Sentence boundary: `. ` followed by capital letter OR newline
Exceptions: Mr., Dr., Inc., etc., i.e., e.g.
```

### Phase 3: Risk Pattern Detection

For each chunk, scan for these high-risk patterns:

#### Pattern 1: Absolute Claims (HIGH RISK)

**Detection:** Words that make universal statements without scope.

```regex
\b(we don't|we do not|never|always|every|all|none|no one)\b
```

**Risk:** When isolated, these appear as absolute promises.

**Example:**
> ❌ "We don't store user data."
> ✅ "We do not sell or share customer data with third parties. Operational data is stored to provide the service."

---

#### Pattern 2: Unscoped Numbers (HIGH RISK)

**Detection:** Numbers without adjacent date or methodology.

```regex
\d+%|\d+ (users|customers|companies|clients)
```

**Check:** Look within 50 characters for:
- Date: `as of`, year (20XX), month names
- Methodology: `based on`, `according to`, `source:`

**Example:**
> ❌ "99.9% uptime"
> ✅ "99.9% uptime (rolling 12-month average, January 2026). See [Status Page](https://status.example.com)."

---

#### Pattern 3: Vague Superlatives (MEDIUM RISK)

**Detection:** Marketing language without specifics.

```regex
\b(best|leading|top|world-class|enterprise-grade|cutting-edge|state-of-the-art)\b
```

**Risk:** AI systems often flag or ignore these as marketing.

**Example:**
> ❌ "Enterprise-grade security"
> ✅ "SOC 2 Type II certified. AES-256 encryption at rest. See [Security Overview](/security)."

---

#### Pattern 4: Missing Temporal Context (MEDIUM RISK)

**Detection:** Claims about features, pricing, or capabilities without dates.

```regex
\b(our pricing|features include|supports?)\b
```

**Check:** Scan document for presence of `as of`, `effective`, year references.

**Example:**
> ❌ "Our pricing starts at $10/month"
> ✅ "Pricing starts at $10/month (as of January 2026). See [Pricing](/pricing) for current rates."

---

#### Pattern 5: Orphan Facts (MEDIUM RISK)

**Detection:** Important claims mentioned once without links.

**Check:** Key terms (security, pricing, compliance) should link to canonical pages.

**Example:**
> ❌ "We are GDPR compliant."
> ✅ "We are GDPR compliant for EU customers. See [Privacy Policy](/privacy) for details."

### Phase 4: Generate Recommendations

For each high-risk chunk, generate a recommendation using optimization patterns:

#### Available Patterns:

1. **Context-Carrying Block** - Add scope, date, evidence inline
2. **Claim + Scope + Evidence** - Structured format for claims
3. **Canonical Page Header** - For authoritative topic pages
4. **Temporal Authority Signal** - Supersession language for versioned content

See `resources/templates/` for pattern templates.

### Phase 5: Generate Output Report

Create report at: `grimoires/llm-ready/optimizations/{page-slug}-chunks.md`

**Report Structure:**
1. Summary statistics
2. High-risk chunks with recommendations
3. Summary table
4. Implementation guide
5. Next steps

### Phase 6: Update State

Update `grimoires/llm-ready/state.yaml`:
```yaml
optimizations:
  count: {increment}
  last_optimization: "{timestamp}"
  pages:
    {path}:
      chunks_analyzed: {count}
      high_risk: {count}
      optimized: "{timestamp}"
```

## Risk Scoring

### Per-Chunk Score

Each chunk receives a risk score based on patterns detected:

| Pattern | Weight |
|---------|--------|
| Absolute claim | +3 |
| Unscoped number | +3 |
| Vague superlative | +2 |
| Missing temporal | +2 |
| Orphan fact | +1 |

**Risk Levels:**
- 0: No risk detected
- 1-2: Low risk (informational)
- 3-4: Medium risk (recommend review)
- 5+: High risk (recommend immediate fix)

### Page-Level Summary

Calculate aggregate:
- Total chunks analyzed
- High-risk chunk count
- Average risk score
- Priority recommendations

## Output Format

See `resources/templates/optimization-report.md` for the full template.

Key sections:
1. **Summary** - Stats and overall risk assessment
2. **High-Risk Chunks** - Each with original, issue, rewrite, pattern
3. **All Findings** - Complete table of issues
4. **Implementation Guide** - Step-by-step fix instructions
5. **Related Commands** - Links to `/audit-llm` and `/add-markdown`

## Examples

### Example 1: Security Page

```
/optimize-chunks /security
```

Likely findings:
- "We don't store passwords" → Add scope and methodology
- "Enterprise-grade encryption" → Replace with specific standards
- Feature list without dates → Add temporal context

### Example 2: Pricing Page

```
/optimize-chunks /pricing
```

Likely findings:
- "$10/month" → Add effective date
- "Unlimited users" → Add plan-specific scope
- Comparison claims → Add evidence links

### Example 3: Documentation

```
/optimize-chunks docs/api-reference.md
```

Likely findings:
- Version numbers → Ensure dated
- "Supports X" → Add version requirements
- Code examples → Ensure versioned

## Edge Cases

### No High-Risk Content

If no issues found:
1. Report "No high-risk chunks detected"
2. Still provide summary statistics
3. Suggest `/audit-llm` for comprehensive review

### Very Long Content

If content > 10,000 words:
1. Process in sections
2. Note "Large document - processed in sections"
3. Consider recommending document splitting

### Non-Text Content

If minimal text found:
1. Note "Limited text content for analysis"
2. Recommend adding alt text, captions
3. Suggest text-based documentation
