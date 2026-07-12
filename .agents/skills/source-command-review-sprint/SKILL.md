---
name: "source-command-review-sprint"
description: "Validate sprint implementation against acceptance criteria.
Reviews actual code, not just reports. Quality gate before security audit.
Resolves local sprint IDs to global IDs via Sprint Ledger."
---

# source-command-review-sprint

Use this skill when the user asks to run the migrated source command `review-sprint`.

## Command Template

# Review Sprint

## Purpose

Validate sprint implementation against acceptance criteria as the Senior Technical Lead. Reviews actual code quality, not just the report. Quality gate before security audit.

## Invocation

```
/review-sprint sprint-1
/review-sprint sprint-1 background
```

## Agent

Launches `reviewing-code` from `skills/reviewing-code/`.

See: `skills/reviewing-code/SKILL.md` for full workflow details.

## Workflow

1. **Pre-flight**: Validate sprint ID, check prerequisites
2. **Context Loading**: Read PRD, SDD, sprint plan, implementation report
3. **Code Review**: Read actual code files (not just trust the report)
4. **Feedback Check**: Verify previous feedback items were addressed
5. **Decision**: Approve or request changes
6. **Output**: Write feedback or "All good" to `engineer-feedback.md`
7. **Analytics**: Update usage metrics (THJ users only)

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `sprint_id` | Which sprint to review (e.g., `sprint-1`) | Yes |
| `background` | Run as subagent for parallel execution | No |

## Outputs

| Path | Description |
|------|-------------|
| `grimoires/loa/a2a/{sprint_id}/engineer-feedback.md` | Feedback or "All good" |
| `grimoires/loa/sprint.md` | Updated with checkmarks on approval |
| `grimoires/loa/a2a/index.md` | Updated sprint status |

## Decision Outcomes

### Approval ("All good")

When implementation meets all standards:
- Writes "All good" to `engineer-feedback.md`
- Updates `sprint.md` with checkmarks
- Sets sprint status to `REVIEW_APPROVED`
- Next step: `/audit-sprint sprint-N`

### Changes Required

When issues are found:
- Writes detailed feedback to `engineer-feedback.md`
- Includes file paths, line numbers, fixes
- Sprint status remains `IN_PROGRESS`
- Next step: `/implement sprint-N` (to address feedback)

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Invalid sprint ID" | Wrong format | Use `sprint-N` format |
| "Sprint directory not found" | No A2A dir | Run `/implement` first |
| "No implementation report found" | Missing reviewer.md | Run `/implement` first |
| "Sprint is already COMPLETED" | COMPLETED marker exists | No review needed |

## Review Standards

The reviewer checks for:
- Sprint task completeness
- Acceptance criteria fulfillment
- Code quality and maintainability
- Comprehensive test coverage
- Security vulnerabilities
- Performance issues
- Architecture alignment
- Previous feedback resolution

## Sprint Ledger Integration

When a Sprint Ledger exists (`grimoires/loa/ledger.json`):

1. **ID Resolution**: Resolves `sprint-1` (local) to global ID (e.g., `3`)
2. **Directory Mapping**: Uses `a2a/sprint-3/` instead of `a2a/sprint-1/`
3. **Consistent Paths**: All file operations use resolved global ID

### Example Resolution

```bash
# In cycle-002, sprint-1 maps to global sprint-3
/review-sprint sprint-1
# → Resolving sprint-1 to global sprint-3
# → Reading: grimoires/loa/a2a/sprint-3/reviewer.md
# → Writing: grimoires/loa/a2a/sprint-3/engineer-feedback.md
```

### Legacy Mode

Without a ledger, sprint IDs are used directly (sprint-1 → a2a/sprint-1/).

## beads_rust Integration

When beads_rust is installed, the agent records review feedback:

1. **Session Start**: `br sync --import-only` to import latest state
2. **Record Feedback**: `br comments add <task-id> "REVIEW: [summary]"`
3. **Mark Status**: `br label add <task-id> review-approved` or `needs-revision`
4. **Session End**: `br sync --flush-only` before commit

**Protocol Reference**: See `.Codex/protocols/beads-integration.md`
