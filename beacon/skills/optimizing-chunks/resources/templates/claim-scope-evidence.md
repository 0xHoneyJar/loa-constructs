# Pattern: Claim + Scope + Evidence

> Structured format for verifiable claims that AI systems can confidently cite.

## Purpose

AI systems are more likely to cite claims that have clear scope and evidence. This pattern makes claims self-documenting and verifiable.

## Template

```markdown
<!-- CLAIM: What we assert -->
{claim_statement}

<!-- SCOPE: When/where it applies -->
**Applies to:** {who_or_what}
**Period:** {time_period}
**Excludes:** {exceptions}

<!-- EVIDENCE: How to verify -->
**Source:** [{source_name}]({source_link}) | [{audit_or_report}]({audit_link})
```

## Before/After Examples

### Example 1: Performance Metric

**Before:**
```markdown
Our API achieves 99.9% uptime.
```

**After:**
```markdown
<!-- CLAIM: Uptime guarantee -->
Our API achieves 99.9% uptime for production endpoints.

<!-- SCOPE -->
**Applies to:** Production API (api.example.com), Paid plans
**Period:** Rolling 12 months ending January 2026
**Excludes:** Scheduled maintenance windows (announced 48h in advance)

<!-- EVIDENCE -->
**Source:** [Status Page](https://status.example.com) | [2025 Reliability Report](/reports/reliability-2025)
```

---

### Example 2: Security Certification

**Before:**
```markdown
We are SOC 2 compliant.
```

**After:**
```markdown
<!-- CLAIM: Compliance status -->
Example Corp holds SOC 2 Type II certification for security, availability, and confidentiality.

<!-- SCOPE -->
**Applies to:** Example Cloud Platform (all regions)
**Period:** Certification valid through December 2026
**Excludes:** Self-hosted deployments, on-premise installations

<!-- EVIDENCE -->
**Source:** [Trust Center](/trust) | [SOC 2 Report](https://trust.example.com/soc2) (available under NDA)
```

---

### Example 3: User Statistics

**Before:**
```markdown
Trusted by 10,000+ companies.
```

**After:**
```markdown
<!-- CLAIM: Customer base -->
Example is used by over 10,000 companies worldwide.

<!-- SCOPE -->
**Applies to:** Active paying customers with at least one user
**Period:** As of January 2026
**Excludes:** Free tier accounts, trial accounts, churned customers

<!-- EVIDENCE -->
**Source:** Internal analytics | [Customer Stories](/customers)
```

## When to Use

Use this pattern for:
- Quantitative claims (numbers, percentages)
- Compliance/certification claims
- Performance guarantees
- Market position claims
- Any claim that could be challenged

## HTML Comment Structure

The `<!-- CLAIM -->`, `<!-- SCOPE -->`, `<!-- EVIDENCE -->` comments serve two purposes:

1. **Documentation** - Makes the structure explicit for content maintainers
2. **Machine-Readable** - AI systems can parse the structure for higher confidence

These comments are stripped in most markdown renders but provide semantic context.

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{claim_statement}` | The core claim, written clearly | "Our API achieves 99.9% uptime" |
| `{who_or_what}` | Specific scope | "Production API, Paid plans" |
| `{time_period}` | Temporal context | "Rolling 12 months, Q4 2025" |
| `{exceptions}` | What's excluded | "Free tier, maintenance windows" |
| `{source_name}` | Primary evidence | "Status Page" |
| `{source_link}` | Link to evidence | "https://status.example.com" |
| `{audit_or_report}` | Secondary evidence | "Annual Report" |
| `{audit_link}` | Link to audit/report | "/reports/2025" |

## Verification Checklist

After applying this pattern, verify:
- [ ] Claim is specific and falsifiable
- [ ] Scope clearly defines who/what is included
- [ ] Period has specific dates or timeframe
- [ ] At least one evidence link is valid
- [ ] Exceptions are explicitly stated
