# PRD: Melange Protocol v2

## Executive Summary

Melange is an inter-Construct messaging protocol that enables AI agents (Constructs) to communicate with each other through GitHub Issues, with human operators serving as the decision layer. Each Construct has its own inbox, and messages flow between repos as structured feedback threads.

**Core Insight**: Constructs are coworkers. They need a way to ask questions, report issues, and request changes from each other—just like human team members do via Slack or email. Melange is their communication layer.

---

## 1. Problem Statement

### The Challenge

When multiple AI-assisted repos operate in the same org:

1. **No structured communication** - Agents can't formally request help from other agents
2. **Human bottleneck** - All cross-repo coordination goes through humans manually
3. **Lost context** - Feedback gets scattered across Slack, GitHub comments, meetings
4. **No accountability** - No clear record of who asked what, when, and how it was resolved

### Current State

```
Human notices issue in Sigil → Tells soju in Slack → soju mentally tracks it
→ Eventually works on it in Loa → Maybe tells Sigil it's done → Or forgets
```

### Desired State

```
Sigil agent identifies issue → /send loa "Need auth token refresh"
→ Issue created in Sigil repo → Discord notifies Loa → Loa operator /inbox
→ Accepts and works on it → Closes issue when fixed → Sigil gets notified
→ Sigil operator /review-resolution → Verifies → Thread archived
```

---

## 2. Vision & Goals

### Vision

**Constructs communicate as first-class team members.** Every Loa-powered repo can send structured messages to any other, with humans approving every action but not needing to manually coordinate.

### Goals

| Goal | Metric | Target |
|------|--------|--------|
| Reduce coordination overhead | Time from issue identification to resolution | 50% faster |
| Increase accountability | % of cross-repo requests with clear resolution | 100% tracked |
| Enable async collaboration | Human intervention required per message | 2 touches (send + triage) |
| Scale team communication | Constructs communicating per org | Unlimited |

### Non-Goals

- Automated responses (always human-in-the-loop)
- Real-time chat (async GitHub Issues are fine)
- External org communication (internal only for v2)

---

## 3. User Personas

### Primary: Construct Operator

**Who**: Human who operates one or more Constructs (e.g., soju runs Sigil, Hivemind, Ruggy)

**Workflow**:
1. Works in a Construct repo (e.g., Sigil)
2. Agent identifies issue that requires another Construct
3. Operator approves `/send loa "error handling needs work"`
4. Later, hops to Loa repo and runs `/inbox`
5. Triages incoming messages, accepts/declines with comments
6. When resolved, original sender verifies with `/review-resolution`

**Pain Points**:
- Mentally tracking cross-repo dependencies
- Forgetting to follow up on requests
- Losing context when switching between repos

### Secondary: Org Admin

**Who**: Person responsible for org-wide coordination

**Workflow**:
1. Runs `/threads` to see all active Melange threads across org
2. Identifies blocked threads
3. Escalates or reassigns as needed

---

## 4. Core Concepts

### 4.1 Construct Identity

Every Melange-enabled repo has a **Construct identity**:

```yaml
# .loa.config.yaml
melange:
  enabled: true
  construct:
    name: sigil           # Unique identifier
    repo: 0xHoneyJar/sigil
    org: 0xHoneyJar
```

The identity is registered in the **Loa Constructs Registry API**:

```json
{
  "name": "sigil",
  "display_name": "Sigil",
  "repo": "0xHoneyJar/sigil",
  "operator": {
    "display_name": "soju",
    "github_username": "zkSoju",
    "discord_id": "259646475666063360"
  }
}
```

### 4.2 Sender-Side Outbox

**Key principle**: Issues live in the SENDER's repo, not the receiver's.

```
Sigil → Loa message = Issue created in Sigil repo, labeled "to:loa"
```

This means:
- Sender owns their noise (their backlog stays clean)
- Receiver's inbox is a query, not a repo
- Threads are traceable back to the source

### 4.3 Discord Notification Layer

Each Construct can have its own Discord channel + webhook:

```
#sigil-melange     → Sigil's incoming messages
#loa-melange       → Loa's incoming messages
#hivemind-melange  → Hivemind's incoming messages
```

When a message is sent, the receiver's Discord channel gets notified:
- 🔴 game-changing → Red embed + @here
- 🟡 important → Yellow embed
- 🟢 nice-to-have → No notification (GitHub only)

When resolved, the sender gets notified in their channel.

### 4.4 Thread Lifecycle

```
OPEN → ACCEPTED → RESOLVED → VERIFIED
           ↓           ↓
       DECLINED    REOPENED
```

| Status | Meaning | Who Changes |
|--------|---------|-------------|
| open | Awaiting triage | Sender creates |
| accepted | Receiver working on it | Receiver via /inbox |
| declined | Receiver declined with reason | Receiver via /inbox |
| resolved | Receiver completed work | Receiver closes issue |
| verified | Sender confirmed resolution | Sender via /review-resolution |
| reopened | Resolution insufficient | Sender via /review-resolution |

---

## 5. Functional Requirements

### FR-1: Send Command

**`/send <target> "<message>" [--block]`**

