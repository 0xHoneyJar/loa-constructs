# Publishing Constructs

## Purpose

Publish constructs to the Loa Constructs Registry. Runs a 10-point validation
checklist, checks permissions, handles version bumping, and uploads with TLS
enforcement and rate limiting.

## Invocation

```bash
/construct-publish                  # Publish current directory
/construct-publish <path>           # Publish specific directory
/construct-publish --validate       # Validate only, don't upload
/construct-publish --dry-run        # Show package contents without uploading
```

## Workflow

### Phase 1: Validate

Run 10-point validation checklist:

```bash
.claude/scripts/constructs-publish.sh validate <path> --json
```

Checklist: manifest exists, required fields, valid semver, skills defined, skill paths exist,
no .git directory, license specified, README exists, no sensitive files, package size < 10MB.

If validation fails, present failures and stop.

### Phase 2: Check Permissions

Verify the user has publish permission for the target slug:

```bash
# Calls GET /v1/packs/:slug/permissions
```

### Phase 3: Version Bump

Use AskUserQuestion to confirm version:

```yaml
questions:
  - question: "Publishing <slug>@<current>. What version bump?"
    header: "Version"
    options:
      - label: "Patch (<next-patch>) (Recommended)"
        description: "Bug fixes, minor improvements"
      - label: "Minor (<next-minor>)"
        description: "New features, backward compatible"
      - label: "Major (<next-major>)"
        description: "Breaking changes"
    multiSelect: false
```

### Phase 4: Confirmation

Use AskUserQuestion to confirm publish:

```yaml
questions:
  - question: "Ready to publish <slug>@<version>. Proceed?"
    header: "Confirm"
    options:
      - label: "Publish"
        description: "Upload to registry (public)"
      - label: "Cancel"
        description: "Abort without publishing"
    multiSelect: false
```

### Phase 5: Upload

```bash
.claude/scripts/constructs-publish.sh push <path>
```

Rate limited: 10 publishes per hour.

## Error Handling

| Exit Code | Meaning | Resolution |
|-----------|---------|------------|
| 0 | Success | — |
| 1 | General error | Check error message |
| 2 | Auth error | Run `/constructs auth setup` |
| 3 | Not found | Check path exists |
| 5 | Validation error | Fix validation failures |
| 8 | Rate limited | Wait and retry |

## Security Notes

- API key passed via curl config file (not command line)
- TLS 1.2+ enforced on all API calls
- .git/ directory filtered from package
- Sensitive files (.env, credentials) block publishing
- Rate limited: 10 publishes per hour

## Outputs

| Path | Description |
|------|-------------|
| Registry | Published construct version |

## Related Commands

- `/construct-sync` — Check for upstream changes
- `/construct-link` — Link for local development
- `/constructs install` — Install from registry
