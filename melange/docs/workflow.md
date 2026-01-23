# Melange Workflow Guide

This guide explains the Issue lifecycle and workflow for cross-Construct communication using Melange Protocol.

## Core Principle: Sender-Side Outbox

In Melange, **Issues live in the sender's repository**, not the receiver's. This is called the "sender-side outbox" model.

### Why Sender-Side?

- **Sender owns the noise** - Your feedback requests don't pollute someone else's backlog
- **Single source of truth** - All communication history in one place
- **Clear ownership** - You manage your own Issues
- **No cross-repo pollution** - Receivers only see notifications, not inbox clutter

## Issue Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MELANGE ISSUE LIFECYCLE                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   1. CREATED                                                          │
│   └── Labels: melange, to:loa, impact:game-changing, status:open     │
│       Discord: 🔴 notification with @here                             │
│                              │                                        │
│                              ▼                                        │
│   2. REVIEWED                                                         │
│   └── Receiver reads Issue, asks clarifying questions                │
│       (Comments happen in sender's repo)                              │
│                              │                                        │
│                              ▼                                        │
│   3. ACCEPTED (or DECLINED)                                          │
│   └── Receiver comments: "Accepted - building this"                  │
│       Labels: + status:accepted (- status:open)                       │
│                              │                                        │
│                              ▼                                        │
│   4. IMPLEMENTED                                                      │
│   └── Receiver creates PR in their own repo                          │
│       References original Issue in PR description                     │
│                              │                                        │
│                              ▼                                        │
│   5. RESOLVED                                                         │
│   └── Receiver comments: "Resolved via 0xHoneyJar/loa#49"           │
│       Labels: + status:resolved (- status:accepted)                   │
│       Issue: Closed                                                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Status Transitions

| From | To | Trigger | Who |
|------|-----|---------|-----|
| (none) | `status:open` | Issue created | Sender |
| `status:open` | `status:accepted` | Receiver accepts | Receiver |
| `status:open` | `status:declined` | Receiver declines | Receiver |
| `status:open` | `status:blocked` | External dependency | Either |
| `status:accepted` | `status:resolved` | Work completed | Receiver |
| `status:blocked` | `status:open` | Blocker removed | Either |

## Impact Levels

| Impact | When to Use | Discord Notification |
|--------|-------------|---------------------|
| **game-changing** | Blocks core workflow | 🔴 + `@here` ping |
| **important** | Significant friction | 🟡 no ping |
| **nice-to-have** | Improvement idea | No notification |

### Impact Selection Guide

Ask yourself:
1. **game-changing**: "Can I do my job without this?" → If no, it's game-changing
2. **important**: "Does this slow me down significantly?" → If yes, it's important
3. **nice-to-have**: "Would this be nice but not critical?" → nice-to-have

## Human-in-the-Loop (HITL) Requirement

**Every Melange Issue requires explicit human approval before any work begins.**

This is enforced by:
1. **Protocol design** - Status transitions require human comments
2. **AI agent constraints** - Documented that AI must not auto-accept
3. **Artifact requirement** - Resolution requires PR reference (human creates PR)

### What AI Agents Should Do

```markdown
## AI Agent Melange Protocol

When you receive a Melange Issue addressed to this Construct:

1. **Present to human**: Show structured summary
   - Impact level
   - Experience description
   - What's being requested
   - Evidence provided

2. **Wait for human decision**
   - Do NOT accept/decline without explicit human approval
   - Do NOT start implementation without "implement" or "build this"

3. **Only implement after acceptance**
   - Human must explicitly say "implement", "build this", or similar

4. **Track artifact**
   - When PR is created, comment on original Issue with reference
```

## Example Workflow

### Sigil → Loa Communication

1. **Sigil operator** identifies a pain point in Loa
2. **Sigil AI** helps draft Melange Issue with structured intent
3. **Issue created** in `0xHoneyJar/sigil` repo with:
   - Labels: `melange`, `to:loa`, `impact:game-changing`
   - Form fields filled out
4. **GitHub Action** sends Discord notification with @here
5. **Loa operator** sees notification, clicks link to sigil repo
6. **Loa operator** reads Issue, asks clarifying questions
7. **Loa operator** understands intent, comments "Accepted"
8. **Loa operator** (or Loa AI) creates PR in `0xHoneyJar/loa`
9. **PR merged**
10. **Loa operator** comments: "Resolved via 0xHoneyJar/loa#49"
11. **Issue closed** with `status:resolved`

## Query Examples

### Find Your Inbox (Issues addressed to you)

```
org:0xHoneyJar is:issue is:open label:melange label:to:loa
```

### Find Your Outbox (Issues you created)

```
repo:0xHoneyJar/sigil is:issue label:melange
```

### Find game-changing Issues

```
org:0xHoneyJar is:issue is:open label:melange label:impact:game-changing
```

### Find Accepted Issues Needing Resolution

```
org:0xHoneyJar is:issue is:open label:melange label:status:accepted
```

## Best Practices

1. **Be honest about impact** - game-changing triggers @here; don't cry wolf
2. **Provide evidence** - Links, counts, logs make your case stronger
3. **Explain reasoning** - Why this impact level? Help receivers prioritize
4. **Stay in the thread** - All discussion happens in the sender's Issue
5. **Link artifacts** - When resolved, reference the specific PR/commit
