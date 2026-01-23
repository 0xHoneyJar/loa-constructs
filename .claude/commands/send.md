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
    description: "Target construct (e.g., loa, sigil, registry, human)"
  - name: "message"
    type: "string"
    required: true
    description: "Brief description of feedback"
  - name: "block"
    type: "flag"
    required: false
    description: "Mark sender as blocked waiting for response"

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

  - check: "identity_validation"
    description: "Gets authenticated GitHub username for attribution"
    note: "Uses gh api user to get authenticated username. No ownership check - like GitHub, anyone with repo access can send as that construct."

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
/send <target> "<message>" --block

# Examples
/send loa "Error messages don't include file paths"
/send sigil "API rate limits too aggressive"
/send registry "Missing documentation for auth endpoints"
/send loa "Need architectural guidance on auth flow" --block
/send human "Should deleted items be soft or hard delete?"
```

## Workflow

1. **Identity Validation**: Get GitHub username via `gh api user` for attribution (no ownership check needed)
2. **Parse Arguments**: Extract target construct, brief description, and --block flag
3. **Validate Target**: Ensure target is in `known_constructs` list (or `human` if configured)
4. **Gather Intent**: Prompt for impact level and intent type
5. **Draft Issue**: AI expands brief description into structured Melange fields
6. **Human Review**: Show preview (From field shows verified GitHub username), ask for approval
7. **Create Issue**: Execute `gh issue create` with `from:{construct}` label and embedded melange-metadata
8. **Handle Blocking**: If `--block` flag, add `status:blocked` label and update cache
9. **Confirm**: Display Issue URL and confirm Discord notification

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

🔐 Getting identity...
✓ GitHub user: zkSoju
✓ Construct: loa-constructs

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
From: zkSoju@loa-constructs
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

## Blocking Flag

The `--block` flag marks your construct as blocked waiting for a response:

```bash
/send loa "Need architectural guidance" --block
```

This:
1. Adds `status:blocked` label to the Issue
2. Updates local `threads.json` with blocked entry
3. Shows blocked threads prominently in `/threads` dashboard
4. Discord notification includes "⏳ Sender is blocked waiting for response"

## Human Construct

Send to `human` for operator clarification (requires `human_discord_id` in config):

```bash
/send human "Soft delete or hard delete for user accounts?"
```

This pings the operator directly via Discord for decisions that need human input.

## Related

- `/inbox` - Triage incoming Melange feedback
- `/threads` - View all Melange threads including blocked
- Melange Protocol documentation in `melange/` directory
