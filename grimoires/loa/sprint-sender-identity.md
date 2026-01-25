# Sprint Plan: Melange Protocol v2 - Identity & Resolution

**Version**: 1.0.0
**Date**: 2026-01-22
**Cycle**: cycle-004
**PRD**: `grimoires/loa/prd-sender-identity.md`
**SDD**: `grimoires/loa/sdd-sender-identity.md`

---

## Sprint Overview

| Sprint | Goal | Tasks | Complexity |
|--------|------|-------|------------|
| Sprint 8 | Registry Schema v2 | 3 | Low |
| Sprint 9 | /send Identity Validation | 4 | Medium |
| Sprint 10 | Resolution Webhook | 3 | Medium |
| Sprint 11 | Review Command & Dashboard | 4 | Medium |

**Total Tasks**: 14
**Global Sprint IDs**: 8-11

---

## Sprint 8: Registry Schema v2

**Goal**: Update Constructs registry to include GitHub usernames for identity validation.

**Global ID**: 8
**Dependency**: None (can start immediately)

### Tasks

#### T8.1: Update CONSTRUCTS_REGISTRY Schema
**Description**: Convert `operator` from string to nested object with `display_name`, `github_username`, and `discord_id`.

**File**: `apps/api/src/routes/constructs.ts`

**Acceptance Criteria**:
- [ ] `operator` field is an object, not a string
- [ ] All constructs have `operator.github_username` populated
- [ ] Bump registry version to `2.0.0`
- [ ] Framework (loa) has correct GitHub username
- [ ] Registry (loa-constructs) has `zkSoju`
- [ ] All constructs (sigil, hivemind, ruggy) have correct usernames

**Effort**: Small

---

#### T8.2: Update OpenAPI Spec
**Description**: Update OpenAPI schema to reflect new nested operator structure.

**File**: `apps/api/src/docs/openapi.ts`

**Acceptance Criteria**:
- [ ] `Construct` schema references new `Operator` schema
- [ ] `Operator` schema includes `display_name`, `github_username`, `discord_id`
- [ ] Examples updated with realistic data
- [ ] All response schemas still valid

**Effort**: Small

---

#### T8.3: Deploy & Verify
**Description**: Deploy API changes and verify endpoints return new schema.

**Acceptance Criteria**:
- [ ] `GET /v1/constructs` returns v2 schema
- [ ] `GET /v1/constructs/sigil` returns nested operator
- [ ] `/v1/constructs/operator-map` still works (backwards compatible)
- [ ] No breaking changes to existing consumers

**Effort**: Small

---

## Sprint 9: /send Identity Validation

**Goal**: Add pre-flight identity validation to /send command using GitHub OAuth.

**Global ID**: 9
**Dependency**: Sprint 8 (Registry Schema v2)

### Tasks

#### T9.1: Get GitHub Username Helper
**Description**: Add function to retrieve authenticated GitHub username via `gh` CLI.

**Implementation** (in /send command):
```bash
gh api user --jq '.login'
```

**Acceptance Criteria**:
- [ ] Successfully retrieves GitHub username
- [ ] Handles `gh` not authenticated error
- [ ] Handles `gh` not installed error
- [ ] Returns lowercase normalized username

**Effort**: Small

---

#### T9.2: Registry Validation Pre-flight
**Description**: Validate sender's construct exists in registry and operator matches.

**Implementation** (in /send command):
```
1. Fetch: GET /v1/constructs/{construct_name}
2. Validate: construct exists
3. Validate: operator.github_username matches gh user
4. Proceed or error
```

**Acceptance Criteria**:
- [ ] ERROR if construct not found in registry
- [ ] WARN if github_username not set (proceed anyway)
- [ ] ERROR if github_username doesn't match authenticated user
- [ ] Clear error messages with actionable guidance
- [ ] Cache registry response for 5 minutes

**Effort**: Medium

---

#### T9.3: Update From Field Format
**Description**: Change From field from `{operator}@{construct}` to `{github_username}@{construct}`.

**Acceptance Criteria**:
- [ ] From field uses GitHub username from validation
- [ ] Issue body shows `zkSoju@loa-constructs` format
- [ ] Discord notification shows correct From

**Effort**: Small

---

#### T9.4: Embed Melange Metadata
**Description**: Add hidden metadata block to Issue body for resolution tracking.

**Format**:
```markdown
<!-- melange-metadata
source_repo: 0xHoneyJar/loa-constructs
sender_github: zkSoju
sender_construct: loa-constructs
sender_discord: 970593060553646101
created_at: 2026-01-22T10:30:00Z
-->
```

**Acceptance Criteria**:
- [ ] Metadata appended to Issue body (at end)
- [ ] Includes all required fields
- [ ] Invisible when viewing Issue in browser
- [ ] Parseable by regex in webhooks
- [ ] Add `from:{construct}` label to Issue

**Effort**: Small

---

## Sprint 10: Resolution Webhook

**Goal**: Create webhook that notifies sender when their Issue is resolved.

**Global ID**: 10
**Dependency**: Sprint 9 (metadata must be present in Issues)

### Tasks

#### T10.1: Create melange-resolve.yml
**Description**: GitHub Action workflow that triggers on Issue close and sends Discord notification.

**File**: `melange/.github/workflows/melange-resolve.yml`

