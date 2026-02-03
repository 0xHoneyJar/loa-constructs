# LLM Trust Scorecard

> Aggregate trust scores across all audited pages.

**Last Updated:** {timestamp}
**Total Pages Audited:** {total_pages}

---

## Overall Health

| Metric | Value |
|--------|-------|
| Average Score | {average_score}/10 |
| High Risk Pages | {high_risk_count} |
| Medium Risk Pages | {medium_risk_count} |
| Low Risk Pages | {low_risk_count} |

---

## Pages by Risk Level

### High Risk (0-4)

| Page | Score | Top Issue | Last Audited |
|------|-------|-----------|--------------|
{high_risk_pages_table}

### Medium Risk (4-7)

| Page | Score | Top Issue | Last Audited |
|------|-------|-----------|--------------|
{medium_risk_pages_table}

### Low Risk (7-10)

| Page | Score | Last Audited |
|------|-------|--------------|
{low_risk_pages_table}

---

## Layer Averages

| Layer | Avg Score | Weight | Weighted |
|-------|-----------|--------|----------|
| Source Legitimacy | {layer1_avg}/10 | 20% | {layer1_weighted_avg} |
| Claim Verifiability | {layer2_avg}/10 | 25% | {layer2_weighted_avg} |
| Cross-Source Consistency | {layer3_avg}/10 | 20% | {layer3_weighted_avg} |
| Contextual Integrity | {layer4_avg}/10 | 25% | {layer4_weighted_avg} |
| Structural Cues | {layer5_avg}/10 | 10% | {layer5_weighted_avg} |

**Weakest Layer:** {weakest_layer}
**Strongest Layer:** {strongest_layer}

---

## Common Issues

| Issue Type | Occurrences | Pages Affected |
|------------|-------------|----------------|
{common_issues_table}

---

## Recommendations

{priority_recommendations}

---

## Trend

{trend_notes}

---

## Actions

- **Audit a new page**: `/audit-llm [path]`
- **Fix issues on a page**: `/optimize-chunks [path]`
- **Enable markdown export**: `/add-markdown [path]`
