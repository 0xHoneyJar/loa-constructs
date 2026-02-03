# Pattern: Context-Carrying Block

> Transform isolated claims into self-contained paragraphs that survive AI chunking.

## Purpose

When AI systems retrieve a single paragraph, it should contain enough context to be accurate without the surrounding content.

## Template

```markdown
{main_claim}

**Applies to:** {scope}
**Effective:** {date_or_period}
{#if exceptions}
**Exceptions:** {exceptions}
{/if}
{#if evidence_link}
**Details:** [{evidence_label}]({evidence_link})
{/if}
```

## Before/After Examples

### Example 1: Data Storage Claim

**Before (Dangerous):**
```markdown
We don't store user data.
```

**After (Context-Carrying):**
```markdown
We do not sell or share customer data with third parties.
Operational data (account info, usage logs) is stored to provide the service.

**Applies to:** All plans, all regions
**Effective:** Current as of January 2026
**Details:** [Privacy Policy](/privacy)
```

---

### Example 2: Uptime Claim

**Before (Dangerous):**
```markdown
99.9% uptime guaranteed.
```

**After (Context-Carrying):**
```markdown
We maintain 99.9% uptime for production API endpoints.

**Applies to:** Paid plans only (Free tier: best-effort)
**Effective:** Rolling 12-month average, updated monthly
**Exceptions:** Scheduled maintenance (announced 48h in advance)
**Details:** [Status Page](https://status.example.com)
```

---

### Example 3: Security Feature

**Before (Dangerous):**
```markdown
End-to-end encrypted.
```

**After (Context-Carrying):**
```markdown
All data is encrypted in transit (TLS 1.3) and at rest (AES-256).

**Applies to:** All plans, all data types
**Effective:** Implemented December 2025
**Details:** [Security Overview](/security)
```

## When to Use

Use this pattern when:
- A claim could be misleading if quoted alone
- The claim needs temporal context (when is this true?)
- The claim has scope limitations (who/what does it apply to?)
- Supporting evidence exists that should be linked

## Placeholders

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{main_claim}` | The core statement, rewritten for clarity | "We encrypt all data..." |
| `{scope}` | Who/what this applies to | "Paid plans, US customers" |
| `{date_or_period}` | When this is valid | "As of January 2026" |
| `{exceptions}` | What's NOT included | "Excludes free tier" |
| `{evidence_link}` | URL to supporting page | "/security" |
| `{evidence_label}` | Link text | "Security Overview" |

## Integration

After applying this pattern:
1. Re-run `/audit-llm {path}` to verify improvement
2. Check that the block scores higher on "Contextual Integrity" layer
