# Sprint Plan: Melange CLI Integration

**Cycle**: cycle-003
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-01-23
**Updated**: 2026-01-23 (Phase 2 added)

---

## Sprint Overview

| Sprint | Label | Tasks | Focus | Status |
|--------|-------|-------|-------|--------|
| Sprint 3 | `/send` Command & Skill | 4 | Outbox functionality | ✅ Complete |
| Sprint 4 | `/inbox` Command & Skill | 4 | Inbox triage functionality | ✅ Complete |
| Sprint 5 | `/threads` Dashboard | 5 | Thread visualization | 🔲 Planned |
| Sprint 6 | Command Enhancements | 4 | `--block`, `--from`, cache sync | 🔲 Planned |
| Sprint 7 | Automation & Integration | 4 | PR linking, human construct | 🔲 Planned |

**Phase 1 Tasks**: 8 (complete)
**Phase 2 Tasks**: 13 (planned)
**Total Tasks**: 21

---

## Sprint 3: `/send` Command & Skill

**Global ID**: 3
**Label**: Outbox - Send Feedback to Constructs
**Estimated Size**: MEDIUM

### Task 3.1: Construct Identity Configuration

**Description**: Add construct identity block to `.loa.config.yaml` schema

**Acceptance Criteria**:
- [ ] Add `construct:` block with `name`, `operator`, `repo`, `org`, `known_constructs` fields
- [ ] Document each field with inline comments
- [ ] Set sensible defaults for `known_constructs`

**Files**:
- `.loa.config.yaml`

---

### Task 3.2: gh Authentication Check Script

**Description**: Create helper script to verify gh CLI is authenticated

**Acceptance Criteria**:
- [ ] Create `.claude/scripts/check-gh-auth.sh`
- [ ] Script exits 0 if authenticated, 1 if not
- [ ] Script is executable (`chmod +x`)

**Files**:
- `.claude/scripts/check-gh-auth.sh`

---

### Task 3.3: `/send` Command Definition

**Description**: Create the command routing file for `/send`

**Acceptance Criteria**:
- [ ] Create `.claude/commands/send.md` with YAML frontmatter
- [ ] Define arguments: `target` (required), `message` (required)
- [ ] Configure pre-flight checks: config exists, gh exists, gh authenticated
- [ ] Route to `melange-send` skill

**Files**:
- `.claude/commands/send.md`

---

### Task 3.4: Melange Send Skill

**Description**: Implement the melange-send skill for drafting and creating Issues

**Acceptance Criteria**:
- [ ] Create `.claude/skills/melange-send/index.yaml` with metadata
- [ ] Create `.claude/skills/melange-send/SKILL.md` with full workflow
- [ ] Skill reads construct identity from config
- [ ] Skill uses AskUserQuestion for impact and intent selection
- [ ] Skill drafts Issue body with all Melange fields
- [ ] Skill shows preview and asks for approval before creating
- [ ] Skill executes `gh issue create` with proper labels
- [ ] Skill confirms creation with Issue URL

**Files**:
- `.claude/skills/melange-send/index.yaml`
- `.claude/skills/melange-send/SKILL.md`

---

## Sprint 4: `/inbox` Command & Skill

**Global ID**: 4
**Label**: Inbox - Triage Incoming Feedback
**Estimated Size**: MEDIUM
**Blocked By**: Sprint 3 (config schema)

### Task 4.1: `/inbox` Command Definition

**Description**: Create the command routing file for `/inbox`

**Acceptance Criteria**:
- [ ] Create `.claude/commands/inbox.md` with YAML frontmatter
- [ ] Define arguments: `--all` (flag), `--construct` (optional filter)
- [ ] Configure pre-flight checks: config exists, gh exists, gh authenticated
- [ ] Route to `melange-inbox` skill

**Files**:
- `.claude/commands/inbox.md`

---

### Task 4.2: Melange Inbox Skill - Query & Present

**Description**: Implement inbox query and summary presentation

