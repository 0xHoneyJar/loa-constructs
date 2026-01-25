# PRD: Melange Protocol v2 - Identity & Resolution

**Version:** 2.0.0
**Status:** Draft
**Cycle:** cycle-003
**Created:** 2026-01-22
**Builds On:** Melange CLI Integration (PR #24)

---

## 1. Problem Statement

The current Melange implementation has two critical gaps:

### 1.1 Identity Problem
The `/send` command allows users to configure any `operator` name in `.loa.config.yaml` and send Issues under that identity:
- **Spoofing Risk**: Anyone with repo access could claim messages are from a different operator
- **Registry Drift**: Sender's construct name might not match the central Constructs registry
- **No cryptographic tie** to GitHub identity

### 1.2 Resolution Problem
When a receiving Construct resolves an Issue, the sending Construct has no notification:
- **One-way communication**: Sender must manually check if their Issue was addressed
- **No closure loop**: Resolution happens silently in the receiver's repo
- **Bloat accumulation**: Threads pile up without clear resolution signals
- **Human verification gap**: No structured workflow for reviewing resolutions

## 2. Vision

### 2.1 Trustworthy Identity
Sender identity is **cryptographically verified**:

```bash
# When you run /send, the system:
# 1. Gets your GitHub username from gh CLI (OAuth-authenticated)
# 2. Validates your construct exists in the registry
# 3. Verifies you're registered as an operator for that construct
# 4. Creates Issue with verified From: "{github_username}@{construct}"
```

### 2.2 Push-Pull Resolution Model
Communication follows a **push suggestion, pull verification** pattern:

```
SENDING CONSTRUCT                    RECEIVING CONSTRUCT
      │                                      │
      │──── /send creates Issue ────────────>│
      │     (push: creates to:X label)       │
      │                                      │
      │                              /inbox triage
      │                              (human accepts)
      │                                      │
      │                              Implementation
      │                                      │
      │                              Close Issue
      │<──── Webhook notifies ──────────────│
      │      (push: resolution signal)       │
      │                                      │
      │                                      │
  /threads shows                             │
  "Resolution pending review"                │
      │                                      │
  /review-resolution                         │
  (human verifies)                           │
      │                                      │
  Mark verified ─────────────────────────────>
  (pull: confirmation)
```

**Key Principles**:
- **Push**: Lightweight notifications (GitHub webhook → Discord)
- **Pull**: Human-verified actions (operator reviews, confirms)
- **Minimize bloat**: Don't duplicate Issues across repos
- **Human integrity**: All verification requires human + construct collaboration

## 3. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Cryptographic identity | Sender verification rate | 100% |
| Registry consistency | Construct name validation | 100% |
| Clear attribution | GitHub username in From field | Always visible |
| No spoofing | Unregistered operator blocks | Soft block with warning |
| Resolution notification | Closed Issues trigger notification | 100% |
| Verification coverage | Resolutions reviewed by sender | >80% |
| Bloat reduction | Duplicate Issues across repos | 0 |

## 4. Proposed Solution

### 4.1 Identity Chain

```
GitHub OAuth (gh CLI) → GitHub Username → Construct Registry → Issue Author
         ↓                    ↓                   ↓                  ↓
   Proves identity     Retrieved via API    Validates membership   Creates Issue
```

### 4.2 Registry Schema Update

Current construct schema:
```typescript
{
  name: 'sigil',
  operator: 'soju',           // Display name only
  discord_id: '259646475666063360',
  status: 'active',
}
```

Proposed schema:
```typescript
{
  name: 'sigil',
  operator: {
    display_name: 'soju',
    github_username: 'zkSoju',    // NEW: validated identity
    discord_id: '259646475666063360',
  },
  status: 'active',
}
```

### 4.3 Validation Flow

When `/send` is invoked:

```
1. [Pre-flight] Get GitHub username: `gh api user --jq '.login'` → "zkSoju"
2. [Pre-flight] Read construct from .loa.config.yaml → "loa-constructs"
3. [Validate] Fetch from API: GET /v1/constructs/loa-constructs
4. [Verify] Check response.operator.github_username == authenticated user
5. [Decide]:
   - If construct not found → ERROR: "Construct 'X' not in registry"
   - If github_username missing → WARN: "Operator not registered, proceeding"
   - If github_username mismatch → ERROR: "GitHub user 'Y' not authorized for 'X'"
   - If match → PROCEED with verified identity
6. [Create Issue] From field: "{github_username}@{construct_name}"
```

### 4.4 From Field Format Change

Current: `soju@loa-constructs` (display name from config)
Proposed: `zkSoju@loa-constructs` (GitHub username from API)

This ensures:
- Clickable link to GitHub profile
- Consistent with Issue author
- Can't be spoofed via config edits

### 4.5 Resolution Notification Flow

When receiving Construct closes an Issue:

```
1. [Trigger] Issue closed in receiver's repo (e.g., 0xHoneyJar/sigil#42)
2. [Webhook] melange-resolve.yml fires on issue close
3. [Parse] Extract sender info from Issue body:
   - From: zkSoju@loa-constructs
   - Source repo: 0xHoneyJar/loa-constructs
4. [Notify] Post resolution comment to SENDER's repo as new Issue OR comment
   - Option A: Create "Resolution Notice" Issue in sender's repo
   - Option B: Use GitHub API to find original thread (if tracked)
5. [Discord] Ping sender's Discord: "Your thread to sigil was resolved"
6. [Dashboard] /threads shows "Resolution pending review" status
```

### 4.6 Resolution Review Workflow

New `/review-resolution` command for senders:

```bash
/review-resolution
# Shows list of resolved threads pending verification

# For each resolution:
# 1. Shows original Issue + resolution summary
# 2. Human verifies: "Does this address your concern?"
# 3. Actions:
#    - ✅ Verify: Mark as confirmed, remove from pending
#    - ❌ Reopen: Create follow-up Issue with context
#    - 💬 Comment: Add clarification without reopening
```

### 4.7 Issue Metadata for Tracking

To enable bi-directional linking, Issues need tracking metadata:

```markdown
<!-- melange-metadata
source_repo: 0xHoneyJar/loa-constructs
source_issue: 27
sender_github: zkSoju
sender_construct: loa-constructs
-->
```

This allows:
- Webhook to find sender's repo
- `/threads` to correlate Issues across repos
- Resolution to link back to original

## 5. Functional Requirements

### FR-1: Registry Schema Update
- Add `operator.github_username` field to construct schema
- Make `operator` an object (breaking change to API response)
- Populate existing constructs with correct GitHub usernames

### FR-2: Validation Endpoint (Optional)
- `GET /v1/constructs/:name/validate-sender?github_username=X`
- Returns: `{ valid: boolean, reason?: string }`
- Alternative: Client-side validation using existing endpoint

### FR-3: CLI Pre-flight Validation
- Add validation step before Issue creation
- Block on hard failures (construct not found)
- Warn on soft failures (github_username not set)
- Use GitHub username in From field

### FR-4: Error Messages
- Clear, actionable errors when validation fails
- Include link to registration process
- Show both expected and actual values

### FR-5: Resolution Webhook (melange-resolve.yml)
- Trigger on Issue close event with `melange` label
- Parse sender info from Issue body metadata
- Post notification to sender's repo OR Discord
- Include resolution summary and link

### FR-6: Resolution Review Command (/review-resolution)
- List resolved threads pending verification
- Show original Issue context + resolution
- Actions: Verify, Reopen, Comment
- Update thread status on verification

### FR-7: Issue Metadata Embedding
- Embed tracking metadata in Issue body (HTML comment)
- Include: source_repo, source_issue, sender_github, sender_construct
- Parse metadata in webhooks for bi-directional linking

### FR-8: Thread Status Lifecycle
- New statuses: `resolved-pending-review`, `verified`, `reopened`
- `/threads` dashboard shows resolution status
- Clear visual distinction for items needing attention

## 6. Non-Functional Requirements

### NFR-1: Performance
- Cache registry responses (5 minute TTL)
- Don't add latency to happy path

### NFR-2: Backwards Compatibility
- Grace period: Warn but don't block for 30 days
- Support constructs without github_username during transition

### NFR-3: Offline Mode
- If registry unavailable, warn but allow send
- Log for later audit

## 7. Implementation Tasks

### Phase 1: Registry Updates (Identity)
- [ ] Update CONSTRUCTS_REGISTRY schema in constructs.ts
- [ ] Add github_username for all constructs
- [ ] Update OpenAPI spec
- [ ] Deploy API changes

### Phase 2: CLI Identity Integration
- [ ] Add `getGitHubUsername()` helper using gh CLI
- [ ] Add registry validation in /send pre-flight
- [ ] Update From field to use GitHub username
- [ ] Add clear error messages

### Phase 3: Issue Metadata
- [ ] Update /send to embed melange-metadata HTML comment
- [ ] Include source_repo, source_issue, sender info
- [ ] Update /inbox to parse and display metadata

### Phase 4: Resolution Webhook
- [ ] Create melange-resolve.yml workflow
- [ ] Trigger on Issue close with melange label
- [ ] Parse sender metadata from Issue body
- [ ] Post Discord notification to sender
- [ ] Optionally create "Resolution Notice" in sender's repo

### Phase 5: Resolution Review
- [ ] Create /review-resolution command
- [ ] Query for resolved threads from /threads cache
- [ ] Interactive verification workflow
- [ ] Update thread status on verification

### Phase 6: Thread Status Updates
- [ ] Add new statuses: resolved-pending-review, verified, reopened
- [ ] Update /threads dashboard to show resolution status
- [ ] Add filtering: `/threads --pending-review`

### Phase 7: Documentation
- [ ] Update melange/README.md with full lifecycle
- [ ] Document identity requirements
- [ ] Document resolution workflow
- [ ] Add troubleshooting section

## 8. Out of Scope

- Multi-operator support (future)
- Organization-level permissions (future)
- Token-based auth alternative (future)
- Operator transfer/rotation (future)
- Automated resolution verification (human-in-the-loop required)
- Cross-org Melange (same org only for now)

## 9. Open Questions

1. Should we support "any org member can send as construct" mode?
2. Grace period duration before hard enforcement?
3. Should cached validation survive across sessions?
4. Resolution notices: Create new Issue in sender's repo OR just Discord ping?
5. Should unverified resolutions auto-archive after N days?

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing workflows | High | Soft launch with warnings first |
| Registry availability | Medium | Cache + offline grace period |
| Case sensitivity issues | Low | Normalize all comparisons |
| GitHub username changes | Low | Periodic re-validation |
| Notification spam | Medium | Only notify on close, not every comment |
| Cross-repo permission issues | High | Use GitHub App or PAT with org access |

## 11. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MELANGE PROTOCOL v2 LIFECYCLE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SENDER (loa-constructs)              RECEIVER (sigil)              │
│  ════════════════════                 ════════════════              │
│                                                                     │
│  1. /send sigil "bug"                                               │
│     ├─ Validate identity (gh CLI)                                   │
│     ├─ Validate construct (API)                                     │
│     └─ Create Issue with metadata ─────────> Issue #42 created      │
│                                              ├─ to:sigil label      │
│                                              └─ melange-metadata    │
│                                                                     │
│  2. Discord notification ─────────────────> 🔔 @soju: New thread    │
│                                                                     │
│                                       3. /inbox                     │
│                                          └─ Accept Issue #42        │
│                                                                     │
│                                       4. Implementation...          │
│                                                                     │
│                                       5. Close Issue #42            │
│                                          └─ melange-resolve.yml     │
│                                             triggers                │
│                                                                     │
│  6. Discord notification <───────────────── 🔔 @zkSoju: Resolved    │
│     /threads shows "pending review"                                 │
│                                                                     │
│  7. /review-resolution                                              │
│     ├─ View resolution                                              │
│     └─ Verify ✅                                                    │
│        └─ Status: verified                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 12. Labels Required

| Label | Repo | Purpose |
|-------|------|---------|
| `melange` | All | Identifies Melange Issues |
| `to:{construct}` | All | Routes to receiving construct |
| `from:{construct}` | All | Identifies sender (NEW) |
| `status:open` | All | Default status |
| `status:accepted` | All | Receiver accepted |
| `status:declined` | All | Receiver declined |
| `status:resolved` | All | Receiver closed (NEW) |
| `status:verified` | Sender | Sender verified resolution (NEW) |
| `impact:{level}` | All | Priority indicator |
