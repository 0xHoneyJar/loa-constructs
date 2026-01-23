---
name: "threads"
version: "1.0.0"
description: |
  Melange Threads Dashboard - visualize all active threads across the org.
  Shows blocked, awaiting, in-progress, and resolved threads.

arguments:
  - name: "mine"
    type: "flag"
    required: false
    description: "Show only threads I'm involved in (sent or received)"
  - name: "blocked"
    type: "flag"
    required: false
    description: "Show only blocked threads"
  - name: "resolved"
    type: "flag"
    required: false
    description: "Show recently resolved threads (last 7 days)"
  - name: "sync"
    type: "flag"
    required: false
    description: "Force full refresh from GitHub"

agent: "melange-threads"
agent_path: "skills/melange-threads/"

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
  - path: "Terminal dashboard"
    type: "terminal"
    description: "ASCII dashboard of Melange threads"

mode:
  default: "foreground"
  allow_background: false
---

# /threads Command

## Purpose

Visualize all Melange threads across the org. Shows what's blocked, what needs attention, and what's been resolved.

## Invocation

```bash
/threads                  # All active threads
/threads --mine           # Threads I'm involved in (sent or received)
/threads --blocked        # Only blocked threads
/threads --resolved       # Recently resolved (last 7 days)
/threads --sync           # Force full refresh from GitHub
```

## Dashboard

The dashboard displays threads organized by status using markdown tables:

```
MELANGE THREADS DASHBOARD
loa-constructs
────────────────────────────────────────

Active: 3    Blocked: 1    Resolved (7d): 2

⏳ BLOCKED (1)

| # | Thread | To | Impact | Age |
|---|--------|-----|--------|-----|
| 1 | #42 Auth architecture guidance | loa | 🔴 game-changing | 2h |

📬 SENT - AWAITING RESPONSE (2)

| # | Thread | To | Impact | Age |
|---|--------|-----|--------|-----|
| 2 | #26 Testing targeted mentions | sigil | 🟡 important | 2h |
| 3 | #25 Testing CLI integration | loa | 🟢 nice-to-have | 3h |

📥 RECEIVED - NEEDS TRIAGE (0)
   ✨ No incoming Issues

────────────────────────────────────────
[T]riage received • [1-9] View details • [Q]uit
```

## Interactive Navigation

| Key | Action |
|-----|--------|
| T | Jump to `/inbox` for triage |
| 1-9 | Select thread by number |
| Q | Quit dashboard |

## Data Sources

- **GitHub Issues**: `org:{org} label:melange is:open`
- **Local Cache**: `grimoires/loa/melange/threads.json`
- Auto-syncs if cache > 5 minutes old

## Related

- `/send` - Send new Melange feedback
- `/inbox` - Triage incoming feedback