**Acceptance Criteria**:
- [ ] Create `.claude/skills/melange-inbox/index.yaml` with metadata
- [ ] Create `.claude/skills/melange-inbox/SKILL.md` with workflow
- [ ] Skill reads construct identity from config
- [ ] Skill queries GitHub with `gh issue list --search`
- [ ] Skill filters by impact level (unless `--all`)
- [ ] Skill sorts: game-changing first, then important, then by date
- [ ] Skill presents inbox summary with emoji indicators
- [ ] Skill handles empty inbox with "Inbox zero" message

**Files**:
- `.claude/skills/melange-inbox/index.yaml`
- `.claude/skills/melange-inbox/SKILL.md`

---

### Task 4.3: Melange Inbox Skill - Triage Actions

**Description**: Implement interactive triage loop with accept/decline/comment/skip/quit

**Acceptance Criteria**:
- [ ] Skill fetches full Issue details with `gh issue view`
- [ ] Skill parses Melange fields from Issue body
- [ ] Skill presents structured view of each Issue
- [ ] Skill uses AskUserQuestion for action selection
- [ ] **Accept**: Draft comment, get approval, post comment, update labels
- [ ] **Decline**: Get reason, draft comment, get approval, post, close Issue
- [ ] **Comment**: Get message, draft response, get approval, post
- [ ] **Skip**: Move to next Issue
- [ ] **Quit**: Exit loop

**Files**:
- `.claude/skills/melange-inbox/SKILL.md` (continued)

---

### Task 4.4: Melange Inbox Skill - Session Summary

**Description**: Implement triage session summary

**Acceptance Criteria**:
- [ ] Track counts: accepted, declined, commented, skipped
- [ ] Display summary at end of triage session
- [ ] Show remaining Issues count

**Files**:
- `.claude/skills/melange-inbox/SKILL.md` (continued)

---

## Definition of Done

### Per Task
- [ ] All acceptance criteria met
- [ ] Files created/modified as specified
- [ ] No hardcoded values (use config)

### Per Sprint
- [ ] All tasks completed
- [ ] Commands are invocable
- [ ] Skills execute without errors
- [ ] Manual testing passes

### Cycle Complete
- [ ] `/send <target> "<message>"` creates Issue with Discord notification
- [ ] `/inbox` displays inbox and enables triage
- [ ] HITL enforced on all actions
- [ ] Error messages are helpful

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| gh CLI not installed | Pre-flight check with helpful error |
| Config missing | Pre-flight check with example config |
| GitHub API rate limits | Use `--limit` on queries |
| Large inbox | Page through Issues, allow quit |

---

## Notes

- **No local state for MVP**: Query GitHub each time
- **HITL is mandatory**: AI drafts, human approves
- **Labels are critical**: Ensure Melange labels exist in target repos
- **Discord notifications**: Handled by existing workflow (no changes needed)

---

---

## Phase 2 Sprints

---

## Sprint 5: `/threads` Dashboard

**Global ID**: 5
**Label**: Thread Visualization Dashboard
**Estimated Size**: HIGH
**Blocked By**: Sprint 3, 4 (requires working /send and /inbox)

### Task 5.1: Local Thread Cache Schema

**Description**: Create the `threads.json` schema and directory structure

**Acceptance Criteria**:
- [ ] Create `grimoires/loa/melange/` directory
- [ ] Define `threads.json` schema with all fields from SDD
- [ ] Include `$schema`, `last_sync`, `construct`, `threads[]`, `blocked[]`
- [ ] Document field types and validation rules

**Files**:
- `grimoires/loa/melange/threads.json` (empty initial)
- `.claude/skills/melange-threads/resources/schema.json` (for reference)

---

### Task 5.2: `/threads` Command Definition

**Description**: Create the command routing file for `/threads`

**Acceptance Criteria**:
- [ ] Create `.claude/commands/threads.md` with YAML frontmatter
- [ ] Define arguments: `--mine`, `--blocked`, `--resolved`, `--sync` (all flags)
- [ ] Configure pre-flight checks: config exists, gh exists
- [ ] Route to `melange-threads` skill

**Files**:
- `.claude/commands/threads.md`

---

### Task 5.3: Melange Threads Skill - Cache Management

**Description**: Implement cache loading, sync detection, and GitHub API queries

