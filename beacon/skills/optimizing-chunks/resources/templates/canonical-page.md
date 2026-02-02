# Pattern: Canonical Page Header

> Establish a page as the authoritative source for a topic, helping AI systems prioritize it.

## Purpose

AI systems often encounter the same topic across multiple pages (blog posts, docs, marketing). A canonical page header signals that this page is the primary source of truth.

## Template

```markdown
# {Topic} Overview

> This page is the canonical source for {Brand}'s {topic_lowercase}.
> Last reviewed: {review_date} | [View changelog](/{topic_slug}/changelog)

## TL;DR

- {key_fact_1}
- {key_fact_2}
- {key_fact_3}

## What This Page Covers

- {scope_item_1}
- {scope_item_2}
- {scope_item_3}

## What This Page Does NOT Cover

- {out_of_scope_1} → See [{related_page_1}]({link_1})
- {out_of_scope_2} → See [{related_page_2}]({link_2})

---

{main_content}

---

## Related Resources

| Resource | Description |
|----------|-------------|
| [{resource_1}]({link_1}) | {description_1} |
| [{resource_2}]({link_2}) | {description_2} |

## Questions?

For questions about {topic_lowercase}, contact {contact_method}.

---

*This page is authoritative for {topic_lowercase}. Other pages may reference this content but should link here for the latest information.*
```

## Before/After Examples

### Example: Security Page

**Before:**
```markdown
# Security

We take security seriously. Here's how we protect your data...
```

**After:**
```markdown
# Security Overview

> This page is the canonical source for Example Corp's security posture.
> Last reviewed: January 2026 | [View changelog](/security/changelog)

## TL;DR

- SOC 2 Type II certified (renewed annually)
- AES-256 encryption at rest, TLS 1.3 in transit
- GDPR compliant for EU customers
- 24/7 security monitoring with <15min response time

## What This Page Covers

- Data encryption standards
- Access controls and authentication
- Compliance certifications
- Incident response procedures

## What This Page Does NOT Cover

- Product-specific security features → See [Product Docs](/docs/security)
- Enterprise security options → See [Enterprise](/enterprise)
- Bug bounty program → See [Security Researchers](/security/researchers)

---

{main security content here}

---

## Related Resources

| Resource | Description |
|----------|-------------|
| [Trust Center](/trust) | Compliance reports and certifications |
| [Privacy Policy](/privacy) | Data handling and GDPR details |
| [Status Page](https://status.example.com) | Real-time system status |

## Questions?

For security questions, contact security@example.com or see our [Security FAQ](/security/faq).

---

*This page is authoritative for security information. Blog posts and other pages should link here for current details.*
```

## When to Use

Use this pattern for:
- Security/Privacy pages
- Pricing pages
- Product overview pages
- Company/About pages
- Any topic with multiple related pages

## Key Elements

### 1. Canonical Declaration
The blockquote at the top explicitly states this is the authoritative source.

### 2. Review Date
Shows the content is actively maintained and when it was last verified.

### 3. TL;DR Section
AI systems often extract summaries. Provide an authoritative one.

### 4. Scope Boundaries
"What This Page Does NOT Cover" prevents AI from making incorrect inferences.

### 5. Related Resources
Links help AI understand the topic hierarchy.

### 6. Footer Statement
Reinforces canonical status for any AI that reads the full page.

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{Topic}` | Page topic (title case) | "Security Overview" |
| `{Brand}` | Company/product name | "Example Corp" |
| `{topic_lowercase}` | Topic for inline use | "security posture" |
| `{topic_slug}` | URL-safe topic | "security" |
| `{review_date}` | Last review date | "January 2026" |
| `{key_fact_N}` | TL;DR bullet points | "SOC 2 Type II certified" |
| `{scope_item_N}` | What's covered | "Data encryption standards" |
| `{out_of_scope_N}` | What's NOT covered | "Enterprise options" |
| `{contact_method}` | How to reach team | "security@example.com" |

## SEO Bonus

This pattern also helps with traditional SEO:
- Clear H1 with topic
- Structured content (TL;DR, sections)
- Internal linking
- Updated date signals freshness