| Step | Action |
|------|--------|
| 1 | Get authenticated GitHub username via `gh api user` |
| 2 | Read construct identity from config |
| 3 | Validate target exists in registry |
| 4 | Prompt for impact level and intent |
| 5 | AI drafts structured issue body |
| 6 | Human reviews and approves |
| 7 | Create issue with labels: `melange`, `to:{target}`, `from:{sender}`, `impact:*`, `status:open` |
| 8 | Discord notification fires to target's channel |

**Labels created**:
- `melange` - Protocol identifier
- `to:loa` - Routing to receiver
- `from:sigil` - Sender for filtering
- `impact:important` - Priority level
- `intent:request` - Message type
- `status:open` - Lifecycle state

### FR-2: Inbox Command

**`/inbox [--all] [--from <construct>]`**

| Step | Action |
|------|--------|
| 1 | Query GitHub: `org:{org} label:melange label:to:{this_construct} label:status:open` |
| 2 | Filter by impact (exclude nice-to-have unless --all) |
| 3 | Filter by sender if --from specified |
| 4 | Display summary table with impact indicators |
| 5 | For each issue, show details and prompt for action |
| 6 | Accept → add status:accepted label, post comment |
| 7 | Decline → add status:declined label, close issue, post reason |
| 8 | Comment → post comment, no status change |
| 9 | Skip/Quit → move on |

### FR-3: Threads Dashboard

**`/threads [--mine] [--blocked] [--resolved]`**

Displays org-wide view:

```
╔══════════════════════════════════════════════════════════════════╗
║                    MELANGE THREADS DASHBOARD                      ║
╠══════════════════════════════════════════════════════════════════╣
║  ⏳ BLOCKED (2)                                                   ║
║  └─ 🔴 #42 sigil → loa: "Auth tokens expire"                     ║
║  └─ 🟡 #38 hivemind → sigil: "Logo assets missing"               ║
║                                                                   ║
║  📬 SENT - AWAITING (3)                                           ║
║  📥 RECEIVED - NEEDS TRIAGE (1)                                   ║
║  ✅ RESOLVED THIS WEEK (5)                                        ║
╚══════════════════════════════════════════════════════════════════╝
```

### FR-4: Resolution Workflow

**When receiver closes issue**:
1. `melange-resolve.yml` workflow triggers
2. Adds `status:resolved` label
3. Sends Discord notification to sender's channel
4. Links resolution PR if detected

**Sender verification** via `/review-resolution`:
1. Query resolved threads from this construct
2. For each, show details and resolution
3. Verify → add `status:verified` label
4. Reopen → create follow-up issue, add `status:reopened`

### FR-5: Webhook Architecture

**Option A: Single org webhook (current)**
- One Discord channel for all Melange traffic
- Simpler setup, noisier channel
- Webhook stored in each repo's secrets

**Option B: Per-construct webhooks (recommended)**
- Each Construct has its own Discord channel
- Workflow fetches target's webhook from registry API
- Cleaner separation, feels like individual inboxes

**Registry stores webhooks**:
```json
{
  "name": "sigil",
  "operator": { ... },
  "melange": {
    "discord_webhook_id": "encrypted-or-fetched-at-runtime"
  }
}
```

**Workflow fetches webhook**:
```javascript
const construct = await fetch(`${REGISTRY_API}/constructs/${targetName}`);
const webhookUrl = construct.melange.discord_webhook;
// OR: webhook stored in target repo's secrets, fetched via API
```

---

## 6. Technical Architecture

### 6.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SENDER REPO                              │
│  (sigil)                                                         │
│                                                                  │
│  1. Operator runs /send loa "message"                            │
│  2. Issue created with labels                                    │
│  3. melange-notify.yml fires                                     │
│     └─ Fetches loa's webhook from registry                       │
│     └─ Sends Discord embed to #loa-melange                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LOA CONSTRUCTS REGISTRY                     │
│  (loa-constructs-api.fly.dev)                                    │
│                                                                  │
│  GET /v1/constructs/loa                                          │
│  → Returns operator.discord_id for @mentions                     │
│  → Could return discord_webhook for per-construct channels       │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DISCORD                                  │
│                                                                  │
│  #loa-melange channel                                            │
│  └─ Embed: "🟡 Request from sigil: Auth tokens..."               │
│  └─ @soju mentioned (operator.discord_id)                        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        RECEIVER REPO                             │
│  (loa)                                                           │
│                                                                  │
│  4. Operator runs /inbox                                         │
│  5. Queries all Issues across org with label:to:loa              │
│  6. Triages, accepts, works on it                                │
│  7. Closes issue when done                                       │
│  8. melange-resolve.yml fires                                    │
│     └─ Updates labels to status:resolved                         │
│     └─ Sends resolution notification to sigil's channel          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Required Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| `melange-notify.yml` | Each Construct repo | Send notifications on issue create |
| `melange-resolve.yml` | Each Construct repo | Handle resolution lifecycle |
| Registry API | loa-constructs-api | Construct directory + operator info |
| Discord channels | Discord server | Per-Construct or shared inbox |
| GitHub labels | Each repo | Routing and lifecycle tracking |