**Acceptance Criteria**:
- [ ] Create `.claude/skills/melange-threads/index.yaml` with metadata
- [ ] Create `.claude/skills/melange-threads/SKILL.md` with workflow
- [ ] Check cache freshness (5-minute threshold)
- [ ] Query GitHub API for org-wide Melange Issues
- [ ] Parse Issue bodies to extract Melange fields
- [ ] Update `threads.json` with sync timestamp

**Files**:
- `.claude/skills/melange-threads/index.yaml`
- `.claude/skills/melange-threads/SKILL.md`

---

### Task 5.4: Melange Threads Skill - Categorization

**Description**: Implement thread categorization logic

**Acceptance Criteria**:
- [ ] Categorize threads into: BLOCKED, AWAITING RESPONSE, NEEDS TRIAGE, IN PROGRESS, RESOLVED
- [ ] Detect direction: sent vs received based on construct identity
- [ ] Sort within categories: game-changing first, then by date
- [ ] Handle edge cases: missing labels, malformed Issues

**Files**:
- `.claude/skills/melange-threads/SKILL.md` (continued)

---

### Task 5.5: Melange Threads Skill - Dashboard Rendering

**Description**: Implement Unicode box-character dashboard display

**Acceptance Criteria**:
- [ ] Render dashboard header with construct name and stats
- [ ] Use Unicode box characters: `╔ ╗ ╚ ╝ ║ ═ ╠ ╣`
- [ ] Use tree characters: `├─ └─ │`
- [ ] Display categories with appropriate icons: ⏳ 📬 📥 ✅
- [ ] Show impact emojis: 🔴 🟡 🟢
- [ ] Include duration formatting (Nm, Nh, Nd, Nw)
- [ ] Render interactive controls legend at bottom
- [ ] Width: 68 characters (fits 80-column terminal)

**Files**:
- `.claude/skills/melange-threads/SKILL.md` (continued)

---

## Sprint 6: Command Enhancements

**Global ID**: 6
**Label**: Flag Enhancements & Cache Sync
**Estimated Size**: MEDIUM
**Blocked By**: Sprint 5 (threads.json schema)

### Task 6.1: `/send --block` Flag

**Description**: Add blocking flag to /send command

**Acceptance Criteria**:
- [ ] Update `.claude/commands/send.md` to accept `--block` flag
- [ ] Update melange-send skill to handle blocking state
- [ ] Add `status:blocked` label when flag is set
- [ ] Update local `threads.json` with blocked entry
- [ ] Include "⏳ Sender is blocked" in Discord notification content

**Files**:
- `.claude/commands/send.md`
- `.claude/skills/melange-send/SKILL.md`

---

### Task 6.2: `/inbox --from` Filter

**Description**: Add sender filtering to /inbox command

**Acceptance Criteria**:
- [ ] Update `.claude/commands/inbox.md` to accept `--from` argument
- [ ] Parse comma-separated construct names: `--from sigil,loa`
- [ ] Filter Issues by parsing `From` field in Issue body
- [ ] Update summary display: "📥 Inbox for X (from: Y) (N issues)"
- [ ] Handle "No Issues from {construct}" case

**Files**:
- `.claude/commands/inbox.md`
- `.claude/skills/melange-inbox/SKILL.md`

---

### Task 6.3: Cache Sync on Actions

**Description**: Update threads.json when /send or /inbox actions occur

**Acceptance Criteria**:
- [ ] `/send` adds new thread to `threads.json` immediately after creation
- [ ] `/inbox accept` updates thread status to `accepted`
- [ ] `/inbox decline` updates thread status to `declined`
- [ ] Handle cache file creation if missing
- [ ] Preserve existing cache entries on update

**Files**:
- `.claude/skills/melange-send/SKILL.md`
- `.claude/skills/melange-inbox/SKILL.md`

---

### Task 6.4: `/threads` Interactive Navigation

**Description**: Implement interactive mode for threads dashboard

**Acceptance Criteria**:
- [ ] Handle keypress input: T (triage), B (blocked detail), R (resolved), Q (quit)
- [ ] Number selection (1-9) to view thread details
- [ ] O key to open selected thread in browser
- [ ] Transition to `/inbox` when T pressed
- [ ] Show detailed view when thread selected