**Acceptance Criteria**:
- [ ] Triggers on `issues: [closed]`
- [ ] Only runs for Issues with `melange` label
- [ ] Parses `<!-- melange-metadata -->` from body
- [ ] Adds `status:resolved` label
- [ ] Removes `status:accepted` label if present
- [ ] Sends Discord notification to sender
- [ ] Skips if no metadata found (old Issues)

**Effort**: Medium

---

#### T10.2: Create status:resolved Label
**Description**: Create new label for resolved Issues in all Construct repos.

**Acceptance Criteria**:
- [ ] Label `status:resolved` exists in loa-constructs
- [ ] Color: Blue (#0065FF)
- [ ] Description: "Issue resolved by receiver"

**Effort**: Small

---

#### T10.3: Deploy to Construct Repos
**Description**: Copy melange-resolve.yml to all Construct repos in the org.

**Repos**:
- 0xHoneyJar/loa-constructs (primary)
- 0xHoneyJar/sigil
- 0xHoneyJar/loa
- 0xHoneyJar/hivemind-os
- 0xHoneyJar/ruggy-security

**Acceptance Criteria**:
- [ ] Workflow file exists in all repos
- [ ] MELANGE_DISCORD_WEBHOOK secret configured
- [ ] Test by closing a Melange Issue
- [ ] Discord notification received

**Effort**: Medium

---

## Sprint 11: Review Command & Dashboard

**Goal**: Create /review-resolution command and update /threads dashboard.

**Global ID**: 11
**Dependency**: Sprint 10 (resolution webhook must work)

### Tasks

#### T11.1: Create /review-resolution Command
**Description**: New command for verifying resolved threads.

**Files**:
- `.claude/commands/review-resolution.md`

**Workflow**:
1. Query GitHub for resolved Issues where sender = this construct
2. Display each Issue with original context
3. Human action: Verify, Reopen, Comment, Skip
4. Update thread status

**Acceptance Criteria**:
- [ ] Command file created with YAML frontmatter
- [ ] Lists resolved Issues from sender's construct
- [ ] Shows Issue title, body summary, resolution date
- [ ] Verify action: adds `status:verified` label
- [ ] Reopen action: creates follow-up Issue
- [ ] Comment action: posts comment, keeps pending
- [ ] Skip action: moves to next

**Effort**: Large

---

#### T11.2: Update threads.json Schema
**Description**: Add resolution tracking fields to thread cache.

**New Fields**:
```typescript
interface Thread {
  // ... existing fields
  status: 'open' | 'accepted' | 'declined' | 'resolved' | 'verified' | 'reopened';
  resolved_at?: string;
  verified_at?: string;
}
```

**Acceptance Criteria**:
- [ ] Schema supports new statuses
- [ ] `resolved_at` populated when Issue closed
- [ ] `verified_at` populated when human verifies
- [ ] Backwards compatible with existing cache

**Effort**: Small

---

#### T11.3: Update /threads Dashboard
**Description**: Add "Pending Review" section to threads dashboard.

**New Section**:
```
🔔 RESOLVED - PENDING REVIEW (2)

| # | Thread | To | Resolved | Age |
|---|--------|-----|----------|-----|
| 3 | #38 API error codes | ruggy | 1h ago | 5d |
```

**Acceptance Criteria**:
- [ ] New section shows resolved-but-unverified threads
- [ ] Header count shows pending review count
- [ ] Interactive option: "Review resolutions"
- [ ] Sorted by resolved_at (newest first)

**Effort**: Medium

---

#### T11.4: Add --pending-review Flag
**Description**: Add flag to filter threads to pending review only.

**Usage**: `/threads --pending-review`

**Acceptance Criteria**:
- [ ] Flag filters to status=resolved only
- [ ] Quick access to review queue
- [ ] Shows "No pending reviews" if empty

**Effort**: Small

---

## Risk Mitigation

| Risk | Sprint | Mitigation |
|------|--------|------------|
| Registry unavailable | 9 | Cache responses, warn-only mode |
| Metadata parsing fails | 10 | Graceful skip, log for debugging |
| Discord webhook fails | 10 | Retry logic, error logging |
| Cross-repo permissions | 10 | Use org-level secrets |

---

## Testing Checklist

### Sprint 8 Tests
- [ ] API returns nested operator object
- [ ] All constructs have github_username
- [ ] OpenAPI spec validates

### Sprint 9 Tests
- [ ] Valid operator can send
- [ ] Invalid operator blocked with error
- [ ] Unregistered construct blocked
- [ ] Missing github_username warns but proceeds
- [ ] Metadata embedded in Issue

### Sprint 10 Tests
- [ ] Close Issue triggers webhook
- [ ] Discord notification sent to sender
- [ ] status:resolved label added
- [ ] Old Issues without metadata skip gracefully

### Sprint 11 Tests
- [ ] /review-resolution lists pending threads
- [ ] Verify action adds status:verified
- [ ] /threads shows pending review count
- [ ] --pending-review flag filters correctly

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Identity validation rate | 100% | All /send uses validated username |
| Resolution notification rate | 100% | All closes trigger Discord |
| Verification coverage | >80% | Resolutions reviewed by sender |
| Bloat | 0 | No duplicate Issues created |

---

## Next Steps

After sprint plan approval:
```bash
/implement sprint-8
```

Sprints can be run sequentially. Sprint 8-9 are required before 10-11.
