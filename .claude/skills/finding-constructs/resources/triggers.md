# Trigger Patterns

Documentation of when the finding-constructs skill activates.

## Explicit Patterns

These patterns directly trigger the skill:

| Pattern | Example |
|---------|---------|
| `find a skill for` | "find a skill for testing React components" |
| `find a construct for` | "find a construct for API documentation" |
| `is there a construct that` | "is there a construct that handles deployments?" |
| `is there a skill that` | "is there a skill that can audit security?" |
| `I need help with` | "I need help with CI/CD setup" |
| `how do I do` | "how do I do mobile-first design?" |
| `looking for a tool` | "I'm looking for a tool to review PRs" |
| `need to automate` | "I need to automate my testing workflow" |

## Domain Hints

When the conversation context involves these domains and the user expresses a need, the skill may activate:

| Domain | Topics |
|--------|--------|
| **security** | vulnerabilities, authentication, authorization, OWASP |
| **testing** | unit tests, integration tests, E2E, coverage |
| **deployment** | CI/CD, infrastructure, containers, cloud |
| **documentation** | API docs, READMEs, changelogs, guides |
| **code review** | PR review, linting, static analysis |
| **debugging** | troubleshooting, logging, profiling |
| **monitoring** | observability, metrics, alerting |
| **ci/cd** | pipelines, GitHub Actions, deployment automation |

## Non-Triggering Patterns

These patterns will NOT trigger the skill:

- Direct questions about code ("what does this function do?")
- Requests for explanations ("explain how async/await works")
- Code writing requests without tool context ("write a function that...")
- General conversation

## Example User Messages

### Messages that trigger:

```
"find a skill for conducting user research"
→ Triggers: explicit "find a skill for" pattern

"is there a construct that can help me with accessibility audits?"
→ Triggers: explicit "is there a construct that" pattern

"I need help with security testing my API endpoints"
→ Triggers: "I need help with" + security domain hint
```

### Messages that don't trigger:

```
"write a function that validates user input"
→ Does not trigger: direct coding request

"what is the difference between skills and packs?"
→ Does not trigger: explanation request

"let's continue with the implementation"
→ Does not trigger: continuation request
```

## Opt-Out

### Per-Project

Add to `.loa.config.yaml`:

```yaml
skills:
  disabled:
    - finding-constructs
```

### Per-User Settings

Add to `.claude/settings.json`:

```json
{
  "skills": {
    "disabled": ["finding-constructs"]
  }
}
```

### When to Opt Out

Consider disabling this skill when:

1. **Offline Development**: No internet access to query the registry
2. **Air-Gapped Environments**: Security restrictions prevent external API calls
3. **Focused Workflows**: You prefer handling tasks without suggestions
4. **Testing/Development**: You're testing the skill system itself

## Relevance Threshold

Results are only shown if they meet the minimum relevance threshold:

| Setting | Value | Effect |
|---------|-------|--------|
| `min_relevance_threshold` | 0.5 | Only show constructs scoring >= 50% |
| `max_results` | 3 | Show at most 3 constructs |

Constructs below the threshold trigger the fallback behavior (offer direct assistance).

## API Dependency

This skill requires access to:

```
https://api.constructs.network/v1/constructs?q={query}
```

If the API is unavailable, the skill will gracefully fall back to offering direct assistance.
