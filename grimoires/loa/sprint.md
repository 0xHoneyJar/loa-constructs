# Sprint Plan: Melange CLI Integration

**Cycle**: cycle-003
**PRD**: grimoires/loa/prd.md
**SDD**: grimoires/loa/sdd.md
**Created**: 2026-01-23

---

## Sprint Overview

| Sprint | Label | Tasks | Focus |
|--------|-------|-------|-------|
| Sprint 3 | `/send` Command & Skill | 4 | Outbox functionality |
| Sprint 4 | `/inbox` Command & Skill | 4 | Inbox triage functionality |

**Total Tasks**: 8
**Dependencies**: Sprint 4 depends on Sprint 3 (shared config schema)

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

## Next Steps

1. `/implement sprint-3` - Build `/send` command and skill
2. `/implement sprint-4` - Build `/inbox` command and skill
3. Test end-to-end flow between constructs

---

**Document Status**: Ready for implementation
**Next Step**: `/implement sprint-3`
