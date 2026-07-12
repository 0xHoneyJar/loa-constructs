---
name: "source-command-ship"
description: "Deploy and archive the development cycle"
---

# source-command-ship

Use this skill when the user asks to run the migrated source command `ship`.

## Command Template

# /ship - Deploy + Archive

## Purpose

Ship your work. Verifies everything is reviewed and audited, deploys to production, and archives the development cycle. The final step in the Golden Path.

**This is a Golden Path command.** It routes to the existing truename commands (`/deploy-production` + `/archive-cycle`) with readiness validation.

## Invocation

```
/ship               # Full ship flow (deploy + archive)
/ship --dry-run     # Preview what would happen
/ship --skip-deploy # Archive only (no deployment)
```

## Workflow

### 1. Check Ship Readiness

```bash
source .Codex/scripts/golden-path.sh
if ! reason=$(golden_check_ship_ready); then
    # Not ready — show reason
    echo "$reason"
fi
```

Readiness requires:
- All sprints reviewed
- All sprints audited (APPROVED)

### 2. Show Summary (or Dry Run)

Display what will happen:
```
Ship Summary:
  Sprints: 3/3 complete
  Reviews: ✓ All approved
  Audits:  ✓ All approved

Actions:
  1. Deploy to production (/deploy-production)
  2. Archive cycle (/archive-cycle)

Proceed? [Y/n]
```

If `--dry-run`, stop here without executing.

### 3. Deploy

Unless `--skip-deploy`, execute `/deploy-production`.

### 4. Archive

Execute `/archive-cycle` to archive the completed development cycle.

### 5. Celebrate

```
🚀 Shipped!

  Deployed to production and archived cycle.
  Development cycle complete.

  Start a new cycle: /plan
```

## Arguments

| Argument | Description |
|----------|-------------|
| `--dry-run` | Preview ship plan without executing |
| `--skip-deploy` | Archive only, skip deployment |
| (none) | Full ship flow |

## Error Handling

| Error | Response |
|-------|----------|
| Unreviewed sprints | "sprint-2 hasn't been reviewed. Run /review first." |
| Unaudited sprints | "sprint-2 hasn't been audited. Run /review first." |
| Deployment fails | Show error, suggest manual deployment |
| No sprint plan | "Nothing to ship. Run /plan first." |

## Examples

### Full Ship
```
/ship

  Checking ship readiness...
  ✓ All 3 sprints reviewed and audited

  Ship Summary:
    1. Deploy to production
    2. Archive development cycle

  Proceed? [Y/n]
  > Y

  → Running /deploy-production
  [... deployment ...]

  → Running /archive-cycle
  [... archiving ...]

  Shipped! Development cycle complete.
  Start a new cycle: /plan
```

### Not Ready
```
/ship

  Checking ship readiness...
  ✗ sprint-2 has not been audited. Run /review first.
```

### Dry Run
```
/ship --dry-run

  Ship Summary (DRY RUN):
    Sprints: 3/3 complete
    Reviews: ✓ All approved
    Audits:  ✓ All approved

  Would execute:
    1. /deploy-production
    2. /archive-cycle

  No changes made.
```

### Archive Only
```
/ship --skip-deploy

  Skipping deployment.
  → Running /archive-cycle
  [... archiving ...]

  Cycle archived.
  Start a new cycle: /plan
```