**Files**:
- `.claude/skills/melange-threads/SKILL.md` (continued)

---

## Sprint 7: Automation & Integration

**Global ID**: 7
**Label**: PR Auto-Linking & Human Construct
**Estimated Size**: MEDIUM
**Blocked By**: Sprint 6 (cache infrastructure)

### Task 7.1: PR Auto-Linking Workflow

**Description**: Create GitHub Action to detect PR resolution references

**Acceptance Criteria**:
- [ ] Create `.github/workflows/melange-resolve.yml`
- [ ] Trigger on `issue_comment` (created) and `pull_request` (closed)
- [ ] Detect patterns: "Resolved via PR #N", "Fixed in PR #N", "Closes #N"
- [ ] Add `resolution:PR#N` label when pattern detected
- [ ] Update `status:resolved` when linked PR merges
- [ ] Only process Issues with `melange` label

**Files**:
- `.github/workflows/melange-resolve.yml`

---

### Task 7.2: Human Construct Support

**Description**: Enable /send human for operator clarification

**Acceptance Criteria**:
- [ ] Add `human` to valid targets when `human_discord_id` configured
- [ ] Add `human_discord_id` field to construct config schema
- [ ] Create Issues with `to:human` label
- [ ] Discord notification pings `human_discord_id` directly
- [ ] `/threads` shows "AWAITING HUMAN" section for human-addressed Issues

**Files**:
- `.loa.config.yaml` (schema update)
- `.claude/skills/melange-send/SKILL.md`
- `.claude/skills/melange-threads/SKILL.md`

---

### Task 7.3: Cross-Repo Visibility

**Description**: Enable threads dashboard to show Issues across all org repos

**Acceptance Criteria**:
- [ ] Query pattern: `org:0xHoneyJar label:melange is:open`
- [ ] Parse repository name from Issue response
- [ ] Group threads by repository in dashboard (optional view)
- [ ] Handle Issues in repos where construct has no direct access (show limited info)

**Files**:
- `.claude/skills/melange-threads/SKILL.md`

---

### Task 7.4: Workflow Deployment to Org Repos

**Description**: Deploy melange-resolve.yml to sigil, loa, and loa-constructs repos

**Acceptance Criteria**:
- [ ] Deploy workflow to `0xHoneyJar/sigil`
- [ ] Deploy workflow to `0xHoneyJar/loa`
- [ ] Deploy workflow to `0xHoneyJar/loa-constructs`
- [ ] Verify workflow runs on test Issue comment
- [ ] Document deployment in melange/ directory

**Files**:
- Remote: `sigil/.github/workflows/melange-resolve.yml`
- Remote: `loa/.github/workflows/melange-resolve.yml`
- Local: `.github/workflows/melange-resolve.yml`

---

## Phase 2 Definition of Done

### Per Task
- [ ] All acceptance criteria met
- [ ] Files created/modified as specified
- [ ] No hardcoded values (use config)
- [ ] Cache operations handle file not found gracefully

### Per Sprint
- [ ] All tasks completed
- [ ] Commands are invocable with new flags
- [ ] Dashboard renders correctly in terminal
- [ ] Manual testing passes

### Phase 2 Complete
- [ ] `/threads` displays categorized dashboard
- [ ] `/send --block` marks sender as blocked
- [ ] `/inbox --from` filters by sender
- [ ] PR references auto-link to Issues
- [ ] `/send human` pings operator directly
- [ ] Cross-repo visibility works across org

---

## Phase 2 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| GitHub API rate limits | 5-minute cache, warn on rate limit |
| Large orgs with many Issues | Pagination, limit to 100 |
| Unicode rendering issues | Fallback to ASCII if terminal doesn't support |
| Cache corruption | Validate schema on load, recreate if invalid |
| Workflow permissions | Document required permissions in setup |

---

## Next Steps

1. `/implement sprint-5` - Build `/threads` command and dashboard
2. `/implement sprint-6` - Add `--block` and `--from` enhancements
3. `/implement sprint-7` - Deploy PR auto-linking and human construct
4. Test cross-construct flows with real feedback

---

**Document Status**: Ready for implementation
**Next Step**: `/implement sprint-5`
