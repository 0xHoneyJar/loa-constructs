# Pack Namespacing Guide

This guide explains how to name your commands and skills to avoid conflicts with LOA core, Claude built-ins, and other packs.

## Why Namespacing Matters

When you create a construct built with LOA (like Sigil), your `.claude/` directory may contain commands that overlap with LOA core. Without proper namespacing:

- Your commands overwrite LOA core commands at install time
- Users lose access to core development workflow commands
- The system breaks silently with no warning

**Example Collision**: If your pack includes an `/implement` command, it will override LOA's core implementation phase command, breaking the standard development workflow.

## Reserved Names

The following categories of names are reserved and cannot be used by third-party packs:

### LOA Core Commands (~43 commands)

These are the core development workflow commands:

| Category | Commands |
|----------|----------|
| **Development Workflow** | `plan-and-analyze`, `architect`, `sprint-plan`, `implement`, `review-sprint`, `audit-sprint`, `deploy-production` |
| **Codebase Integration** | `mount`, `ride` |
| **Audit & Validation** | `audit`, `audit-deployment`, `validate` |
| **Run Mode** | `run`, `run-sprint-plan`, `run-status`, `run-halt`, `run-resume` |
| **Ledger & Lifecycle** | `ledger`, `archive-cycle` |
| **Translation** | `translate`, `translate-ride` |
| **Learning** | `retrospective`, `skill-audit` |
| **GTM Suite** | `gtm-setup`, `gtm-adopt`, `gtm-feature-requests`, `review-gtm`, `sync-from-gtm`, `sync-from-dev`, `analyze-market`, `position`, `price`, `plan-launch`, `plan-partnerships`, `plan-devrel`, `create-deck`, `announce-release` |
| **System** | `update-loa`, `contribute`, `permission-audit`, `oracle`, `oracle-analyze`, `feedback` |

### LOA Core Skills (~20 skills)

| Category | Skills |
|----------|--------|
| **Development** | `discovering-requirements`, `designing-architecture`, `planning-sprints`, `implementing-tasks`, `reviewing-code`, `auditing-security`, `deploying-infrastructure`, `translating-for-executives` |
| **Integration** | `mounting-framework`, `riding-codebase` |
| **Advanced** | `continuous-learning`, `run-mode` |
| **GTM** | `reviewing-gtm`, `analyzing-market`, `positioning-product`, `pricing-strategist`, `crafting-narratives`, `building-partnerships`, `educating-developers`, `translating-for-stakeholders` |

### Claude Built-ins (~18 commands)

`help`, `clear`, `reset`, `context`, `settings`, `history`, `exit`, `quit`, `version`, `update`, `login`, `logout`, `status`, `config`, `logs`, `debug`, `api`, `mcp`

### Reserved Prefixes

The following prefixes are reserved and cannot be used:

| Prefix | Reason |
|--------|--------|
| `loa-*` | Reserved for LOA core extensions |
| `claude-*` | Reserved for Claude platform |
| `thj-*` | Reserved for The Honey Jar |
| `anthropic-*` | Reserved for Anthropic |
| `_*` | Reserved for internal use |
| `test-*` | Reserved for testing |
| `debug-*` | Reserved for debugging |
| `admin-*` | Reserved for admin operations |
| `system-*` | Reserved for system operations |

## Naming Convention

**The recommended approach: Prefix with your pack slug**

```
{pack-slug}-{command-name}
```

### Examples

| Original (Conflicts) | Namespaced (Safe) |
|---------------------|-------------------|
| `implement` | `sigil-implement` |
| `architect` | `sigil-architect` |
| `deploy-production` | `sigil-deploy-production` |
| `designing-architecture` | `designing-sigil-architecture` |

### Good Naming Examples

```
sigil-implement       # Clear ownership, no conflict
sigil-deploy          # Distinct from deploy-production
sigil-analyze         # Different from analyze-market
mypack-custom-cmd     # Unique, self-documenting
```

### Bad Naming Examples

```
implement             # Conflicts with LOA core
loa-custom            # Uses reserved prefix
_internal-cmd         # Uses reserved prefix
deploy                # Too generic, may conflict
```

## Validation API

Before submitting your pack, use the validation endpoint to check for conflicts:

### Pre-Submit Validation

```bash
curl -X POST https://api.constructs.network/v1/packs/{your-pack-slug}/validate-namespace \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manifest": {
      "slug": "sigil",
      "commands": ["sigil-implement", "mount-sigil", "sigil-deploy"],
      "skills": ["implementing-sigil-contracts"]
    }
  }'
```

### Response (No Conflicts)

```json
{
  "valid": true,
  "conflicts": [],
  "warnings": []
}
```

### Response (With Conflicts)

```json
{
  "valid": false,
  "conflicts": [
    {
      "type": "command",
      "name": "implement",
      "reason": "Core implementation phase",
      "category": "loa_core_command",
      "suggestion": "sigil-implement"
    }
  ],
  "warnings": []
}
```

## Submission Enforcement

When you submit a pack for review (`POST /v1/packs/:slug/submit`), namespace validation runs automatically. If your pack contains reserved names:

1. The submission is **rejected** with HTTP 400
2. You receive a list of **all conflicts**
3. You receive **suggested replacements** for each conflict
4. You can fix and resubmit

### Error Response Example

```json
{
  "error": {
    "code": "NAMESPACE_VALIDATION_ERROR",
    "message": "Pack contains reserved names that conflict with LOA core or Claude built-ins",
    "details": {
      "conflict_count": 3,
      "conflicts": [
        {
          "type": "command",
          "name": "implement",
          "reason": "Core implementation phase",
          "category": "loa_core_command",
          "suggestion": "sigil-implement"
        }
      ],
      "suggestions": {
        "implement": "sigil-implement",
        "architect": "sigil-architect"
      }
    }
  }
}
```

## Migration Guide

If you have existing commands that conflict with reserved names, follow these steps:

### 1. Identify Conflicts

Use the validation endpoint or review the reserved names list above.

### 2. Rename Your Commands

In your pack's `.claude/commands/` directory:

```bash
# Rename the file
mv .claude/commands/implement.md .claude/commands/sigil-implement.md

# Update any references inside the file
# Update the command name in YAML frontmatter if present
```

### 3. Rename Your Skills

In your pack's `.claude/skills/` directory:

```bash
# Rename the directory
mv .claude/skills/implementing-tasks/ .claude/skills/implementing-sigil-tasks/

# Update index.yaml with new name
# Update any references in SKILL.md
```

### 4. Update Documentation

Update your pack's README and documentation to reference the new command names.

### 5. Validate

Run the validation endpoint to confirm no conflicts remain.

### 6. Create New Version

Create a new pack version with the renamed commands/skills.

### 7. Submit

Submit your pack for review.

## Best Practices

1. **Always prefix with your pack slug** - This makes ownership clear and prevents future conflicts

2. **Use descriptive names** - `sigil-deploy-contract` is better than `sigil-deploy`

3. **Validate before uploading** - Use the validation endpoint to check names before creating a version

4. **Document your commands** - Clear documentation helps users understand the difference between your commands and LOA core

5. **Avoid generic names** - Even if not reserved today, generic names may conflict with future additions

## Questions?

If you have questions about namespacing or need help migrating an existing pack, reach out:

- [GitHub Issues](https://github.com/0xHoneyJar/loa-constructs/issues)
- [Discord](https://discord.gg/thehoneyjar)
