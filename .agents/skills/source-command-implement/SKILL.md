---
name: "source-command-implement"
description: "Execute sprint tasks with production-quality code and tests.
Automatically checks for and addresses audit/review feedback before new work.
Resolves local sprint IDs to global IDs via Sprint Ledger.
If beads_rust is installed, handles task lifecycle automatically (no manual br commands)."
---

# source-command-implement

Use this skill when the user asks to run the migrated source command `implement`.

## Command Template

# Implement Sprint

## Purpose

Execute assigned sprint tasks with production-quality code, comprehensive tests, and detailed implementation report for senior review.

## Invocation

```
/implement sprint-1
/implement sprint-1 background
```

## Agent

Launches `implementing-tasks` from `skills/implementing-tasks/`.

See: `skills/implementing-tasks/SKILL.md` for full workflow details.

## Workflow

1. **Pre-flight**: Validate sprint ID, check setup, verify prerequisites
2. **Directory Setup**: Create `grimoires/loa/a2a/{sprint_id}/` if needed
3. **Feedback Check**: Audit feedback (priority 1) → Engineer feedback (priority 2)
4. **Context Loading**: Read PRD, SDD, sprint plan for requirements
5. **Implementation**: Execute tasks with production-quality code and tests
6. **Report Generation**: Create `reviewer.md` with full implementation details
7. **Index Update**: Update `grimoires/loa/a2a/index.md` with sprint status
8. **Analytics**: Update usage metrics (THJ users only)

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `sprint_id` | Which sprint to implement (e.g., `sprint-1`) | Yes |
| `background` | Run as subagent for parallel execution | No |

## Outputs

| Path | Description |
|------|-------------|
| `grimoires/loa/a2a/{sprint_id}/reviewer.md` | Implementation report |
| `grimoires/loa/a2a/index.md` | Updated sprint index |
| `app/src/**/*` | Implementation code and tests |

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Invalid sprint ID" | Wrong format | Use `sprint-N` format |
| "PRD not found" | Missing prd.md | Run `/plan-and-analyze` first |
| "SDD not found" | Missing sdd.md | Run `/architect` first |
| "Sprint plan not found" | Missing sprint.md | Run `/sprint-plan` first |
| "Sprint not found in sprint.md" | Sprint doesn't exist | Verify sprint number |
| "Sprint is already COMPLETED" | COMPLETED marker exists | Move to next sprint |

## Sprint Ledger Integration

When a Sprint Ledger exists (`grimoires/loa/ledger.json`):

1. **ID Resolution**: Resolves `sprint-1` (local) to global ID (e.g., `3`)
2. **Directory Mapping**: Uses `a2a/sprint-3/` instead of `a2a/sprint-1/`
3. **Status Update**: Sets sprint status to `in_progress` in ledger
4. **Completion**: On approval, status updated to `completed`

### Example Resolution

```bash
# In cycle-002, sprint-1 maps to global sprint-3
/implement sprint-1
# → Resolving sprint-1 to global sprint-3
# → Using directory: grimoires/loa/a2a/sprint-3/
# → Setting status: in_progress
```

### Legacy Mode

Without a ledger, sprint IDs are used directly (sprint-1 → a2a/sprint-1/).

## Feedback Loop

```
/implement sprint-N
      ↓
[reviewer.md created]
      ↓
/review-sprint sprint-N
      ↓
[feedback or approval]
      ↓
If feedback: /implement sprint-N (addresses feedback)
If approved: /audit-sprint sprint-N
```

## beads_rust Integration

When beads_rust is installed, the agent handles task lifecycle:

1. **Session Start**: `br sync --import-only` to import latest state
2. **Get Work**: `br ready` to find unblocked tasks
3. **Claim Task**: `br update <id> --status in_progress`
4. **Log Discoveries**: `.Codex/scripts/beads/log-discovered-issue.sh` for found bugs
5. **Complete Task**: `br close <id> --reason "..."`
6. **Session End**: `br sync --flush-only` before commit

**No manual `br` commands required.** The agent handles everything internally.

**Protocol Reference**: See `.Codex/protocols/beads-integration.md`
