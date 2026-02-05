# finding-constructs

Proactive construct discovery skill that suggests relevant constructs based on user intent.

## Overview

This skill activates when the user expresses intent that could be addressed by an existing construct in the Loa Constructs Registry. It helps users discover tools they might not know exist.

**Version**: 1.0.0
**Cycle**: cycle-007 (Intelligent Construct Discovery)
**References**:
- PRD: grimoires/loa/prd.md §4.5
- SDD: grimoires/loa/sdd.md §4

---

## Workflow

### Phase 0: Intent Detection

This skill triggers on patterns like:
- "find a skill for X"
- "is there a construct that..."
- "I need help with [domain]"
- "how do I do X"

If triggered, proceed to Phase 1.

### Phase 1: Keyword Extraction

Extract relevant keywords from the user's message:

1. Identify the core task or domain mentioned
2. Extract 2-5 keywords that capture the intent
3. Include domain synonyms if applicable

**Examples**:
- "I need to validate my user journeys" → keywords: `validation`, `user journeys`, `testing`
- "how do I review security in my code" → keywords: `security`, `code review`, `audit`

### Phase 2: API Query

Query the Loa Constructs API:

```
GET https://api.constructs.network/v1/constructs?q={keywords}&limit=5
```

Use WebFetch to make this request.

Parse the response and extract constructs with `relevance_score >= 0.5`.

### Phase 3: Result Filtering

Filter results:
1. Only include constructs with `relevance_score >= 0.5`
2. Take top 3 by relevance score
3. If no results meet threshold, proceed to Fallback Behavior

### Phase 4: Present Results

Present the top constructs to the user in this format:

```
I found some constructs that might help:

1. **{name}** ({type}) - {description}
   - Relevance: {relevance_score * 100}%
   - Matched on: {match_reasons}
   - Install: `/constructs install {slug}`

2. **{name}** ({type}) - {description}
   ...

Would you like me to:
- Install one of these constructs?
- Provide more details about a specific one?
- Help you directly with this task instead?
```

### Fallback Behavior

If no constructs meet the relevance threshold (0.5):

```
I didn't find existing constructs that closely match your needs.

I can:
1. Help you with this task directly
2. Guide you in creating a custom skill with `/skills init`

What would you prefer?
```

**Tone**: Be helpful and direct, not apologetic. The absence of a construct isn't a failure - it's an opportunity.

---

## API Response Format

Expected response structure from `/v1/constructs?q=`:

```json
{
  "data": [
    {
      "slug": "example-construct",
      "name": "Example Construct",
      "type": "pack",
      "description": "Does something useful",
      "relevance_score": 0.87,
      "match_reasons": ["name", "keywords"],
      "maturity": "stable",
      "downloads": 150
    }
  ],
  "pagination": { ... }
}
```

Key fields to use:
- `slug` - for install command
- `name` - display name
- `type` - skill/pack/bundle
- `description` - brief description
- `relevance_score` - relevance (0-2.0, normalize to percentage)
- `match_reasons` - what matched

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `min_relevance_threshold` | 0.5 | Minimum score to show construct |
| `max_results` | 3 | Maximum constructs to present |
| `api_endpoint` | `https://api.constructs.network/v1/constructs` | API base URL |

---

## Opt-Out

Users can disable this skill by adding to their project's `.loa.config.yaml`:

```yaml
skills:
  disabled:
    - finding-constructs
```

Or in `.claude/settings.json`:

```json
{
  "skills": {
    "disabled": ["finding-constructs"]
  }
}
```

This is useful when:
- Working in offline environments
- Preferring to handle tasks without construct suggestions
- Testing or development workflows

---

## Examples

### Example 1: Security Task

**User**: "I need to audit my authentication code for vulnerabilities"

**Response**:
```
I found some constructs that might help:

1. **Security Auditor** (pack) - Comprehensive security and quality audit pack with OWASP Top 10 scanning
   - Relevance: 92%
   - Matched on: keywords, use_cases
   - Install: `/constructs install security-auditor`

2. **Auth Hardening** (skill) - Authentication security best practices
   - Relevance: 78%
   - Matched on: keywords
   - Install: `/constructs install auth-hardening`

Would you like me to install one of these, or help you audit directly?
```

### Example 2: No Match

**User**: "I need to convert my codebase to a new obscure framework"

**Response**:
```
I didn't find existing constructs that closely match your needs.

I can:
1. Help you with this migration directly
2. Guide you in creating a custom skill with `/skills init`

What would you prefer?
```

---

## Implementation Notes

1. **Non-Intrusive**: Only trigger on clear intent patterns
2. **Fast**: Single API call, minimal processing
3. **Helpful**: Always offer direct assistance as alternative
4. **Transparent**: Show relevance scores and match reasons
