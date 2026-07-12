# Linking Constructs

## Purpose

Link local construct repositories for live development. When a construct is linked,
changes in the source directory are immediately reflected without reinstallation.
Shadow copies enable drift detection to track what changed since installation.

## Invocation

```bash
/construct-link                     # List active links
/construct-link <path>              # Link a local construct
/construct-unlink <slug>            # Unlink and restore
/construct-links                    # List all links with status
```

## Workflow

### Phase 1: Determine Action

Parse the user's intent from the invocation:

| Input | Action |
|-------|--------|
| No arguments | List active links |
| Path argument | Link construct at path |
| `/construct-unlink <slug>` | Unlink construct |
| `/construct-links` | List with status |

### Phase 2: Link a Construct

When linking a local construct directory:

1. **Validate path exists** — resolve to absolute path
2. **Auto-detect slug** — read from `construct.yaml` or `manifest.json`, fall back to directory name
3. **Check for conflicts** — if slug already linked to different path, prompt user
4. **Preserve existing install** — if pack was registry-installed, create shadow copy first
5. **Create symlink** — `.claude/constructs/packs/<slug>` → target path
6. **Update state** — record in `.construct/state.json`

```bash
.claude/scripts/constructs-link.sh link "<path>"
```

### Phase 3: Path Selection (when ambiguous)

If the user doesn't provide a path, use AskUserQuestion to help them select:

```yaml
questions:
  - question: "Which construct would you like to link?"
    header: "Construct"
    options:
      - label: "Browse filesystem"
        description: "I'll provide the path to a local construct directory"
      - label: "Recent constructs"
        description: "Show recently cloned construct repositories"
    multiSelect: false
```

### Phase 4: Unlink a Construct

When unlinking:

1. **Validate slug** — must be an active link
2. **Remove symlink** — delete the symlink
3. **Restore previous install** — if `.pre-link` backup exists, restore it
4. **Update state** — remove from `.construct/state.json`

```bash
.claude/scripts/constructs-link.sh unlink "<slug>"
```

### Phase 5: List Links

Show all active construct links with health status:

```bash
.claude/scripts/constructs-link.sh list
```

Output format:
```
Active construct links:

  ✓ observer                  → /Users/dev/construct-observer
  ✓ artisan                   → /Users/dev/construct-artisan
  ✗ beacon                    → /Users/dev/construct-beacon (BROKEN)

3 linked construct(s)
```

### Phase 6: Status Check

For detailed status including drift detection:

```bash
.claude/scripts/constructs-link.sh status "<slug>"
```

Output includes:
- Link health (OK / BROKEN)
- Drift detection (NONE / DETECTED)
- Shadow hash comparison
- Current version from manifest

## Error Handling

| Exit Code | Meaning | Resolution |
|-----------|---------|------------|
| 0 | Success | — |
| 1 | General error | Check error message |
| 3 | Not found | Verify path or slug exists |
| 5 | Validation error | Check slug format (alphanumeric + hyphens) |
| 7 | Already exists | Unlink first, then re-link |

## Security Notes

- Symlinks are confined to `.claude/constructs/packs/` directory
- Slug validation prevents path traversal (`..` rejected)
- Shadow copies have restrictive permissions (600)
- State file permissions set to 600

## Prerequisites

- `jq` for JSON state management
- `yq` (optional) for YAML manifest reading
- Git repository (for .gitignore management)

## Outputs

| Path | Description |
|------|-------------|
| `.construct/state.json` | Link registry with timestamps |
| `.construct/shadow/<slug>/` | Pristine copy for drift detection |
| `.construct/cache/merkle/<slug>.hash` | Cached Merkle root hash |

## Related Commands

- `/constructs install` — Install from registry (opposite of link)
- `/construct-sync` — Check for upstream changes
- `/construct-publish` — Publish local changes to registry
