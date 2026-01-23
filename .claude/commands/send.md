---
name: "send"
version: "1.0.0"
description: |
  Send feedback to another Construct via Melange Protocol.
  Creates a structured GitHub Issue in your repo addressed to the target.

arguments:
  - name: "target"
    type: "string"
    required: true
    description: "Target construct (e.g., loa, sigil, registry)"
  - name: "message"
    type: "string"
    required: true
    description: "Brief description of feedback"

agent: "melange-send"
agent_path: "skills/melange-send/"

pre_flight:
  - check: "config_exists"
    path: ".loa.config.yaml"
    key: "construct.name"
    error: "Construct identity not configured. Add construct block to .loa.config.yaml"

  - check: "command_exists"
    command: "gh"
    error: "GitHub CLI not found. Install: https://cli.github.com/"

  - check: "script"
    script: ".claude/scripts/check-gh-auth.sh"
    error: "GitHub CLI not authenticated. Run: gh auth login"

outputs:
  - path: "GitHub Issue URL"
    type: "external"
    description: "Created Melange Issue"

mode:
  default: "foreground"
  allow_background: false
---

# /send Command

## Purpose

Send structured feedback to another Construct via Melange Protocol. Creates a GitHub Issue in your repository addressed to the target Construct.

## Invocation

```bash
/send <target> "<message>"

# Examples
/send loa "Error messages don't include file paths"
/send sigil "API rate limits too aggressive"
/send registry "Missing documentation for auth endpoints"
```

## Workflow

1. **Parse Arguments**: Extract target construct and brief description
2. **Validate Target**: Ensure target is in `known_constructs` list
3. **Gather Intent**: Prompt for impact level and intent type
4. **Draft Issue**: AI expands brief description into structured Melange fields
5. **Human Review**: Show preview, ask for approval
6. **Create Issue**: Execute `gh issue create` with proper labels
7. **Confirm**: Display Issue URL and confirm Discord notification

## Impact Levels

| Impact | Description | Discord |
|--------|-------------|---------|
| game-changing | Blocks core workflow | 🔴 + @here |
| important | Significant friction | 🟡 |
| nice-to-have | Improvement idea | Silent |

## Intent Types

| Intent | Use When |
|--------|----------|
| request | Asking for a change |
| ask | Question or clarification |
| report | Sharing an observation |

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Construct identity configured in `.loa.config.yaml`
- Melange labels exist in your repository

## Example Session

```
> /send loa "Error messages don't show which file failed"

📤 Drafting Melange Issue to loa...

What's the impact level?
  [1] game-changing - Blocks core workflow
  [2] important - Significant friction
  [3] nice-to-have - Improvement idea
> 2

What's your intent?
  [1] request - Asking for a change
  [2] ask - Question/clarification
  [3] report - Sharing observation
> 1

Drafting Issue...

─────────────────────────────────────────
📝 Preview: Melange Issue

Title: [Melange] Request: Include file paths in error messages

To: loa
From: soju@loa-constructs
Impact: important
Intent: request

Experience:
When file operations fail, error messages show "File not found" without
indicating which file. This requires manual debugging to identify the
problematic path.

Evidence:
- Observed in /validate command
- Error: "ENOENT: no such file or directory"
- No file path in message

Request:
Include the full file path in error messages so operators can quickly
identify and fix issues.

Why important:
Significant friction during debugging, but workarounds exist.
─────────────────────────────────────────

Create this Issue? [Y/n/edit] y

✓ Created: https://github.com/0xHoneyJar/loa-constructs/issues/57
✓ Discord notification sent (🟡 important)
```

## Related

- `/inbox` - Triage incoming Melange feedback
- Melange Protocol documentation in `melange/` directory