### 6.3 Installation

**For new Constructs**:
```bash
curl -fsSL https://...loa-constructs/main/melange/install.sh | bash
```

**For Loa-mounted repos**:
```yaml
# .loa.config.yaml
melange:
  enabled: true
  auto_install: true
```

---

## 7. Discord Channel Strategy

### Option A: Shared Channel (Simple)

```
#melange
├─ All notifications for all Constructs
├─ Single webhook in each repo's secrets
└─ Filter by @mentions to find your messages
```

**Pros**: Easy setup, one place to watch
**Cons**: Noisy, hard to track individual Construct's inbox

### Option B: Per-Construct Channels (Recommended)

```
#sigil-inbox      → Messages TO sigil
#loa-inbox        → Messages TO loa
#hivemind-inbox   → Messages TO hivemind
#melange-resolved → All resolution notifications
```

**Pros**: Clean separation, feels like email inboxes
**Cons**: More channels, webhook management complexity

### Option C: Hybrid

```
#melange-critical   → All game-changing (🔴)
#melange-important  → All important (🟡)
#melange-resolved   → All resolutions
```

**Pros**: Priority-based filtering
**Cons**: Lose per-Construct context

### Decision: Shared Channel with Repo Secrets

Each repo stores `MELANGE_DISCORD_WEBHOOK` pointing to the same `#melange` channel:

```bash
# On each Construct repo:
gh secret set MELANGE_DISCORD_WEBHOOK --repo ORG/REPO
```

All notifications go to one channel. Operators use @mentions and labels to filter.

**Why this works for now**:
- Small team (< 10 Constructs)
- Same operator often handles multiple Constructs
- Easy to set up, no registry complexity
- Can evolve to per-Construct channels later

---

## 8. Scope

### MVP (v2.0) - Current PR

- [x] /send with identity validation
- [x] /inbox with triage workflow
- [x] /threads dashboard
- [x] /review-resolution for verification
- [x] Resolution webhook with sender notification
- [x] Feature flag (melange.enabled)
- [x] Auto-install on first use
- [ ] Per-construct Discord channels

### v2.1

- [ ] Per-construct Discord webhooks via registry
- [ ] Thread analytics (time to resolution, etc.)
- [ ] Bulk triage in /inbox
- [ ] Thread search/filter

### v3.0 (Future)

- [ ] Cross-org communication
- [ ] Thread templates
- [ ] SLA tracking
- [ ] Integration with Linear/Notion

---

## 9. Decisions Made

| Question | Decision | Rationale |
|----------|----------|-----------|
| Channel strategy | Shared `#melange` channel | Simpler setup, team is small, one place to watch |
| Webhook storage | Repo secrets | Each repo owns its webhook, no central dependency |
| Resolution notifications | Same shared channel | Keep all Melange traffic together |
| Multi-operator | @mention primary operator | Use `operator.discord_id` from registry |

### Open for v3

1. **Cross-org communication**: How do external orgs participate?
2. **Channel scaling**: When to split to per-Construct channels?

---

## 10. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| Cross-repo issues tracked | 100% via Melange, not ad-hoc |
| Resolution visibility | Senders always notified |
| Human overhead | 2 interactions per thread (send + triage) |
| Adoption | All active Constructs use Melange |

---

## 11. Operator Daily Workflow

### Morning Routine

```bash
# 1. Check Discord #melange for overnight notifications
# 2. Open highest-priority Construct repo
cd ~/repos/loa

# 3. Run inbox to triage
/inbox

# 4. Accept/decline incoming threads
# 5. Work on accepted items
# 6. Close issues when resolved

# 7. Hop to next Construct
cd ~/repos/sigil
/inbox
# ... repeat
```

### When You Identify Cross-Repo Issue

```bash
# While working in Sigil, notice Loa needs a fix
/send loa "Error handling needs file paths"

# Impact: important
# Intent: request
# Review draft → Approve

# Issue created in Sigil repo
# Discord pings Loa operator
# Done - continue working
```

### When You Get Pinged

```
Discord: 🟡 Request from sigil: "Error handling needs file paths"

# Open Loa repo
cd ~/repos/loa
/inbox

# See the thread, review details
# Accept → "Will fix in next sprint"
# Work on it, close when done

# Sigil gets notified automatically
```

### Verification (Sender Side)

```bash
# After receiving resolution notification
cd ~/repos/sigil
/review-resolution

# Review: "Does this fix your issue?"
# Verify → Thread archived
# OR Reopen → "Still seeing the issue because..."
```

---

## Appendix: Current Implementation Status

### Completed (PR #24)

- Registry API v2 with nested operator object
- /send with GitHub OAuth identity
- /inbox, /threads, /review-resolution skills
- melange-notify.yml and melange-resolve.yml workflows
- Feature flag + auto-install infrastructure
- Distribution package (melange/install.sh)

### Pending Merge

- PR #24 to main branch
- Then resolution workflows go live

### Post-Merge Tasks

1. Set up per-Construct Discord channels (if adopting Option B)
2. Install Melange on sigil, hivemind, ruggy repos
3. Test full send → triage → resolve → verify cycle
