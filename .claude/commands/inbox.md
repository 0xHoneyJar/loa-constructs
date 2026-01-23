---
name: "inbox"
version: "1.0.0"
description: |
  Triage incoming Melange feedback addressed to this Construct.
  Interactive workflow: review, accept, decline, or comment on each issue.

arguments:
  - name: "all"
    type: "flag"
    required: false
    description: "Include nice-to-have issues (default: game-changing + important only)"
  - name: "construct"
    type: "string"
    required: false
    description: "Filter to specific sender construct"

agent: "melange-inbox"
agent_path: "skills/melange-inbox/"

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
  - path: "Triage session summary"
    type: "terminal"
    description: "Summary of actions taken"

mode:
  default: "foreground"
  allow_background: false
---

# /inbox Command

## Purpose

Triage incoming Melange feedback addressed to this Construct. Interactive workflow to review, accept, decline, or comment on each Issue.

## Invocation

```bash
/inbox                    # Default: game-changing + important only
/inbox --all              # Include nice-to-have
/inbox --construct loa    # Filter to specific sender
```

## Workflow

1. **Query GitHub**: Search for open Melange Issues addressed to this Construct
2. **Present Summary**: Show inbox overview with impact indicators
3. **Interactive Triage**: For each Issue, show details and prompt for action
4. **Handle Actions**: Accept, decline, comment, skip, or quit
5. **Session Summary**: Display counts of actions taken

## Actions

| Action | Description | Effect |
|--------|-------------|--------|
| **Accept** | Commit to addressing the feedback | Comment posted, `status:accepted` label added |
| **Decline** | Decline with reason | Comment posted, `status:declined` label added, Issue closed |
| **Comment** | Add a comment | Comment posted, no status change |
| **Skip** | Move to next | No action taken |
| **Quit** | End triage | Exit to summary |

## Impact Indicators

| Emoji | Impact | Priority |
|-------|--------|----------|
| 🔴 | game-changing | Highest |
| 🟡 | important | Medium |
| 🟢 | nice-to-have | Lowest (hidden by default) |

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Construct identity configured in `.loa.config.yaml`
- Melange labels exist in organization repositories

## Example Session

```
> /inbox

📥 Inbox for loa-constructs (2 issues)

🔴 #42 [game-changing] loa: "Auth tokens expire during long sessions"
🟡 #38 [important] sigil: "Missing error codes in API responses"

Starting triage...

─────────────────────────────────────────
🔴 #42: Auth tokens expire during long sessions
From: jani@loa
Impact: game-changing
Intent: request

Experience:
During extended development sessions (>1 hour), auth tokens expire
without warning. This breaks workflows mid-task.

Request:
Extend token lifetime to 24h or implement refresh tokens.
─────────────────────────────────────────

Action: [A]ccept / [D]ecline / [C]omment / [S]kip / [Q]uit > a

Drafting acceptance comment...

"Accepted - this is a priority issue. Will implement refresh tokens
in the next sprint."

Post this comment? [Y/n/edit] y

✓ Commented on #42
✓ Added label: status:accepted
✓ Removed label: status:open

─────────────────────────────────────────
🟡 #38: Missing error codes in API responses
...

─────────────────────────────────────────
Triage complete:
  Accepted: 1
  Declined: 0
  Commented: 1
  Skipped: 0

Remaining in inbox: 0
```

## Related

- `/send` - Send feedback to another Construct
- Melange Protocol documentation in `melange/` directory
