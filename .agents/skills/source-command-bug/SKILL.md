---
name: "source-command-bug"
description: "Triage a bug report through structured phases: eligibility check, hybrid interview,
codebase analysis, and micro-sprint creation. Produces a handoff contract for /implement.
Test-first is non-negotiable. Bugs always get their own micro-sprint."
---

# source-command-bug

Use this skill when the user asks to run the migrated source command `bug`.

## Command Template

# Bug Triage

## Purpose

Triage a reported bug through structured phases and produce a handoff contract
for the implementation phase. Test-first is non-negotiable.

## Invocation

```
/bug "description of the bug"
/bug --from-issue 42
/bug
```

## Agent

Launches `bug-triaging` from `skills/bug-triaging/`.

See: `skills/bug-triaging/SKILL.md` for full workflow details.

## Workflow

1. **Phase 0 — Dependency Check**: Verify required tools (jq, git) and optional tools (gh, br)
2. **Phase 1 — Eligibility Check**: Validate the report is a bug (not a feature request)
3. **Phase 2 — Hybrid Interview**: Fill gaps with targeted follow-up questions
4. **Phase 3 — Codebase Analysis**: Identify suspected files, tests, and test infrastructure
5. **Phase 4 — Micro-Sprint Creation**: Generate bug ID, state, sprint, triage handoff

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `description` | Free-form bug description | No (prompted if missing) |
| `--from-issue N` | Import from GitHub issue | No |

## Outputs

| Path | Description |
|------|-------------|
| `grimoires/loa/a2a/bug-{id}/triage.md` | Triage handoff contract |
| `grimoires/loa/a2a/bug-{id}/sprint.md` | Micro-sprint plan |
| `.run/bugs/{id}/state.json` | Bug state tracking |
| `grimoires/loa/ledger.json` | Updated Sprint Ledger |

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "This looks like a feature request" | Eligibility check failed | Use `/plan` instead |
| "Insufficient evidence" | Score < 2 | Provide stack trace, failing test, or repro steps |
| "No test runner detected" | No test infrastructure | Set up tests first |
| "jq is required" | Missing dependency | Install jq |

## After Triage

In interactive mode:
```
/implement sprint-bug-N
```

In autonomous mode:
```
/run --bug "description"
```
