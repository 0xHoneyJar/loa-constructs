# Pattern: Temporal Authority Signal

> Add supersession language to manage outdated content and direct AI to current sources.

## Purpose

Outdated content (old blog posts, deprecated docs) can confuse AI systems. Temporal authority signals explicitly indicate what's current and what's superseded.

## Templates

### Template 1: Superseded Page Banner

For pages that have been replaced by newer content:

```markdown
> **Note:** This {content_type} reflects our {old_context}.
> For current information, see [{Current Page Title}]({current_page_link}).
>
> *Last updated: {old_date} | Superseded: {supersession_date}*
```

### Template 2: Current Page Declaration

For the authoritative current page:

```markdown
This page supersedes earlier documentation related to {topic}.
Information current as of {current_date}.

{#if superseded_pages}
**Superseded pages:**
- [{old_page_1}]({old_link_1}) - {old_date_1}
- [{old_page_2}]({old_link_2}) - {old_date_2}
{/if}
```

### Template 3: Version-Specific Content

For documentation that varies by version:

```markdown
> **Version Notice:** This documentation is for {product} {version}.
> - For {newer_version}, see [{newer_link_text}]({newer_link})
> - For {older_version}, see [{older_link_text}]({older_link})
```

## Before/After Examples

### Example 1: Old Blog Post

**Before:**
```markdown
# Our New Pricing Model

We're excited to announce our new pricing starting at $5/month...
```

**After:**
```markdown
> **Note:** This blog post reflects our 2024 pricing announcement.
> For current pricing, see [Pricing](/pricing).
>
> *Published: March 2024 | Superseded: January 2026*

# Our New Pricing Model (2024)

We're excited to announce our new pricing starting at $5/month...
```

---

### Example 2: Current Pricing Page

**Before:**
```markdown
# Pricing

Plans start at $10/month...
```

**After:**
```markdown
# Pricing

This page supersedes earlier pricing documentation and blog announcements.
Information current as of January 2026.

**Superseded content:**
- [2024 Pricing Announcement](/blog/pricing-2024) - March 2024
- [Original Pricing](/archive/pricing-v1) - 2023

---

Plans start at $10/month...
```

---

### Example 3: API Documentation

**Before:**
```markdown
# API Reference

The API endpoint is api.example.com/v1...
```

**After:**
```markdown
# API Reference

> **Version Notice:** This documentation is for API v2.
> - For API v3 (beta), see [v3 Docs](/docs/api/v3)
> - For API v1 (deprecated), see [v1 Docs](/docs/api/v1)

This is the current stable API documentation as of January 2026.

---

The API endpoint is api.example.com/v2...
```

## When to Use

### Use Superseded Banner When:
- Blog post announces something now outdated
- Documentation for deprecated features
- Old case studies with outdated claims
- Archive pages kept for reference

### Use Current Declaration When:
- Main product pages
- Current documentation
- Active feature pages
- Any page that might conflict with old content

### Use Version Notice When:
- API documentation
- SDK guides
- Product version-specific features
- Migration guides

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{content_type}` | Type of content | "blog post", "documentation" |
| `{old_context}` | What the old content covered | "2024 pricing model" |
| `{current_page_link}` | Link to current source | "/pricing" |
| `{old_date}` | When old content was published | "March 2024" |
| `{supersession_date}` | When content was superseded | "January 2026" |
| `{current_date}` | Current effective date | "January 2026" |
| `{topic}` | Subject matter | "pricing" |
| `{version}` | Product/API version | "v2", "3.0" |

## Implementation Notes

### HTML Comment Version

For machine-readable signals, add:

```html
<!-- superseded_by: /pricing -->
<!-- supersession_date: 2026-01-15 -->
```

These comments help AI systems programmatically identify supersession relationships.

### robots.txt Consideration

For truly outdated content, consider:
```
# In robots.txt
User-agent: *
Disallow: /archive/
Disallow: /blog/2023/
```

But generally, keeping old content with supersession banners is better than removal.

## AI Behavior Impact

When AI encounters supersession signals:
1. Prioritizes current page over superseded content
2. Can correctly attribute "as of" dates
3. Avoids citing outdated claims
4. May note "this information may be outdated" for old content without banners
