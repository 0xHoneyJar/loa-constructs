# PRD: Melange CLI Integration

**Version:** 1.0.0
**Status:** Draft
**Cycle:** cycle-003
**Created:** 2026-01-23
**Builds On:** cycle-002 (Melange Infrastructure)

---

## 1. Problem Statement

Melange v0.9 infrastructure is deployed (GitHub Issues + Discord notifications), but there's no CLI integration. Currently:

- **Sending feedback** requires manually creating GitHub Issues via browser or raw `gh` commands
- **Receiving feedback** requires manually searching GitHub for `label:to:your-construct`
- **No construct identity** — AI agents don't know which construct they belong to
- **No triage workflow** — humans must context-switch to GitHub to process inbox

This friction reduces adoption and defeats the purpose of tight feedback loops.

## 2. Vision

Every Loa-powered Construct has built-in Melange skills:

```bash
# Sending feedback (from any Construct)
/send loa "Error messages don't include file paths"

# Receiving feedback (interactive triage)
/inbox
# → Walks through each issue: accept/decline/discuss
```

The human stays in their terminal. The AI helps draft structured Issues and responses.

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Reduce friction to send feedback | Time from idea to Issue created | < 60 seconds |
| Reduce friction to triage inbox | Issues processed per session | 100% of game-changing + important |
| Enable construct identity | Config coverage | All constructs have identity configured |
| Maintain HITL | Auto-processing rate | 0% (all actions require human approval) |

## 4. User Personas

### Primary: Construct Operator
- Human working with an AI agent (e.g., soju@Sigil)
- Encounters friction in another team's tooling
- Wants to send structured feedback without context-switching
- Wants to triage incoming feedback efficiently

### Secondary: Construct AI Agent
- Needs to know its identity (which construct, which repo)
- Helps draft Melange Issues from human descriptions
- Presents inbox in structured format
- Never auto-accepts or auto-declines (HITL always)

## 5. Functional Requirements

### 5.1 Construct Identity Configuration

**Config Location:** `.loa.config.yaml`

```yaml
construct:
  name: sigil                          # Construct name (lowercase)
  operator: soju                       # Human operator name
  repo: 0xHoneyJar/sigil              # GitHub repo for outbox
  org: 0xHoneyJar                      # GitHub org for inbox queries
```

**Behavior:**
- Skills read identity from config at runtime
- Error if `construct` block missing when Melange skills invoked
- Suggest adding config block with example

### 5.2 `/send` Command (Outbox — Melange Protocol)

**Invocation:**
```bash
/send <target-construct> "<brief description>"

# Examples
/send loa "Error messages don't include file paths"
/send registry "API rate limits too aggressive"
```

**Workflow:**

1. **Parse Arguments**
   - Extract target construct and brief description
   - Validate target is known construct in org

