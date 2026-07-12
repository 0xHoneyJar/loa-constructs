# Publishing Constructs

## Purpose

Publish constructs to the registry via git-sync. Discovers filesystem structure, prompts for missing Tier 2/3 fields, validates, bumps version, and triggers sync. The agent handles intelligence (field inference, domain suggestion); the bash script handles mechanics (validation, push, sync).

## Invocation

```bash
/construct-publish                  # Interactive (prompts for bump type)
/construct-publish patch            # Patch bump (0.1.0 → 0.1.1)
/construct-publish minor            # Minor bump (0.1.0 → 0.2.0)
/construct-publish major            # Major bump (0.1.0 → 1.0.0)
/construct-publish --validate       # Validate only, don't publish
/construct-publish --dry-run        # Show package contents without publishing
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `bump` | Version bump type: `patch`, `minor`, `major` | No (prompted if omitted) |
| `--validate` | Validate only, don't publish | No |
| `--dry-run` | Show package contents | No |

## Workflow

### Phase 1: Detect Construct Root

1. Find `construct.yaml` in current directory or walk up parent directories
2. If not found, error: "Not in a construct directory."
3. Read `construct.yaml` for current metadata (name, slug, version, description, domain, license)

### Phase 2: Filesystem Discovery

Read the actual construct structure — the filesystem IS the configuration:

```
skills/*/index.yaml      → Inferred skill list (name, triggers, path)
commands/*.md             → Inferred command list (frontmatter: agent, agent_path)
identity/persona.yaml    → Has identity? (boolean)
README.md                → Description fallback (first paragraph after title)
```

Report what was discovered:

```
Discovered:
  3 skills: research, deep-analysis, summarize
  3 commands: research.md, deep-analysis.md, summarize.md
  Identity: yes (persona.yaml)
  README: 42 lines
```

### Phase 3: Prompt for Missing Fields (Tier 2)

Check construct.yaml for completeness. Prompt for any missing or placeholder fields:

| Field | Condition | Action |
|-------|-----------|--------|
| `description` | Missing or contains "TODO" | Prompt user. Suggest: first paragraph of README.md |
| `domain` | Missing entirely | Prompt user. Suggest based on skill names and description |
| `license` | Missing | Prompt user. Default: "MIT" |

**Domain suggestion logic**: Analyze skill names and descriptions against the 8 canonical categories (marketing, development, security, analytics, documentation, operations, design, infrastructure). Propose the top 1-2 matches.

If user accepts suggestions, write them to `construct.yaml`.

### Phase 4: Agent-Level Validation

Run the bash script's 10-point checklist plus 4 additional agent-level checks:

```bash
.Codex/scripts/constructs-publish.sh validate <path> --json
```

Then check:

| # | Check | Severity | Description |
|---|-------|----------|-------------|
| 11 | Routing frontmatter in all `commands/*.md` | FAIL | Each command needs `agent` and `agent_path` in frontmatter |
| 12 | All skills have `triggers` with at least one pattern | FAIL | Skills without triggers can't be invoked |
| 13 | `domain` field present in `construct.yaml` | WARN | Needed for category derivation in registry |
| 14 | Inferred skills count matches manifest `skills` array (if declared) | WARN | Drift between filesystem and manifest |

If any FAIL checks: show file + field + suggestion, then stop. Errors are navigation — tell the author exactly what to fix and where.

If `--validate` flag was passed, stop here and report results.

### Phase 5: Version Bump Ceremony

1. Read current version from `construct.yaml`
2. If bump type not provided as argument, ask:
   ```
   Current version: 0.1.0
   [P]atch (0.1.1) — bug fixes, minor improvements
   [m]inor (0.2.0) — new features, backward compatible
   [M]ajor (1.0.0) — breaking changes
   ```
3. Compute new version
4. Write new version to `construct.yaml`
5. Stage and commit:
   ```bash
   git add construct.yaml
   git commit -m "release: <slug>@<new-version>"
   git tag "v<new-version>"
   ```

### Phase 6: Publish via Git-Sync

Call the bash script to push and trigger sync:

```bash
.Codex/scripts/constructs-publish.sh push <path>
```

The script handles:
- Rate limit check (10/hour)
- Re-validation
- Permission check (`GET /v1/packs/:slug/permissions`)
- `git push origin HEAD --tags`
- `POST /v1/packs/:slug/sync`

### Phase 7: Report

Print publish summary:

```
Published <slug>@<version>
  Skills: 3 (research, deep-analysis, summarize)
  Domain: [analytics, research]
  Sync: triggered (HTTP 202)
  Tag: v<version>
```

## Error Handling

| Error | Message | Resolution |
|-------|---------|------------|
| No construct.yaml | "Not in a construct directory." | cd to construct root |
| Validation fails | Shows file + field + fix suggestion | Fix the listed issues |
| Auth fails | "Authentication required" | Run `/constructs auth setup` |
| No publish permission | "No publish permission for '<slug>'" | Contact construct owner |
| Rate limited | "Max 10 publishes per hour" | Wait and retry |
| Git push fails | "Git push failed — check remote" | Fix remote configuration |
| Sync fails | "Sync returned HTTP <code>" | Run `bun seed:forge` manually |

## Guard Rails

- **Never publish without validation passing** — script enforces this
- **Never skip version bump** — the commit + tag is the publish boundary
- **Never write to construct.yaml without user confirmation** for Tier 3 fields (domain, keywords)
- **Sensitive files block publish** — .env, credentials.json detected by script

## Outputs

| Path | Description |
|------|-------------|
| `construct.yaml` | Updated version (and optionally description, domain) |
| Git | Tagged commit `v<version>` pushed to origin |
| Registry | Sync triggered via API |

## Related Commands

- `/skill-add` — Add a new skill before publishing
- `/construct-sync` — Check for upstream changes
- `/construct-link` — Link for local development
