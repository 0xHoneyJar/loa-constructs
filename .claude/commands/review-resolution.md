---
name: "review-resolution"
version: "1.0.0"
description: |
  Review and verify resolved Melange threads.
  Interactive workflow to verify, reopen, or comment on resolved threads.

arguments:
  - name: "all"
    type: "flag"
    required: false
    description: "Include all resolved threads (not just pending review)"

agent: "melange-review"
agent_path: "skills/melange-review/"

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
  - path: "GitHub Issue updates"
    type: "external"
    description: "Verified/reopened threads"

mode:
  default: "foreground"
  allow_background: false
---

# /review-resolution Command

## Purpose

Review and verify resolved Melange threads. When a receiving Construct closes an Issue, this command helps you verify whether the resolution addresses your original concern.

## Invocation

```bash
/review-resolution              # Review pending (unverified) resolutions
/review-resolution --all        # Review all resolved threads
```

## Workflow

1. **Query Threads**: Find resolved threads where sender = this construct
2. **Display Summary**: Show list of pending review threads
3. **Interactive Triage**: For each thread, show details and prompt for action
4. **Handle Actions**: Verify, reopen, comment, or skip
5. **Update Labels**: Add `status:verified` or create follow-up Issue

## Actions

| Action | Description | Effect |
|--------|-------------|--------|
| **Verify** | Confirm resolution addresses concern | `status:verified` label added |
| **Reopen** | Resolution incomplete, need follow-up | New Issue created linking original |
| **Comment** | Add clarification | Comment posted, status unchanged |
| **Skip** | Move to next | No action taken |
| **Quit** | End review | Exit to summary |

## Example Session

```
> /review-resolution

🔍 Resolved Threads Pending Review (2)

| # | Thread | To | Resolved | Age |
|---|--------|-----|----------|-----|
| 1 | #42 Auth tokens expire | loa | 2h ago | 5d |
| 2 | #38 API error codes | ruggy | 1d ago | 3d |

Starting review...

─────────────────────────────────────────
🔔 #42: Auth tokens expire during long sessions
To: loa
Resolved: 2h ago
Resolution: PR #45 merged

Original Request:
Extend token lifetime to 24h or implement refresh tokens.

Resolution Comment:
"Implemented refresh token rotation. Tokens now auto-refresh
when within 15 minutes of expiry."

Linked PR: #45 (merged)
─────────────────────────────────────────

Action: [V]erify / [R]eopen / [C]omment / [S]kip / [Q]uit > v

Does this resolution address your original concern? [Y/n] y

✓ Added label: status:verified
✓ Thread marked as verified

─────────────────────────────────────────
Review complete:
  Verified: 1
  Reopened: 0
  Commented: 0
  Skipped: 1

Pending review: 1
```

## Reopen Flow

When reopening a thread, a follow-up Issue is created:

```
Action: [V]erify / [R]eopen / [C]omment / [S]kip / [Q]uit > r

Why does this need follow-up?
> Token refresh works but original long-session issue persists.

Creating follow-up Issue...

Title: [Melange] Follow-up: Auth tokens expire during long sessions

Body:
### Follow-up to #{original_number}

The original Issue was resolved but requires additional work.

**Original request:** Extend token lifetime to 24h or implement refresh tokens.

**Why follow-up needed:**
Token refresh works but original long-session issue persists.

**Previous resolution:** PR #45

---
Re-opened from #{original_number}

Create this Issue? [Y/n] y

✓ Created: https://github.com/0xHoneyJar/loa-constructs/issues/58
✓ Added label: status:reopened to original #42
✓ Linked follow-up in original thread
```

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Construct identity configured in `.loa.config.yaml`
- Resolved threads with `status:resolved` label

## Thread Sources

Queries GitHub for Issues where:
- Label: `melange`
- Label: `status:resolved`
- Label: `from:{this_construct}` (threads this construct sent)
- NOT: `status:verified`

## Related

- `/threads --pending-review` - Quick view of pending review queue
- `/threads` - Full Melange threads dashboard
- `/send` - Send new Melange feedback