2. **AI Drafts Issue**
   - Prompt human for impact level (game-changing/important/nice-to-have)
   - Prompt for intent (request/ask/report)
   - AI expands brief description into structured Melange fields:
     - Experience (what's happening)
     - Evidence (links, logs, counts)
     - Request (what would help)
     - Reasoning (why this impact level)

3. **Human Review**
   - Show full Issue preview
   - Ask for approval: "Create this Issue? [Y/n/edit]"
   - If edit: allow inline modifications

4. **Create Issue**
   - Use `gh issue create` with proper labels
   - Return Issue URL
   - Confirm Discord notification will fire

**Output:**
```
Created: https://github.com/0xHoneyJar/sigil/issues/57
Discord notification sent to #melange (🟡 important)
```

### 5.3 `/inbox` Command (Triage)

**Invocation:**
```bash
/inbox                    # Default: game-changing + important only
/inbox --all              # Include nice-to-have
/inbox --construct loa    # Filter to specific sender
```

**Workflow:**

1. **Query GitHub**
   ```
   org:{org} is:issue is:open label:melange label:to:{construct}
   ```
   - Sort by: impact (game-changing first), then date (oldest first)

2. **Present Summary**
   ```
   📥 Inbox for sigil (3 issues)

   🔴 #42 [game-changing] loa → sigil: "Auth tokens expire too fast"
   🟡 #38 [important] registry → sigil: "Missing error codes in API"
   🟡 #35 [important] loa → sigil: "Docs missing for /validate"

   Starting triage...
   ```

3. **Interactive Triage (per issue)**
   - Fetch full Issue body
   - Present structured summary:
     ```
     ─────────────────────────────────────────
     🔴 #42: Auth tokens expire too fast
     From: jani@Loa
     Impact: game-changing
     Intent: request

     Experience:
     Tokens expire after 1 hour, forcing re-auth during long sessions...

     Request:
     Extend token lifetime to 24 hours or add refresh token support
     ─────────────────────────────────────────
     ```
   - Prompt for action:
     ```
     Action: [A]ccept / [D]ecline / [C]omment / [S]kip / [Q]uit
     ```

4. **Handle Actions**

   **Accept:**
   - AI drafts acceptance comment
   - Human approves comment
   - Post comment via `gh issue comment`
   - Add `status:accepted` label, remove `status:open`
   - Log to local tracking

   **Decline:**
   - Prompt for reason
   - AI drafts decline comment with reasoning
   - Human approves
   - Post comment, add `status:declined` label
   - Close Issue

   **Comment:**
   - Prompt for message
   - AI helps draft response
   - Post comment (no status change)

   **Skip:**
   - Move to next Issue (no action)

   **Quit:**
   - Exit triage, show summary of actions taken

5. **Session Summary**
   ```
   Triage complete:
   - Accepted: 2
   - Declined: 0
   - Commented: 1
   - Skipped: 0

   Remaining in inbox: 0
   ```

### 5.4 Local Tracking (Optional Enhancement)

Track accepted Issues locally for follow-up:

**File:** `grimoires/loa/send/accepted.json`

```json
{
  "accepted": [
    {
      "issue_url": "https://github.com/0xHoneyJar/loa/issues/42",
      "from": "jani@Loa",
      "title": "Auth tokens expire too fast",
      "accepted_at": "2026-01-23T10:00:00Z",
      "status": "in_progress",
      "resolution_pr": null
    }
  ]
}
```

Command to check status:
```bash
/inbox --accepted    # Show accepted issues awaiting resolution
```

## 6. Technical Requirements

### 6.1 Dependencies

- GitHub CLI (`gh`) authenticated with repo access
- `.loa.config.yaml` with `construct` block
- Melange infrastructure deployed to repo (Issue template, workflow, labels)

### 6.2 Skill Structure

```
.claude/skills/
├── melange-send/
│   ├── index.yaml
│   └── SKILL.md
└── melange-inbox/
    ├── index.yaml
    └── SKILL.md

.claude/commands/
├── send.md             # /send command routing
└── inbox.md            # /inbox command
```

### 6.3 Distribution

These skills ship with the Loa framework core. Every Construct that uses Loa automatically has `/send` and `/inbox` available.

**No additional installation required** — if Melange infrastructure is deployed to the repo (labels, templates), the skills just work.

### 6.4 Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Construct not configured" | Missing `construct` in config | Show example config block |
| "Target construct unknown" | Invalid target name | List valid constructs in org |
| "No Issues found" | Empty inbox | Confirm query, show "Inbox zero" |
| "gh CLI not authenticated" | Missing auth | Run `gh auth login` |
| "Melange not installed" | No labels/templates | Point to melange repo setup |

## 7. Scope

### In Scope (MVP)
- `/send <target> "<description>"` command
- `/inbox` interactive triage
- Construct identity in `.loa.config.yaml`
- Accept/Decline/Comment actions
- Session summary

### Out of Scope (Future)
- Local tracking of accepted Issues
- `/inbox --accepted` for follow-up
- Auto-linking resolution PRs to Issues
- Slack integration (Discord only for now)
- Multi-org support
- `/send status` for sent Issues

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Operators skip triage | Inbox grows, feedback ignored | Discord pings for game-changing |
| AI drafts poor Issues | Low signal, receiver confusion | Human review required before create |
| Identity misconfigured | Issues go to wrong repo | Validate config on skill load |
| gh CLI not installed | Skills fail | Clear error with install instructions |

### 5.5 Targeted Discord Mentions (v1.1)

**Problem:** Current implementation uses `@here` for game-changing issues, which pings everyone in the channel instead of the specific operator of the target Construct.

**Solution:** Add a Construct → Discord User ID mapping in the workflow file.

**Mapping Location:** `melange-notify.yml` (hardcoded for simplicity)

```javascript
const OPERATOR_MAP = {
  'sigil': '123456789012345678',      // soju's Discord ID
  'loa': '234567890123456789',        // jani's Discord ID
  'registry': '345678901234567890',   // api-team's Discord ID
  'loa-constructs': '123456789012345678'  // soju's Discord ID
};
```

**Behavior:**
- Look up `toConstruct` in `OPERATOR_MAP`
- If found: ping that specific user with `<@USER_ID>`
- If not found: fall back to `@here` (preserves current behavior)
- Only ping for `game-changing` and `important` impacts (unchanged)

**Discord Mention Format:**
```
🔴 game-changing: <@123456789012345678> - New feedback from soju@Sigil
🟡 important: <@123456789012345678> - New feedback from soju@Sigil
```

---

## Phase 2: Melange v2.0 Enhancements

**Added:** 2026-01-23
**Sprints:** 5-7

### 5.6 Blocking Flag (`/send --block`)

**Problem:** When a construct sends feedback and is waiting on a response, there's no visibility into blocked state.

**Solution:** Add `--block` flag to `/send` that:
1. Adds `status:blocked` label to the created Issue
2. Records blocked state in local tracking file
3. Shows blocked Issues prominently in `/threads` dashboard

**Invocation:**
```bash
/send loa "Need architectural guidance on auth flow" --block
```

**Behavior:**
- Issue created with additional label: `status:blocked`
- Local tracking: `grimoires/loa/melange/blocked.json` updated
- Discord notification includes: "⏳ Sender is blocked waiting for response"

### 5.7 Sender Filtering (`/inbox --from`)

**Problem:** When receiving feedback from multiple constructs, operators want to focus on specific senders.

**Solution:** Add `--from` filter to `/inbox`.

**Invocation:**
```bash
/inbox --from sigil       # Only Issues from sigil
/inbox --from loa,sigil   # Issues from loa or sigil
```

**Implementation:**
- Parse `From` field in Issue body
- Filter results before presentation
- Show filter in summary: "📥 Inbox for loa (from: sigil) (2 issues)"

### 5.8 PR Auto-Linking

**Problem:** When a PR resolves a Melange Issue, the link must be added manually.

**Solution:** Detect PR references in comments and auto-update Issue.

**Trigger Patterns:**
```
Resolved via #42
Resolved via org/repo#42
Fixed in PR #42
Closes #42
```

**Behavior:**
1. GitHub Action detects pattern in Issue comment
2. Extracts PR reference
3. Adds `resolution:PR#N` label
4. Updates `status:accepted` → `status:resolved` when PR merges

**Implementation:** New GitHub Action `melange-resolve.yml` triggered on:
- `issue_comment` (detect resolution comments)
- `pull_request` with `closes #N` (detect PR merge)

### 5.9 Melange Threads Dashboard (`/threads`)

**Problem:** No visibility into active Melange threads across the org. Hard to see what's blocked, what's waiting, what's resolved.

**Solution:** New `/threads` command that visualizes all Melange activity.

**Invocation:**
```bash
/threads                  # All active threads
/threads --mine           # Threads I'm involved in (sent or received)
/threads --blocked        # Only blocked threads
/threads --resolved       # Recently resolved (last 7 days)
```

**Dashboard Output:**
```
╔══════════════════════════════════════════════════════════════════╗
║                    MELANGE THREADS DASHBOARD                      ║
╠══════════════════════════════════════════════════════════════════╣
║ Active Threads: 5    Blocked: 2    Resolved (7d): 8              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ⏳ BLOCKED (2)                                                   ║
║  ├─ 🔴 #42 sigil → loa: "Auth architecture guidance"             ║
║  │      Waiting 2h • game-changing                                ║
║  └─ 🟡 #38 loa → sigil: "API contract clarification"             ║
║         Waiting 45m • important                                   ║
║                                                                   ║
║  📬 AWAITING RESPONSE (1)                                         ║
║  └─ 🟡 #35 registry → loa: "Rate limit configuration"            ║
║         Sent 3h ago • important • 1 comment                       ║
║                                                                   ║
║  ✅ IN PROGRESS (2)                                               ║
║  ├─ 🟡 #30 loa → sigil: "Refresh token implementation"           ║
║  │      Accepted 1d ago • PR #58 in progress                      ║
║  └─ 🟡 #28 sigil → loa: "Error message improvements"             ║
║         Accepted 2d ago • No PR linked                            ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  [B]locked detail • [A]ctive detail • [R]esolved • [Q]uit        ║
╚══════════════════════════════════════════════════════════════════╝
```

**Data Sources:**
- GitHub Issues API: `org:{org} label:melange is:open`
- Local tracking: `grimoires/loa/melange/threads.json` (cache)
- Cross-reference PRs for resolution status

**Interactive Mode:**
- Select a thread to see full details
- Jump to `/inbox` triage for that Issue
- Open in browser

### 5.10 Human Construct

**Problem:** Constructs sometimes need human input for intent clarification before proceeding.

**Solution:** Support a special `human` construct that routes directly to the operator.

**Configuration:**
```yaml
# .loa.config.yaml
construct:
  name: sigil
  operator: soju
  # ... existing fields ...
  human_discord_id: "259646475666063360"  # For /send human
```

**Invocation:**
```bash
/send human "Should deleted items be soft or hard delete?"
```

**Behavior:**
- Creates Issue with `to:human` label
- Discord pings the configured `human_discord_id`
- Issue stays open until human responds
- Construct can check status: `/threads --to human`

### 5.11 Local Thread Tracking

**Problem:** Querying GitHub API every time is slow. No persistent view of thread state.

**Solution:** Local cache with sync.

**File:** `grimoires/loa/melange/threads.json`

```json
{
  "last_sync": "2026-01-23T12:00:00Z",
  "threads": [
    {
      "id": "0xHoneyJar/sigil#42",
      "title": "Auth tokens expire during long sessions",
      "from": "jani@loa",
      "to": "sigil",
      "impact": "game-changing",
      "status": "accepted",
      "created": "2026-01-22T10:00:00Z",
      "accepted_at": "2026-01-22T11:00:00Z",
      "resolution_pr": null,
      "blocked": false,
      "comments": 3
    }
  ],
  "blocked": [
    {
      "id": "0xHoneyJar/loa#38",
      "blocked_at": "2026-01-23T09:00:00Z",
      "waiting_on": "loa"
    }
  ]
}
```

**Sync Behavior:**
- `/threads` auto-syncs if cache older than 5 minutes
- `/threads --sync` forces full refresh
- `/send` and `/inbox` actions update cache immediately

### 5.12 Cross-Repo Visibility

**Problem:** Constructs work across multiple repos but Melange threads are scattered.

**Solution:** `/threads` queries across all repos in the org.

**Query:**
```
org:0xHoneyJar label:melange is:open
```

**Grouping:**
```
╔═══════════════════════════════════════════════════════════════╗
║  THREADS BY REPOSITORY                                         ║
╠═══════════════════════════════════════════════════════════════╣
║  sigil (3 threads)                                             ║
║  ├─ #42 → loa: Auth guidance                                   ║
║  ├─ #38 ← loa: API contract                                    ║
║  └─ #35 ← registry: Rate limits                                ║
║                                                                ║
║  loa (2 threads)                                               ║
║  ├─ #28 ← sigil: Error messages                                ║
║  └─ #25 ← loa-constructs: CLI test                             ║
║                                                                ║
║  set-and-forgetti (1 thread)                                   ║
║  └─ #12 sigil → loa: Handoff for auth impl                     ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 9. Updated Scope

### Phase 1 (MVP) - ✅ COMPLETE
- `/send <target> "<description>"` command
- `/inbox` interactive triage
- Construct identity in `.loa.config.yaml`
- Accept/Decline/Comment actions
- Targeted Discord mentions (v1.1)

### Phase 2 (v2.0) - IN SCOPE
- `/send --block` flag for blocked state
- `/inbox --from` sender filtering
- `/threads` dashboard for visualization
- Local thread tracking with sync
- Human construct support
- PR auto-linking and resolution detection
- Cross-repo visibility

### Out of Scope (Future)
- Slack integration
- Multi-org support (beyond 0xHoneyJar)
- Thread archival and cleanup automation
- Mobile/web dashboard (CLI only for now)

---

## 10. Open Questions

1. ~~Should `/send` support file attachments?~~ (Deferred - use GitHub's native attachment in Issue body)
2. ~~Should triage persist state across sessions?~~ (Yes - local tracking in Phase 2)
3. ~~Should there be a `/send status` to check sent Issues?~~ (Yes - `/threads --mine`)

---

## Appendix: Example Sessions

### A. Sending Feedback

```
$ /send loa "Error messages don't show which file failed"

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
From: soju@Sigil
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
Significant friction during debugging, but workarounds exist (add logging).
Not blocking core workflow.
─────────────────────────────────────────

Create this Issue? [Y/n/edit] y

✓ Created: https://github.com/0xHoneyJar/sigil/issues/57
✓ Discord notification sent (🟡 important)
```

### B. Triaging Inbox

```
$ /inbox

📥 Inbox for sigil (2 issues)

🔴 #42 [game-changing] loa: "Auth tokens expire during long sessions"
🟡 #38 [important] registry: "Missing error codes in API responses"

Starting triage...

─────────────────────────────────────────
🔴 #42: Auth tokens expire during long sessions
From: jani@Loa
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

"Accepted - this is blocking our team too. Will implement refresh
tokens in the next sprint. Tracking in sigil#58."

Post this comment? [Y/n/edit] y

✓ Commented on loa#42
✓ Added label: status:accepted
✓ Removed label: status:open

─────────────────────────────────────────
🟡 #38: Missing error codes in API responses
From: api-team@Registry
...

[Triage continues...]

─────────────────────────────────────────
Triage complete:
  Accepted: 1
  Declined: 0
  Commented: 1
  Skipped: 0

Inbox clear! 🎉
```

### C. Sending with Block Flag

```
$ /send loa "Need architectural guidance: should auth use JWT or sessions?" --block

📤 Drafting Melange Issue to loa (BLOCKED)...

[... normal flow ...]

✓ Created: https://github.com/0xHoneyJar/sigil/issues/59
✓ Discord notification sent (🟡 important)
✓ Marked as BLOCKED - waiting on loa

Your construct is now blocked on this thread.
Use /threads --blocked to see status.
```

### D. Viewing Threads Dashboard

```
$ /threads

╔══════════════════════════════════════════════════════════════════╗
║                    MELANGE THREADS DASHBOARD                      ║
║                         loa-constructs                            ║
╠══════════════════════════════════════════════════════════════════╣
║ Active: 4    Blocked: 1    Resolved (7d): 2                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ⏳ BLOCKED (1)                                                   ║
║  └─ 🟡 #59 loa-constructs → loa: "Auth architecture guidance"    ║
║         Waiting 15m • important                                   ║
║                                                                   ║
║  📬 SENT - AWAITING RESPONSE (2)                                  ║
║  ├─ 🟡 #26 loa-constructs → sigil: "Testing targeted mentions"   ║
║  │      Sent 1h ago • important • status:open                     ║
║  └─ 🟢 #25 loa-constructs → loa: "Testing CLI integration"       ║
║         Sent 2h ago • nice-to-have • status:open                  ║
║                                                                   ║
║  📥 RECEIVED - NEEDS TRIAGE (1)                                   ║
║  └─ 🟡 #18 sigil → loa-constructs: "API feedback"                ║
║         Received 3h ago • important • untriaged                   ║
║                                                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Press [T] to triage received • [B] for blocked detail • [Q]uit  ║
╚══════════════════════════════════════════════════════════════════╝
```

### E. Filtering Inbox by Sender

```
$ /inbox --from sigil

📥 Inbox for loa-constructs (from: sigil) (1 issue)

🟡 #18 [important] sigil: "API response format feedback"

Starting triage...
```

### F. Sending to Human for Clarification

```
$ /send human "Soft delete or hard delete for user accounts?"

📤 Drafting Melange Issue to human...

What's the impact level?
  [1] game-changing - Blocks core workflow
  [2] important - Significant friction
> 1

[... drafting ...]

✓ Created: https://github.com/0xHoneyJar/sigil/issues/60
✓ Discord notification sent to operator (🔴 game-changing)
✓ Awaiting human response

Human will be notified. Check /threads for response.
```

---

**Document Status**: Draft (Phase 2 Added)
**Next Step**: `/architect` to update Software Design Document
