# Syncing Constructs

## Purpose

Detect divergence between local constructs and their upstream registry versions.
Uses Merkle-tree shadow comparison for O(1) unchanged detection, falling back to
full file-level diff when changes are detected.

## Invocation

```bash
/construct-sync                     # Check all installed constructs
/construct-sync <slug>              # Check specific construct
```

## Workflow

### Phase 1: Quick Check

Run O(1) hash comparison for each installed construct:

```bash
.claude/scripts/constructs-diff.sh check <slug> --json
```

If hash matches cached shadow, report "unchanged" and move on.

### Phase 2: Full Diff

For constructs with detected changes, run full diff:

```bash
.claude/scripts/constructs-diff.sh diff <slug> --json
```

Present changes to user with file-level detail (added, modified, deleted).

### Phase 3: Resolution

Use AskUserQuestion to present resolution options for each diverged construct:

```yaml
questions:
  - question: "Construct '<slug>' has diverged from upstream. How would you like to resolve?"
    header: "Sync"
    options:
      - label: "Accept upstream"
        description: "Replace local with latest registry version"
      - label: "Keep local changes"
        description: "Maintain your modifications as a variant"
      - label: "View diff"
        description: "Show detailed file-level changes"
      - label: "Ignore for now"
        description: "Skip this construct"
    multiSelect: false
```

### Phase 4: Apply Resolution

- **Accept upstream**: Re-install from registry (`constructs-install.sh pack <slug>`)
- **Keep local**: Mark as variant in state.json, suppress future sync warnings
- **View diff**: Show full diff output, then re-prompt
- **Ignore**: Skip, no state changes

## Error Handling

| Exit Code | Meaning | Resolution |
|-----------|---------|------------|
| 0 | Success | — |
| 1 | General error | Check error message |
| 3 | No shadow | Install or link construct first |
| 5 | Validation error | Check slug format |

## Outputs

| Path | Description |
|------|-------------|
| `.construct/state.json` | Updated variant markers |
| `.construct/cache/merkle/*.hash` | Updated cached hashes |

## Related Commands

- `/construct-link` — Link local constructs
- `/construct-publish` — Publish local changes
- `/constructs install` — Install from registry
