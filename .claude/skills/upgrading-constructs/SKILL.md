# Upgrading Constructs

## Purpose

Upgrade installed constructs to newer versions using 3-way merge. Uses the
shadow copy (base), current installation (local), and registry version (remote)
to perform intelligent merging that preserves local modifications.

## Invocation

```bash
/construct-upgrade                      # Check and upgrade all constructs
/construct-upgrade <slug>               # Upgrade specific construct
/construct-upgrade --check              # Check for updates only
```

## Workflow

### Phase 1: Check for Updates

```bash
constructs-install.sh upgrade --check <slug>
```

Compares installed version against registry. Shows available updates.

### Phase 2: Preview Changes

For each construct with an available update, show the diff:

```bash
.claude/scripts/constructs-diff.sh diff <slug> --json
```

### Phase 3: Merge Strategy

Use AskUserQuestion for each file with conflicts:

```yaml
questions:
  - question: "File '<path>' has conflicts between local and upstream. How to resolve?"
    header: "Merge"
    options:
      - label: "Keep local (Recommended)"
        description: "Preserve your modifications, skip upstream changes"
      - label: "Accept upstream"
        description: "Replace with latest registry version"
      - label: "Manual merge"
        description: "Show both versions for manual resolution"
    multiSelect: false
```

### Phase 4: Apply Upgrade

```bash
constructs-install.sh upgrade <slug>
```

The upgrade command performs:
1. Backup current installation
2. Download new version
3. 3-way merge (shadow=base, current=local, new=remote)
4. Update shadow to new version
5. Report merge results

### Phase 5: Report

Present upgrade results:
- Files updated automatically
- Conflicts resolved
- New shadow hash

## Error Handling

| Exit Code | Meaning | Resolution |
|-----------|---------|------------|
| 0 | Success | — |
| 1 | General error | Check error message |
| 2 | Network error | Check connectivity |
| 3 | Not found | Verify slug is correct |
| 5 | Merge conflict | Resolve manually |

## Outputs

| Path | Description |
|------|-------------|
| `.construct/shadow/<slug>/` | Updated shadow copy |
| `.construct/cache/merkle/<slug>.hash` | Updated Merkle hash |

## Related Commands

- `/construct-sync` — Check for upstream changes
- `/construct-link` — Link for local development
- `/constructs install` — Fresh install from registry
