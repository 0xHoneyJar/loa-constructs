---
name: "source-command-audit-sprint"
description: "Security and quality audit of sprint implementation.
Final gate before sprint completion. Creates COMPLETED marker on approval.
Resolves local sprint IDs to global IDs via Sprint Ledger."
---

# source-command-audit-sprint

Use this skill when the user asks to run the migrated source command `audit-sprint`.

## Command Template

# Audit Sprint

## Purpose

Security and quality audit of sprint implementation as the Paranoid Cypherpunk Auditor. Final gate before sprint completion. Runs AFTER senior lead approval.

## Invocation

```
/audit-sprint sprint-1
/audit-sprint sprint-1 background
```

## Agent

Launches `auditing-security` from `skills/auditing-security/`.

See: `skills/auditing-security/SKILL.md` for full workflow details.

## Prerequisites

- Sprint tasks implemented (`/implement`)
- Senior lead approved with "All good" (`/review-sprint`)
- Not already completed (no COMPLETED marker)

## Workflow

1. **Pre-flight**: Validate sprint ID, verify senior approval
2. **Context Loading**: Read PRD, SDD, sprint plan, implementation report
3. **Code Audit**: Read actual code files for security review
4. **Security Checklist**: OWASP Top 10, secrets, auth, input validation
5. **Decision**: Approve or require changes
6. **Output**: Write audit feedback or approval
7. **Completion**: Create COMPLETED marker on approval
8. **Analytics**: Update usage metrics (THJ users only)

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `sprint_id` | Which sprint to audit (e.g., `sprint-1`) | Yes |
| `background` | Run as subagent for parallel execution | No |

## Outputs

| Path | Description |
|------|-------------|
| `grimoires/loa/a2a/{sprint_id}/auditor-sprint-feedback.md` | Audit results |
| `grimoires/loa/a2a/{sprint_id}/COMPLETED` | Completion marker |
| `grimoires/loa/a2a/index.md` | Updated sprint status |

## Decision Outcomes

### Approval ("APPROVED - LETS FUCKING GO")

When security audit passes:
- Writes approval to `auditor-sprint-feedback.md`
- Creates `COMPLETED` marker file
- Sets sprint status to `COMPLETED`
- Next step: Move to next sprint or deployment

### Changes Required ("CHANGES_REQUIRED")

When security issues found:
- Writes detailed findings to `auditor-sprint-feedback.md`
- Includes severity (CRITICAL/HIGH/MEDIUM/LOW)
- Sets sprint status to `AUDIT_CHANGES_REQUIRED`
- Next step: `/implement sprint-N` (to fix issues)

## Security Checklist

The auditor reviews:
- **Secrets**: No hardcoded credentials, proper env vars
- **Auth/Authz**: Proper access control, no privilege escalation
- **Input Validation**: No injection vulnerabilities
- **Data Privacy**: No PII leaks, proper encryption
- **API Security**: Rate limiting, CORS, validation
- **Error Handling**: No info disclosure, proper logging
- **Code Quality**: No obvious bugs, tested error paths

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "Invalid sprint ID" | Wrong format | Use `sprint-N` format |
| "Sprint directory not found" | No A2A dir | Run `/implement` first |
| "No implementation report found" | Missing reviewer.md | Run `/implement` first |
| "Sprint has not been reviewed" | Missing engineer-feedback.md | Run `/review-sprint` first |
| "Sprint has not been approved" | No "All good" | Get senior approval first |
| "Sprint is already COMPLETED" | COMPLETED marker exists | No audit needed |

## Feedback Loop

```
/audit-sprint sprint-N
      ↓
[Security audit]
      ↓
CHANGES_REQUIRED          APPROVED
      ↓                       ↓
/implement sprint-N    [COMPLETED marker]
      ↓                       ↓
/audit-sprint sprint-N   Next sprint
```

## Sprint Ledger Integration

When a Sprint Ledger exists (`grimoires/loa/ledger.json`):

1. **ID Resolution**: Resolves `sprint-1` (local) to global ID (e.g., `3`)
2. **Directory Mapping**: Uses `a2a/sprint-3/` instead of `a2a/sprint-1/`
3. **Status Update**: Sets sprint status to `completed` in ledger on approval
4. **Consistent Paths**: All file operations use resolved global ID

### Example Resolution

```bash
# In cycle-002, sprint-1 maps to global sprint-3
/audit-sprint sprint-1
# → Resolving sprint-1 to global sprint-3
# → Reading: grimoires/loa/a2a/sprint-3/engineer-feedback.md
# → Writing: grimoires/loa/a2a/sprint-3/auditor-sprint-feedback.md
# → Creating: grimoires/loa/a2a/sprint-3/COMPLETED
# → Updating ledger: sprint-3 status = completed
```

### Legacy Mode

Without a ledger, sprint IDs are used directly (sprint-1 → a2a/sprint-1/).

## beads_rust Integration

When beads_rust is installed, the agent records security audit results:

1. **Session Start**: `br sync --import-only` to import latest state
2. **Record Audit**: `br comments add <task-id> "SECURITY AUDIT: [verdict] - [summary]"`
3. **Mark Status**: `br label add <task-id> security-approved` or `security-blocked`
4. **Session End**: `br sync --flush-only` before commit

**Protocol Reference**: See `.Codex/protocols/beads-integration.md`
